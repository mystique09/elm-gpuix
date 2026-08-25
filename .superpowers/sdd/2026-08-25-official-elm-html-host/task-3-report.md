# Task 3 report: Official Elm APIs and package clean break

## Result

The Elm package now exposes only `Gpuix.testId`, which returns the official
`Html.Attribute msg` produced with
`Html.Attributes.attribute "data-gpuix-test-id"`. The example is an ordinary
`Browser.element` application using official `Browser`, `Html`,
`Html.Attributes`, and `Html.Events` APIs. It retains the counter, automation
ID `increment`, and the exact dynamic prefixes `Count: ` and `Double: `; the
double expression is `String.fromInt (model.count * 2)`.

## Files changed

- Replaced `src/Gpuix.elm` with the documented `testId` helper.
- Updated `elm.json` to expose only `Gpuix` and directly depend on `elm/core`
  and `elm/html` with valid package ranges.
- Updated `example/src/Main.elm` to use the official Browser and HTML modules.
- Updated `example/elm.json` to the exact Browser 1.0.2/Core 1.0.5/HTML 1.0.1
  dependency graph, including `elm/json` 1.1.4, `elm/time` 1.0.0,
  `elm/url` 1.0.0, and `elm/virtual-dom` 1.0.5 as indirect dependencies.
- Updated `example/src/elm.d.ts` so `Elm.Main` is an
  `ElmProgram<object>`.
- Regenerated `docs.json` through the required package documentation command.
- Added this report.

## Files deleted

- `src/Gpuix/Html.elm`
- `src/Gpuix/Html/Attributes.elm`
- `src/Gpuix/Html/Events.elm`
- `src/Gpuix/Internal.elm`

## RED/GREEN evidence

RED was recorded after replacing only `example/src/Main.elm` with the desired
official `Browser.element` program and before changing either dependency file
or the package helper:

```text
$ bun run --cwd example check:elm
$ elm make src/Main.elm --output=/dev/null
-- MODULE NOT FOUND -- src/Main.elm
You are trying to import a `Browser` module.
Hint: Maybe you want the `Browser` module defined in the elm/browser package?

-- MODULE NOT FOUND -- src/Main.elm
You are trying to import a `Html` module.
Hint: Maybe you want the `Html` module defined in the elm/html package?

-- MODULE NOT FOUND -- src/Main.elm
You are trying to import a `Html.Attributes` module.

-- MODULE NOT FOUND -- src/Main.elm
You are trying to import a `Html.Events` module.

Detected problems in 1 module.
error: script "check:elm" exited with code 1
```

The expected failure proved the official view was in place before the package
and application dependency migration: the old application manifest supplied
only `elm/core` and `elm/json`, so the official Browser and HTML modules were
unavailable.

GREEN:

```text
$ bun run check:elm
$ elm make --docs=docs.json
Success! Compiled 1 module.

$ bun run --cwd example check:elm
$ elm make src/Main.elm --output=/dev/null
Success! Compiled 2 modules.
```

Final inspection commands and outcomes:

```text
$ jq -r '.[].name' docs.json
Gpuix

$ jq -r '.[0].values[] | select(.name == "testId") | .type' docs.json
String.String -> Html.Attribute msg

$ rg -n --glob '*.elm' --glob 'elm.json' \
    'Gpuix\\.Html|Gpuix\\.worker|gpuixRender|gpuixEvents|gpuixReady|^port ' \
    src example/src elm.json example/elm.json
none
```

Only `src/Gpuix.elm` remains under `src`; documentation therefore describes
exactly `Gpuix` and its official `Html.Attribute msg` helper.

## Concerns

The JavaScript host, Vite configuration, README, package scripts, and runtime
were intentionally left untouched as required. Their obsolete ports-era
imports and documentation are expected to be reconciled by Task 4; this task
only establishes the official Elm package and example source contract.
