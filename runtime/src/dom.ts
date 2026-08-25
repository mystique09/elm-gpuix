import type { EventPayload } from "@gpuix/native";

type NativeValue = boolean | null | number | string | NativeStyle;
type NativeMutation = readonly [operation: string, ...args: readonly NativeValue[]];
type NativeStyle = { readonly [property: string]: number | string };

export interface NativeBatchRenderer {
  applyBatch(json: string): number[];
}

export type GpuixEventListener = (event: GpuixEvent) => void;

const nativeElementTypes = new Set([
  "anchored",
  "canvas",
  "code",
  "diff",
  "img",
  "input",
  "markdown",
  "svg",
  "textarea",
  "virtual-list",
]);

const supportedStyleProperties = new Set([
  "display",
  "visibility",
  "flexDirection",
  "flexWrap",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignItems",
  "alignSelf",
  "alignContent",
  "justifyContent",
  "gap",
  "rowGap",
  "columnGap",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gridColumnMin",
  "gridRowMin",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "background",
  "backgroundColor",
  "color",
  "opacity",
  "borderWidth",
  "borderColor",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "textAlign",
  "lineHeight",
  "whiteSpace",
  "textOverflow",
  "lineClamp",
  "overflow",
  "overflowX",
  "overflowY",
  "cursor",
  "pointerEvents",
  "userSelect",
  "selectionColor",
]);

const numericStyleProperties = new Set([
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "gap",
  "rowGap",
  "columnGap",
  "gridTemplateColumns",
  "gridTemplateRows",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "top",
  "right",
  "bottom",
  "left",
  "opacity",
  "borderWidth",
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "fontSize",
  "lineHeight",
  "lineClamp",
]);

const nativeEventNames: Readonly<Record<string, string>> = {
  blur: "blur",
  change: "change",
  click: "click",
  contextmenu: "contextMenu",
  focus: "focus",
  input: "change",
  keydown: "keyDown",
  keyup: "keyUp",
  mousedown: "mouseDown",
  mouseenter: "mouseEnter",
  mouseleave: "mouseLeave",
  mousemove: "mouseMove",
  mouseup: "mouseUp",
  scroll: "scroll",
  submit: "submit",
};

const domEventNames: Readonly<Record<string, readonly string[]>> = {
  blur: ["blur"],
  change: ["input", "change"],
  click: ["click"],
  contextMenu: ["contextmenu"],
  focus: ["focus"],
  keyDown: ["keydown"],
  keyUp: ["keyup"],
  mouseDown: ["mousedown"],
  mouseEnter: ["mouseenter"],
  mouseLeave: ["mouseleave"],
  mouseMove: ["mousemove"],
  mouseUp: ["mouseup"],
  scroll: ["scroll"],
  submit: ["submit"],
};

const syntheticBubbleNativeEventNames = new Set(["change", "submit"]);

export abstract class GpuixNode {
  readonly childNodes: GpuixNode[] = [];
  parentNode: GpuixNode | null = null;

  protected constructor(
    readonly ownerDocument: GpuixDocument,
    readonly nodeType: number,
  ) {}

