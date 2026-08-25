# Task 2 report: Host lifecycle and official Browser program contract

## Files changed

- Added `runtime/src/host.ts`.
- Replaced `runtime/src/index.ts` with the host-only public API.
- Updated `runtime/test/host.test.ts` to assert `currentTarget` while the listener runs.
- Deleted `runtime/test/runtime.test.ts`, which covered the removed ports runtime.
- Added this task report.

## Implementation

`createGpuixHost(options?)` now creates and initializes the concrete
`GpuixRenderer`, creates a `GpuixDocument`, installs the synthetic document,
window, and animation-frame globals, and exposes one guarded `mount` call.
Mount initializes the generated Elm program with the synthetic mount node and
optional JSON flags, flushes its initial mutations, drives native ticks when
required, and returns the app, renderer, and idempotent cleanup function.

Native events dispatch through `GpuixDocument` and flush afterwards. Synthetic
animation-frame callbacks also flush in a `finally` block. Cleanup cancels
owned timeout work and restores the exact global descriptors captured before
host creation. Initialization and mount exceptions follow the same cleanup
path.

## RED/GREEN evidence

RED, before implementation:

```text
$ bunx vitest run --config runtime/vitest.config.ts runtime/test/host.test.ts
Test Files  1 failed (1)
Tests  4 failed (4)
TypeError: createGpuixHost is not a function
```

The original native-event expectation read `event.currentTarget` through the
Vitest call record after synchronous dispatch had completed. In real DOM event
semantics, `currentTarget` is only set while the listener is being invoked and
is `null` afterwards. The test now captures it in the real listener and
asserts that it was the button; the post-dispatch event assertion retains the
target, coordinate, button, and modifier checks.

GREEN:

```text
$ bunx vitest run --config runtime/vitest.config.ts runtime/test/host.test.ts
Test Files  1 passed (1)
Tests  4 passed (4)

$ bun run test
Test Files  2 passed (2)
Tests  15 passed (15)

$ bun run check:runtime
tsc -p runtime/tsconfig.json --noEmit
exit 0
```

## Concerns

The supported host intentionally provides only the minimal window surface
needed by `Browser.element` and passive-event probing. It is process-global and
permits one mounted Elm program; `Browser.application`, full global browser
events, navigation/history, and the broader browser DOM remain outside this
host's documented support boundary.

## Fix round 1: lifecycle ownership and cleanup

### Files changed in this round

- Updated `runtime/src/host.ts`.
- Updated `runtime/test/host.test.ts`.
- Updated this task report.

`GpuixHost` now exposes idempotent pre-mount `stop()`. A module-scoped
ownership token rejects a second live host before it constructs a renderer or
changes globals, and is released exactly once by normal stop and every
initialization or mount error path. Native callbacks return before dispatch or
flush after stop. The host tests also cover same-host remount rejection,
animation-frame flush and cancellation, native tick scheduling and
cancellation, renderer/program initialization failures, process-global host
collision and descriptor restoration, pre-mount stop, and ignored post-stop
native events. All scheduled-work assertions use Vitest fake timers.

RED, before the lifecycle production fix:

```text
$ bunx vitest run --config runtime/vitest.config.ts runtime/test/host.test.ts
Test Files  1 failed (1)
Tests  5 failed | 7 passed (12)

TypeError: host.stop is not a function
AssertionError: expected [Function] to throw an error
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
```

GREEN:

```text
$ bunx vitest run --config runtime/vitest.config.ts runtime/test/host.test.ts
Test Files  1 passed (1)
Tests  12 passed (12)

$ bun run test
Test Files  2 passed (2)
Tests  23 passed (23)

$ bun run check:runtime
tsc -p runtime/tsconfig.json --noEmit
exit 0
```
