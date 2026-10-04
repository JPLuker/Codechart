# Codechart roadmap

## 0.1 alpha — foundation

- [x] Small explicit structured-pseudocode grammar with source-aware diagnostics
- [x] Sequence, selection, nesting, stacking, pre/post-test loops, counting loops
- [x] Modules and independent module charts
- [x] Correct terminated paths, joins, and loop labels
- [x] Live editor / flowchart, pan/zoom, source selection, mobile layout
- [x] Local project storage, editable files, compressed snapshot links
- [x] SVG, PNG, and print/PDF exports
- [x] Examples and language reference
- [x] Tests and GitHub Pages deployment workflow

## Next — validate against real assignments

1. Test submitted diagrams against Joseph's structured programming assignments and textbook expectations.
2. Add configurable textbook symbol/label conventions based on concrete examples.
3. Improve layout compactness, large-chart navigation, and page-tiled PDF exports.
4. Add assignment-friendly project metadata and exporting all module diagrams together.
5. Broaden diagnostics where correctness can be established without pretending to execute arbitrary expressions.

## Later — deliberate expansion

- Optional ELSEIF, additional documented textbook dialects, and configurable syntax.
- Visual structure editing with pseudocode round-tripping, retaining structured single-entry/single-exit control flow.
- Optional simulation/tracing only after a separate, safely parsed expression language exists.
- Accessible text traversal of paths and an expanded keyboard command palette.

Accounts, collaboration, AI generation, and full programming-language parsing are outside the current scope.