  get firstChild(): GpuixNode | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): GpuixNode | null {
    return this.childNodes.at(-1) ?? null;
  }

  get previousSibling(): GpuixNode | null {
    if (this.parentNode === null) {
      return null;
    }

    const index = this.parentNode.childNodes.indexOf(this);
    return index > 0 ? (this.parentNode.childNodes[index - 1] ?? null) : null;
  }

  get nextSibling(): GpuixNode | null {
    if (this.parentNode === null) {
      return null;
    }

    const index = this.parentNode.childNodes.indexOf(this);
    return this.parentNode.childNodes[index + 1] ?? null;
  }

  get textContent(): string {
    return this.childNodes.map((child) => child.textContent).join("");
  }

  set textContent(value: string) {
    for (const child of [...this.childNodes]) {
      this.removeChild(child);
    }
    if (value !== "") {
      this.appendChild(this.ownerDocument.createTextNode(value));
    }
  }

  appendChild<T extends GpuixNode>(child: T): T {
    return this.insertBefore(child, null);
  }

  insertBefore<T extends GpuixNode>(
    child: T,
    before: GpuixNode | null | undefined,
  ): T {
    const reference = before ?? null;
    if (child.ownerDocument !== this.ownerDocument) {
      throw new Error("Cannot move nodes between GpuixDocument instances.");
    }
    if (reference !== null && reference.parentNode !== this) {
      throw new Error("The reference node is not a child of this node.");
    }
    if (Object.is(child, this) || this.isDescendantOf(child)) {
      throw new Error("Cannot insert an ancestor into one of its descendants.");
    }

    if (child.nodeType === 11) {
      for (const fragmentChild of [...child.childNodes]) {
        this.insertBefore(fragmentChild, reference);
      }
      return child;
    }

    if (
      child.parentNode === this &&
      (reference === child || reference === child.nextSibling)
    ) {
      return child;
    }

    if (child.parentNode !== null) {
      child.parentNode.detachChild(child);
    }

    const index =
      reference === null
        ? this.childNodes.length
        : this.childNodes.indexOf(reference);
    this.childNodes.splice(index, 0, child);
    child.parentNode = this;
    this.ownerDocument.connect(this, child, reference);
    return child;
  }

  removeChild<T extends GpuixNode>(child: T): T {
    if (child.parentNode !== this) {
      throw new Error("The node to remove is not a child of this node.");
    }
    this.detachChild(child);
    return child;
  }

  replaceChild<T extends GpuixNode>(newChild: GpuixNode, oldChild: T): T {
    if (oldChild.parentNode !== this) {
      throw new Error("The node to replace is not a child of this node.");
    }
    if (newChild === oldChild) {
      return oldChild;
    }
    this.insertBefore(newChild, oldChild);
    this.removeChild(oldChild);
    return oldChild;
  }

  private detachChild(child: GpuixNode): void {
    const index = this.childNodes.indexOf(child);
    this.childNodes.splice(index, 1);
    child.parentNode = null;
    this.ownerDocument.disconnect(this, child);
  }

  private isDescendantOf(candidateAncestor: GpuixNode): boolean {
    for (let node: GpuixNode | null = this; node !== null; node = node.parentNode) {
      if (node === candidateAncestor) {
        return true;
      }
    }
    return false;
  }
}

export class GpuixText extends GpuixNode {
  readonly nativeId: number;
  private data: string;

  constructor(document: GpuixDocument, text: string) {
    super(document, 3);
    this.nativeId = document.allocateId();
    this.data = text;
    document.registerNativeNode(this);
    document.enqueue(["createElement", this.nativeId, "text"]);
    document.enqueue(["setText", this.nativeId, text]);
  }

  get length(): number {
    return this.data.length;
  }

  get textContent(): string {
    return this.data;
  }

  set textContent(value: string) {
    this.replaceData(0, this.length, value);
  }

  replaceData(offset: number, count: number, text: string): void {
    const start = Math.max(0, Math.min(offset, this.data.length));
    const end = Math.max(start, Math.min(start + count, this.data.length));
    this.data = `${this.data.slice(0, start)}${text}${this.data.slice(end)}`;
    this.ownerDocument.enqueue(["setText", this.nativeId, this.data]);
  }
}

export class GpuixDocumentFragment extends GpuixNode {
  constructor(document: GpuixDocument) {
    super(document, 11);
  }
}

class GpuixRootContainer extends GpuixNode {
  constructor(document: GpuixDocument) {
    super(document, 9);
  }
}

export interface GpuixAttribute {
  readonly name: string;
  value: string;
}

export class GpuixNamedNodeMap {
  [index: number]: GpuixAttribute | undefined;
  private readonly entries: GpuixAttribute[] = [];
  private readonly byName = new Map<string, GpuixAttribute>();

  get length(): number {
    return this.entries.length;
  }

  get(name: string): string | null {
    return this.byName.get(name.toLowerCase())?.value ?? null;
  }

  has(name: string): boolean {
    return this.byName.has(name.toLowerCase());
  }

  set(name: string, value: string): void {
    const normalizedName = name.toLowerCase();
    const existing = this.byName.get(normalizedName);
    if (existing !== undefined) {
      existing.value = value;
      return;
    }
    const attribute = { name: normalizedName, value };
    this.byName.set(normalizedName, attribute);
    this.entries.push(attribute);
    this[this.entries.length - 1] = attribute;
  }

