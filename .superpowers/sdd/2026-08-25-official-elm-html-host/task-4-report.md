# Task 4 report: Vite entry, native smoke, and documentation

## Status

Implementation and automated verification are complete. The example now
creates the GPUix host before evaluating the compiled Elm module, Vite keeps
that module as a runtime-loaded chunk, and the real native smoke verifies both
post-click counter strings.

No dependency was added, no Rust was vendored, and `example/vite.config.ts`
did not need a change: its existing SSR configuration preserves the dynamic
Elm import once the entry uses one.

## RED evidence

The smoke harness was changed first to require both exact strings:

- `Count: 1`
- `Double: 2`

Running `bun run smoke` against the stale entry exited 1 during the Vite build:

```text
src/host.ts (5:9): "render" is not exported by "../dist/index.js"
```

This demonstrated that the ports-era entry could not use the reviewed
`createGpuixHost` runtime and also evaluated `Main.elm` statically before the
host installed the synthetic DOM globals.

After replacing the entry, the first real native run reached Elm's official
virtual DOM and exposed a cross-layer compatibility failure:

```text
TypeError: undefined is not an object (evaluating 'before.parentNode')
at insertBefore
at _VirtualDom_applyPatch
```

The official `elm/virtual-dom` append patch reads `childNodes[i]`; when `i` is
the current length, that value is `undefined` and is passed to
`insertBefore`. A focused DOM regression reproduced the behavior and failed
1/12 before the fix with the same `before.parentNode` error.

## Implementation

- `example/src/host.ts` now calls `createGpuixHost` before dynamically
  importing `./Main.elm`, stops the unmounted host if that import rejects, and
  mounts `Elm.Main` only after evaluation succeeds.
- The smoke wait now succeeds only when `renderer.getAllText()` contains both
  exact post-click strings.
- `runtime/src/dom.ts` now treats a nullish `insertBefore` reference as the DOM
  append case. This matches the official Elm virtual-DOM patch path while
  retaining the existing validation for non-null reference nodes.
- `runtime/test/dom.test.ts` covers the out-of-range `childNodes` append path.
- `package.json` describes the official `Browser.element`/`Html` host. Script
  ordering already builds the runtime before checking and building the
  example, so no script change was necessary.
- `README.md` now documents unpublished/current-checkout installation,
  ordinary official Elm HTML application code, create-before-dynamic-import
  host usage, development commands, and the explicit supported/unsupported
  compatibility boundary.
- The two superseded custom-package design documents were removed. The
  official host design and plan remain.

## Files changed

- `example/src/host.ts`
- `runtime/src/dom.ts`
- `runtime/test/dom.test.ts`
- `package.json`
- `README.md`
- `.superpowers/sdd/2026-08-25-official-elm-html-host/task-4-report.md`

## Files deleted

- `docs/superpowers/specs/2026-08-25-elm-gpuix-package-design.md`
- `docs/superpowers/plans/2026-08-25-elm-gpuix-package.md`

## GREEN verification

### Focused DOM regression

`bun run test -- runtime/test/dom.test.ts` exited 0:

```text
Test Files  1 passed (1)
Tests       12 passed (12)
```

### Full check

`bun run check` exited 0 on the final source tree:

```text
Test Files  2 passed (2)
Tests       24 passed (24)
```

The same command also completed the package docs build, runtime TypeScript
check/build, official Elm example compile, example TypeScript check, and Vite
SSR build.

### Vite dynamic chunk inspection

The Vite build emitted:

```text
dist/host.js                  32.87 kB
dist/assets/Main-BIOeRjhQ.js  87.87 kB
```

`example/dist/host.js` retains the runtime boundary:

```js
elmModule = await import('./assets/Main-BIOeRjhQ.js');
```

### Real native smoke

The final `bun run smoke` exited 0 after building the runtime and Vite entry,
opening the real GPUI window, finding `increment`, simulating the click, and
capturing the screenshot.

Smoke JSON:

```json
{"ok":true,"elementId":7,"buttonBounds":[236.5,314,167,50],"text":["Elm is driving GPUI","Count: 1","Double: 2","Increment in Elm","Elm model = { count = 1 }"],"screenshotPath":"/Users/benj/workspace/main/elm-gpuix/artifacts/elm-gpuix-smoke.png"}
```

### Ports/custom-HTML search

A non-generated source/docs search found no application or README reference to
`Gpuix.Html`, `Gpuix.worker`, `gpuixRender`, `gpuixEvents`, `gpuixReady`, the
old `render(Elm...)` host, or a custom ports API. Remaining textual matches are
only the retained official design's explicit statement that those APIs do not
exist and SDD brief/report history describing their removal.

The requested superseded spec and plan paths were also confirmed absent.

## Concerns

- The native smoke emits two macOS duplicate-system-font warnings from GPUI;
  they do not affect the successful automation result or screenshot.
- The compatibility boundary remains intentionally narrower than a browser,
  as documented in the retained official design and README.
- Publication and any external release work remain pending and were not part
  of this task.
