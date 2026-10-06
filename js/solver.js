/* solver.js — 求解器 / 出题器 / 表达式求值 */
(function (global) {
  'use strict';

  var EPS = 1e-9;

  function close(a, b) { return Math.abs(a - b) < EPS; }

  function apply(a, b, op) {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return a / b;
    throw new Error('未知运算符 ' + op);
  }

  function opLabel(op) {
    if (op === '*') return '×';
    if (op === '/') return '÷';
    return op;
  }

  function randInt(lo, hi) {
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  function properDivisors(n) {
    var out = [];
    for (var d = 2; d <= n / 2; d++) if (n % d === 0) out.push(d);
    return out;
  }

  function isInt(n) { return close(n, Math.round(n)); }

  function formatNumber(n) {
    if (isInt(n)) return String(Math.round(n));
    var r = Math.round(n * 1000) / 1000;
    return String(r);
  }

  // 求解：返回一条可行路径（优先整数、非负的「干净」解），无解返回 null
  function solvePath(numbers, ops, target) {
    target = target == null ? 24 : target;

    function attempt(preferClean) {
      function rec(list, path) {
        if (list.length === 1) {
          if (close(list[0], target)) return path.slice();
          return null;
        }
        var cands = [];
        for (var i = 0; i < list.length; i++) {
          for (var j = 0; j < list.length; j++) {
            if (i === j) continue;
            for (var k = 0; k < ops.length; k++) {
              var op = ops[k];
              if (op === '/' && close(list[j], 0)) continue;
              var result = apply(list[i], list[j], op);
              cands.push({ i: i, j: j, op: op, result: result, clean: isInt(result) && result >= 0 });
            }
          }
        }
        cands.sort(function (x, y) {
          if (y.clean !== x.clean) return y.clean - x.clean;
          return Math.abs(x.result) - Math.abs(y.result);
        });
        for (var c = 0; c < cands.length; c++) {
          var cd = cands[c];
          if (preferClean && !cd.clean) continue;
          var next = [];
          for (var m = 0; m < list.length; m++) if (m !== cd.i && m !== cd.j) next.push(list[m]);
          next.push(cd.result);
          path.push({ a: list[cd.i], b: list[cd.j], op: cd.op, result: cd.result });
          var res = rec(next, path);
          if (res) return res;
          path.pop();
        }
        return null;
      }
      return rec(numbers.slice(), []);
    }

    return attempt(true) || attempt(false);
  }

  function canSolve(numbers, ops, target) {
    return solvePath(numbers, ops, target) !== null;
  }

  function tryOp(a, b, op) {
    if (op === '/' && close(b, 0)) return null;
    return apply(a, b, op);
  }

  // 左结合（连击）求解：形如 ((((n1 op n2) op n3) op n4) ...)，用于分步累加模型
  function solveLeftToRight(numbers, ops, target) {
    target = target == null ? 24 : target;
    var n = numbers.length;
    var perm = [], used = [];
    for (var i = 0; i < n; i++) used.push(false);

    function chain(idx, cur, path, cleanPass) {
      if (idx === n) return close(cur, target) ? path.slice() : null;
      for (var o = 0; o < ops.length; o++) {
        var nr = tryOp(cur, perm[idx], ops[o]);
        if (nr === null) continue;
        if (cleanPass === 0 && !(isInt(nr) && nr >= 0)) continue;
        path.push({ a: cur, b: perm[idx], op: ops[o], result: nr });
        var r = chain(idx + 1, nr, path, cleanPass);
        if (r) return r;
        path.pop();
      }
      return null;
    }

    function buildPerm() {
      if (perm.length === n) {
        for (var c = 0; c < 2; c++) {
          var r = chain(1, perm[0], [], c);
          if (r) return r;
        }
        return null;
      }
      for (var i = 0; i < n; i++) {
        if (used[i]) continue;
        used[i] = true; perm.push(numbers[i]);
        var r = buildPerm();
        if (r) return r;
        perm.pop(); used[i] = false;
      }
      return null;
    }
    return buildPerm();
  }

  // 逆向出题：从目标数反向拆分，保证有解（且存在整数路径）
  function generate(count, ops, minNum, maxNum, target) {
    target = target == null ? 24 : target;
    var MAX_ATTEMPTS = 20000;
    for (var attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      var nums = [target];
      var ok = true;
      while (nums.length < count) {
        var idx = Math.floor(Math.random() * nums.length);
        var x = nums[idx];
        var op = ops[Math.floor(Math.random() * ops.length)];
        var isLast = (nums.length + 1 === count);
        var a, b;

        if (op === '+') {
          var lo, hi;
          if (isLast) {
            lo = Math.max(minNum, x - maxNum);
            hi = Math.min(x - minNum, maxNum, x - 1);
          } else {
            lo = 1; hi = x - 1;
          }
          if (lo > hi || hi < 1) { ok = false; break; }
          a = randInt(lo, hi);
          b = x - a;
        } else if (op === '-') {
          if (isLast) {
            var bLo = minNum, bHi = maxNum - x;
            if (bLo > bHi || bHi < 1) { ok = false; break; }
            b = randInt(bLo, bHi);
          } else {
            b = randInt(1, 12);
          }
          a = x + b;
        } else if (op === '*') {
          var divs = properDivisors(Math.round(x));
          if (isLast) {
            divs = divs.filter(function (d) {
              var q = x / d;
              return d >= minNum && d <= maxNum && q >= minNum && q <= maxNum;
            });
          }
          if (divs.length === 0) { ok = false; break; }
          a = divs[Math.floor(Math.random() * divs.length)];
          b = x / a;
        } else if (op === '/') {
          if (isLast) {
            var dLo = minNum, dHi = Math.floor(maxNum / x);
            if (dLo > dHi || dHi < 1) { ok = false; break; }
            b = randInt(dLo, dHi);
          } else {
            b = randInt(1, 6);
          }
          a = x * b;
        }

        if (!isInt(a) || !isInt(b) || a <= 0 || b <= 0) { ok = false; break; }
        if (!isLast && (a > 200 || b > 200)) { ok = false; break; }
        nums[idx] = a;
        nums.push(b);
      }
      if (!ok) continue;
      var bad = nums.some(function (n) { return n < minNum || n > maxNum; });
      if (bad) continue;
      return nums.map(function (n) { return Math.round(n); });
    }
    return null;
  }

  // 表达式求值：tokens 为数组，元素为 number 或 '+','-','*','/','(',')'
  function evalTokens(tokens) {
    var output = [];
    var stack = [];
    var prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (typeof t === 'number') {
        output.push(t);
      } else if (t === '(') {
        stack.push(t);
      } else if (t === ')') {
        while (stack.length && stack[stack.length - 1] !== '(') output.push(stack.pop());
        if (stack.length === 0) throw new Error('括号不匹配');
        stack.pop();
      } else {
        while (stack.length && stack[stack.length - 1] !== '(' &&
               prec[stack[stack.length - 1]] >= prec[t]) {
          output.push(stack.pop());
        }
        stack.push(t);
      }
    }
    while (stack.length) {
      var op = stack.pop();
      if (op === '(') throw new Error('括号不匹配');
      output.push(op);
    }
    var s = [];
    for (var j = 0; j < output.length; j++) {
      var tok = output[j];
      if (typeof tok === 'number') {
        s.push(tok);
      } else {
        if (s.length < 2) throw new Error('表达式不完整');
        var b = s.pop(), a = s.pop();
        if (tok === '/' && close(b, 0)) throw new Error('不能除以0');
        s.push(apply(a, b, tok));
      }
    }
    if (s.length !== 1) throw new Error('表达式不完整');
    return s[0];
  }

  function extractNumbers(tokens) {
    return tokens.filter(function (t) { return typeof t === 'number'; });
  }

  function sameMultiset(a, b) {
    var sa = a.slice().sort(function (x, y) { return x - y; });
    var sb = b.slice().sort(function (x, y) { return x - y; });
    if (sa.length !== sb.length) return false;
    for (var i = 0; i < sa.length; i++) if (!close(sa[i], sb[i])) return false;
    return true;
  }

  function tokenToString(tokens) {
    return tokens.map(function (t) {
      if (typeof t === 'number') return String(t);
      return opLabel(t);
    }).join(' ');
  }

  global.Solver = {
    EPS: EPS,
    close: close,
    apply: apply,
    opLabel: opLabel,
    formatNumber: formatNumber,
    isInt: isInt,
    randInt: randInt,
    solvePath: solvePath,
    canSolve: canSolve,
    solveLeftToRight: solveLeftToRight,
    generate: generate,
    evalTokens: evalTokens,
    extractNumbers: extractNumbers,
    sameMultiset: sameMultiset,
    tokenToString: tokenToString,
  };
})(window);
