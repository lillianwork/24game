/* solver.js — 口算出题器 + 方法标注 */
(function (global) {
  'use strict';

  function ones(n) { return n % 10; }

  function randInt(lo, hi) {
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  function opLabel(op) {
    if (op === '*') return '×';
    if (op === '/') return '÷';
    return op;
  }

  function formatNumber(n) { return String(n); }

  function answerOf(a, op, b) { return op === '+' ? a + b : a - b; }

  function q(a, op, b, method, band) {
    return { a: a, op: op, b: b, answer: answerOf(a, op, b), method: method || null, band: band };
  }

  // ---- band 0/1：5以内、10以内（无进位/退位，无方法）----
  function genSimple(band, max) {
    if (Math.random() < 0.5) {
      var a = randInt(1, max - 1);
      var b = randInt(1, max - a);
      return q(a, '+', b, null, band);
    } else {
      var a2 = randInt(1, max);
      var b2 = randInt(1, a2);
      return q(a2, '-', b2, null, band);
    }
  }

  // ---- band 2：20以内 ----
  function genCarryAdd20() {
    var a = randInt(2, 9);
    var b = randInt(11 - a, 9);   // 保证 a+b ∈ [11,18]，真进位
    return { a: a, b: b };
  }

  function genNoCarryAdd20() {
    if (Math.random() < 0.5) {
      var b = randInt(1, 9);
      return { a: 10, b: b };        // 10 + 几
    }
    var a = randInt(11, 18);
    var b2 = randInt(1, 9 - ones(a)); // 十几 + 几（不进位）
    return { a: a, b: b2 };
  }

  function genBorrowSub20() {
    if (Math.random() < 0.2) {
      var b = randInt(2, 9);
      return { a: 20, b: b, method: 'break10' };   // 20 - 几
    }
    var a = randInt(11, 18);
    var b2 = randInt(ones(a) + 1, 9);               // 十几 - 几（退位）
    var method = Math.random() < 0.5 ? 'break10' : 'flat10';
    return { a: a, b: b2, method: method };
  }

  function genNoBorrowSub20() {
    if (Math.random() < 0.5) {
      var a = randInt(11, 19);
      var b = randInt(1, ones(a));                  // 十几 - 几（不退位）
      return { a: a, b: b };
    }
    var a2 = randInt(11, 19);
    return { a: a2, b: 10 };                        // 十几 - 10
  }

  // ---- band 3..5：通用（30/50/100以内）----
  function genCarryAdd(max) {
    for (var t = 0; t < 200; t++) {
      var a = randInt(2, max - 1);
      var need = 10 - ones(a);
      if (need > 9) continue;                       // 个位为 0 不可能进位
      var bOnes = randInt(need, 9);
      var b = bOnes;
      var maxB = Math.min(max - a, 99);
      if (maxB >= bOnes + 10 && Math.random() < 0.5) {
        b = bOnes + 10 * randInt(1, Math.floor((maxB - bOnes) / 10));
      }
      if (a + b > max || a + b <= 10) continue;
      var big = Math.max(a, b), small = Math.min(a, b);
      if (small - (10 - ones(big)) < 1) continue;   // 凑十后要有剩余
      return { a: a, b: b };
    }
    return null;
  }

  function genNoCarryAdd(max) {
    for (var t = 0; t < 200; t++) {
      var a = randInt(1, max - 1);
      var bOnesMax = 9 - ones(a);
      if (bOnesMax < 0) continue;
      var bOnes = randInt(0, bOnesMax);
      var maxB = max - a;
      var bTens = randInt(0, Math.max(0, Math.floor((maxB - bOnes) / 10)));
      var b = bTens * 10 + bOnes;
      if (b < 1 || a + b > max) continue;
      return { a: a, b: b };
    }
    return null;
  }

  function genBorrowSub(max) {
    for (var t = 0; t < 200; t++) {
      var a = randInt(2, max);
      if (ones(a) >= 9) continue;                   // 需 ones(a) < 9 才有退位空间
      var single = max <= 30 || Math.random() < 0.5;
      if (single) {
        var bOnes = randInt(ones(a) + 1, 9);        // 一位数减数 → 破十/平十
        if (a - bOnes < 0) continue;
        var method = Math.random() < 0.5 ? 'break10' : 'flat10';
        return { a: a, b: bOnes, method: method };
      } else {
        var bOnes2 = randInt(ones(a) + 1, 9);       // 两位数减数 → 普通退位（不标注方法）
        var bTens = randInt(1, Math.floor((a - bOnes2) / 10));
        if (bTens < 1) continue;
        var b2 = bTens * 10 + bOnes2;
        if (a - b2 < 0) continue;
        return { a: a, b: b2, method: null };
      }
    }
    return null;
  }

  function genNoBorrowSub(max) {
    for (var t = 0; t < 200; t++) {
      var a = randInt(1, max);
      var bOnes = randInt(0, ones(a));
      var maxB = a;
      var bTens = randInt(0, Math.max(0, Math.floor((maxB - bOnes) / 10)));
      var b = bTens * 10 + bOnes;
      if (b < 1 || a - b < 0) continue;
      return { a: a, b: b };
    }
    return null;
  }

  // ---- 出题分派 ----
  function generate(level) {
    var diff = Levels.getDifficulty(level);
    var band = diff.band;
    var max = diff.max;

    if (band <= 1) return genSimple(band, max);

    if (band === 2) {
      for (var t2 = 0; t2 < 100; t2++) {
        var isAdd = Math.random() < 0.5;
        var carry = Math.random() < diff.carryPct;
        var r;
        if (isAdd && carry) { r = genCarryAdd20(); if (r) return q(r.a, '+', r.b, 'make10', 2); }
        else if (isAdd) { r = genNoCarryAdd20(); if (r) return q(r.a, '+', r.b, null, 2); }
        else if (carry) { r = genBorrowSub20(); if (r) return q(r.a, '-', r.b, r.method, 2); }
        else { r = genNoBorrowSub20(); if (r) return q(r.a, '-', r.b, null, 2); }
      }
      return fallback(2);
    }

    for (var t3 = 0; t3 < 100; t3++) {
      var isAdd2 = Math.random() < 0.5;
      var carry2 = Math.random() < diff.carryPct;
      var r2;
      if (isAdd2 && carry2) { r2 = genCarryAdd(max); if (r2) return q(r2.a, '+', r2.b, 'make10', band); }
      else if (isAdd2) { r2 = genNoCarryAdd(max); if (r2) return q(r2.a, '+', r2.b, null, band); }
      else if (carry2) { r2 = genBorrowSub(max); if (r2) return q(r2.a, '-', r2.b, r2.method, band); }
      else { r2 = genNoBorrowSub(max); if (r2) return q(r2.a, '-', r2.b, null, band); }
    }
    return fallback(band);
  }

  function fallback(band) {
    var max = Levels.TITLES[band].max;
    var a = randInt(1, max - 1);
    var b = randInt(1, max - a);
    return q(a, '+', b, null, band);
  }

  global.Solver = {
    ones: ones,
    randInt: randInt,
    opLabel: opLabel,
    formatNumber: formatNumber,
    answerOf: answerOf,
    generate: generate,
  };
})(window);
