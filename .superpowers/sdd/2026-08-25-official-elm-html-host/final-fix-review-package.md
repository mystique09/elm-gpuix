# Scoped final-fix re-review package

Review only the single final fix wave described in `final-fix-brief.md` and
reported in `final-fix-report.md`. The project is intentionally non-Git, so
the complete changed-file manifest below is the review surface.

## Findings that must be closed

1. The emitted Node ESM entry previously retained extensionless relative
   imports and failed direct import. Confirm source, declarations, generated
   JavaScript, and `check:dist` use valid `.js` specifiers.
2. Native-distributed events previously walked synthetic ancestors as well,
   duplicating parent callbacks and incorrectly bubbling focus. Confirm native
   click/mouse/key/focus/blur/hover/scroll/context-menu payloads are
   element-local; only target-local control `change` and `submit` synthesize
   ancestry; `stopPropagation` and `stopImmediatePropagation` work within that
   synthetic walk. Confirm the new regressions prove the intended behavior
   without breaking existing event translation.
3. README previously claimed `stop()` released native resources. Confirm it
   now describes only implemented timer/callback/global/ownership cleanup and
   explicitly states the `@gpuix/native@0.4.0` disposal limitation.

## Changed files

- `runtime/test/dom.test.ts`
- `runtime/src/dom.ts`
- `runtime/src/host.ts`
- `runtime/src/index.ts`
- `package.json`
- `README.md`
- `docs/superpowers/specs/2026-08-25-official-elm-html-host-design.md`
- generated `dist/dom.js`, `dist/host.js`, `dist/host.d.ts`, `dist/index.js`,
  and `dist/index.d.ts`

The example build output and smoke screenshot were regenerated, but example
source and behavior were not changed.

## Reported verification

- focused DOM suite: 16/16 passed;
- full `bun run check`: 28/28 tests plus all compilation/build checks passed;
- direct `node --input-type=module -e "await import('./dist/index.js')"`
  passed;
- package dry run contained the expected nine files;
- real native smoke observed `Count: 1` and `Double: 2` after the click.

Return findings ordered by severity, with exact file/line evidence. If there
are no actionable findings, explicitly say the three original findings are
closed. Do not modify files, run Git, publish, or touch the sibling
`fileviewer` checkout.
