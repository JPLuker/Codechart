export type Diagnostic = { line: number; message: string; severity: 'error' | 'warning' };
export type Statement =
  | { kind: 'process' | 'input' | 'output' | 'call' | 'stop' | 'return'; text: string; line: number }
  | { kind: 'if'; text: string; line: number; yes: Statement[]; no: Statement[]; endLine: number }
  | { kind: 'while' | 'repeat'; text: string; line: number; body: Statement[]; endLine: number }
  | { kind: 'for'; text: string; line: number; variable: string; from: string; to: string; step: number; body: Statement[]; endLine: number };
export type Module = { name: string; line: number; endLine: number; body: Statement[] };
export type Program = { body: Statement[]; modules: Module[]; startLine: number; endLine: number; diagnostics: Diagnostic[] };
type Line = { text: string; line: number; keyword: string };

// Strip comments only outside quoted strings, so OUTPUT "https://..." is safe.
export function cleanLine(raw: string): string {
  let quote = ''; let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\' && quote) { escaped = true; continue; }
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '#' || (c === '/' && raw[i + 1] === '/')) return raw.slice(0, i).trim();
  }
  return raw.trim();
}
export function parse(source: string): Program {
  const diagnostics: Diagnostic[] = [];
  const rawLines = source.split('\n');
  const program: Program = { body: [], modules: [], startLine: 1, endLine: rawLines.length, diagnostics };
  const issue = (line: number, message: string, severity: 'error' | 'warning' = 'error') => diagnostics.push({ line, message, severity });
  if (rawLines.length > 1500 || source.length > 100000) { issue(1, 'This project is too large. Use up to 1,500 lines and 100,000 characters.'); return program; }
  const lines: Line[] = rawLines.map((raw, i) => { const text = cleanLine(raw); return { text, line: i + 1, keyword: text.split(/\s+/)[0]?.toUpperCase() || '' }; }).filter(l => l.text);
  for (const l of lines) { let quote = ''; let escaped = false; for (const c of l.text) { if (escaped) { escaped = false; continue; } if (c === '\\' && quote) { escaped = true; continue; } if (quote) { if (c === quote) quote = ''; } else if (c === '"' || c === "'") quote = c; } if (quote) issue(l.line, 'This quoted string has no closing quote.'); }
  let cursor = 0;
  const peek = () => lines[cursor];
  const arg = (l: Line) => l.text.slice(l.keyword.length).trim();
  const condition = (l: Line, suffix = '') => { const text = arg(l).replace(suffix ? new RegExp(`\\s+${suffix}$`, 'i') : /$^/, '').trim(); if (!text) issue(l.line, `${l.keyword} needs a condition.`); return text; };
  const close = (opening: Line, expected: string) => {
    if (peek()?.keyword === expected) { const end = lines[cursor++]; if (arg(end)) issue(end.line, `${expected} must be on its own line.`); return end.line; }
    issue(opening.line, `${opening.keyword} has no matching ${expected}.`); return opening.line;
  };
  function endsPath(body: Statement[]): boolean { return body.some(s => s.kind === 'stop' || s.kind === 'return' || (s.kind === 'if' && endsPath(s.yes) && endsPath(s.no)) || (s.kind === 'repeat' && endsPath(s.body))); }
  function block(stops: string[], depth: number): Statement[] {
    if (depth > 24) { issue(peek()?.line || 1, 'Nesting is limited to 24 levels. Split this logic into modules.'); cursor = lines.length; return []; }
    const body: Statement[] = []; let terminated = false;
    while (peek() && !stops.includes(peek().keyword)) {
      const l = lines[cursor++];
      if (terminated) issue(l.line, 'This statement is unreachable after STOP or RETURN.', 'warning');
      if (l.keyword === 'IF') {
        const text = condition(l, 'THEN'); const yes = block(['ELSE', 'ENDIF'], depth + 1); let no: Statement[] = [];
        if (peek()?.keyword === 'ELSE') { const e = lines[cursor++]; if (arg(e)) issue(e.line, 'Use a nested IF inside ELSE; ELSE must be on its own line.'); no = block(['ENDIF'], depth + 1); }
        body.push({ kind: 'if', line: l.line, text, yes, no, endLine: close(l, 'ENDIF') });
        if (endsPath(yes) && endsPath(no)) terminated = true;
      } else if (l.keyword === 'WHILE') {
        const text = condition(l, 'DO'); const inner = block(['ENDWHILE'], depth + 1);
        body.push({ kind: 'while', line: l.line, text, body: inner, endLine: close(l, 'ENDWHILE') });
      } else if (l.keyword === 'DO' || l.keyword === 'REPEAT') {
        if (arg(l)) issue(l.line, `${l.keyword} must be on its own line. Close it with UNTIL condition.`);
        const inner = block(['UNTIL'], depth + 1); const end = peek();
        const text = end?.keyword === 'UNTIL' ? condition(lines[cursor++]) : '';
        if (!text && !end) issue(l.line, `${l.keyword} has no matching UNTIL condition.`);
        body.push({ kind: 'repeat', line: l.line, text, body: inner, endLine: end?.line || l.line });
      } else if (l.keyword === 'FOR') {
        const match = arg(l).match(/^([a-zA-Z_]\w*)\s*=\s*(.+?)\s+TO\s+(.+?)(?:\s+STEP\s+(-?\d+(?:\.\d+)?))?$/i);
        if (!match) issue(l.line, 'Use FOR counter = start TO end, optionally followed by STEP number.');
        const step = match?.[4] ? Number(match[4]) : 1;
        if (step === 0) issue(l.line, 'FOR STEP cannot be zero.');
        const inner = block(['ENDFOR'], depth + 1);
        body.push({ kind: 'for', line: l.line, text: arg(l), variable: match?.[1] || 'counter', from: match?.[2] || '1', to: match?.[3] || '1', step, body: inner, endLine: close(l, 'ENDFOR') });
      } else if (['ELSE', 'ENDIF', 'ENDWHILE', 'UNTIL', 'ENDFOR', 'ENDMODULE', 'END', 'START', 'MODULE'].includes(l.keyword)) {
        issue(l.line, `Unexpected ${l.keyword}. Check the opening and closing blocks.`);
      } else if (['INPUT', 'READ', 'OUTPUT', 'PRINT', 'DISPLAY', 'SET', 'LET', 'CALL'].includes(l.keyword)) {
        const text = arg(l); if (!text) issue(l.line, `${l.keyword} needs a value or expression.`);
        if (['SET', 'LET'].includes(l.keyword) && !/^[a-zA-Z_]\w*(?:\[[^\]]+\])?\s*=\s*\S/.test(text)) issue(l.line, 'Use SET variable = expression.');
        const kind = ['INPUT', 'READ'].includes(l.keyword) ? 'input' : ['OUTPUT', 'PRINT', 'DISPLAY'].includes(l.keyword) ? 'output' : l.keyword === 'CALL' ? 'call' : 'process';
        body.push({ kind, text, line: l.line });
      } else if (l.keyword === 'STOP' || l.keyword === 'RETURN') {
        body.push({ kind: l.keyword === 'STOP' ? 'stop' : 'return', text: l.text, line: l.line }); terminated = true;
      } else if (/^(?:[a-zA-Z_]\w*(?:\[[^\]]+\])?\s*=\s*\S|(?:NUMBER|NUM|STRING|BOOLEAN|CONST|DECLARE)\s+\S)/i.test(l.text)) {
        body.push({ kind: 'process', text: l.text, line: l.line });
      } else if (/^[a-zA-Z_]\w*\(.*\)$/.test(l.text)) {
        body.push({ kind: 'call', text: l.text, line: l.line });
      } else { issue(l.line, `Unknown statement. Use INPUT, OUTPUT, SET, IF, WHILE, FOR, DO, CALL, or a declaration.`); }
    }
    return body;
  }
  if (peek()?.keyword === 'START') { const start = lines[cursor++]; program.startLine = start.line; if (arg(start)) issue(start.line, 'START must be on its own line.'); }
  else if (lines.length) issue(lines[0].line, 'START is omitted; a Start node is added automatically.', 'warning');
  program.body = block(['END', 'MODULE'], 0);
  if (peek()?.keyword === 'END') { const end = lines[cursor++]; program.endLine = end.line; if (arg(end)) issue(end.line, 'END must be on its own line.'); }
  else if (lines.length) issue(lines[Math.max(0, cursor - 1)].line, 'END is omitted; an End node is added automatically.', 'warning');
  while (peek()) {
    const l = lines[cursor++];
    if (l.keyword !== 'MODULE') { issue(l.line, 'Place main-program statements before END, and modules after it.'); continue; }
    const name = arg(l).replace(/\(\)$/, '').trim();
    if (!/^[a-zA-Z_]\w*$/.test(name)) issue(l.line, 'MODULE needs a name, such as MODULE calculatePay.');
    if (program.modules.some(m => m.name.toLowerCase() === name.toLowerCase())) issue(l.line, `Module ${name} is already defined.`);
    const body = block(['ENDMODULE'], 0); program.modules.push({ name, line: l.line, endLine: close(l, 'ENDMODULE'), body });
  }
  function validate(body: Statement[], inModule: boolean) {
    for (const s of body) {
      if (s.kind === 'return' && !inModule) issue(s.line, 'RETURN is only valid inside a MODULE. Use STOP to exit the main program.');
      if (s.kind === 'call') { const name = s.text.split(/[\s(]/)[0]; if (!program.modules.some(m => m.name.toLowerCase() === name.toLowerCase())) issue(s.line, `Module ${name} is not defined here. This call is shown as an external module.`, 'warning'); }
      if (s.kind === 'if') { validate(s.yes, inModule); validate(s.no, inModule); }
      else if ('body' in s) validate(s.body, inModule);
    }
  }
  validate(program.body, false); program.modules.forEach(m => validate(m.body, true));
  if (!lines.length) issue(1, 'Write some pseudocode to generate your first flowchart.', 'warning');
  return program;
}

export function formatCode(source: string): string {
  let depth = 0;
  return source.split('\n').map(raw => {
    const text = raw.trim(); const k = cleanLine(text).split(/\s+/)[0].toUpperCase();
    if (['ENDIF', 'ELSE', 'ENDWHILE', 'ENDFOR', 'UNTIL', 'ENDMODULE'].includes(k)) depth = Math.max(0, depth - 1);
    const result = '    '.repeat(depth) + text;
    if (['IF', 'ELSE', 'WHILE', 'FOR', 'DO', 'REPEAT', 'MODULE'].includes(k)) depth++;
    return text ? result : '';
  }).join('\n');
}
