import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface NativeWindowOptions {
  readonly title?: string;
  readonly width?: number;
  readonly height?: number;
}

interface NativeModifiers {
  readonly shift: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly cmd: boolean;
}

interface NativeEvent {
  readonly elementId: number;
  readonly eventType: string;
  readonly x?: number;
  readonly y?: number;
  readonly button?: number;
  readonly modifiers?: NativeModifiers;
}

type NativeEventCallback = (
  error: Error | null,
  event: NativeEvent,
) => void;

type JsonValue =
  | boolean
  | null
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

type NativeMutation = readonly [string, ...JsonValue[]];

const nativeMock = vi.hoisted(() => {
  class MockGpuixRenderer {
    static readonly instances: MockGpuixRenderer[] = [];
    static failConstruction = false;
    static failInitialization = false;
    static needsTick = false;

    readonly batches: string[] = [];
    readonly initializedWith: Array<NativeWindowOptions | null | undefined> =
      [];
    readonly operations: NativeMutation[] = [];
    tickCount = 0;

    constructor(private readonly callback?: NativeEventCallback) {
      if (MockGpuixRenderer.failConstruction) {
        throw new Error("renderer construction failed");
      }
      MockGpuixRenderer.instances.push(this);
    }

    init(options?: NativeWindowOptions | null): void {
      if (MockGpuixRenderer.failInitialization) {
        throw new Error("renderer initialization failed");
      }
      this.initializedWith.push(options);
    }

    applyBatch(json: string): number[] {
      this.batches.push(json);
      const operations: NativeMutation[] = JSON.parse(json);
      this.operations.push(...operations);
      return [];
    }

    requiresTick(): boolean {
      return MockGpuixRenderer.needsTick;
    }

    tick(): boolean {
      this.tickCount += 1;
      return true;
    }

    emit(event: NativeEvent): void {
      this.callback?.(null, event);
    }
  }

  return { MockGpuixRenderer };
});

vi.mock("@gpuix/native", () => ({
  GpuixRenderer: nativeMock.MockGpuixRenderer,
}));

import { createGpuixHost } from "../src/index";

interface SyntheticDocument {
  createElement(tagName: string): SyntheticElement;
  createTextNode(text: string): SyntheticText;
}

interface SyntheticNode {
  readonly ownerDocument: SyntheticDocument;
}

interface SyntheticContainer extends SyntheticNode {
  appendChild(child: SyntheticNode): SyntheticNode;
}

