# Official Elm HTML GPUix Host Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkboxes for tracking.

**Goal:** Replace the parallel Elm view system with a GPUix-backed DOM host for
official `elm/html` and `Browser.element` applications.

**Architecture:** Elm's official virtual DOM diffs into a synchronous
JavaScript mirror implementing only the DOM calls its kernel makes. The mirror
queues GPUix mutation tuples and flushes them through `@gpuix/native`; the Elm
package contains only native-specific helpers returning official HTML types.

**Tech Stack:** Elm 0.19.2, elm/browser 1.0.2, elm/html 1.0.1, TypeScript 5.9,
Vitest 4.1, Vite 7, @gpuix/native 0.4.0.

**Spec:** `docs/superpowers/specs/2026-08-25-official-elm-html-host-design.md`

## Global constraints

- Do not initialize Git, commit, publish, or modify the sibling `fileviewer`.
- Preserve the user's `Double:` output while migrating the example.
- Do not retain aliases or wrappers for the removed parallel view system.
- Use published `@gpuix/native@0.4.0`; do not restore vendored Rust.

---

### Task 1: GPUix-backed DOM mirror

**Files:**
- Create: `runtime/test/dom.test.ts`
- Create: `runtime/src/dom.ts`
- Modify: `runtime/vitest.config.ts`

**Interfaces:**
- Produces: `GpuixDocument`, `GpuixElement`, `GpuixText`, `flush()`, and
  `dispatchNativeEvent(payload)` over a renderer exposing `applyBatch`.

- [ ] Write failing tests for structural batches, style translation,
  automation attributes, listener flags, native event dispatch, and
  detach/reinsert ID preservation.
- [ ] Run focused Vitest and verify failures are caused by the absent DOM host.
- [ ] Implement the smallest synchronous mirror and batch queue that satisfies
  those behaviors.
- [ ] Run focused and full runtime tests.

### Task 2: Host lifecycle and official Browser program contract

**Files:**
- Create: `runtime/test/host.test.ts`
- Create: `runtime/src/host.ts`
- Replace: `runtime/src/index.ts`
- Modify: `runtime/tsconfig.json`

**Interfaces:**
- Consumes: the DOM mirror from Task 1.
- Produces: `createGpuixHost(options)` and
  `host.mount(Elm.Main, { flags })`, returning `{ app, renderer, stop }`.

- [ ] Write a failing host test proving globals are installed before mount,
  the synthetic node and JSON flags reach `Elm.Main.init`, mutations flush,
  and `stop` is idempotent.
- [ ] Run the test and verify the old ports runtime fails the new contract.
- [ ] Implement the host lifecycle, frame loop, native callback dispatch, and
  global restoration.
- [ ] Run runtime tests and TypeScript checks.

### Task 3: Remove the parallel Elm view system

**Files:**
- Replace: `src/Gpuix.elm`
- Delete: the custom view, attributes, events, and internal compiler modules
- Modify: `elm.json`
- Replace: `example/src/Main.elm`
- Modify: `example/elm.json`
- Replace: `example/src/elm.d.ts`

**Interfaces:**
- Consumes: official `Browser.element`, `Html`, `Html.Attributes`, and
  `Html.Events`.
- Produces: `Gpuix.testId : String -> Html.Attribute msg`.

- [ ] Replace the example first and run Elm compilation to record the expected
  missing dependency/helper failure.
- [ ] Reduce the Elm package to `Gpuix.testId` over official HTML attributes.
- [ ] Update package dependency metadata and compile package docs.
- [ ] Compile the example and verify the user's count and double-count text are
  present in the view.

### Task 4: Vite entry, native smoke, and documentation

**Files:**
- Replace: `example/src/host.ts`
- Modify: `example/vite.config.ts`
- Modify: `package.json`
- Replace: `README.md`
- Delete: superseded package design and implementation-plan documents

**Interfaces:**
- Consumes: `createGpuixHost` and the dynamically imported Elm module.
- Produces: a Vite/Bun native executable with no application ports.

- [ ] Build the runtime before the example and verify Vite emits the dynamic
  Elm chunk plus native host.
- [ ] Run the real native smoke test and require `Count: 1` and `Double: 2`.
- [ ] Remove all obsolete view-system sources and references.
- [ ] Run frozen install, package docs, Vitest, TypeScript, Vite, npm dry-pack,
  and the native smoke test from the final tree.
- [ ] Confirm the sibling `fileviewer` checksum remains
  `14bd14a7a845afa67b67c25f13ccfe11f529f22186adad47080507101b6287ea`.
