# SDD ledger — plan: docs/superpowers/plans/2026-08-25-official-elm-html-host.md

## Preflight

| Scope | Producer / requirement | Consumer / implementation | Finding |
| --- | --- | --- | --- |
| Task 1 | DOM mirror, flush, native event dispatch | Task 2 host lifecycle | Interfaces align. |
| Task 2 | `createGpuixHost` and mount contract | Task 4 Vite entry and smoke test | Interfaces align. |
| Task 3 | Official Elm package helper and Browser example | Task 4 build, docs, and smoke test | Interfaces align. |
| Task 1 internal | Failing DOM batch/event tests | Synthetic DOM implementation | Tests cover the specified supported boundary. |
| Task 2 internal | Failing lifecycle/global tests | Host and public entry implementation | Tests cover the specified lifecycle. |
| Task 3 internal | Official Elm example compiled first | Package reduction and dependency metadata | Clean break agrees with the spec. |
| Task 4 internal | Dynamic import, docs cleanup, real smoke | Runtime build and final verification | Verification matches the spec. |

Ruling: this directory is not a Git repository, so no worktree, commits, or Git diff packages will be created. Use explicit file inventories, focused tests, final-tree verification, and sibling checksums instead. Cost if wrong: no Git history is available to recover or isolate the changes; initializing Git would violate the plan and user scope.

Ruling: the two independent RED-phase test contracts may be authored in parallel because they touch disjoint test files and no production code. Production tasks remain sequential and reviewed. Cost if wrong: inconsistent contracts may require test revision before implementation.

Ruling: task review packages in this non-Git directory are explicit changed-file manifests; reviewers read each named new or replaced file as the complete diff. Cost if wrong: reviewers cannot rely on hunk-level base context, so cross-file scope must be stated manually.

Task 1: review needs fixes — lowercase `autofocus`, invalid StyleDesc values, unsupported event forwarding, DOM `id`/native-ID collision, non-DOM `attributes` collection, and `replaceChild(node, node)` behavior.

Task 1: fix round 1/5 (7 addressed, 0 open; no commits because project is non-Git).

Task 1: minor (deferred): the native-change regression fixture repeats the `value` object key; harmless at runtime but should be cleaned in final review.

Task 1: complete (whole-file review plus scoped re-review clean; no commits because project is non-Git).

Task 2: review needs fixes — active-host ownership is only instance-local, lifecycle acceptance tests omit rAF/tick/error/multiple-host paths, and the pre-mount dynamic-import interval has no public cleanup path.

Task 2: fix round 1/5 (4 addressed, 0 open; no commits because project is non-Git).

Task 2: complete (whole-file review plus scoped re-review clean; no commits because project is non-Git).

Task 3: complete (whole-file review clean; no commits because project is non-Git).

Task 4: complete (whole-file integration review clean; native smoke passed; no commits because project is non-Git).

Task 1 deferred minor resolved during Task 4: the duplicate `value` key in the DOM event regression was removed.

Final verification finding: direct Node ESM import fails because emitted relative imports omit `.js` extensions (`ERR_MODULE_NOT_FOUND` for `dist/host`). This must enter the single final fix wave.

Final review: not ready — fix Node ESM specifiers; remove double synthetic/native event bubbling and non-bubbling ancestor dispatch; narrow `stop()` resource-release wording.

Final fix wave: complete — added RED regressions, fixed all three findings, rebuilt distribution artifacts, and passed focused/full/package/native verification.

Final scoped re-review: clean — Node ESM loading, bounded event propagation, and exact `stop()` documentation are all closed; ready for final-tree verification.

Ruling: retain this SDD ledger at handoff because the project intentionally has no Git history and it is the only durable task record. Cost if wrong: internal coordination files remain in the local checkout, although they are excluded from the published npm package.
