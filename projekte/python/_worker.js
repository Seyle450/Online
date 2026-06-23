/* Pyodide-Worker: stdin synchron via SharedArrayBuffer. */
var pyodide = null, control = null, data = null, pendingPrompt = '';
function post(type, text) { self.postMessage({ type: type, text: text }); }

function readLine() {
  post('await-input', pendingPrompt); pendingPrompt = '';   // Eingabefeld + Prompt zeigen
  Atomics.store(control, 0, 0);
  Atomics.wait(control, 0, 0);       // blockiert bis eine Zeile vorliegt
  var len = control[1];
  return new TextDecoder().decode(data.slice(0, len));
}
self.__clear = function () { post('clear'); };
self.__setPrompt = function (p) { pendingPrompt = String(p); };

var PREAMBLE =
  "import os, sys, builtins\n" +
  "cwd=os.getcwd()\n" +
  "if cwd not in sys.path: sys.path.insert(0, cwd)\n" +
  "def _sys(cmd):\n" +
  "    if str(cmd).strip().lower() in ('cls','clear'):\n" +
  "        from js import __clear\n" +
  "        __clear()\n" +
  "    return 0\n" +
  "os.system=_sys\n" +
  "from js import __setPrompt\n" +
  "def _input(prompt=''):\n" +
  "    __setPrompt(str(prompt))\n" +
  "    line=sys.stdin.readline()\n" +
  "    if line=='': raise EOFError\n" +
  "    return line.rstrip('\\n')\n" +
  "builtins.input=_input\n" +
  "class _Done(Exception): pass\n" +
  "def _exit(*a, **k): raise _Done()\n" +
  "sys.exit=_exit; builtins.exit=_exit; builtins.quit=_exit\n";

self.onmessage = async function (e) {
  var m = e.data;
  if (m.type === 'init') {
    control = new Int32Array(m.sab, 0, 2);
    data = new Uint8Array(m.sab, 8);
    try {
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js');
      pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' });
      pyodide.setStdout({ batched: function (s) { post('out', s.endsWith('\n') ? s : s + '\n'); } });
      pyodide.setStderr({ batched: function (s) { post('out', s.endsWith('\n') ? s : s + '\n'); } });
      pyodide.setStdin({ stdin: readLine });
      post('ready');
    } catch (err) { post('error', String(err && err.message ? err.message : err)); }
  } else if (m.type === 'run') {
    try {
      var files = m.files;
      Object.keys(files).forEach(function (name) {
        try { pyodide.FS.writeFile(name, files[name]); } catch (e) {}
      });
      await pyodide.runPythonAsync(PREAMBLE);
      post('clear');
      await pyodide.runPythonAsync(files[m.main]);
      post('done');
    } catch (err) {
      var msg = String(err && err.message ? err.message : err);
      post(/EOFError|_Done|SystemExit/.test(msg) ? 'done' : 'error', msg);
    }
  }
};
