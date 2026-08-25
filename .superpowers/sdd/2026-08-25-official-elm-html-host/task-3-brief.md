# Task 3: Remove the parallel Elm view system

Read these authority files first:

- `docs/superpowers/specs/2026-08-25-official-elm-html-host-design.md`
- current `elm.json`, `src/Gpuix.elm`, and all `src/Gpuix/**` modules
- current `example/src/Main.elm`, `example/elm.json`, and
  `example/src/elm.d.ts`

## Scope

Make a clean break to official Elm APIs. First replace the example source with
the desired official `Browser.element` program and run its Elm compilation to
record the expected RED dependency/helper failure. Then:

- replace `src/Gpuix.elm` with a single documented
  `testId : String -> Html.Attribute msg` helper implemented via the official
  `Html.Attributes.attribute "data-gpuix-test-id"`;
- make root `elm.json` expose only `Gpuix` and depend directly on `elm/core`
  and `elm/html` using valid package ranges;
- delete `src/Gpuix/Html.elm`, `src/Gpuix/Html/Attributes.elm`,
  `src/Gpuix/Html/Events.elm`, and `src/Gpuix/Internal.elm` with no aliases,
  wrappers, deprecated exports, worker, ports, decoder registry, or Elm-side
  renderer left behind;
- migrate `example/elm.json` to the exact application dependency graph for
  `elm/browser` 1.0.2, `elm/core` 1.0.5, and `elm/html` 1.0.1, with their
  required indirect dependencies;
- update `example/src/elm.d.ts` to type the generated Elm module as the new
  `ElmProgram` public runtime contract.

The example must use only official `Browser`, `Html`, `Html.Attributes`, and
`Html.Events` plus `Gpuix.testId`. Preserve the visual intent, counter update,
automation ID `increment`, and both exact dynamic text prefixes `Count: ` and
`Double: `. The double expression must be valid Elm:
`String.fromInt (model.count * 2)`.

Do not modify the JavaScript host, Vite config, README, package scripts, or
runtime. Task 4 handles their temporarily broken imports.

## Verification

Run root package docs generation and the example Elm compilation. Inspect
`docs.json` to confirm it documents exactly `Gpuix`; search source/config for
any remaining `Gpuix.Html`, `Gpuix.worker`, or custom ports references. Write
the full report to
`.superpowers/sdd/2026-08-25-official-elm-html-host/task-3-report.md`, including
the RED reason, files changed/deleted, exact commands/outcomes, and concerns.
Use `apply_patch`; do not initialize Git, commit, touch generated binary cache
files, or spawn subagents.
