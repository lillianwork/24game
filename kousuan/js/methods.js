/* methods.js — 凑十法/破十法/平十法 元数据 + 拆解步骤 + 讲解文案（纯逻辑） */
(function (global) {
  'use strict';

  function ones(n) { return n % 10; }

  function num(v) { return { t: 'num', v: v }; }
  function op(o) { return { t: 'op', v: o }; }
  function qmark() { return { t: 'op', v: '?' }; }

  var META = {
    make10: {
      key: 'make10', name: '凑十法', emoji: '🤝',
      slogan: '看大数，拆小数，凑成十',
      description: '遇到进位加法，先把小的数拆开，凑成 10（或整十），再加剩下的。',
      examples: [
        { a: 8, op: '+', b: 5 },
        { a: 7, op: '+', b: 6 },
        { a: 9, op: '+', b: 4 },
      ],
    },
    break10: {
      key: 'break10', name: '破十法', emoji: '💥',
      slogan: '拆成十，先减十，再加',
      description: '遇到退位减法，先把被减数拆成 10 和几，用 10 去减，再加回剩下的几。',
      examples: [
        { a: 13, op: '-', b: 5 },
        { a: 12, op: '-', b: 4 },
        { a: 16, op: '-', b: 9 },
      ],
    },
    flat10: {
      key: 'flat10', name: '平十法', emoji: '🛤️',
      slogan: '先减到十，再继续减',
      description: '遇到退位减法，先把减数拆开，先减到 10（或整十），再减剩下的。',
      examples: [
        { a: 13, op: '-', b: 5 },
        { a: 14, op: '-', b: 6 },
        { a: 15, op: '-', b: 7 },
      ],
    },
  };

  function eqCard(a, opc, b) {
    return [num(a), op(opc), num(b), op('='), qmark()];
  }

  function decomposeMake10(q) {
    var big = Math.max(q.a, q.b);
    var small = Math.min(q.a, q.b);
    var gap = 10 - ones(big);
    var rem = small - gap;
    var roundTen = big + gap;
    var answer = roundTen + rem;
    return {
      explain: big + ' 加 ' + small + '，把 ' + small + ' 分成 ' + gap + ' 和 ' + rem +
               '，' + big + '+' + gap + ' 凑成 ' + roundTen + '，' + roundTen + '+' + rem + ' 得 ' + answer + '。',
      steps: [
        { kind: 'equation', caption: q.a + ' + ' + q.b + ' = ?', cards: eqCard(q.a, '+', q.b) },
        { kind: 'split', caption: '把 ' + small + ' 分成 ' + gap + ' 和 ' + rem, source: small, parts: [gap, rem] },
        { kind: 'combine', caption: big + ' + ' + gap + ' = ' + roundTen + '（凑成整十）', cards: [num(big), op('+'), num(gap), op('='), num(roundTen)] },
        { kind: 'combine', caption: roundTen + ' + ' + rem + ' = ' + answer, cards: [num(roundTen), op('+'), num(rem), op('='), num(answer)] },
        { kind: 'answer', caption: '所以 ' + q.a + ' + ' + q.b + ' = ' + answer, answer: answer },
      ],
    };
  }

  function decomposeBreak10(q) {
    var a = q.a, b = q.b;
    var left = a - 10;
    var r = 10 - b;
    var answer = left + r;
    return {
      explain: a + ' 减 ' + b + '，把 ' + a + ' 拆成 10 和 ' + left + '，10-' + b + '=' + r +
               '，' + left + '+' + r + '=' + answer + '。',
      steps: [
        { kind: 'equation', caption: a + ' - ' + b + ' = ?', cards: eqCard(a, '-', b) },
        { kind: 'split', caption: '把 ' + a + ' 拆成 10 和 ' + left, source: a, parts: [10, left] },
        { kind: 'combine', caption: '10 - ' + b + ' = ' + r, cards: [num(10), op('-'), num(b), op('='), num(r)] },
        { kind: 'combine', caption: left + ' + ' + r + ' = ' + answer, cards: [num(left), op('+'), num(r), op('='), num(answer)] },
        { kind: 'answer', caption: '所以 ' + a + ' - ' + b + ' = ' + answer, answer: answer },
      ],
    };
  }

  function decomposeFlat10(q) {
    var a = q.a, b = q.b;
    var first = ones(a);
    var rest = b - ones(a);
    var roundDown = a - ones(a);
    var answer = roundDown - rest;
    return {
      explain: a + ' 减 ' + b + '，先把 ' + b + ' 分成 ' + first + ' 和 ' + rest + '，' + a + '-' + first +
               '=' + roundDown + '，' + roundDown + '-' + rest + '=' + answer + '。',
      steps: [
        { kind: 'equation', caption: a + ' - ' + b + ' = ?', cards: eqCard(a, '-', b) },
        { kind: 'split', caption: '把 ' + b + ' 分成 ' + first + ' 和 ' + rest, source: b, parts: [first, rest] },
        { kind: 'combine', caption: a + ' - ' + first + ' = ' + roundDown, cards: [num(a), op('-'), num(first), op('='), num(roundDown)] },
        { kind: 'combine', caption: roundDown + ' - ' + rest + ' = ' + answer, cards: [num(roundDown), op('-'), num(rest), op('='), num(answer)] },
        { kind: 'answer', caption: '所以 ' + a + ' - ' + b + ' = ' + answer, answer: answer },
      ],
    };
  }

  function decompose(q) {
    if (q.method === 'make10') return decomposeMake10(q);
    if (q.method === 'break10') return decomposeBreak10(q);
    if (q.method === 'flat10') return decomposeFlat10(q);
    return {
      steps: [{ kind: 'equation', caption: q.a + ' ' + q.op + ' ' + q.b + ' = ?', cards: eqCard(q.a, q.op, q.b) }],
      explain: '直接算一算。',
    };
  }

  function explain(q) { return decompose(q).explain; }

  function list() { return [META.make10, META.break10, META.flat10]; }

  global.Methods = {
    META: META,
    ones: ones,
    decompose: decompose,
    explain: explain,
    list: list,
  };
})(window);