interface SyntheticEvent {
  readonly type: string;
  readonly target: SyntheticElement;
  readonly currentTarget: SyntheticElement;
  readonly clientX: number;
  readonly clientY: number;
  readonly button: number;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

interface SyntheticElement extends SyntheticContainer {
  addEventListener(
    eventType: string,
    listener: (event: SyntheticEvent) => void,
  ): void;
}

interface SyntheticText extends SyntheticNode {
  readonly length: number;
  replaceData(offset: number, count: number, text: string): void;
}

interface ElmInitOptions {
  readonly node: SyntheticElement;
  readonly flags?: JsonValue;
}

interface ElmProgram<TApp> {
  init(options: ElmInitOptions): TApp;
}

const globalNames = [
  "document",
  "window",
  "requestAnimationFrame",
  "cancelAnimationFrame",
] as const;

type HostGlobalName = (typeof globalNames)[number];
type GlobalSnapshot = ReadonlyMap<HostGlobalName, PropertyDescriptor | undefined>;

let originalGlobals: GlobalSnapshot;

beforeEach(() => {
  originalGlobals = captureGlobals();
  nativeMock.MockGpuixRenderer.instances.length = 0;
  nativeMock.MockGpuixRenderer.failConstruction = false;
  nativeMock.MockGpuixRenderer.failInitialization = false;
  nativeMock.MockGpuixRenderer.needsTick = false;
});

afterEach(() => {
  vi.useRealTimers();
  restoreGlobals(originalGlobals);
  vi.clearAllMocks();
});

describe("createGpuixHost", () => {
  it("installs globals before Elm evaluation and mounts with its node and flags", () => {
    const priorDocument = Reflect.get(globalThis, "document");
    const priorWindow = Reflect.get(globalThis, "window");
    const host = createGpuixHost({
      window: { title: "Elm GPUix", width: 640, height: 480 },
    });
    const renderer = getOnlyRenderer();

    const globalsAtElmEvaluation = {
      document: Reflect.get(globalThis, "document"),
      window: Reflect.get(globalThis, "window"),
      requestAnimationFrame: Reflect.get(
        globalThis,
        "requestAnimationFrame",
      ),
      cancelAnimationFrame: Reflect.get(globalThis, "cancelAnimationFrame"),
    };

    expect(globalsAtElmEvaluation.document).not.toBe(priorDocument);
    expect(globalsAtElmEvaluation.window).not.toBe(priorWindow);
    expect(globalsAtElmEvaluation.window).toMatchObject({
      document: globalsAtElmEvaluation.document,
    });
    expect(globalsAtElmEvaluation.requestAnimationFrame).toBeTypeOf("function");
    expect(globalsAtElmEvaluation.cancelAnimationFrame).toBeTypeOf("function");
    expect(renderer.initializedWith).toEqual([
      { title: "Elm GPUix", width: 640, height: 480 },
    ]);

    const app = { name: "counter" };
    const flags = { initialCount: 7, theme: "dark" } as const;
    const program: ElmProgram<typeof app> = {
      init: vi.fn((options) => {
        const main = options.node.ownerDocument.createElement("main");
        main.appendChild(
          options.node.ownerDocument.createTextNode("Count: 7"),
        );
        options.node.appendChild(main);
        return app;
      }),
    };

    const runtime = host.mount(program, { flags });

    expect(program.init).toHaveBeenCalledOnce();
    expect(program.init).toHaveBeenCalledWith({
      node: expect.objectContaining({ ownerDocument: globalsAtElmEvaluation.document }),
      flags,
    });
    expect(runtime.app).toBe(app);
    expect(runtime.renderer).toBe(renderer);
    expect(renderer.batches).not.toHaveLength(0);

    runtime.stop();
    expectGlobalsToMatch(originalGlobals);
  });

  it("omits the flags field when the program has no flags", () => {
    const host = createGpuixHost({});
    const app = { name: "no-flags" };
    const program: ElmProgram<typeof app> = {
      init: vi.fn(() => app),
    };

    const runtime = host.mount(program);
    const [options] = vi.mocked(program.init).mock.calls[0] ?? [];

    expect(options).toBeDefined();
    expect(Object.keys(options ?? {})).toEqual(["node"]);
    runtime.stop();
  });

  it("dispatches native events through the DOM and flushes listener mutations", () => {
    const host = createGpuixHost({});
    let currentTargetDuringListener: SyntheticElement | null = null;
    const eventListener = vi.fn((event: SyntheticEvent) => {
      currentTargetDuringListener = event.currentTarget;
      eventText.replaceData(0, eventText.length, "Count: 1");
    });
    let eventText: SyntheticText;
    let button: SyntheticElement;
    const app = { name: "events" };
    const program: ElmProgram<typeof app> = {
      init(options) {
        button = options.node.ownerDocument.createElement("button");
        eventText = options.node.ownerDocument.createTextNode("Count: 0");
        button.addEventListener("click", eventListener);
        button.appendChild(eventText);
        options.node.appendChild(button);
        return app;
      },
    };

    const runtime = host.mount(program);
    const renderer = getOnlyRenderer();
    const listenerOperation = renderer.operations.find(
      (operation) =>
        operation[0] === "setEventListener" &&
        operation[2] === "click" &&
        operation[3] === true,
    );
    const listenerElementId = listenerOperation?.[1];

    if (typeof listenerElementId !== "number") {
      throw new Error("The mounted click listener did not reach GPUix");
    }

    renderer.operations.length = 0;
    renderer.emit({
      elementId: listenerElementId,
      eventType: "click",
      x: 12,
      y: 34,
      button: 0,
      modifiers: { shift: true, ctrl: false, alt: false, cmd: true },
    });

    expect(eventListener).toHaveBeenCalledOnce();
    expect(eventListener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "click",
        target: button,
        clientX: 12,
        clientY: 34,
        button: 0,
        shiftKey: true,
        ctrlKey: false,
        altKey: false,
        metaKey: true,
      }),
    );
    expect(currentTargetDuringListener).toBe(button);
    expect(renderer.operations).toContainEqual([
      "setText",
      expect.any(Number),
      "Count: 1",
    ]);

    runtime.stop();
  });

