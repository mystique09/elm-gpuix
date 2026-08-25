# Official Elm HTML GPUix host design

## Goal

Run ordinary `Browser.element` and `Browser.sandbox` applications against
GPUix while preserving the official `elm/html`, `Html.Attributes`, and
`Html.Events` types and APIs.

The repository must no longer define a parallel HTML tree, event decoder
registry, application worker, or renderer inside Elm. Elm's own virtual DOM
performs reconciliation. The JavaScript runtime supplies the small mutable DOM
surface that `elm/virtual-dom` patches and translates those mutations into
`@gpuix/native` batches.

## Supported boundary

The first host targets `Browser.element` and `Browser.sandbox`:

- structural and text nodes;
- keyed insertion, movement, replacement, and removal;
- inline styles that translate into GPUix `StyleDesc` values;
- HTML attributes and properties retained in the mirror tree, with known
  GPUix properties forwarded to native elements;
- click, mouse, keyboard, focus, blur, scroll, change, and submit listeners
  when GPUix exposes the matching native event;
- native automation IDs through the Elm package's `Gpuix.testId` helper.

The official helpers remain available to application source, but unsupported
browser semantics do not become native functionality automatically. CSS
classes/cascade, media and iframe behavior, general SVG DOM behavior,
`Browser.application` navigation/history, and the complete `Browser.Dom` and
global `Browser.Events` surface are outside this first host.

GPUix distributes native click, mouse, key, focus/blur, hover, and scroll
callbacks to each registered retained element, so the host invokes those
listeners only on the native payload's `elementId`. Target-local control
`change` callbacks (mapped to DOM `input` and `change`) and `submit` callbacks
synthesize a DOM ancestor walk with stop/immediate-stop semantics. Native
ancestor payloads lack the original target and a shared native event ID, so
browser-identical ancestor `target` values and cross-callback
`stopPropagation` require a future native extension.

## Runtime lifecycle

The runtime exports `createGpuixHost(options)`. Creating the host initializes
the native renderer, creates a GPUix-backed document/window pair, and installs
those globals before the compiled Elm module is evaluated. A consumer then
dynamically imports its Elm module and calls `host.mount(Elm.Main, { flags })`.

The synthetic DOM owns stable monotonically increasing native IDs and a
synchronous mirror tree. Elm's renderer reads and mutates that tree normally.
Mutations are queued and sent through one `applyBatch` call after initial
mount, after a native event callback, and after a synthetic animation-frame
callback.

Detached nodes are destroyed only at flush time. This preserves keyed moves:
a node removed and reinserted during one Elm patch keeps its ID, while a node
still detached at the boundary is destroyed recursively.

## Elm package

The Elm package exposes only `Gpuix`. It depends on official `elm/html` and
provides GPUix-specific helpers whose return types are official
`Html.Attribute msg` or `Html msg`. Initially it exposes `testId` for native
automation. There is no custom HTML type, attributes module, events module,
worker, ports protocol, or Elm-side renderer.

## Example

The example is an ordinary `Browser.element` counter importing `Browser`,
`Html`, `Html.Attributes`, and `Html.Events`. It retains the user's `Double:`
counter output. Its TypeScript entry creates the host before dynamically
importing the compiled Elm module.

## Verification

- Unit tests assert literal native mutation batches from real synthetic DOM
  operations, including keyed detach/reinsert behavior.
- Unit tests assert native event translation by observing a real registered
  DOM listener and event object.
- A host test asserts that Elm receives the synthetic mount node and flags.
- Elm package documentation exposes only `Gpuix`.
- The example compiles using official `Browser.element` and official HTML
  modules.
- The real native smoke test locates `Gpuix.testId`, clicks it through GPUI,
  and observes both `Count: 1` and `Double: 2`.
