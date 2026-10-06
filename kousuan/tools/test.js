/* tools/test.js — 口算出题器/方法拆解 冒烟测试 */
global.window = global;
require('../js/solver.js');
require('../js/methods.js');
require('../js/levels.js');

const Solver = global.Solver;
const Methods = global.Methods;
const Levels = global.Levels;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}
function ones(n) { return n % 10; }

// 1. 出题范围 + 答案正确性 + 方法有效性
console.log('\n[1] 出题与答案校验（每 band 5000 题）');
for (let band = 0; band <= 5; band++) {
  const level = band * 10 + 5;          // 每个 title 中间一关
  const max = Levels.getDifficulty(level).max;
  let bad = 0;
  for (let i = 0; i < 5000; i++) {
    const q = Solver.generate(level);
    if (!q) { bad++; continue; }
    if (q.answer !== Solver.answerOf(q.a, q.op, q.b)) { ok(false, `band${band} 答案错误 ${q.a}${q.op}${q.b}=${q.answer}`); bad++; continue; }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > max) { ok(false, `band${band} 答案越界 ${q.answer} (max ${max})`); bad++; continue; }
    if (q.op === '-' && q.b <= 0) { ok(false, `band${band} 减法 b<=0`); bad++; continue; }
    if (q.method === 'make10' && ones(q.a) + ones(q.b) < 10) { ok(false, `band${band} make10 未真进位 ${q.a}+${q.b}`); bad++; }
    if ((q.method === 'break10' || q.method === 'flat10') && !(ones(q.a) < q.b && q.b < 10)) {
      ok(false, `band${band} ${q.method} 未真退位 ${q.a}-${q.b}`); bad++;
    }
  }
  ok(bad === 0, `band${band} (${max}以内) 5000 题${bad ? ' 有 ' + bad + ' 题失败' : ' 全部通过'}`);
}

// 2. 拆解回环
console.log('\n[2] 方法拆解回环（每 band 2000 题）');
for (let band = 0; band <= 5; band++) {
  const level = band * 10 + 5;
  let bad = 0;
  for (let i = 0; i < 2000; i++) {
    const q = Solver.generate(level);
    if (!q || !q.method) continue;
    const dec = Methods.decompose(q);
    const last = dec.steps[dec.steps.length - 1];
    if (last.answer !== q.answer) { ok(false, `band${band} 拆解末步 ${last.answer} != ${q.answer}`); bad++; continue; }
    let neg = false;
    dec.steps.forEach(function (s) {
      if (s.parts) s.parts.forEach(function (p) { if (p < 0 || !Number.isInteger(p)) neg = true; });
      if (s.cards) s.cards.forEach(function (c) { if (c.t === 'num' && (c.v < 0 || !Number.isInteger(c.v))) neg = true; });
    });
    if (neg) { ok(false, `band${band} 拆解含负数/非整数`); bad++; }
  }
  ok(bad === 0, `band${band} 拆解回环${bad ? ' 有 ' + bad + ' 题失败' : ' 通过'}`);
}

// 3. band2 三法覆盖
console.log('\n[3] 20以内三法覆盖');
const seen = { make10: 0, break10: 0, flat10: 0 };
for (let i = 0; i < 20000; i++) {
  const q = Solver.generate(25);
  if (q && q.method) seen[q.method]++;
}
ok(seen.make10 > 0, `凑十法出现 ${seen.make10} 次`);
ok(seen.break10 > 0, `破十法出现 ${seen.break10} 次`);
ok(seen.flat10 > 0, `平十法出现 ${seen.flat10} 次`);

// 4. title / 积分
console.log('\n[4] title 与积分');
ok(Levels.getTitle(1).name === '5以内', `getTitle(1)=${Levels.getTitle(1).name}`);
ok(Levels.getTitle(61).name === '口算大师 ★2', `getTitle(61)=${Levels.getTitle(61).name}`);
ok(Levels.getPointsPerCorrect(60) === 60, `getPointsPerCorrect(60)=${Levels.getPointsPerCorrect(60)}`);
ok(Levels.getPointsPerCorrect(61) === 60, `getPointsPerCorrect(61)=${Levels.getPointsPerCorrect(61)}`);

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
