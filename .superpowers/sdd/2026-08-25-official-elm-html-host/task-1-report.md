# Task 1 report: GPUix-backed DOM mirror

## Files changed

- `runtime/src/dom.ts` (new)
- `runtime/test/dom.test.ts` (new in Task 1's RED phase; extended in fix round 1)
- `.superpowers/sdd/2026-08-25-official-elm-html-host/task-1-report.md` (new)

## Design decisions

- `GpuixDocument` owns a synchronous mutable mirror tree, assigns monotonically
  increasing IDs, and queues literal `@gpuix/native` mutation tuples for a
  single `applyBatch` call at `flush()`.
- The supplied mount node has an internal, non-native parent so Elm
  `Browser.element` can perform its initial `parentNode.replaceChild` while
  the replacement becomes the GPUix root.
- Elements, text nodes, and document fragments implement the structural APIs
  used by Elm Virtual DOM, including keyed removal/reinsertion before a flush.
  Detached native subtrees are destroyed only at the flush boundary.
- Semantic HTML tags map to native `div`; GPUix-supported tags map directly;
  text maps to native `text`.
- Style writes are accumulated as a complete StyleDesc-compatible object at
  flush. CSS kebab-case names are camel-cased and `Npx` values become numbers.
- The supported attribute/property bridge forwards `data-gpuix-test-id` as
  `testId`, plus `value`, `placeholder`, `readOnly`, `autoFocus`, `tabIndex`,
  `src`, and `alt`.
- Native event names are mapped to DOM names. Native `change` updates an input
  value before dispatching the DOM `input` and `change` listeners. Synthesized
  events expose target/currentTarget, pointer coordinates, button, modifiers,
  keyboard, scroll, and cancellation fields.

## Verification

1. RED: `bunx vitest run --config runtime/vitest.config.ts runtime/test/dom.test.ts`
   - Before implementation: failed as expected because `../src/dom` did not
     exist (`Error: Cannot find module '../src/dom'`).
2. GREEN: `bunx vitest run --config runtime/vitest.config.ts runtime/test/dom.test.ts`
   - Passed: 1 test file, 6 tests.
3. `bunx tsc -p runtime/tsconfig.json --noEmit`
   - Passed with exit code 0.

## Concerns

- This deliberately implements only the specified GPUix/Elm supported subset.
  It does not provide full browser CSS/layout/default behavior, navigation,
  general SVG DOM, web components, Browser.Dom, or global Browser.Events.

## Fix round 1

### Additional files changed

- `runtime/src/dom.ts` (amended)
- `runtime/test/dom.test.ts` (amended with focused regressions)
- `.superpowers/sdd/2026-08-25-official-elm-html-host/task-1-report.md` (amended)

### Corrections

- Lowercase DOM `autofocus` now forwards to native `autoFocus`.
- Native element identity is held in `nativeId`; DOM-facing `id` is a string
  property and is reflected through the live attributes collection.
- Attributes are a live array-like named-node map for Elm virtualisation.
- Style output filters to the supported StyleDesc subset and converts unitless
  numeric strings only for numeric StyleDesc fields.
- Unsupported event names stay in the DOM listener mirror but never reach the
  native listener API. Shared `input`/`change` native registration is removed
  only after the final mapped listener is removed.
- `replaceChild(node, node)` is a no-op.

### Verification

1. RED: `bunx vitest run --config runtime/vitest.config.ts runtime/test/dom.test.ts`
   - Exit 1: 10 tests ran; 4 focused regressions failed. The failures exposed
     the DOM/native ID collision, unsupported style output and numeric strings,
     unsupported/shared native event registration, and non-live attributes.
2. GREEN: `bunx vitest run --config runtime/vitest.config.ts runtime/test/dom.test.ts`
   - Exit 0: 1 test file passed, 11 tests passed.
3. `bunx tsc -p runtime/tsconfig.json --noEmit`
   - Exit 0.
