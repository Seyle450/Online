/* Steuert Ausführung: Inline-Terminal (Worker+SharedArrayBuffer), sonst Popup-Fallback. */
(function () {
  var cfgEl = document.getElementById('pyproject');
  var runBtn = document.getElementById('runBtn');
  var stopBtn = document.getElementById('stopBtn');
  var term = document.getElementById('terminal');
  var out = document.getElementById('termOut');
  var inputRow = document.getElementById('termInputRow');
  var promptEl = document.getElementById('termPrompt');
  var inputEl = document.getElementById('termInput');
  if (!runBtn || !term || !out) return;

  var cfg = null, cfgErr = null;
  try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { cfgErr = e; }

  function write(s) { out.textContent += s; term.scrollTop = term.scrollHeight; }
  function clearTerm() { out.textContent = ''; }
  function showInputRow(label) {
    if (!inputRow) return;
    promptEl.textContent = label || '';
    inputRow.hidden = false; inputEl.disabled = false; inputEl.value = '';
    inputEl.focus(); term.scrollTop = term.scrollHeight;
  }
  function hideInputRow() { if (inputRow) { inputRow.hidden = true; inputEl.disabled = true; } }
  function startRun() { runBtn.disabled = true; if (stopBtn) stopBtn.hidden = false; term.hidden = false; clearTerm(); }
  function finishRun() { runBtn.disabled = false; if (stopBtn) stopBtn.hidden = true; hideInputRow(); }

  var canIsolate = (typeof SharedArrayBuffer !== 'undefined') && self.crossOriginIsolated;

  /* ---------- Worker-Modus: echtes Inline-Terminal ---------- */
  var worker = null, control = null, data = null, readyP = null;
  function ensureWorker() {
    if (worker) return readyP;
    var sab = new SharedArrayBuffer(8 + 8192);
    control = new Int32Array(sab, 0, 2);
    data = new Uint8Array(sab, 8);
    worker = new Worker('../_worker.js');
    readyP = new Promise(function (resolve, reject) {
      worker.onmessage = function (e) {
        var m = e.data;
        if (m.type === 'ready') resolve();
        else if (m.type === 'out') write(m.text);
        else if (m.type === 'clear') clearTerm();
        else if (m.type === 'await-input') showInputRow(m.text);
        else if (m.type === 'done') { write('\n\n› Programm beendet.'); finishRun(); }
        else if (m.type === 'error') { write('\n⚠ ' + m.text + '\n'); finishRun(); }
      };
      worker.onerror = function (err) { reject(new Error(err.message || 'Worker-Fehler')); };
    });
    worker.postMessage({ type: 'init', sab: sab });
    return readyP;
  }
  function submitInput() {
    if (!inputRow || inputRow.hidden) return;
    var v = inputEl.value;
    write(promptEl.textContent + v + '\n');
    hideInputRow();
    var enc = new TextEncoder().encode(v + '\n');
    var n = Math.min(enc.length, data.length);
    data.set(enc.subarray(0, n));
    Atomics.store(control, 1, n);
    Atomics.store(control, 0, 1);
    Atomics.notify(control, 0);
  }
  if (inputEl) inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submitInput(); }
  });
  async function runWorker() {
    startRun();
    write('› Lade Python-Laufzeit (einmalig, ein paar Sekunden) …\n');
    try {
      await ensureWorker();
      worker.postMessage({ type: 'run', files: cfg.files, main: cfg.main });
    } catch (e) { write('\n⚠ ' + (e.message || e) + '\n'); finishRun(); }
  }

  /* ---------- Fallback-Modus: Popup-Eingabe (Hauptthread) ---------- */
  var pyodide = null;
  window.__clearTerm = clearTerm;
  window.__ask = function (p) { return window.prompt(p && String(p).trim() ? String(p) : 'Eingabe:'); };
  var FALLBACK_PRE =
    "import os, sys, builtins\n" +
    "cwd=os.getcwd()\n" +
    "if cwd not in sys.path: sys.path.insert(0, cwd)\n" +
    "def _sys(cmd):\n" +
    "    if str(cmd).strip().lower() in ('cls','clear'):\n" +
    "        from js import __clearTerm\n" +
    "        __clearTerm()\n" +
    "    return 0\n" +
    "os.system=_sys\n" +
    "from js import __ask\n" +
    "def _input(prompt=''):\n" +
    "    print(prompt, end='')\n" +
    "    v=__ask(str(prompt))\n" +
    "    if v is None: raise EOFError\n" +
    "    print(v)\n" +
    "    return str(v)\n" +
    "builtins.input=_input\n" +
    "class _Done(Exception): pass\n" +
    "def _exit(*a, **k): raise _Done()\n" +
    "sys.exit=_exit; builtins.exit=_exit; builtins.quit=_exit\n";
  async function runMain() {
    startRun();
    write('› Lade Python-Laufzeit (einmalig) …\n');
    write('  (Hinweis: Eingaben über Dialogfenster — Inline-Terminal nur über Live-Server/HTTPS.)\n');
    try {
      if (typeof loadPyodide !== 'function') throw new Error('Pyodide nicht geladen — Internet/Adblocker prüfen.');
      if (!pyodide) {
        pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/' });
        pyodide.setStdout({ batched: function (s) { write(s.endsWith('\n') ? s : s + '\n'); } });
        pyodide.setStderr({ batched: function (s) { write(s.endsWith('\n') ? s : s + '\n'); } });
      }
      Object.keys(cfg.files).forEach(function (name) { try { pyodide.FS.writeFile(name, cfg.files[name]); } catch (e) {} });
      await pyodide.runPythonAsync(FALLBACK_PRE);
      clearTerm();
      await pyodide.runPythonAsync(cfg.files[cfg.main]);
      write('\n\n› Programm beendet.');
    } catch (e) {
      var m = (e && e.message) ? e.message : String(e);
      if (/_Done|SystemExit/.test(m)) write('\n\n› Programm beendet.');
      else if (/EOFError/.test(m)) write('\n\n› Eingabe abgebrochen — Programm beendet.');
      else write('\n⚠ ' + m + '\n');
    } finally { finishRun(); }
  }

  runBtn.addEventListener('click', function () {
    if (cfgErr) { term.hidden = false; clearTerm(); write('⚠ Konfiguration defekt: ' + cfgErr.message); return; }
    if (canIsolate) runWorker(); else runMain();
  });
  if (stopBtn) stopBtn.addEventListener('click', function () {
    if (worker) { worker.terminate(); worker = null; readyP = null; }
    write('\n\n› Gestoppt.'); finishRun();
  });
})();