  it("restores existing globals exactly once when stopped repeatedly", () => {
    const sentinelDocument = { name: "original document" };
    const sentinelWindow = { document: sentinelDocument };
    const sentinelRequestFrame = vi.fn(() => 91);
    const sentinelCancelFrame = vi.fn();
    defineGlobal("document", sentinelDocument);
    defineGlobal("window", sentinelWindow);
    defineGlobal("requestAnimationFrame", sentinelRequestFrame);
    defineGlobal("cancelAnimationFrame", sentinelCancelFrame);

    const host = createGpuixHost({});
    const runtime = host.mount({ init: () => ({ name: "app" }) });

    expect(Reflect.get(globalThis, "document")).not.toBe(sentinelDocument);
    runtime.stop();
    runtime.stop();

    expect(Reflect.get(globalThis, "document")).toBe(sentinelDocument);
    expect(Reflect.get(globalThis, "window")).toBe(sentinelWindow);
    expect(Reflect.get(globalThis, "requestAnimationFrame")).toBe(
      sentinelRequestFrame,
    );
    expect(Reflect.get(globalThis, "cancelAnimationFrame")).toBe(
      sentinelCancelFrame,
    );
  });

  it("rejects a second mount on the same host", () => {
    const host = createGpuixHost({});
    const runtime = host.mount({ init: () => ({ name: "first" }) });
    const secondProgram: ElmProgram<{ readonly name: string }> = {
      init: vi.fn(() => ({ name: "second" })),
    };

    expect(() => host.mount(secondProgram)).toThrow(
      "A GPUix host supports only one mounted Elm program.",
    );
    expect(secondProgram.init).not.toHaveBeenCalled();

    runtime.stop();
  });

  it("flushes synthetic animation-frame mutations and cancels them on stop", () => {
    vi.useFakeTimers();
    const host = createGpuixHost({});
    let callbackRan = false;
    const runtime = host.mount({
      init(options) {
        const text = options.node.ownerDocument.createTextNode("before");
        options.node.appendChild(text);
        globalThis.requestAnimationFrame(() => {
          callbackRan = true;
          text.replaceData(0, text.length, "after");
        });
        return { name: "animation" };
      },
    });
    const renderer = getOnlyRenderer();

    renderer.operations.length = 0;
    vi.advanceTimersByTime(17);

    expect(callbackRan).toBe(true);
    expect(renderer.operations).toContainEqual([
      "setText",
      expect.any(Number),
      "after",
    ]);

    globalThis.requestAnimationFrame(() => {
      callbackRan = false;
    });
    runtime.stop();
    vi.advanceTimersByTime(17);

    expect(callbackRan).toBe(true);
  });

  it("drives and cancels native ticks", () => {
    vi.useFakeTimers();
    nativeMock.MockGpuixRenderer.needsTick = true;
    const host = createGpuixHost({});
    const runtime = host.mount({ init: () => ({ name: "ticks" }) });
    const renderer = getOnlyRenderer();

    expect(renderer.tickCount).toBe(1);
    vi.advanceTimersByTime(8);
    expect(renderer.tickCount).toBe(2);

    runtime.stop();
    vi.advanceTimersByTime(80);
    expect(renderer.tickCount).toBe(2);
  });

