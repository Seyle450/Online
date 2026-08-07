# Produktbilder Antepli — Prompts

Freigestellte PNGs für die Karten auf `bestellen.html`. Das Bild steht **über** dem
Produktnamen; die Seite lädt es automatisch, sobald die Datei hier liegt. Fehlt eine
Datei, zeigt die Karte weiter das Rauten-Ornament — es geht also nichts kaputt, wenn du
nur einen Teil machst.

**Dateinamen sind Pflicht** (exakt so, klein, `.png`) — sie entsprechen den Artikel-IDs:

| Datei | Produkt |
|---|---|
| `fistikli-baklava.png` | Fıstıklı Baklava |
| `sobiyet.png` | Şöbiyet |
| `cevizli-baklava.png` | Cevizli Baklava |
| `soguk-baklava.png` | Soğuk Baklava |
| `havuc-dilimi.png` | Havuç Dilimi |
| `fistikli-kunefe.png` | Fıstıklı Künefe |
| `kunefe-maras.png` | Künefe mit Maraş-Eis |
| `katmer.png` | Katmer |
| `kadayif.png` | Kadayıf |
| `cay.png` | Çay |
| `mokka.png` | Türkischer Mokka |
| `blech-fistikli.png` | Blech Fıstıklı Baklava |
| `blech-cevizli.png` | Blech Cevizli Baklava |
| `blech-sobiyet.png` | Blech Şöbiyet |
| `blech-havuc.png` | Blech Havuç Dilimi |

---

## So wird es einheitlich

Einheitlich werden die Bilder **nicht** durch die Beschreibung des Gebäcks, sondern durch
immer gleiche Kamera, Licht und Bildfüllung. Deshalb: **Basis-Prompt unverändert lassen**
und nur den Produktsatz austauschen. Wenn ein Bild abfällt, liegt es fast immer daran,
dass der Generator Perspektive oder Abstand verändert hat — dann neu würfeln, nicht den
Basis-Prompt anpassen.

### Basis-Prompt (immer voranstellen)

```
Professional food photography of {PRODUKT}, single hero product shot.
Camera: three-quarter view from 35 degrees above, eye-level-ish, straight-on horizontally,
50mm lens look, no tilt, no dutch angle.
Framing: product centered, fills about 85% of the frame, generous even margin on all sides,
nothing cropped at the edges.
Lighting: soft warm key light from upper left, gentle fill from the right, subtle soft
shadow directly beneath the product only, no harsh highlights, no lens flare.
Style: rich and appetizing, natural colours, crisp focus across the whole product,
fine texture visible (flaky pastry layers, glossy syrup, pistachio grain).
Background: fully transparent, isolated cutout, alpha channel, no backdrop, no surface,
no table, no plate rim bleeding out of frame.
Output: square 1:1, high resolution, PNG with transparency.
```

### Negativ-Prompt (falls dein Werkzeug eins hat)

```
text, watermark, logo, label, hands, people, cutlery, fork, knife, napkin,
busy background, patterned surface, drop shadow on background, reflection on floor,
multiple angles, collage, split image, border, frame, vignette, blurry, low detail,
plastic look, oversaturated neon colours, garnish that is not mentioned
```

---

## Die 15 Produkt-Prompts

Jeweils den Basis-Prompt nehmen und `{PRODUKT}` durch den Satz unten ersetzen.

### Baklava & Co. — kleine, geschichtete Stücke

Für diese fünf gilt zusätzlich: **ein bis zwei Stück**, sauber angeschnitten, damit die
Schichten sichtbar sind. Alle in etwa gleich groß darstellen.

**`fistikli-baklava.png`**
> two diamond-shaped pieces of Turkish pistachio baklava, golden crisp filo layers clearly
> visible at the cut edge, thick bright green Antep pistachio crumble on top, light honey
> syrup sheen, one piece slightly in front of the other

**`sobiyet.png`**
> two pieces of Turkish Şöbiyet baklava, triangular folded filo parcels, golden and glossy,
> filled with pale cream (kaymak) that is just visible at the open edge, generous green
> pistachio crumble on top

**`cevizli-baklava.png`**
> two diamond-shaped pieces of Turkish walnut baklava, golden filo layers, visible chopped
> walnut filling between the layers at the cut edge, warm amber syrup sheen, finely chopped
> walnuts sprinkled on top instead of pistachio

**`soguk-baklava.png`**
> two square pieces of Turkish cold baklava (soğuk baklava), dark cocoa-brown glossy
> chocolate top, pale milk-soaked filo layers visible at the cut edge, fine pistachio
> crumble sprinkled sparsely on top, looks cool and moist rather than syrupy

**`havuc-dilimi.png`**
> two wedge-shaped pieces of Turkish Havuç Dilimi baklava, carrot-slice shape with a curved
> outer edge, densely coated in bright green pistachio crumble on the top and rounded side,
> golden filo layers visible at the straight cut face

### Warm & frisch serviert — auf Geschirr

