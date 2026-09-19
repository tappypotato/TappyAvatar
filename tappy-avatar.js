/*!
 * tappy-avatar — deterministic character avatars from any string.
 * Single file, zero dependencies. UMD (browser global + CommonJS).
 *
 * 12 styles (curated, zero external deps):
 *   pixel · robot · emoji · wireframe · neonwaves ·
 *   petal · waveform · prism · honeycomb · explosion · starfield · portal
 *
 * MIT License.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.tappyAvatar = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------------- seed hashing ---------------- */

  function normalize(s) {
    return s.normalize("NFC").trim().toLowerCase();
  }
  function hashString(str) {
    var h = (0x9e3779b9 ^ str.length) >>> 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      h = Math.imul(h + c + i * 0x9e3779b1, 0xbb67ae85);
      h = ((h << 13) | (h >>> 19)) ^ (h >>> 7) ^ c;
      h = Math.imul(h, 0x9e3779cd);
    }
    h = Math.imul(h ^ (h >>> 15), 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 13), 0xbb67ae85);
    h = (h ^ (h >>> 16)) >>> 0;
    return h;
  }
  var keyHashCache = Object.create(null);
  function hashKey(key) {
    var v = keyHashCache[key];
    return v === undefined ? (keyHashCache[key] = hashString(key)) : v;
  }

  /* ---------------- random source ---------------- */

  function makeRng(seed, overrides) {
    var base = hashString(normalize(seed));
    function raw(key) {
      var x = (base ^ hashKey(key)) >>> 0;
      x = Math.imul(x ^ (x >>> 15), 0x9e3779cd);
      x = Math.imul(x ^ (x >>> 13), 0xbb67ae85);
      x = (x ^ (x >>> 16)) >>> 0;
      return x / 4294967296;
    }
    function rng(key) {
      if (overrides && overrides[key] !== undefined) {
        var v = overrides[key];
        if (Array.isArray(v)) v = v[Math.floor(raw(key) * v.length)];
        return v > 0 ? (v < 1 ? v : 0.999999) : 0;
      }
      return raw(key);
    }
    rng.range = function (k, a, b) { return a + rng(k) * (b - a); };
    rng.int = function (k, a, b) { return a + Math.floor(rng(k) * (b - a + 1)); };
    rng.choose = function (k, arr) { return arr[Math.floor(rng(k) * arr.length)]; };
    rng.yes = function (k, p) { return rng(k) < (p == null ? 0.5 : p); };
    rng.nudge = function (k, amt) { return (rng(k) * 2 - 1) * amt; };
    return rng;
  }

  /* ---------------- colour ---------------- */

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = s < 0 ? 0 : s > 1 ? 1 : s;
    l = l < 0 ? 0 : l > 1 ? 1 : l;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return "#" + hexByte(r, m) + hexByte(g, m) + hexByte(b, m);
  }
  function hexByte(v, m) {
    var n = Math.round((v + m) * 255);
    n = n < 0 ? 0 : n > 255 ? 255 : n;
    return (n < 16 ? "0" : "") + n.toString(16);
  }
  function colorRamp(h, dark, rng) {
    var hj = rng.nudge("ramp.h", 3);
    var s = 0.62 + rng.nudge("ramp.s", 0.04);
    var l0 = (dark ? 0.55 : 0.56) + rng.nudge("ramp.l", 0.03);
    return {
      main: hslToHex(h + hj, s, l0),
      deep: hslToHex(h + hj, s, l0 - 0.2),
      light: hslToHex(h + hj, Math.min(0.85, s + 0.1), l0 + 0.22),
      pale: hslToHex(h + hj, 0.35, dark ? 0.16 : 0.96),
      ink: hslToHex(h + hj, 0.45, dark ? 0.88 : 0.24),
    };
  }

  /* ---------------- geometry helpers ---------------- */

  var r2 = function (v) { return Math.round(v * 100) / 100; };
  function roundShape(cx, cy, rx, ry, n) {
    var pts = []; var steps = 28; var exp = 2 / n;
    for (var i = 0; i < steps; i++) {
      var t = (i / steps) * Math.PI * 2; var ct = Math.cos(t), st = Math.sin(t);
      var x = rx * (ct < 0 ? -1 : 1) * Math.pow(Math.abs(ct), exp);
      var y = ry * (st < 0 ? -1 : 1) * Math.pow(Math.abs(st), exp);
      pts.push([cx + x, cy + y]);
    }
    var d = "M" + r2(pts[0][0]) + " " + r2(pts[0][1]);
    for (var k = 1; k < pts.length; k++) d += "L" + r2(pts[k][0]) + " " + r2(pts[k][1]);
    return d + "Z";
  }
  function circle(cx, cy, r, fill, op) {
    return '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="' + fill + '"' +
      (op == null ? "" : ' fill-opacity="' + r2(op) + '"') + "/>";
  }

  /* ================================================================
   * CHARACTER STYLES
   * ================================================================ */

  /* -------- pixel: symmetric pixel face ----------------------------- */
  function drawPixelFace(rng, o, ramp, h) {
    var n = o.pixel ? o.pixel : rng.choose("px.n", [9, 11]);
    var cell = 100 / n;
    var c = Math.floor(n / 2);
    var r = Math.floor(n * 0.38);
    var cy = Math.floor(n * 0.46);
    var skinCol = hslToHex(h + rng.nudge("px.sj", 4), 0.62 + rng.nudge("px.ss", 0.08), 0.56 + rng.nudge("px.sl", 0.12));
    var hairCol = hslToHex(h + rng.nudge("px.hj", 8), 0.55, 0.3 + rng.nudge("px.hl", 0.1));
    var fills = [skinCol, hairCol, ramp.ink, ramp.light];
    var g = [];
    for (var y = 0; y < n; y++) { g[y] = []; for (var x = 0; x < n; x++) g[y][x] = -1; }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var dx = x - c, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) g[y][x] = 0;
    }
    var hair = rng.int("px.hair", 0, 3);
    var hh = Math.max(1, Math.floor(r * 0.55) + rng.int("px.hh", 0, 1));
    for (var y = cy - r; y < cy - r + hh && y < n; y++) for (var x = c - r; x <= c + r; x++) {
      if (y >= 0 && x >= 0 && x < n && g[y][x] === 0) g[y][x] = 1;
    }
    if (hair === 1) {
      var fr = Math.floor(r * 0.55);
      for (var y2 = cy - r + hh; y2 < cy - r + hh + 1 && y2 < n; y2++) for (var x2 = c - fr; x2 <= c + fr; x2++) {
        if (y2 >= 0 && x2 >= 0 && x2 < n && g[y2][x2] === 0) g[y2][x2] = 1;
      }
    }
    if (hair === 2) {
      for (var y3 = cy - r; y3 <= cy + Math.floor(r * 0.3) && y3 < n; y3++) {
        if (y3 >= 0 && c - r >= 0 && g[y3][c - r] === 0) g[y3][c - r] = 1;
        if (y3 >= 0 && c + r < n && g[y3][c + r] === 0) g[y3][c + r] = 1;
      }
    }
    if (hair === 3) {
      for (var y4 = cy - r; y4 < cy - r + hh && y4 < n; y4++) {
        if (y4 >= 0 && g[y4][c] === 0) g[y4][c] = 1;
      }
    }
    var ey = cy + Math.floor(r * 0.15) + rng.int("px.eyr", 0, 1);
    var eg = Math.max(2, Math.floor(r * 0.42));
    g[ey][c - eg] = 2; g[ey][c + eg] = 2;
    if (n >= 11) { g[ey + 1][c - eg] = 2; g[ey + 1][c + eg] = 2; }
    var my = cy + Math.floor(r * 0.62);
    var mw = rng.yes("px.mw", 0.5) ? 1 : 0;
    g[my][c] = 2;
    if (mw) { if (g[my][c - 1] === 0) g[my][c - 1] = 2; if (g[my][c + 1] === 0) g[my][c + 1] = 2; }
    if (n >= 11) g[my + 1][c] = 2;
    if (n >= 11 && rng.yes("px.blush", 0.7)) {
      var by = ey + 1;
      if (g[by][c - eg - 1] === 0) g[by][c - eg - 1] = 3;
      if (g[by][c + eg + 1] === 0) g[by][c + eg + 1] = 3;
    }
    var out = "";
    for (var row = 0; row < n; row++) {
      var runStart = 0, runColor = g[row][0];
      for (var x = 1; x <= n; x++) {
        var col = x < n ? g[row][x] : -2;
        if (col === runColor) continue;
        if (runColor >= 0) {
          out += '<rect x="' + r2(runStart * cell) + '" y="' + r2(row * cell) +
            '" width="' + r2((x - runStart) * cell) + '" height="' + r2(cell) +
            '" fill="' + fills[runColor] + '"/>';
        }
        runStart = x; runColor = col;
      }
    }
    return out;
  }

  /* -------- robot: rounded-square head with antenna ---------------- */
  function drawRobot(rng, o, ramp) {
    var rx = rng.range("rb.rx", 30, 35), ry = rng.range("rb.ry", 28, 33);
    var body = rng.choose("rb.body", ["main", "deep"]);
    var out = "";
    var ax = 50 + rng.nudge("rb.ax", 6);
    out += '<path d="M' + r2(ax) + ' ' + r2(50 - ry - 2) + 'L' + r2(ax) + ' ' + r2(50 - ry - 9) + '" stroke="' + ramp.ink + '" stroke-width="2.5" stroke-linecap="round"/>';
    out += circle(ax, 50 - ry - 11, 3, ramp.light);
    out += '<path d="' + roundShape(50, 50, rx, ry, 6) + '" fill="' + ramp[body] + '"/>';
    var gap = rng.range("rb.gap", 8, 12);
    var ewr = rng.range("rb.ew", 3.5, 5), ehr = rng.range("rb.eh", 2.5, 4);
    var ey = 46;
    out += '<rect x="' + r2(50 - gap - ewr) + '" y="' + r2(ey - ehr) + '" width="' + r2(ewr * 2) + '" height="' + r2(ehr * 2) + '" rx="2" fill="' + ramp.light + '"/>';
    out += '<rect x="' + r2(50 + gap - ewr) + '" y="' + r2(ey - ehr) + '" width="' + r2(ewr * 2) + '" height="' + r2(ehr * 2) + '" rx="2" fill="' + ramp.light + '"/>';
    var mw = rng.range("rb.mw", 6, 10);
    var bars = rng.int("rb.bars", 2, 3);
    for (var i = 0; i < bars; i++) {
      out += '<path d="M' + r2(50 - mw) + ' ' + r2(58 + i * 3.5) + 'L' + r2(50 + mw) + ' ' + r2(58 + i * 3.5) + '" stroke="' + ramp.light + '" stroke-width="1.6" stroke-linecap="round"/>';
    }
    var er = rng.range("rb.er", 3.5, 5);
    out += circle(50 - rx + 2, 50, er, ramp.deep);
    out += circle(50 + rx - 2, 50, er, ramp.deep);
    out += circle(50 - gap - 7, 52, 2.2, ramp.ink, 0.55);
    out += circle(50 + gap + 7, 52, 2.2, ramp.ink, 0.55);
    return out;
  }

  /* -------- emoji: round face with seeded expression ---------------- */
  function drawEmoji(rng, o, ramp, h) {
    var r = rng.range("em.r", 38, 43);
    var skin = hslToHex(h + rng.nudge("em.h", 8), rng.range("em.s", 0.65, 0.85), rng.range("em.l", 0.62, 0.72));
    var ink = ramp.ink;
    var out = '<path d="' + roundShape(50, 50, r, r, 2.6) + '" fill="' + skin + '"/>';
    var ex = rng.int("em.ex", 0, 4);
    if (ex === 0) {
      out += circle(50 - 12, 46, 3.4, ink);
      out += circle(50 + 12, 46, 3.4, ink);
      out += '<path d="M' + r2(50 - 11) + ' 56Q50 ' + r2(50 + 14) + ' ' + r2(50 + 11) + ' 56" fill="none" stroke="' + ink + '" stroke-width="3.2" stroke-linecap="round"/>';
    } else if (ex === 1) {
      out += '<path d="M' + r2(50 - 16) + ' 48Q' + r2(50 - 12) + ' 43 ' + r2(50 - 8) + ' 48" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
      out += '<path d="M' + r2(50 + 8) + ' 48Q' + r2(50 + 12) + ' 43 ' + r2(50 + 16) + ' 48" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
      out += '<path d="M' + r2(50 - 13) + ' 54Q50 ' + r2(50 + 16) + ' ' + r2(50 + 13) + ' 54" fill="none" stroke="' + ink + '" stroke-width="3.4" stroke-linecap="round"/>';
    } else if (ex === 2) {
      out += circle(50 - 12, 45, 4.6, ink);
      out += circle(50 + 12, 45, 4.6, ink);
      out += '<circle cx="50" cy="57" r="6" fill="none" stroke="' + ink + '" stroke-width="3"/>';
    } else if (ex === 3) {
      out += circle(50 - 12, 46, 3, ink);
      out += circle(50 + 12, 46, 3, ink);
      out += '<path d="M' + r2(50 - 8) + ' 56L' + r2(50 + 8) + ' 56" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
    } else {
      out += '<path d="M' + r2(50 - 16) + ' 46Q' + r2(50 - 12) + ' 49 ' + r2(50 - 8) + ' 46" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
      out += circle(50 + 12, 46, 3.4, ink);
      out += '<path d="M' + r2(50 - 6) + ' 58Q' + r2(50 + 3) + ' 55 ' + r2(50 + 10) + ' 60" fill="none" stroke="' + ink + '" stroke-width="3.2" stroke-linecap="round"/>';
    }
    out += circle(50 - 20, 54, 4.5, hslToHex(350, 0.5, 0.82), 0.5);
    out += circle(50 + 20, 54, 4.5, hslToHex(350, 0.5, 0.82), 0.5);
    return out;
  }

  /* -------- wireframe: Linear-style geometric head ------------------- */
  function drawWireframe(rng, o, ramp, h) {
    var cx = 50, cy = 52;
    var fg = ramp.ink;
    var bg = o.dark ? ramp.deep : ramp.pale;
    var acc = hslToHex(h + rng.nudge("wf.h", 8), 0.75, 0.5);
    var lw = 2.2;
    var hr = rng.range("wf.hr", 26, 30);
    var out = '<rect x="0" y="0" width="100" height="100" fill="' + bg + '"/>';
    var pts = [];
    var tilt = rng.nudge("wf.tilt", 0.15);
    for (var i = 0; i < 6; i++) {
      var ang = -Math.PI / 2 + tilt + (Math.PI * 2 * i / 6);
      var r = hr * (1 + rng.nudge("wf.r" + i, 0.08));
      pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
    }
    out += '<path d="M' + r2(pts[0][0]) + " " + r2(pts[0][1]);
    for (var k = 1; k < pts.length; k++) out += " L" + r2(pts[k][0]) + " " + r2(pts[k][1]);
    out += " Z\" fill=\"none\" stroke=\"" + fg + "\" stroke-width=\"" + lw + "\" stroke-linejoin=\"round\"/>";
    var gap = rng.range("wf.gap", hr * 0.28, hr * 0.38);
    var ey = cy - hr * 0.08;
    var er = rng.range("wf.er", 2.4, 3.2);
    out += '<circle cx="' + r2(cx - gap) + '" cy="' + r2(ey) + '" r="' + r2(er) + '" fill="none" stroke="' + fg + '" stroke-width="' + lw + '"/>';
    out += '<circle cx="' + r2(cx + gap) + '" cy="' + r2(ey) + '" r="' + r2(er) + '" fill="none" stroke="' + fg + '" stroke-width="' + lw + '"/>';
    out += circle(cx + gap, ey, er * 0.35, acc);
    var mt = rng.int("wf.mt", 0, 2);
    var my = cy + hr * 0.42;
    if (mt === 0) {
      out += '<path d="M' + r2(cx - 5) + " " + r2(my - 2) + "L50 " + r2(my + 3) + "L" + r2(cx + 5) + " " + r2(my - 2) + '" fill="none" stroke="' + fg + '" stroke-width="' + lw + '" stroke-linecap="round" stroke-linejoin="round"/>';
    } else if (mt === 1) {
      out += '<path d="M' + r2(cx - 6) + " " + r2(my + 1) + "L" + r2(cx + 6) + " " + r2(my - 1) + '" stroke="' + fg + '" stroke-width="' + lw + '" stroke-linecap="round"/>';
    } else {
      out += '<line x1="' + r2(cx - 6) + '" y1="' + r2(my) + '" x2="' + r2(cx + 6) + '" y2="' + r2(my) + '" stroke="' + fg + '" stroke-width="' + lw + '" stroke-linecap="round"/>';
    }
    if (rng.yes("wf.bracket", 0.6)) {
      out += '<path d="M' + r2(cx - hr - 3) + " " + r2(cy - hr * 0.2) + "L" + r2(cx - hr - 3) + " " + r2(cy + hr * 0.6) + "L" + r2(cx - hr + 3) + " " + r2(cy + hr * 0.6) + '" fill="none" stroke="' + acc + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    return out;
  }

  /* -------- neonwaves: cyberpunk neon wave + grid -------------------- */
  function drawNeonwaves(rng, o, ramp, h) {
    var fg = hslToHex(h + rng.nudge("nw.h", 10), 0.8, 0.55);
    var accent = hslToHex((h + 180) % 360 + rng.nudge("nw.ah", 10), 0.85, 0.6);
    var bg = o.dark ? ramp.deep : ramp.pale;
    var out = '<rect x="0" y="0" width="100" height="100" fill="' + bg + '"/>';
    out += '<g stroke="' + (o.dark ? ramp.ink : ramp.light) + '" stroke-width="0.6" opacity="0.5">';
    for (var gi = 1; gi < 5; gi++) {
      out += '<line x1="0" y1="' + r2(gi * 20) + '" x2="100" y2="' + r2(gi * 20) + '"/>';
      out += '<line x1="' + r2(gi * 20) + '" y1="0" x2="' + r2(gi * 20) + '" y2="100"/>';
    }
    out += "</g>";
    var n = rng.int("nw.n", 2, 3);
    for (var i = 0; i < n; i++) {
      var y0 = 45 + i * 14 + rng.nudge("nw.y" + i, 4);
      var amp = rng.range("nw.a" + i, 4, 10);
      var freq = rng.range("nw.f" + i, 0.08, 0.18);
      var shift = rng.nudge("nw.sh" + i, 25);
      var col = i === 0 ? fg : accent;
      var d = "M0 " + r2(y0);
      var steps = 16;
      for (var s = 1; s <= steps; s++) {
        var x = (100 / steps) * s;
        var dy = Math.sin((x + shift) * freq) * amp;
        d += " L" + r2(x) + " " + r2(y0 + dy);
      }
      out += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linecap="round" opacity="' + r2(0.85 - i * 0.15) + '"/>';
    }
    if (rng.yes("nw.dot", 0.6)) {
      out += circle(rng.range("nw.dx", 20, 80), rng.range("nw.dy", 20, 80), rng.range("nw.dr", 3, 6), accent, 0.85);
    }
    return out;
  }

  /* ================================================================
   * NEW FUTURISTIC STYLES
   * ================================================================ */


  /* -------- petal: symmetrical ring of petals ----------------------- */
  function drawPetal(rng, o, ramp, h) {
    var cx = 50, cy = 50;
    var bg = o.dark ? ramp.deep : ramp.pale;
    var out = '<rect x="0" y="0" width="100" height="100" fill="' + bg + '"/>';
    var petalCount = rng.choose("pt.c", [6, 8, 10]);
    var palette = [
      hslToHex(h, 0.75, 0.6),
      hslToHex(h + 40, 0.65, 0.7),
      hslToHex(h - 40, 0.7, 0.55),
      hslToHex((h + 180) % 360, 0.6, 0.68),
    ];
    var baseR = rng.range("pt.br", 16, 22);
    var petalLen = rng.range("pt.pl", 22, 30);
    var petalW = rng.range("pt.pw", 10, 16);
    for (var i = 0; i < petalCount; i++) {
      var ang = (i / petalCount) * Math.PI * 2 + rng.nudge("pt.shift", 0.1);
      var col = palette[i % palette.length];
      var tipX = cx + Math.cos(ang) * (baseR + petalLen);
      var tipY = cy + Math.sin(ang) * (baseR + petalLen);
      var midX = cx + Math.cos(ang) * baseR;
      var midY = cy + Math.sin(ang) * baseR;
      var perp = ang + Math.PI / 2;
      var wX = Math.cos(perp) * petalW;
      var wY = Math.sin(perp) * petalW;
      var p1 = [midX - wX, midY - wY];
      var p2 = [midX + wX, midY + wY];
      out += '<path d="M' + r2(p1[0]) + " " + r2(p1[1]) + "Q" + r2(cx + Math.cos(ang) * petalLen * 0.5) + " " +
        r2(cy + Math.sin(ang) * petalLen * 0.5 - petalW * 0.3) + " " + r2(tipX) + " " + r2(tipY) + "Q" +
        r2(cx + Math.cos(ang) * petalLen * 0.5) + " " + r2(cy + Math.sin(ang) * petalLen * 0.5 + petalW * 0.3) +
        " " + r2(p2[0]) + " " + r2(p2[1]) + "Z" + '" fill="' + col + '" opacity="' + r2(rng.range("pt.op" + i, 0.7, 0.95)) + '"/>';
    }
    // center disk
    out += circle(cx, cy, rng.range("pt.cr", 10, 16), ramp.main);
    out += circle(cx, cy, rng.range("pt.hr", 4, 8), ramp.light);
    return out;
  }

  /* -------- waveform: layered fluid sine waves ---------------------- */
  function drawWaveform(rng, o, ramp, h) {
    var bg = o.dark ? ramp.deep : ramp.pale;
    var out = '<rect x="0" y="0" width="100" height="100" fill="' + bg + '"/>';
    var pal = [
      hslToHex(h, 0.8, 0.55),
      hslToHex((h + 60) % 360, 0.75, 0.62),
      hslToHex((h + 130) % 360, 0.7, 0.68),
      hslToHex((h + 210) % 360, 0.75, 0.58),
      hslToHex((h + 290) % 360, 0.8, 0.6),
    ];
    var n = rng.choose("wf.n", [3, 4, 5]);
    for (var i = 0; i < n; i++) {
      var baseY = 30 + i * (40 / n) + rng.nudge("wf.by" + i, 3);
      var amp = rng.range("wf.a" + i, 4, 12);
      var freq = rng.range("wf.f" + i, 0.06, 0.14);
      var shift = rng.range("wf.sh" + i, 0, Math.PI * 20);
      var col = pal[i % pal.length];
      var thick = rng.range("wf.t" + i, 1.8, 3.4);
      // filled area wave for bottom layers
      var fill = rng.yes("wf.fill" + i, 0.55);
      var y0 = fill ? 100 : baseY;
      var d = "M0 " + r2(y0);
      var steps = 24;
      for (var s = 0; s <= steps; s++) {
        var x = (100 / steps) * s;
        var dy = Math.sin((x + shift) * freq) * amp;
        d += " L" + r2(x) + " " + r2(baseY + dy);
      }
      if (fill) {
        d += " L100 100 L0 100 Z";
        out += '<path d="' + d + '" fill="' + col + '" opacity="' + r2(rng.range("wf.op" + i, 0.18, 0.4)) + '"/>';
      } else {
        out += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + thick + '" stroke-linecap="round" opacity="' + r2(rng.range("wf.lop" + i, 0.7, 0.95)) + '"/>';
      }
    }
    // optional crest sparkles
    if (rng.yes("wf.spark", 0.6)) {
      for (var j = 0; j < 4; j++) {
        out += circle(rng.range("wf.sx" + j, 10, 90), rng.range("wf.sy" + j, 25, 75), rng.range("wf.sr" + j, 1.2, 2.2), o.dark ? "#fff" : ramp.ink, 0.7);
      }
    }
    return out;
  }

  /* -------- prism: multi-layer radial gradient halos ---------------- */
  function drawPrism(rng, o, ramp, h) {
    var cx = 50, cy = 50;
    var bg = o.dark ? ramp.deep : ramp.pale;
    var out = '<rect x="0" y="0" width="100" height="100" fill="' + bg + '"/>';
    var rainbow = [0, 50, 120, 200, 260, 320];
    var n = rng.choose("pr.n", [5, 6]);
    for (var i = 0; i < n; i++) {
      var hue = (h + rainbow[i % rainbow.length] + rng.nudge("pr.h" + i, 8)) % 360;
      var col = hslToHex(hue, 0.85, 0.6);
      var hx = cx + rng.nudge("pr.hx" + i, 20);
      var hy = cy + rng.nudge("pr.hy" + i, 20);
      var hr = rng.range("pr.hr" + i, 28, 44);
      out += circle(hx, hy, hr, col, rng.range("pr.op" + i, 0.28, 0.55));
    }
    // central bright orb
    out += circle(cx, cy, rng.range("pr.cr", 12, 18), o.dark ? "#ffffff" : ramp.pale, rng.range("pr.cop", 0.7, 0.9));
    out += circle(cx - rng.range("pr.off", 3, 5), cy - rng.range("pr.off", 3, 5), rng.range("pr.hl", 5, 8), o.dark ? "#ffffff" : "#ffffff", 0.9);
    // sparkles around
    if (rng.yes("pr.sp", 0.7)) {
      for (var j = 0; j < 3; j++) {
        out += circle(cx + rng.nudge("pr.spx" + j, 40), cy + rng.nudge("pr.spy" + j, 40), rng.range("pr.spr" + j, 1.2, 2), "#ffffff", rng.range("pr.spop" + j, 0.7, 1));
      }
    }
    return out;
  }

  /* -------- honeycomb: hex grid with color fill ---------------------- */
  function drawHoneycomb(rng, o, ramp, h) {
    var cx = 50, cy = 50;
    var bg = o.dark ? ramp.deep : ramp.pale;
    var ink = ramp.ink;
    var out = '<rect x="0" y="0" width="100" height="100" fill="' + bg + '"/>';
    var hexPal = [
      hslToHex(h, 0.75, 0.6),
      hslToHex(h + 45, 0.7, 0.58),
      hslToHex(h - 30, 0.65, 0.62),
      hslToHex((h + 180) % 360, 0.6, 0.65),
    ];
    var size = rng.range("hc.s", 7, 9);  // hex radius
    var dx = size * Math.sqrt(3);
    var dy = size * 1.5;
    var hex = function (hx, hy) {
      var pts = [];
      for (var i = 0; i < 6; i++) {
        var ang = Math.PI / 3 * i - Math.PI / 2;
        pts.push([hx + size * Math.cos(ang), hy + size * Math.sin(ang)]);
      }
      var d = "M" + r2(pts[0][0]) + " " + r2(pts[0][1]);
      for (var k = 1; k < 6; k++) d += " L" + r2(pts[k][0]) + " " + r2(pts[k][1]);
      return d + "Z";
    };
    // center cluster of 37 hexes (rows around center)
    var rows = 5;
    for (var row = -rows; row <= rows; row++) {
      var cols = rows - Math.abs(row);
      for (var col = -cols; col <= cols; col++) {
        var hx = cx + (col + row * 0.5) * dx;
        var hy = cy + row * dy;
        if (hx < -2 || hx > 102 || hy < -2 || hy > 102) continue;
        var key = "hc.f" + row + "." + col;
        var filled = rng.yes(key, 0.68);
        var col2 = rng.choose("hc.p" + row + "." + col, hexPal);
        if (filled) out += '<path d="' + hex(hx, hy) + '" fill="' + col2 + '" stroke="' + ink + '" stroke-width="0.4" opacity="' + r2(rng.range("hc.op" + row + "." + col, 0.75, 0.95)) + '"/>';
        else out += '<path d="' + hex(hx, hy) + '" fill="none" stroke="' + ink + '" stroke-width="0.5" opacity="0.25"/>';
      }
    }
    return out;
  }

  /* -------- explosion: radial burst of particles + rays -------------- */
  function drawExplosion(rng, o, ramp, h) {
    var cx = 50, cy = 50;
    var bg = o.dark ? ramp.deep : ramp.pale;
    var out = '<rect x="0" y="0" width="100" height="100" fill="' + bg + '"/>';
    var pal = [
      hslToHex(h, 0.9, 0.55),
      hslToHex((h + 40) % 360, 0.85, 0.6),
      hslToHex((h + 120) % 360, 0.8, 0.65),
      hslToHex((h + 200) % 360, 0.85, 0.55),
      hslToHex((h + 280) % 360, 0.9, 0.62),
    ];
    // central bright core
    out += circle(cx, cy, rng.range("ex.core", 6, 10), "#ffffff", 0.9);
    out += circle(cx, cy, rng.range("ex.cr2", 3, 6), pal[0], 0.9);
    // rays
    var rays = rng.int("ex.rays", 10, 18);
    for (var i = 0; i < rays; i++) {
      var ang = (i / rays) * Math.PI * 2 + rng.nudge("ex.ra" + i, 0.15);
      var r1 = rng.range("ex.r1" + i, 8, 14);
      var r2e = rng.range("ex.r2" + i, 30, 44);
      var thick = rng.range("ex.t" + i, 0.8, 2.2);
      var col = pal[i % pal.length];
      out += '<line x1="' + r2(cx + Math.cos(ang) * r1) + '" y1="' + r2(cy + Math.sin(ang) * r1) +
        '" x2="' + r2(cx + Math.cos(ang) * r2e) + '" y2="' + r2(cy + Math.sin(ang) * r2e) +
        '" stroke="' + col + '" stroke-width="' + thick + '" stroke-linecap="round" opacity="' + r2(rng.range("ex.rop" + i, 0.55, 0.9)) + '"/>';
    }
    // particles (dots around center)
    var particles = rng.int("ex.p", 20, 35);
    for (var j = 0; j < particles; j++) {
      var ang2 = rng.range("ex.pa" + j, 0, Math.PI * 2);
      var r3 = rng.range("ex.pr" + j, 14, 46);
      var pr = rng.range("ex.prr" + j, 0.8, 2.6);
      var col2 = rng.choose("ex.pp" + j, pal);
      out += circle(cx + Math.cos(ang2) * r3, cy + Math.sin(ang2) * r3, pr, col2, rng.range("ex.popo" + j, 0.55, 0.95));
    }
    // bigger secondary particles
    var bigP = rng.int("ex.bp", 3, 6);
    for (var b = 0; b < bigP; b++) {
      var ba = rng.range("ex.ba" + b, 0, Math.PI * 2);
      var br2 = rng.range("ex.bpr" + b, 24, 44);
      out += circle(cx + Math.cos(ba) * br2, cy + Math.sin(ba) * br2, rng.range("ex.bbr" + b, 2.5, 5), rng.choose("ex.bcol" + b, pal), rng.range("ex.bop" + b, 0.8, 1));
    }
    return out;
  }




  /* -------- starfield: spiraling nebula ------------------------------ */
  function drawStarfield(rng, o, ramp, h) {
    var cx = 50, cy = 50;
    var bg = "#0a0d14";
    var out = '<rect x="0" y="0" width="100" height="100" fill="' + bg + '"/>';
    var bstars = rng.int("sf.bs", 40, 60);
    for (var i = 0; i < bstars; i++) {
      out += circle(rng.range("sf.bx" + i, 2, 98), rng.range("sf.by" + i, 2, 98),
        rng.range("sf.br" + i, 0.3, 1.2), "#ffffff", rng.range("sf.bop" + i, 0.25, 0.9));
    }
    var arms = rng.choose("sf.arms", [2, 2, 3]);
    var colors = [
      hslToHex(h, 0.9, 0.6),
      hslToHex((h + 70) % 360, 0.85, 0.62),
      hslToHex((h + 200) % 360, 0.85, 0.55),
      hslToHex((h + 290) % 360, 0.9, 0.6),
    ];
    var steps = 28;
    for (var a = 0; a < arms; a++) {
      var baseAng = (a / arms) * Math.PI * 2 + rng.nudge("sf.ba" + a, 0.4);
      var col = colors[a % colors.length];
      var d = "";
      for (var s = 0; s <= steps; s++) {
        var t = s / steps;
        var ang = baseAng + t * Math.PI * 2.2;
        var rr = t * 42 + rng.nudge("sf.n" + a + "." + s, 1.2);
        var px = cx + Math.cos(ang) * rr;
        var py = cy + Math.sin(ang) * rr;
        d += (s === 0 ? "M" : "L") + r2(px) + " " + r2(py) + " ";
      }
      out += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="1.8" stroke-linecap="round" opacity="' + r2(rng.range("sf.aop" + a, 0.45, 0.7)) + '"/>';
    }
    for (var b = 0; b < 12; b++) {
      var ax = cx + rng.nudge("sf.sx" + b, 22);
      var ay = cy + rng.nudge("sf.sy" + b, 22);
      out += circle(ax, ay, rng.range("sf.sr" + b, 1, 2.2), rng.choose("sf.sc" + b, colors), rng.range("sf.sop" + b, 0.6, 0.95));
    }
    out += circle(cx, cy, rng.range("sf.halo", 10, 14), hslToHex(h, 0.9, 0.55), 0.25);
    out += circle(cx, cy, rng.range("sf.core", 5, 8), "#000000");
    return out;
  }





  /* -------- portal: energy portal with concentric rings ------------- */
  function drawPortal(rng, o, ramp, h) {
    var cx = 50, cy = 50;
    var bg = o.dark ? "#070a12" : ramp.pale;
    var out = '<rect x="0" y="0" width="100" height="100" fill="' + bg + '"/>';
    var main = hslToHex(h, 0.9, 0.6);
    var accent = hslToHex((h + 60) % 360, 0.9, 0.55);
    var deep = hslToHex((h + 200) % 360, 0.85, 0.5);
    // outer glow plate
    out += circle(cx, cy, 46, main, 0.3);
    // concentric rings
    var rings = rng.choose("po.rings", [6, 7, 8]);
    for (var i = rings; i >= 1; i--) {
      var rr = 46 - i * (46 / rings) + 3;
      var col = i % 3 === 0 ? main : (i % 3 === 1 ? accent : deep);
      out += '<path d="M' + r2(cx - rr) + " " + r2(cy) + "A" + r2(rr) + " " + r2(rr) +
        " 0 1 1 " + r2(cx + rr) + " " + r2(cy) + "A" + r2(rr) + " " + r2(rr) +
        " 0 1 1 " + r2(cx - rr) + " " + r2(cy) + 'Z" fill="none" stroke="' + col +
        '" stroke-width="' + r2(rng.range("po.lw", 1.5, 2.8)) + '" opacity="' + r2(rng.range("po.op" + i, 0.55, 0.85)) + '"/>';
    }
    // 2 rotating spiral arcs for energy feel
    for (var s = 0; s < 2; s++) {
      var baseA = rng.range("po.sa" + s, 0, Math.PI);
      var steps = 18;
      var d = "";
      for (var st = 0; st <= steps; st++) {
        var tt = st / steps;
        var aa = baseA + tt * Math.PI * 2.2;
        var rr2 = 6 + tt * 36;
        var px = cx + Math.cos(aa) * rr2;
        var py = cy + Math.sin(aa) * rr2;
        d += (st === 0 ? "M" : "L") + r2(px) + " " + r2(py) + " ";
      }
      out += '<path d="' + d + '" fill="none" stroke="' + (s === 0 ? accent : deep) +
        '" stroke-width="1.8" stroke-linecap="round" opacity="' + r2(rng.range("po.sop" + s, 0.6, 0.85)) + '"/>';
    }
    // center bright core with depth effect
    out += circle(cx, cy, rng.range("po.cc", 8, 12), "#ffffff", 0.75);
    out += circle(cx, cy, rng.range("po.ic", 3, 6), "#000000");
    // small orbiting dots
    for (var k = 0; k < 4; k++) {
      var oa = rng.range("po.oa" + k, 0, Math.PI * 2);
      var orr = rng.range("po.orr" + k, 26, 40);
      out += circle(cx + Math.cos(oa) * orr, cy + Math.sin(oa) * orr,
        rng.range("po.ord" + k, 1.5, 2.8), main, 0.9);
    }
    return out;
  }


  /* ---------------- registry & main ---------------- */

  var STYLES = [
    "pixel", "robot", "emoji",
    "wireframe", "neonwaves",
    "petal", "waveform", "prism",
    "honeycomb", "explosion", "starfield",
    "portal"
  ];

  function tappyAvatar(seed, opts) {
    opts = opts || {};
    var rng = makeRng(seed, opts.overrides);
    var style = opts.style;
    if (STYLES.indexOf(style) < 0) style = style === "auto" ? rng.choose("style", STYLES) : "pixel";
    var h = opts.hue == null ? rng.range("hue", 0, 360) : opts.hue;
    var dark = !!opts.dark;
    var ramp = colorRamp(h, dark, rng);

    var plate = "";
    var bg = opts.background == null ? "none" : opts.background;
    if (bg === "circle" || bg === "square" || bg === "squircle") {
      var bgPath = bg === "square"
        ? "M0 0H100V100H0Z"
        : roundShape(50, 50, 50, 50, bg === "circle" ? 2 : 6);
      plate = '<path d="' + bgPath + '" fill="' + ramp.pale + '"/>';
    }

    var body =
      style === "pixel" ? drawPixelFace(rng, opts, ramp, h) :
      style === "robot" ? drawRobot(rng, opts, ramp) :
      style === "emoji" ? drawEmoji(rng, opts, ramp, h) :
      style === "wireframe" ? drawWireframe(rng, opts, ramp, h) :
      style === "neonwaves" ? drawNeonwaves(rng, opts, ramp, h) :
      style === "petal" ? drawPetal(rng, opts, ramp, h) :
      style === "waveform" ? drawWaveform(rng, opts, ramp, h) :
      style === "prism" ? drawPrism(rng, opts, ramp, h) :
      style === "honeycomb" ? drawHoneycomb(rng, opts, ramp, h) :
      style === "explosion" ? drawExplosion(rng, opts, ramp, h) :
      style === "starfield" ? drawStarfield(rng, opts, ramp, h) :
      style === "portal" ? drawPortal(rng, opts, ramp, h) :
      drawPortal(rng, opts, ramp, h);

    var dim = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : "";
    var title = "";
    if (opts.title) {
      title = "<title>" + String(opts.title).replace(/[&<>]/g, function (c) {
        return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
      }) + "</title>";
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"' + dim + ">" +
      title + plate + body + "</svg>";
  }

  tappyAvatar.uri = function (seed, opts) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(tappyAvatar(seed, opts));
  };
  tappyAvatar.STYLES = STYLES;
  tappyAvatar._hue = function (seed) { return makeRng(seed).range("hue", 0, 360); };
  tappyAvatar._hex = function (seed) { return ("0000000" + hashString(normalize(seed)).toString(16)).slice(-8); };
  tappyAvatar.version = "1.8.0";

  return tappyAvatar;
});
