import type { Program, Statement } from './parser';
export type Point = { x: number; y: number };
export type NodeKind = 'start' | 'end' | 'input' | 'output' | 'process' | 'decision' | 'call' | 'join';
export type ChartNode = { id: string; kind: NodeKind; label: string; line: number; x: number; y: number; width: number; height: number; lines: string[] };
export type ChartEdge = { id: string; from: string; to: string; label?: string; points: Point[]; back?: boolean };
export type Chart = { nodes: ChartNode[]; edges: ChartEdge[]; width: number; height: number; name: string };
type Size = { w: number; h: number };
type Fragment = { entry: ChartNode; exit: ChartNode | null };
const GAP = 36, BRANCH_GAP = 56, LOOP_GAP = 55;
export function wrapLabel(text: string, max = 30): string[] {
  const words = text.split(/\s+/); const rows: string[] = []; let row = '';
  for (let word of words) {
    if (row && row.length + word.length + 1 > max) { rows.push(row); row = ''; }
    while (word.length > max) { if (row) { rows.push(row); row = ''; } rows.push(word.slice(0, max)); word = word.slice(max); }
    if (word) row += (row ? ' ' : '') + word;
  }
  if (row) rows.push(row); return rows.length ? rows : [''];
}
function label(s: Statement) { return s.kind === 'input' ? `Input ${s.text}` : s.kind === 'output' ? `Output ${s.text}` : s.kind === 'call' ? s.text.replace(/\(\)$/, '') : s.text; }
function nodeSize(text: string, decision = false): Size {
  const lines = wrapLabel(text, decision ? 23 : 32);
  return { w: decision ? Math.max(240, Math.max(...lines.map(l => l.length)) * 7 + 96) : Math.max(176, Math.max(...lines.map(l => l.length)) * 7.2 + 46), h: decision ? Math.max(96, lines.length * 20 + 64) : Math.max(54, lines.length * 20 + 26) };
}
function blockSize(body: Statement[]): Size {
  const sizes = body.map(statementSize); return { w: Math.max(176, ...sizes.map(s => s.w)), h: sizes.reduce((sum, s) => sum + s.h, 0) + Math.max(0, sizes.length - 1) * GAP };
}
function statementSize(s: Statement): Size {
  if (s.kind === 'if') { const d = nodeSize(s.text, true), a = blockSize(s.yes), b = blockSize(s.no); return { w: Math.max(d.w, a.w + b.w + BRANCH_GAP), h: d.h + 42 + Math.max(a.h, b.h) + 42 + 10 }; }
  if (s.kind === 'while' || s.kind === 'repeat' || s.kind === 'for') {
    const condition = s.kind === 'for' ? `${s.variable} ${s.step > 0 ? '<=' : '>='} ${s.to}` : s.text;
    const d = nodeSize(condition, true), body = blockSize(s.body);
    if (s.kind === 'repeat') return { w: Math.max(d.w, body.w) + LOOP_GAP * 2, h: d.h + body.h + GAP * 3 + 10 };
    const extra = s.kind === 'for' ? nodeSize(`${s.variable} = ${s.from}`).h + GAP + nodeSize(`${s.variable} = ${s.variable} ${s.step > 0 ? '+' : '−'} ${Math.abs(s.step)}`).h + GAP : 0;
    return { w: Math.max(d.w, body.w) + LOOP_GAP * 2, h: d.h + GAP + body.h + 65 + 10 + extra };
  }
  return nodeSize(label(s));
}
export function buildChart(program: Program, moduleName = '@main'): Chart {
  const module = program.modules.find(m => m.name === moduleName);
  const body = module ? module.body : program.body;
  const name = module?.name || 'Main program';
  const dimensions = blockSize(body); const width = dimensions.w + 100;
  const chart: Chart = { nodes: [], edges: [], width, height: 0, name };
  let serial = 0;
  function add(kind: NodeKind, text: string, line: number, cx: number, y: number): ChartNode {
    const size = kind === 'join' ? { w: 10, h: 10 } : nodeSize(text, kind === 'decision');
    const n: ChartNode = { id: `n${serial++}`, kind, label: text, line, x: cx - size.w / 2, y, width: size.w, height: size.h, lines: wrapLabel(text, kind === 'decision' ? 23 : 32) };
    chart.nodes.push(n); return n;
  }
  const top = (n: ChartNode): Point => ({ x: n.x + n.width / 2, y: n.y });
  const bottom = (n: ChartNode): Point => ({ x: n.x + n.width / 2, y: n.y + n.height });
  const left = (n: ChartNode): Point => ({ x: n.x, y: n.y + n.height / 2 });
  const right = (n: ChartNode): Point => ({ x: n.x + n.width, y: n.y + n.height / 2 });
  function edge(a: ChartNode, b: ChartNode, points: Point[] = [bottom(a), top(b)], label?: string, back = false) {
    const clean = points.filter((p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y);
    chart.edges.push({ id: `e${chart.edges.length}`, from: a.id, to: b.id, points: clean, label, back });
  }
  function sequence(statements: Statement[], cx: number, y: number): Fragment | null {
    let first: ChartNode | null = null, last: ChartNode | null = null;
    for (const s of statements) {
      // STOP/RETURN and two terminated branches have no continuation.
      if (first && !last) break;
      const f = statement(s, cx, y); if (!first) first = f.entry;
      if (last) edge(last, f.entry);
      last = f.exit; y += statementSize(s).h + GAP;
    }
    return first ? { entry: first, exit: last } : null;
  }
  function statement(s: Statement, cx: number, y: number): Fragment {
    const size = statementSize(s);
    if (s.kind === 'if') {
      const d = add('decision', s.text, s.line, cx, y);
      const a = blockSize(s.yes), b = blockSize(s.no); const leftX = cx - (b.w + BRANCH_GAP) / 2, rightX = cx + (a.w + BRANCH_GAP) / 2;
      const bodyY = y + d.height + 42;
      const yes = sequence(s.yes, leftX, bodyY), no = sequence(s.no, rightX, bodyY);
      const live = !yes || yes.exit || !no || no.exit;
      const join = live ? add('join', '', s.endLine, cx, y + size.h - 10) : null;
      for (const [f, lane, port, title] of [[yes, leftX, left(d), 'Yes'], [no, rightX, right(d), 'No']] as const) {
        const target = f?.entry || join;
        if (target) edge(d, target, [port, { x: lane, y: port.y }, { x: lane, y: target.y - 25 }, { x: top(target).x, y: target.y - 25 }, top(target)], title);
        if (f?.exit && join) { const p = bottom(f.exit); edge(f.exit, join, [p, { x: p.x, y: join.y + 5 }, { x: cx, y: join.y + 5 }]); }
      }
      return { entry: d, exit: join };
    }
    if (s.kind === 'while' || s.kind === 'for') {
      let init: ChartNode | null = null;
      if (s.kind === 'for') { init = add('process', `${s.variable} = ${s.from}`, s.line, cx, y); y += init.height + GAP; }
      const d = add('decision', s.kind === 'for' ? `${s.variable} ${s.step > 0 ? '<=' : '>='} ${s.to}` : s.text, s.line, cx, y);
      if (init) edge(init, d);
      const inner = sequence(s.body, cx, y + d.height + GAP);
      const overallY = (init ? init.y : y) + size.h - 10;
      const join = add('join', '', s.endLine, cx, overallY);
      const laneLeft = cx - size.w / 2 + 8, laneRight = cx + size.w / 2 - 8;
      let backFrom = inner?.exit || (!inner ? d : null);
      if (inner) edge(d, inner.entry, undefined, 'Yes');
      if (s.kind === 'for' && backFrom) {
        const increment = add('process', `${s.variable} = ${s.variable} ${s.step > 0 ? '+' : '−'} ${Math.abs(s.step)}`, s.endLine, cx, y + d.height + GAP + blockSize(s.body).h + (inner ? GAP : 0));
        edge(backFrom, increment, undefined, inner ? undefined : 'Yes'); backFrom = increment;
      }
      if (backFrom) { const p = backFrom === d ? bottom(d) : bottom(backFrom); edge(backFrom, d, [p, { x: p.x, y: p.y + 22 }, { x: laneLeft, y: p.y + 22 }, { x: laneLeft, y: left(d).y }, left(d)], backFrom === d ? 'Yes' : undefined, true); }
      edge(d, join, [right(d), { x: laneRight, y: right(d).y }, { x: laneRight, y: join.y + 5 }, { x: cx, y: join.y + 5 }], 'No');
      return { entry: init || d, exit: join };
    }
    if (s.kind === 'repeat') {
      const anchor = add('join', '', s.line, cx, y); const inner = sequence(s.body, cx, y + GAP);
      if (inner) edge(anchor, inner.entry);
      const d = add('decision', s.text, s.endLine, cx, y + GAP + blockSize(s.body).h + GAP);
      if (inner?.exit) edge(inner.exit, d); else if (!inner) edge(anchor, d);
      const lane = cx - size.w / 2 + 8;
      // A body that always exits cannot reach the UNTIL test.
      if (inner && !inner.exit) { chart.nodes = chart.nodes.filter(n => n.id !== d.id); return { entry: anchor, exit: null }; }
      edge(d, anchor, [left(d), { x: lane, y: left(d).y }, { x: lane, y: y + 5 }, { x: cx, y: y + 5 }], 'No', true);
      const join = add('join', '', s.endLine, cx, y + size.h - 10);
      edge(d, join, undefined, 'Yes'); return { entry: anchor, exit: join };
    }
    const kind = s.kind === 'stop' || s.kind === 'return' ? 'end' : s.kind;
    const n = add(kind, label(s), s.line, cx, y); return { entry: n, exit: kind === 'end' ? null : n };
  }
  const cx = width / 2;
  const start = add('start', module ? `${name}()` : 'Start', module?.line || program.startLine, cx, 40);
  const fragment = sequence(body, cx, start.y + start.height + GAP);
  if (fragment) edge(start, fragment.entry);
  if (!fragment || fragment.exit) {
    const endY = Math.max(start.y + start.height + GAP, ...chart.nodes.map(n => n.y + n.height + GAP));
    const end = add('end', module ? 'Return' : 'End', module?.endLine || program.endLine, cx, endY);
    edge(fragment?.exit || start, end);
  }
  chart.height = Math.max(...chart.nodes.map(n => n.y + n.height), ...chart.edges.flatMap(e => e.points.map(p => p.y))) + 40;
  return chart;
}