  it("cleans up globals and ownership when renderer initialization fails", () => {
    nativeMock.MockGpuixRenderer.failInitialization = true;

    expect(() => createGpuixHost({})).toThrow("renderer initialization failed");
    expectGlobalsToMatch(originalGlobals);

    nativeMock.MockGpuixRenderer.failInitialization = false;
    const host = createGpuixHost({});
    host.stop();
  });

  it("cleans up globals and ownership when program initialization fails", () => {
    const host = createGpuixHost({});

    expect(() => host.mount({ init: () => { throw new Error("program initialization failed"); } }))
      .toThrow("program initialization failed");
    expectGlobalsToMatch(originalGlobals);

    const nextHost = createGpuixHost({});
    nextHost.stop();
  });

  it("rejects a second process-global host without replacing the first host globals", () => {
    const sentinelDocument = { name: "original document" };
    const sentinelWindow = { document: sentinelDocument };
    defineGlobal("document", sentinelDocument);
    defineGlobal("window", sentinelWindow);
    const expectedGlobals = captureGlobals();
    const firstHost = createGpuixHost({});
    const firstDocument = Reflect.get(globalThis, "document");

    expect(() => createGpuixHost({})).toThrow(
      "Only one GPUix host can be active in a process.",
    );
    expect(Reflect.get(globalThis, "document")).toBe(firstDocument);
    expect(nativeMock.MockGpuixRenderer.instances).toHaveLength(1);

    firstHost.stop();
    expectGlobalsToMatch(expectedGlobals);

    const nextHost = createGpuixHost({});
    nextHost.stop();
    expectGlobalsToMatch(expectedGlobals);
  });

  it("stops an unmounted host and rejects later mounting", () => {
    const host = createGpuixHost({});

    host.stop();

    expectGlobalsToMatch(originalGlobals);
    expect(() => host.mount({ init: () => ({ name: "late" }) })).toThrow(
      "This GPUix host has been stopped.",
    );
  });

  it("ignores native callbacks after stop", () => {
    const host = createGpuixHost({});
    const listener = vi.fn();
    let element: SyntheticElement;
    const runtime = host.mount({
      init(options) {
        element = options.node.ownerDocument.createElement("button");
        element.addEventListener("click", listener);
        options.node.appendChild(element);
        return { name: "stopped-events" };
      },
    });
    const renderer = getOnlyRenderer();
    const listenerOperation = renderer.operations.find(
      (operation) => operation[0] === "setEventListener" && operation[3] === true,
    );
    const elementId = listenerOperation?.[1];
    if (typeof elementId !== "number") {
      throw new Error("The mounted click listener did not reach GPUix");
    }

    runtime.stop();
    renderer.operations.length = 0;
    renderer.emit({ elementId, eventType: "click" });

    expect(listener).not.toHaveBeenCalled();
    expect(renderer.operations).toEqual([]);
  });
});

function getOnlyRenderer(): InstanceType<
  typeof nativeMock.MockGpuixRenderer
> {
  const [renderer] = nativeMock.MockGpuixRenderer.instances;

  if (renderer === undefined) {
    throw new Error("createGpuixHost did not create a native renderer");
  }

  expect(nativeMock.MockGpuixRenderer.instances).toHaveLength(1);
  return renderer;
}

function captureGlobals(): GlobalSnapshot {
  return new Map(
    globalNames.map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );
}

function restoreGlobals(snapshot: GlobalSnapshot): void {
  for (const name of globalNames) {
    const descriptor = snapshot.get(name);
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, name);
    } else {
      Object.defineProperty(globalThis, name, descriptor);
    }
  }
}

function expectGlobalsToMatch(snapshot: GlobalSnapshot): void {
  for (const name of globalNames) {
    expect(Object.getOwnPropertyDescriptor(globalThis, name)).toEqual(
      snapshot.get(name),
    );
  }
}

function defineGlobal(name: HostGlobalName, value: object): void {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    enumerable: false,
    value,
    writable: true,
  });
}
