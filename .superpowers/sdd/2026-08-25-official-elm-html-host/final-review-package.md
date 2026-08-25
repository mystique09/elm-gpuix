# Final whole-project review package

This project intentionally has no Git repository or historical diff. Review
the current source as the complete implementation of
`docs/superpowers/specs/2026-08-25-official-elm-html-host-design.md` and
`docs/superpowers/plans/2026-08-25-official-elm-html-host.md`.

## Production and public-contract surface

- `runtime/src/dom.ts`
- `runtime/src/host.ts`
- `runtime/src/index.ts`
- `src/Gpuix.elm`
- `elm.json`
- `package.json`
- `example/src/Main.elm`
- `example/src/host.ts`
- `example/src/elm.d.ts`
- `example/elm.json`
- `example/package.json`
- `example/vite.config.ts`
- `README.md`

## Tests

- `runtime/test/dom.test.ts`
- `runtime/test/host.test.ts`
- `runtime/vitest.config.ts`
- `runtime/tsconfig.json`

## Removed public surface

The only Elm source file is `src/Gpuix.elm`. The former custom HTML,
attributes, events, internal compiler, worker, and ports runtime files/APIs
must remain absent. The two superseded custom-package design documents must
remain absent.

## Generated evidence

- `docs.json` documents only `Gpuix`.
- `dist/**` is the npm runtime output.
- `example/dist/host.js` dynamically imports
  `example/dist/assets/Main-BIOeRjhQ.js` after host creation.
- `artifacts/elm-gpuix-smoke.png` and the Task 4 report record the successful
  real native click smoke with `Count: 1` and `Double: 2`.

## Current verification

- `bun install --frozen-lockfile`: pass.
- clean-cache `bun run check`: pass, 24/24 tests and both Elm builds.
- `npm pack --dry-run --json`: pass, 9 expected npm files.
- Direct supported-Node distribution import:
  `node --input-type=module -e "await import('./dist/index.js')"`: **fail**
  with `ERR_MODULE_NOT_FOUND` for `dist/host`, because emitted ESM relative
  imports omit `.js`. Treat this as an open Important packaging finding and
  check whether the same issue exists from `host.js` to `dom.js`.

## Constraints

- No Git initialization, commits, publishing, dependency additions, vendored
  Rust, or sibling `fileviewer` changes.
- Keep `@gpuix/native@0.4.0`, Elm 0.19.2 toolchain, and Vite 7.
- This is a deliberately bounded `Browser.element`/`Browser.sandbox` host,
  not a full browser DOM/CSS/navigation implementation.
