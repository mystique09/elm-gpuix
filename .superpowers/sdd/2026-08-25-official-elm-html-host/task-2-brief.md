# Task 2: Host lifecycle and official Browser program contract

Read these authority files first:

- `docs/superpowers/specs/2026-08-25-official-elm-html-host-design.md`
- `runtime/test/host.test.ts`
- `runtime/src/dom.ts`
- the official Elm Browser element/animation kernel at `/Users/benj/.elm/0.19.2/packages/elm/browser/1.0.2/src/Elm/Kernel/Browser.js`

## Scope

Create `runtime/src/host.ts` and replace `runtime/src/index.ts` with the clean
public API. Delete `runtime/test/runtime.test.ts`, because it tests the removed
ports runtime and is not a compatibility surface. Do not modify the Elm
package, example, package docs, Vite configuration, or package metadata.

Export `createGpuixHost(options?)`. Host creation must instantiate and
initialize `GpuixRenderer`, create the synthetic document/window pair, and
install `document`, `window`, `requestAnimationFrame`, and
`cancelAnimationFrame` on `globalThis` immediately so an Elm module imported
after host creation captures them. The synthetic window needs only the safe
surface official `Browser.element` and Elm passive-event detection consume.

`host.mount(program, { flags }?)` must call `program.init` with the synthetic
mount node and only include `flags` when supplied. It flushes the initial DOM
mutations and returns `{ app, renderer, stop }`. Native callbacks dispatch
through `GpuixDocument` and flush after Elm event handling. Synthetic rAF
callbacks flush after the callback. Preserve the native tick loop used by the
old runtime. `stop` must be idempotent, cancel owned scheduled work, and
restore the exact prior global property descriptors. Reject or clearly guard
unsupported multiple mounts. Restore globals if initialization or mount
throws.

Use concrete public types for JSON flags, generated Elm program init, host,
runtime, and renderer boundary. Do not retain `render`, `createRuntime`, ports
interfaces, or aliases.

## Verification

Run the focused host test, full runtime Vitest suite, and runtime TypeScript
check. If a RED test asserts behavior inconsistent with real DOM semantics,
adjust it only with a written rationale and a focused replacement assertion.
Write the full report to
`.superpowers/sdd/2026-08-25-official-elm-html-host/task-2-report.md`, including
files changed, RED/GREEN evidence, exact commands/outcomes, and concerns. Use
`apply_patch`; do not initialize Git, commit, or spawn subagents.