  delete(name: string): boolean {
    const normalizedName = name.toLowerCase();
    const attribute = this.byName.get(normalizedName);
    if (attribute === undefined) {
      return false;
    }
    this.byName.delete(normalizedName);
    const index = this.entries.indexOf(attribute);
    this.entries.splice(index, 1);
    this.reindex();
    return true;
  }

  private reindex(): void {
    for (let index = this.entries.length; this[index] !== undefined; index += 1) {
      delete this[index];
    }
    for (const [index, attribute] of this.entries.entries()) {
      this[index] = attribute;
    }
  }
}

export class GpuixElement extends GpuixNode {
  readonly nativeId: number;
  readonly attributes = new GpuixNamedNodeMap();
  readonly style: GpuixStyleDeclaration;
  readonly styleTarget: GpuixStyleDeclarationTarget;
  readonly tagName: string;
  readonly nodeName: string;
  readonly localName: string;
  private readonly listeners = new Map<string, Set<GpuixEventListener>>();
  private _alt = "";
  private _autoFocus = false;
  private _id = "";
  private _placeholder = "";
  private _readOnly = false;
  private _src = "";
  private _tabIndex = -1;
  private _value = "";

  constructor(document: GpuixDocument, tagName: string) {
    super(document, 1);
    this.nativeId = document.allocateId();
    this.localName = tagName.toLowerCase();
    this.tagName = this.localName.toUpperCase();
    this.nodeName = this.tagName;
    this.styleTarget = new GpuixStyleDeclarationTarget(document, this);
    this.style = createStyleDeclaration(this.styleTarget);
    document.registerNativeNode(this);
    document.enqueue(["createElement", this.nativeId, nativeElementType(this.localName)]);
  }

  get parentElement(): GpuixElement | null {
    return this.parentNode instanceof GpuixElement ? this.parentNode : null;
  }

  get value(): string {
    return this._value;
  }

  get id(): string {
    return this._id;
  }

  set id(value: string) {
    this._id = value;
    this.attributes.set("id", value);
    this.setNativeProperty("id", value);
  }

  set value(value: string) {
    this._value = value;
    this.setNativeProperty("value", value);
  }

  get placeholder(): string {
    return this._placeholder;
  }

  set placeholder(value: string) {
    this._placeholder = value;
    this.setNativeProperty("placeholder", value);
  }

  get readOnly(): boolean {
    return this._readOnly;
  }

  set readOnly(value: boolean) {
    this._readOnly = value;
    this.setNativeProperty("readOnly", value);
  }

  get autoFocus(): boolean {
    return this._autoFocus;
  }

  set autoFocus(value: boolean) {
    this._autoFocus = value;
    this.setNativeProperty("autoFocus", value);
  }

  get autofocus(): boolean {
    return this._autoFocus;
  }

  set autofocus(value: boolean) {
    this.autoFocus = value;
  }

  get tabIndex(): number {
    return this._tabIndex;
  }

