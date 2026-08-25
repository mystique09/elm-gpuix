# Task 1: GPUix-backed DOM mirror

Read these authority files first:

- `docs/superpowers/specs/2026-08-25-official-elm-html-host-design.md`
- `runtime/test/dom.test.ts`
- the relevant DOM calls in the installed Elm Virtual DOM kernel at `/Users/benj/.elm/0.19.2/packages/elm/virtual-dom/1.0.5/src/Elm/Kernel/VirtualDom.js`

## Scope

Create `runtime/src/dom.ts`. Do not modify the host, public runtime entry, Elm package, example, docs, dependencies, or existing tests. Modify `runtime/test/dom.test.ts` only if a test is demonstrably inconsistent with the binding design spec, and explain why in the report.

The module must provide the `GpuixDocument` API exercised by the RED tests and the synchronous DOM surface required by official Elm Virtual DOM for `Browser.element`: element/text/document-fragment creation, live tree relationships, structural mutations, text replacement, live attributes, mutable styles, arbitrary property assignment, event listener registration, event dispatch, and Elm expando fields.

Translate the supported subset into literal `@gpuix/native` mutation batches. Preserve stable IDs. Defer destruction until flush so remove-then-reinsert keyed moves retain identity; destroy truly detached subtrees at flush. Map common DOM/native event names and synthesize the decoder-visible fields specified by the design. Map semantic HTML container tags to native `div`, text to native `text`, and supported native tags directly. Translate CSS-style names and numeric pixel strings into StyleDesc-compatible values. Forward `data-gpuix-test-id` as native `testId`, plus concrete supported properties such as value, placeholder, readOnly, autoFocus, tabIndex, src, and alt.

Do not claim or emulate full CSS, browser defaults, navigation, general SVG DOM, or arbitrary web components.

## Verification

Run the focused DOM test and TypeScript check. Keep implementation concrete and typed; `unknown` is allowed only at external/untyped object boundaries. Write the implementation report to `.superpowers/sdd/2026-08-25-official-elm-html-host/task-1-report.md` with files changed, design decisions, commands, exact outcomes, and concerns. Do not commit or initialize Git.
