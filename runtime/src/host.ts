import {
  GpuixRenderer,
  type EventPayload,
  type WindowOptions,
} from "@gpuix/native";

import { GpuixDocument, type GpuixElement } from "./dom.js";

export type JsonValue =
  | boolean
  | null
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface ElmProgram<TApp> {
  init(options: { readonly node: GpuixElement; readonly flags?: JsonValue }): TApp;
}

export interface GpuixHostOptions {
  readonly window?: WindowOptions;
}

export interface GpuixMountOptions {
  readonly flags?: JsonValue;
}

export interface GpuixRuntime<TApp> {
  readonly app: TApp;
  readonly renderer: GpuixRenderer;
  stop(): void;
}

export interface GpuixHost {
  mount<TApp>(program: ElmProgram<TApp>, options?: GpuixMountOptions): GpuixRuntime<TApp>;
  stop(): void;
}

type GlobalName =
  | "cancelAnimationFrame"
  | "document"
  | "requestAnimationFrame"
  | "window";

type GlobalSnapshot = ReadonlyMap<GlobalName, PropertyDescriptor | undefined>;
type FrameHandle = ReturnType<typeof setTimeout>;

interface SyntheticWindow {
  readonly document: GpuixDocument;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: unknown): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null, options?: unknown): void;
}

const globalNames: readonly GlobalName[] = [
  "document",
  "window",
  "requestAnimationFrame",
  "cancelAnimationFrame",
];
const frameIntervalMs = 8;
let activeHostOwnership: object | undefined;

export function createGpuixHost(options: GpuixHostOptions = {}): GpuixHost {
  if (activeHostOwnership !== undefined) {
    throw new Error("Only one GPUix host can be active in a process.");
  }

  const ownership = {};
  activeHostOwnership = ownership;
  const globals = captureGlobals();
  let renderer: GpuixRenderer | undefined;
  let document: GpuixDocument | undefined;
  let stopped = false;
  let mounted = false;
  const animationFrames = new Set<FrameHandle>();
  let tickFrame: FrameHandle | undefined;

  const stop = (): void => {
    if (stopped) {
      return;
    }
    stopped = true;
    for (const frame of animationFrames) {
      clearTimeout(frame);
    }
    animationFrames.clear();
    if (tickFrame !== undefined) {
      clearTimeout(tickFrame);
      tickFrame = undefined;
    }
    restoreGlobals(globals);
    if (activeHostOwnership === ownership) {
      activeHostOwnership = undefined;
    }
  };

  const requestAnimationFrame = (callback: FrameRequestCallback): FrameHandle => {
    const frame = setTimeout(() => {
      animationFrames.delete(frame);
      if (stopped || document === undefined) {
        return;
      }
      try {
        callback(Date.now());
      } finally {
        document.flush();
      }
    }, 1000 / 60);
    animationFrames.add(frame);
    return frame;
  };

  const cancelAnimationFrame = (frame: FrameHandle): void => {
    animationFrames.delete(frame);
    clearTimeout(frame);
  };

  const startTickLoop = (): void => {
    if (renderer === undefined || !renderer.requiresTick()) {
      return;
    }
    const tick = (): void => {
      if (stopped || renderer === undefined) {
        return;
      }
      const startedAt = performance.now();
      if (!renderer.tick()) {
        return;
      }
      tickFrame = setTimeout(
        tick,
        Math.max(0, frameIntervalMs - (performance.now() - startedAt)),
      );
    };
    tick();
  };

  try {
    renderer = new GpuixRenderer((error: Error | null, event: EventPayload) => {
      if (stopped) {
        return;
      }
      if (error !== null) {
        console.error("[elm-gpuix] Native event error:", error);
        return;
      }
      document?.dispatchNativeEvent(event);
      document?.flush();
    });
    renderer.init(options.window);
    document = new GpuixDocument(renderer);
    const syntheticWindow: SyntheticWindow = {
      document,
      addEventListener() {},
      removeEventListener() {},
    };
    installGlobals(document, syntheticWindow, requestAnimationFrame, cancelAnimationFrame);
  } catch (error) {
    stop();
    throw error;
  }

  return {
    mount<TApp>(program: ElmProgram<TApp>, mountOptions: GpuixMountOptions = {}): GpuixRuntime<TApp> {
      if (stopped) {
        throw new Error("This GPUix host has been stopped.");
      }
      if (mounted) {
        throw new Error("A GPUix host supports only one mounted Elm program.");
      }
      if (document === undefined || renderer === undefined) {
        throw new Error("The GPUix host did not initialize.");
      }

      mounted = true;
      try {
        const app =
          mountOptions.flags === undefined
            ? program.init({ node: document.mountNode })
            : program.init({ node: document.mountNode, flags: mountOptions.flags });
        document.flush();
        startTickLoop();
        return { app, renderer, stop };
      } catch (error) {
        stop();
        throw error;
      }
    },
    stop,
  };
}

function captureGlobals(): GlobalSnapshot {
  return new Map(
    globalNames.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
  );
}

function installGlobals(
  document: GpuixDocument,
  window: SyntheticWindow,
  requestAnimationFrame: (callback: FrameRequestCallback) => FrameHandle,
  cancelAnimationFrame: (frame: FrameHandle) => void,
): void {
  Object.defineProperties(globalThis, {
    document: writableGlobal(document),
    window: writableGlobal(window),
    requestAnimationFrame: writableGlobal(requestAnimationFrame),
    cancelAnimationFrame: writableGlobal(cancelAnimationFrame),
  });
}

function writableGlobal(value: unknown): PropertyDescriptor {
  return { configurable: true, enumerable: false, value, writable: true };
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