Für diese vier gilt: **immer dieselbe Schale** — kleine, matte, dunkelgrüne Keramikschale
bzw. flacher Teller, schlicht, ohne Muster und ohne Rand-Dekor. Das hält die Serie zusammen.

**`fistikli-kunefe.png`**
> a round portion of Turkish künefe in a small matte dark green ceramic dish, shredded
> kadayif pastry baked to a deep golden brown on top, melted cheese stretching slightly at
> a broken edge, thick bright green pistachio crumble in the centre, syrup glistening

**`kunefe-maras.png`**
> a round portion of Turkish künefe in a small matte dark green ceramic dish, golden baked
> kadayif pastry, topped with one clean scoop of thick white Maraş ice cream slightly
> melting at the edge, green pistachio crumble sprinkled over both

**`katmer.png`**
> a Turkish katmer on a flat matte dark green ceramic plate, thin crisp folded pastry square,
> golden and blistered on top, cut open at one corner to reveal pale kaymak cream and bright
> green pistachio filling inside, very generous pistachio on top

**`kadayif.png`**
> a round portion of Turkish kadayıf in a small matte dark green ceramic dish, fine shredded
> golden pastry threads clearly separated, glossy with syrup, bright green pistachio filling
> visible in the middle layer, pistachio crumble on top

### Çay & Mokka — Getränke

Hier ist die Einheitlichkeit besonders wichtig: gleiche Höhe im Bild wie das Gebäck,
also **nicht kleiner** darstellen.

**`cay.png`**
> a traditional Turkish tulip-shaped tea glass filled with clear deep amber black tea,
> sitting on its small matching saucer, a single sugar cube on the saucer, delicate glass
> with a fine gold rim, steam not visible

**`mokka.png`**
> a small traditional Turkish coffee cup with saucer, matte dark green and gold, filled with
> dark Turkish mocha showing a fine foam layer on top, a tiny copper cezve pot standing
> beside it slightly behind, both compact in the frame

### Ganze Bleche — große Formate

Für diese vier gilt: **rundes Blech von schräg oben**, angeschnitten, mit einem
herausgehobenen Stück, damit man die Höhe sieht. Alle vier im gleichen Blech.

**`blech-fistikli.png`**
> a full round metal tray of Turkish pistachio baklava cut into diamond pieces, densely
> covered in bright green Antep pistachio crumble, one piece lifted slightly out of the tray
> to show the golden filo layers underneath, tray edge visible all around

**`blech-cevizli.png`**
> a full round metal tray of Turkish walnut baklava cut into diamond pieces, golden glossy
> filo tops with chopped walnuts scattered over them, one piece lifted slightly out of the
> tray showing the walnut filling between the layers, tray edge visible all around

**`blech-sobiyet.png`**
> a full round metal tray of Turkish Şöbiyet, rows of triangular folded filo parcels, golden
> and glossy, thick green pistachio crumble across the top, one parcel lifted slightly out of
> the tray showing the pale cream filling, tray edge visible all around

**`blech-havuc.png`**
> a full round metal tray of Turkish Havuç Dilimi arranged as wedges radiating from the
> centre, all densely coated in bright green pistachio crumble, one wedge lifted slightly out
> of the tray showing the golden filo layers, tray edge visible all around

---

## Technisches

**Transparenz:** Die meisten Bildgeneratoren liefern **kein** echtes Alpha, auch wenn man es
im Prompt verlangt. Zuverlässiger Weg: auf **reinem Weiß** generieren (im Basis-Prompt
`fully transparent, isolated cutout, alpha channel` durch `plain pure white background,
seamless, no shadow on the background` ersetzen) und danach freistellen — z. B. mit
remove.bg, Photoshop „Motiv auswählen" oder der Freistellen-Funktion deines Generators.
Wichtig: der weiche Schatten **unter** dem Produkt darf mit weg — die Karte bringt ihren
eigenen Schatten mit.

**Format:** quadratisch, 1024 × 1024 px als PNG mit Transparenz. Nicht selbst verkleinern —
das übernimmt das Optimier-Skript.

**Ablage & Optimierung:** PNG in diesen Ordner (`assets/produkte/`) legen, dann einmal

```
node tools/optimiere-bilder.cjs
```

Das erzeugt daraus ein 600 px großes WebP (~60–120 KB statt ~1,8 MB) und schiebt das
Original nach `assets/produkte/_original/`, wo es nicht mit deployed wird. Ohne diesen
Schritt funktioniert die Seite trotzdem — sie nimmt dann das PNG direkt, was aber die
Ladezeit stark verschlechtert.

Kein Code-Eingriff nötig: die Karte sucht erst `<id>.webp`, dann `<id>.png`, und zeigt
sonst das Rauten-Ornament.

**Kontrolle:** Die Bilder stehen auf dunkelgrünem Grund. Fast weiße Motive (Kaymak, Maraş-Eis)
brauchen Zeichnung an den Rändern, sonst „schwimmen" sie. Nach dem Einfügen einmal die Seite
ansehen und prüfen, ob alle Motive gleich groß wirken — das ist der häufigste Ausrutscher.
