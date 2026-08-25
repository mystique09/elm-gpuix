# Final fix wave

Read first:

- `.superpowers/sdd/2026-08-25-official-elm-html-host/final-review-package.md`
- `docs/superpowers/specs/2026-08-25-official-elm-html-host-design.md`
- current `runtime/src/dom.ts`, `runtime/src/host.ts`, `runtime/src/index.ts`
- current runtime tests, `package.json`, and `README.md`
- GPUix's element-local React registry at
  `/Users/benj/workspace/main/fileviewer/node_modules/@gpuix/react/dist/reconciler/event-registry.js`
- pinned native renderer event wiring:
  `https://github.com/remorses/gpuix/blob/aedc570e2187e9e952bdaf6ead5f68fb6180ee77/packages/native/src/renderer.rs#L2140-L2307`

This is the one final fix wave. Add focused RED regressions before production
changes and address all findings together.

## Important 1: Node ESM distribution

The supported-Node command
`node --input-type=module -e "await import('./dist/index.js')"` currently
fails first on extensionless `dist/host`, then would fail on extensionless
`dist/dom`. Use `.js` relative specifiers in TypeScript source so emitted JS
and declarations load in Node ESM. Add a `check:dist` package script that
directly imports the freshly built entry and include it after `build:runtime`
in `check`. Rebuild and prove the previously failing command is green.

## Important 2: native and synthetic event propagation

GPUix registers/emits each retained element's native handler separately, and
its React registry invokes only the handler keyed by `payload.elementId`.
Current code additionally walks all synthetic ancestors for every payload,
which double-calls parent mouse/key/scroll handlers when GPUI bubbles and
incorrectly bubbles focus, blur, mouseenter, and mouseleave.

Define explicit event propagation ownership:

- native-distributed events (`click`, mouse, key, focus/blur, hover, scroll,
  context menu if retained) invoke listeners only on `payload.elementId`;
- control-originated `change` (mapped to DOM `input` plus `change`) and
  `submit` may synthesize DOM ancestry because the native control callback is
  target-local;
- preserve stop/immediate-stop behavior inside the synthetic change/submit
  walk, but do not invent unreliable cross-callback correlation without a
  native origin/event ID.

Add regressions for a child then parent native click sequence (each handler
once), child focus not invoking a parent focus listener, change reaching an
ancestor exactly once, and stopPropagation stopping that synthetic control
bubble. Keep existing single-target event tests green. Document the honest
limitation: native-bubbled ancestor payloads lack the original target/event ID,
so browser-identical `target` and cross-listener `stopPropagation` are not
promised without a future native extension.

## Minor: stop wording

`stop()` currently cancels owned timers, blocks callbacks, restores globals,
and releases logical ownership; `@gpuix/native@0.4.0` exposes no close/dispose
method. Remove README claims that it releases native resources or closes the
window. Describe exactly what it does. Keep the public API unchanged.

## Scope and verification

Modify only the runtime sources/tests, root package scripts, README, and the
retained design doc if needed for the event limitation. Do not change Elm
package/example behavior, dependencies, Vite version, native version, sibling
fileviewer, Git state, or publication state.

Run focused tests, full `bun run check`, direct Node import, `npm pack
--dry-run --json`, and real `bun run smoke`. Write
`.superpowers/sdd/2026-08-25-official-elm-html-host/final-fix-report.md` with
files changed, RED/GREEN evidence, smoke JSON, and concerns. Use `apply_patch`,
do not commit, and do not spawn subagents.
