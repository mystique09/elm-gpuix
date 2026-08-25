# elm-gpuix

Run ordinary Elm `Browser.element` and `Browser.sandbox` applications in a
native [GPUix](https://github.com/remorses/gpuix) window. Applications keep the
official `elm/html`, `Html.Attributes`, and `Html.Events` APIs; Elm's own
virtual DOM performs reconciliation against a small GPUix-backed DOM supplied
by the JavaScript host.

The repository contains two companion packages:

- `mystique09/elm-gpuix` exposes GPUix-specific helpers that return official
  `Html.Attribute msg` values. Its initial helper is `Gpuix.testId` for native
  automation.
- `elm-gpuix` initializes `@gpuix/native`, installs the GPUix-backed DOM before
  Elm evaluates, and mounts the compiled Elm program.

The packages are structured for publication but are not published yet. To use
this checkout, install the workspace dependencies at the repository root:

```sh
bun install
```

After publication, an application will install both package names:

```sh
elm install mystique09/elm-gpuix
bun add elm-gpuix
```

## Elm application

Write a normal `Browser.element` application with the official HTML modules.
`Gpuix.testId` is optional and only adds a native automation ID.

```elm
module Main exposing (main)

import Browser
import Gpuix
import Html exposing (Html, button, div, text)
import Html.Events exposing (onClick)


type alias Model =
    { count : Int }


type Msg
    = Increment


main =
    Browser.element
        { init = \_ -> ( { count = 0 }, Cmd.none )
        , update = \Increment model ->
            ( { model | count = model.count + 1 }, Cmd.none )
        , subscriptions = \_ -> Sub.none
        , view = view
        }


view : Model -> Html Msg
view model =
    div []
        [ text ("Count: " ++ String.fromInt model.count)
        , button
            [ Gpuix.testId "increment", onClick Increment ]
            [ text "Increment" ]
        ]
```

## JavaScript host

The host must exist before the compiled Elm module is evaluated. Use a dynamic
import after `createGpuixHost`, then mount the exported Elm program. If the
import fails, stop the unmounted host so its owned timers are canceled, later
callbacks are blocked, installed globals are restored, and logical host
ownership is released.

```ts
import { createGpuixHost } from "elm-gpuix";

const host = createGpuixHost({
  window: { title: "My Elm app", width: 800, height: 600 },
});

let elmModule: typeof import("./Main.elm");
try {
  elmModule = await import("./Main.elm");
} catch (error) {
  host.stop();
  throw error;
}

const runtime = host.mount(elmModule.Elm.Main);
```

`runtime.stop()` cancels host-owned animation and tick timers, ignores later
native callbacks, restores the globals that existed before host creation, and
releases logical process-global host ownership. `@gpuix/native@0.4.0` exposes
no window close or renderer disposal method, so `stop()` does not close the
native window or release native resources.

## Compatibility boundary

Supported in the first host:

- `Browser.element` and `Browser.sandbox`;
- structural nodes, text nodes, keyed insertion, movement, replacement, and
  removal;
- inline styles that map to GPUix `StyleDesc` values;
- mirrored HTML attributes and properties, with known GPUix properties sent to
  native elements;
- click, mouse, keyboard, focus, blur, scroll, change, and submit listeners
  when GPUix exposes the corresponding native event;
- native automation IDs through `Gpuix.testId`.

Not supported:

- CSS classes, selectors, or the CSS cascade;
- browser media, iframe, or arbitrary HTML element semantics;
- general SVG DOM behavior;
- `Browser.application` navigation and history;
- the complete `Browser.Dom` and global `Browser.Events` APIs.

Official Elm helpers still compile, but an unsupported browser behavior does
not automatically gain a native GPUix implementation.

GPUix distributes native click, mouse, key, focus/blur, hover, and scroll
callbacks to each retained element that registered them. The host therefore
invokes those listeners only on the `elementId` in each native payload. Native
control `change` callbacks (mapped to DOM `input` and `change`) and `submit`
callbacks are target-local, so the host synthesizes their DOM ancestor walk
and honors `stopPropagation()` and `stopImmediatePropagation()` within it.

Native-bubbled ancestor payloads do not carry the original target or a shared
native event ID. Browser-identical `target` values for those ancestor callbacks
and `stopPropagation()` across separate native callbacks are not promised
without a future native extension.

## Development

The only native dependency is the registry package `@gpuix/native@0.4.0`; the
repository contains no vendored Rust. The example pins Vite 7 for
`vite-plugin-elm` compatibility.

```sh
bun run check
bun run dev
bun run smoke
```

`bun run check` compiles the Elm package and example, runs the runtime tests and
TypeScript checks, and builds the Vite entry. `bun run dev` builds and launches
the native example. `bun run smoke` builds the complete tree, opens a real GPUI
window, finds and clicks the `increment` control, requires both `Count: 1` and
`Triple: 3`, and writes `artifacts/elm-gpuix-smoke.png`.

## License

MIT. `@gpuix/native` remains available under its own Apache-2.0 license.
