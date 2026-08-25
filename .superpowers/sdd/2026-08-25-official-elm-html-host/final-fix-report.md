# Final fix wave report

## Status

PASS. All findings in `final-fix-brief.md` are addressed in the current tree:

- emitted runtime ESM uses `.js` relative specifiers and the root check directly
  imports the freshly built distribution;
- native-distributed events dispatch only to `payload.elementId`, while
  target-local control `change` and `submit` events retain synthetic DOM
  ancestry with stop/immediate-stop behavior;
- README and retained design documentation state the event limitation and the
  exact `stop()` behavior without claiming native disposal or window closure.

No Git, publication, dependency, Elm package, example source, or sibling
`fileviewer` changes were made.

## Files changed

Source, tests, configuration, and documentation:

- `runtime/test/dom.test.ts`
- `runtime/src/dom.ts`
- `runtime/src/host.ts`
- `runtime/src/index.ts`
- `package.json`
- `README.md`
- `docs/superpowers/specs/2026-08-25-official-elm-html-host-design.md`
- `.superpowers/sdd/2026-08-25-official-elm-html-host/final-fix-report.md`

Generated distribution artifacts rebuilt from the runtime sources:

- `dist/dom.js`
- `dist/host.js`
- `dist/host.d.ts`
- `dist/index.js`
- `dist/index.d.ts`

The required example build and smoke also regenerated the existing
`example/dist/**` output and refreshed `artifacts/elm-gpuix-smoke.png`; no
example source or behavior changed.

## RED evidence

Regressions and `check:dist` were added before production changes.

`bun run test -- runtime/test/dom.test.ts` exited 1 with 2 failures and 14
passes:

- child then parent native click payloads produced
  `["child", "parent", "parent"]` instead of `["child", "parent"]`;
- a child focus payload produced `["child", "parent"]` instead of
  `["child"]`.

The same test file also added preservation coverage proving that a native
control change reaches its ancestor exactly once and that `stopPropagation()`
stops that synthetic control-event walk.

`bun run check:dist` exited 1 before the source fix. Node reported
`ERR_MODULE_NOT_FOUND` for `dist/host` imported by `dist/index.js`, proving the
fresh distribution entry was not valid Node ESM.

## GREEN evidence

- Focused regression command:
  `bun run test -- runtime/test/dom.test.ts` — exit 0, 16/16 tests passed.
- Full project gate: `bun run check` — exit 0, 28/28 runtime tests passed;
  Elm docs build, TypeScript no-emit check, runtime build, direct distribution
  import check, example Elm/TypeScript checks, and Vite 7 build all passed.
- Exact supported-Node command:
  `node --input-type=module -e "await import('./dist/index.js')"` — exit 0.
- Package dry run: `npm pack --dry-run --json` — exit 0 with 9 expected files.
- Final emitted imports were inspected: `dist/index.js` references
  `./host.js`, and `dist/host.js` references `./dom.js`; declarations use the
  same `.js` specifiers.

## Native smoke

`bun run smoke` exited 0 after rebuilding the runtime and example. Result:

```json
{"ok":true,"elementId":7,"buttonBounds":[236.5,314,167,50],"text":["Elm is driving GPUI","Count: 1","Double: 2","Increment in Elm","Elm model = { count = 1 }"],"screenshotPath":"/Users/benj/workspace/main/elm-gpuix/artifacts/elm-gpuix-smoke.png"}
```

The native run emitted two non-fatal macOS duplicate system-font warnings.

## Remaining concerns

- GPUix native-bubbled ancestor payloads do not include the original target or
  a shared event/origin ID. Browser-identical ancestor `target` values and
  cross-callback `stopPropagation()` cannot be implemented reliably until the
  native payload contract is extended.
- `@gpuix/native@0.4.0` has no window close or renderer disposal API. `stop()`
  cancels owned timers, blocks later callbacks, restores globals, and releases
  logical host ownership, but it cannot close the native window or release
  native resources.
- There are no remaining automated verification failures.