  set tabIndex(value: number) {
    this._tabIndex = value;
    this.setNativeProperty("tabIndex", value);
  }

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    this.setNativeProperty("src", value);
  }

  get alt(): string {
    return this._alt;
  }

  set alt(value: string) {
    this._alt = value;
    this.setNativeProperty("alt", value);
  }

  setAttribute(name: string, value: string): void {
    const normalizedName = name.toLowerCase();
    this.attributes.set(normalizedName, value);
    this.applyAttribute(normalizedName, value);
  }

  setAttributeNS(_namespace: string, name: string, value: string): void {
    this.setAttribute(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase());
  }

  removeAttribute(name: string): void {
    const normalizedName = name.toLowerCase();
    if (!this.attributes.delete(normalizedName)) {
      return;
    }
    this.removeAppliedAttribute(normalizedName);
  }

  removeAttributeNS(_namespace: string, name: string): void {
    this.removeAttribute(name);
  }

  addEventListener(eventType: string, listener: GpuixEventListener): void {
    const domEventName = eventType.toLowerCase();
    const listeners = this.listeners.get(domEventName) ?? new Set<GpuixEventListener>();
    const wasEmpty = listeners.size === 0;
    const nativeEventName = nativeEventNameFor(domEventName);
    const hadNativeListener =
      nativeEventName !== undefined && this.hasListenerMappedTo(nativeEventName);
    listeners.add(listener);
    this.listeners.set(domEventName, listeners);
    if (wasEmpty && nativeEventName !== undefined && !hadNativeListener) {
      this.ownerDocument.setNativeEventListener(this, nativeEventName, true);
    }
  }

  removeEventListener(eventType: string, listener: GpuixEventListener): void {
    const domEventName = eventType.toLowerCase();
    const listeners = this.listeners.get(domEventName);
    if (listeners === undefined || !listeners.delete(listener)) {
      return;
    }
    if (listeners.size === 0) {
      this.listeners.delete(domEventName);
      const nativeEventName = nativeEventNameFor(domEventName);
      if (
        nativeEventName !== undefined &&
        !this.hasListenerMappedTo(nativeEventName)
      ) {
        this.ownerDocument.setNativeEventListener(this, nativeEventName, false);
      }
    }
  }

  listenersFor(eventType: string): readonly GpuixEventListener[] {
    return [...(this.listeners.get(eventType) ?? [])];
  }

  hasListenerMappedTo(nativeEventName: string): boolean {
    return [...this.listeners.keys()].some(
      (domEventName) => nativeEventNameFor(domEventName) === nativeEventName,
    );
  }

  receiveNativeValue(value: string): void {
    this._value = value;
  }

  private applyAttribute(name: string, value: string): void {
    switch (name) {
      case "data-gpuix-test-id":
        this.setNativeProperty("testId", value);
        break;
      case "id":
        this.id = value;
        break;
      case "value":
        this.value = value;
        break;
      case "placeholder":
        this.placeholder = value;
        break;
      case "readonly":
        this.readOnly = true;
        break;
      case "autofocus":
        this.autoFocus = true;
        break;
      case "tabindex": {
        const parsed = Number.parseInt(value, 10);
        this.tabIndex = Number.isNaN(parsed) ? -1 : parsed;
        break;
      }
      case "src":
        this.src = value;
        break;
      case "alt":
        this.alt = value;
        break;
    }
  }

  private removeAppliedAttribute(name: string): void {
    switch (name) {
      case "data-gpuix-test-id":
        this.setNativeProperty("testId", null);
        break;
      case "id":
        this._id = "";
        this.setNativeProperty("id", null);
        break;
      case "value":
        this.value = "";
        break;
      case "placeholder":
        this.placeholder = "";
        break;
      case "readonly":
        this.readOnly = false;
        break;
      case "autofocus":
        this.autoFocus = false;
        break;
      case "tabindex":
        this.tabIndex = -1;
        break;
      case "src":
        this.src = "";
        break;
      case "alt":
        this.alt = "";
        break;
    }
  }

  private setNativeProperty(name: string, value: boolean | null | number | string): void {
    this.ownerDocument.enqueue(["setCustomPropValue", this.nativeId, name, value]);
  }
}

export type GpuixStyleDeclaration = {
  [property: string]: string | ((property: string, value: string) => void) | undefined;
  removeProperty(property: string): string;
  setProperty(property: string, value: string): void;
};

class GpuixStyleDeclarationTarget {
  private readonly values = new Map<string, string>();

  constructor(
    private readonly document: GpuixDocument,
    private readonly element: GpuixElement,
  ) {}

  get(property: string): string {
    return this.values.get(property) ?? "";
  }

  set(property: string, value: string): void {
    if (value === "") {
      this.values.delete(property);
    } else {
      this.values.set(property, value);
    }
    this.document.markStyleDirty(this.element);
  }

  setProperty(property: string, value: string): void {
    this.set(property, value);
  }

  removeProperty(property: string): string {
    const previous = this.get(property);
    this.set(property, "");
    return previous;
  }

  toNativeStyle(): NativeStyle {
    const style: { [property: string]: number | string } = {};
    for (const [property, value] of this.values) {
      const nativeProperty = camelCase(property);
      if (supportedStyleProperties.has(nativeProperty)) {
        style[nativeProperty] = styleValue(nativeProperty, value);
      }
    }
    return style;
  }
}

