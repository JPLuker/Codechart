import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightActiveLine, keymap, drawSelection } from '@codemirror/view';
import { history, defaultKeymap, historyKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { StreamLanguage, HighlightStyle, syntaxHighlighting, indentUnit, bracketMatching } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { setDiagnostics, lintGutter } from '@codemirror/lint';
import type { Diagnostic } from '../core/parser';
import { snippets } from '../core/examples';
export type EditorHandle = { line: (n: number) => void; insert: (text: string) => void; undo: () => void; redo: () => void; focus: () => void };
const language = StreamLanguage.define({ token(stream) {
  if (stream.eatSpace()) return null;
  if (stream.match(/(?:\/\/|#).*/)) return 'comment';
  if (stream.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/)) return 'string';
  if (stream.match(/\b(?:START|END|INPUT|READ|OUTPUT|PRINT|DISPLAY|SET|LET|IF|THEN|ELSE|ENDIF|WHILE|ENDWHILE|DO|REPEAT|UNTIL|FOR|TO|STEP|ENDFOR|CALL|MODULE|ENDMODULE|STOP|RETURN)\b/i)) return 'keyword';
  if (stream.match(/\b(?:NUMBER|NUM|STRING|BOOLEAN|DECLARE|CONST)\b/i)) return 'typeName';
  if (stream.match(/\b(?:AND|OR|NOT|TRUE|FALSE)\b/i)) return 'bool';
  if (stream.match(/\b\d+(?:\.\d+)?\b/)) return 'number';
  if (stream.match(/[=<>!+*/%-]+/)) return 'operator';
  if (stream.match(/[a-zA-Z_]\w*/)) return 'variableName';
  stream.next(); return null;
} });
const highlighting = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--code-keyword)', fontWeight: '600' },
  { tag: tags.string, color: 'var(--code-string)' }, { tag: tags.comment, color: 'var(--code-comment)', fontStyle: 'italic' },
  { tag: tags.number, color: 'var(--code-number)' }, { tag: tags.bool, color: 'var(--code-keyword)' },
  { tag: tags.operator, color: 'var(--code-operator)' }, { tag: tags.typeName, color: 'var(--code-number)' }
]);
export const Editor = forwardRef<EditorHandle, { value: string; diagnostics: Diagnostic[]; onChange: (value: string) => void; onLine: (line: number) => void }>(({ value, diagnostics, onChange, onLine }, ref) => {
  const container = useRef<HTMLDivElement>(null), view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onLine }); callbacks.current = { onChange, onLine };
  useImperativeHandle(ref, () => ({
    line(n) { const v = view.current; if (!v) return; const line = v.state.doc.line(Math.min(Math.max(n, 1), v.state.doc.lines)); v.dispatch({ selection: { anchor: line.from, head: line.to }, effects: EditorView.scrollIntoView(line.from, { y: 'center' }) }); v.focus(); },
    insert(text) { const v = view.current; if (!v) return; const cursor = v.state.selection.main; const l = v.state.doc.lineAt(cursor.from); const indent = l.text.match(/^\s*/)?.[0] || ''; const newLine = cursor.empty && !!l.text.trim(); const from = newLine ? l.to : cursor.from, to = newLine ? l.to : cursor.to; const insertion = (newLine ? '\n' + indent : '') + text.split('\n').map((s, i) => i ? indent + s : s).join('\n'); v.dispatch({ changes: { from, to, insert: insertion }, selection: { anchor: from + insertion.length } }); v.focus(); },
    undo() { if (view.current) undo(view.current); }, redo() { if (view.current) redo(view.current); }, focus() { view.current?.focus(); }
  }), []);
  useEffect(() => {
    const v = new EditorView({ parent: container.current!, state: EditorState.create({ doc: value, extensions: [
      lineNumbers(), highlightActiveLineGutter(), highlightActiveLine(), drawSelection(), history(), bracketMatching(), indentUnit.of('    '), language, syntaxHighlighting(highlighting), lintGutter(),
      keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap, ...completionKeymap]),
      autocompletion({ override: [context => { const word = context.matchBefore(/\w*/); if (!word || (word.from === word.to && !context.explicit)) return null; return { from: word.from, options: snippets.map(s => ({ label: s.code.split(/[\s\n]/)[0], type: 'keyword', detail: s.hint, apply: s.code })) }; }] }),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': 'Pseudocode editor', spellcheck: 'false' }),
      EditorView.updateListener.of(update => { if (update.docChanged) callbacks.current.onChange(update.state.doc.toString()); if (update.selectionSet || update.docChanged) callbacks.current.onLine(update.state.doc.lineAt(update.state.selection.main.head).number); }),
      EditorView.theme({ '&': { height: '100%', background: 'transparent', color: 'var(--text)' }, '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--mono)', fontSize: '13px', lineHeight: '1.85' }, '.cm-content': { padding: '20px 0 80px' }, '.cm-gutters': { background: 'transparent', color: 'var(--muted)', border: 'none' }, '.cm-lineNumbers .cm-gutterElement': { padding: '0 16px 0 12px', minWidth: '48px' }, '.cm-line': { padding: '0 20px 0 8px' }, '.cm-activeLine': { background: 'var(--active-line)' }, '.cm-activeLineGutter': { background: 'transparent', color: 'var(--accent)' }, '.cm-cursor': { borderLeftColor: 'var(--accent)' }, '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { background: 'var(--selection) !important' }, '&.cm-focused': { outline: 'none' }, '.cm-tooltip': { background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)' }, '.cm-tooltip-autocomplete > ul > li[aria-selected]': { background: 'var(--selection)', color: 'var(--text)' } })
    ] }) });
    view.current = v; return () => { v.destroy(); view.current = null; };
  }, []);
  useEffect(() => { const v = view.current; if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } }); }, [value]);
  useEffect(() => { const v = view.current; if (!v) return; v.dispatch(setDiagnostics(v.state, diagnostics.map(d => { const line = v.state.doc.line(Math.min(Math.max(1, d.line), v.state.doc.lines)); return { from: line.from, to: line.to, severity: d.severity, message: d.message }; }))); }, [diagnostics]);
  return <div className="code-editor" ref={container} />;
});
