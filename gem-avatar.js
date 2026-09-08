/*!
 * gem-avatar — deterministic character avatars from any string.
 * Single file, zero dependencies. UMD (browser global + CommonJS).
 *
 * Eight styles: snowflake, plant, pixel, line, geo, robot, emoji, silhouette.
 * Same string always produces the same SVG. Runs entirely in the browser,
 * no network requests, no backend.
 *
 * MIT License.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.gemAvatar = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------------- seed hashing ---------------- */

  function normalize(s) {
    return s.normalize("NFC").trim().toLowerCase();
  }

  // String -> uint32. Add-multiply-rotate-xor mix with position factor,
  // followed by a non-linear multiply-shift mix-down.
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

  /* ---------------- random source ---------------- */

  // One independent [0,1) float per key, derived from the seed hash and the
  // key hash mixed through a non-linear multiply-shift mixer. Each key is
  // independent; no chaining or streaming across keys.
  function makeRng(seed, overrides) {
    var base = hashString(normalize(seed));

    function raw(key) {
      var x = (base ^ hashString(key)) >>> 0;
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
    var f = function (v) {
      var n = Math.round((v + m) * 255);
      n = n < 0 ? 0 : n > 255 ? 255 : n;
      return (n < 16 ? "0" : "") + n.toString(16);
    };
    return "#" + f(r) + f(g) + f(b);
  }

  // Five authored steps from one hue, with per-name micro-jitter on hue,
  // saturation and lightness so neighbouring seeds never collapse to the
  // same hex colour.
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
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  // Rounded closed shape sampled from the |x/rx|^n + |y/ry|^n = 1 parametric
  // equation, rendered as a light polygon.
  function roundShape(cx, cy, rx, ry, n) {
    var pts = [];
    var steps = 28;
    var exp = 2 / n;
    for (var i = 0; i < steps; i++) {
      var t = (i / steps) * Math.PI * 2;
      var ct = Math.cos(t), st = Math.sin(t);
      var x = rx * (ct < 0 ? -1 : 1) * Math.pow(Math.abs(ct), exp);
      var y = ry * (st < 0 ? -1 : 1) * Math.pow(Math.abs(st), exp);
      pts.push([cx + x, cy + y]);
    }
    return polygonPath(pts);
  }

  function polygonPath(pts) {
    var d = "M" + r2(pts[0][0]) + " " + r2(pts[0][1]);
    for (var i = 1; i < pts.length; i++) d += "L" + r2(pts[i][0]) + " " + r2(pts[i][1]);
    return d + "Z";
  }

  function circle(cx, cy, r, fill, op) {
    return '<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" fill="' + fill + '"' +
      (op == null ? "" : ' fill-opacity="' + r2(op) + '"') + "/>";
  }

  // Upper half-ellipse cap bulging up by `depth`.
  function arcCap(cx, cy, rx, depth) {
    return "M" + r2(cx - rx) + " " + r2(cy) +
      "A" + r2(rx) + " " + r2(depth) + " 0 0 1 " + r2(cx + rx) + " " + r2(cy) + "Z";
  }

  // Irregular star-shaped outline.
  function starOutline(rng, pre, n, R) {
    var verts = [];
    var tilt = rng.nudge(pre + ".tilt", Math.PI / n);
    for (var i = 0; i < n; i++) {
      var a = tilt + (2 * Math.PI * i) / n + rng.nudge(pre + ".a" + i, (Math.PI / n) * 0.35);
      var r = R * (1 + rng.nudge(pre + ".r" + i, 0.16));
      verts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
    }
    return verts;
  }

  /* ================================================================
   * CHARACTER STYLES
   * ================================================================ */

  /* -------- snowflake: six-fold symmetric crystal ------------------ */
  function drawSnowflake(rng, o, ramp) {
    var out = "";
    var armLen = rng.range("sf.len", 30, 38);
    var armW = rng.range("sf.w", 2.5, 4);
    var centerR = rng.range("sf.cr", 4, 7);
    var branchN = rng.int("sf.bn", 2, 3);
    var branchLen = rng.range("sf.bl", 6, 11);
    var col = ramp.light;
    var col2 = ramp.main;
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i - Math.PI / 2;
      var ex = 50 + armLen * Math.cos(a);
      var ey = 50 + armLen * Math.sin(a);
      out += '<line x1="50" y1="50" x2="' + r2(ex) + '" y2="' + r2(ey) + '" stroke="' + col + '" stroke-width="' + r2(armW) + '" stroke-linecap="round"/>';
      for (var b = 1; b <= branchN; b++) {
        var t = b / (branchN + 1);
        var bx = 50 + armLen * t * Math.cos(a);
        var by = 50 + armLen * t * Math.sin(a);
        var bl = branchLen * (1 - t * 0.3);
        var a1 = a + Math.PI / 4, a2 = a - Math.PI / 4;
        out += '<line x1="' + r2(bx) + '" y1="' + r2(by) + '" x2="' + r2(bx + bl * Math.cos(a1)) + '" y2="' + r2(by + bl * Math.sin(a1)) + '" stroke="' + col + '" stroke-width="' + r2(armW * 0.7) + '" stroke-linecap="round"/>';
        out += '<line x1="' + r2(bx) + '" y1="' + r2(by) + '" x2="' + r2(bx + bl * Math.cos(a2)) + '" y2="' + r2(by + bl * Math.sin(a2)) + '" stroke="' + col + '" stroke-width="' + r2(armW * 0.7) + '" stroke-linecap="round"/>';
      }
      out += circle(ex, ey, armW * 0.9, col2);
    }
    out += circle(50, 50, centerR, col2);
    if (rng.yes("sf.spark", 0.6)) {
      for (var s = 0; s < 3; s++) {
        var sa = rng.range("sf.sa" + s, 0, Math.PI * 2);
        var sr = rng.range("sf.sr" + s, 12, 28);
        out += circle(50 + sr * Math.cos(sa), 50 + sr * Math.sin(sa), 1.5, ramp.pale, 0.8);
      }
    }
    return out;
  }

  /* -------- plant: potted cactus / leaf / sprout ------------------- */
  function drawPlant(rng, o, ramp) {
    var out = "";
    var potCol = ramp.deep;
    var potTop = 72, potBot = 92;
    var potW = rng.range("pl.pw", 22, 28);
    out += '<path d="M' + r2(50 - potW) + ' ' + r2(potTop) +
      ' L' + r2(50 + potW) + ' ' + r2(potTop) +
      ' L' + r2(50 + potW * 0.8) + ' ' + r2(potBot) +
      ' L' + r2(50 - potW * 0.8) + ' ' + r2(potBot) + ' Z" fill="' + potCol + '"/>';
    out += '<rect x="' + r2(50 - potW - 2) + '" y="' + r2(potTop - 4) + '" width="' + r2(potW * 2 + 4) + '" height="5" rx="2" fill="' + ramp.ink + '"/>';
    var type = rng.choose("pl.type", ["cactus", "leaf", "sprout"]);
    var green = ramp.main;
    var greenLight = ramp.light;
    if (type === "cactus") {
      var cw = rng.range("pl.cw", 10, 14);
      var ch = rng.range("pl.ch", 28, 36);
      out += '<rect x="' + r2(50 - cw / 2) + '" y="' + r2(potTop - ch) + '" width="' + r2(cw) + '" height="' + r2(ch) + '" rx="' + r2(cw / 2) + '" fill="' + green + '"/>';
      if (rng.yes("pl.armL", 0.6)) {
        var al = rng.range("pl.al", 8, 14);
        out += '<rect x="' + r2(50 - cw / 2 - al + 2) + '" y="' + r2(potTop - ch * 0.6) + '" width="' + r2(al) + '" height="' + r2(cw * 0.7) + '" rx="' + r2(cw * 0.35) + '" fill="' + green + '"/>';
      }
      if (rng.yes("pl.armR", 0.6)) {
        var ar = rng.range("pl.ar", 8, 14);
        out += '<rect x="' + r2(50 + cw / 2 - 2) + '" y="' + r2(potTop - ch * 0.5) + '" width="' + r2(ar) + '" height="' + r2(cw * 0.7) + '" rx="' + r2(cw * 0.35) + '" fill="' + green + '"/>';
      }
      if (rng.yes("pl.flower", 0.5)) {
        out += circle(50, potTop - ch - 2, 4, ramp.pale);
        out += circle(50, potTop - ch - 2, 2, ramp.deep);
      }
      out += circle(50 - 4, potTop - ch * 0.5, 1.8, ramp.ink);
      out += circle(50 + 4, potTop - ch * 0.5, 1.8, ramp.ink);
      out += '<path d="M' + r2(50 - 2.5) + ' ' + r2(potTop - ch * 0.5 + 5) + 'Q50 ' + r2(potTop - ch * 0.5 + 7) + ' ' + r2(50 + 2.5) + ' ' + r2(potTop - ch * 0.5 + 5) + '" fill="none" stroke="' + ramp.ink + '" stroke-width="1.5" stroke-linecap="round"/>';
    } else if (type === "leaf") {
      var lh = rng.range("pl.lh", 30, 40);
      var lw = rng.range("pl.lw", 16, 22);
      var ly = potTop - lh / 2;
      var rot = rng.nudge("pl.rot", 8);
      out += '<ellipse cx="50" cy="' + r2(ly) + '" rx="' + r2(lw) + '" ry="' + r2(lh / 2) + '" fill="' + green + '" transform="rotate(' + r2(rot) + ' 50 ' + r2(ly) + ')"/>';
      out += '<line x1="50" y1="' + r2(ly - lh / 2 + 4) + '" x2="50" y2="' + r2(ly + lh / 2 - 4) + '" stroke="' + greenLight + '" stroke-width="1.5"/>';
      if (rng.yes("pl.sleaf", 0.5)) {
        out += '<ellipse cx="' + r2(50 - lw * 0.7) + '" cy="' + r2(ly + 5) + '" rx="' + r2(lw * 0.5) + '" ry="' + r2(lh * 0.3) + '" fill="' + green + '" transform="rotate(-25 ' + r2(50 - lw * 0.7) + ' ' + r2(ly + 5) + ')"/>';
      }
    } else {
      out += '<rect x="48.5" y="' + r2(potTop - 20) + '" width="3" height="20" rx="1.5" fill="' + green + '"/>';
      out += '<ellipse cx="' + r2(50 - 8) + '" cy="' + r2(potTop - 22) + '" rx="9" ry="5" fill="' + green + '" transform="rotate(-30 ' + r2(50 - 8) + ' ' + r2(potTop - 22) + ')"/>';
      out += '<ellipse cx="' + r2(50 + 8) + '" cy="' + r2(potTop - 24) + '" rx="9" ry="5" fill="' + green + '" transform="rotate(30 ' + r2(50 + 8) + ' ' + r2(potTop - 24) + ')"/>';
    }
    return out;
  }

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
    // grid: -1 empty, 0 skin, 1 hair, 2 features, 3 blush
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
      for (var y = cy - r + hh; y < cy - r + hh + 1 && y < n; y++) for (var x = c - fr; x <= c + fr; x++) {
        if (y >= 0 && x >= 0 && x < n && g[y][x] === 0) g[y][x] = 1;
      }
    }
    if (hair === 2) {
      for (var y = cy - r; y <= cy + Math.floor(r * 0.3) && y < n; y++) {
        if (y >= 0 && c - r >= 0 && g[y][c - r] === 0) g[y][c - r] = 1;
        if (y >= 0 && c + r < n && g[y][c + r] === 0) g[y][c + r] = 1;
      }
    }
    if (hair === 3) {
      for (var y = cy - r; y < cy - r + hh && y < n; y++) {
        if (y >= 0 && g[y][c] === 0) g[y][c] = 1;
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
        runStart = x;
        runColor = col;
      }
    }
    return out;
  }

  /* -------- line: minimal line drawing ------------------------------ */
  function drawLine(rng, o, ramp) {
    var cx = 50, cy = 52;
    var rx = rng.range("ln.rx", 30, 36), ry = rng.range("ln.ry", 28, 34);
    var lw = rng.range("ln.lw", 2.2, 3.4);
    var out = '<path d="' + roundShape(cx, cy, rx, ry, 2.4) + '" fill="none" stroke="' + ramp.ink + '" stroke-width="' + r2(lw) + '"/>';
    var hairs = rng.int("ln.h", 2, 5);
    for (var i = 0; i < hairs; i++) {
      var hx = rng.range("ln.hx" + i, -rx * 0.6, rx * 0.6);
      var hlen = rng.range("ln.hl" + i, 5, 10);
      var hdrift = rng.range("ln.hd" + i, -0.4, 0.4);
      out += '<path d="M' + r2(hx) + ' ' + r2(cy - ry + 1) + 'L' + r2(hx + hdrift * 4) + ' ' + r2(cy - ry - hlen) + '" stroke="' + ramp.deep + '" stroke-width="' + r2(Math.max(1.6, lw * 0.75)) + '" stroke-linecap="round"/>';
    }
    var gap = rng.range("ln.gap", 9, 13);
    var er = rng.range("ln.er", 1.8, 3);
    out += circle(cx - gap, cy - 2, er, ramp.ink);
    out += circle(cx + gap, cy - 2, er, ramp.ink);
    var mw = rng.range("ln.mw", 4, 7), md = rng.range("ln.md", 2, 5);
    var d = rng.yes("ln.m", 0.5)
      ? "M" + r2(cx - mw) + " " + r2(cy + 7) + "Q" + r2(cx) + " " + r2(cy + 7 + md) + " " + r2(cx + mw) + " " + r2(cy + 7)
      : "M" + r2(cx - mw) + " " + r2(cy + 7) + "L" + r2(cx + mw) + " " + r2(cy + 7);
    out += '<path d="' + d + '" fill="none" stroke="' + ramp.ink + '" stroke-width="' + r2(lw * 0.8) + '" stroke-linecap="round"/>';
    return out;
  }

  /* -------- geo: low-poly face --------------------------------------- */
  function drawGeo(rng, o, ramp, h) {
    var n = rng.int("go.n", 5, 7);
    var R = rng.range("go.R", 35, 41);
    var verts = starOutline(rng, "go", n, R);
    var skin = rng.choose("go.skin", ["main", "light"]);
    var baseL = skin === "main" ? 0.52 : 0.7;
    var baseS = 0.62;
    var out = "";
    var tris = [];
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      var cyc = (verts[i][1] + verts[j][1]) / 3 + 100 / 3;
      tris.push({ i: i, cy: cyc, pts: [verts[i], verts[j], [50, 50]] });
    }
    var topN = Math.max(2, Math.floor(n * 0.4));
    var topIdx = tris.slice().sort(function (a, b) { return a.cy - b.cy; }).slice(0, topN).map(function (x) { return x.i; });
    for (var i = 0; i < n; i++) {
      var isHair = topIdx.indexOf(i) >= 0;
      var l = isHair ? 0.3 : clamp(baseL + (i % 2 ? 1 : -1) * 0.1 + rng.nudge("go.f" + i, 0.05), 0.3, 0.85);
      var col = isHair ? ramp.deep : hslToHex(h + rng.nudge("go.f" + i, 6), baseS, l);
      out += '<path d="' + polygonPath(tris[i].pts) + '" fill="' + col + '"/>';
    }
    var gap = rng.range("go.gap", R * 0.16, R * 0.24);
    var ewr = rng.range("go.ew", 3.2, 4.6), ehr = rng.range("go.eh", 4, 6);
    out += '<ellipse cx="' + r2(50 - gap) + '" cy="' + r2(42) + '" rx="' + r2(ewr) + '" ry="' + r2(ehr) + '" fill="' + ramp.ink + '"/>';
    out += '<ellipse cx="' + r2(50 + gap) + '" cy="' + r2(42) + '" rx="' + r2(ewr) + '" ry="' + r2(ehr) + '" fill="' + ramp.ink + '"/>';
    out += '<path d="M' + r2(50 - 4) + ' ' + r2(55) + 'Q' + r2(50) + ' ' + r2(58) + ' ' + r2(50 + 4) + ' ' + r2(55) + '" fill="none" stroke="' + ramp.ink + '" stroke-width="2.2" stroke-linecap="round"/>';
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

  /* -------- silhouette: negative-space head & shoulders ------------- */
  function drawSilhouette(rng, o, ramp) {
    var out = "";
    var dark = rng.yes("si.dark", 0.6) ? ramp.ink : ramp.deep;
    var cut = rng.yes("si.cut", 0.55) ? ramp.pale : ramp.main;
    var hr = rng.range("si.hr", 22, 26);
    var hcy = 46;
    out += '<circle cx="50" cy="' + r2(hcy) + '" r="' + r2(hr) + '" fill="' + dark + '"/>';
    var hd = rng.range("si.hd", 9, 14);
    out += '<path d="' + arcCap(50, hcy, hr, hd) + '" fill="' + ramp.ink + '"/>';
    var sw = rng.range("si.sw", 28, 36);
    out += '<path d="M' + r2(50 - sw) + ' 100 C' + r2(50 - sw) + ' 70 50 70 ' + r2(50 + sw) + ' 100 Z" fill="' + dark + '"/>';
    var gap = rng.range("si.gap", 7, 10);
    out += circle(50 - gap, hcy + 2, 2.8, cut);
    out += circle(50 + gap, hcy + 2, 2.8, cut);
    out += '<path d="M' + r2(50 - 3.5) + ' ' + r2(hcy + 9) + 'Q50 ' + r2(hcy + 12) + ' ' + r2(50 + 3.5) + ' ' + r2(hcy + 9) + '" fill="none" stroke="' + cut + '" stroke-width="2" stroke-linecap="round"/>';
    return out;
  }

  /* ---------------- registry & main ---------------- */

  var STYLES = ["snowflake", "plant", "pixel", "line", "geo", "robot", "emoji", "silhouette"];

  function gemAvatar(seed, opts) {
    opts = opts || {};
    var rng = makeRng(seed, opts.overrides);
    var style = opts.style;
    if (STYLES.indexOf(style) < 0) style = style === "auto" ? rng.choose("style", STYLES) : "snowflake";
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
      style === "snowflake" ? drawSnowflake(rng, opts, ramp) :
      style === "plant" ? drawPlant(rng, opts, ramp) :
      style === "pixel" ? drawPixelFace(rng, opts, ramp, h) :
      style === "line" ? drawLine(rng, opts, ramp) :
      style === "geo" ? drawGeo(rng, opts, ramp, h) :
      style === "robot" ? drawRobot(rng, opts, ramp) :
      style === "emoji" ? drawEmoji(rng, opts, ramp, h) :
      drawSilhouette(rng, opts, ramp);

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

  gemAvatar.uri = function (seed, opts) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(gemAvatar(seed, opts));
  };
  gemAvatar.STYLES = STYLES;
  gemAvatar._hue = function (seed) { return makeRng(seed).range("hue", 0, 360); };
  gemAvatar._hex = function (seed) { return ("0000000" + hashString(normalize(seed)).toString(16)).slice(-8); };
  gemAvatar.version = "0.5.1";

  return gemAvatar;
});
