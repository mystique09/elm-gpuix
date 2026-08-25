# Task 4: Vite entry, native smoke, and documentation

Read these authority files first:

- `docs/superpowers/specs/2026-08-25-official-elm-html-host-design.md`
- reviewed public runtime API in `runtime/src/index.ts` and
  `runtime/src/host.ts`
- official Elm example in `example/src/Main.elm`
- current `example/src/host.ts`, `example/vite.config.ts`, `package.json`,
  and `README.md`

## Scope

Complete the integration without restoring any custom Elm view or ports API:

- replace `example/src/host.ts` so it creates `createGpuixHost` first, then
  dynamically imports `./Main.elm`, then mounts `Elm.Main`; stop the unmounted
  host if dynamic import fails;
- retain the real native automation flow and require the post-click tree to
  contain both exact strings `Count: 1` and `Double: 2` before success;
- update `example/vite.config.ts` only as needed so the SSR build preserves a
  runtime dynamic Elm import/chunk and resolves the local built runtime;
- update `package.json` metadata/scripts only where the ports-era description
  or build ordering is stale; keep `@gpuix/native@0.4.0`, Vite 7, and no
  vendored Rust;
- replace `README.md` with accurate installation, ordinary official
  `Browser.element`/`Html` example, create-before-dynamic-import host usage,
  development commands, and an explicit supported/unsupported compatibility
  boundary;
- delete the superseded custom-package documents
  `docs/superpowers/specs/2026-08-25-elm-gpuix-package-design.md` and
  `docs/superpowers/plans/2026-08-25-elm-gpuix-package.md`; retain the official
  host spec and plan.

Do not initialize Git, commit, publish, add dependencies, alter the sibling
`fileviewer`, reintroduce custom `Gpuix.Html`, or touch generated Elm binary
caches. The controller will do a final exact cache cleanup and full-tree
verification after review.

## Verification

Use TDD for the smoke expectation: first make the harness require both strings
and record the expected failure against the stale host/runtime integration;
then complete the integration. Run `bun run check`, inspect the Vite output for
the dynamically loaded Elm chunk, and run the real `bun run smoke`. The smoke
must click `increment`, observe both strings, and write the screenshot. Search
non-generated source/docs for custom HTML/ports-era references.

Write the full report to
`.superpowers/sdd/2026-08-25-official-elm-html-host/task-4-report.md`, including
RED/GREEN evidence, files changed/deleted, commands/outcomes, smoke JSON, and
concerns. Use `apply_patch` for source/docs changes; do not spawn subagents.
