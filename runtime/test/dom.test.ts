import type { EventPayload } from "@gpuix/native";
import { describe, expect, it } from "vitest";

import { GpuixDocument } from "../src/dom";

type NativeMutation = readonly [operation: string, ...args: readonly unknown[]];

class BatchRenderer {
  readonly batches: NativeMutation[][] = [];

  applyBatch(json: string): number[] {
    this.batches.push(JSON.parse(json));
    return [];
  }

  clear(): void {
    this.batches.length = 0;
  }
}

describe("GpuixDocument", () => {
  it("flushes initial structure, text, styles, and test IDs as one native batch", () => {
    const renderer = new BatchRenderer();
    const document = new GpuixDocument(renderer);
    const root = document.mountNode;

    root.setAttribute("data-gpuix-test-id", "counter");
    root.style.display = "flex";
    root.style.gap = "12px";
    root.style.width = "100%";
    root.style.backgroundColor = "#112233";
    root.appendChild(document.createTextNode("Count: 0"));

    document.flush();

    expect(renderer.batches).toEqual([
      [
        ["createElement", 1, "div"],
        ["setRoot", 1],
        ["setCustomPropValue", 1, "testId", "counter"],
        ["createElement", 2, "text"],
        ["setText", 2, "Count: 0"],
        ["appendChild", 1, 2],
        [
          "setStyle",
          1,
          {
            backgroundColor: "#112233",
            display: "flex",
            gap: 12,
            width: "100%",
          },
        ],
      ],
    ]);
  });

  it("flushes later text, attribute, and complete style updates", () => {
    const renderer = new BatchRenderer();
    const document = new GpuixDocument(renderer);
    const root = document.mountNode;
    const text = document.createTextNode("Count: 0");

    root.setAttribute("data-gpuix-test-id", "counter");
    root.style.display = "flex";
    root.style.gap = "12px";
    root.appendChild(text);
    document.flush();
    renderer.clear();

    text.replaceData(0, text.length, "Count: 1");
    root.setAttribute("data-gpuix-test-id", "incremented-counter");
    root.style.display = "";
    root.style.gap = "18px";
    document.flush();

    expect(renderer.batches).toEqual([
      [
        ["setText", 2, "Count: 1"],
        ["setCustomPropValue", 1, "testId", "incremented-counter"],
        ["setStyle", 1, { gap: 18 }],
      ],
    ]);
  });

  it("preserves a keyed node removed and reinserted before the same flush", () => {
    const renderer = new BatchRenderer();
    const document = new GpuixDocument(renderer);
    const root = document.mountNode;
    const first = document.createElement("div");
    const second = document.createElement("div");

    root.appendChild(first);
    root.appendChild(second);
    document.flush();
    renderer.clear();

    root.removeChild(first);
    root.insertBefore(first, second);
    document.flush();

    expect(renderer.batches).toEqual([
      [
        ["removeChild", 1, 2],
        ["insertBefore", 1, 2, 3],
      ],
    ]);
  });

  it("appends when Elm passes an out-of-range childNodes entry to insertBefore", () => {
    const renderer = new BatchRenderer();
    const document = new GpuixDocument(renderer);
    const root = document.mountNode;
    const child = document.createElement("div");

    root.insertBefore(child, root.childNodes[0]);
    document.flush();

    expect(root.lastChild).toBe(child);
    expect(renderer.batches[0]).toContainEqual(["appendChild", 1, 2]);
  });

  it("destroys a detached subtree only when the flush boundary is reached", () => {
    const renderer = new BatchRenderer();
    const document = new GpuixDocument(renderer);
    const root = document.mountNode;
    const branch = document.createElement("section");

    branch.appendChild(document.createTextNode("remove me"));
    root.appendChild(branch);
    document.flush();
    renderer.clear();

    root.removeChild(branch);
    expect(renderer.batches).toEqual([]);

    document.flush();

    expect(renderer.batches).toEqual([
      [
        ["removeChild", 1, 2],
        ["destroyElement", 2],
      ],
    ]);
  });

  it("translates native click payloads into DOM click events", () => {
    const renderer = new BatchRenderer();
    const document = new GpuixDocument(renderer);
    const button = document.createElement("button");
    const received: Array<{
      button: number;
      clientX: number;
      clientY: number;
      currentTargetIsButton: boolean;
      defaultPrevented: boolean;
      metaKey: boolean;
      shiftKey: boolean;
      targetIsButton: boolean;
      type: string;
    }> = [];

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      received.push({
        button: event.button,
        clientX: event.clientX,
        clientY: event.clientY,
        currentTargetIsButton: event.currentTarget === button,
        defaultPrevented: event.defaultPrevented,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        targetIsButton: event.target === button,
        type: event.type,
      });
    });
    document.mountNode.appendChild(button);
    document.flush();

    expect(renderer.batches[0]).toContainEqual([
      "setEventListener",
      2,
      "click",
      true,
    ]);

    document.dispatchNativeEvent({
      button: 0,
      elementId: 2,
      eventType: "click",
      modifiers: { alt: false, cmd: true, ctrl: false, shift: true },
      x: 32,
      y: 48,
    } satisfies EventPayload);

    expect(received).toEqual([
      {
        button: 0,
        clientX: 32,
        clientY: 48,
        currentTargetIsButton: true,
        defaultPrevented: true,
        metaKey: true,
        shiftKey: true,
        targetIsButton: true,
        type: "click",
      },
    ]);
  });

  it("invokes child and parent native click payloads only on their own elements", () => {
    const document = new GpuixDocument(new BatchRenderer());
    const parent = document.createElement("div");
    const child = document.createElement("button");
    const received: string[] = [];

    parent.addEventListener("click", () => {
      received.push("parent");
    });
    child.addEventListener("click", () => {
      received.push("child");
    });
    parent.appendChild(child);
    document.mountNode.appendChild(parent);
    document.flush();

    document.dispatchNativeEvent({
      elementId: child.nativeId,
      eventType: "click",
    } satisfies EventPayload);
    document.dispatchNativeEvent({
      elementId: parent.nativeId,
      eventType: "click",
    } satisfies EventPayload);

    expect(received).toEqual(["child", "parent"]);
  });

  it("does not invoke a parent focus listener for a child focus payload", () => {
    const document = new GpuixDocument(new BatchRenderer());
    const parent = document.createElement("div");
    const child = document.createElement("input");
    const received: string[] = [];

    parent.addEventListener("focus", () => {
      received.push("parent");
    });
    child.addEventListener("focus", () => {
      received.push("child");
    });
    parent.appendChild(child);
    document.mountNode.appendChild(parent);
    document.flush();

    document.dispatchNativeEvent({
      elementId: child.nativeId,
      eventType: "focus",
    } satisfies EventPayload);

    expect(received).toEqual(["child"]);
  });

  it("bridges native change payloads to DOM input listeners after updating value", () => {
    const renderer = new BatchRenderer();
    const document = new GpuixDocument(renderer);
    const input = document.createElement("input");
    const received: Array<{
      currentTargetIsInput: boolean;
      targetIsInput: boolean;
      type: string;
      value: string;
    }> = [];

    input.value = "";
    input.addEventListener("input", (event) => {
      received.push({
        currentTargetIsInput: event.currentTarget === input,
        targetIsInput: event.target === input,
        type: event.type,
        value: input.value,
      });
    });
    document.mountNode.appendChild(input);
    document.flush();

    expect(renderer.batches[0]).toContainEqual([
      "setEventListener",
      2,
      "change",
      true,
    ]);

    document.dispatchNativeEvent({
      elementId: 2,
      eventType: "change",
      value: "Ada",
    } satisfies EventPayload);

    expect(received).toEqual([
      {
        currentTargetIsInput: true,
        targetIsInput: true,
        type: "input",
        value: "Ada",
      },
    ]);
    expect(renderer.batches).toHaveLength(1);
  });

  it("synthetically bubbles a control change to an ancestor exactly once", () => {
    const document = new GpuixDocument(new BatchRenderer());
    const parent = document.createElement("div");
    const input = document.createElement("input");
    const received: string[] = [];

    parent.addEventListener("change", () => {
      received.push("parent");
    });
    input.addEventListener("change", () => {
      received.push("input");
    });
    parent.appendChild(input);
    document.mountNode.appendChild(parent);
    document.flush();

    document.dispatchNativeEvent({
      elementId: input.nativeId,
      eventType: "change",
      value: "Ada",
    } satisfies EventPayload);

    expect(received).toEqual(["input", "parent"]);
  });

  it("honors stopPropagation during a synthetic control change bubble", () => {
    const document = new GpuixDocument(new BatchRenderer());
    const parent = document.createElement("div");
    const input = document.createElement("input");
    const received: string[] = [];

    parent.addEventListener("change", () => {
      received.push("parent");
    });
    input.addEventListener("change", (event) => {
      received.push("input");
      event.stopPropagation();
    });
    parent.appendChild(input);
    document.mountNode.appendChild(parent);
    document.flush();

    document.dispatchNativeEvent({
      elementId: input.nativeId,
      eventType: "change",
      value: "Ada",
    } satisfies EventPayload);

    expect(received).toEqual(["input"]);
  });

  it("bridges lowercase autofocus to the native autoFocus property", () => {
    const renderer = new BatchRenderer();
    const document = new GpuixDocument(renderer);
    const input = document.createElement("input");

    Reflect.set(input, "autofocus", true);
    document.mountNode.appendChild(input);
    document.flush();

    expect(renderer.batches).toEqual([
      [
        ["createElement", 1, "div"],
        ["setRoot", 1],
        ["createElement", 2, "input"],
        ["setCustomPropValue", 2, "autoFocus", true],
        ["appendChild", 1, 2],
      ],
    ]);
  });

  it("keeps the native ID internal when DOM id properties change", () => {
    const renderer = new BatchRenderer();
    const document = new GpuixDocument(renderer);
    const input = document.createElement("input");

    Reflect.set(input, "id", "email");
    input.setAttribute("id", "primary-email");
    input.value = "ada@example.com";
    document.mountNode.appendChild(input);
    document.flush();

    expect(Reflect.get(input, "id")).toBe("primary-email");
    expect(renderer.batches).toEqual([
      [
        ["createElement", 1, "div"],
        ["setRoot", 1],
        ["createElement", 2, "input"],
        ["setCustomPropValue", 2, "id", "email"],
        ["setCustomPropValue", 2, "id", "primary-email"],
        ["setCustomPropValue", 2, "value", "ada@example.com"],
        ["appendChild", 1, 2],
      ],
    ]);
  });

  it("emits only exact StyleDesc fields and parses only numeric fields", () => {
    const renderer = new BatchRenderer();
    const document = new GpuixDocument(renderer);
    const root = document.mountNode;

    root.style.borderTopWidth = "9px";
    root.style.flexGrow = "2";
    root.style.gap = "12";
    root.style.opacity = "0.5";
    root.style.fontWeight = "700";
    root.style.width = "42";
    document.flush();

    expect(renderer.batches[0]).toContainEqual([
      "setStyle",
      1,
      {
        flexGrow: 2,
        fontWeight: "700",
        gap: 12,
        opacity: 0.5,
        width: "42",
      },
    ]);
  });

  it("retains unsupported event listeners without registering them natively", () => {
    const renderer = new BatchRenderer();
    const document = new GpuixDocument(renderer);
    const input = document.createElement("input");
    const ignored = () => {};
    const onInput = () => {};
    const onChange = () => {};
    let unsupportedEvents = 0;

    input.addEventListener("unsupported", () => {
      unsupportedEvents += 1;
    });
    document.mountNode.appendChild(input);
    document.flush();
    renderer.clear();

    input.addEventListener("input", onInput);
    input.addEventListener("change", onChange);
    input.addEventListener("not-native", ignored);
    document.flush();

    expect(renderer.batches).toEqual([[["setEventListener", 2, "change", true]]]);
    document.dispatchNativeEvent({
      elementId: 2,
      eventType: "unsupported",
    } satisfies EventPayload);
    expect(unsupportedEvents).toBe(1);

    renderer.clear();
    input.removeEventListener("input", onInput);
    document.flush();
    expect(renderer.batches).toEqual([]);

    input.removeEventListener("change", onChange);
    document.flush();
    expect(renderer.batches).toEqual([[["setEventListener", 2, "change", false]]]);
  });

  it("keeps attributes live and leaves replaceChild with itself unchanged", () => {
    const document = new GpuixDocument(new BatchRenderer());
    const root = document.mountNode;
    const child = document.createElement("div");

    root.setAttribute("role", "button");
    root.setAttribute("aria-label", "Go");
    expect(root.attributes.length).toBe(2);
    expect(root.attributes[0]).toEqual({ name: "role", value: "button" });
    expect(root.attributes[1]).toEqual({ name: "aria-label", value: "Go" });

    root.setAttribute("role", "link");
    root.removeAttribute("aria-label");
    expect(root.attributes.length).toBe(1);
    expect(root.attributes[0]).toEqual({ name: "role", value: "link" });

    root.appendChild(child);
    root.replaceChild(child, child);
    expect(root.childNodes).toEqual([child]);
  });
});