function createStyleDeclaration(target: GpuixStyleDeclarationTarget): GpuixStyleDeclaration {
  const declaration: GpuixStyleDeclaration = {
    removeProperty(property) {
      return target.removeProperty(property);
    },
    setProperty(property, value) {
      target.setProperty(property, value);
    },
  };
  return new Proxy(declaration, {
    get(current, property, receiver) {
      if (typeof property !== "string") {
        return Reflect.get(current, property, receiver);
      }
      if (property === "setProperty" || property === "removeProperty") {
        return Reflect.get(current, property, receiver);
      }
      return target.get(property);
    },
    set(_current, property, value) {
      if (typeof property !== "string") {
        return false;
      }
      target.set(property, String(value));
      return true;
    },
    deleteProperty(_current, property) {
      if (typeof property !== "string") {
        return false;
      }
      target.set(property, "");
      return true;
    },
  });
}

export class GpuixEvent {
  currentTarget: GpuixElement | null = null;
  defaultPrevented = false;
  private propagationStopped = false;
  private immediatePropagationStopped = false;

  constructor(
    readonly type: string,
    readonly target: GpuixElement,
    readonly altKey: boolean,
    readonly button: number,
    readonly clientX: number,
    readonly clientY: number,
    readonly ctrlKey: boolean,
    readonly deltaX: number,
    readonly deltaY: number,
    readonly key: string,
    readonly metaKey: boolean,
    readonly shiftKey: boolean,
  ) {}

  preventDefault(): void {
    this.defaultPrevented = true;
  }

  stopPropagation(): void {
    this.propagationStopped = true;
  }

  stopImmediatePropagation(): void {
    this.immediatePropagationStopped = true;
    this.propagationStopped = true;
  }

  get isPropagationStopped(): boolean {
    return this.propagationStopped;
  }

  get isImmediatePropagationStopped(): boolean {
    return this.immediatePropagationStopped;
  }
}

export class GpuixDocument {
  readonly mountNode: GpuixElement;
  private readonly nativeNodes = new Map<number, GpuixElement | GpuixText>();
  private readonly mutations: NativeMutation[] = [];
  private readonly dirtyStyles = new Set<GpuixElement>();
  private readonly rootContainer: GpuixRootContainer;
  private nextId = 1;

  constructor(private readonly renderer: NativeBatchRenderer) {
    this.rootContainer = new GpuixRootContainer(this);
    this.mountNode = this.createElement("div");
    this.rootContainer.appendChild(this.mountNode);
  }

  createElement(tagName: string): GpuixElement {
    return new GpuixElement(this, tagName);
  }

  createElementNS(_namespace: string, tagName: string): GpuixElement {
    return this.createElement(tagName);
  }

  createTextNode(text: string): GpuixText {
    return new GpuixText(this, text);
  }

  createDocumentFragment(): GpuixDocumentFragment {
    return new GpuixDocumentFragment(this);
  }

  allocateId(): number {
    const id = this.nextId;
    this.nextId += 1;
    return id;
  }

  registerNativeNode(node: GpuixElement | GpuixText): void {
    this.nativeNodes.set(node.nativeId, node);
  }

  enqueue(mutation: NativeMutation): void {
    this.mutations.push(mutation);
  }

  markStyleDirty(element: GpuixElement): void {
    this.dirtyStyles.add(element);
  }

  connect(parent: GpuixNode, child: GpuixNode, before: GpuixNode | null): void {
    if (parent === this.rootContainer && isNativeNode(child)) {
      this.enqueue(["setRoot", child.nativeId]);
      return;
    }
    if (!isNativeNode(parent) || !isNativeNode(child)) {
      return;
    }
    if (before !== null && isNativeNode(before)) {
      this.enqueue(["insertBefore", parent.nativeId, child.nativeId, before.nativeId]);
    } else {
      this.enqueue(["appendChild", parent.nativeId, child.nativeId]);
    }
  }

