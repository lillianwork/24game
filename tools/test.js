/* tools/test.js — 求解器/出题器冒烟测试 */
global.window = global;
require('../js/solver.js');
require('../js/levels.js');

const Solver = global.Solver;
const Levels = global.Levels;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; console.log('  FAIL  ' + msg); }
}

// 1. 出题 + 可解性 + 范围校验
console.log('\n[1] 出题与可解性（level 1..60 各抽 20 题）');
for (let level = 1; level <= 60; level++) {
  const stage = Levels.getStage(level);
  const range = Levels.getNumberRange(level);
  for (let i = 0; i < 20; i++) {
    const nums = Solver.generate(stage.count, stage.ops, range.min, range.max, Levels.TARGET);
    if (!nums) { ok(false, `L${level} 出题失败`); continue; }
    if (!Solver.canSolve(nums, stage.ops, Levels.TARGET)) {
      ok(false, `L${level} 不可解 [${nums}]`); continue;
    }
    const inRange = nums.every(n => n >= range.min && n <= range.max);
    if (!inRange) ok(false, `L${level} 超出范围 [${nums}] range=${range.min}..${range.max}`);
  }
}
console.log(`  （level 1..60 抽题完成，见上方是否有 FAIL）`);

// 2. 表达式求值
console.log('\n[2] 表达式求值');
ok(Solver.close(Solver.evalTokens(['(', 8, '+', 4, ')', '*', '(', 5, '-', 3, ')']), 24), '(8+4)*(5-3)=24');
ok(Solver.close(Solver.evalTokens([3, '*', 8]), 24), '3*8=24');
ok(Solver.close(Solver.evalTokens([30, '-', 6]), 24), '30-6=24');
ok(Solver.close(Solver.evalTokens([1, '/', 2, '+', 23.5]), 24), '1/2+23.5=24');

// 3. multiset
console.log('\n[3] 数字使用校验');
ok(Solver.sameMultiset([8, 4, 5, 3], [3, 5, 4, 8]), 'multiset 相等');
ok(!Solver.sameMultiset([8, 4, 5, 3], [8, 4, 5]), 'multiset 数量不同');
ok(!Solver.sameMultiset([8, 4, 5, 3], [8, 8, 5, 3]), 'multiset 内容不同');

// 4. solvePath 返回路径
console.log('\n[4] solvePath 路径');
const path = Solver.solvePath([8, 4, 5, 3], ['+', '-', '*', '/'], 24);
ok(!!path && path.length === 3, `solvePath([8,4,5,3]) 返回 ${path ? path.length : 0} 步`);
if (path) console.log('    路径: ' + path.map(s => `${s.a}${Solver.opLabel(s.op)}${s.b}=${s.result}`).join(' -> '));

// 5. 分步验证逻辑：正向按路径执行应得到24
console.log('\n[5] 路径回放验证');
if (path) {
  let cards = [8, 4, 5, 3];
  for (const s of path) {
    const i = cards.indexOf(s.a), j = cards.indexOf(s.b);
    if (i < 0 || j < 0) { ok(false, '路径数字不匹配'); break; }
    const r = Solver.apply(s.a, s.b, s.op);
    cards = cards.filter((_, k) => k !== i && k !== j);
    cards.push(r);
  }
  ok(cards.length === 1 && Solver.close(cards[0], 24), `回放最终=${cards[0]}`);
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
