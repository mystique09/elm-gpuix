# Task 1 fix round 1 review package

There is no Git range because the project intentionally is not a Git
repository.

## Fix surface

- `runtime/src/dom.ts`: amended throughout to separate DOM/native identity,
  implement the live attributes collection, tighten style/event mappings, and
  bridge lowercase DOM properties.
- `runtime/test/dom.test.ts`: five focused regression tests added after the
  original six-test RED contract.
- `.superpowers/sdd/2026-08-25-official-elm-html-host/task-1-report.md`: fix
  report appended.

Read the fix-round report, then inspect the named findings against the current
files. Treat all newly added regression-test sections and the production code
they exercise as the fix diff.