  disconnect(parent: GpuixNode, child: GpuixNode): void {
    if (parent === this.rootContainer && isNativeNode(child)) {
      return;
    }
    if (isNativeNode(parent) && isNativeNode(child)) {
      this.enqueue(["removeChild", parent.nativeId, child.nativeId]);
    }
  }

  setNativeEventListener(
    element: GpuixElement,
    nativeEventName: string,
    enabled: boolean,
  ): void {
    this.enqueue(["setEventListener", element.nativeId, nativeEventName, enabled]);
  }

  dispatchNativeEvent(payload: EventPayload): void {
    const target = this.nativeNodes.get(payload.elementId);
    if (!(target instanceof GpuixElement)) {
      return;
    }
    if (payload.eventType === "change" && payload.value !== undefined) {
      target.receiveNativeValue(payload.value);
    }
    for (const domEventName of domEventNames[payload.eventType] ?? [payload.eventType]) {
      this.dispatchDomEvent(
        target,
        domEventName,
        payload,
        syntheticBubbleNativeEventNames.has(payload.eventType),
      );
    }
  }

  flush(): void {
    for (const element of this.dirtyStyles) {
      this.mutations.push(["setStyle", element.nativeId, element.styleTarget.toNativeStyle()]);
    }
    this.dirtyStyles.clear();

    const detachedRoots = [...this.nativeNodes.values()].filter(
      (node) =>
        !this.isConnectedToRoot(node) &&
        (node.parentNode === null || !isNativeNode(node.parentNode)),
    );
    for (const node of detachedRoots) {
      this.mutations.push(["destroyElement", node.nativeId]);
      this.unregisterSubtree(node);
    }

    if (this.mutations.length === 0) {
      return;
    }
    const batch = [...this.mutations];
    this.mutations.length = 0;
    this.renderer.applyBatch(JSON.stringify(batch));
  }

  private dispatchDomEvent(
    target: GpuixElement,
    eventType: string,
    payload: EventPayload,
    synthesizeAncestry: boolean,
  ): void {
    const modifiers = payload.modifiers;
    const event = new GpuixEvent(
      eventType,
      target,
      modifiers?.alt ?? false,
      payload.button ?? 0,
      payload.x ?? 0,
      payload.y ?? 0,
      modifiers?.ctrl ?? false,
      payload.deltaX ?? 0,
      payload.deltaY ?? 0,
      payload.keyChar ?? payload.key ?? "",
      modifiers?.cmd ?? false,
      modifiers?.shift ?? false,
    );

    for (let current: GpuixNode | null = target; current !== null; current = current.parentNode) {
      if (!(current instanceof GpuixElement)) {
        continue;
      }
      event.currentTarget = current;
      for (const listener of current.listenersFor(eventType)) {
        listener(event);
        if (event.isImmediatePropagationStopped) {
          break;
        }
      }
      if (!synthesizeAncestry || event.isPropagationStopped) {
        break;
      }
    }
    event.currentTarget = null;
  }

  private unregisterSubtree(node: GpuixElement | GpuixText): void {
    this.nativeNodes.delete(node.nativeId);
    for (const child of node.childNodes) {
      if (isNativeNode(child)) {
        this.unregisterSubtree(child);
      }
    }
  }

  private isConnectedToRoot(node: GpuixNode): boolean {
    for (let current: GpuixNode | null = node; current !== null; current = current.parentNode) {
      if (current === this.rootContainer) {
        return true;
      }
    }
    return false;
  }
}

function isNativeNode(node: GpuixNode): node is GpuixElement | GpuixText {
  return node instanceof GpuixElement || node instanceof GpuixText;
}

function nativeElementType(tagName: string): string {
  return nativeElementTypes.has(tagName) ? tagName : "div";
}

function nativeEventNameFor(domEventName: string): string | undefined {
  return nativeEventNames[domEventName];
}

function camelCase(property: string): string {
  return property.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function styleValue(property: string, value: string): number | string {
  const number = /^-?(?:\d+|\d*\.\d+)$/.exec(value.trim());
  if (numericStyleProperties.has(property) && number !== null) {
    return Number.parseFloat(value);
  }
  const pixel = /^-?(?:\d+|\d*\.\d+)px$/.exec(value.trim());
  return pixel === null ? value : Number.parseFloat(value);
}
