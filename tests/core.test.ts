import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, cleanLine, formatCode } from '../src/core/parser';
import { buildChart } from '../src/core/graph';
import { readProject } from '../src/core/projects';
import { examples } from '../src/core/examples';
const valid = (code: string) => { const p = parse(code); assert.deepEqual(p.diagnostics.filter(d => d.severity === 'error'), []); return p; };
const chart = (code: string) => buildChart(valid(code));
for (const example of examples) test(`example: ${example.title} parses and produces a valid graph`, () => {
  const p = valid(example.code);
  for (const name of ['@main', ...p.modules.map(m => m.name)]) {
    const graph = buildChart(p, name); const ids = new Set(graph.nodes.map(n => n.id));
    assert.ok(graph.nodes.length >= 2);
    for (const e of graph.edges) { assert.ok(ids.has(e.from)); assert.ok(ids.has(e.to)); assert.ok(e.points.length >= 2); }
    for (const n of graph.nodes) { assert.ok(n.x >= 0 && n.y >= 0); assert.ok(n.x + n.width <= graph.width + .01); assert.ok(n.y + n.height <= graph.height); }
    for (let i = 0; i < graph.nodes.length; i++) for (const b of graph.nodes.slice(i + 1)) {
      const a = graph.nodes[i]; if (a.kind === 'join' || b.kind === 'join') continue;
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${a.label} overlaps ${b.label}`);
    }
  }
});
test('quotes protect comment markers', () => { assert.equal(cleanLine('OUTPUT "https://a/#b" // comment'), 'OUTPUT "https://a/#b"'); assert.equal(cleanLine('OUTPUT "it\\"s # fine" # comment'), 'OUTPUT "it\\"s # fine"'); });
test('case-insensitive keywords and aliases', () => { const p = valid('start\nread name\nprint name\nend'); assert.deepEqual(p.body.map(s => s.kind), ['input', 'output']); });
test('declarations and assignments without SET', () => { const p = valid('START\nNUMBER total\ntotal = 1 + 2\nEND'); assert.equal(p.body.length, 2); });
test('missing IF closer gives the opening line', () => { const p = parse('START\nIF flag\nOUTPUT flag\nEND'); assert.ok(p.diagnostics.some(d => d.line === 2 && d.message.includes('ENDIF'))); });
test('stray ELSE is rejected', () => { assert.ok(parse('START\nELSE\nEND').diagnostics.some(d => d.severity === 'error')); });
test('empty conditions are rejected', () => { for (const code of ['IF\nENDIF', 'WHILE\nENDWHILE', 'DO\nUNTIL']) assert.ok(parse(`START\n${code}\nEND`).diagnostics.some(d => d.severity === 'error')); });
test('unknown statements are not silently converted to process boxes', () => { assert.ok(parse('START\nWHLIE x\nEND').diagnostics.some(d => d.severity === 'error')); });
test('zero FOR step is rejected', () => { assert.ok(parse('START\nFOR i = 1 TO 5 STEP 0\nENDFOR\nEND').diagnostics.some(d => d.message.includes('zero'))); });
test('descending FOR uses >= and subtraction', () => { const g = chart('START\nFOR i = 5 TO 1 STEP -2\nOUTPUT i\nENDFOR\nEND'); assert.ok(g.nodes.some(n => n.label === 'i >= 1')); assert.ok(g.nodes.some(n => n.label === 'i = i − 2')); });
test('WHILE has a yes path, no path, and back edge', () => { const g = chart('START\nWHILE flag\nINPUT flag\nENDWHILE\nEND'); const d = g.nodes.find(n => n.kind === 'decision')!; assert.deepEqual(g.edges.filter(e => e.from === d.id && e.label).map(e => e.label).sort(), ['No', 'Yes']); assert.ok(g.edges.some(e => e.to === d.id && e.back)); });
test('DO UNTIL repeats on No and exits on Yes', () => { const g = chart('START\nDO\nINPUT x\nUNTIL x = 0\nOUTPUT "done"\nEND'); const d = g.nodes.find(n => n.kind === 'decision')!; assert.ok(g.edges.some(e => e.from === d.id && e.back && e.label === 'No')); assert.ok(g.edges.some(e => e.from === d.id && !e.back && e.label === 'Yes')); const output = g.nodes.find(n => n.label.includes('done'))!; assert.ok(output.y > d.y + d.height); });
test('two consecutive post-test loops do not overlap', () => { const g = chart('START\nDO\nINPUT a\nUNTIL a = 1\nDO\nINPUT b\nUNTIL b = 2\nOUTPUT "done"\nEND'); const ds = g.nodes.filter(n => n.kind === 'decision'); const b = g.nodes.find(n => n.label === 'Input b')!; assert.ok(b.y > ds[0].y + ds[0].height); });
test('STOP has no outgoing edge', () => { const g = chart('START\nIF x\nSTOP\nELSE\nOUTPUT x\nENDIF\nOUTPUT "done"\nEND'); const stop = g.nodes.find(n => n.label === 'STOP')!; assert.equal(g.edges.filter(e => e.from === stop.id).length, 0); assert.ok(g.nodes.some(n => n.label.includes('done'))); });
test('both branches terminate: following code is unreachable', () => { const g = chart('START\nIF x\nSTOP\nELSE\nSTOP\nENDIF\nOUTPUT "never"\nEND'); assert.ok(!g.nodes.some(n => n.label.includes('never'))); assert.ok(!g.nodes.some(n => n.label === 'End')); });
test('RETURN cannot be used in main', () => { assert.ok(parse('START\nRETURN\nEND').diagnostics.some(d => d.severity === 'error')); });
test('modules have independent charts and return boundaries', () => { const p = valid('START\nCALL doWork\nEND\nMODULE doWork\nOUTPUT "hi"\nENDMODULE'); const g = buildChart(p, 'doWork'); assert.equal(g.name, 'doWork'); assert.ok(g.nodes.some(n => n.label === 'Return')); });
test('duplicate module names are errors', () => { assert.ok(parse('START\nEND\nMODULE A\nENDMODULE\nMODULE a\nENDMODULE').diagnostics.some(d => d.message.includes('already defined'))); });
test('undefined calls are warnings, not parser failures', () => { const p = valid('START\nCALL external\nEND'); assert.ok(p.diagnostics.some(d => d.severity === 'warning')); });
test('omitted boundaries are supplied with notes', () => { const p = valid('INPUT x\nOUTPUT x'); const g = buildChart(p); assert.equal(p.diagnostics.length, 2); assert.equal(g.nodes[0].label, 'Start'); assert.equal(g.nodes.at(-1)?.label, 'End'); });
test('empty branches connect to the join', () => { const g = chart('START\nIF x\nENDIF\nEND'); const d = g.nodes.find(n => n.kind === 'decision')!; assert.equal(g.edges.filter(e => e.from === d.id).length, 2); });
test('size and nesting limits prevent unbounded work', () => { assert.ok(parse('OUTPUT x\n'.repeat(1501)).diagnostics.some(d => d.severity === 'error')); assert.ok(parse('START\n' + 'IF x\n'.repeat(26) + 'ENDIF\n'.repeat(26) + 'END').diagnostics.some(d => d.message.includes('Nesting'))); });
test('format indentation follows explicit blocks and is idempotent', () => { const code = 'START\nIF x\nOUTPUT x\nELSE\nDO\nINPUT x\nUNTIL x\nENDIF\nEND'; const formatted = formatCode(code); assert.ok(formatted.includes('    DO\n        INPUT x\n    UNTIL x')); assert.equal(formatCode(formatted), formatted); });
test('project format rejects malformed and unsupported files', () => { assert.throws(() => readProject({})); assert.throws(() => readProject({ format: 'codechart', version: 2, source: '', title: 'x' })); assert.equal(readProject({ format: 'codechart', version: 1, source: 'START\nEND', title: 'a' }).title, 'a'); });
test('unterminated strings are errors on the source line', () => { assert.ok(parse('START\nOUTPUT "unfinished\nEND').diagnostics.some(d => d.line === 2 && d.message.includes('closing quote'))); });
test('both terminated branches produce an unreachable warning', () => { const p = valid('START\nIF x\nSTOP\nELSE\nSTOP\nENDIF\nOUTPUT "never"\nEND'); assert.ok(p.diagnostics.some(d => d.line === 7 && d.message.includes('unreachable'))); });
test('MODULE main does not replace the main program chart', () => { const p = valid('START\nCALL main\nEND\nMODULE main\nOUTPUT "module"\nENDMODULE'); assert.equal(buildChart(p).name, 'Main program'); assert.equal(buildChart(p, 'main').name, 'main'); });
