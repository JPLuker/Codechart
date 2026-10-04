# Codechart

**Write the steps. See the structure. Get the flowchart.**

A client-side workspace that converts structured pseudocode into flowcharts. Built by Joseph Luker. **0.1.0-alpha.1** is the first alpha.

**App:** https://jpluker.github.io/Codechart/

## Features

- Live pseudocode editor with highlighting, line numbers, completion, undo/redo, indentation formatting, and inline diagnostics.
- Automatic structured diagrams: terminators, processes, I/O parallelograms, decision diamonds, module calls, branch joins, and loop-back connections.
- IF / ELSE, nested and stacked structures, WHILE, DO / UNTIL, REPEAT / UNTIL, inclusive FOR loops with positive or negative steps, modules, STOP, and RETURN.
- Independent main-program and module charts; click shapes to select source lines, or move the code cursor to highlight associated shapes.
- Pan, zoom, fit, resizable editor, mobile code/chart tabs, and independent editor/canvas themes.
- Local autosave, recent projects, import/export of `.flow` project files, import of `.txt` and `.pseudo`, and compressed snapshot share links.
- SVG, PNG, and print / PDF export. SVG/PNG include the entire current chart; print/PDF fits it onto a page.
- Seven examples for sequence, selection, nesting, sentinel input, pre/post-test loops, counting loops, modules, and early exits.
- No account, backend, AI API, analytics, or runtime CDN dependency. Drafts and recent projects are stored in this browser. Share links encode project contents in the URL fragment.

## Language

```text
START
INPUT hours
INPUT hourlyRate
IF hours > 40
    SET pay = 40 * hourlyRate + (hours - 40) * hourlyRate * 1.5
ELSE
    SET pay = hours * hourlyRate
ENDIF
OUTPUT pay
END
```

Keywords are case-insensitive. Indentation helps readability; closing keywords determine structure. Comments use `//` or `#` outside strings. INPUT / OUTPUT also accept READ / PRINT / DISPLAY. SET may be omitted for assignments. NUMBER, NUM, STRING, BOOLEAN, CONST, and DECLARE declarations become process boxes.

```text
START
CALL calculate
END

MODULE calculate
    SET total = 0
    FOR counter = 1 TO 5 STEP 1
        INPUT number
        SET total = total + number
    ENDFOR
    OUTPUT total
ENDMODULE
```

FOR bounds are inclusive, and STEP must be a nonzero number. DO and REPEAT close with `UNTIL condition` (No repeats, Yes exits). WHILE closes with ENDWHILE (Yes enters, No exits). Use a nested IF inside ELSE for additional choices. STOP ends a path. RETURN is valid inside modules only. Modules are defined after the main program's END; an undefined CALL is shown as an external call with a warning.

The parser validates **structure**, not expression types or runtime behavior. It does not execute pseudocode or prove loop termination. Blank START/END boundaries can be omitted with warnings. Syntax errors preserve the last valid preview and pause exports. Limits: 1,500 lines, 100,000 source characters, and 24 nesting levels.

## Develop

Requires Node 22 or later.

```sh
npm ci
npm run dev
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Vite uses `/Codechart/` as the asset base for GitHub project Pages. The app has no server routes; shared projects use URL fragments.

## GitHub Pages

1. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** (once).
2. Push to `main`, or run **Test and deploy Codechart** from the Actions tab.
3. The workflow tests and builds before deploying. Pull requests test/build without deploying.

Live URL: https://jpluker.github.io/Codechart/

## Architecture

- `src/core/parser.ts`: line-aware recursive parser → structured AST and diagnostics.
- `src/core/graph.ts`: AST → graph model, source mapping, and structural layout. Empty branches join correctly; loop edges retain their test direction; terminated paths have no continuation.
- `src/components/Editor.tsx`: CodeMirror editing and diagnostic integration.
- `src/components/Diagram.tsx`: SVG shapes, graph interaction, and viewport.
- `src/core/export.tsx`: the same SVG artwork for vector, raster, and printable exports.
- `src/core/projects.ts`: versioned project files and compressed share links.
- `scripts/browser-check.mjs`: desktop/mobile editing, exports, project import, sharing, source mapping, and runtime error checks.
- `tests/core.test.ts`: grammar, examples, graph endpoints, shape bounds/overlap, loop semantics, reachability, and project validation.

## Known alpha limits

- This is a small explicit pseudocode grammar, not a parser for Python/C++ or every textbook dialect.
- Modules have separate diagrams. CALL boxes do not expand inline or simulate parameter passing.
- No visual editing or reverse generation yet.
- Very wide/deep charts may require zooming or SVG export. Print/PDF is one-page fitting, not tiled printing.
- Share links are snapshots. Save `.flow` files for durable backups; browser data can be cleared.
- Large nested branches may create generous whitespace; structured correctness is the priority.

No license is granted in this repository. All rights reserved unless Joseph Luker adds a license.
