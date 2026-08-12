import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

register("./ignore-css-loader.mjs", import.meta.url);

class FakeStyleDeclaration {
  #props = new Map();

  get display() {
    return this.getPropertyValue("display");
  }

  set display(value) {
    if (value == null || value === "") {
      this.removeProperty("display");
      return;
    }

    this.setProperty("display", value);
  }

  get cssText() {
    return Array
      .from(this.#props.entries())
      .map(([name, value]) => `${name}: ${value};`)
      .join(" ");
  }

  set cssText(value) {
    this.#props.clear();

    for (const part of String(value ?? "").split(";")) {
      const idx = part.indexOf(":");
      if (idx < 0) continue;

      const name = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (!name || !val) continue;

      this.setProperty(name, val);
    }
  }

  setProperty(name, value) {
    this.#props.set(String(name), String(value));
  }

  getPropertyValue(name) {
    return this.#props.get(String(name)) ?? "";
  }

  removeProperty(name) {
    const key = String(name);
    const prev = this.getPropertyValue(key);
    this.#props.delete(key);
    return prev;
  }
}

class FakeClassList {
  constructor(el) {
    this.el = el;
  }

  add(...tokens) {
    for (const token of tokens) {
      if (token) this.el._classTokens.add(String(token));
    }
  }

  remove(...tokens) {
    for (const token of tokens) {
      this.el._classTokens.delete(String(token));
    }
  }

  toggle(token, force) {
    const value = String(token);
    if (force === true) {
      this.el._classTokens.add(value);
      return true;
    }

    if (force === false) {
      this.el._classTokens.delete(value);
      return false;
    }

    if (this.el._classTokens.has(value)) {
      this.el._classTokens.delete(value);
      return false;
    }

    this.el._classTokens.add(value);
    return true;
  }

  contains(token) {
    return this.el._classTokens.has(String(token));
  }

  [Symbol.iterator]() {
    return this.el._classTokens[Symbol.iterator]();
  }
}

class FakeTextNode {
  static TEXT_NODE = 3;

  constructor(text) {
    this.nodeType = FakeTextNode.TEXT_NODE;
    this.textContent = String(text ?? "");
    this.parentElement = null;
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.attributes = new Map();
    this.childNodes = [];
    this.parentElement = null;
    this.style = new FakeStyleDeclaration();
    this._classTokens = new Set();
    this.classList = new FakeClassList(this);
    this._listeners = new Map();
    this._capturedPointers = new Set();
    this._rect = { width: 0, height: 0, left: 0, top: 0 };
    this.scrollLeft = 0;
    this.scrollTop = 0;
  }

  get className() {
    return Array.from(this._classTokens).join(" ");
  }

  set className(value) {
    this._classTokens = new Set(
      String(value ?? "")
        .split(/\s+/g)
        .map(token => token.trim())
        .filter(Boolean)
    );
  }

  get id() {
    return this.getAttribute("id") ?? "";
  }

  set id(value) {
    this.setAttribute("id", value);
  }

  get children() {
    return this.childNodes.filter(child => child instanceof FakeElement);
  }

  get offsetWidth() {
    return this._rect.width;
  }

  get firstChild() {
    return this.childNodes[0] ?? null;
  }

  get textContent() {
    return this.childNodes.map(child => child.textContent ?? "").join("");
  }

  set textContent(value) {
    this.childNodes = [new FakeTextNode(value)];
  }

  setAttribute(name, value) {
    const attr = String(name);
    const val = String(value);

    if (attr === "class") {
      this.className = val;
      return;
    }

    if (attr === "style") {
      this.attributes.set(attr, val);
      this.style.cssText = val;
      return;
    }

    this.attributes.set(attr, val);
  }

  getAttribute(name) {
    const attr = String(name);

    if (attr === "class") {
      return this.className || null;
    }

    if (attr === "style") {
      return this.style.cssText || null;
    }

    return this.attributes.get(attr) ?? null;
  }

  hasAttribute(name) {
    const attr = String(name);
    if (attr === "class") return this.className.length > 0;
    if (attr === "style") return this.style.cssText.length > 0;
    return this.attributes.has(attr);
  }

  removeAttribute(name) {
    const attr = String(name);

    if (attr === "class") {
      this.className = "";
      return;
    }

    if (attr === "style") {
      this.attributes.delete(attr);
      this.style.cssText = "";
      return;
    }

    this.attributes.delete(attr);
  }

  appendChild(child) {
    child.parentElement = this;
    this.childNodes.push(child);
    return child;
  }

  append(child) {
    return this.appendChild(child);
  }

  insertBefore(child, before) {
    child.parentElement = this;
    const idx = this.childNodes.indexOf(before);
    if (idx < 0) {
      this.childNodes.push(child);
    } else {
      this.childNodes.splice(idx, 0, child);
    }

    return child;
  }

  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx >= 0) this.childNodes.splice(idx, 1);
    child.parentElement = null;
    return child;
  }

  replaceChildren(...children) {
    this.childNodes = [];
    for (const child of children) this.appendChild(child);
  }

  remove() {
    this.parentElement?.removeChild(this);
  }

  insertAdjacentElement(position, element) {
    if (String(position).toLowerCase() !== "afterend" || !this.parentElement) {
      return null;
    }

    const idx = this.parentElement.childNodes.indexOf(this);
    element.parentElement = this.parentElement;
    this.parentElement.childNodes.splice(idx + 1, 0, element);
    return element;
  }

  addEventListener(type, handler) {
    const key = String(type);
    const listeners = this._listeners.get(key) ?? [];
    listeners.push(handler);
    this._listeners.set(key, listeners);
  }

  removeEventListener(type, handler) {
    const key = String(type);
    const listeners = this._listeners.get(key) ?? [];
    this._listeners.set(key, listeners.filter(item => item !== handler));
  }

  dispatchEvent(event) {
    const key = String(event?.type ?? "");
    if (
      key.startsWith("pointer") &&
      this.getAttribute("id") === "xstudio-canvas" &&
      globalThis.document?.body?.classList?.contains("xstudio-left-resizing")
    ) {
      return false;
    }
    event.target ??= this;
    event.currentTarget = this;
    for (const handler of this._listeners.get(key) ?? []) {
      handler.call(this, event);
      if (event.immediatePropagationStopped === true) break;
    }
    return event.defaultPrevented !== true;
  }

  setPointerCapture(pointerId) {
    this._capturedPointers.add(Number(pointerId));
  }

  releasePointerCapture(pointerId) {
    this._capturedPointers.delete(Number(pointerId));
  }

  hasPointerCapture(pointerId) {
    return this._capturedPointers.has(Number(pointerId));
  }

  getBoundingClientRect() {
    return {
      width: this._rect.width,
      height: this._rect.height,
      left: this._rect.left,
      top: this._rect.top,
      right: this._rect.left + this._rect.width,
      bottom: this._rect.top + this._rect.height,
    };
  }

  contains(child) {
    let current = child;
    while (current) {
      if (current === this) return true;
      current = current.parentElement;
    }
    return false;
  }

  scrollIntoView(options) {
    this._scrolledIntoView = options ?? true;
  }
}

class FakeTableElement extends FakeElement {}
class FakeButtonElement extends FakeElement {
  constructor(tagName) {
    super(tagName);
    this.disabled = false;
  }
}

const storage = new Map();
const documentElement = new FakeElement("html");
const documentBody = new FakeElement("body");
const documentListeners = new Map();
const windowListeners = new Map();

function addGlobalListener(registry, type, handler) {
  const key = String(type);
  const listeners = registry.get(key) ?? [];
  listeners.push(handler);
  registry.set(key, listeners);
}

function removeGlobalListener(registry, type, handler) {
  const key = String(type);
  const listeners = registry.get(key) ?? [];
  registry.set(key, listeners.filter(item => item !== handler));
}

function dispatchGlobalListener(registry, event) {
  const key = String(event?.type ?? "");
  for (const handler of registry.get(key) ?? []) {
    handler(event);
    if (event.immediatePropagationStopped === true) break;
  }
}

function findElementById(root, id) {
  if (!(root instanceof FakeElement)) return null;
  if (root.getAttribute("id") === id) return root;
  for (const child of root.childNodes) {
    const found = findElementById(child, id);
    if (found) return found;
  }
  return null;
}

globalThis.window = {
  innerWidth: 1280,
  localStorage: {
    getItem: key => storage.get(String(key)) ?? null,
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: key => storage.delete(String(key)),
    clear: () => storage.clear()
  },
  sessionStorage: {
    getItem: key => storage.get(String(key)) ?? null,
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: key => storage.delete(String(key)),
    clear: () => storage.clear()
  },
  addEventListener: (type, handler) => addGlobalListener(windowListeners, type, handler),
  removeEventListener: (type, handler) => removeGlobalListener(windowListeners, type, handler),
  dispatchEvent: event => dispatchGlobalListener(windowListeners, event)
};

globalThis.document = {
  createElement: tagName => {
    const tag = String(tagName).toLowerCase();
    if (tag === "table") return new FakeTableElement(tagName);
    if (tag === "button") return new FakeButtonElement(tagName);
    return new FakeElement(tagName);
  },
  createElementNS: (_ns, tagName) => new FakeElement(tagName),
  createTextNode: text => new FakeTextNode(text),
  getElementById: id => findElementById(documentBody, id),
  querySelector: () => null,
  querySelectorAll: selector => {
    const matches = [];
    const wantsFlowStatus = selector === "[data-xflow-status-for]";
    const classMatch = String(selector ?? "").match(/^\.([A-Za-z0-9_-]+)$/);

    const visit = node => {
      if (wantsFlowStatus && node instanceof FakeElement && node.hasAttribute("data-xflow-status-for")) {
        matches.push(node);
      }
      if (classMatch && node instanceof FakeElement && node.classList.contains(classMatch[1])) {
        matches.push(node);
      }

      if (Array.isArray(node?.childNodes)) {
        node.childNodes.forEach(visit);
      }
    };

    visit(globalThis.document.body);
    return matches;
  },
  addEventListener: (type, handler) => addGlobalListener(documentListeners, type, handler),
  removeEventListener: (type, handler) => removeGlobalListener(documentListeners, type, handler),
  dispatchEvent: event => dispatchGlobalListener(documentListeners, event),
  documentElement,
  body: documentBody
};

globalThis.HTMLElement = FakeElement;
globalThis.HTMLTableElement = FakeTableElement;
globalThis.HTMLButtonElement = FakeButtonElement;
globalThis.Node = FakeTextNode;
globalThis.getComputedStyle = el => ({
  getPropertyValue: name => el.style.getPropertyValue(name)
});

const ui = await import("../dist/xpell-ui.es.js");
const {
  _x,
  _xd,
  _xem,
  CAPABILITY_GUIDANCE_ARTIFACT_TYPE,
  FlowManagerClient,
  MUTATION_PLAN_ARTIFACT_TYPE,
  PROJECT_PLAN_ARTIFACT_TYPE,
	  XButton,
	  XDB,
	  XStudioModule,
	  XTable,
	  XUI,
	  XUIObject,
	  XUIRuntime,
	  XVM,
	  XVMClient,
	  XVMView,
	  XVMViewPack,
	  XView,
	  create_xstudio_artifact_request_card,
	  create_xstudio_artifact_request_view,
	  create_xstudio_conversation_message_list,
	  registerXVMViewSupport
	} = ui;

const xstudioCss = readFileSync(new URL("../src/XStudio/xstudio.css", import.meta.url), "utf8");
const xstudioBundle = readFileSync(new URL("../dist/xpell-ui.es.js", import.meta.url), "utf8");
const xstudioShellView = JSON.parse(readFileSync(new URL("../src/XStudio/views/shell.json", import.meta.url), "utf8"));
const xstudioTopbarView = JSON.parse(readFileSync(new URL("../src/XStudio/views/topbar.json", import.meta.url), "utf8"));
const XSTUDIO_LEFT_WIDTH_STORAGE_KEY = "xstudio:left_sidebar_width";

function cssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xstudioCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] ?? "";
}

function makeEvent(type, props = {}) {
  return {
    type,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true;
      this.stopPropagation();
    },
    ...props
  };
}

async function flushAsync() {
  await Promise.resolve();
  await Promise.resolve();
}

function makeXStudioObject(dom) {
  return {
    dom,
    addClass: cls => dom.classList.add(cls),
    removeClass: cls => dom.classList.remove(cls),
    setText: text => {
      dom.textContent = text;
    }
  };
}

function createResizeHarness({ bodyWidth = 1280, rightWidth = 500 } = {}) {
  const shell = document.createElement("div");
  shell.setAttribute("id", "xstudio-shell");
  const body = document.createElement("div");
  body.setAttribute("id", "xstudio-body");
  body._rect.width = bodyWidth;
  const right = document.createElement("div");
  right.setAttribute("id", "xstudio-right-dock");
  right._rect.width = rightWidth;
  const divider = document.createElement("div");
  divider.setAttribute("id", "xstudio-left-resize-divider");
  const canvas = document.createElement("div");
  canvas.setAttribute("id", "xstudio-canvas");
  const leftToggle = document.createElement("button");
  leftToggle.setAttribute("id", "xstudio-toggle-left-dock");
  const rightToggle = document.createElement("button");
  rightToggle.setAttribute("id", "xstudio-toggle-right-dock");

  body.appendChild(divider);
  body.appendChild(canvas);
  body.appendChild(right);
  shell.appendChild(body);
  document.body.replaceChildren(shell);

  const objects = {
    "xstudio-shell": makeXStudioObject(shell),
    "xstudio-body": makeXStudioObject(body),
    "xstudio-right-dock": makeXStudioObject(right),
    "xstudio-left-resize-divider": makeXStudioObject(divider),
    "xstudio-canvas": makeXStudioObject(canvas),
    "xstudio-toggle-left-dock": makeXStudioObject(leftToggle),
    "xstudio-toggle-right-dock": makeXStudioObject(rightToggle)
  };

  const originalGetObject = XUI.getObject;
  XUI.getObject = id => objects[id] ?? null;

  return {
    shell,
    body,
    right,
    divider,
    canvas,
    objects,
    cleanup() {
      XUI.getObject = originalGetObject;
      document.body.replaceChildren();
      documentListeners.clear();
      windowListeners.clear();
    }
  };
}

function createTreeNode({
  id,
  label,
  depth = 0,
  type = "label",
  sourceViewId = "view-main",
  path = "$",
  parentPath = "",
  visible = true,
  children = []
}) {
  return {
    _key: "",
    _node_key: `${sourceViewId}:${path}:${id}`,
    _parent_node_key: parentPath ? `${sourceViewId}:${parentPath}` : "",
    _label: label,
    _label_primary: label,
    _label_secondary: id,
    _label_type: type,
    _search_text: label.toLowerCase(),
    _depth: depth,
    _children: children,
    _object: {
      _id: id,
      _type: type,
      _visible: visible
    },
    _meta: {
      _id: id,
      _json_id: id,
      _source_view_id: sourceViewId,
      _type: type,
      _path: path,
      _parent_path: parentPath,
      _tree_path: path,
      _is_xvm_ref_child: false,
      _dom_status: ""
    }
  };
}

function createPickerHarness({ client = null, includeSemanticDomObject = false } = {}) {
  const shell = document.createElement("div");
  shell.setAttribute("id", "xstudio-shell");
  shell.setAttribute("class", "xstudio-shell");
  const topbar = document.createElement("div");
  topbar.setAttribute("id", "xstudio-topbar");
  const pickerButton = document.createElement("button");
  pickerButton.setAttribute("id", "xstudio-object-picker-toggle");
  const arrangeButton = document.createElement("button");
  arrangeButton.setAttribute("id", "xstudio-arrange-toggle");
  topbar.appendChild(pickerButton);
  topbar.appendChild(arrangeButton);
  const objectTreePortlet = document.createElement("div");
  objectTreePortlet.setAttribute("id", "xstudio-object-tree-portlet");
  const objectTreeHeader = document.createElement("div");
  objectTreeHeader.setAttribute("class", "xstudio-portlet-header xstudio-explorer-section-header");
  const objectTreeToggle = document.createElement("button");
  objectTreeToggle.setAttribute("id", "xstudio-object-tree-section-toggle");
  const objectTreeActions = document.createElement("div");
  objectTreeActions.setAttribute("class", "xstudio-explorer-section-actions");
  const panelPickerButton = document.createElement("button");
  panelPickerButton.setAttribute("id", "xstudio-object-tree-picker-toggle");
  const panelArrangeButton = document.createElement("button");
  panelArrangeButton.setAttribute("id", "xstudio-object-tree-arrange-toggle");
  objectTreeActions.appendChild(panelPickerButton);
  objectTreeActions.appendChild(panelArrangeButton);
  objectTreeHeader.appendChild(objectTreeToggle);
  objectTreeHeader.appendChild(objectTreeActions);
  const canvas = document.createElement("div");
  canvas.setAttribute("id", "xstudio-canvas");
  const results = document.createElement("div");
  results.setAttribute("id", "xstudio-object-tree-results");
  const objectTreeBody = document.createElement("div");
  objectTreeBody.setAttribute("id", "xstudio-object-tree-body");
  objectTreeBody.appendChild(results);
  objectTreePortlet.appendChild(objectTreeHeader);
  objectTreePortlet.appendChild(objectTreeBody);

  const card = document.createElement("section");
  card.setAttribute("id", "card-main");
  card._rect = { left: 30, top: 40, width: 260, height: 160 };
  const nativeText = document.createElement("span");
  nativeText._rect = { left: 44, top: 52, width: 130, height: 18 };
  const button = document.createElement("button");
  button.setAttribute("id", "primary-button");
  button._rect = { left: 42, top: 74, width: 120, height: 28 };
  const buttonText = document.createElement("span");
  buttonText._rect = { left: 52, top: 80, width: 80, height: 14 };
  const image = document.createElement("img");
  image.setAttribute("id", "hero-image");
  image._rect = { left: 176, top: 74, width: 80, height: 64 };
  const footerLabel = document.createElement("div");
  footerLabel.setAttribute("id", "footer-label");
  footerLabel._rect = { left: 30, top: 220, width: 180, height: 24 };
  const semanticRoot = includeSemanticDomObject ? document.createElement("div") : null;
  const semanticInner = includeSemanticDomObject ? document.createElement("span") : null;
  if (semanticRoot && semanticInner) {
    semanticRoot._rect = { left: 300, top: 48, width: 180, height: 80 };
    semanticInner._rect = { left: 316, top: 64, width: 112, height: 20 };
    semanticRoot.appendChild(semanticInner);
  }

  button.appendChild(buttonText);
  card.appendChild(nativeText);
  card.appendChild(button);
  card.appendChild(image);
  canvas.appendChild(card);
  canvas.appendChild(footerLabel);
  if (semanticRoot) canvas.appendChild(semanticRoot);
  shell.appendChild(topbar);
  shell.appendChild(objectTreePortlet);
  shell.appendChild(canvas);
  document.body.replaceChildren(shell);

  const objects = {
    "xstudio-shell": makeXStudioObject(shell),
    "xstudio-topbar": makeXStudioObject(topbar),
    "xstudio-canvas": makeXStudioObject(canvas),
    "xstudio-object-picker-toggle": makeXStudioObject(pickerButton),
    "xstudio-arrange-toggle": makeXStudioObject(arrangeButton),
    "xstudio-object-tree-picker-toggle": makeXStudioObject(panelPickerButton),
    "xstudio-object-tree-arrange-toggle": makeXStudioObject(panelArrangeButton),
    "xstudio-object-tree-section-toggle": makeXStudioObject(objectTreeToggle),
    "xstudio-object-tree-body": makeXStudioObject(objectTreeBody),
    "xstudio-object-tree-results": {
      ...makeXStudioObject(results),
      lastUpdate: null,
      update(data) {
        this.lastUpdate = data;
      }
    },
    "xstudio-object-tree": makeXStudioObject(document.createElement("div")),
    "card-main": { _id: "card-main", _type: "view", dom: card },
    "primary-button": { _id: "primary-button", _type: "button", dom: button },
    "hero-image": { _id: "hero-image", _type: "image", dom: image },
    "footer-label": { _id: "footer-label", _type: "label", dom: footerLabel },
    ...(semanticRoot
      ? { "semantic-panel": { _id: "semantic-panel", _type: "panel", dom: semanticRoot } }
      : {})
  };

  const originalGetObject = XUI.getObject;
  XUI.getObject = id => objects[id] ?? null;

  const runtimeClient = {
    getActiveAppId: () => "app-main",
    getActiveEnv: () => "default",
    get_current_view_id: () => "main",
    get_app_view_id: () => "main",
    render_view: async () => {},
    ...(client ?? {})
  };
  const module = new XStudioModule(runtimeClient);
  module._refresh_object_tree_for_current_view = () => {};
  module._log_selected_object_persisted_metadata = () => {};
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      {
        _id: "card-main",
        _type: "view",
        _children: [
          {
            _id: "primary-button",
            _type: "button",
            _text: "Primary"
          },
          {
            _id: "hero-image",
            _type: "image"
          }
        ]
      },
      {
        _id: "footer-label",
        _type: "label",
        _text: "Footer"
      },
      ...(semanticRoot
        ? [{
          _id: "semantic-panel",
          _type: "panel",
          _text: "Semantic Panel"
        }]
        : [])
    ]
  };

  function rebuildTree() {
    const nodes = [];
    module._build_object_tree_nodes(view, "main", "$", "$", "", "", "", "$", 0, false, true, nodes);
    module._object_tree_nodes = nodes;
    const pending = module._selected_object_pending_select_id.trim();
    if (pending) {
      const node = module._flatten_object_tree_nodes(nodes)
        .find(item => item._meta?._json_id === pending);
      if (node?._meta) {
        module._selected_object = { ...node._meta };
        module._selected_object_pending_select_id = "";
      }
    }
    return nodes;
  }

  let nodes = rebuildTree();
  module._object_tree_expanded_node_keys.clear();
  module._object_tree_expanded_node_keys.add(nodes[0]._node_key);
  module._object_tree_expanded_node_keys.add(nodes[0]._children[0]._node_key);

  function materializeVisibleRows() {
    results.replaceChildren();
    let rowIndex = 0;
    const renderNode = node => {
      const row = document.createElement("div");
      row.setAttribute("id", `picker-tree-row-${rowIndex}`);
      row.setAttribute("class", "xstudio-object-tree-row");
      row.setAttribute("data-xstudio-object-tree-row", "true");
      row.setAttribute("data-xstudio-object-tree-row-id", `picker-tree-row-${rowIndex}`);
      row._rect = { left: 0, top: rowIndex * 24, width: 280, height: 24 };
      node._key = `picker-tree-row-${rowIndex}`;
      rowIndex += 1;
      results.appendChild(row);
      if (module._object_tree_node_is_expanded(node, false)) {
        node._children.forEach(renderNode);
      }
    };
    module._object_tree_nodes.forEach(renderNode);
  }

  module._render_cached_object_tree_nodes = materializeVisibleRows;
  materializeVisibleRows();

  return {
    module,
    shell,
    topbar,
    pickerButton,
    arrangeButton,
    panelPickerButton,
    panelArrangeButton,
    objectTreePortlet,
    objectTreeHeader,
    objectTreeToggle,
    objectTreeActions,
    objectTreeBody,
    canvas,
    results,
    card,
    nativeText,
    button,
    buttonText,
    image,
    footerLabel,
    semanticRoot,
    semanticInner,
    objects,
    view,
    rebuildTree: () => {
      nodes = rebuildTree();
      materializeVisibleRows();
      return nodes;
    },
    cleanup() {
      module.unregister_shortcuts();
      XUI.getObject = originalGetObject;
      document.body.replaceChildren();
      documentListeners.clear();
      windowListeners.clear();
      _xd.set("studio:selected_object", null, { source: "test" });
    }
  };
}

function installArrangeMoveHarness(harness, {
  skills,
  fail = false
} = {}) {
  const commands = [];
  const refreshes = [];
  const statuses = [];
  const view = harness.view;

  const findNode = (node, targetId) => {
    if (node?._id === targetId) return node;
    const children = Array.isArray(node?._children) ? node._children : [];
    for (const child of children) {
      const found = findNode(child, targetId);
      if (found) return found;
    }
    return null;
  };

  const findParent = (node, targetId) => {
    const children = Array.isArray(node?._children) ? node._children : [];
    if (children.some(child => child?._id === targetId)) return node;
    for (const child of children) {
      const found = findParent(child, targetId);
      if (found) return found;
    }
    return null;
  };

  harness.module._resolve_selected_object_skill = type => skills?.[type] ?? objectSkill({
    id: type,
    allowed: type === "view",
    acceptedTypes: ["*"],
    insertModes: ["inside", "before", "after"]
  });
  harness.module._get_cached_view = viewId => viewId === "main" ? view : null;
  harness.module._app_explorer_current_view_id = () => "main";
  harness.module._write_studio_status = status => statuses.push(status);
  harness.module._request_object_tree_structured_edit_refresh = async (params, result) => {
    refreshes.push({ params, result });
  };
  harness.module._send_xvibe_command = async (op, params) => {
    commands.push({ op, params: { ...params } });
    assert.equal(op, "apply-view-edit");
    assert.equal(params._edit_action, "move-object");
    assert.equal(params._child, undefined);
    assert.equal(params._object_value, undefined);
    if (fail) return { _ok: false, _error: "move rejected" };

    const fromParent = findParent(view, params._target_id);
    assert.ok(fromParent, `missing source parent for ${params._target_id}`);
    const fromChildren = fromParent._children;
    const fromIndex = fromChildren.findIndex(child => child?._id === params._target_id);
    assert.notEqual(fromIndex, -1);
    const [moved] = fromChildren.splice(fromIndex, 1);

    const parentId = typeof params._target_parent_id === "string" ? params._target_parent_id : "";
    const toParent = parentId ? findNode(view, parentId) : fromParent;
    assert.ok(toParent, `missing destination parent ${parentId}`);
    if (!Array.isArray(toParent._children)) toParent._children = [];
    const toChildren = toParent._children;
    const beforeId = typeof params._before_id === "string" ? params._before_id : "";
    const afterId = typeof params._after_id === "string" ? params._after_id : "";
    const anchorId = beforeId || afterId;
    const anchorIndex = anchorId
      ? toChildren.findIndex(child => child?._id === anchorId)
      : -1;
    if (anchorId) assert.notEqual(anchorIndex, -1);
    const nextIndex = beforeId
      ? anchorIndex
      : afterId
        ? anchorIndex + 1
        : toChildren.length;
    toChildren.splice(nextIndex, 0, moved);
    return { _ok: true, _result: { _applied: true } };
  };
  harness.module._refresh_object_tree_for_current_view = () => {
    harness.rebuildTree();
  };
  harness.module._log = () => {};
  harness.module._error = () => {};

  return {
    commands,
    refreshes,
    statuses,
    rootIds: () => view._children.map(child => child._id),
    cardIds: () => view._children.find(child => child._id === "card-main")?._children?.map(child => child._id) ?? [],
    countId: id => {
      let count = 0;
      const visit = node => {
        if (node?._id === id) count += 1;
        for (const child of Array.isArray(node?._children) ? node._children : []) visit(child);
      };
      visit(view);
      return count;
    }
  };
}

function objectTreeNodeById(harness, id) {
  const node = harness.module._find_object_tree_node_by_object_id(id);
  assert.ok(node, `missing object tree node ${id}`);
  return node;
}

function objectTreeRowById(harness, id) {
  const node = objectTreeNodeById(harness, id);
  const row = document.getElementById(node._key);
  assert.ok(row instanceof HTMLElement, `missing object tree row ${id}`);
  return { node, row };
}

function startObjectTreeDrag(harness, id, {
  pointerId = 101,
  clientX = 12,
  clientY = 12,
  kind = "handle"
} = {}) {
  const { node, row } = objectTreeRowById(harness, id);
  harness.module._start_object_tree_drag(node, node._key, makeEvent("pointerdown", {
    button: 0,
    pointerId,
    clientX,
    clientY,
    target: row
  }), kind);
  return { node, row, pointerId };
}

function moveObjectTreeDragTo(row, {
  pointerId = 101,
  clientX = 12,
  clientY
} = {}) {
  const rect = row.getBoundingClientRect();
  document.dispatchEvent(makeEvent("pointermove", {
    pointerId,
    clientX,
    clientY: clientY ?? rect.top + Math.round(rect.height / 2),
    target: row
  }));
}

function dropObjectTreeDragOn(row, {
  pointerId = 101,
  clientX = 12,
  clientY
} = {}) {
  const rect = row.getBoundingClientRect();
  document.dispatchEvent(makeEvent("pointerup", {
    pointerId,
    clientX,
    clientY: clientY ?? rect.top + Math.round(rect.height / 2),
    target: row
  }));
}

function createAddObjectHarness({
  selectedId = "",
  view,
  skills = {}
} = {}) {
  const commands = [];
  const refreshes = [];
  let treeRefreshes = 0;
  const statuses = [];
  const client = {
    getActiveAppId: () => "app-main",
    getActiveEnv: () => "default"
  };
  const module = new XStudioModule(client);
  module._get_cached_view = viewId => viewId === "main" ? view : null;
  module._app_explorer_current_view_id = () => "main";
  module._resolve_selected_object_skill = type => skills[type] ?? null;
  module._write_studio_status = status => statuses.push(status);
  module._send_xvibe_command = async (op, params) => {
    commands.push({ op, params });
    return { _ok: true, _created_object_id: "created-object" };
  };
  module._request_object_tree_structured_edit_refresh = async (params, result) => {
    refreshes.push({ params, result });
  };
  module._refresh_object_tree_for_current_view = () => {
    treeRefreshes += 1;
  };
  module._log = () => {};
  module._error = () => {};

  const nodes = [];
  module._build_object_tree_nodes(view, "main", "$", "$", "", "", "", "$", 0, false, true, nodes);
  module._object_tree_nodes = nodes;
  if (selectedId) {
    const selectedNode = module._flatten_object_tree_nodes(nodes)
      .find(node => node._meta?._json_id === selectedId);
    assert.ok(selectedNode, `missing selected node ${selectedId}`);
    module._selected_object = { ...selectedNode._meta };
  }

  return {
    module,
    commands,
    refreshes,
    treeRefreshes: () => treeRefreshes,
    statuses,
    nodes,
    flatNodes: () => module._flatten_object_tree_nodes(module._object_tree_nodes)
  };
}

function paletteSkill(type = "label") {
  return {
    _id: type,
    _title: type,
    _type: "view-skill",
    _design: {
      _palette: {
        _default_object: {
          _type: type,
          _text: "New object"
        }
      }
    }
  };
}

function objectSkill({
  id,
  allowed,
  acceptedTypes,
  insertModes
}) {
  return {
    _id: id,
    _title: id,
    _type: "view-skill",
    _design: {
      _children: {
        _allowed: allowed,
        ...(acceptedTypes ? { _accepted_types: acceptedTypes } : {}),
        _insert_modes: insertModes
      }
    }
  };
}

function createMoveObjectHarness(view) {
  const commands = [];
  const refreshes = [];
  const statuses = [];
  let treeRefreshes = 0;
  const client = {
    getActiveAppId: () => "app-main",
    getActiveEnv: () => "default"
  };
  const module = new XStudioModule(client);
  module._get_cached_view = viewId => viewId === "main" ? view : null;
  module._write_studio_status = status => statuses.push(status);
  module._request_object_tree_structured_edit_refresh = async (params, result) => {
    refreshes.push({ params, result });
  };
  module._apply_selected_canvas_highlight = () => "DOM unavailable";
  module._populate_selected_object_inspector_draft = () => {};
  module._log_selected_object_persisted_metadata = () => {};
  module._update_selected_object_inspector = () => {};
  module._log = () => {};
  module._error = () => {};

  const findParent = (parent, targetId) => {
    const children = Array.isArray(parent._children) ? parent._children : [];
    if (children.some(child => child?._id === targetId)) return parent;
    for (const child of children) {
      if (!child || typeof child !== "object") continue;
      const found = findParent(child, targetId);
      if (found) return found;
    }
    return null;
  };

  module._send_xvibe_command = async (op, params) => {
    commands.push({ op, params: { ...params } });
    assert.equal(op, "apply-view-edit");
    assert.equal(params._edit_action, "move-object");
    assert.equal(params._child, undefined);
    assert.equal(params._object_value, undefined);

    const parent = findParent(view, params._target_id);
    assert.ok(parent, `missing move parent for ${params._target_id}`);
    const children = parent._children;
    const fromIndex = children.findIndex(child => child?._id === params._target_id);
    assert.notEqual(fromIndex, -1);
    const [moved] = children.splice(fromIndex, 1);
    const beforeId = typeof params._before_id === "string" ? params._before_id : "";
    const afterId = typeof params._after_id === "string" ? params._after_id : "";
    const anchorId = beforeId || afterId;
    const anchorIndex = children.findIndex(child => child?._id === anchorId);
    assert.notEqual(anchorIndex, -1);
    children.splice(beforeId ? anchorIndex : anchorIndex + 1, 0, moved);
    return { _ok: true, _result: { _applied: true } };
  };

  const rebuild = () => {
    const nodes = [];
    module._build_object_tree_nodes(view, "main", "$", "$", "", "", "", "$", 0, false, true, nodes);
    module._object_tree_nodes = nodes;
    const pending = module._selected_object_pending_select_id.trim();
    if (pending) {
      const node = module._flatten_object_tree_nodes(nodes)
        .find(item => item._meta?._json_id === pending);
      if (node?._meta) {
        module._selected_object = { ...node._meta };
        module._selected_object_pending_select_id = "";
      }
    }
    return nodes;
  };

  module._refresh_object_tree_for_current_view = () => {
    treeRefreshes += 1;
    rebuild();
  };

  rebuild();

  return {
    module,
    commands,
    refreshes,
    statuses,
    treeRefreshes: () => treeRefreshes,
    flatNodes: () => module._flatten_object_tree_nodes(module._object_tree_nodes),
    nodeById: id => module._flatten_object_tree_nodes(module._object_tree_nodes)
      .find(node => node._meta?._json_id === id),
    ids: () => view._children.map(child => child._id),
    nestedIds: parentId => {
      const parent = view._children.find(child => child._id === parentId);
      return Array.isArray(parent?._children) ? parent._children.map(child => child._id) : [];
    }
  };
}

assert.equal(typeof XVMView, "function");
assert.equal(typeof XVMViewPack, "function");
assert.equal(typeof registerXVMViewSupport, "function");

{
  storage.clear();
  const module = new XStudioModule(null);
  const harness = createResizeHarness();
  try {
    module._apply_dock_state();
    assert.equal(harness.shell.style.getPropertyValue("--xstudio-left-width"), "300px");
    assert.equal(harness.divider.getAttribute("aria-valuemin"), "240");
    assert.equal(harness.divider.getAttribute("aria-valuenow"), "300");
  } finally {
    harness.cleanup();
  }
}

{
  storage.clear();
  const module = new XStudioModule(null);
  const harness = createResizeHarness();
  try {
    module._apply_dock_state();
    harness.divider.dispatchEvent(makeEvent("pointerdown", { button: 0, clientX: 100, pointerId: 7 }));
    assert.equal(harness.divider.hasPointerCapture(7), true);
    assert.equal(harness.shell.classList.contains("xstudio-left-resizing"), true);
    assert.equal(document.body.classList.contains("xstudio-left-resizing"), true);
    harness.divider.dispatchEvent(makeEvent("pointermove", { clientX: 180, pointerId: 7 }));
    assert.equal(harness.shell.style.getPropertyValue("--xstudio-left-width"), "380px");
    harness.divider.dispatchEvent(makeEvent("pointerup", { clientX: 180, pointerId: 7 }));
    assert.equal(harness.divider.hasPointerCapture(7), false);
    assert.equal(harness.shell.classList.contains("xstudio-left-resizing"), false);
    assert.equal(window.localStorage.getItem(XSTUDIO_LEFT_WIDTH_STORAGE_KEY), "380");
    harness.divider.dispatchEvent(makeEvent("pointermove", { clientX: 260, pointerId: 7 }));
    assert.equal(harness.shell.style.getPropertyValue("--xstudio-left-width"), "380px");
  } finally {
    harness.cleanup();
  }
}

{
  storage.clear();
  const module = new XStudioModule(null);
  const harness = createResizeHarness();
  let canvasPointerDown = 0;
  harness.canvas.addEventListener("pointerdown", () => {
    canvasPointerDown += 1;
  });

  try {
    module._apply_dock_state();
    harness.divider.dispatchEvent(makeEvent("pointerdown", { button: 0, clientX: 100, pointerId: 11 }));
    harness.divider.dispatchEvent(makeEvent("pointermove", {
      clientX: 210,
      pointerId: 11,
      target: harness.canvas
    }));
    assert.equal(harness.shell.style.getPropertyValue("--xstudio-left-width"), "410px");
    assert.equal(harness.canvas.dispatchEvent(makeEvent("pointerdown", { pointerId: 12 })), false);
    assert.equal(canvasPointerDown, 0);
    assert.match(xstudioCss, /\.xstudio-left-resizing\s+\.xstudio-canvas\s*\{[\s\S]*pointer-events:\s*none;/);
    harness.divider.dispatchEvent(makeEvent("pointercancel", { pointerId: 11 }));
    assert.equal(harness.divider.hasPointerCapture(11), false);
  } finally {
    harness.cleanup();
  }
}

{
  storage.clear();
  const module = new XStudioModule(null);
  const harness = createResizeHarness();
  try {
    module._apply_dock_state();
    harness.divider.dispatchEvent(makeEvent("pointerdown", { button: 0, clientX: 100, pointerId: 15 }));
    window.localStorage.setItem(XSTUDIO_LEFT_WIDTH_STORAGE_KEY, "240");
    module._apply_dock_state();
    harness.divider.dispatchEvent(makeEvent("pointermove", { clientX: 190, pointerId: 15 }));
    assert.equal(harness.shell.style.getPropertyValue("--xstudio-left-width"), "390px");
    harness.divider.dispatchEvent(makeEvent("pointerup", { pointerId: 15 }));
    assert.equal(window.localStorage.getItem(XSTUDIO_LEFT_WIDTH_STORAGE_KEY), "390");
  } finally {
    harness.cleanup();
  }
}

{
  storage.clear();
  const module = new XStudioModule(null);
  const harness = createResizeHarness();
  try {
    module._apply_dock_state();
    const replacement = document.createElement("div");
    replacement.setAttribute("id", "xstudio-left-resize-divider");
    harness.objects["xstudio-left-resize-divider"] = makeXStudioObject(replacement);
    harness.body.replaceChildren(replacement, harness.canvas, harness.right);
    module._apply_dock_state();
    replacement.dispatchEvent(makeEvent("pointerdown", { button: 0, clientX: 100, pointerId: 21 }));
    replacement.dispatchEvent(makeEvent("pointermove", { clientX: 160, pointerId: 21 }));
    assert.equal(harness.shell.style.getPropertyValue("--xstudio-left-width"), "360px");
    replacement.dispatchEvent(makeEvent("pointerup", { pointerId: 21 }));
    assert.equal(window.localStorage.getItem(XSTUDIO_LEFT_WIDTH_STORAGE_KEY), "360");
  } finally {
    harness.cleanup();
  }
}

{
  storage.clear();
  const module = new XStudioModule(null);
  const harness = createResizeHarness();
  try {
    module._apply_dock_state();
    assert.equal(module._set_left_sidebar_width(20, true), 240);
    assert.equal(harness.shell.style.getPropertyValue("--xstudio-left-width"), "240px");
    assert.equal(module._set_left_sidebar_width(9999, true), 420);
    assert.equal(harness.shell.style.getPropertyValue("--xstudio-left-width"), "420px");
  } finally {
    harness.cleanup();
  }
}

{
  storage.clear();
  window.localStorage.setItem(XSTUDIO_LEFT_WIDTH_STORAGE_KEY, "360");
  const module = new XStudioModule(null);
  const harness = createResizeHarness();
  try {
    module._apply_dock_state();
    assert.equal(harness.shell.style.getPropertyValue("--xstudio-left-width"), "360px");
  } finally {
    harness.cleanup();
  }
}

{
  storage.clear();
  window.localStorage.setItem(XSTUDIO_LEFT_WIDTH_STORAGE_KEY, "not-a-width");
  const module = new XStudioModule(null);
  const harness = createResizeHarness();
  try {
    module._apply_dock_state();
    assert.equal(harness.shell.style.getPropertyValue("--xstudio-left-width"), "300px");
  } finally {
    harness.cleanup();
  }
}

{
  storage.clear();
  const module = new XStudioModule(null);
  const harness = createResizeHarness();
  try {
    module._apply_dock_state();
    module._set_left_sidebar_width(390, true);
    harness.divider.dispatchEvent(makeEvent("dblclick"));
    assert.equal(harness.shell.style.getPropertyValue("--xstudio-left-width"), "300px");
    assert.equal(window.localStorage.getItem(XSTUDIO_LEFT_WIDTH_STORAGE_KEY), "300");
  } finally {
    harness.cleanup();
  }
}

{
  assert.match(xstudioCss, /\.xstudio-object-tree-results\s*\{[\s\S]*overflow-x:\s*auto;/);
  assert.match(xstudioCss, /\.xstudio-shell\s*\{[\s\S]*overflow:\s*hidden;/);
  assert.match(xstudioCss, /\.xstudio-body\s*\{[\s\S]*overflow:\s*hidden;/);
  assert.match(xstudioCss, /\.xstudio-object-tree-label\s*\{[\s\S]*text-overflow:\s*ellipsis;/);
  assert.match(xstudioCss, /\.xstudio-object-tree-quick-action\s*\{[\s\S]*position:\s*absolute;/);
  assert.match(xstudioCss, /\.xstudio-object-tree-actions\s*\{[\s\S]*position:\s*sticky;[\s\S]*right:\s*0;/);
  assert.match(xstudioCss, /\.xstudio-object-tree-actions\s*\{[\s\S]*background:/);
  assert.match(xstudioCss, /\.xstudio-object-tree-row-actions-wide\s*\{[\s\S]*--xstudio-object-tree-action-gutter:/);
  assert.match(xstudioCss, /\.xstudio-object-tree-row:focus-within\s+\.xstudio-object-tree-visibility-action,[\s\S]*\.xstudio-object-tree-row:focus-within\s+\.xstudio-object-tree-quick-action,[\s\S]*opacity:\s*1;/);
  assert.match(xstudioCss, /\.xstudio-object-tree-row-selected\s+\.xstudio-object-tree-visibility-action,[\s\S]*\.xstudio-object-tree-row-selected\s+\.xstudio-object-tree-quick-action\s*\{[\s\S]*opacity:\s*1;/);
}

{
  const module = new XStudioModule(null);
  const longLabel = "deeply-nested-object-with-a-very-long-readable-label-and-useful-context";
  const target = {
    dom: document.createElement("div"),
    lastUpdate: null,
    update(data) {
      this.lastUpdate = data;
    }
  };
  const originalGetObject = XUI.getObject;
  XUI.getObject = id => id === "xstudio-object-tree-results" ? target : null;
  const moved = [];
  const duplicated = [];
  const visibility = [];
  module._apply_selected_canvas_highlight = () => "DOM unavailable";
  module._populate_selected_object_inspector_draft = () => {};
  module._log_selected_object_persisted_metadata = () => {};
  module._mark_selected_tree_row = rowId => {
    module._selected_tree_row_id = rowId;
  };
  module._update_selected_object_inspector = () => {};
  module._selected_object_sibling_context = () => ({
    _is_root: false,
    _previous_sibling_id: "previous-object",
    _next_sibling_id: "next-object"
  });
  module._selected_object_is_root_view = () => false;
  module._apply_object_tree_node_move = async (_node, direction) => {
    moved.push(direction);
  };
  module._request_object_tree_node_duplicate = node => {
    duplicated.push(node._meta._json_id);
  };
  module._apply_object_tree_node_visibility = async (node, action) => {
    visibility.push(`${action}:${node._meta._json_id}`);
  };

  try {
    const node = createTreeNode({
      id: "long-label",
      label: longLabel,
      depth: 2,
      type: "label",
      path: "$._children[0]"
    });
    module._render_object_tree_nodes([node]);
    const row = findView(
      { _children: target.lastUpdate._children },
      item => String(item.class ?? "").split(/\s+/g).includes("xstudio-object-tree-row")
    );
    const labelButton = findView(row, item => item._id?.endsWith("-label"));
    const actions = findView(row, item => item._id?.endsWith("-actions"));
    const moveUpButton = findView(row, item => item._id?.endsWith("-move-up"));
    const moveDownButton = findView(row, item => item._id?.endsWith("-move-down"));
    const duplicateButton = findView(row, item => item._id?.endsWith("-duplicate"));
    const visibilityButton = findView(row, item => item._id?.endsWith("-visibility"));
    assert.equal(row.title, longLabel);
    assert.equal(labelButton.title, longLabel);
    assert.equal(findView(labelButton, item => item.class === "xstudio-object-tree-label-primary").title, longLabel);
    assert.equal(String(actions.class ?? "").includes("xstudio-object-tree-actions"), true);
    assert.equal(moveUpButton.disabled, undefined);
    assert.equal(moveDownButton.disabled, undefined);
    assert.equal(duplicateButton.disabled, undefined);
    assert.equal(visibilityButton.title, `Hide ${longLabel}`);
    assert.equal(collectTexts(row).includes("Hidden"), false);
    const contentWidth = Number.parseInt(target.lastUpdate._style["--xstudio-object-tree-content-width"], 10);
    const expectedContentOnlyWidth = (2 * 14) + 24 + Math.min(720, Math.max(160, `${longLabel} long-label [label]`.length * 7)) + 16;
    assert.equal(contentWidth, expectedContentOnlyWidth);

    labelButton._on.click(makeEvent("click"));
    assert.equal(_xd.get("studio:selected_object")._json_id, "long-label");
    moveUpButton._on.click(makeEvent("click"));
    moveDownButton._on.click(makeEvent("click"));
    duplicateButton._on.click(makeEvent("click"));
    visibilityButton._on.click(makeEvent("click"));
    assert.deepEqual(moved, ["up", "down"]);
    assert.deepEqual(duplicated, ["long-label"]);
    assert.deepEqual(visibility, ["hide:long-label"]);
    target.dom.scrollLeft = 240;
    assert.equal(String(actions.class ?? "").includes("xstudio-object-tree-actions"), true);
  } finally {
    XUI.getObject = originalGetObject;
  }
}

{
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      {
        _id: "container",
        _type: "form",
        _children: []
      }
    ]
  };
  const harness = createAddObjectHarness({
    selectedId: "container",
    view,
    skills: {
      form: objectSkill({
        id: "form",
        allowed: true,
        acceptedTypes: ["label"],
        insertModes: ["inside", "before", "after"]
      })
    }
  });

  await harness.module._apply_add_object_from_palette_skill(paletteSkill("label"));

  assert.equal(harness.commands.length, 1);
  assert.equal(harness.commands[0].op, "apply-view-edit");
  assert.equal(harness.commands[0].params._edit_action, "add-child");
  assert.equal(harness.commands[0].params._target_id, "container");
  assert.equal(harness.commands[0].params._target_type, "form");
  assert.equal(harness.commands[0].params._before_id, undefined);
  assert.equal(harness.commands[0].params._after_id, undefined);
  assert.equal(harness.commands[0].params._child._type, "label");
}

{
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      {
        _id: "container",
        _type: "form",
        _children: [
          {
            _id: "leaf",
            _type: "button",
            _text: "Save"
          }
        ]
      }
    ]
  };
  const harness = createAddObjectHarness({
    selectedId: "leaf",
    view,
    skills: {
      form: objectSkill({
        id: "form",
        allowed: true,
        insertModes: ["inside", "before", "after"]
      }),
      button: objectSkill({
        id: "button",
        allowed: false,
        insertModes: ["before", "after"]
      })
    }
  });

  await harness.module._apply_add_object_from_palette_skill(paletteSkill("label"));

  assert.equal(harness.commands.length, 1);
  assert.equal(harness.commands[0].params._target_id, "container");
  assert.equal(harness.commands[0].params._after_id, "leaf");
  assert.equal(harness.commands[0].params._before_id, undefined);
}

{
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      {
        _id: "parent",
        _type: "limited-parent",
        _children: [
          {
            _id: "strict",
            _type: "strict-container",
            _children: []
          }
        ]
      }
    ]
  };
  const harness = createAddObjectHarness({
    selectedId: "strict",
    view,
    skills: {
      "limited-parent": objectSkill({
        id: "limited-parent",
        allowed: true,
        acceptedTypes: ["label"],
        insertModes: ["inside"]
      }),
      "strict-container": objectSkill({
        id: "strict-container",
        allowed: true,
        acceptedTypes: ["button"],
        insertModes: ["inside", "before", "after"]
      })
    }
  });

  await harness.module._apply_add_object_from_palette_skill(paletteSkill("label"));

  assert.equal(harness.commands.length, 1);
  assert.equal(harness.commands[0].params._target_id, "parent");
  assert.equal(harness.commands[0].params._target_type, "limited-parent");
  assert.equal(harness.commands[0].params._after_id, "strict");
  assert.equal(harness.commands[0].params._before_id, undefined);
}

{
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      {
        _id: "existing",
        _type: "label",
        _text: "Existing"
      }
    ]
  };
  const harness = createAddObjectHarness({
    view
  });

  await harness.module._apply_add_object_from_palette_skill(paletteSkill("label"));

  assert.equal(harness.commands.length, 1);
  assert.equal(harness.commands[0].params._target_id, "main");
  assert.equal(harness.commands[0].params._target_type, "view");
  assert.equal(harness.commands[0].params._after_id, undefined);
  assert.equal(harness.commands[0].params._before_id, undefined);
}

{
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      {
        _id: "container",
        _type: "form",
        _children: []
      }
    ]
  };
  const harness = createAddObjectHarness({
    selectedId: "container",
    view,
    skills: {
      form: objectSkill({
        id: "form",
        allowed: true,
        insertModes: ["inside", "before", "after"]
      })
    }
  });
  const selectedBefore = harness.module._selected_object;
  const selectedNode = harness.flatNodes().find(node => node._meta?._json_id === "container");

  await harness.module._apply_add_object_from_palette_skill(paletteSkill("label"));

  assert.equal(harness.module._selected_object._json_id, selectedBefore._json_id);
  assert.equal(harness.module._selected_object_pending_select_id, "");
  assert.equal(harness.module._object_tree_expanded_node_keys.has(selectedNode._node_key), true);
  assert.equal(harness.refreshes.length, 1);
  assert.equal(harness.treeRefreshes(), 2);
}

{
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      {
        _id: "container",
        _type: "form",
        _children: []
      }
    ]
  };
  const harness = createAddObjectHarness({
    selectedId: "container",
    view,
    skills: {
      form: objectSkill({
        id: "form",
        allowed: true,
        insertModes: ["inside", "before", "after"]
      })
    }
  });

  await harness.module._apply_add_object_from_palette_skill(paletteSkill("label"));

  assert.equal(harness.commands.length, 1);
  assert.equal(harness.commands.filter(command => command.op === "apply-view-edit").length, 1);
}

{
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      { _id: "root-a", _type: "label", _text: "A" },
      { _id: "root-b", _type: "button", _text: "B" },
      { _id: "root-c", _type: "image", src: "/c.png" }
    ]
  };
  const harness = createMoveObjectHarness(view);
  const rootB = harness.nodeById("root-b");

  await harness.module._apply_object_tree_node_move(rootB, "up");

  assert.deepEqual(harness.ids(), ["root-b", "root-a", "root-c"]);
  assert.equal(harness.commands.length, 1);
  assert.equal(harness.commands[0].params._target_id, "root-b");
  assert.equal(harness.commands[0].params._before_id, "root-a");
  assert.equal(harness.commands[0].params._after_id, undefined);
  assert.equal(harness.commands[0].params._child, undefined);
  assert.equal(harness.module._selected_object._json_id, "root-b");
  assert.equal(new Set(harness.ids()).size, 3);
  assert.equal(harness.refreshes.length, 1);
  assert.equal(harness.treeRefreshes(), 1);
}

{
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      { _id: "root-a", _type: "label", _text: "A" },
      { _id: "root-b", _type: "button", _text: "B" },
      { _id: "root-c", _type: "image", src: "/c.png" }
    ]
  };
  const harness = createMoveObjectHarness(view);
  const rootB = harness.nodeById("root-b");

  await harness.module._apply_object_tree_node_move(rootB, "down");

  assert.deepEqual(harness.ids(), ["root-a", "root-c", "root-b"]);
  assert.equal(harness.commands.length, 1);
  assert.equal(harness.commands[0].params._target_id, "root-b");
  assert.equal(harness.commands[0].params._before_id, undefined);
  assert.equal(harness.commands[0].params._after_id, "root-c");
  assert.equal(harness.commands[0].params._child, undefined);
  assert.equal(harness.module._selected_object._json_id, "root-b");
  assert.equal(new Set(harness.ids()).size, 3);
}

{
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      { _id: "root-a", _type: "label", _text: "A" },
      { _id: "root-b", _type: "button", _text: "B" },
      { _id: "root-c", _type: "image", src: "/c.png" }
    ]
  };
  const harness = createMoveObjectHarness(view);
  const rootA = harness.nodeById("root-a");
  const rootB = harness.nodeById("root-b");
  const rootC = harness.nodeById("root-c");

  assert.equal(harness.module._object_tree_node_can_move(rootA, "up"), false);
  assert.equal(harness.module._object_tree_node_can_move(rootA, "down"), true);
  assert.equal(harness.module._object_tree_node_can_move(rootB, "up"), true);
  assert.equal(harness.module._object_tree_node_can_move(rootB, "down"), true);
  assert.equal(harness.module._object_tree_node_can_move(rootC, "up"), true);
  assert.equal(harness.module._object_tree_node_can_move(rootC, "down"), false);
}

{
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      {
        _id: "container",
        _type: "view",
        _children: [
          { _id: "nested-a", _type: "label", _text: "A" },
          { _id: "nested-b", _type: "button", _text: "B" },
          { _id: "nested-c", _type: "label", _text: "C" }
        ]
      },
      { _id: "root-sibling", _type: "label", _text: "Root" }
    ]
  };
  const harness = createMoveObjectHarness(view);
  const nestedB = harness.nodeById("nested-b");

  await harness.module._apply_object_tree_node_move(nestedB, "up");

  assert.deepEqual(harness.ids(), ["container", "root-sibling"]);
  assert.deepEqual(harness.nestedIds("container"), ["nested-b", "nested-a", "nested-c"]);
  assert.equal(harness.commands.length, 1);
  assert.equal(harness.commands[0].params._target_id, "nested-b");
  assert.equal(harness.commands[0].params._before_id, "nested-a");
  assert.equal(harness.commands[0].params._after_id, undefined);
  assert.equal(new Set(harness.nestedIds("container")).size, 3);
}

{
  const view = {
    _id: "main",
    _type: "view",
    _children: [
      { _id: "root-a", _type: "label", _text: "A" },
      { _id: "root-b", _type: "button", _text: "B" },
      { _id: "root-c", _type: "image", src: "/c.png" }
    ]
  };
  const harness = createMoveObjectHarness(view);
  harness.module._selected_object = { ...harness.nodeById("root-b")._meta };

  await harness.module._move_selected_object("down");

  assert.deepEqual(harness.ids(), ["root-a", "root-c", "root-b"]);
  assert.equal(harness.commands.length, 1);
  assert.equal(harness.commands[0].params._target_id, "root-b");
  assert.equal(harness.commands[0].params._after_id, "root-c");
  assert.equal(harness.commands[0].params._child, undefined);
  assert.equal(harness.module._selected_object._json_id, "root-b");
  assert.equal(new Set(harness.ids()).size, 3);
}

{
  const module = new XStudioModule(null);
  const target = {
    dom: document.createElement("div"),
    lastUpdate: null,
    update(data) {
      this.lastUpdate = data;
    }
  };
  const originalGetObject = XUI.getObject;
  XUI.getObject = id => id === "xstudio-object-tree-results" ? target : null;

  try {
    const hiddenNode = createTreeNode({
      id: "records-section",
      label: "Records section",
      type: "section",
      path: "$._children[0]",
      parentPath: "$",
      visible: false
    });
    module._render_object_tree_nodes([hiddenNode]);
    const row = findView(
      { _children: target.lastUpdate._children },
      item => String(item.class ?? "").split(/\s+/g).includes("xstudio-object-tree-row")
    );
    const labelButton = findView(row, item => item._id?.endsWith("-label"));
    const visibilityButton = findView(row, item => item._id?.endsWith("-visibility"));
    const hiddenBadge = findView(row, item => String(item.class ?? "") === "xstudio-object-tree-hidden-tag");
    assert.equal(String(row.class ?? "").includes("xstudio-object-tree-row-hidden"), true);
    assert.equal(collectTexts(row).includes("Hidden"), true);
    assert.equal(hiddenBadge.title, "Records section is hidden");
    assert.equal(visibilityButton.title, "Show Records section");
  } finally {
    XUI.getObject = originalGetObject;
  }
}

{
  const module = new XStudioModule(null);
  const target = {
    dom: document.createElement("div"),
    lastUpdate: null,
    update(data) {
      this.lastUpdate = data;
    }
  };
  const originalGetObject = XUI.getObject;
  XUI.getObject = id => id === "xstudio-object-tree-results" ? target : null;

  try {
    let child = createTreeNode({
      id: "deep-12",
      label: "deep object",
      depth: 12,
      path: "$._children[0]._children[0]._children[0]._children[0]._children[0]._children[0]"
    });
    for (let depth = 11; depth >= 0; depth -= 1) {
      child = createTreeNode({
        id: `deep-${depth}`,
        label: `nested object ${depth}`,
        depth,
        path: depth === 0 ? "$" : `$._children[${depth}]`,
        children: [child]
      });
    }
    module._render_object_tree_nodes([child]);
    const widthValue = target.lastUpdate._style["--xstudio-object-tree-content-width"];
    assert.equal(widthValue.endsWith("px"), true);
    assert.equal(Number.parseInt(widthValue, 10) > 360, true);
  } finally {
    XUI.getObject = originalGetObject;
  }
}

{
  const panelButton = findView(xstudioShellView, item => item._id === "xstudio-object-tree-picker-toggle");
  const panelArrangeButton = findView(xstudioShellView, item => item._id === "xstudio-object-tree-arrange-toggle");
  const appExplorerPortlet = findView(xstudioShellView, item => item._id === "xstudio-app-explorer-portlet");
  const objectTreePortlet = findView(xstudioShellView, item => item._id === "xstudio-object-tree-portlet");
  const objectTreeBody = findView(xstudioShellView, item => item._id === "xstudio-object-tree-body");
  const objectTreeActions = findView(objectTreePortlet, item =>
    String(item.class ?? "").split(/\s+/g).includes("xstudio-explorer-section-actions") &&
    viewContainsId(item, "xstudio-object-tree-picker-toggle") &&
    viewContainsId(item, "xstudio-object-tree-arrange-toggle")
  );
  assert.equal(panelButton?._type, "button");
  assert.equal(panelButton.title, "Select object from canvas (⌘⇧C)");
  assert.equal(panelButton["aria-label"], "Select object from canvas (⌘⇧C)");
  assert.equal(panelButton["aria-pressed"], "false");
  assert.equal(panelButton._on.click._params.event, "studio:object-picker-toggle");
  assert.equal(panelArrangeButton?._type, "button");
  assert.equal(panelArrangeButton.title, "Arrange objects");
  assert.equal(panelArrangeButton["aria-label"], "Arrange objects");
  assert.equal(panelArrangeButton["aria-pressed"], "false");
  assert.equal(panelArrangeButton._on.click._params.event, "studio:arrange-toggle");
  assert.equal(Boolean(objectTreeActions), true);
  assert.equal(viewContainsId(objectTreePortlet, "xstudio-object-tree-picker-toggle"), true);
  assert.equal(viewContainsId(objectTreePortlet, "xstudio-object-tree-arrange-toggle"), true);
  assert.equal(viewContainsId(appExplorerPortlet, "xstudio-object-tree-picker-toggle"), false);
  assert.equal(viewContainsId(appExplorerPortlet, "xstudio-object-tree-arrange-toggle"), false);
  assert.equal(viewContainsId(objectTreeBody, "xstudio-object-tree-picker-toggle"), false);
  assert.equal(viewContainsId(objectTreeBody, "xstudio-object-tree-arrange-toggle"), false);
  assert.equal(countViews(objectTreePortlet, item => item?._id === "xstudio-object-tree-picker-toggle"), 1);
  assert.equal(countViews(objectTreePortlet, item => item?._id === "xstudio-object-tree-arrange-toggle"), 1);
  assert.equal(countViews(xstudioShellView, item => item?._id === "xstudio-object-tree-picker-toggle"), 1);
  assert.equal(countViews(xstudioShellView, item => item?._id === "xstudio-object-tree-arrange-toggle"), 1);
  assert.match(String(panelButton.class ?? ""), /xstudio-icon-button/);
  assert.match(String(panelArrangeButton.class ?? ""), /xstudio-icon-button/);
  assert.equal(findView(panelButton, item => item._type === "svg") !== null, true);
  assert.equal(findView(panelArrangeButton, item => item._type === "svg") !== null, true);

  const rerenderedShell = new XStudioModule(null)._studio_shell_view("xstudio-main-container-test");
  const rerenderedAppExplorer = findView(rerenderedShell, item => item._id === "xstudio-app-explorer-portlet");
  const rerenderedObjectTree = findView(rerenderedShell, item => item._id === "xstudio-object-tree-portlet");
  assert.equal(viewContainsId(rerenderedObjectTree, "xstudio-object-tree-picker-toggle"), true);
  assert.equal(viewContainsId(rerenderedObjectTree, "xstudio-object-tree-arrange-toggle"), true);
  assert.equal(viewContainsId(rerenderedAppExplorer, "xstudio-object-tree-picker-toggle"), false);
  assert.equal(viewContainsId(rerenderedAppExplorer, "xstudio-object-tree-arrange-toggle"), false);
  assert.equal(countViews(rerenderedShell, item => item?._id === "xstudio-object-tree-picker-toggle"), 1);
  assert.equal(countViews(rerenderedShell, item => item?._id === "xstudio-object-tree-arrange-toggle"), 1);
}

{
  const arrangeButton = findView(xstudioTopbarView, item => item._id === "xstudio-arrange-toggle");
  assert.equal(arrangeButton?._type, "button");
  assert.equal(arrangeButton.title, "Arrange objects");
  assert.equal(arrangeButton["aria-label"], "Arrange objects");
  assert.equal(arrangeButton["aria-pressed"], "false");
  assert.equal(arrangeButton._on.click._params.event, "studio:arrange-toggle");
  assert.match(String(arrangeButton.class ?? ""), /xstudio-icon-button/);
  assert.equal(findView(arrangeButton, item => item._type === "svg") !== null, true);
  assert.equal(countViews(xstudioTopbarView, item => item?._id === "xstudio-arrange-toggle"), 1);
  assert.equal(xstudioBundle.includes("xstudio-arrange-toggle"), true);
  assert.equal(xstudioBundle.includes("xstudio-object-tree-arrange-toggle"), true);
  assert.equal(xstudioBundle.includes("Arrange objects"), true);

  const rerenderedTopbar = new XStudioModule(null)._resolve_studio_view("xstudio-topbar");
  const rerenderedArrangeButton = findView(rerenderedTopbar, item => item._id === "xstudio-arrange-toggle");
  assert.equal(rerenderedArrangeButton.title, "Arrange objects");
  assert.equal(rerenderedArrangeButton["aria-pressed"], "false");
}

{
  const harness = createPickerHarness();
  const shellPanelButton = findView(xstudioShellView, item => item._id === "xstudio-object-tree-picker-toggle");
  const panelButtonListener = _xem.on(shellPanelButton._on.click._params.event, () => {
    harness.module._toggle_object_picker();
  });
  try {
    _xem.fire(shellPanelButton._on.click._params.event);
    assert.equal(harness.module._object_picker_active, true);
    assert.equal(harness.shell.classList.contains("xstudio-object-picker-active"), true);
    assert.equal(harness.pickerButton.classList.contains("xstudio-object-picker-toggle-active"), true);
    assert.equal(harness.panelPickerButton.classList.contains("xstudio-object-picker-toggle-active"), true);
    assert.equal(harness.pickerButton.getAttribute("aria-pressed"), "true");
    assert.equal(harness.panelPickerButton.getAttribute("aria-pressed"), "true");
    assert.equal(harness.panelPickerButton.getAttribute("title"), "Select object from canvas (⌘⇧C)");
    assert.equal(harness.panelPickerButton.getAttribute("aria-label"), "Select object from canvas (⌘⇧C)");

    _xem.fire(shellPanelButton._on.click._params.event);
    assert.equal(harness.module._object_picker_active, false);
    assert.equal(harness.pickerButton.getAttribute("aria-pressed"), "false");
    assert.equal(harness.panelPickerButton.getAttribute("aria-pressed"), "false");
  } finally {
    _xem.remove(panelButtonListener);
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  const arrangeButtonView = findView(xstudioTopbarView, item => item._id === "xstudio-arrange-toggle");
  const arrangeListener = _xem.on(arrangeButtonView._on.click._params.event, () => {
    harness.module._toggle_arrange_mode();
  });
  try {
    _xem.fire(arrangeButtonView._on.click._params.event);
    assert.equal(harness.module._arrange_mode_active, true);
    assert.equal(harness.shell.classList.contains("xstudio-arrange-active"), true);
    assert.equal(document.body.classList.contains("xstudio-arrange-active"), true);
    assert.equal(harness.arrangeButton.classList.contains("xstudio-arrange-toggle-active"), true);
    assert.equal(harness.panelArrangeButton.classList.contains("xstudio-arrange-toggle-active"), true);
    assert.equal(harness.arrangeButton.getAttribute("aria-pressed"), "true");
    assert.equal(harness.panelArrangeButton.getAttribute("aria-pressed"), "true");
    assert.equal(harness.arrangeButton.getAttribute("title"), "Arrange objects");
    assert.equal(harness.arrangeButton.getAttribute("aria-label"), "Arrange objects");
    assert.equal(harness.panelArrangeButton.getAttribute("title"), "Arrange objects");
    assert.equal(harness.panelArrangeButton.getAttribute("aria-label"), "Arrange objects");

    _xem.fire(arrangeButtonView._on.click._params.event);
    assert.equal(harness.module._arrange_mode_active, false);
    assert.equal(harness.arrangeButton.classList.contains("xstudio-arrange-toggle-active"), false);
    assert.equal(harness.panelArrangeButton.classList.contains("xstudio-arrange-toggle-active"), false);
    assert.equal(harness.arrangeButton.getAttribute("aria-pressed"), "false");
    assert.equal(harness.panelArrangeButton.getAttribute("aria-pressed"), "false");
  } finally {
    _xem.remove(arrangeListener);
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  const shellArrangeButton = findView(xstudioShellView, item => item._id === "xstudio-object-tree-arrange-toggle");
  const arrangeListener = _xem.on(shellArrangeButton._on.click._params.event, () => {
    harness.module._toggle_arrange_mode();
  });
  try {
    _xem.fire(shellArrangeButton._on.click._params.event);
    assert.equal(harness.module._arrange_mode_active, true);
    assert.equal(harness.arrangeButton.classList.contains("xstudio-arrange-toggle-active"), true);
    assert.equal(harness.panelArrangeButton.classList.contains("xstudio-arrange-toggle-active"), true);
    assert.equal(harness.arrangeButton.getAttribute("aria-pressed"), "true");
    assert.equal(harness.panelArrangeButton.getAttribute("aria-pressed"), "true");

    _xem.fire(shellArrangeButton._on.click._params.event);
    assert.equal(harness.module._arrange_mode_active, false);
    assert.equal(harness.arrangeButton.classList.contains("xstudio-arrange-toggle-active"), false);
    assert.equal(harness.panelArrangeButton.classList.contains("xstudio-arrange-toggle-active"), false);
  } finally {
    _xem.remove(arrangeListener);
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    harness.module._set_arrange_mode_active(true);
    assert.equal(harness.module._arrange_mode_active, true);
    harness.module._set_object_picker_active(true);
    assert.equal(harness.module._object_picker_active, true);
    assert.equal(harness.module._arrange_mode_active, false);
    assert.equal(harness.arrangeButton.classList.contains("xstudio-arrange-toggle-active"), false);
    assert.equal(harness.panelArrangeButton.classList.contains("xstudio-arrange-toggle-active"), false);
    assert.equal(harness.pickerButton.classList.contains("xstudio-object-picker-toggle-active"), true);
    assert.equal(harness.panelPickerButton.classList.contains("xstudio-object-picker-toggle-active"), true);
    harness.module._set_arrange_mode_active(true);
    assert.equal(harness.module._arrange_mode_active, true);
    assert.equal(harness.module._object_picker_active, false);
    assert.equal(harness.arrangeButton.classList.contains("xstudio-arrange-toggle-active"), true);
    assert.equal(harness.panelArrangeButton.classList.contains("xstudio-arrange-toggle-active"), true);
    assert.equal(harness.pickerButton.classList.contains("xstudio-object-picker-toggle-active"), false);
    assert.equal(harness.panelPickerButton.classList.contains("xstudio-object-picker-toggle-active"), false);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    harness.module.register_shortcuts();
    assert.equal((documentListeners.get("keydown") ?? []).length, 1);
    harness.module.register_shortcuts();
    assert.equal((documentListeners.get("keydown") ?? []).length, 1);

    document.dispatchEvent(makeEvent("keydown", {
      key: "C",
      shiftKey: true,
      metaKey: true,
      ctrlKey: false
    }));
    assert.equal(harness.module._object_picker_active, true);
    assert.equal(harness.panelPickerButton.classList.contains("xstudio-object-picker-toggle-active"), true);
    assert.equal(harness.panelPickerButton.getAttribute("aria-pressed"), "true");

    document.dispatchEvent(makeEvent("keydown", { key: "Escape" }));
    assert.equal(harness.module._object_picker_active, false);
    assert.equal(harness.panelPickerButton.classList.contains("xstudio-object-picker-toggle-active"), false);
    assert.equal(harness.panelPickerButton.getAttribute("aria-pressed"), "false");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    harness.module.register_shortcuts();
    harness.module._set_arrange_mode_active(true);
    assert.equal(harness.module._arrange_mode_active, true);
    assert.equal(harness.arrangeButton.classList.contains("xstudio-arrange-toggle-active"), true);
    assert.equal(harness.panelArrangeButton.classList.contains("xstudio-arrange-toggle-active"), true);
    assert.equal(harness.arrangeButton.getAttribute("aria-pressed"), "true");
    assert.equal(harness.panelArrangeButton.getAttribute("aria-pressed"), "true");

    document.dispatchEvent(makeEvent("keydown", { key: "Escape" }));
    assert.equal(harness.module._arrange_mode_active, false);
    assert.equal(harness.arrangeButton.classList.contains("xstudio-arrange-toggle-active"), false);
    assert.equal(harness.panelArrangeButton.classList.contains("xstudio-arrange-toggle-active"), false);
    assert.equal(harness.arrangeButton.getAttribute("aria-pressed"), "false");
    assert.equal(harness.panelArrangeButton.getAttribute("aria-pressed"), "false");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    const resolvedButton = harness.module._resolve_picker_dom_target(harness.buttonText);
    assert.equal(resolvedButton._id, "primary-button");
    assert.equal(resolvedButton._type, "button");

    const resolvedImage = harness.module._resolve_picker_dom_target(harness.image);
    assert.equal(resolvedImage._id, "hero-image");
    assert.equal(resolvedImage._type, "image");

    const resolvedCard = harness.module._resolve_picker_dom_target(harness.nativeText);
    assert.equal(resolvedCard._id, "card-main");
    assert.equal(resolvedCard._type, "view");

    const ignored = harness.module._resolve_picker_dom_target(harness.pickerButton);
    assert.equal(ignored, null);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({ includeSemanticDomObject: true });
  try {
    const resolvedSemantic = harness.module._resolve_picker_dom_target(harness.semanticInner);
    assert.equal(resolvedSemantic._id, "semantic-panel");
    assert.equal(resolvedSemantic._type, "panel");
    assert.equal(resolvedSemantic._element, harness.semanticRoot);

    harness.module._set_arrange_mode_active(true);
    const source = harness.module._resolve_arrange_drag_source(harness.semanticInner);
    assert.equal(source._ok, true);
    assert.equal(source._id, "semantic-panel");
    assert.equal(source._resolved._element, harness.semanticRoot);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    harness.module._set_object_picker_active(true);
    harness.canvas.dispatchEvent(makeEvent("pointermove", {
      pointerId: 1,
      target: harness.buttonText
    }));
    const overlay = document.getElementById("xstudio-object-picker-overlay");
    const label = document.getElementById("xstudio-object-picker-label");
    assert.equal(overlay instanceof HTMLElement, true);
    assert.equal(label.textContent, "primary-button [button]");
    assert.equal(overlay.getAttribute("aria-hidden"), "true");
    assert.equal(overlay.style.getPropertyValue("pointer-events"), "");
    assert.match(xstudioCss, /\.xstudio-object-picker-overlay\s*\{[\s\S]*pointer-events:\s*none;/);

    harness.canvas.dispatchEvent(makeEvent("pointermove", {
      pointerId: 1,
      target: harness.canvas
    }));
    assert.equal(document.getElementById("xstudio-object-picker-overlay"), null);
    assert.equal(document.getElementById("xstudio-object-picker-label"), null);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  let appClickCount = 0;
  try {
    harness.module._set_object_picker_active(true);
    harness.canvas.addEventListener("click", () => {
      appClickCount += 1;
    });
    const event = makeEvent("click", {
      target: harness.buttonText
    });
    harness.canvas.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(event.immediatePropagationStopped, true);
    assert.equal(appClickCount, 0);
    assert.equal(harness.module._object_picker_active, false);
    assert.equal(_xd.get("studio:selected_object")._json_id, "primary-button");
    assert.equal(harness.button.classList.contains("xstudio-selected-object"), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    const root = harness.module._object_tree_nodes[0];
    const cardNode = root._children[0];
    const buttonNode = cardNode._children[0];
    harness.module._object_tree_expanded_node_keys.clear();
    const rowId = harness.module._reveal_object_tree_node(buttonNode, {
      _rerender: true,
      _highlight: true
    });
    assert.equal(harness.module._object_tree_expanded_node_keys.has(root._node_key), true);
    assert.equal(harness.module._object_tree_expanded_node_keys.has(cardNode._node_key), true);
    const row = document.getElementById(rowId);
    assert.equal(row instanceof HTMLElement, true);
    assert.deepEqual(row._scrolledIntoView, { block: "nearest", inline: "nearest" });
    assert.equal(row.classList.contains("xstudio-object-tree-row-reveal"), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    harness.module._set_object_picker_active(true);
    harness.module._set_object_picker_active(true);
    assert.equal((harness.canvas._listeners.get("click") ?? []).length, 1);
    assert.equal((harness.canvas._listeners.get("pointermove") ?? []).length, 1);
    harness.canvas.dispatchEvent(makeEvent("pointermove", {
      pointerId: 2,
      target: harness.image
    }));
    assert.equal(document.getElementById("xstudio-object-picker-overlay") instanceof HTMLElement, true);
    harness.module.handle_xvm_update({});
    assert.equal(harness.module._object_picker_active, false);
    assert.equal(document.getElementById("xstudio-object-picker-overlay"), null);
    assert.equal(harness.panelPickerButton.getAttribute("aria-pressed"), "false");
    assert.equal((harness.canvas._listeners.get("click") ?? []).length, 0);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    harness.module._set_arrange_mode_active(true);
    const source = harness.module._resolve_arrange_drag_source(harness.buttonText);
    assert.equal(source._ok, true);
    assert.equal(source._id, "primary-button");
    assert.equal(source._type, "button");
    assert.equal(source._node._meta._path, "$._children[0]._children[0]");

    const ignoredChrome = harness.module._resolve_arrange_drag_source(harness.pickerButton);
    assert.equal(ignoredChrome._ok, false);
    assert.equal(ignoredChrome._reason, "no-source");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  let appClickCount = 0;
  try {
    harness.module._send_xvibe_command = async () => {
      throw new Error("Arrange phase 1 must not mutate views");
    };
    harness.module._set_arrange_mode_active(true);
    harness.canvas.addEventListener("click", () => {
      appClickCount += 1;
    });
    const event = makeEvent("click", {
      target: harness.buttonText
    });
    harness.canvas.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(event.immediatePropagationStopped, true);
    assert.equal(appClickCount, 0);
    assert.equal(harness.module._arrange_mode_active, true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    harness.module._resolve_selected_object_skill = type => ({
      view: objectSkill({
        id: "view",
        allowed: true,
        acceptedTypes: ["button"],
        insertModes: ["inside", "before", "after"]
      }),
      button: objectSkill({
        id: "button",
        allowed: false,
        insertModes: ["before", "after"]
      }),
      image: objectSkill({
        id: "image",
        allowed: false,
        insertModes: ["before", "after"]
      })
    }[type] ?? null);

    const cardNode = harness.module._find_object_tree_node_by_object_id("card-main");
    const buttonNode = harness.module._find_object_tree_node_by_object_id("primary-button");
    const imageNode = harness.module._find_object_tree_node_by_object_id("hero-image");

    const accepted = harness.module._validate_arrange_drop(buttonNode, cardNode, "inside");
    assert.equal(accepted._ok, true);
    assert.equal(accepted._mode, "inside");
    assert.equal(accepted._source_id, "primary-button");
    assert.equal(accepted._parent_node._meta._json_id, "card-main");

    const rejected = harness.module._validate_arrange_drop(imageNode, cardNode, "inside");
    assert.equal(rejected._ok, false);
    assert.equal(rejected._reason, "rejected-child-type");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    harness.module._resolve_selected_object_skill = type => ({
      view: objectSkill({
        id: "view",
        allowed: true,
        acceptedTypes: ["button"],
        insertModes: ["before", "after"]
      }),
      button: objectSkill({
        id: "button",
        allowed: false,
        insertModes: ["before", "after"]
      }),
      image: objectSkill({
        id: "image",
        allowed: false,
        insertModes: ["after"]
      })
    }[type] ?? null);

    const cardNode = harness.module._find_object_tree_node_by_object_id("card-main");
    const buttonNode = harness.module._find_object_tree_node_by_object_id("primary-button");
    const imageNode = harness.module._find_object_tree_node_by_object_id("hero-image");

    const rejectedInside = harness.module._validate_arrange_drop(buttonNode, cardNode, "inside");
    assert.equal(rejectedInside._ok, false);
    assert.equal(rejectedInside._reason, "insert-mode-not-allowed");

    const rejectedBefore = harness.module._validate_arrange_drop(buttonNode, imageNode, "before");
    assert.equal(rejectedBefore._ok, false);
    assert.equal(rejectedBefore._reason, "insert-mode-not-allowed");

    const acceptedAfter = harness.module._validate_arrange_drop(buttonNode, imageNode, "after");
    assert.equal(acceptedAfter._ok, true);
    assert.equal(acceptedAfter._mode, "after");
    assert.equal(acceptedAfter._parent_node._meta._json_id, "card-main");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    harness.module._resolve_selected_object_skill = type => type === "view"
      ? objectSkill({
        id: "view",
        allowed: true,
        acceptedTypes: ["button"],
        insertModes: ["inside"]
      })
      : objectSkill({
        id: type,
        allowed: false,
        insertModes: ["before", "after"]
      });

    const rootNode = harness.module._object_tree_nodes[0];
    const buttonNode = harness.module._find_object_tree_node_by_object_id("primary-button");
    const rootDrop = harness.module._validate_arrange_drop(buttonNode, rootNode, "inside");
    assert.equal(rootDrop._ok, true);
    assert.equal(rootDrop._target_id, "main");
    assert.equal(rootDrop._parent_node._meta._path, "$");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    harness.module._resolve_selected_object_skill = type => objectSkill({
      id: type,
      allowed: type === "view",
      acceptedTypes: ["*"],
      insertModes: ["inside", "before", "after"]
    });

    const cardNode = harness.module._find_object_tree_node_by_object_id("card-main");
    const buttonNode = harness.module._find_object_tree_node_by_object_id("primary-button");
    const cycle = harness.module._validate_arrange_drop(cardNode, buttonNode, "inside");
    assert.equal(cycle._ok, false);
    assert.equal(cycle._reason, "cycle");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness();
  try {
    harness.module._set_arrange_mode_active(true);
    assert.equal(harness.module._arrange_mode_active, true);
    assert.equal(harness.shell.classList.contains("xstudio-arrange-active"), true);
    assert.equal(document.body.classList.contains("xstudio-arrange-active"), true);
    assert.equal(harness.arrangeButton.classList.contains("xstudio-arrange-toggle-active"), true);
    assert.equal(harness.panelArrangeButton.classList.contains("xstudio-arrange-toggle-active"), true);
    assert.equal((harness.canvas._listeners.get("pointerdown") ?? []).length, 1);

    harness.canvas.dispatchEvent(makeEvent("pointerdown", {
      button: 0,
      pointerId: 31,
      target: harness.buttonText
    }));
    assert.equal(harness.canvas.hasPointerCapture(31), true);
    assert.equal(harness.module._arrange_drag_source._ok, true);

    harness.canvas.dispatchEvent(makeEvent("pointercancel", {
      pointerId: 31,
      target: harness.buttonText
    }));
    assert.equal(harness.canvas.hasPointerCapture(31), false);
    assert.equal(harness.module._arrange_drag_source, null);
    assert.equal(harness.module._arrange_mode_active, true);

    harness.module.handle_xvm_update({});
    assert.equal(harness.module._arrange_mode_active, false);
    assert.equal(harness.shell.classList.contains("xstudio-arrange-active"), false);
    assert.equal(document.body.classList.contains("xstudio-arrange-active"), false);
    assert.equal(harness.arrangeButton.classList.contains("xstudio-arrange-toggle-active"), false);
    assert.equal(harness.panelArrangeButton.classList.contains("xstudio-arrange-toggle-active"), false);
    assert.equal(harness.arrangeButton.getAttribute("aria-pressed"), "false");
    assert.equal(harness.panelArrangeButton.getAttribute("aria-pressed"), "false");
    assert.equal((harness.canvas._listeners.get("pointerdown") ?? []).length, 0);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  try {
    harness.module._set_arrange_mode_active(true);
    harness.canvas.dispatchEvent(makeEvent("pointerdown", {
      button: 0,
      pointerId: 41,
      clientX: 60,
      clientY: 82,
      target: harness.buttonText
    }));
    harness.canvas.dispatchEvent(makeEvent("pointermove", {
      pointerId: 41,
      clientX: 62,
      clientY: 84,
      target: harness.image
    }));
    assert.equal(harness.module._arrange_dragging, false);
    assert.equal(document.getElementById("xstudio-arrange-indicator").style.getPropertyValue("display"), "none");

    harness.canvas.dispatchEvent(makeEvent("pointermove", {
      pointerId: 41,
      clientX: 190,
      clientY: 136,
      target: harness.image
    }));
    assert.equal(harness.module._arrange_dragging, true);
    assert.equal(document.getElementById("xstudio-arrange-indicator").style.getPropertyValue("display"), "block");
    assert.equal(arrange.commands.length, 0);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  installArrangeMoveHarness(harness);
  try {
    harness.module._set_arrange_mode_active(true);
    const sourceNode = harness.module._find_object_tree_node_by_object_id("primary-button");

    const beforePreview = harness.module._resolve_arrange_drop_preview(makeEvent("pointermove", {
      clientX: 190,
      clientY: 75,
      target: harness.image
    }), sourceNode);
    assert.equal(beforePreview._mode, "before");
    assert.equal(beforePreview._validation._ok, true);

    const insidePreview = harness.module._resolve_arrange_drop_preview(makeEvent("pointermove", {
      clientX: 80,
      clientY: 112,
      target: harness.card
    }), sourceNode);
    assert.equal(insidePreview._mode, "inside");
    assert.equal(insidePreview._validation._ok, true);

    const afterPreview = harness.module._resolve_arrange_drop_preview(makeEvent("pointermove", {
      clientX: 190,
      clientY: 136,
      target: harness.image
    }), sourceNode);
    assert.equal(afterPreview._mode, "after");
    assert.equal(afterPreview._validation._ok, true);

    const invalidInsideLeaf = harness.module._resolve_arrange_drop_preview(makeEvent("pointermove", {
      clientX: 190,
      clientY: 104,
      target: harness.image
    }), sourceNode);
    assert.equal(invalidInsideLeaf._mode, "inside");
    assert.equal(invalidInsideLeaf._validation._ok, false);
    assert.equal(invalidInsideLeaf._validation._reason, "children-disallowed");

    harness.module._show_arrange_drop_preview(afterPreview);
    assert.equal(document.getElementById("xstudio-arrange-overlay").classList.contains("xstudio-arrange-overlay-valid"), true);
    harness.module._show_arrange_drop_preview(invalidInsideLeaf);
    assert.equal(document.getElementById("xstudio-arrange-overlay").classList.contains("xstudio-arrange-overlay-invalid"), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  try {
    harness.module._set_arrange_mode_active(true);
    harness.module._set_arrange_mode_active(true);
    assert.equal((harness.canvas._listeners.get("pointerdown") ?? []).length, 1);
    assert.equal((harness.canvas._listeners.get("pointermove") ?? []).length, 1);

    harness.canvas.dispatchEvent(makeEvent("pointerdown", {
      button: 0,
      pointerId: 51,
      clientX: 60,
      clientY: 82,
      target: harness.buttonText
    }));
    assert.equal(harness.canvas.hasPointerCapture(51), true);
    harness.canvas.dispatchEvent(makeEvent("pointermove", {
      pointerId: 51,
      clientX: 190,
      clientY: 136,
      target: harness.image
    }));
    harness.canvas.dispatchEvent(makeEvent("pointerup", {
      pointerId: 51,
      clientX: 190,
      clientY: 136,
      target: harness.image
    }));
    await flushAsync();

    assert.equal(harness.canvas.hasPointerCapture(51), false);
    assert.deepEqual(arrange.cardIds(), ["hero-image", "primary-button"]);
    assert.equal(arrange.commands.length, 1);
    assert.equal(arrange.commands[0].params._edit_action, "move-object");
    assert.equal(arrange.commands[0].params._target_id, "primary-button");
    assert.equal(arrange.commands[0].params._target_parent_id, "card-main");
    assert.equal(arrange.commands[0].params._after_id, "hero-image");
    assert.equal(arrange.commands[0].params._before_id, undefined);
    assert.equal(arrange.countId("primary-button"), 1);
    assert.equal(harness.module._selected_object?._json_id, "primary-button");
    assert.equal(arrange.refreshes.length, 1);
    assert.equal(harness.module._arrange_mode_active, true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  try {
    harness.module._set_arrange_mode_active(true);
    harness.canvas.dispatchEvent(makeEvent("pointerdown", {
      button: 0,
      pointerId: 52,
      clientX: 40,
      clientY: 226,
      target: harness.footerLabel
    }));
    harness.canvas.dispatchEvent(makeEvent("pointermove", {
      pointerId: 52,
      clientX: 80,
      clientY: 112,
      target: harness.card
    }));
    harness.canvas.dispatchEvent(makeEvent("pointerup", {
      pointerId: 52,
      clientX: 80,
      clientY: 112,
      target: harness.card
    }));
    await flushAsync();

    assert.deepEqual(arrange.rootIds(), ["card-main"]);
    assert.deepEqual(arrange.cardIds(), ["primary-button", "hero-image", "footer-label"]);
    assert.equal(arrange.commands.length, 1);
    assert.equal(arrange.commands[0].params._target_id, "footer-label");
    assert.equal(arrange.commands[0].params._target_parent_id, "card-main");
    assert.equal(arrange.commands[0].params._move_position, "inside");
    assert.equal(arrange.commands[0].params._before_id, undefined);
    assert.equal(arrange.commands[0].params._after_id, undefined);
    assert.equal(arrange.countId("footer-label"), 1);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  try {
    harness.module._set_arrange_mode_active(true);
    harness.canvas.dispatchEvent(makeEvent("pointerdown", {
      button: 0,
      pointerId: 53,
      clientX: 60,
      clientY: 82,
      target: harness.buttonText
    }));
    harness.canvas.dispatchEvent(makeEvent("pointermove", {
      pointerId: 53,
      clientX: 44,
      clientY: 42,
      target: harness.card
    }));
    harness.canvas.dispatchEvent(makeEvent("pointerup", {
      pointerId: 53,
      clientX: 44,
      clientY: 42,
      target: harness.card
    }));
    await flushAsync();

    assert.deepEqual(arrange.rootIds(), ["primary-button", "card-main", "footer-label"]);
    assert.deepEqual(arrange.cardIds(), ["hero-image"]);
    assert.equal(arrange.commands.length, 1);
    assert.equal(arrange.commands[0].params._target_id, "primary-button");
    assert.equal(arrange.commands[0].params._target_parent_id, "main");
    assert.equal(arrange.commands[0].params._before_id, "card-main");
    assert.equal(arrange.commands[0].params._after_id, undefined);
    assert.equal(arrange.countId("primary-button"), 1);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  const beforeRootIds = arrange.rootIds().join(",");
  const beforeCardIds = arrange.cardIds().join(",");
  try {
    harness.module._set_arrange_mode_active(true);
    harness.canvas.dispatchEvent(makeEvent("pointerdown", {
      button: 0,
      pointerId: 54,
      clientX: 60,
      clientY: 82,
      target: harness.buttonText
    }));
    harness.canvas.dispatchEvent(makeEvent("pointermove", {
      pointerId: 54,
      clientX: 190,
      clientY: 104,
      target: harness.image
    }));
    harness.canvas.dispatchEvent(makeEvent("pointercancel", {
      pointerId: 54,
      clientX: 190,
      clientY: 104,
      target: harness.image
    }));
    await flushAsync();

    assert.equal(arrange.rootIds().join(","), beforeRootIds);
    assert.equal(arrange.cardIds().join(","), beforeCardIds);
    assert.equal(arrange.commands.length, 0);
    assert.equal(document.getElementById("xstudio-arrange-overlay"), null);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  try {
    harness.module._set_arrange_mode_active(true);
    harness.canvas.dispatchEvent(makeEvent("pointerdown", {
      button: 0,
      pointerId: 55,
      clientX: 60,
      clientY: 82,
      target: harness.buttonText
    }));
    harness.canvas.dispatchEvent(makeEvent("pointermove", {
      pointerId: 55,
      clientX: 190,
      clientY: 104,
      target: harness.image
    }));
    harness.canvas.dispatchEvent(makeEvent("pointerup", {
      pointerId: 55,
      clientX: 190,
      clientY: 104,
      target: harness.image
    }));
    await flushAsync();

    assert.deepEqual(arrange.cardIds(), ["primary-button", "hero-image"]);
    assert.equal(arrange.commands.length, 0);
    assert.equal(arrange.statuses.some(status => String(status).includes("Destination rejects children")), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  try {
    harness.module._set_arrange_mode_active(true);
    harness.canvas.dispatchEvent(makeEvent("pointerdown", {
      button: 0,
      pointerId: 56,
      clientX: 44,
      clientY: 52,
      target: harness.card
    }));
    harness.canvas.dispatchEvent(makeEvent("pointermove", {
      pointerId: 56,
      clientX: 60,
      clientY: 82,
      target: harness.buttonText
    }));
    harness.canvas.dispatchEvent(makeEvent("pointerup", {
      pointerId: 56,
      clientX: 60,
      clientY: 82,
      target: harness.buttonText
    }));
    await flushAsync();

    assert.deepEqual(arrange.rootIds(), ["card-main", "footer-label"]);
    assert.deepEqual(arrange.cardIds(), ["primary-button", "hero-image"]);
    assert.equal(arrange.commands.length, 0);
    assert.equal(arrange.statuses.some(status => String(status).includes("Cannot move an object into its own descendants")), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  installArrangeMoveHarness(harness);
  try {
    harness.module._render_object_tree_nodes(harness.module._object_tree_nodes);
    const rendered = harness.objects["xstudio-object-tree-results"].lastUpdate;
    const primaryHandle = findView(rendered, item =>
      String(item._id ?? "").endsWith("-drag-handle") &&
      String(item["aria-label"] ?? "").startsWith("Move ") &&
      item.disabled !== true
    );
    const rootHandle = findView(rendered, item => String(item._id ?? "").endsWith("-drag-handle") && item["aria-label"] === "Object cannot be moved");
    const moveUpButton = findView(rendered, item => String(item._id ?? "").endsWith("-move-up"));
    const moveDownButton = findView(rendered, item => String(item._id ?? "").endsWith("-move-down"));
    assert.equal(primaryHandle?._type, "button");
    assert.match(primaryHandle["aria-label"], /^Move /);
    assert.equal(primaryHandle.disabled, undefined);
    assert.equal(rootHandle?.disabled, true);
    assert.equal(moveUpButton?._type, "button");
    assert.equal(moveDownButton?._type, "button");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  const originalCard = harness.view._children[0];
  try {
    startObjectTreeDrag(harness, "card-main", { pointerId: 201 });
    const { row: footerRow } = objectTreeRowById(harness, "footer-label");
    moveObjectTreeDragTo(footerRow, { pointerId: 201, clientY: footerRow.getBoundingClientRect().bottom - 1 });
    assert.equal(footerRow.classList.contains("xstudio-object-tree-row-drop-after"), true);
    dropObjectTreeDragOn(footerRow, { pointerId: 201, clientY: footerRow.getBoundingClientRect().bottom - 1 });
    await flushAsync();

    assert.deepEqual(arrange.rootIds(), ["footer-label", "card-main"]);
    assert.equal(harness.view._children[1], originalCard);
    assert.deepEqual(arrange.cardIds(), ["primary-button", "hero-image"]);
    assert.equal(arrange.commands.length, 1);
    assert.equal(arrange.commands[0].params._edit_action, "move-object");
    assert.equal(arrange.commands[0].params._target_id, "card-main");
    assert.equal(arrange.commands[0].params._target_parent_id, "main");
    assert.equal(arrange.commands[0].params._after_id, "footer-label");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  try {
    startObjectTreeDrag(harness, "footer-label", { pointerId: 202 });
    const { row: cardRow } = objectTreeRowById(harness, "card-main");
    moveObjectTreeDragTo(cardRow, { pointerId: 202 });
    assert.equal(cardRow.classList.contains("xstudio-object-tree-row-drop-inside"), true);
    dropObjectTreeDragOn(cardRow, { pointerId: 202 });
    await flushAsync();

    assert.deepEqual(arrange.rootIds(), ["card-main"]);
    assert.deepEqual(arrange.cardIds(), ["primary-button", "hero-image", "footer-label"]);
    assert.equal(arrange.commands.length, 1);
    assert.equal(arrange.commands[0].params._target_id, "footer-label");
    assert.equal(arrange.commands[0].params._target_parent_id, "card-main");
    assert.equal(arrange.commands[0].params._move_position, "inside");
    assert.equal(arrange.countId("footer-label"), 1);
    assert.equal(harness.module._selected_object?._json_id, "footer-label");
    const movedRow = document.getElementById(harness.module._find_object_tree_node_by_object_id("footer-label")._key);
    assert.deepEqual(movedRow._scrolledIntoView, { block: "nearest", inline: "nearest" });
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  try {
    startObjectTreeDrag(harness, "primary-button", { pointerId: 203 });
    const { row: cardRow } = objectTreeRowById(harness, "card-main");
    moveObjectTreeDragTo(cardRow, { pointerId: 203, clientY: cardRow.getBoundingClientRect().top + 1 });
    assert.equal(cardRow.classList.contains("xstudio-object-tree-row-drop-before"), true);
    dropObjectTreeDragOn(cardRow, { pointerId: 203, clientY: cardRow.getBoundingClientRect().top + 1 });
    await flushAsync();

    assert.deepEqual(arrange.rootIds(), ["primary-button", "card-main", "footer-label"]);
    assert.deepEqual(arrange.cardIds(), ["hero-image"]);
    assert.equal(arrange.commands.length, 1);
    assert.equal(arrange.commands[0].params._target_id, "primary-button");
    assert.equal(arrange.commands[0].params._target_parent_id, "main");
    assert.equal(arrange.commands[0].params._before_id, "card-main");
    assert.equal(arrange.countId("primary-button"), 1);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  const beforeRootIds = arrange.rootIds().join(",");
  const beforeCardIds = arrange.cardIds().join(",");
  try {
    startObjectTreeDrag(harness, "primary-button", { pointerId: 204 });
    const { row: imageRow } = objectTreeRowById(harness, "hero-image");
    moveObjectTreeDragTo(imageRow, { pointerId: 204 });
    assert.equal(imageRow.classList.contains("xstudio-object-tree-row-drop-invalid"), true);
    dropObjectTreeDragOn(imageRow, { pointerId: 204 });
    await flushAsync();

    assert.equal(arrange.rootIds().join(","), beforeRootIds);
    assert.equal(arrange.cardIds().join(","), beforeCardIds);
    assert.equal(arrange.commands.length, 0);
    assert.equal(arrange.statuses.some(status => String(status).includes("Destination rejects children")), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  try {
    startObjectTreeDrag(harness, "card-main", { pointerId: 205 });
    const { row: buttonRow } = objectTreeRowById(harness, "primary-button");
    moveObjectTreeDragTo(buttonRow, { pointerId: 205 });
    assert.equal(buttonRow.classList.contains("xstudio-object-tree-row-drop-invalid"), true);
    dropObjectTreeDragOn(buttonRow, { pointerId: 205 });
    await flushAsync();

    assert.deepEqual(arrange.rootIds(), ["card-main", "footer-label"]);
    assert.deepEqual(arrange.cardIds(), ["primary-button", "hero-image"]);
    assert.equal(arrange.commands.length, 0);
    assert.equal(arrange.statuses.some(status => String(status).includes("Cannot move an object into its own descendants")), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness, {
    skills: {
      view: objectSkill({
        id: "view",
        allowed: true,
        acceptedTypes: ["button"],
        insertModes: ["inside", "before", "after"]
      }),
      label: objectSkill({
        id: "label",
        allowed: false,
        insertModes: ["before", "after"]
      }),
      button: objectSkill({
        id: "button",
        allowed: false,
        insertModes: ["before", "after"]
      }),
      image: objectSkill({
        id: "image",
        allowed: false,
        insertModes: ["before", "after"]
      })
    }
  });
  try {
    startObjectTreeDrag(harness, "footer-label", { pointerId: 206 });
    const { row: cardRow } = objectTreeRowById(harness, "card-main");
    moveObjectTreeDragTo(cardRow, { pointerId: 206 });
    assert.equal(cardRow.classList.contains("xstudio-object-tree-row-drop-invalid"), true);
    dropObjectTreeDragOn(cardRow, { pointerId: 206 });
    await flushAsync();

    assert.deepEqual(arrange.rootIds(), ["card-main", "footer-label"]);
    assert.equal(arrange.commands.length, 0);
    assert.equal(arrange.statuses.some(status => String(status).includes("Destination rejects this object type")), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  installArrangeMoveHarness(harness);
  try {
    const cardNode = objectTreeNodeById(harness, "card-main");
    harness.module._object_tree_expanded_node_keys.delete(cardNode._node_key);
    startObjectTreeDrag(harness, "footer-label", { pointerId: 207 });
    const { row: cardRow } = objectTreeRowById(harness, "card-main");
    moveObjectTreeDragTo(cardRow, { pointerId: 207 });
    assert.equal(harness.module._object_tree_expanded_node_keys.has(cardNode._node_key), true);
    document.dispatchEvent(makeEvent("pointercancel", { pointerId: 207, target: cardRow }));
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  installArrangeMoveHarness(harness);
  try {
    harness.results._rect = { left: 0, top: 0, width: 280, height: 80 };
    harness.results.scrollTop = 10;
    startObjectTreeDrag(harness, "footer-label", { pointerId: 208 });
    const { row: cardRow } = objectTreeRowById(harness, "card-main");
    moveObjectTreeDragTo(cardRow, { pointerId: 208, clientY: 78 });
    assert.equal(harness.results.scrollTop > 10, true);
    document.dispatchEvent(makeEvent("pointercancel", { pointerId: 208, target: cardRow }));
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  const arrange = installArrangeMoveHarness(harness);
  try {
    startObjectTreeDrag(harness, "footer-label", { pointerId: 209 });
    const { row: cardRow } = objectTreeRowById(harness, "card-main");
    moveObjectTreeDragTo(cardRow, { pointerId: 209 });
    document.dispatchEvent(makeEvent("keydown", { key: "Escape" }));
    document.dispatchEvent(makeEvent("click", { target: cardRow }));
    assert.equal(harness.module._object_tree_drag_source, null);
    assert.equal(arrange.commands.length, 0);
    assert.equal(arrange.statuses.includes("Tree move cancelled"), true);
    assert.equal((documentListeners.get("pointermove") ?? []).length, 0);
    assert.equal((documentListeners.get("click") ?? []).length, 0);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createPickerHarness({
    client: {
      getActiveAppId: () => "app-main",
      getActiveEnv: () => "default"
    }
  });
  installArrangeMoveHarness(harness);
  try {
    startObjectTreeDrag(harness, "footer-label", { pointerId: 210 });
    assert.equal((documentListeners.get("pointermove") ?? []).length, 1);
    const { row: cardRow } = objectTreeRowById(harness, "card-main");
    document.dispatchEvent(makeEvent("pointercancel", { pointerId: 210, target: cardRow }));
    document.dispatchEvent(makeEvent("click", { target: cardRow }));
    harness.rebuildTree();
    startObjectTreeDrag(harness, "footer-label", { pointerId: 211 });
    assert.equal((documentListeners.get("pointermove") ?? []).length, 1);
    document.dispatchEvent(makeEvent("pointercancel", { pointerId: 211, target: cardRow }));
    document.dispatchEvent(makeEvent("click", { target: cardRow }));
    assert.equal((documentListeners.get("pointermove") ?? []).length, 0);
    assert.equal((documentListeners.get("click") ?? []).length, 0);
  } finally {
    harness.cleanup();
  }
}

{
  const client = new XVMClient({
    _app_id: "vibe-system",
    _env: "default",
    _wormhole_url: "ws://test",
    _edit: false,
  });

  client._current_view_id = "xvibe-sys-main";
  client._app_view_id = "view-server-offline";
  client._fallback_view_id = "view-server-offline";
  client._app = {
    _app_id: "shops",
    _env: "default",
    _meta: {
      _entry_view_id: "xvibe-sys-main",
    },
    _config: {
      _router: {
        _fallback_view_id: "view-server-offline",
      },
      _start: {
        _view_id: "view-server-offline",
      },
    },
  };
  client._views_cache.clear();
  client._views_cache.set("main", {
    _type: "view",
    _id: "main",
    _children: [],
  });

  assert.equal(client._pick_entry_view_id(client._app, ["main"]), "main");
  const runtimeApp = client._build_runtime_app();
  assert.equal(runtimeApp._start._view_id, "main");
  assert.equal(runtimeApp._router._fallback_view_id, "main");
  assert.equal(runtimeApp._views["xvibe-sys-main"], undefined);
  assert.equal(runtimeApp._views["view-server-offline"], undefined);

  client._views_cache.clear();
  assert.throws(
    () => client._build_runtime_app(),
    /Server app entry view is not hydrated/
  );
}

{
  const client = new XVMClient({
    _app_id: "shopping-list-app",
    _env: "default",
    _wormhole_url: "ws://test",
    _edit: false,
  });

  client._app = {
    _app_id: "shopping-list-app",
    _env: "default",
    _meta: {
      _entry_view_id: "main",
    },
    _config: {},
  };
  client._flows.set("add_shopping_item", { _id: "add_shopping_item" });
  client._views_cache.clear();
  client._views_cache.set("main", {
    _type: "view",
    _id: "main",
    _title: "Shopping List",
    _children: [
      {
        _type: "view",
        _id: "planning-summary",
        class: "planning-summary",
        _children: [
          { _type: "label", _id: "confirmed-structure", _text: "Confirmed structure" },
          { _type: "label", _id: "planned-behaviors", _text: "Planned behaviors" },
          { _type: "label", _id: "semantic-generation-details", _text: "semantic generation details" },
          { _type: "label", _id: "milestone-description", _text: "Milestone descriptions" },
          { _type: "label", _id: "artifact-id", _text: "Artifact ID: artifact-shopping-main" },
        ],
      },
      { _type: "label", _id: "name-label", _text: "Name Name" },
      { _type: "input", _id: "name-input", placeholder: "Name", value: "Name" },
      { _type: "label", _id: "quantity-label", _text: "Quantity Quantity" },
      { _type: "input", _id: "quantity-input", placeholder: "Quantity", value: "Quantity" },
    ],
  });

  const runtimeApp = client._build_runtime_app();
  const rawTexts = collectTexts(client.get_view("main"));
  const runtimeTexts = collectTexts(runtimeApp._views.main);
  const nameInput = findView(runtimeApp._views.main, item => item._id === "name-input");
  const quantityInput = findView(runtimeApp._views.main, item => item._id === "quantity-input");

  assert.equal(rawTexts.includes("Confirmed structure"), true);
  assert.equal(runtimeTexts.includes("Confirmed structure"), false);
  assert.equal(runtimeTexts.includes("Planned behaviors"), false);
  assert.equal(runtimeTexts.includes("semantic generation details"), false);
  assert.equal(runtimeTexts.includes("Milestone descriptions"), false);
  assert.equal(runtimeTexts.includes("Artifact ID: artifact-shopping-main"), false);
  assert.equal(runtimeTexts.includes("Name Name"), false);
  assert.equal(runtimeTexts.includes("Quantity Quantity"), false);
  assert.equal(runtimeTexts.includes("Name"), true);
  assert.equal(runtimeTexts.includes("Quantity"), true);
  assert.equal(nameInput.placeholder, undefined);
  assert.equal(nameInput.value, "");
  assert.equal(quantityInput.placeholder, undefined);
  assert.equal(quantityInput.value, "");
}

{
  const client = new XVMClient({
    _app_id: "shopping-list-app",
    _env: "default",
    _wormhole_url: "ws://test",
    _edit: false,
  });

  client._app = {
    _app_id: "shopping-list-app",
    _env: "default",
    _meta: {
      _entry_view_id: "main",
    },
    _config: {},
  };
  client._flows.set("add_shopping_item", { _id: "add_shopping_item" });
  client._views_cache.clear();
  client._views_cache.set("main", {
    _type: "view",
    _id: "main",
    _title: "Shopping List",
    _children: [],
  });

  const runtimeApp = client._build_runtime_app();
  const runtimeTexts = collectTexts(runtimeApp._views.main);
  const emptyAction = findView(runtimeApp._views.main, item => item._id === "main-empty-primary-action");

  assert.equal(runtimeTexts.includes("Shopping List"), true);
  assert.equal(runtimeTexts.includes("No items yet"), true);
  assert.equal(runtimeTexts.includes("Add Item"), true);
  assert.equal(emptyAction._flow, "add_shopping_item");
}

{
  const client = new XVMClient({
    _app_id: "shopping-list-app",
    _env: "default",
    _wormhole_url: "ws://test",
    _edit: false,
    _debug: true,
  });

  client._app = {
    _app_id: "shopping-list-app",
    _env: "default",
    _meta: {
      _entry_view_id: "main",
    },
    _config: {},
  };
  client._views_cache.clear();
  client._views_cache.set("main", {
    _type: "view",
    _id: "main",
    _children: [
      { _type: "label", _id: "confirmed-structure", _text: "Confirmed structure" },
    ],
  });

  const runtimeApp = client._build_runtime_app();
  const runtimeTexts = collectTexts(runtimeApp._views.main);
  assert.equal(runtimeTexts.includes("Confirmed structure"), true);
}

{
  const client = new XVMClient({
    _app_id: "vibe-system",
    _env: "default",
    _wormhole_url: "ws://test",
    _edit: false,
  });
  const commands = [];
  const rendered = [];

  client._send_cmd = async (op, params) => {
    commands.push({ op, params });
    if (op === "get-app") {
      assert.equal(params._app_id, "shops");
      return {
        _app: {
          _app_id: "shops",
          _env: "default",
          _meta: {
            _entry_view_id: "xvibe-sys-main",
            _version: 7,
          },
          _config: {
            _router: {
              _fallback_view_id: "view-server-offline",
            },
            _start: {
              _view_id: "view-server-offline",
            },
          },
        },
        _view_ids: ["main"],
        _flows: {},
      };
    }
    if (op === "get-view") {
      assert.equal(params._app_id, "shops");
      assert.equal(params._view_id, "main");
      return {
        _view: {
          _type: "view",
          _id: "main",
          _children: [],
        },
        _version: 7,
      };
    }
    if (op === "subscribe") {
      assert.equal(params._app_id, "shops");
      return { _ok: true, _result: {} };
    }
    throw new Error(`unexpected server op ${op}`);
  };

  client._mount_runtime_app = async () => {
    const runtimeApp = client._build_runtime_app();
    assert.equal(runtimeApp._start._view_id, "main");
    assert.equal(runtimeApp._router._fallback_view_id, "main");
    client._app_mounted = true;
    client._app_needs_refresh = false;
  };

  client.render_view = async (view_id) => {
    assert.equal(view_id, "main");
    rendered.push(view_id);
    client._current_view_id = view_id;
    client._app_view_id = view_id;
    client._has_rendered_view = true;
  };

  const result = await client.load_server_app("shops", "default", { _edit: false });
  assert.equal(result._ok, true);
  assert.equal(result._entry_view_id, "main");
  assert.deepEqual(rendered, ["main"]);
  assert.equal(client.get_current_view_id(), "main");
  assert.equal(client.get_app_view_id(), "main");
  assert.equal(commands.some((item) => item.params?._view_id === "xvibe-sys-main"), false);
  assert.equal(commands.some((item) => item.params?._view_id === "view-server-offline"), false);
}

{
  const flowClient = new FlowManagerClient();
  const originalRequireClient = XUIRuntime.requireClient;
  const openAppEvents = [];
  let resolveLoaded;
  const loaded = new Promise((resolve) => {
    resolveLoaded = resolve;
  });
  const openAppListener = _xem.on("studio:open-app", (payload) => {
    openAppEvents.push(payload);
  });
  const client = {
    _app_id: "vibe-system",
    _env: "default",
    _flows: new Map(),
    async sendXcmd() {
      return {
        _ok: true,
        _result: {
          _flow: {
            _last: {
              _ok: true,
              _result: {
                _app_id: "operations-starter-test",
              },
            },
          },
        },
      };
    },
    async load_server_app(app_id, env) {
      resolveLoaded({ app_id, env });
    },
  };

  try {
    XUIRuntime.requireClient = () => client;
    const result = await flowClient._trigger({
      _params: {
        _flow_id: "flow-create-app-from-starter",
        _event_payload: {},
      },
    });
    assert.equal(result._queued, true);
    assert.deepEqual(await loaded, {
      app_id: "operations-starter-test",
      env: "default",
    });
    await Promise.resolve();
    assert.deepEqual(openAppEvents, []);
    assert.equal(_xd.get("xvibe.active_app"), "operations-starter-test");
  } finally {
    XUIRuntime.requireClient = originalRequireClient;
    _xem.remove(openAppListener);
  }
}

{
  const memory = {
    _current_focus: "Authentication"
  };

  assert.equal(XStudioModule._is_project_memory_apply_success({ _memory: memory }), true);
  assert.equal(XStudioModule._is_project_memory_apply_success({ _ok: true, _memory: memory }), true);
  assert.equal(XStudioModule._is_project_memory_apply_success({ _ok: true, _result: { _memory: memory } }), true);
  assert.equal(XStudioModule._is_project_memory_apply_success({ _ok: false, _memory: memory }), false);
  assert.equal(XStudioModule._is_project_memory_apply_success({ _ok: false, _result: { _memory: memory } }), false);
}

function walkView(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  if (Array.isArray(node._children)) {
    for (const child of node._children) walkView(child, visit);
  }
}

function findView(node, predicate) {
  let found = null;
  walkView(node, item => {
    if (!found && predicate(item)) found = item;
  });
  return found;
}

function viewContainsId(node, id) {
  let found = false;
  walkView(node, item => {
    if (item?._id === id) found = true;
  });
  return found;
}

function countViews(node, predicate) {
  let count = 0;
  walkView(node, item => {
    if (predicate(item)) count += 1;
  });
  return count;
}

function collectViews(node, predicate) {
  const items = [];
  walkView(node, item => {
    if (predicate(item)) items.push(item);
  });
  return items;
}

function hasClassToken(item, token) {
  return String(item?.class ?? "").split(/\s+/g).includes(token);
}

function collectTexts(node) {
  const texts = [];
  walkView(node, item => {
    if (typeof item._text === "string") texts.push(item._text);
  });
  return texts;
}

function collectNormalTexts(node) {
  const texts = [];
  walkView(node, item => {
    if (String(item.class ?? "").includes("debug-payload")) return;
    if (typeof item._text === "string") texts.push(item._text);
  });
  return texts;
}

function createDataFeatureHarness({
  executeResult,
  executeDelay = false,
  suggestResult,
  suggestDelay = false
} = {}) {
  const commands = [];
  const statuses = [];
  const controls = new Map();
  let refreshCount = 0;
  let renderViewCount = 0;
  let pendingExecutionResolve = null;
  let pendingExecutionReject = null;
  let pendingSuggestionResolve = null;
  let pendingSuggestionReject = null;
  const makeControlObject = item => {
    const type = item._type === "textarea"
      ? "textarea"
      : item._type === "select"
        ? "select"
        : item.type === "checkbox"
          ? "input"
          : "input";
    const dom = document.createElement(type);
    dom.setAttribute("id", String(item._id));
    if (item.type) dom.setAttribute("type", item.type);
    if (item.type === "checkbox") {
      dom.checked = item.checked === true;
    } else {
      dom.value = String(item.value ?? item._value ?? "");
    }
    return {
      dom,
      value: dom.value,
      _value: dom.value,
      checked: dom.checked === true,
      _checked: dom.checked === true,
      getValue() {
        return this.dom.value;
      },
      setValue(value) {
        const next = String(value ?? "");
        this.dom.value = next;
        this.value = next;
        this._value = next;
      },
      setText(text) {
        this._text = String(text ?? "");
        this.dom.textContent = this._text;
      },
      addClass() {},
      removeClass() {},
    };
  };
  const registerControls = data => {
    controls.clear();
    walkView(data, item => {
      if (!item?._id) return;
      if (!["text", "textarea", "select", "input"].includes(item._type)) return;
      const id = String(item._id);
      controls.set(id, makeControlObject(item));
      if (item._on) {
        for (const eventName of Object.keys(item._on)) {
          const original = item._on[eventName];
          if (typeof original !== "function") continue;
          item._on[eventName] = event => {
            const control = controls.get(id);
            if (control && event?.target) {
              if ("checked" in event.target) {
                control.dom.checked = event.target.checked === true;
                control.checked = control.dom.checked;
                control._checked = control.dom.checked;
              }
              if ("value" in event.target) {
                control.dom.value = String(event.target.value ?? "");
                control.value = control.dom.value;
                control._value = control.dom.value;
              }
            }
            return original(event);
          };
        }
      }
    });
  };
  const appResults = {
    dom: document.createElement("div"),
    lastUpdate: null,
    update(data) {
      this.lastUpdate = data;
    }
  };
  const makePortlet = id => {
    const dom = document.createElement("section");
    dom.setAttribute("id", id);
    return makeXStudioObject(dom);
  };
  const portlets = {
    "xstudio-selected-object-panel": makePortlet("xstudio-selected-object-panel"),
    "xstudio-editor": makePortlet("xstudio-editor"),
    "xstudio-conversation-section": makePortlet("xstudio-conversation-section"),
    "xstudio-guide-card": makePortlet("xstudio-guide-card"),
    "xstudio-runtime-section": makePortlet("xstudio-runtime-section"),
    "xstudio-runtime-inspector-section": makePortlet("xstudio-runtime-inspector-section"),
    "xstudio-json-section": makePortlet("xstudio-json-section"),
    "xstudio-generated-modules-section": makePortlet("xstudio-generated-modules-section"),
    "xstudio-data-feature-panel": makePortlet("xstudio-data-feature-panel")
  };
  const panel = portlets["xstudio-data-feature-panel"];
  const panelBody = {
    dom: document.createElement("div"),
    lastUpdate: null,
    updateCount: 0,
    update(data) {
      this.updateCount += 1;
      this.lastUpdate = data;
      registerControls(data);
    }
  };
  const preview = {
    dom: document.createElement("div"),
    lastUpdate: null,
    updateCount: 0,
    update(data) {
      this.updateCount += 1;
      this.lastUpdate = data;
    }
  };
  const progress = {
    dom: document.createElement("div"),
    lastUpdate: null,
    updateCount: 0,
    update(data) {
      this.updateCount += 1;
      this.lastUpdate = data;
    }
  };
  const errorLabel = {
    ...makeXStudioObject(document.createElement("label")),
    _text: "",
    setText(text) {
      this._text = String(text ?? "");
      this.dom.textContent = this._text;
    }
  };
  const originalGetObject = XUI.getObject;
  XUI.getObject = id => {
    if (id === "xstudio-app-explorer-results") return appResults;
    if (id === "xstudio-data-feature-body") return panelBody;
    if (id === "xstudio-data-feature-preview") return preview;
    if (id === "xstudio-data-feature-progress") return progress;
    if (id === "xstudio-data-feature-error") return errorLabel;
    if (controls.has(id)) return controls.get(id);
    if (portlets[id]) return portlets[id];
    return null;
  };

  const module = new XStudioModule({
    getActiveAppId() {
      return "visual-app";
    },
    getActiveEnv() {
      return "default";
    },
    get_current_view_id() {
      return "main";
    },
    get_app_view_id() {
      return "main";
    },
    async render_view(viewId) {
      renderViewCount += 1;
      module.__lastRenderedView = viewId;
    },
    async sendXcmd(command) {
      commands.push(command);
      if (executeDelay && command._module === "xvibe" && command._op === "execute-execution-graph") {
        return new Promise((resolve, reject) => {
          pendingExecutionResolve = resolve;
          pendingExecutionReject = reject;
        });
      }
      if (suggestDelay && command._module === "xvibe" && command._op === "suggest-data-feature") {
        return new Promise((resolve, reject) => {
          pendingSuggestionResolve = resolve;
          pendingSuggestionReject = reject;
        });
      }
      if (command._module === "xvibe" && command._op === "suggest-data-feature") {
        return suggestResult ?? {
          _ok: true,
          _draft: {
            _feature_name: "Shopping Items",
            _entity_id: "shopping_item",
            _fields: [
              { _name: "Name", _field_id: "name", _type: "String", _required: true },
              { _name: "Quantity", _field_id: "quantity", _type: "Number", _required: false, _default: 1 },
              { _name: "Priority", _field_id: "priority", _type: "String", _required: false, _options: ["low", "medium", "high"] },
              { _name: "Purchased", _field_id: "purchased", _type: "Boolean", _required: false, _default: false }
            ],
            _generation_options: {
              _entity: true,
              _list_view: true,
              _create_form: true,
              _create_flow: true,
              _update_flow: true,
              _delete_flow: true
            },
            _assumptions: ["Status represented as a Boolean field."],
            _warnings: ["Priority options suggested as low, medium, high."]
          }
        };
      }
      return executeResult ?? {
        _ok: true,
        _result: {
          _nodes: [
            { _artifact_type: "entity", _artifact_id: "shopping_item", _status: "created" },
            { _artifact_type: "form", _artifact_id: "create-shopping_item", _status: "created" },
            { _artifact_type: "table", _artifact_id: "shopping_item-list", _status: "created" },
            { _artifact_type: "flow", _artifact_id: "create-shopping_item", _status: "created" }
          ]
        }
      };
    },
    isServerReady() {
      return true;
    }
  });
  module._write_studio_status = status => statuses.push(status);
  module._refresh_app_explorer = async () => {
    refreshCount += 1;
    module._app_explorer_artifacts = {
      views: [
        { _id: "shopping_item-list", _title: "shopping_item-list", _type: "view", _raw: {} },
        { _id: "create-shopping_item", _title: "create-shopping_item", _type: "view", _raw: {} }
      ],
      flows: [
        { _id: "create-shopping_item", _title: "create-shopping_item", _type: "flow", _raw: {} },
        { _id: "update-shopping_item", _title: "update-shopping_item", _type: "flow", _raw: {} },
        { _id: "delete-shopping_item", _title: "delete-shopping_item", _type: "flow", _raw: {} }
      ],
      entities: [
        { _id: "shopping_item", _title: "shopping_item", _type: "entity", _raw: {} }
      ],
      modules: []
    };
    module._render_cached_app_explorer();
    return true;
  };
  module._refresh_object_tree_for_current_view = () => {};
  module._log = () => {};
  module._error = () => {};

  return {
    module,
    commands,
    statuses,
    appResults,
    panel,
    panelBody,
    preview,
    progress,
    errorLabel,
    portlets,
    controls,
    refreshCount: () => refreshCount,
    renderViewCount: () => renderViewCount,
    resolveExecution(value) {
      pendingExecutionResolve?.(value);
    },
    rejectExecution(error) {
      pendingExecutionReject?.(error);
    },
    resolveSuggestion(value) {
      pendingSuggestionResolve?.(value);
    },
    rejectSuggestion(error) {
      pendingSuggestionReject?.(error);
    },
    cleanup() {
      XUI.getObject = originalGetObject;
    }
  };
}

function fillDataFeatureDrawer(harness) {
  harness.module._open_data_feature_drawer();
  const body = harness.panelBody.lastUpdate;
  findView(body, item => item._id === "xstudio-data-feature-name")._on.input({ target: { value: "Shopping Item" } });
  const updated = harness.panelBody.lastUpdate;
  const firstName = findView(updated, item =>
    String(item._id ?? "").startsWith("xstudio-data-feature-field-") &&
    String(item._id ?? "").endsWith("-name")
  );
  firstName._on.input({ target: { value: "Display Name" } });
  const withField = harness.panelBody.lastUpdate;
  const firstType = findView(withField, item =>
    String(item._id ?? "").startsWith("xstudio-data-feature-field-") &&
    String(item._id ?? "").endsWith("-type")
  );
  firstType._on.change({ target: { value: "Number" } });
  const withType = harness.panelBody.lastUpdate;
  const firstRequired = findView(withType, item =>
    String(item._id ?? "").startsWith("xstudio-data-feature-field-") &&
    String(item._id ?? "").endsWith("-required")
  );
  firstRequired._on.change({ target: { checked: true } });
}

function setDataFeatureControl(harness, id, value) {
  const control = harness.controls.get(id);
  assert.ok(control, `Missing control ${id}`);
  control.dom.value = String(value ?? "");
  control.value = control.dom.value;
  control._value = control.dom.value;
}

function setDataFeatureCheckbox(harness, id, checked) {
  const control = harness.controls.get(id);
  assert.ok(control, `Missing control ${id}`);
  control.dom.checked = checked === true;
  control.checked = control.dom.checked;
  control._checked = control.dom.checked;
}

function firstDataFeatureFieldKey(harness) {
  return harness.module._data_feature_state._fields[0]._key;
}

{
  const panel = findView(xstudioShellView, item => item._id === "xstudio-data-feature-panel");
  assert.equal(Boolean(panel), true);
  assert.equal(panel.role, "region");
  assert.equal(panel["aria-modal"], undefined);
  assert.equal(String(panel.class ?? "").includes("xstudio-data-feature-panel"), true);
  assert.equal(findView(xstudioShellView, item => item._id === "xstudio-data-feature-drawer"), null);
  assert.equal(/\.xstudio-data-feature-drawer\b/.test(xstudioCss), false);
  const panelCssStart = xstudioCss.indexOf(".xstudio-data-feature-panel");
  const panelCssEnd = xstudioCss.indexOf(".xstudio-data-feature-body", panelCssStart);
  assert.equal(xstudioCss.slice(panelCssStart, panelCssEnd).includes("position: fixed"), false);
}

{
  const panelCss = cssBlock(".xstudio-data-feature-panel");
  const portletPanelCss = cssBlock(".xstudio-portlet.xstudio-data-feature-panel");
  const bodyCss = cssBlock(".xstudio-data-feature-body");
  const headerCss = cssBlock(".xstudio-data-feature-workspace-header");
  const scrollCss = cssBlock(".xstudio-data-feature-scroll");
  const footerCss = cssBlock(".xstudio-data-feature-footer");
  assert.match(panelCss, /container-type:\s*inline-size;/);
  assert.match(panelCss, /flex:\s*1 1 0;/);
  assert.match(panelCss, /height:\s*100%;/);
  assert.match(panelCss, /max-height:\s*100%;/);
  assert.match(panelCss, /display:\s*flex;/);
  assert.match(panelCss, /flex-direction:\s*column;/);
  assert.match(panelCss, /gap:\s*0;/);
  assert.match(panelCss, /padding:\s*0;/);
  assert.match(panelCss, /max-width:\s*100%;/);
  assert.match(panelCss, /min-width:\s*0;/);
  assert.match(panelCss, /overflow:\s*hidden;/);
  assert.match(portletPanelCss, /flex:\s*1 1 0;/);
  assert.match(portletPanelCss, /gap:\s*0;/);
  assert.match(portletPanelCss, /padding:\s*0;/);
  assert.match(portletPanelCss, /overflow:\s*hidden;/);
  assert.match(bodyCss, /flex:\s*1 1 0;/);
  assert.match(bodyCss, /min-height:\s*0;/);
  assert.match(bodyCss, /display:\s*flex;/);
  assert.match(bodyCss, /flex-direction:\s*column;/);
  assert.match(bodyCss, /overflow:\s*hidden;/);
  assert.match(headerCss, /flex:\s*none;/);
  assert.match(scrollCss, /flex:\s*1 1 0;/);
  assert.match(scrollCss, /min-height:\s*0;/);
  assert.match(scrollCss, /overflow-x:\s*hidden;/);
  assert.match(scrollCss, /overflow-y:\s*auto;/);
  assert.match(scrollCss, /padding:\s*14px 14px 40px;/);
  assert.match(footerCss, /flex:\s*none;/);
  assert.match(footerCss, /flex-wrap:\s*wrap;/);
  assert.equal(/overflow-y:\s*(auto|scroll);/.test(panelCss), false);
  assert.equal(/overflow-y:\s*(auto|scroll);/.test(bodyCss), false);
  assert.equal(/overflow-y:\s*(auto|scroll);/.test(headerCss), false);
  assert.equal(/overflow-y:\s*(auto|scroll);/.test(footerCss), false);
  assert.equal(/position:\s*sticky;/.test(footerCss), false);
  assert.equal(/bottom:\s*0;/.test(footerCss), false);
  assert.match(xstudioCss, /\.xstudio-data-feature-top-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(xstudioCss, /@container\s*\(max-width:\s*380px\)\s*\{[\s\S]*\.xstudio-data-feature-top-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.match(xstudioCss, /\.xstudio-data-feature-field-row\s*\{[\s\S]*grid-template-areas:[\s\S]*"name name name fieldid fieldid fieldid"[\s\S]*"type type required required default default"[\s\S]*"options options options options actions actions";/);
  assert.match(xstudioCss, /@container\s*\(max-width:\s*380px\)\s*\{[\s\S]*\.xstudio-data-feature-field-head,[\s\S]*\.xstudio-data-feature-field-row\s*\{[\s\S]*grid-template-areas:[\s\S]*"name"[\s\S]*"fieldid"[\s\S]*"type"[\s\S]*"required"[\s\S]*"default"[\s\S]*"options"[\s\S]*"actions";/);
  assert.match(xstudioCss, /\.xstudio-data-feature-options\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(xstudioCss, /@container\s*\(max-width:\s*380px\)\s*\{[\s\S]*\.xstudio-data-feature-options\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.match(xstudioCss, /\.xstudio-data-feature-preview\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*128px\),\s*1fr\)\);/);
  assert.equal(/\.xstudio-data-feature-field-head\s*\{\s*display:\s*none;/.test(xstudioCss), false);
  for (const selector of [
    ".xstudio-data-feature-card",
    ".xstudio-data-feature-field-list",
    ".xstudio-data-feature-options",
    ".xstudio-data-feature-preview",
    ".xstudio-data-feature-ask-debug",
    ".xstudio-data-feature-footer",
  ]) {
    assert.equal(/overflow-y:\s*(auto|scroll);/.test(cssBlock(selector)), false);
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    findView(harness.panelBody.lastUpdate, item => item._text === "+ Add field")._on.click(makeEvent("click"));
    findView(harness.panelBody.lastUpdate, item => item._text === "+ Add field")._on.click(makeEvent("click"));
    findView(harness.panelBody.lastUpdate, item => item._text === "+ Add field")._on.click(makeEvent("click"));
    harness.module._data_feature_state._suggestion_error = "AI suggestions are unavailable because the configured provider could not authenticate.";
    harness.module._data_feature_state._suggestion_debug_details = "{\"_error\":\"E_XAI_API_KEY_INVALID\",\"_message\":\"Invalid API key\"}";
    harness.module._data_feature_state._suggestion_warnings = ["Expanded warning content stays in the body scroller."];
    harness.module._render_data_feature_drawer();

    const body = harness.panelBody.lastUpdate;
    const scroll = findView(body, item => hasClassToken(item, "xstudio-data-feature-scroll"));
    const footer = findView(body, item => hasClassToken(item, "xstudio-data-feature-footer"));
    assert.equal(countViews(body, item => hasClassToken(item, "xstudio-data-feature-workspace-header")), 1);
    assert.equal(countViews(body, item => hasClassToken(item, "xstudio-data-feature-scroll")), 1);
    assert.equal(countViews(body, item => hasClassToken(item, "xstudio-data-feature-footer")), 1);
    assert.equal(Boolean(scroll), true);
    assert.equal(Boolean(footer), true);
    assert.equal(findView(scroll, item => hasClassToken(item, "xstudio-data-feature-footer")), null);
    assert.equal(Boolean(findView(footer, item => item._id === "xstudio-data-feature-create")), true);
    assert.equal(Boolean(findView(footer, item => item._text === "Cancel")), true);
    assert.equal(Boolean(findView(scroll, item => item._text === "Delete flow")), true);
    assert.equal(Boolean(findView(scroll, item => item._id === "xstudio-data-feature-ask-debug")), true);
    assert.equal(Boolean(findView(scroll, item => String(item._text ?? "").includes("E_XAI_API_KEY_INVALID"))), true);
    assert.equal(Boolean(findView(scroll, item => String(item._text ?? "").includes("Expanded warning"))), true);
    assert.equal(countViews(body, item => hasClassToken(item, "xstudio-data-feature-field-row")), 4);
    assert.equal(countViews(body, item => hasClassToken(item, "xstudio-data-feature-field-actions")), 4);
    assert.equal(countViews(body, item => hasClassToken(item, "xstudio-data-feature-option")), 6);
    assert.equal(countViews(body, item => hasClassToken(item, "xstudio-data-feature-preview-section")), 3);

    const fieldRows = collectViews(body, item => hasClassToken(item, "xstudio-data-feature-field-row"));
    for (const row of fieldRows) {
      assert.equal(Boolean(findView(row, item => String(item._id ?? "").endsWith("-name"))), true);
      assert.equal(Boolean(findView(row, item => String(item._id ?? "").endsWith("-id"))), true);
      assert.equal(Boolean(findView(row, item => String(item._id ?? "").endsWith("-type"))), true);
      assert.equal(Boolean(findView(row, item => String(item._id ?? "").endsWith("-required"))), true);
      assert.equal(Boolean(findView(row, item => String(item._id ?? "").endsWith("-default"))), true);
      assert.equal(Boolean(findView(row, item => String(item._id ?? "").endsWith("-options"))), true);
      assert.equal(Boolean(findView(row, item => item["aria-label"] === "Move field up")), true);
      assert.equal(Boolean(findView(row, item => item["aria-label"] === "Move field down")), true);
      assert.equal(Boolean(findView(row, item => item["aria-label"] === "Remove field")), true);
    }
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    for (let index = 1; index < 20; index += 1) {
      findView(harness.panelBody.lastUpdate, item => item._text === "+ Add field")._on.click(makeEvent("click"));
    }
    harness.module._data_feature_state._suggestion_error = "AI suggestions failed after the server provider returned a long recoverable error.";
    harness.module._data_feature_state._suggestion_debug_details = [
      "Provider unavailable while generating the Data Feature suggestion.",
      "The current draft, fields, generation options, and manual Create feature action must remain available.",
      "Debug details may wrap across many lines in a narrow right workspace without creating a nested scroller."
    ].join(" ".repeat(12));
    harness.module._data_feature_state._suggestion_warnings = [
      "A long suggestion warning remains inside the main Data Feature body scroller and must not move the footer."
    ];
    harness.module._render_data_feature_drawer();

    const body = harness.panelBody.lastUpdate;
    const header = findView(body, item => hasClassToken(item, "xstudio-data-feature-workspace-header"));
    const scroll = findView(body, item => hasClassToken(item, "xstudio-data-feature-scroll"));
    const footer = findView(body, item => hasClassToken(item, "xstudio-data-feature-footer"));
    assert.equal(Boolean(header), true);
    assert.equal(Boolean(scroll), true);
    assert.equal(Boolean(footer), true);
    assert.equal(findView(scroll, item => hasClassToken(item, "xstudio-data-feature-workspace-header")), null);
    assert.equal(findView(scroll, item => hasClassToken(item, "xstudio-data-feature-footer")), null);
    assert.equal(countViews(body, item => hasClassToken(item, "xstudio-data-feature-field-row")), 20);
    assert.equal(Boolean(findView(scroll, item => item._text === "+ Add field")), true);
    assert.equal(Boolean(findView(scroll, item => item._text === "Generation options")), true);
    assert.equal(Boolean(findView(scroll, item => item._text === "Preview")), true);
    assert.equal(Boolean(findView(scroll, item => item._text === "Delete flow")), true);
    assert.equal(Boolean(findView(scroll, item => item._id === "xstudio-data-feature-ask-debug")), true);
    assert.equal(Boolean(findView(scroll, item => String(item._text ?? "").includes("nested scroller"))), true);
    assert.equal(Boolean(findView(footer, item => item._id === "xstudio-data-feature-create")), true);
    assert.equal(Boolean(findView(footer, item => item._text === "Cancel")), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._render_cached_app_explorer();
    const appRow = harness.appResults.lastUpdate._children[0];
    const addButton = findView(appRow, item => item._id === "xstudio-app-explorer-add");
    assert.equal(addButton?._text, "+ Add");
    addButton._on.click(makeEvent("click"));
    const openRow = harness.appResults.lastUpdate._children[0];
    const menu = findView(openRow, item => item._id === "xstudio-app-explorer-add-menu");
    const menuTexts = collectTexts(menu);
    assert.equal(menuTexts.includes("Data feature"), true);
    assert.equal(menuTexts.includes("View"), true);
    assert.equal(menuTexts.includes("Flow"), true);
    assert.equal(menuTexts.includes("Entity"), true);
    assert.equal(menuTexts.includes("Module"), true);
    assert.equal(findView(menu, item => item._id === "xstudio-app-explorer-add-menu-flow").disabled, true);
    findView(menu, item => item._id === "xstudio-app-explorer-add-menu-data-feature")._on.click(makeEvent("click"));
    assert.equal(harness.module._data_feature_state._open, true);
    assert.equal(harness.panel.dom.style.display, "");
    assert.equal(harness.portlets["xstudio-conversation-section"].dom.style.display, "none");
    assert.equal(collectTexts(harness.panelBody.lastUpdate).includes("Data Feature"), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    const initialUpdateCount = harness.panelBody.updateCount;
    const body = harness.panelBody.lastUpdate;
    const featureInput = findView(body, item => item._id === "xstudio-data-feature-name");
    const activeTarget = { value: "", selectionStart: 0, selectionEnd: 0 };
    document.activeElement = activeTarget;
    for (const value of ["S", "Sh", "Sho", "Shop", "Shopp", "Shoppi", "Shoppin", "Shopping Item"]) {
      activeTarget.value = value;
      activeTarget.selectionStart = value.length;
      activeTarget.selectionEnd = value.length;
      featureInput._on.input({ target: activeTarget });
      assert.equal(document.activeElement, activeTarget);
      assert.equal(activeTarget.selectionStart, value.length);
    }
    assert.equal(harness.panelBody.updateCount, initialUpdateCount);
    assert.equal(harness.module._data_feature_state._feature_name, "Shopping Item");
    assert.equal(harness.module._data_feature_state._entity_id, "shopping_item");

    const fieldInput = findView(body, item =>
      String(item._id ?? "").startsWith("xstudio-data-feature-field-") &&
      String(item._id ?? "").endsWith("-name")
    );
    const fieldTarget = { value: "", selectionStart: 0, selectionEnd: 0 };
    document.activeElement = fieldTarget;
    for (const value of ["Q", "Qu", "Qua", "Quan", "Quant", "Quanti", "Quantit", "Quantity"]) {
      fieldTarget.value = value;
      fieldTarget.selectionStart = value.length;
      fieldTarget.selectionEnd = value.length;
      fieldInput._on.input({ target: fieldTarget });
      assert.equal(document.activeElement, fieldTarget);
      assert.equal(fieldTarget.selectionStart, value.length);
    }
    assert.equal(harness.panelBody.updateCount, initialUpdateCount);
    assert.equal(harness.module._data_feature_state._fields[0]._name, "Quantity");
    assert.equal(harness.module._data_feature_state._fields[0]._field_id, "quantity");
  } finally {
    document.activeElement = null;
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    const body = harness.panelBody.lastUpdate;
    assert.equal(collectTexts(body).includes("Ask Xpell"), true);
    const prompt = findView(body, item => item._id === "xstudio-data-feature-ask-input");
    assert.equal(prompt.placeholder.includes("Shopping items with name"), true);
    prompt._on.input({ target: { value: "Shopping items with quantity and priority" } });
    assert.equal(harness.module._data_feature_state._suggestion_prompt, "Shopping items with quantity and priority");
    assert.equal(findView(body, item => item._id === "xstudio-data-feature-ask-button")._text, "Suggest feature");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness({ suggestDelay: true });
  try {
    harness.module._open_data_feature_drawer();
    setDataFeatureControl(harness, "xstudio-data-feature-ask-input", "Shopping items with quantity and priority");
    const pending = harness.module._suggest_data_feature_from_prompt();
    await flushAsync();
    assert.equal(harness.module._data_feature_state._suggestion_status, "loading");
    const command = harness.commands[0];
    assert.equal(command._module, "xvibe");
    assert.equal(command._op, "suggest-data-feature");
    assert.equal(harness.commands.some(item => item._module === "xai-client"), false);
    assert.equal(command._params._app_id, "visual-app");
    assert.equal(command._params._env, "default");
    assert.equal(command._params._prompt, "Shopping items with quantity and priority");
    assert.deepEqual(command._params._existing_draft, {
      _feature_name: "",
      _entity_id: "",
      _fields: []
    });
    assert.equal(harness.commands.some(item => item._op === "execute-execution-graph"), false);
    assert.equal(findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-ask-button").disabled, true);
    assert.equal(findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-create").disabled, true);
    assert.equal(collectTexts(harness.panelBody.lastUpdate).includes("Requesting structured draft..."), true);
    harness.resolveSuggestion({
      _ok: true,
      _draft: {
        _feature_name: "Shopping Items",
        _entity_id: "shopping_item",
        _fields: [{ _name: "Name", _field_id: "name", _type: "String", _required: true }],
        _generation_options: { _entity: true, _list_view: true, _create_form: true, _create_flow: true, _update_flow: true, _delete_flow: true }
      }
    });
    await pending;
    assert.equal(harness.commands.some(item => item._op === "execute-execution-graph"), false);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness({
    suggestResult: {
      _ok: false,
      _error: {
        _message: "Provider unavailable",
        _recoverable: true
      }
    }
  });
  try {
    harness.module._open_data_feature_drawer();
    setDataFeatureControl(harness, "xstudio-data-feature-ask-input", "Shopping items");
    await harness.module._suggest_data_feature_from_prompt();
    assert.equal(harness.module._data_feature_state._suggestion_status, "failed");
    assert.equal(harness.module._data_feature_state._suggestion_error.includes("Provider unavailable"), true);
    assert.equal(harness.module._data_feature_state._open, true);
    assert.equal(harness.commands[0]._module, "xvibe");
    assert.equal(harness.commands[0]._op, "suggest-data-feature");
    assert.equal(harness.commands.some(item => item._module === "xai-client"), false);
    assert.equal(harness.commands.some(item => item._op === "execute-execution-graph"), false);
  } finally {
    harness.cleanup();
  }
}

{
  const invalidApiKeyResult = {
    _ok: false,
    _error: {
      _code: "E_XAI_API_KEY_INVALID",
      _message: "Aime provider generate failed: Invalid API key",
      _details: {
        _provider: "aime",
        _status: 401
      }
    }
  };
  const harness = createDataFeatureHarness({
    suggestResult: invalidApiKeyResult
  });
  try {
    harness.module._open_data_feature_drawer();
    await flushAsync();
    const fieldKey = firstDataFeatureFieldKey(harness);
    setDataFeatureControl(harness, "xstudio-data-feature-name", "Shopping Item");
    setDataFeatureControl(harness, "xstudio-data-feature-entity-id", "shopping_item");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-name`, "Quantity");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-id`, "quantity");
    setDataFeatureCheckbox(harness, "xstudio-data-feature-option-create_form", false);
    setDataFeatureControl(harness, "xstudio-data-feature-ask-input", "Shopping items with quantity");
    await harness.module._suggest_data_feature_from_prompt();
    assert.equal(harness.module._data_feature_state._suggestion_status, "failed");
    assert.equal(
      harness.module._data_feature_state._suggestion_error,
      "AI suggestions are unavailable because the configured provider could not authenticate."
    );
    assert.equal(harness.module._data_feature_state._feature_name, "Shopping Item");
    assert.equal(harness.module._data_feature_state._entity_id, "shopping_item");
    assert.equal(harness.module._data_feature_state._fields[0]._field_id, "quantity");
    assert.equal(harness.module._data_feature_state._options.create_form, false);
    assert.equal(harness.module._data_feature_state._open, true);
    assert.equal(findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-create").disabled, undefined);
    const askStatus = findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-ask-status");
    assert.equal(askStatus._text.includes("Invalid API key"), false);
    assert.equal(collectNormalTexts(harness.panelBody.lastUpdate).join("\n").includes("E_XAI_API_KEY_INVALID"), false);
    const debug = findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-ask-debug");
    assert.equal(debug._html_tag, "details");
    assert.equal(String(debug.class ?? "").includes("xstudio-data-feature-ask-debug-hidden"), false);
    const debugText = collectTexts(debug).join("\n");
    assert.equal(debugText.includes("E_XAI_API_KEY_INVALID"), true);
    assert.equal(debugText.includes("Invalid API key"), true);
    assert.equal(harness.commands[0]._module, "xvibe");
    assert.equal(harness.commands[0]._op, "suggest-data-feature");
    assert.equal(harness.commands.some(item => item._module === "xai-client"), false);
    assert.equal(harness.commands.some(item => item._op === "analyze-message"), false);
    assert.equal(harness.commands.some(item => item._module === "planning"), false);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness({
    suggestResult: {
      _ok: false,
      _error: {
        _message: "Provider unavailable",
        _recoverable: true
      }
    }
  });
  try {
    harness.module._open_data_feature_drawer();
    const fieldKey = firstDataFeatureFieldKey(harness);
    setDataFeatureControl(harness, "xstudio-data-feature-name", "Shopping Item");
    setDataFeatureControl(harness, "xstudio-data-feature-entity-id", "shopping_item");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-name`, "Quantity");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-id`, "quantity");
    setDataFeatureCheckbox(harness, "xstudio-data-feature-option-create_form", false);
    setDataFeatureControl(harness, "xstudio-data-feature-ask-input", "Shopping items");
    await harness.module._suggest_data_feature_from_prompt();
    assert.equal(harness.commands[0]._module, "xvibe");
    assert.equal(harness.commands[0]._op, "suggest-data-feature");
    assert.equal(harness.commands.some(item => item._module === "xai-client"), false);
    assert.equal(harness.module._data_feature_state._suggestion_status, "failed");
    assert.equal(harness.module._data_feature_state._suggestion_error, "Provider unavailable");
    assert.equal(harness.module._data_feature_state._feature_name, "Shopping Item");
    assert.equal(harness.module._data_feature_state._entity_id, "shopping_item");
    assert.equal(harness.module._data_feature_state._fields[0]._field_id, "quantity");
    assert.equal(harness.module._data_feature_state._options.create_form, false);
    assert.equal(findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-create").disabled, undefined);
    assert.equal(harness.module._data_feature_state._open, true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    harness.module._data_feature_state._suggestion_prompt = "Shopping items with name";
    harness.module._data_feature_state._suggestion_status = "failed";
    harness.module._data_feature_state._suggestion_error = "Provider unavailable";
    harness.module._render_data_feature_drawer();
    assert.equal(findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-ask-button").disabled, undefined);
    assert.equal(findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-ask-retry")._text, "Retry suggestion");
    await harness.module._retry_data_feature_suggestion();
    assert.equal(harness.module._data_feature_state._suggestion_status, "idle");
    assert.equal(harness.module._data_feature_state._feature_name, "Shopping Items");
    assert.equal(harness.module._data_feature_state._entity_id, "shopping_item");
    assert.equal(harness.commands.some(item => item._module === "xvibe" && item._op === "suggest-data-feature"), true);
    assert.equal(harness.commands.some(item => item._module === "xai-client"), false);
    assert.equal(findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-ask-button").disabled, undefined);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    setDataFeatureControl(harness, "xstudio-data-feature-ask-input", "Shopping items with quantity, priority and purchased status");
    await harness.module._suggest_data_feature_from_prompt();
    assert.equal(harness.module._data_feature_state._suggestion_status, "idle");
    assert.equal(harness.module._data_feature_state._feature_name, "Shopping Items");
    assert.equal(harness.module._data_feature_state._entity_id, "shopping_item");
    assert.equal(harness.module._data_feature_state._fields.length, 4);
    assert.equal(harness.module._data_feature_state._fields[1]._default, "1");
    assert.equal(harness.module._data_feature_state._fields[2]._options, "low, medium, high");
    assert.equal(harness.module._data_feature_state._fields[3]._type, "Boolean");
    assert.equal(harness.commands.some(item => item._module === "xai-client"), false);
    assert.equal(collectTexts(harness.panelBody.lastUpdate).includes("Status represented as a Boolean field."), true);
    assert.equal(collectTexts(harness.panelBody.lastUpdate).includes("Priority options suggested as low, medium, high."), true);
    const nameInput = findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-field-field-1-name");
    nameInput._on.input({ target: { value: "Item Name" } });
    assert.equal(harness.module._data_feature_state._fields[0]._name, "Item Name");
    const optionsInput = findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-field-field-3-options");
    optionsInput._on.input({ target: { value: "urgent, normal" } });
    assert.equal(harness.module._data_feature_state._fields[2]._options, "urgent, normal");
    const createFormOption = findView(harness.panelBody.lastUpdate, item =>
      item._children?.some?.(child => child._text === "Create form")
    );
    findView(createFormOption, item => item.type === "checkbox")._on.change({ target: { checked: false } });
    assert.equal(harness.module._data_feature_state._options.create_form, false);
    assert.equal(harness.commands.some(item => item._op === "execute-execution-graph"), false);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-name")._on.input({ target: { value: "Existing Feature" } });
    findView(harness.panelBody.lastUpdate, item =>
      String(item._id ?? "").startsWith("xstudio-data-feature-field-") &&
      String(item._id ?? "").endsWith("-name")
    )._on.input({ target: { value: "Quantity" } });
    setDataFeatureControl(harness, "xstudio-data-feature-ask-input", "Shopping items with priority");
    await harness.module._suggest_data_feature_from_prompt();
    assert.equal(harness.module._data_feature_state._suggestion_status, "review");
    assert.equal(harness.module._data_feature_state._feature_name, "Existing Feature");
    assert.equal(findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-create").disabled, true);
    await harness.module._create_data_feature_from_drawer();
    assert.equal(harness.commands.some(item => item._op === "execute-execution-graph"), false);
    assert.equal(harness.module._data_feature_state._error, "Review or cancel the suggested draft before creating.");
    findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-replace")._on.click(makeEvent("click"));
    assert.equal(harness.module._data_feature_state._suggestion_status, "idle");
    assert.equal(harness.module._data_feature_state._feature_name, "Shopping Items");
    assert.equal(harness.module._data_feature_state._fields[0]._field_id, "name");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-name")._on.input({ target: { value: "Existing Feature" } });
    findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-entity-id")._on.input({ target: { value: "existing_entity" } });
    findView(harness.panelBody.lastUpdate, item =>
      String(item._id ?? "").startsWith("xstudio-data-feature-field-") &&
      String(item._id ?? "").endsWith("-name")
    )._on.input({ target: { value: "Quantity" } });
    setDataFeatureCheckbox(harness, "xstudio-data-feature-option-create_form", false);
    setDataFeatureControl(harness, "xstudio-data-feature-ask-input", "Shopping items with quantity and priority");
    await harness.module._suggest_data_feature_from_prompt();
    const suggestCommand = harness.commands.find(item => item._op === "suggest-data-feature");
    assert.equal(suggestCommand._params._existing_draft._feature_name, "Existing Feature");
    assert.equal(suggestCommand._params._existing_draft._entity_id, "existing_entity");
    assert.equal(suggestCommand._params._existing_draft._fields[0]._field_id, "quantity");
    findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-merge")._on.click(makeEvent("click"));
    assert.equal(harness.module._data_feature_state._feature_name, "Existing Feature");
    assert.equal(harness.module._data_feature_state._entity_id, "existing_entity");
    assert.equal(harness.module._data_feature_state._fields.filter(field => field._field_id === "quantity").length, 1);
    assert.equal(harness.module._data_feature_state._fields.some(field => field._field_id === "priority"), true);
    assert.equal(harness.module._data_feature_state._options.create_form, false);
    assert.equal(harness.module._data_feature_state._suggestion_warnings.some(text => text.includes("Existing field quantity was preserved.")), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    let body = harness.panelBody.lastUpdate;
    findView(body, item => item._id === "xstudio-data-feature-name")._on.input({ target: { value: "Shopping Item" } });
    assert.equal(harness.module._data_feature_state._entity_id, "shopping_item");
    body = harness.panelBody.lastUpdate;
    findView(body, item =>
      String(item._id ?? "").startsWith("xstudio-data-feature-field-") &&
      String(item._id ?? "").endsWith("-name")
    )._on.input({ target: { value: "Quantity" } });
    assert.equal(harness.module._data_feature_state._fields[0]._field_id, "quantity");
    body = harness.panelBody.lastUpdate;
    findView(body, item =>
      String(item._id ?? "").startsWith("xstudio-data-feature-field-") &&
      String(item._id ?? "").endsWith("-type")
    )._on.change({ target: { value: "Boolean" } });
    assert.equal(harness.module._data_feature_state._fields[0]._type, "Boolean");
    findView(harness.panelBody.lastUpdate, item => item._text === "+ Add field")._on.click(makeEvent("click"));
    assert.equal(harness.module._data_feature_state._fields.length, 2);
    const secondKey = harness.module._data_feature_state._fields[1]._key;
    findView(harness.panelBody.lastUpdate, item =>
      String(item._id ?? "") === `xstudio-data-feature-field-${secondKey}-name`
    )._on.input({ target: { value: "Done" } });
    assert.equal(harness.module._data_feature_state._fields[1]._field_id, "done");
    findView(harness.panelBody.lastUpdate, item =>
      String(item._id ?? "") === `xstudio-data-feature-field-${secondKey}-required`
    )._on.change({ target: { checked: true } });
    assert.equal(harness.module._data_feature_state._fields[1]._required, true);
    const secondRow = findView(harness.panelBody.lastUpdate, item =>
      String(item._id ?? "") === `xstudio-data-feature-field-${secondKey}`
    );
    findView(secondRow, item => item["aria-label"] === "Move field up")._on.click(makeEvent("click"));
    assert.equal(harness.module._data_feature_state._fields[0]._key, secondKey);
    findView(harness.panelBody.lastUpdate, item => String(item.class ?? "").includes("xstudio-data-feature-remove"))._on.click(makeEvent("click"));
    assert.equal(harness.module._data_feature_state._fields.length, 1);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    const fieldKey = firstDataFeatureFieldKey(harness);
    setDataFeatureControl(harness, "xstudio-data-feature-name", "Shopping Item");
    setDataFeatureControl(harness, "xstudio-data-feature-entity-id", "shopping_item");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-name`, "Quantity");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-id`, "quantity");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-type`, "Number");
    setDataFeatureCheckbox(harness, `xstudio-data-feature-field-${fieldKey}-required`, true);
    assert.equal(harness.module._data_feature_state._feature_name, "");
    findView(harness.panelBody.lastUpdate, item => item._text === "+ Add field")._on.click(makeEvent("click"));
    assert.equal(harness.module._data_feature_state._feature_name, "Shopping Item");
    assert.equal(harness.module._data_feature_state._entity_id, "shopping_item");
    assert.equal(harness.module._data_feature_state._fields.length, 2);
    assert.equal(harness.module._data_feature_state._fields[0]._name, "Quantity");
    assert.equal(harness.module._data_feature_state._fields[0]._field_id, "quantity");
    assert.equal(harness.module._data_feature_state._fields[0]._type, "Number");
    assert.equal(harness.module._data_feature_state._fields[0]._required, true);
    const previewTexts = collectTexts(harness.panelBody.lastUpdate);
    assert.equal(previewTexts.includes("- shopping_item"), true);
    assert.equal(previewTexts.includes("- shopping_item-list"), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness({ suggestDelay: true });
  try {
    harness.module._open_data_feature_drawer();
    const fieldKey = firstDataFeatureFieldKey(harness);
    setDataFeatureControl(harness, "xstudio-data-feature-name", "Shopping Item");
    setDataFeatureControl(harness, "xstudio-data-feature-entity-id", "shopping_item");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-name`, "Quantity");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-id`, "quantity");
    setDataFeatureControl(harness, "xstudio-data-feature-ask-input", "Shopping items with priority");
    const pending = harness.module._suggest_data_feature_from_prompt();
    await flushAsync();
    assert.equal(harness.module._data_feature_state._suggestion_status, "loading");
    assert.equal(harness.module._data_feature_state._feature_name, "Shopping Item");
    assert.equal(harness.module._data_feature_state._fields[0]._field_id, "quantity");
    assert.equal(harness.commands[0]._params._existing_draft._feature_name, "Shopping Item");
    assert.equal(harness.commands[0]._params._existing_draft._fields[0]._field_id, "quantity");
    assert.equal(harness.controls.get("xstudio-data-feature-name").dom.value, "Shopping Item");
    harness.rejectSuggestion(new Error("Provider unavailable"));
    await pending;
    assert.equal(harness.module._data_feature_state._suggestion_status, "failed");
    assert.equal(harness.module._data_feature_state._feature_name, "Shopping Item");
    assert.equal(harness.module._data_feature_state._fields[0]._field_id, "quantity");
    assert.equal(harness.commands.some(item => item._op === "execute-execution-graph"), false);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    const fieldKey = firstDataFeatureFieldKey(harness);
    setDataFeatureControl(harness, "xstudio-data-feature-name", "Existing Feature");
    setDataFeatureControl(harness, "xstudio-data-feature-entity-id", "existing_entity");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-name`, "Quantity");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-id`, "quantity");
    setDataFeatureControl(harness, "xstudio-data-feature-ask-input", "Shopping items with priority");
    await harness.module._suggest_data_feature_from_prompt();
    assert.equal(harness.module._data_feature_state._suggestion_status, "review");
    setDataFeatureControl(harness, "xstudio-data-feature-name", "Existing Feature Edited");
    findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-cancel-suggestion")._on.click(makeEvent("click"));
    assert.equal(harness.module._data_feature_state._suggestion_status, "idle");
    assert.equal(harness.module._data_feature_state._feature_name, "Existing Feature Edited");
    assert.equal(harness.module._data_feature_state._entity_id, "existing_entity");
    assert.equal(harness.module._data_feature_state._fields[0]._field_id, "quantity");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    const fieldKey = firstDataFeatureFieldKey(harness);
    setDataFeatureControl(harness, "xstudio-data-feature-name", "Shopping Item");
    setDataFeatureControl(harness, "xstudio-data-feature-entity-id", "shopping_item");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-name`, "Display Name");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-id`, "display_name");
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-type`, "Date");
    setDataFeatureCheckbox(harness, `xstudio-data-feature-field-${fieldKey}-required`, true);
    setDataFeatureControl(harness, `xstudio-data-feature-field-${fieldKey}-default`, "2026-08-06");
    setDataFeatureCheckbox(harness, "xstudio-data-feature-option-create_form", false);
    await harness.module._create_data_feature_from_drawer();
    assert.equal(harness.module._data_feature_state._error, "");
    assert.equal(harness.commands.length, 1);
    const command = harness.commands[0];
    assert.equal(command._op, "execute-execution-graph");
    assert.equal(command._params._feature_name, "Shopping Item");
    assert.equal(command._params._entity_name, "shopping_item");
    assert.deepEqual(command._params._fields, [
      {
        _name: "display_name",
        _label: "Display Name",
        _field_id: "display_name",
        _type: "Date",
        _required: true,
        _default: "2026-08-06"
      }
    ]);
    assert.equal(command._params._generation_options.create_form, false);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._open_data_feature_drawer();
    findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-name")._on.input({ target: { value: "Shopping Item" } });
    let previewTexts = collectTexts(harness.preview.lastUpdate);
    assert.equal(previewTexts.includes("- shopping_item"), true);
    findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-entity-id")._on.input({ target: { value: "inventory_item" } });
    previewTexts = collectTexts(harness.preview.lastUpdate);
    assert.equal(previewTexts.includes("- inventory_item"), true);
    assert.equal(previewTexts.includes("- inventory_item-list"), true);
    const listOption = findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-option-list_view");
    listOption._on.change({ target: { checked: false } });
    previewTexts = collectTexts(harness.preview.lastUpdate);
    assert.equal(previewTexts.includes("- inventory_item-list"), false);
    harness.module._render_data_feature_drawer();
    assert.equal(harness.module._data_feature_state._feature_name, "Shopping Item");
    assert.equal(harness.module._data_feature_state._entity_id, "inventory_item");
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  const originalConfirm = window.confirm;
  try {
    harness.module._open_data_feature_drawer();
    const body = harness.panelBody.lastUpdate;
    findView(body, item => item._id === "xstudio-data-feature-name")._on.input({ target: { value: "Shopping Item" } });
    window.confirm = () => false;
    harness.module._close_data_feature_drawer();
    assert.equal(harness.module._data_feature_state._open, true);
    assert.equal(harness.panel.dom.style.display, "");
    window.confirm = () => true;
    harness.module._close_data_feature_drawer();
    assert.equal(harness.module._data_feature_state._open, false);
    assert.equal(harness.panel.dom.style.display, "none");
    assert.equal(harness.portlets["xstudio-conversation-section"].dom.style.display, "");
    harness.module._open_data_feature_drawer();
    assert.equal(harness.module._data_feature_state._feature_name, "Shopping Item");
    assert.equal(harness.module._data_feature_state._entity_id, "shopping_item");
    assert.equal(collectTexts(harness.panelBody.lastUpdate).includes("Data Feature"), true);
  } finally {
    window.confirm = originalConfirm;
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    fillDataFeatureDrawer(harness);
    const previewTexts = collectTexts(harness.preview.lastUpdate);
    assert.equal(previewTexts.includes("- shopping_item"), true);
    assert.equal(previewTexts.includes("- shopping_item-list"), true);
    assert.equal(previewTexts.includes("- create-shopping_item"), true);
    assert.equal(previewTexts.includes("- update-shopping_item"), true);
    assert.equal(previewTexts.includes("- delete-shopping_item"), true);
    await harness.module._create_data_feature_from_drawer();
    assert.equal(harness.commands.length, 1);
    const command = harness.commands[0];
    assert.equal(command._module, "xvibe");
    assert.equal(command._op, "execute-execution-graph");
    assert.equal(command._params._app_id, "visual-app");
    assert.equal(command._params._env, "default");
    assert.equal(command._params._graph_type, "crud");
    assert.equal(command._params._entity_name, "shopping_item");
    assert.deepEqual(command._params._fields, [
      {
        _name: "display_name",
        _label: "Display Name",
        _field_id: "display_name",
        _type: "Number",
        _required: true
      }
    ]);
    assert.equal(command._params._canonical_request._type, "data-feature");
    assert.equal(command._params._generation_options.list_view, true);
    assert.equal(harness.commands.some(item => item._op === "analyze-message"), false);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness({ executeDelay: true });
  try {
    fillDataFeatureDrawer(harness);
    const pending = harness.module._create_data_feature_from_drawer();
    assert.equal(harness.module._data_feature_state._status, "running");
    assert.equal(findView(harness.panelBody.lastUpdate, item => item._id === "xstudio-data-feature-create").disabled, true);
    assert.equal(collectTexts(harness.panelBody.lastUpdate).includes("Creating entity"), true);
    harness.resolveExecution({
      _ok: false,
      _error: {
        _message: "Entity persistence failed",
        _recoverable: true
      }
    });
    await pending;
    assert.equal(harness.module._data_feature_state._status, "failed");
    assert.equal(harness.module._data_feature_state._error.includes("Entity persistence failed"), true);
    assert.equal(harness.module._data_feature_state._open, true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    fillDataFeatureDrawer(harness);
    harness.module._app_explorer_artifacts.entities = [
      { _id: "shopping_item", _title: "shopping_item", _type: "entity", _raw: {} }
    ];
    await harness.module._create_data_feature_from_drawer();
    await harness.module._create_data_feature_from_drawer();
    assert.equal(harness.commands.length, 0);
    assert.equal(harness.module._data_feature_state._error.includes("Entity 'shopping_item' already exists."), true);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    fillDataFeatureDrawer(harness);
    await harness.module._create_data_feature_from_drawer();
    assert.equal(harness.refreshCount(), 1);
    assert.equal(harness.renderViewCount(), 1);
    assert.equal(harness.module.__lastRenderedView, "shopping_item-list");
    assert.equal(harness.module._app_explorer_section_open.views, true);
    assert.equal(harness.module._app_explorer_section_open.flows, true);
    assert.equal(harness.module._app_explorer_section_open.entities, true);
    assert.equal(harness.module._app_explorer_selected_key, "view:shopping_item-list");
    assert.equal(harness.module._data_feature_state._open, false);
    assert.equal(harness.statuses.includes("Shopping Item data feature created"), true);
    const listRow = findView(harness.appResults.lastUpdate, item =>
      item["data-xstudio-artifact-key"] === "view:shopping_item-list"
    );
    assert.match(String(listRow.class ?? ""), /xstudio-app-explorer-row-new/);
  } finally {
    harness.cleanup();
  }
}

{
  const harness = createDataFeatureHarness();
  try {
    harness.module._app_explorer_section_open.views = true;
    harness.module._render_cached_app_explorer();
    const viewsCategory = findView(harness.appResults.lastUpdate, item =>
      item._id === "xstudio-app-explorer-views-1-item"
    );
    const addViewButton = findView(viewsCategory, item => item._id === "xstudio-app-explorer-add-view");
    assert.equal(addViewButton?._text, "+ Add View");
    assert.equal(addViewButton._on.click._params.event, "studio:app-explorer:add-view-open");
    harness.module._open_add_menu();
    const menu = findView(harness.appResults.lastUpdate, item => item._id === "xstudio-app-explorer-add-menu");
    assert.equal(findView(menu, item => item._id === "xstudio-app-explorer-add-menu-view")._text, "View");
  } finally {
    harness.cleanup();
  }
}

function createConversationHarness({ onCommand, messages = [] } = {}) {
  const commands = [];
  const module = new XStudioModule({
    getActiveAppId() {
      return "app-timeout";
    },
    getActiveEnv() {
      return "default";
    },
    get_current_view_id() {
      return "main";
    },
    get_app_view_id() {
      return "main";
    },
    async render_view() {},
    async sendXcmd(command, timeoutMs) {
      commands.push({ command, timeoutMs });
      if (onCommand) return onCommand(command, timeoutMs, commands);
      if (command._module === "xvibe" && command._op === "list-conversations") {
        return {
          _ok: true,
          _result: {
            _conversations: [{ _id: "conversation-timeout", _message_count: messages.length }]
          }
        };
      }
      if (command._module === "xvibe" && command._op === "get-last-messages") {
        return { _ok: true, _result: { _messages: messages } };
      }
      return { _ok: true, _result: {} };
    },
    isServerReady() {
      return true;
    }
  });
  module._conversation_app_id = "app-timeout";
  module._conversation_env = "default";
  module._conversation_id = "conversation-timeout";
  module._render_conversation_messages = () => {};
  module._write_studio_status = status => {
    module.__lastStatus = status;
  };
  return { module, commands, messages };
}

function shoppingCrudRecommendation(overrides = {}) {
  return {
    _type: "crud-recommendation",
    _title: "Add Shopping Item CRUD",
    _reason: "Shopping Item is the primary managed record in the confirmed plan.",
    _entity_name: "Shopping Item",
    _creates: [
      "Shopping Item data",
      "Shopping Item list screen",
      "Add/edit form",
      "Add, edit, and delete actions"
    ],
    _recommended: true,
    _action: {
      _label: "Add Shopping Item CRUD",
      _execution_payload: {
        _module: "xvibe",
        _op: "build-crud",
        _params: {
          _entity_name: "Shopping Item"
        }
      }
    },
    ...overrides
  };
}

function starterAdaptationRecommendation(overrides = {}) {
  return {
    _type: "starter-adaptation",
    _title: "Adapt the dashboard for your shopping list",
    _description: "Keep the dashboard shell, theme controls, and responsive layout. Replace the generic metrics, records, activity, and settings sections with the shopping-list experience from your confirmed plan.",
    _reason: "The selected starter gives the shopping-list app a useful dashboard shell.",
    _starter_id: "starter-dashboard-technical-id",
    _starter_view_id: "starter-dashboard-view-id",
    _starter_adaptation: {
      _preserve: [
        { _title: "Dashboard shell", _id: "starter-shell-id" },
        "Theme selector",
        "Navigation",
        "Main scroll container"
      ],
      _replace: [
        "Generic metrics",
        "Records table",
        "Activity section",
        "Settings/demo content"
      ],
      _add: [
        "Shopping-list structure",
        "Shopping-item interaction area"
      ],
      _metadata: {
        _starter_id: "starter-dashboard-technical-id",
        _starter_view_id: "starter-dashboard-view-id"
      }
    },
    _action: {
      _type: "starter-adaptation",
      _prompt: "Adapt the selected dashboard starter for the shopping-list plan."
    },
    ...overrides
  };
}

function primaryExperienceRecommendation(overrides = {}) {
  return {
    _type: "primary-experience",
    _title: "Finish the shopping-list experience",
    _reason: "Compose the primary shopping-list runtime experience.",
    _semantic_type: "compose-and-verify-primary-experience",
    _action: {
      _id: "compose-and-verify-primary-experience",
      _type: "module-op",
      _prompt: "Finish the shopping-list experience.",
      _execution_payload: {
        _module: "xvibe",
        _op: "compose-primary-experience",
        _params: {
          _app_id: "app-timeout",
          _env: "default",
          _role: "compose-and-verify-primary-experience",
          _primary_experience_composition: {
            _target_view_id: "main",
            _content_container_id: "starter-content"
          }
        }
      }
    },
    ...overrides
  };
}

function materializeConfirmedPlanResult(status = "completed", overrides = {}) {
  const statuses = status === "completed"
    ? ["completed", "completed", "completed", "completed", "completed", "completed", "completed"]
    : status === "failed"
      ? ["completed", "completed", "failed", "pending", "pending", "pending", "pending"]
      : ["running", "pending", "pending", "pending", "pending", "pending", "pending"];
  const titles = [
    "Preparing starter",
    "Creating data",
    "Creating screens",
    "Connecting actions",
    "Composing main experience",
    "Validating app",
    "Final verification"
  ];
  return {
    _ok: status === "completed",
    _status: status,
    _resume_token: "resume-build-1",
    _completed_count: status === "completed" ? 5 : 2,
    _planned_change_count: 5,
    _stages: titles.map((title, index) => ({
      _id: title.toLowerCase().replace(/\s+/g, "-"),
      _title: title,
      _status: statuses[index]
    })),
    ...overrides
  };
}

{
  const { module } = createConversationHarness();
  const message = {
    _id: "message-crud-recommendation",
    _role: "tool",
    _text: "",
    _created_at: "2026-07-15T00:00:00.000Z",
    _intent: {
      _message_type: "recommendation",
      _execution_level: "artifact",
      _recommendations: [shoppingCrudRecommendation()]
    }
  };
  const rendered = module._conversation_render_message(message, 0);
  const list = create_xstudio_conversation_message_list([rendered]);
  const crudCard = findView(list[0], item =>
    String(item.class ?? "").includes("xstudio-crud-recommendation-card")
  );
  const texts = collectNormalTexts(crudCard);
  assert.equal(texts.includes("Recommended"), true);
  assert.equal(texts.includes("Add Shopping Item CRUD"), true);
  assert.equal(texts.includes("Shopping Item is the primary managed record in the confirmed plan."), true);
  assert.equal(texts.includes("Data: Shopping Item"), true);
  assert.equal(texts.includes("Creates"), true);
  assert.equal(texts.includes("Shopping Item data"), true);
  assert.equal(texts.includes("Shopping Item list screen"), true);
  assert.equal(texts.includes("Add, edit, and delete actions"), true);
  assert.equal(texts.some(text => text.includes("_action")), false);
  assert.equal(texts.some(text => text.includes("build-crud")), false);

  const applyButton = findView(crudCard, item => String(item._id ?? "").startsWith("xstudio-crud-recommendation-apply-"));
  assert.equal(applyButton.disabled, undefined);
  assert.equal(applyButton._text, "Add Shopping Item CRUD");
  assert.equal(applyButton._on.click._params.event, "studio:intent-action-apply");
}

{
  const { module } = createConversationHarness();
  const message = {
    _id: "message-crud-recommendations",
    _role: "tool",
    _text: "",
    _created_at: "2026-07-15T00:00:00.000Z",
    _intent: {
      _message_type: "recommendation",
      _execution_level: "artifact",
      _recommendations: [
        shoppingCrudRecommendation(),
        shoppingCrudRecommendation({
          _title: "Add Shopping List CRUD",
          _entity_name: "Shopping List",
          _recommended: false,
          _depends_on: "Shopping Item CRUD",
          _creates: ["Shopping List data", "Shopping List screen", "List actions"],
          _action: {
            _label: "Add Shopping List CRUD",
            _execution_payload: {
              _module: "xvibe",
              _op: "build-crud",
              _params: {
                _entity_name: "Shopping List"
              }
            }
          }
        })
      ]
    }
  };
  const rendered = module._conversation_render_message(message, 0);
  const list = create_xstudio_conversation_message_list([rendered]);
  const texts = collectNormalTexts(list[0]);
  assert.equal(countViews(list[0], item =>
    String(item.class ?? "").includes("xstudio-crud-recommendation-card")
  ), 2);
  assert.equal(texts.includes("Recommended"), true);
  assert.equal(texts.includes("Option 2"), true);
  assert.equal(texts.includes("Option 2 of 2"), true);
  assert.equal(texts.includes("After: Shopping Item CRUD"), true);
  assert.equal(texts.includes("Add Shopping List CRUD"), true);
}

{
  const { module } = createConversationHarness();
  const message = {
    _id: "message-crud-foundation-exists",
    _role: "tool",
    _text: "",
    _created_at: "2026-07-15T00:00:00.000Z",
    _intent: {
      _message_type: "question",
      _execution_level: "deterministic",
      _artifact_type: "execution-graph",
      _artifact_request: {
        _operation: "recommend",
        _graph_type: "crud",
        _status: "foundation-exists",
        _message: "CRUD foundation already exists for the confirmed plan.",
        _existing_entities: ["shopping_item"],
        _recommendations: []
      },
      _actions: []
    },
    _metadata: {
      _source: "xvibe.analyze-message"
    }
  };
  const rendered = module._conversation_render_message(message, 0);
  const list = create_xstudio_conversation_message_list([rendered]);
  const texts = collectNormalTexts(list[0]);
  assert.equal(texts.includes("XVibe"), true);
  assert.equal(texts.includes("Tool"), false);
  assert.equal(texts.includes("CRUD foundation already exists."), true);
  assert.equal(texts.includes("CRUD foundation already exists"), true);
  assert.equal(texts.includes("Shopping Item already has its core data, screens, and CRUD actions."), true);
  assert.equal(texts.includes("No additional CRUD foundation is required."), true);
  assert.equal(texts.includes("Suggested actions:"), false);
  assert.equal(texts.includes("Intent analyzed."), false);
  assert.equal(findView(list[0], item =>
    String(item.class ?? "").includes("xstudio-crud-recommendation-card")
  ), null);
  assert.equal(findView(list[0], item =>
    String(item._id ?? "").includes("continue")
  ), null);
}

{
  const { module } = createConversationHarness();
  const message = {
    _id: "message-crud-foundation-multiple",
    _role: "tool",
    _text: "",
    _created_at: "2026-07-15T00:00:00.000Z",
    _intent: {
      _message_type: "question",
      _execution_level: "deterministic",
      _artifact_type: "execution-graph",
      _artifact_request: {
        _operation: "recommend",
        _graph_type: "crud",
        _status: "foundation-exists",
        _message: "CRUD foundation already exists for the confirmed plan.",
        _existing_entities: ["customer", "product", "invoice"],
        _recommendations: []
      },
      _actions: []
    }
  };
  const rendered = module._conversation_render_message(message, 0);
  const list = create_xstudio_conversation_message_list([rendered]);
  const texts = collectNormalTexts(list[0]);
  assert.equal(texts.includes("Customer, Product, and Invoice already have their core data, screens, and CRUD actions."), true);
  assert.equal(texts.includes("Suggested actions:"), false);
  assert.equal(texts.includes("Intent analyzed."), false);
}

{
  const { module } = createConversationHarness();
  const message = {
    _id: "message-crud-no-candidates",
    _role: "tool",
    _text: "",
    _created_at: "2026-07-15T00:00:00.000Z",
    _intent: {
      _message_type: "question",
      _execution_level: "deterministic",
      _artifact_type: "execution-graph",
      _artifact_request: {
        _operation: "recommend",
        _graph_type: "crud",
        _status: "foundation-exists",
        _message: "The confirmed plan does not require a new CRUD foundation.",
        _existing_entities: [],
        _recommendations: []
      },
      _actions: []
    }
  };
  const rendered = module._conversation_render_message(message, 0);
  const list = create_xstudio_conversation_message_list([rendered]);
  const texts = collectNormalTexts(list[0]);
  assert.equal(texts.includes("No additional CRUD foundation is required."), true);
  assert.equal(texts.includes("The confirmed plan does not require a new CRUD foundation."), true);
  assert.equal(texts.includes("Suggested actions:"), false);
  assert.equal(texts.includes("Intent analyzed."), false);
}

{
  const { module } = createConversationHarness();
  const message = {
    _id: "message-crud-foundation-next-recommendation",
    _role: "tool",
    _text: "",
    _created_at: "2026-07-15T00:00:00.000Z",
    _intent: {
      _message_type: "question",
      _execution_level: "deterministic",
      _artifact_type: "execution-graph",
      _artifact_request: {
        _operation: "recommend",
        _graph_type: "crud",
        _status: "foundation-exists",
        _existing_entities: ["shopping_item"],
        _next_recommendation: shoppingCrudRecommendation({
          _title: "Add Customer CRUD",
          _entity_name: "Customer",
          _creates: ["Customer data", "Customer list screen", "Customer actions"],
          _action: {
            _label: "Add Customer CRUD",
            _execution_payload: {
              _module: "xvibe",
              _op: "execute-execution-graph",
              _params: {
                _graph_type: "crud",
                _entity_name: "customer"
              }
            }
          }
        })
      },
      _actions: []
    }
  };
  const rendered = module._conversation_render_message(message, 0);
  const list = create_xstudio_conversation_message_list([rendered]);
  const texts = collectNormalTexts(list[0]);
  assert.equal(texts.includes("CRUD foundation already exists"), true);
  assert.equal(texts.includes("Add Customer CRUD"), true);
  assert.equal(texts.includes("Data: Customer"), true);
  assert.equal(countViews(list[0], item =>
    String(item.class ?? "").includes("xstudio-crud-recommendation-card")
  ), 1);
}

{
  const { module } = createConversationHarness();
  const message = {
    _id: "message-crud-missing-payload",
    _role: "tool",
    _text: "",
    _created_at: "2026-07-15T00:00:00.000Z",
    _intent: {
      _message_type: "recommendation",
      _execution_level: "artifact",
      _recommendations: [
        shoppingCrudRecommendation({
          _action: {
            _label: "Add Shopping Item CRUD"
          }
        })
      ]
    }
  };
  const rendered = module._conversation_render_message(message, 0);
  const list = create_xstudio_conversation_message_list([rendered]);
  const texts = collectNormalTexts(list[0]);
  const applyButton = findView(list[0], item => String(item._id ?? "").startsWith("xstudio-crud-recommendation-apply-"));
  assert.equal(applyButton.disabled, true);
  assert.equal(texts.includes("Missing executable payload"), true);
  assert.equal(texts.includes("Action is missing execution payload"), true);
}

async function runCrudRecommendationExecution(result) {
  const sentCommands = [];
  let renderViewCount = 0;
  let objectTreeRefreshCount = 0;
  let appExplorerRefreshCount = 0;
  let viewJsonRefreshCount = 0;
  let guideRefreshCount = 0;
  const { module } = createConversationHarness();
  module._conversation_messages = [
    {
      _id: "message-crud-execute",
      _role: "tool",
      _text: "",
      _created_at: "2026-07-15T00:00:00.000Z",
      _intent: {
        _message_type: "recommendation",
        _execution_level: "artifact",
        _recommendations: [shoppingCrudRecommendation()]
      }
    }
  ];
  module._xvm_client.render_view = async view_id => {
    assert.equal(view_id, "main");
    renderViewCount += 1;
  };
  module._refresh_object_tree_for_current_view = () => {
    objectTreeRefreshCount += 1;
  };
  module._refresh_app_explorer = async () => {
    appExplorerRefreshCount += 1;
  };
  module._load_studio_current_view_json = async () => {
    viewJsonRefreshCount += 1;
  };
  module._send_command = async (_module, _op, _params) => {
    sentCommands.push({ _module, _op, _params });
    if (_module === "xvibe" && _op === "build-crud") return result;
    return { _ok: true, _result: {} };
  };
  module._refresh_guide_after_success = async () => {
    guideRefreshCount += 1;
  };
  module._render_guide_recommendation = () => {};
  module._render_conversation_messages = () => {};

  const rendered = module._conversation_render_message(module._conversation_messages[0], 0);
  const list = create_xstudio_conversation_message_list([rendered]);
  const applyButton = findView(list[0], item => String(item._id ?? "").startsWith("xstudio-crud-recommendation-apply-"));
  await module._apply_conversation_intent_action(applyButton._on.click._params.data);

  return {
    module,
    sentCommands,
    renderViewCount,
    objectTreeRefreshCount,
    appExplorerRefreshCount,
    viewJsonRefreshCount,
    guideRefreshCount,
    actionKey: applyButton._on.click._params.data._action_key
  };
}

{
  const execution = await runCrudRecommendationExecution({
    _ok: true,
    _result: {
      _created: true
    }
  });
  assert.equal(execution.sentCommands.some(command =>
    command._module === "xvibe" &&
    command._op === "build-crud" &&
    command._params._entity_name === "Shopping Item"
  ), true);
  assert.equal(
    execution.module._conversation_action_status[execution.actionKey],
    "done",
    execution.module._conversation_action_error[execution.actionKey]
  );
  assert.equal(execution.guideRefreshCount, 1);
  assert.equal(execution.renderViewCount, 1);
  assert.equal(execution.objectTreeRefreshCount, 1);
  assert.equal(execution.appExplorerRefreshCount, 1);
  assert.equal(execution.viewJsonRefreshCount, 1);
}

{
  const execution = await runCrudRecommendationExecution({
    _ok: true,
    _result: {
      _already_created: true
    }
  });
  assert.equal(execution.module._conversation_action_status[execution.actionKey], "done");
  assert.equal(execution.appExplorerRefreshCount, 1);
}

{
  const execution = await runCrudRecommendationExecution({
    _ok: false,
    _error: "CRUD generation failed."
  });
  assert.equal(execution.module._conversation_action_status[execution.actionKey], "failed");
  assert.equal(execution.module._conversation_action_error[execution.actionKey], "CRUD generation failed.");
  assert.equal(execution.appExplorerRefreshCount, 0);
}

{
  const messages = [];
  const { module, commands } = createConversationHarness({
    messages,
    onCommand(command, timeoutMs) {
      if (command._op === "get-last-messages") {
        return { _ok: true, _result: { _messages: messages } };
      }
      if (command._op === "list-conversations") {
        return {
          _ok: true,
          _result: {
            _conversations: [{ _id: "conversation-timeout", _message_count: messages.length }]
          }
        };
      }
      if (command._op === "append-message") {
        const message = {
          _id: `user-${messages.length + 1}`,
          _role: "user",
          _text: command._params._message._text,
          _created_at: "2026-07-15T00:00:00.000Z"
        };
        messages.push(message);
        return { _ok: true, _result: { _message: message } };
      }
      if (command._op === "analyze-message") {
        assert.equal(timeoutMs, 45000);
        const message = {
          _id: `tool-${messages.length + 1}`,
          _role: "tool",
          _text: "Intent analyzed.",
          _created_at: "2026-07-15T00:00:01.000Z",
          _intent: {
            _message_type: "conversation",
            _execution_level: "none",
            _confidence: 1,
            _actions: []
          },
          _metadata: {
            _source: "xvibe.analyze-message",
            _normalized_prompt: "make title red"
          }
        };
        messages.push(message);
        return { _ok: true, _result: { _intent: message._intent, _message: message } };
      }
      throw new Error(`unexpected command ${command._op}`);
    }
  });

  await module._append_conversation_message("make title red");
  const analyzeCommands = commands.filter(item => item.command._op === "analyze-message");
  assert.equal(analyzeCommands.length, 1);
  assert.equal(analyzeCommands[0].timeoutMs, 45000);
  assert.equal(module._conversation_messages.some(message => message._id === "tool-2"), true);
  assert.equal(module._conversation_transient_messages.length, 0);
}

{
  const messages = [];
  const { module, commands } = createConversationHarness({
    messages,
    onCommand(command, timeoutMs) {
      if (command._op === "get-last-messages") return { _ok: true, _result: { _messages: messages } };
      if (command._op === "list-conversations") return { _ok: true, _result: { _conversations: [] } };
      if (command._op === "append-message") {
        const message = {
          _id: "user-timeout",
          _role: "user",
          _text: command._params._message._text,
          _created_at: "2026-07-15T00:00:00.000Z"
        };
        messages.push(message);
        return { _ok: true, _result: { _message: message } };
      }
      if (command._op === "analyze-message") {
        assert.equal(timeoutMs, 45000);
        throw { _code: "E_TIMEOUT", _id: "wh-timeout", _timeout_ms: 45000, _op: "xvibe.analyze-message" };
      }
      throw new Error(`unexpected command ${command._op}`);
    }
  });

  await module._append_conversation_message("make title blue");
  const analyzeCommands = commands.filter(item => item.command._op === "analyze-message");
  assert.equal(analyzeCommands.length, 1);
  assert.equal(analyzeCommands[0].timeoutMs, 45000);
  assert.equal(module.__lastStatus, "Analysis took too long. Please retry.");
  assert.equal(module._conversation_transient_messages.length, 1);
  assert.equal(module._conversation_transient_messages[0]._text, "Analysis took too long. Please retry.");
  assert.equal(module._conversation_transient_messages[0]._intent._details._timeout_ms, 45000);
  assert.equal(module._conversation_transient_messages[0]._intent._details._raw_error._id, "wh-timeout");

  const rendered = module._conversation_render_message(module._conversation_transient_messages[0], 0);
  const renderedList = create_xstudio_conversation_message_list([rendered]);
  const renderedTexts = collectTexts(renderedList[0]);
  assert.equal(renderedTexts.includes("Analysis took too long. Please retry."), true);
  assert.equal(renderedTexts.includes("Debug ▼"), true);
  assert.equal(renderedTexts.some(text => text.includes("wh-timeout")), true);
}

{
  const messages = [];
  let resolveFirstAnalyze;
  const { module, commands } = createConversationHarness({
    messages,
    onCommand(command, timeoutMs) {
      if (command._op === "get-last-messages") return { _ok: true, _result: { _messages: messages } };
      if (command._op === "list-conversations") return { _ok: true, _result: { _conversations: [] } };
      if (command._op === "append-message") {
        const message = {
          _id: `user-${messages.length + 1}`,
          _role: "user",
          _text: command._params._message._text,
          _created_at: `2026-07-15T00:00:0${messages.length}.000Z`
        };
        messages.push(message);
        return { _ok: true, _result: { _message: message } };
      }
      if (command._op === "analyze-message" && command._params._message === "first request") {
        assert.equal(timeoutMs, 45000);
        return new Promise(resolve => {
          resolveFirstAnalyze = () => resolve({
            _ok: true,
            _result: {
              _intent: { _message_type: "conversation", _execution_level: "none", _actions: [] }
            }
          });
        });
      }
      if (command._op === "analyze-message" && command._params._message === "second request") {
        assert.equal(timeoutMs, 45000);
        return {
          _ok: true,
          _result: {
            _intent: { _message_type: "conversation", _execution_level: "none", _actions: [] }
          }
        };
      }
      throw new Error(`unexpected command ${command._op}`);
    }
  });

  const first = module._append_conversation_message("first request");
  while (!resolveFirstAnalyze) {
    await Promise.resolve();
  }
  const second = module._append_conversation_message("second request");
  await second;
  const loadCountAfterSecond = commands.filter(item => item.command._op === "get-last-messages").length;
  resolveFirstAnalyze();
  await first;
  const loadCountAfterLateFirst = commands.filter(item => item.command._op === "get-last-messages").length;
  assert.equal(loadCountAfterLateFirst, loadCountAfterSecond);
  assert.equal(commands.filter(item => item.command._op === "analyze-message").length, 2);
}

{
  const messages = [];
  let analyzeCount = 0;
  const { module, commands } = createConversationHarness({
    messages,
    onCommand(command, timeoutMs) {
      if (command._op === "get-last-messages") return { _ok: true, _result: { _messages: messages } };
      if (command._op === "list-conversations") return { _ok: true, _result: { _conversations: [] } };
      if (command._op === "append-message") {
        const message = {
          _id: `user-retry-${messages.length + 1}`,
          _role: "user",
          _text: command._params._message._text,
          _created_at: `2026-07-15T00:00:0${messages.length}.000Z`
        };
        messages.push(message);
        return { _ok: true, _result: { _message: message } };
      }
      if (command._op === "analyze-message") {
        assert.equal(timeoutMs, 45000);
        analyzeCount += 1;
        if (analyzeCount === 1) {
          throw { _code: "E_TIMEOUT", _id: "first-timeout", _timeout_ms: 45000 };
        }

        messages.push(
          {
            _id: "late-tool",
            _role: "tool",
            _text: "Intent analyzed.",
            _created_at: "2020-01-01T00:00:02.000Z",
            _intent: {
              _message_type: "conversation",
              _execution_level: "artifact",
              _actions: [{ _id: "late-action", _title: "Late action" }]
            },
            _metadata: {
              _source: "xvibe.analyze-message",
              _normalized_prompt: "retry prompt"
            }
          },
          {
            _id: "retry-tool",
            _role: "tool",
            _text: "Intent analyzed.",
            _created_at: "2020-01-01T00:00:03.000Z",
            _intent: {
              _message_type: "conversation",
              _execution_level: "artifact",
              _actions: [{ _id: "retry-action", _title: "Retry action" }]
            },
            _metadata: {
              _source: "xvibe.analyze-message",
              _normalized_prompt: "retry prompt"
            }
          }
        );
        return {
          _ok: true,
          _result: {
            _intent: messages[messages.length - 1]._intent,
            _message: messages[messages.length - 1]
          }
        };
      }
      throw new Error(`unexpected command ${command._op}`);
    }
  });

  await module._append_conversation_message("retry prompt");
  await module._append_conversation_message("retry prompt");
  assert.equal(analyzeCount, 2);
  assert.equal(commands.filter(item => item.command._op === "analyze-message").length, 2);
  const analyzeMessages = module._conversation_messages.filter(message =>
    (message._role === "tool" || message._role === "assistant") &&
    message._metadata?._source === "xvibe.analyze-message"
  );
  assert.equal(analyzeMessages.length, 1);
  assert.equal(analyzeMessages[0]._id, "retry-tool");
}

{
  const { module } = createConversationHarness();
  const planningToolMessage = {
    _id: "planning-tool-message",
    _role: "tool",
    _text: "",
    _created_at: "2026-07-15T00:00:00.000Z",
    _intent: {
      _message_type: "planning",
      _artifact_type: PROJECT_PLAN_ARTIFACT_TYPE,
      _project_plan: {
        _type: PROJECT_PLAN_ARTIFACT_TYPE,
        _goal: "Build a planner",
        _summary: "Plan a small app."
      }
    }
  };
  const genericToolMessage = {
    _id: "generic-tool-message",
    _role: "tool",
    _text: "Intent analyzed.",
    _created_at: "2026-07-15T00:00:01.000Z",
    _intent: {
      _message_type: "conversation",
      _execution_level: "none",
      _actions: []
    }
  };
  const planningRendered = module._conversation_render_message(planningToolMessage, 0);
  const genericRendered = module._conversation_render_message(genericToolMessage, 1);
  const roleViews = create_xstudio_conversation_message_list([planningRendered, genericRendered]);
  assert.equal(collectNormalTexts(roleViews[0]).includes("XVibe"), true);
  assert.equal(collectNormalTexts(roleViews[0]).includes("Tool"), false);
  assert.equal(collectNormalTexts(roleViews[1]).includes("Tool"), true);
}

{
  const { module, commands } = createConversationHarness({
    onCommand(command, timeoutMs) {
      if (command._op === "apply-view-edit") {
        assert.equal(timeoutMs, undefined);
        return { _ok: true, _result: { _applied: true } };
      }
      throw new Error(`unexpected command ${command._op}`);
    }
  });

  const result = await module._send_xvibe_command("apply-view-edit", { _edit_action: "hide-object" });
  assert.deepEqual(result, { _applied: true });
  assert.equal(commands.length, 1);
  assert.equal(commands[0].timeoutMs, undefined);
}

{
  const mutationMessage = {
    _id: "message-mutation-plan",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Toolbar",
        _goal: "Improve dashboard controls",
        _summary: "Move common controls into a toolbar.",
        _estimated_mutations: 3,
        _status: "planned",
        _steps: [
          {
            _id: "move-refresh",
            _title: "Move Refresh button into main toolbar",
            _status: "planned"
          },
          {
            _id: "add-export",
            _title: "Add Export button",
            _status: "planned"
          },
          {
            _id: "style-toolbar",
            _title: "Style toolbar spacing",
            _status: "planned"
          }
        ],
        _buttons: [
          {
            _id: "apply-plan",
            _title: "Apply Plan",
            _status: "placeholder"
          }
        ]
      }
    }
  };

  const request = create_xstudio_artifact_request_view(mutationMessage, {
    _key: "mutation-plan-key",
    _message_id: mutationMessage._id
  });

  assert.equal(request._artifact_type, MUTATION_PLAN_ARTIFACT_TYPE);

  const card = create_xstudio_artifact_request_card(request, {
    _message_index: 0
  });
  const texts = collectTexts(card);

  assert.equal(findView(card, item => String(item.class ?? "").includes("xstudio-mutation-plan-card")) !== null, true);
  assert.equal(texts.includes("Change Plan"), true);
  assert.equal(texts.includes("Goal: Improve dashboard controls"), true);
  assert.equal(texts.includes("Move common controls into a toolbar."), true);
  assert.equal(texts.includes("3 planned changes"), true);
  assert.equal(texts.includes("1"), true);
  assert.equal(texts.includes("2"), true);
  assert.equal(texts.includes("3"), true);
  assert.equal(texts.includes("Move Refresh button into main toolbar"), true);
  assert.equal(texts.includes("planned"), true);
  assert.equal(texts.includes("Plan execution is coming next."), true);

  const applyButton = findView(card, item => item._id === "xstudio-mutation-plan-apply-0");
  const editButton = findView(card, item => item._id === "xstudio-mutation-plan-edit-0");
  const cancelButton = findView(card, item => item._id === "xstudio-mutation-plan-cancel-0");

  assert.equal(applyButton.disabled, true);
  assert.equal(editButton.disabled, true);
  assert.equal(applyButton._on, undefined);
  assert.equal(editButton._on, undefined);
  assert.equal(cancelButton._on.click._params.event, "studio:artifact-request-dismiss");
  assert.equal(cancelButton._on.click._params.data._artifact_type, MUTATION_PLAN_ARTIFACT_TYPE);

  const module = new XStudioModule(null);
  let persistCount = 0;
  let renderCount = 0;
  let serverCommandCount = 0;
  module._persist_conversation_artifact_status_and_reload = async () => {
    persistCount += 1;
    return true;
  };
  module._render_conversation_messages = () => {
    renderCount += 1;
  };
  module._send_xvibe_command = async () => {
    serverCommandCount += 1;
    return { _ok: true };
  };

  await module._dismiss_conversation_artifact_request(cancelButton._on.click._params.data);
  assert.equal(persistCount, 0);
  assert.equal(renderCount > 0, true);

  await module._apply_conversation_artifact_request(cancelButton._on.click._params.data);
  assert.equal(serverCommandCount, 0);

  const messageList = create_xstudio_conversation_message_list([
    {
      ...mutationMessage,
      _actions: [],
      _artifact_request: request,
      _artifact_status: "",
      _artifact_error: "",
      _artifact_success: "",
      _artifact_result: undefined,
      _planning_question_selected_answers: {}
    }
  ]);
  const messageTexts = collectTexts(messageList[0]);
  assert.equal(messageTexts.includes("Mutation plan created: Toolbar\n3 planned changes"), true);
  assert.equal(messageTexts.includes("Debug ▼"), true);

  const readyMessage = {
    _id: "message-mutation-plan-ready",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Toolbar",
        _goal: "Apply compiled toolbar changes",
        _summary: "All changes have deterministic primitives.",
        _estimated_mutations: 2,
        _status: "planned",
        _can_apply: true,
        _executable_steps: ["move-refresh", "style-toolbar"],
        _unsupported_steps: [],
        _steps: [
          {
            _id: "move-refresh",
            _title: "Move Refresh button into main toolbar",
            _status: "planned",
            _primitive: {
              _module: "xvibe",
              _op: "apply-view-edit",
              _params: {
                _edit_action: "move-object"
              }
            }
          },
          {
            _id: "style-toolbar",
            _title: "Style toolbar spacing",
            _status: "planned",
            _primitive: {
              _module: "xvibe",
              _op: "apply-view-edit",
              _params: {
                _edit_action: "set-styles"
              }
            }
          }
        ]
      }
    }
  };

  const readyRequest = create_xstudio_artifact_request_view(readyMessage, {
    _key: "mutation-plan-ready-key",
    _message_id: "message-mutation-plan-ready"
  });
  const readyCard = create_xstudio_artifact_request_card(readyRequest, {
    _message_index: 3
  });
  const readyTexts = collectTexts(readyCard);
  const readyApplyButton = findView(readyCard, item => item._id === "xstudio-mutation-plan-apply-3");
  const readyEditButton = findView(readyCard, item => item._id === "xstudio-mutation-plan-edit-3");

  assert.equal(String(readyCard.class ?? "").includes("xstudio-mutation-plan-ready"), true);
  assert.equal(readyTexts.includes("2 deterministic"), true);
  assert.equal(readyTexts.includes("2 executable"), true);
  assert.equal(readyTexts.includes("0 unsupported"), false);
  assert.equal(readyTexts.includes("Ready to apply"), true);
  assert.equal(readyTexts.filter(text => text === "Deterministic").length, 2);
  assert.equal(readyTexts.includes("Move object view"), true);
  assert.equal(readyTexts.includes("Set styles view"), true);
  assert.equal(readyTexts.includes("All planned changes are ready to apply."), true);
  assert.equal(readyApplyButton.disabled, undefined);
  assert.equal(readyApplyButton._on.click._params.event, "studio:artifact-request-apply");
  assert.equal(readyEditButton.disabled, true);

  const hidePrimitive = (id, label, status = "planned") => ({
    _id: `hide-${id}`,
    _title: `Set ${id} _visible false`,
    _status: status,
    _primitive: {
      _module: "xvibe",
      _op: "apply-view-edit",
      _params: {
        _edit_action: "hide-object",
        _view_id: "main",
        _target_id: id,
        ...(label ? { _target_label: label } : {}),
        _mutation_property: "_visible",
        _value: false
      }
    }
  });
  const hidePlanRequest = create_xstudio_artifact_request_view({
    _id: "message-mutation-plan-hide-objects",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Hide dashboard objects",
        _goal: "Hide selected content from the current main view",
        _summary: "The selected objects can be hidden safely.",
        _estimated_mutations: 5,
        _status: "planned",
        _can_apply: true,
        _executable_steps: [
          "hide-overview-section",
          "hide-records-section",
          "hide-secondary-dashboard-content",
          "hide-create-record-modal",
          "hide-feedback-toast"
        ],
        _unsupported_steps: [],
        _steps: [
          hidePrimitive("overview-section", "Overview section"),
          hidePrimitive("records-section", "Records section", "already-hidden"),
          hidePrimitive("secondary-dashboard-content", "Secondary dashboard content"),
          hidePrimitive("create-record-modal", "Create Record modal"),
          hidePrimitive("feedback-toast", "Feedback toast")
        ]
      }
    }
  }, {
    _key: "mutation-plan-hide-key",
    _message_id: "message-mutation-plan-hide-objects"
  });
  const hidePlanCard = create_xstudio_artifact_request_card(hidePlanRequest, {
    _message_index: 11
  });
  const hidePlanTexts = collectNormalTexts(hidePlanCard);
  const hidePlanApplyButton = findView(hidePlanCard, item => item._id === "xstudio-mutation-plan-apply-11");
  assert.equal(String(hidePlanCard.class ?? "").includes("xstudio-mutation-plan-ready"), true);
  assert.equal(hidePlanTexts.includes("5 planned changes"), true);
  assert.equal(hidePlanTexts.includes("5 deterministic"), true);
  assert.equal(hidePlanTexts.includes("5 executable"), true);
  assert.equal(hidePlanTexts.includes("Ready to apply"), true);
  assert.equal(hidePlanTexts.includes("Hide Overview section"), true);
  assert.equal(hidePlanTexts.includes("Hide Records section"), true);
  assert.equal(hidePlanTexts.includes("Hide Secondary dashboard content"), true);
  assert.equal(hidePlanTexts.includes("Hide Create Record modal"), true);
  assert.equal(hidePlanTexts.includes("Hide Feedback toast"), true);
  assert.equal(hidePlanTexts.includes("Already hidden"), true);
  assert.equal(hidePlanTexts.some(text => text.includes("_edit_action")), false);
  assert.equal(hidePlanTexts.some(text => text.includes("_mutation_property")), false);
  assert.equal(hidePlanTexts.some(text => text.includes("_visible")), false);
  assert.equal(hidePlanTexts.some(text => text.includes("Set records-section _visible false")), false);
  assert.equal(hidePlanApplyButton.disabled, undefined);
  assert.equal(hidePlanApplyButton._on.click._params.event, "studio:artifact-request-apply");

  const missingTargetRequest = create_xstudio_artifact_request_view({
    _id: "message-mutation-plan-missing-target",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Hide unavailable object",
        _goal: "Hide selected content",
        _summary: "One selected object is no longer in the view.",
        _estimated_mutations: 2,
        _status: "planned",
        _can_apply: true,
        _executable_steps: ["hide-overview-section"],
        _unsupported_steps: [],
        _validation_failed_steps: 1,
        _steps: [
          hidePrimitive("overview-section", "Overview section"),
          {
            _id: "hide-missing-target",
            _title: "Hide removed panel",
            _status: "planned",
            _resolution_state: "validation-failed",
            _validation_reason: "object-not-found",
            _validation_error: {
              _reason: "object-not-found",
              _object_path: "$._children[9]",
              _target_id: "removed-panel"
            }
          }
        ]
      }
    }
  }, {
    _key: "mutation-plan-missing-target-key",
    _message_id: "message-mutation-plan-missing-target"
  });
  const missingTargetCard = create_xstudio_artifact_request_card(missingTargetRequest, {
    _message_index: 12
  });
  const missingTargetTexts = collectNormalTexts(missingTargetCard);
  const missingTargetApplyButton = findView(missingTargetCard, item => item._id === "xstudio-mutation-plan-apply-12");
  const missingTargetDebug = findView(missingTargetCard, item => item._id === "xstudio-mutation-plan-debug-12");
  assert.equal(String(missingTargetCard.class ?? "").includes("xstudio-mutation-plan-blocked"), true);
  assert.equal(missingTargetTexts.includes("1 executable"), true);
  assert.equal(missingTargetTexts.includes("Not ready"), true);
  assert.equal(missingTargetTexts.includes("Object was not found."), true);
  assert.equal(missingTargetTexts.some(text => text.includes("$._children[9]")), false);
  assert.equal(missingTargetDebug._html_tag, "details");
  assert.equal(missingTargetDebug.open, undefined);
  assert.equal(collectTexts(missingTargetDebug).join("\n").includes("$._children[9]"), true);
  assert.equal(missingTargetApplyButton.disabled, true);
  assert.equal(missingTargetApplyButton._on, undefined);

  const staleViewRequest = create_xstudio_artifact_request_view({
    _id: "message-mutation-plan-stale-view",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Hide stale object",
        _goal: "Hide selected content",
        _summary: "The view changed before the plan could be applied.",
        _estimated_mutations: 1,
        _status: "planned",
        _can_apply: false,
        _executable_steps: [],
        _unsupported_steps: [],
        _validation_failed_steps: 1,
        _steps: [
          {
            _id: "hide-stale-target",
            _title: "Hide stale panel",
            _status: "planned",
            _resolution_state: "validation-failed",
            _validation_reason: "stale-view"
          }
        ]
      }
    }
  }, {
    _key: "mutation-plan-stale-view-key",
    _message_id: "message-mutation-plan-stale-view"
  });
  const staleViewCard = create_xstudio_artifact_request_card(staleViewRequest, {
    _message_index: 13
  });
  const staleViewTexts = collectNormalTexts(staleViewCard);
  const staleViewApplyButton = findView(staleViewCard, item => item._id === "xstudio-mutation-plan-apply-13");
  assert.equal(staleViewTexts.includes("View changed. Refresh and try again."), true);
  assert.equal(staleViewApplyButton.disabled, true);

  const generationPendingRequest = create_xstudio_artifact_request_view({
    _id: "message-mutation-plan-generation-pending",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Inventory board",
        _goal: "Replace the starter view with an inventory workflow",
        _summary: "XVibe is resolving missing view changes.",
        _estimated_mutations: 3,
        _status: "planned",
        _can_apply: false,
        _executable_steps: [],
        _unsupported_steps: 3,
        _steps: [
          {
            _id: "replace-main",
            _title: "Replace starter dashboard with inventory board",
            _status: "unsupported",
            _reason: "no_supported_primitive_mapping"
          },
          {
            _id: "add-detail",
            _title: "Add inventory item details",
            _status: "unsupported",
            _reason: "no_supported_primitive_mapping"
          },
          {
            _id: "connect-list",
            _title: "Connect the list to existing item records",
            _status: "unsupported",
            _reason: "no_supported_primitive_mapping"
          }
        ]
      }
    }
  }, {
    _key: "mutation-plan-generation-pending-key",
    _message_id: "message-mutation-plan-generation-pending"
  });
  const generationPendingCard = create_xstudio_artifact_request_card(generationPendingRequest, {
    _message_index: 6
  });
  const generationPendingTexts = collectTexts(generationPendingCard);
  const generationPendingApply = findView(generationPendingCard, item => item._id === "xstudio-mutation-plan-apply-6");
  assert.equal(generationPendingTexts.includes("Generating missing changes"), true);
  assert.equal(generationPendingTexts.includes("Generating 3 missing changes with XVibe…"), true);
  assert.equal(generationPendingTexts.includes("Generating 3"), true);
  assert.equal(generationPendingTexts.includes("XVibe is generating a safe operation."), true);
  assert.equal(generationPendingTexts.some(text => text.includes("no_supported_primitive_mapping")), false);
  assert.equal(generationPendingApply.disabled, true);
  assert.equal(generationPendingApply._on, undefined);

  const generatedPrimitive = (stepId, kind, viewId) => ({
    _module: "xvibe",
    _op: "apply-generated-operation",
    _params: {
      _operation: {
        _type: "xvibe-generated-operation",
        _contract_version: 1,
        _id: `${kind}-${viewId}`,
        _source_step_id: stepId,
        _kind: kind,
        _target: {
          _app_id: "app-inventory",
          _env: "default",
          _view_id: viewId
        },
        _artifact: {
          _artifact_type: "view",
          _contract_version: 1,
          _view: {
            _id: viewId,
            _type: "view",
            _children: []
          }
        }
      }
    }
  });
  const generatedRequest = create_xstudio_artifact_request_view({
    _id: "message-mutation-plan-generated",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Inventory workflow",
        _goal: "Create a usable inventory experience",
        _summary: "XVibe generated validated view operations.",
        _estimated_mutations: 3,
        _status: "planned",
        _can_apply: true,
        _executable_steps: ["replace-main", "create-detail", "create-history"],
        _unsupported_steps: [],
        _steps: [
          {
            _id: "replace-main",
            _title: "Replace starter dashboard with inventory board",
            _status: "planned",
            _resolution_state: "generated",
            _primitive: generatedPrimitive("replace-main", "view.replace", "main")
          },
          {
            _id: "create-detail",
            _title: "Create inventory item detail view",
            _status: "planned",
            _resolution_state: "generated",
            _primitive: generatedPrimitive("create-detail", "view.create", "inventory-detail")
          },
          {
            _id: "create-history",
            _title: "Create inventory history view",
            _status: "planned",
            _resolution_state: "generated",
            _primitive: generatedPrimitive("create-history", "view.create", "inventory-history")
          }
        ]
      }
    }
  }, {
    _key: "mutation-plan-generated-key",
    _message_id: "message-mutation-plan-generated"
  });
  const generatedCard = create_xstudio_artifact_request_card(generatedRequest, {
    _message_index: 7
  });
  const generatedTexts = collectTexts(generatedCard);
  const generatedApply = findView(generatedCard, item => item._id === "xstudio-mutation-plan-apply-7");
  assert.equal(generatedTexts.includes("3 planned changes"), true);
  assert.equal(generatedTexts.includes("3 AI-generated"), true);
  assert.equal(generatedTexts.includes("3 executable"), true);
  assert.equal(generatedTexts.includes("Ready to apply"), true);
  assert.equal(generatedTexts.filter(text => text === "AI-generated").length, 3);
  assert.equal(generatedTexts.includes("Replace view main"), true);
  assert.equal(generatedTexts.includes("Create view inventory-detail"), true);
  assert.equal(generatedTexts.includes("View: main"), true);
  assert.equal(generatedApply.disabled, undefined);
  assert.equal(generatedApply._on.click._params.event, "studio:artifact-request-apply");

  const mixedRequest = create_xstudio_artifact_request_view({
    _id: "message-mutation-plan-mixed",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Customer console",
        _goal: "Update customer operations",
        _summary: "One deterministic edit and one generated view replacement.",
        _estimated_mutations: 2,
        _status: "planned",
        _can_apply: true,
        _executable_steps: ["rename-heading", "replace-main"],
        _unsupported_steps: [],
        _steps: [
          {
            _id: "rename-heading",
            _title: "Rename customer heading",
            _status: "planned",
            _primitive: {
              _module: "xvibe",
              _op: "apply-view-edit",
              _params: {
                _edit_action: "set-property",
                _view_id: "main",
                _target_id: "customer-heading"
              }
            }
          },
          {
            _id: "replace-main",
            _title: "Replace main view with customer console",
            _status: "planned",
            _resolution_state: "generated",
            _primitive: generatedPrimitive("replace-main", "view.replace", "main")
          }
        ]
      }
    }
  }, {
    _key: "mutation-plan-mixed-key",
    _message_id: "message-mutation-plan-mixed"
  });
  const mixedCard = create_xstudio_artifact_request_card(mixedRequest, {
    _message_index: 8
  });
  const mixedTexts = collectTexts(mixedCard);
  assert.equal(mixedTexts.includes("1 deterministic"), true);
  assert.equal(mixedTexts.includes("1 AI-generated"), true);
  assert.equal(mixedTexts.includes("2 executable"), true);
  assert.equal(mixedTexts.includes("Deterministic"), true);
  assert.equal(mixedTexts.includes("AI-generated"), true);
  assert.equal(mixedTexts.includes("Set property view main"), true);
  assert.equal(mixedTexts.some(text => text.includes("Target: customer-heading")), true);

  const validationFailedRequest = create_xstudio_artifact_request_view({
    _id: "message-mutation-plan-validation-failed",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Reports workspace",
        _goal: "Generate a reports view",
        _summary: "Generated output failed validation.",
        _estimated_mutations: 1,
        _status: "planned",
        _can_apply: false,
        _executable_steps: [],
        _unsupported_steps: 0,
        _validation_failed_steps: 1,
        _steps: [
          {
            _id: "replace-main",
            _title: "Replace reports starter view",
            _status: "planned",
            _resolution_state: "validation-failed",
            _reason: "unsupported_xui_type",
            _validation_reason: "unsupported_xui_type",
            _validation_error: {
              _reason: "unsupported_xui_type",
              _code: "E_XVIBE_MUTATION_PLAN_GENERATION_UNSUPPORTED_XUI_TYPE",
              _message: "Invalid repaired AI output: _view._children[0] has unknown runtime _type 'unsupported-widget'",
              _validator_code: "unsupported_xui_type",
              _object_path: "_view._children[0]",
              _invalid_type: "unsupported-widget",
              _repair_attempt_count: 2,
              _generation_run_id: "mutation-plan-fallback-test",
              _initial_validation_summary: [
                "_view._children[0] has unknown runtime _type 'unsupported-widget'"
              ],
              _final_validation_summary: [
                "_view._children[0] has unknown runtime _type 'unsupported-widget'"
              ],
              _details: {
                _repair_attempt_count: 2,
                _last_validation_diagnostics: [
                  {
                    _code: "unsupported_xui_type",
                    _path: "_view._children[0]",
                    _invalid_type: "unsupported-widget",
                    _message: "_view._children[0] has unknown runtime _type 'unsupported-widget'"
                  }
                ]
              }
            }
          }
        ]
      }
    }
  }, {
    _key: "mutation-plan-validation-failed-key",
    _message_id: "message-mutation-plan-validation-failed"
  });
  const validationFailedCard = create_xstudio_artifact_request_card(validationFailedRequest, {
    _message_index: 9
  });
  const validationFailedTexts = collectTexts(validationFailedCard);
  const validationFailedApply = findView(validationFailedCard, item => item._id === "xstudio-mutation-plan-apply-9");
  const validationFailedDebug = findView(validationFailedCard, item => item._id === "xstudio-mutation-plan-debug-9");
  assert.equal(validationFailedTexts.includes("Validation failed"), true);
  assert.equal(validationFailedTexts.includes("Generated view contains unsupported XUI elements."), true);
  assert.equal(validationFailedTexts.includes("Generated changes must pass validation before Apply Plan can run."), true);
  assert.equal(validationFailedTexts.some(text => text.includes("unsupported after generation")), false);
  assert.equal(validationFailedDebug._html_tag, "details");
  const validationFailedDebugText = collectTexts(validationFailedDebug).join("\n");
  assert.equal(validationFailedDebugText.includes("_view._children[0]"), true);
  assert.equal(validationFailedDebugText.includes("unsupported-widget"), true);
  assert.equal(validationFailedDebugText.includes("_repair_attempt_count"), true);
  assert.equal(validationFailedDebugText.includes("mutation-plan-fallback-test"), true);
  assert.equal(validationFailedDebugText.includes("_prompt"), false);
  assert.equal(validationFailedApply.disabled, true);

  const genuineUnsupportedRequest = create_xstudio_artifact_request_view({
    _id: "message-mutation-plan-genuine-unsupported",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Analytics console",
        _goal: "Add unsupported app-shell behavior",
        _summary: "XVibe could not produce a safe operation.",
        _estimated_mutations: 1,
        _status: "planned",
        _can_apply: false,
        _executable_steps: [],
        _unsupported_steps: ["set-entry-view"],
        _steps: [
          {
            _id: "set-entry-view",
            _title: "Set a new default view",
            _status: "unsupported",
            _resolution_state: "genuinely-unsupported"
          }
        ]
      }
    }
  }, {
    _key: "mutation-plan-genuine-unsupported-key",
    _message_id: "message-mutation-plan-genuine-unsupported"
  });
  const genuineUnsupportedCard = create_xstudio_artifact_request_card(genuineUnsupportedRequest, {
    _message_index: 10
  });
  const genuineUnsupportedTexts = collectTexts(genuineUnsupportedCard);
  assert.equal(genuineUnsupportedTexts.includes("Unsupported after generation failure"), true);
  assert.equal(genuineUnsupportedTexts.includes("No safe operation is available after generation."), true);
  assert.equal(genuineUnsupportedTexts.includes("Some planned changes are unsupported after generation."), true);

  const generatedApplyCommands = [];
  const generatedRenderedViews = [];
  let generatedExplorerRefreshCount = 0;
  let generatedCanvasRefreshCount = 0;
  let generatedViewJsonRefreshCount = 0;
  let generatedGuideRefreshCount = 0;
  const generatedPersistCalls = [];
  const generatedModule = new XStudioModule({
    getActiveAppId() {
      return "app-inventory";
    },
    getActiveEnv() {
      return "default";
    },
    get_current_view_id() {
      return "main";
    },
    get_app_view_id() {
      return "main";
    },
    async render_view(view_id) {
      generatedRenderedViews.push(view_id);
    },
    async sendXcmd(command) {
      generatedApplyCommands.push(command);
      if (command._op === "apply-mutation-plan") {
        return {
          _ok: true,
          _result: {
            _refresh: {
              _default_view_id: "inventory-detail"
            },
            _steps: [
              { _id: "replace-main", _status: "done" },
              { _id: "create-detail", _status: "done" },
              { _id: "create-history", _status: "done" }
            ],
            _completed_count: 3
          }
        };
      }
      throw new Error(`unexpected generated command: ${command._op}`);
    },
    isServerReady() {
      return true;
    }
  });
  generatedModule._conversation_app_id = "app-inventory";
  generatedModule._conversation_env = "default";
  generatedModule._conversation_id = "conversation-generated";
  generatedModule._refresh_app_explorer = async () => {
    generatedExplorerRefreshCount += 1;
  };
  generatedModule._refresh_object_tree_for_current_view = () => {
    generatedCanvasRefreshCount += 1;
  };
  generatedModule._load_studio_current_view_json = async () => {
    generatedViewJsonRefreshCount += 1;
  };
  generatedModule._refresh_guide_after_success = async reason => {
    assert.equal(reason, "mutation-plan-success");
    generatedGuideRefreshCount += 1;
  };
  generatedModule._persist_conversation_artifact_status_and_reload = async (requestToPersist, status, error, result) => {
    generatedPersistCalls.push({ requestToPersist, status, error, result });
    return true;
  };
  generatedModule._render_conversation_messages = () => {};
  generatedModule._write_studio_status = status => {
    generatedModule.__status = status;
  };

  await generatedModule._apply_conversation_artifact_request(generatedApply._on.click._params.data);
  assert.equal(generatedApplyCommands.length, 1);
  assert.equal(generatedApplyCommands[0]._op, "apply-mutation-plan");
  assert.equal(generatedApplyCommands[0]._params._app_id, "app-inventory");
  assert.deepEqual(generatedApplyCommands[0]._params._plan, generatedRequest._artifact_request);
  assert.deepEqual(generatedRenderedViews, ["inventory-detail"]);
  assert.equal(generatedExplorerRefreshCount, 1);
  assert.equal(generatedCanvasRefreshCount, 1);
  assert.equal(generatedViewJsonRefreshCount, 1);
  assert.equal(generatedGuideRefreshCount, 1);
  assert.equal(generatedModule.__status, "✓ Change plan applied");
  assert.equal(generatedPersistCalls.length, 1);
  assert.equal(generatedPersistCalls[0].requestToPersist._message_id, "message-mutation-plan-generated");
  assert.equal(generatedPersistCalls[0].status, "done");
  assert.equal(generatedPersistCalls[0].error, "");
  assert.equal(
    generatedPersistCalls[0].result?._result?._completed_count ??
      generatedPersistCalls[0].result?._completed_count,
    3
  );

  const readyCommands = [];
  let renderViewCount = 0;
  let objectTreeRefreshCount = 0;
  let appExplorerRefreshCount = 0;
  let viewJsonRefreshCount = 0;
  let guideRefreshCount = 0;
  let readyRenderCount = 0;
  let readyStatus = "";
  let resolveApply;
  let persistedReadyMessage = { ...readyMessage };
  const readyModule = new XStudioModule({
    getActiveAppId() {
      return "app-ready";
    },
    getActiveEnv() {
      return "default";
    },
    get_current_view_id() {
      return "main";
    },
    get_app_view_id() {
      return "main";
    },
    async render_view(view_id) {
      assert.equal(view_id, "main");
      renderViewCount += 1;
    },
    sendXcmd(command) {
      readyCommands.push(command);
      if (command._op === "apply-mutation-plan") {
        return new Promise(resolve => {
          resolveApply = () => resolve({
            _ok: true,
            _result: {
              _steps: [
                {
                  _id: "move-refresh",
                  _title: "Move Refresh button into main toolbar",
                  _status: "done"
                },
                {
                  _id: "style-toolbar",
                  _title: "Style toolbar spacing",
                  _status: "done"
                }
              ],
              _completed_steps: ["move-refresh", "style-toolbar"],
              _completed_count: 2
            }
          });
        });
      }
      if (command._op === "update-conversation-artifact") {
        assert.equal(command._params._artifact_status, "done");
        assert.equal(command._params._message_id, "message-mutation-plan-ready");
        persistedReadyMessage = {
          ...readyMessage,
          _intent: {
            ...readyMessage._intent,
            _artifact_status: command._params._artifact_status,
            _artifact_result: command._params._artifact_result
          }
        };
        return Promise.resolve({
          _ok: true,
          _result: {
            _message: persistedReadyMessage
          }
        });
      }
      if (command._op === "get-last-messages") {
        return Promise.resolve({
          _ok: true,
          _result: {
            _messages: [persistedReadyMessage]
          }
        });
      }
      throw new Error(`unexpected ready command: ${command._op}`);
    },
    isServerReady() {
      return true;
    }
  });
  readyModule._conversation_app_id = "app-ready";
  readyModule._conversation_env = "default";
  readyModule._conversation_id = "conversation-ready";
  readyModule._refresh_object_tree_for_current_view = () => {
    objectTreeRefreshCount += 1;
  };
  readyModule._refresh_app_explorer = async () => {
    appExplorerRefreshCount += 1;
  };
  readyModule._load_studio_current_view_json = async () => {
    viewJsonRefreshCount += 1;
  };
  readyModule._refresh_guide_after_success = async reason => {
    assert.equal(reason, "mutation-plan-success");
    guideRefreshCount += 1;
  };
  readyModule._render_conversation_messages = () => {
    readyRenderCount += 1;
  };
  readyModule._write_studio_status = status => {
    readyStatus = status;
  };

  const firstApply = readyModule._apply_conversation_artifact_request(readyApplyButton._on.click._params.data);
  const duplicateApply = readyModule._apply_conversation_artifact_request(readyApplyButton._on.click._params.data);
  assert.equal(readyCommands.length, 1);
  assert.equal(readyCommands[0]._module, "xvibe");
  assert.equal(readyCommands[0]._op, "apply-mutation-plan");
  assert.equal(readyCommands[0]._params._app_id, "app-ready");
  assert.equal(readyCommands[0]._params._env, "default");
  assert.equal(readyCommands[0]._params._conversation_id, "conversation-ready");
  assert.equal(readyCommands[0]._params._message_id, "message-mutation-plan-ready");
  assert.deepEqual(readyCommands[0]._params._plan, readyRequest._artifact_request);
  assert.equal(
    readyCommands.some(command => command._op === "apply-view-edit"),
    false
  );
  resolveApply();
  await firstApply;
  await duplicateApply;
  assert.equal(readyCommands.filter(command => command._op === "apply-mutation-plan").length, 1);
  assert.equal(readyCommands.filter(command => command._op === "update-conversation-artifact").length, 1);
  assert.equal(readyCommands.filter(command => command._op === "get-last-messages").length, 1);
  assert.equal(readyStatus, "✓ Change plan applied");
  assert.equal(renderViewCount, 1);
  assert.equal(objectTreeRefreshCount, 1);
  assert.equal(appExplorerRefreshCount, 1);
  assert.equal(viewJsonRefreshCount, 1);
  assert.equal(guideRefreshCount, 1);
  assert.equal(persistedReadyMessage._intent._artifact_status, "done");
  assert.equal(readyRenderCount > 0, true);

  const renderedAfterApply = readyModule._conversation_render_message(persistedReadyMessage, 0);
  const renderedAfterApplyList = create_xstudio_conversation_message_list([renderedAfterApply]);
  const renderedAfterApplyTexts = collectTexts(renderedAfterApplyList[0]);
  assert.equal(renderedAfterApplyTexts.includes("✓ Change plan applied"), true);
  assert.equal(renderedAfterApplyTexts.includes("2 / 2 changes completed"), true);
  assert.equal(renderedAfterApplyTexts.includes("Toolbar"), true);
  assert.equal(renderedAfterApplyTexts.includes("Ready to apply"), false);
  assert.equal(renderedAfterApplyTexts.includes("Deterministic"), false);
  assert.equal(findView(renderedAfterApplyList[0], item => item._id === "xstudio-mutation-plan-apply-0"), null);
  const renderedViewDetailsButton = findView(
    renderedAfterApplyList[0],
    item => item._id === "xstudio-mutation-plan-view-details-0"
  );
  assert.equal(renderedViewDetailsButton._on.click._params.event, "studio:mutation-plan-view-details");

  const recreatedAfterApply = readyModule._conversation_render_message({ ...persistedReadyMessage }, 7);
  const recreatedAfterApplyList = create_xstudio_conversation_message_list([recreatedAfterApply]);
  const recreatedAfterApplyTexts = collectTexts(recreatedAfterApplyList[0]);
  assert.equal(String(recreatedAfterApplyList[0].class ?? "").includes("xstudio-conversation-message"), true);
  assert.equal(findView(recreatedAfterApplyList[0], item => String(item.class ?? "").includes("xstudio-mutation-plan-card-compact")) !== null, true);
  assert.equal(recreatedAfterApplyTexts.includes("2 / 2 changes completed"), true);
  assert.equal(recreatedAfterApplyTexts.includes("Ready to apply"), false);
  assert.equal(findView(recreatedAfterApplyList[0], item => item._id === "xstudio-mutation-plan-apply-7"), null);

  const secondReadyMessage = {
    ...readyMessage,
    _id: "message-mutation-plan-second",
  };
  const renderedSecondPlan = readyModule._conversation_render_message(secondReadyMessage, 1);
  const renderedSecondPlanList = create_xstudio_conversation_message_list([renderedSecondPlan]);
  const renderedSecondPlanTexts = collectTexts(renderedSecondPlanList[0]);
  assert.equal(renderedSecondPlanTexts.includes("Ready to apply"), true);
  assert.equal(renderedSecondPlanTexts.includes("Deterministic"), true);
  assert.equal(renderedSecondPlanTexts.includes("2 / 2 changes completed"), false);

  const reloadModule = new XStudioModule(null);
  reloadModule._conversation_app_id = "app-ready";
  reloadModule._conversation_env = "default";
  reloadModule._conversation_id = "conversation-ready";
  const reloadedCompletedMessage = reloadModule._conversation_render_message(persistedReadyMessage, 0);
  const reloadedCompletedList = create_xstudio_conversation_message_list([reloadedCompletedMessage]);
  const reloadedCompletedTexts = collectTexts(reloadedCompletedList[0]);
  assert.equal(reloadedCompletedTexts.includes("✓ Change plan applied"), true);
  assert.equal(reloadedCompletedTexts.includes("2 / 2 changes completed"), true);
  assert.equal(reloadedCompletedTexts.includes("Ready to apply"), false);
  assert.equal(reloadedCompletedTexts.includes("Deterministic"), false);
  assert.equal(findView(reloadedCompletedList[0], item => item._id === "xstudio-mutation-plan-apply-0"), null);
  assert.equal(findView(reloadedCompletedList[0], item => String(item.class ?? "").includes("xstudio-mutation-plan-card-compact")) !== null, true);

  readyModule._show_mutation_plan_details(renderedViewDetailsButton._on.click._params.data);
  const renderedAfterDetails = readyModule._conversation_render_message(persistedReadyMessage, 0);
  const renderedAfterDetailsList = create_xstudio_conversation_message_list([renderedAfterDetails]);
  const renderedAfterDetailsTexts = collectTexts(renderedAfterDetailsList[0]);
  assert.equal(renderedAfterDetailsTexts.includes("Move Refresh button into main toolbar"), true);
  assert.equal(renderedAfterDetailsTexts.filter(text => text === "Done").length, 2);
  assert.equal(renderedAfterDetailsTexts.includes("Deterministic"), false);
  assert.equal(findView(renderedAfterDetailsList[0], item => item._id === "xstudio-mutation-plan-edit-0"), null);
  assert.equal(findView(renderedAfterDetailsList[0], item => item._id === "xstudio-mutation-plan-cancel-0"), null);

  const runningCard = create_xstudio_artifact_request_card(readyRequest, {
    _message_index: 3,
    _status: "running",
    _mutation_plan_collapsed: true
  });
  const runningTexts = collectTexts(runningCard);
  const runningApplyButton = findView(runningCard, item => item._id === "xstudio-mutation-plan-apply-3");
  const runningCancelButton = findView(runningCard, item => item._id === "xstudio-mutation-plan-cancel-3");
  assert.equal(runningTexts.includes("Applying…"), true);
  assert.equal(runningTexts.includes("Running"), true);
  assert.equal(runningTexts.includes("Move Refresh button into main toolbar"), true);
  assert.equal(runningApplyButton.disabled, true);
  assert.equal(runningCancelButton.disabled, true);

  const doneCard = create_xstudio_artifact_request_card(readyRequest, {
    _message_index: 3,
    _status: "done",
    _result: {
      _ok: true,
      _result: {
        _completed_steps: ["move-refresh", "style-toolbar"],
        _completed_count: 2
      }
    }
  });
  const doneTexts = collectTexts(doneCard);
  assert.equal(doneTexts.includes("✓ Change plan applied"), true);
  assert.equal(doneTexts.includes("2 completed"), true);
  assert.equal(doneTexts.filter(text => text === "Done").length, 2);

  const collapsedDoneCard = create_xstudio_artifact_request_card(readyRequest, {
    _message_index: 3,
    _status: "done",
    _result: {
      _ok: true,
      _result: {
        _completed_steps: ["move-refresh", "style-toolbar"],
        _completed_count: 2
      }
    },
    _mutation_plan_collapsed: true
  });
  const collapsedDoneTexts = collectTexts(collapsedDoneCard);
  const viewDetailsButton = findView(collapsedDoneCard, item => item._id === "xstudio-mutation-plan-view-details-3");
  const compactDismissButton = findView(collapsedDoneCard, item => item._id === "xstudio-mutation-plan-dismiss-3");
  assert.equal(String(collapsedDoneCard.class ?? "").includes("xstudio-mutation-plan-card-compact"), true);
  assert.equal(collapsedDoneTexts.includes("✓ Change plan applied"), true);
  assert.equal(collapsedDoneTexts.includes("2 / 2 changes completed"), true);
  assert.equal(collapsedDoneTexts.includes("Toolbar"), true);
  assert.equal(collapsedDoneTexts.includes("Move Refresh button into main toolbar"), false);
  assert.equal(viewDetailsButton._on.click._params.event, "studio:mutation-plan-view-details");
  assert.equal(compactDismissButton._on.click._params.event, "studio:artifact-request-dismiss");

  readyModule._show_mutation_plan_details(viewDetailsButton._on.click._params.data);
  assert.equal(readyModule._mutation_plan_collapsed["mutation-plan-ready-key"], false);
  const expandedDoneTexts = collectTexts(create_xstudio_artifact_request_card(readyRequest, {
    _message_index: 3,
    _status: "done",
    _result: {
      _ok: true,
      _result: {
        _completed_steps: ["move-refresh", "style-toolbar"],
        _completed_count: 2
      }
    },
    _mutation_plan_collapsed: readyModule._mutation_plan_collapsed["mutation-plan-ready-key"] === true
  }));
  assert.equal(expandedDoneTexts.includes("Move Refresh button into main toolbar"), true);

  readyModule._mutation_plan_collapsed["mutation-plan-ready-key"] = true;
  await readyModule._dismiss_conversation_artifact_request(compactDismissButton._on.click._params.data);
  assert.equal(readyCommands.filter(command => command._op === "apply-mutation-plan").length, 1);
  assert.equal(readyCommands.filter(command => command._op === "update-conversation-artifact").length, 1);
  assert.equal(readyModule._conversation_action_status["mutation-plan-ready-key"], "dismissed");
  assert.equal(readyModule._mutation_plan_collapsed["mutation-plan-ready-key"], undefined);

  const collapsedMessageList = create_xstudio_conversation_message_list([
    {
      _id: "message-mutation-plan-ready",
      _role: "assistant",
      _text: "",
      _created_at: "2026-07-13T00:00:00.000Z",
      _intent: {
        _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
        _mutation_plan: readyRequest._artifact_request
      },
      _actions: [],
      _artifact_request: readyRequest,
      _artifact_status: "done",
      _artifact_error: "",
      _artifact_success: "✓ Change plan applied",
      _artifact_result: {
        _ok: true,
        _result: {
          _completed_steps: ["move-refresh", "style-toolbar"],
          _completed_count: 2
        }
      },
      _planning_question_selected_answers: {},
      _mutation_plan_collapsed: true
    }
  ]);
  assert.equal(collapsedMessageList.length, 1);
  const collapsedMessageTexts = collectTexts(collapsedMessageList[0]);
  assert.equal(collapsedMessageTexts.includes("✓ Change plan applied"), true);
  assert.equal(collapsedMessageTexts.includes("Debug ▼"), true);

  const blockedRequest = create_xstudio_artifact_request_view({
    _id: "message-mutation-plan-blocked",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Unsupported toolbar",
        _goal: "Try a mixed plan",
        _summary: "One change cannot be compiled yet.",
        _estimated_mutations: 2,
        _status: "planned",
        _can_apply: false,
        _executable_steps: ["move-refresh"],
        _unsupported_steps: ["generate-new-widget"],
        _steps: [
          {
            _id: "move-refresh",
            _title: "Move Refresh button into main toolbar",
            _status: "planned",
            _primitive: {
              _module: "xvibe",
              _op: "apply-view-edit",
              _params: {
                _edit_action: "move-object"
              }
            }
          },
          {
            _id: "generate-new-widget",
            _title: "Generate a custom analytics widget",
            _status: "unsupported",
            _reason: "No deterministic primitive is available for widget generation."
          }
        ]
      }
    }
  }, {
    _key: "mutation-plan-blocked-key",
    _message_id: "message-mutation-plan-blocked"
  });
  const blockedCard = create_xstudio_artifact_request_card(blockedRequest, {
    _message_index: 4
  });
  const blockedTexts = collectTexts(blockedCard);
  const blockedApplyButton = findView(blockedCard, item => item._id === "xstudio-mutation-plan-apply-4");

  assert.equal(String(blockedCard.class ?? "").includes("xstudio-mutation-plan-blocked"), true);
  assert.equal(blockedTexts.includes("1 executable"), true);
  assert.equal(blockedTexts.includes("1 unsupported"), true);
  assert.equal(blockedTexts.includes("Not ready"), true);
  assert.equal(blockedTexts.includes("Deterministic"), true);
  assert.equal(blockedTexts.includes("Unsupported"), true);
  assert.equal(blockedTexts.includes("No deterministic primitive is available for widget generation."), false);
  assert.equal(blockedTexts.includes("No safe operation is available yet."), true);
  assert.equal(blockedTexts.includes("Some planned changes are unsupported after generation."), true);
  assert.equal(blockedApplyButton.disabled, true);
  assert.equal(blockedApplyButton._on, undefined);

  const blockedModule = new XStudioModule({
    getActiveAppId() {
      return "app-blocked";
    },
    getActiveEnv() {
      return "default";
    },
    get_current_view_id() {
      return "main";
    },
    get_app_view_id() {
      return "main";
    },
    async render_view() {},
    async sendXcmd() {
      throw new Error("non-ready mutation plan should not call server");
    },
    isServerReady() {
      return true;
    }
  });
  blockedModule._conversation_app_id = "app-blocked";
  blockedModule._conversation_env = "default";
  blockedModule._conversation_id = "conversation-blocked";
  await blockedModule._apply_conversation_artifact_request({
    _request_key: "blocked-key",
    _message_id: "message-mutation-plan-blocked",
    _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
    _operation: "preview",
    _artifact_name: "",
    _artifact_request: blockedRequest._artifact_request,
    _details: []
  });

  const partialRequest = create_xstudio_artifact_request_view({
    _id: "message-mutation-plan-partial",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: {
        _type: MUTATION_PLAN_ARTIFACT_TYPE,
        _title: "Partial toolbar",
        _goal: "Apply three compiled toolbar changes",
        _summary: "One change will fail and stop the plan.",
        _estimated_mutations: 3,
        _status: "planned",
        _can_apply: true,
        _executable_steps: ["move-refresh", "style-toolbar", "later-step"],
        _unsupported_steps: [],
        _steps: [
          {
            _id: "move-refresh",
            _title: "Move Refresh button into main toolbar",
            _status: "planned",
            _primitive: {
              _module: "xvibe",
              _op: "apply-view-edit",
              _params: {
                _edit_action: "move-object"
              }
            }
          },
          {
            _id: "style-toolbar",
            _title: "Style toolbar spacing",
            _status: "planned",
            _primitive: {
              _module: "xvibe",
              _op: "apply-view-edit",
              _params: {
                _edit_action: "set-styles"
              }
            }
          },
          {
            _id: "later-step",
            _title: "Update secondary action color",
            _status: "planned",
            _primitive: {
              _module: "xvibe",
              _op: "apply-view-edit",
              _params: {
                _edit_action: "set-style"
              }
            }
          }
        ]
      }
    }
  }, {
    _key: "mutation-plan-partial-key",
    _message_id: "message-mutation-plan-partial"
  });

  const partialFailureCard = create_xstudio_artifact_request_card(partialRequest, {
    _message_index: 5,
    _status: "failed",
    _error: "E_STEP_FAILED: Move failed",
    _mutation_plan_collapsed: true,
    _result: {
      _ok: false,
      _error: {
        _code: "E_STEP_FAILED",
        _message: "Move failed"
      },
      _result: {
        _completed_steps: ["move-refresh"],
        _failed_step: "style-toolbar",
        _not_run_steps: ["later-step"],
        _completed_count: 1
      }
    }
  });
  const partialTexts = collectTexts(partialFailureCard);
  const retryButton = findView(partialFailureCard, item => item._id === "xstudio-mutation-plan-apply-5");
  const failedCancelButton = findView(partialFailureCard, item => item._id === "xstudio-mutation-plan-cancel-5");
  assert.equal(partialTexts.includes("Stopped on failure"), true);
  assert.equal(partialTexts.includes("Stopped after the failed step. Later changes were not run."), true);
  assert.equal(partialTexts.includes("E_STEP_FAILED: Move failed"), true);
  assert.equal(partialTexts.includes("Move Refresh button into main toolbar"), true);
  assert.equal(partialTexts.includes("1 completed"), true);
  assert.equal(partialTexts.includes("Done"), true);
  assert.equal(partialTexts.includes("Failed"), true);
  assert.equal(partialTexts.includes("Not run"), true);
  assert.equal(retryButton._text, "Retry");
  assert.equal(retryButton.disabled, undefined);
  assert.equal(retryButton._on.click._params.event, "studio:artifact-request-apply");
  assert.equal(failedCancelButton.disabled, true);

  const localFailedCard = create_xstudio_artifact_request_card(partialRequest, {
    _message_index: 5,
    _mutation_plan_execution_state: {
      _status: "failed",
      _collapsed: false,
      _completed_steps: 1,
      _failed_steps: 1,
      _steps: [
        {
          _id: "move-refresh",
          _title: "Move Refresh button into main toolbar",
          _status: "done"
        },
        {
          _id: "style-toolbar",
          _title: "Style toolbar spacing",
          _status: "failed"
        },
        {
          _id: "later-step",
          _title: "Update secondary action color",
          _status: "not-run"
        }
      ],
      _result: {
        _ok: false,
        _result: {
          _completed_count: 1,
          _failed_step: "style-toolbar"
        }
      }
    }
  });
  const localFailedTexts = collectTexts(localFailedCard);
  assert.equal(localFailedTexts.includes("Stopped on failure"), true);
  assert.equal(localFailedTexts.includes("Move Refresh button into main toolbar"), true);
  assert.equal(localFailedTexts.includes("Failed"), true);
  assert.equal(localFailedTexts.includes("Not run"), true);
  assert.equal(localFailedTexts.includes("1 / 3 changes completed"), false);

  const failedReloadModule = new XStudioModule(null);
  failedReloadModule._conversation_app_id = "app-blocked";
  failedReloadModule._conversation_env = "default";
  failedReloadModule._conversation_id = "conversation-blocked";
  const persistedFailedMessage = {
    _id: "message-mutation-plan-partial",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: MUTATION_PLAN_ARTIFACT_TYPE,
      _mutation_plan: partialRequest._artifact_request,
      _artifact_status: "failed",
      _artifact_error: "E_STEP_FAILED: Move failed",
      _artifact_result: {
        _ok: false,
        _result: {
          _completed_steps: ["move-refresh"],
          _failed_step: "style-toolbar",
          _not_run_steps: ["later-step"],
          _completed_count: 1
        }
      }
    }
  };
  const reloadedFailedMessage = failedReloadModule._conversation_render_message(persistedFailedMessage, 0);
  const reloadedFailedList = create_xstudio_conversation_message_list([reloadedFailedMessage]);
  const reloadedFailedTexts = collectTexts(reloadedFailedList[0]);
  const reloadedRetryButton = findView(reloadedFailedList[0], item => item._id === "xstudio-mutation-plan-apply-0");
  assert.equal(findView(reloadedFailedList[0], item => String(item.class ?? "").includes("xstudio-mutation-plan-card-compact")), null);
  assert.equal(reloadedFailedTexts.includes("Stopped on failure"), true);
  assert.equal(reloadedFailedTexts.includes("E_STEP_FAILED: Move failed"), true);
  assert.equal(reloadedFailedTexts.includes("Done"), true);
  assert.equal(reloadedFailedTexts.includes("Failed"), true);
  assert.equal(reloadedFailedTexts.includes("Not run"), true);
  assert.equal(reloadedRetryButton._text, "Retry");
  assert.equal(reloadedRetryButton.disabled, undefined);
  assert.equal(reloadedRetryButton._on.click._params.event, "studio:artifact-request-apply");

  const dismissed = create_xstudio_artifact_request_card(request, {
    _message_index: 0,
    _status: "dismissed"
  });
  assert.equal(String(dismissed.class ?? "").includes("xstudio-artifact-request-card-dismissed"), true);

  const staleEntityMessage = {
    _id: "message-entity-artifact",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _message_type: "generate",
      _execution_level: "artifact",
      _artifact_type: "entity",
      _artifact_request: {
        _operation: "create",
        _entity_name: "task",
        _entity_title: "Task",
        _fields: [{ _name: "title" }],
        _type: "legacy-card",
        _artifact_status: "failed",
        _debug_path: "/tmp/hidden"
      },
      _artifact_status: "failed",
      _artifact_error: {
        _code: "E_OLD",
        _message: "Old failure",
        _stage: "validation",
        _recoverable: true,
        _debug: {
          _path: "/tmp/hidden"
        }
      }
    }
  };
  const staleEntityRequest = create_xstudio_artifact_request_view(staleEntityMessage, {
    _key: "entity-artifact-key",
    _message_id: staleEntityMessage._id
  });
  const failedEntityCard = create_xstudio_artifact_request_card(staleEntityRequest, {
    _message_index: 8
  });
  const failedEntityTexts = collectNormalTexts(failedEntityCard);
  const failedEntityRetry = findView(failedEntityCard, item => item._id === "xstudio-artifact-request-apply-8");
  assert.equal(failedEntityRetry._text, "Retry");
  assert.equal(failedEntityTexts.includes("Old failure"), true);
  assert.equal(failedEntityTexts.includes("E_OLD"), true);
  assert.equal(failedEntityTexts.includes("Stage: validation"), true);
  assert.equal(failedEntityTexts.includes("Recoverable"), true);
  assert.equal(failedEntityTexts.includes("/tmp/hidden"), false);
  const failedEntityDebug = findView(failedEntityCard, item => item._id === "xstudio-artifact-request-debug-8");
  assert.equal(failedEntityDebug._html_tag, "details");
  assert.equal(collectTexts(failedEntityDebug).some(text => text.includes("[redacted]")), true);

  const runningEntityCard = create_xstudio_artifact_request_card(staleEntityRequest, {
    _message_index: 8,
    _status: "running"
  });
  const runningEntityRetry = findView(runningEntityCard, item => item._id === "xstudio-artifact-request-apply-8");
  assert.equal(runningEntityRetry.disabled, true);
  assert.equal(runningEntityRetry._on, undefined);

  const entityCommands = [];
  let resolveEntityApply;
  let persistedEntityMessage = { ...staleEntityMessage };
  const entityModule = new XStudioModule({
    sendXcmd(command) {
      entityCommands.push(command);
      if (command._op === "apply-artifact-request") {
        return new Promise(resolve => {
          resolveEntityApply = () => resolve({
            _ok: false,
            _error: {
              _code: "E_XVIBE_SERVER_XVM_ERROR",
              _message: "Latest persistence failure",
              _stage: "persistence",
              _recoverable: true,
              _details: {
                _entity_name: "task"
              },
              _debug: {
                _path: "/tmp/server-hidden",
                _message: "write failed"
              }
            }
          });
        });
      }
      if (command._op === "update-conversation-artifact") {
        assert.equal(command._params._conversation_id, "conversation-entity");
        assert.equal(command._params._message_id, "message-entity-artifact");
        assert.equal(command._params._artifact_status, "failed");
        assert.equal(command._params._artifact_error._code, "E_XVIBE_SERVER_XVM_ERROR");
        assert.deepEqual(command._params._artifact_request, staleEntityRequest._artifact_request);
        persistedEntityMessage = {
          ...staleEntityMessage,
          _intent: {
            ...staleEntityMessage._intent,
            _artifact_status: command._params._artifact_status,
            _artifact_error: command._params._artifact_error,
            _artifact_result: command._params._artifact_result
          }
        };
        return Promise.resolve({ _ok: true, _result: { _message: persistedEntityMessage } });
      }
      if (command._op === "get-last-messages") {
        return Promise.resolve({ _ok: true, _result: { _messages: [persistedEntityMessage] } });
      }
      throw new Error(`unexpected entity command: ${command._op}`);
    },
    isServerReady() {
      return true;
    }
  });
  entityModule._conversation_app_id = "app-entity";
  entityModule._conversation_env = "default";
  entityModule._conversation_id = "conversation-entity";
  entityModule._render_conversation_messages = () => {};
  entityModule._write_studio_status = () => {};

  const firstEntityRetry = entityModule._apply_conversation_artifact_request(failedEntityRetry._on.click._params.data);
  const duplicateEntityRetry = entityModule._apply_conversation_artifact_request(failedEntityRetry._on.click._params.data);
  assert.equal(entityCommands.filter(command => command._op === "apply-artifact-request").length, 1);
  assert.equal(entityCommands.some(command => command._op === "append-message" || command._op === "analyze-message"), false);
  const applyEntityCommand = entityCommands.find(command => command._op === "apply-artifact-request");
  assert.equal(applyEntityCommand._params._conversation_id, "conversation-entity");
  assert.equal(applyEntityCommand._params._message_id, "message-entity-artifact");
  assert.deepEqual(applyEntityCommand._params._artifact_request, {
    _operation: "create",
    _entity_name: "task",
    _entity_title: "Task",
    _fields: [{ _name: "title" }]
  });
  resolveEntityApply();
  await firstEntityRetry;
  await duplicateEntityRetry;
  assert.equal(entityCommands.filter(command => command._op === "apply-artifact-request").length, 1);
  assert.equal(entityCommands.filter(command => command._op === "update-conversation-artifact").length, 1);
  assert.equal(persistedEntityMessage._intent._artifact_error._message, "Latest persistence failure");

  const latestFailedRequest = create_xstudio_artifact_request_view(persistedEntityMessage, {
    _key: "entity-artifact-key",
    _message_id: staleEntityMessage._id
  });
  const latestFailedCard = create_xstudio_artifact_request_card(latestFailedRequest, {
    _message_index: 8
  });
  const latestFailedTexts = collectNormalTexts(latestFailedCard);
  assert.equal(latestFailedTexts.includes("Latest persistence failure"), true);
  assert.equal(latestFailedTexts.includes("Old failure"), false);

  entityModule._send_xvibe_command = async (op, params) => {
    entityCommands.push({ _module: "xvibe", _op: op, _params: params });
    if (op === "apply-artifact-request") {
      return { _ok: true, _artifact_type: "entity", _operation: "create", _entity_name: "task" };
    }
    if (op === "update-conversation-artifact") {
      assert.equal(params._artifact_status, "done");
      persistedEntityMessage = {
        ...persistedEntityMessage,
        _intent: {
          ...persistedEntityMessage._intent,
          _artifact_status: "done",
          _artifact_error: undefined,
          _artifact_result: params._artifact_result
        }
      };
      return { _ok: true, _result: { _message: persistedEntityMessage } };
    }
    if (op === "get-last-messages") {
      return { _ok: true, _result: { _messages: [persistedEntityMessage] } };
    }
    throw new Error(`unexpected success op: ${op}`);
  };
  entityModule._refresh_app_explorer = async () => {};
  entityModule._refresh_guide_after_success = async () => {};
  await entityModule._apply_conversation_artifact_request(failedEntityRetry._on.click._params.data);
  assert.equal(persistedEntityMessage._intent._artifact_status, "done");
  const successEntityCard = create_xstudio_artifact_request_card(
    create_xstudio_artifact_request_view(persistedEntityMessage, {
      _key: "entity-artifact-key",
      _message_id: staleEntityMessage._id
    }),
    { _message_index: 8 }
  );
  const successEntityTexts = collectNormalTexts(successEntityCard);
  assert.equal(successEntityTexts.includes("✓ Created entity: task"), true);
  assert.equal(successEntityTexts.includes("Latest persistence failure"), false);

  const projectPlanRequest = create_xstudio_artifact_request_view({
    _id: "message-project-plan",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _message_type: "plan",
      _execution_level: "artifact",
      _artifact_type: PROJECT_PLAN_ARTIFACT_TYPE,
      _project_plan: {
        _type: PROJECT_PLAN_ARTIFACT_TYPE,
        _summary: "A CRM app"
      }
    }
  }, {
    _key: "project-plan-key",
    _message_id: "message-project-plan"
  });
  const projectPlanCard = create_xstudio_artifact_request_card(projectPlanRequest, {
    _message_index: 1
  });
  assert.equal(findView(projectPlanCard, item => String(item.class ?? "").includes("xstudio-project-plan-card")) !== null, true);

  const readyShoppingPlan = {
    _type: PROJECT_PLAN_ARTIFACT_TYPE,
    _contract_version: 1,
    _stage: "planning",
    _planning_status: "complete",
    _status: "ready-for-confirmation",
    _goal: "Build a personal shopping list app",
    _summary: "A focused app for managing personal grocery lists.",
    _scope: "personal",
    _inferred_archetype: "personal_list",
    _known_facts: [
      {
        _id: "primary_user",
        _semantic_key: "primary_user",
        _value: "Self",
        _source: "initial_vision_fact_extraction"
      },
      {
        _id: "core_concept",
        _semantic_key: "core_concept",
        _value: "Shopping items",
        _source: "initial_vision_fact_extraction"
      }
    ],
    _questions: [
      {
        _id: "list_structure",
        _label: "List structure",
        _type: "single_choice",
        _question: "Do you want one list or multiple named lists?",
        _required: true,
        _options: [
          { _id: "single", _label: "One list" },
          { _id: "multiple_named", _label: "Multiple named lists" }
        ],
        _recommended_value: "single",
        _recommendation_reason: "A single list is the simplest useful version for a personal shopping-list app.",
        _affected_plan_sections: ["entities", "views", "flows", "milestones"],
        _answer: "multiple_named",
        _answer_state: "confirmed"
      }
    ],
    _answers: {
      list_structure: {
        _question_id: "list_structure",
        _value: "multiple_named",
        _state: "confirmed",
        _source: "user_answer"
      }
    },
    _assumptions: [
      {
        _id: "sharing",
        _label: "Sharing",
        _value: "Single-user first version",
        _state: "default",
        _affected_plan_sections: ["answers"]
      },
      {
        _id: "offline_first",
        _label: "Offline support",
        _value: "Keep local use available",
        _state: "inferred",
        _affected_plan_sections: ["capabilities"]
      }
    ],
    _current_question: null,
    _proposed_entities: [
      { _id: "shopping_item", _title: "Shopping Item", _purpose: "Tracks items to buy and purchase state." }
    ],
    _proposed_views: [
      { _id: "shopping_list", _title: "Shopping List", _purpose: "Shows active items and purchased items." }
    ],
    _proposed_flows: [
      { _id: "add_shopping_item", _title: "Add Shopping Item" },
      { _id: "edit_shopping_item", _title: "Edit Shopping Item" },
      { _id: "delete_shopping_item", _title: "Delete Shopping Item" },
      { _id: "mark_purchased", _title: "Mark Purchased" }
    ],
    _capabilities: [
      { _id: "local_storage", _title: "Local Storage", _state: "default" }
    ],
    _milestones: [
      { _id: "working_shopping_list", _title: "Working Shopping List", _items: ["Add items", "Mark purchased"] }
    ],
    _warnings: ["optional_decision_unresolved:sync_behavior"],
    _confirmation_readiness: {
      _type: "xvibe-initial-planning-confirmation-readiness",
      _ready: true,
      _blockers: [],
      _warnings: [
        {
          _id: "optional_decision_unresolved:sync_behavior",
          _message: "Optional sync behavior remains unresolved.",
          _section: "questions",
          _question_id: "sync_behavior"
        }
      ],
      _unresolved_required_decisions: [],
      _unresolved_optional_decisions: ["sync_behavior"],
      _confirmed_decisions: [
        {
          _id: "list_structure",
          _label: "List structure",
          _value: "multiple_named",
          _state: "confirmed",
          _source: "planning_answer_application",
          _affected_plan_sections: ["entities", "views", "flows", "milestones"]
        }
      ],
      _inferred_assumptions: [
        {
          _id: "offline_first",
          _label: "Offline support",
          _value: "Keep local use available",
          _state: "inferred",
          _affected_plan_sections: ["capabilities"]
        },
        {
          _id: "sharing",
          _label: "Sharing",
          _value: "Single-user first version",
          _state: "default",
          _affected_plan_sections: ["answers"]
        }
      ],
      _decision_effects: [
        {
          _decision_id: "list_structure",
          _question_id: "list_structure",
          _value: "multiple_named",
          _state: "confirmed",
          _affected_plan_sections: ["entities", "views", "flows", "milestones"],
          _source: "planning_answer_application"
        }
      ],
      _summary: {
        _goal: "Build a personal shopping list app",
        _scope: "personal",
        _archetype: "personal_list",
        _confirmed_decisions: [],
        _inferred_assumptions: [],
        _proposed_entities: ["shopping_item"],
        _proposed_views: ["shopping_list"],
        _proposed_flows: ["add_shopping_item", "edit_shopping_item", "delete_shopping_item", "mark_purchased"],
        _capabilities: [],
        _milestones: ["working_shopping_list"],
        _warnings: ["optional_decision_unresolved:sync_behavior"],
        _blockers: []
      }
    }
  };
  const readyPlanRequest = create_xstudio_artifact_request_view({
    _id: "message-ready-shopping-plan",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _message_type: "planning",
      _artifact_type: PROJECT_PLAN_ARTIFACT_TYPE,
      _project_plan: readyShoppingPlan
    }
  }, {
    _key: "ready-shopping-plan-key",
    _message_id: "message-ready-shopping-plan"
  });
  const readyPlanCard = create_xstudio_artifact_request_card(readyPlanRequest, {
    _message_index: 2
  });
  const readyPlanTexts = collectNormalTexts(readyPlanCard);
  const readyConfirmButton = findView(readyPlanCard, item => item._id === "xstudio-project-plan-confirm-2");

  assert.equal(readyPlanTexts.includes("Plan review"), false);
  assert.equal(readyPlanTexts.filter(text => text === "Project Plan").length, 1);
	  assert.equal(readyPlanTexts.includes("Planning proposal"), false);
	  assert.equal(readyPlanTexts.includes("Review"), false);
	  assert.equal(readyPlanTexts.includes("Show details"), true);
	  assert.equal(readyPlanTexts.includes("Ready to review"), true);
  assert.equal(readyPlanTexts.includes("Build a personal shopping list app"), true);
  assert.equal(readyPlanTexts.includes("A focused app for managing personal grocery lists."), true);
  assert.equal(readyPlanTexts.includes("1 entity · 1 view · 4 actions"), true);
  assert.equal(readyPlanTexts.includes("Entities: 1"), false);
  assert.equal(readyPlanTexts.includes("Views: 1"), false);
  assert.equal(readyPlanTexts.includes("Flows: 4"), false);
  assert.equal(readyPlanTexts.includes("Milestones: 1"), false);
  assert.equal(readyPlanTexts.includes("shopping_item"), false);
  assert.equal(readyPlanTexts.includes("shopping_list"), false);
  assert.equal(readyPlanTexts.includes("add_shopping_item"), false);
  assert.equal(readyPlanTexts.includes("Understood"), false);
  assert.equal(readyPlanTexts.includes("custom"), false);
  assert.equal(readyPlanTexts.includes("personal_list"), false);
  assert.equal(readyPlanTexts.includes("single_user"), false);
  assert.equal(readyPlanTexts.includes("task_manager"), false);
  const readyReviewToggle = findView(readyPlanCard, item => item._id === "xstudio-project-plan-review-toggle-2");
  assert.equal(readyReviewToggle._on.click._params.event, "studio:project-plan-review-toggle");

  const expandedReadyPlanCard = create_xstudio_artifact_request_card(readyPlanRequest, {
    _message_index: 2,
    _project_plan_expanded: true
  });
  const expandedReadyPlanTexts = collectNormalTexts(expandedReadyPlanCard);
  assert.equal(expandedReadyPlanTexts.includes("Plan review"), true);
	  assert.equal(expandedReadyPlanTexts.includes("Hide details"), true);
  assert.equal(expandedReadyPlanTexts.includes("shopping_item"), true);
  assert.equal(expandedReadyPlanTexts.includes("shopping_list"), true);
  assert.equal(expandedReadyPlanTexts.includes("add_shopping_item"), true);
  assert.equal(expandedReadyPlanTexts.includes("edit_shopping_item"), true);
  assert.equal(expandedReadyPlanTexts.includes("delete_shopping_item"), true);
  assert.equal(expandedReadyPlanTexts.includes("mark_purchased"), true);
  assert.equal(expandedReadyPlanTexts.includes("Understood"), true);
  assert.equal(expandedReadyPlanTexts.includes("Primary user"), true);
  assert.equal(expandedReadyPlanTexts.includes("Self"), true);
  assert.equal(expandedReadyPlanTexts.includes("Core records"), true);
  assert.equal(expandedReadyPlanTexts.includes("Shopping items"), true);
  assert.equal(expandedReadyPlanTexts.includes("Confirmed decisions"), true);
  assert.equal(expandedReadyPlanTexts.includes("Assumptions"), true);
  assert.equal(expandedReadyPlanTexts.includes("Defaults"), false);
  assert.equal(expandedReadyPlanTexts.includes("Optional decisions"), true);
  assert.equal(expandedReadyPlanTexts.includes("Warnings"), true);
  assert.equal(expandedReadyPlanTexts.includes("Multiple named lists"), true);
  assert.equal(expandedReadyPlanTexts.includes("multiple_named"), false);
  assert.equal(expandedReadyPlanTexts.includes("List structure: Multiple named lists affects entities, views, flows, milestones."), true);
  assert.equal(expandedReadyPlanTexts.filter(text => text === "Confirmed decisions").length, 1);
  assert.equal(expandedReadyPlanTexts.filter(text => text === "Assumptions").length, 1);
  assert.equal(expandedReadyPlanTexts.filter(text => text === "Optional decisions").length, 1);
  assert.equal(expandedReadyPlanTexts.filter(text => text === "Warnings").length, 1);
  assert.equal(expandedReadyPlanTexts.includes("Planning Answer Application"), false);
  assert.equal(expandedReadyPlanTexts.includes("Initial Vision Fact Extraction"), false);
  assert.equal(expandedReadyPlanTexts.includes("Confirmed by you"), true);
  assert.equal(expandedReadyPlanTexts.includes("From your description"), true);
  assert.equal(expandedReadyPlanTexts.includes("No additional capabilities are needed yet."), false);
  assert.equal(expandedReadyPlanTexts.includes("None provided by the server yet."), false);
  assert.equal(expandedReadyPlanTexts.includes("Generic Record Management milestone"), false);
  assert.equal(expandedReadyPlanTexts.some(text => /business-role/i.test(text)), false);
  assert.equal(expandedReadyPlanTexts.some(text => /Sales|Managers|Support|Customers/.test(text)), false);
  assert.equal(readyConfirmButton.disabled, undefined);
  assert.equal(readyConfirmButton._on.click._params.event, "studio:project-plan-confirm");

  const confirmedPlanCard = create_xstudio_artifact_request_card(readyPlanRequest, {
    _message_index: 12,
    _status: "done"
  });
  const confirmedPlanTexts = collectNormalTexts(confirmedPlanCard);
  assert.equal(confirmedPlanTexts.includes("✓ Plan confirmed"), true);
  assert.equal(confirmedPlanTexts.includes("Your build guide is ready."), true);
  assert.equal(confirmedPlanTexts.includes("Plan confirmed. Guide is ready."), false);
  assert.equal(confirmedPlanTexts.includes("Planning complete"), false);
  assert.equal(confirmedPlanTexts.includes("Confirmed"), false);
  assert.equal(confirmedPlanTexts.includes("Show details"), true);
  assert.equal(confirmedPlanTexts.includes("Open guide"), true);
  assert.equal(findView(confirmedPlanCard, item => item._id === "xstudio-project-plan-confirm-12"), null);
  const openGuideButton = findView(confirmedPlanCard, item => item._id === "xstudio-project-plan-open-guide-12");
  assert.equal(openGuideButton._on.click._params.event, "studio:guide-open");

  const expandedConfirmedPlanCard = create_xstudio_artifact_request_card(readyPlanRequest, {
    _message_index: 13,
    _status: "done",
    _project_plan_expanded: true
  });
  const expandedConfirmedTexts = collectNormalTexts(expandedConfirmedPlanCard);
  assert.equal(expandedConfirmedTexts.includes("✓ Plan confirmed"), true);
  assert.equal(expandedConfirmedTexts.includes("Your build guide is ready."), true);
  assert.equal(expandedConfirmedTexts.includes("Planning complete"), false);
  assert.equal(expandedConfirmedTexts.includes("Hide details"), true);
  assert.equal(expandedConfirmedTexts.includes("Open guide"), true);
  const expandedConfirmedHeading = findView(expandedConfirmedPlanCard, item =>
    String(item.class ?? "") === "xstudio-project-plan-review-heading"
  );
  assert.equal((expandedConfirmedHeading._children ?? []).some(item =>
    String(item.class ?? "").includes("xstudio-project-plan-badge-confirmed") &&
    item._text === "Confirmed"
  ), false);
  assert.equal(findView(expandedConfirmedPlanCard, item => item._id === "xstudio-project-plan-confirm-13"), null);

  const blockedPlan = {
    ...readyShoppingPlan,
    _planning_status: "awaiting_answer",
    _status: "collecting-information",
    _current_question: {
      _id: "list_structure",
      _label: "List structure",
      _type: "single_choice",
      _question: "Do you want one list or multiple named lists?",
      _required: true,
      _options: [
        { _id: "single", _label: "One list" },
        { _id: "multiple_named", _label: "Multiple named lists" }
      ],
      _recommended_value: "single",
      _recommendation_reason: "A single list is the simplest useful version for a personal shopping-list app.",
      _affected_plan_sections: ["entities", "views", "flows", "milestones"]
    },
    _unanswered_required_question_ids: ["list_structure"],
    _confirmation_readiness: {
      ...readyShoppingPlan._confirmation_readiness,
      _ready: false,
      _blockers: [
        {
          _id: "required_decision_unresolved:list_structure",
          _message: "Required decision remains unresolved: List structure.",
          _section: "questions",
          _question_id: "list_structure"
        }
      ],
      _summary: {
        ...readyShoppingPlan._confirmation_readiness._summary,
        _blockers: ["required_decision_unresolved:list_structure"]
      }
    }
  };
  const blockedPlanRequest = create_xstudio_artifact_request_view({
    _id: "message-blocked-shopping-plan",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _message_type: "planning",
      _artifact_type: PROJECT_PLAN_ARTIFACT_TYPE,
      _project_plan: blockedPlan
    }
  }, {
    _key: "blocked-shopping-plan-key",
    _message_id: "message-blocked-shopping-plan"
  });
  const blockedPlanCard = create_xstudio_artifact_request_card(blockedPlanRequest, {
    _message_index: 3
  });
  const blockedPlanTexts = collectNormalTexts(blockedPlanCard);

	  assert.equal(blockedPlanTexts.includes("Planning"), true);
	  assert.equal(blockedPlanTexts.includes("Blocked"), false);
  assert.equal(blockedPlanTexts.includes("1 decision remaining"), true);
  assert.equal(blockedPlanTexts.includes("Required decision remains unresolved: List structure."), false);
  assert.equal(blockedPlanTexts.includes("Next decision"), true);
  assert.equal(blockedPlanTexts.includes("Do you want one list or multiple named lists?"), true);
  assert.equal(blockedPlanTexts.includes("Recommendation: One list"), true);
  assert.equal(blockedPlanTexts.includes("A single list is the simplest useful version for a personal shopping-list app."), true);
  const oneListChip = findView(blockedPlanCard, item => item._id === "xstudio-project-plan-suggestion-3-0");
  assert.equal(oneListChip._text, "One list");
  assert.equal(oneListChip._on.click._params.event, "studio:project-plan-action");
  assert.equal(oneListChip._on.click._params.data._action, "answer");
  assert.equal(oneListChip._on.click._params.data._prompt, "One list");
  assert.equal(findView(blockedPlanCard, item => item._id === "xstudio-project-plan-confirm-3"), null);

  const blockedReviewOnlyRequest = create_xstudio_artifact_request_view({
    _id: "message-blocked-review-plan",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _message_type: "planning",
      _artifact_type: PROJECT_PLAN_ARTIFACT_TYPE,
      _project_plan: {
        ...readyShoppingPlan,
        _confirmation_readiness: {
          ...readyShoppingPlan._confirmation_readiness,
          _ready: false,
          _blockers: [
            {
              _id: "required_decision_unresolved:list_structure",
              _message: "Required decision remains unresolved: List structure.",
              _section: "questions",
              _question_id: "list_structure"
            }
          ]
        }
      }
    }
  }, {
    _key: "blocked-review-plan-key",
    _message_id: "message-blocked-review-plan"
  });
  const blockedReviewOnlyCard = create_xstudio_artifact_request_card(blockedReviewOnlyRequest, {
    _message_index: 4
  });
  const blockedConfirmButton = findView(blockedReviewOnlyCard, item => item._id === "xstudio-project-plan-confirm-4");
	  assert.equal(blockedConfirmButton.disabled, true);
	  assert.equal(blockedConfirmButton._on, undefined);
	  assert.equal(collectNormalTexts(blockedReviewOnlyCard).includes("Planning"), true);
	  assert.equal(collectNormalTexts(blockedReviewOnlyCard).includes("1 decision remaining"), true);
	  assert.equal(collectNormalTexts(blockedReviewOnlyCard).includes("Required decision remains unresolved: List structure."), false);

  const updatedAfterAnswerRequest = create_xstudio_artifact_request_view({
    _id: "message-updated-shopping-plan",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _message_type: "planning",
      _artifact_type: PROJECT_PLAN_ARTIFACT_TYPE,
      _project_plan: readyShoppingPlan
    }
  }, {
    _key: "updated-shopping-plan-key",
    _message_id: "message-updated-shopping-plan"
  });
  const updatedAfterAnswerCard = create_xstudio_artifact_request_card(updatedAfterAnswerRequest, {
    _message_index: 5
  });
  assert.equal(collectNormalTexts(updatedAfterAnswerCard).includes("Confirmed decisions"), false);
  assert.equal(collectNormalTexts(create_xstudio_artifact_request_card(updatedAfterAnswerRequest, {
    _message_index: 5,
    _project_plan_expanded: true
  })).includes("Confirmed decisions"), true);
  assert.equal(findView(updatedAfterAnswerCard, item => item._id === "xstudio-project-plan-confirm-5").disabled, undefined);

  const incompleteFailureResult = {
    _ok: false,
    _error: {
      _code: "E_PLANNING_INCOMPLETE",
      _message: "Project plan draft is not ready for confirmation.",
      _details: {
        _blockers: [
          {
            _id: "required_decision_unresolved:list_structure",
            _message: "Required decision remains unresolved: List structure.",
            _section: "questions",
            _question_id: "list_structure"
          }
        ],
        _warnings: [
          {
            _id: "optional_decision_unresolved:sync_behavior",
            _message: "Optional sync behavior remains unresolved.",
            _section: "questions",
            _question_id: "sync_behavior"
          }
        ],
        _unresolved_required_decisions: ["list_structure"],
        _summary: readyShoppingPlan._confirmation_readiness._summary
      }
    }
  };
  const failedPlanCard = create_xstudio_artifact_request_card(readyPlanRequest, {
    _message_index: 6,
    _status: "failed",
    _error: "Plan is not ready.",
    _result: incompleteFailureResult
  });
	  const failedPlanTexts = collectNormalTexts(failedPlanCard);
	  assert.equal(failedPlanTexts.includes("Planning"), true);
	  assert.equal(failedPlanTexts.includes("Blocked"), false);
	  assert.equal(failedPlanTexts.includes("1 decision remaining"), true);
	  assert.equal(failedPlanTexts.includes("Required decision remains unresolved: List structure."), false);
  assert.equal(failedPlanTexts.includes("Optional sync behavior remains unresolved."), false);
  assert.equal(collectNormalTexts(create_xstudio_artifact_request_card(readyPlanRequest, {
    _message_index: 6,
    _status: "failed",
    _error: "Plan is not ready.",
    _result: incompleteFailureResult,
    _project_plan_expanded: true
  })).includes("Optional sync behavior remains unresolved."), true);
  assert.equal(findView(failedPlanCard, item => item._id === "xstudio-project-plan-confirm-6").disabled, true);

  const malformedRequest = create_xstudio_artifact_request_view({
    _id: "message-malformed-plan",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _message_type: "planning",
      _artifact_type: PROJECT_PLAN_ARTIFACT_TYPE,
      _project_plan: {
        _type: PROJECT_PLAN_ARTIFACT_TYPE,
        _stage: "planning",
        _status: "ready-for-confirmation"
      }
    }
  }, {
    _key: "malformed-plan-key",
    _message_id: "message-malformed-plan"
  });
	  const malformedCard = create_xstudio_artifact_request_card(malformedRequest, {
	    _message_index: 7
	  });
	  assert.equal(collectNormalTexts(malformedCard).includes("Blocked"), true);
	  assert.equal(findView(malformedCard, item => item._id === "xstudio-project-plan-confirm-7").disabled, true);

	  const genuinelyBlockedPlan = {
	    ...readyShoppingPlan,
	    _planning_status: "failed",
	    _status: "blocked",
	    _confirmation_readiness: {
	      ...readyShoppingPlan._confirmation_readiness,
	      _ready: false,
	      _blockers: [
	        {
	          _id: "schema_validation_failed",
	          _message: "The generated plan could not be validated.",
	          _section: "validation"
	        }
	      ]
	    }
	  };
	  const genuinelyBlockedRequest = create_xstudio_artifact_request_view({
	    _id: "message-genuine-blocked-plan",
	    _role: "assistant",
	    _text: "",
	    _created_at: "2026-07-13T00:00:00.000Z",
	    _intent: {
	      _message_type: "planning",
	      _artifact_type: PROJECT_PLAN_ARTIFACT_TYPE,
	      _project_plan: genuinelyBlockedPlan
	    }
	  }, {
	    _key: "genuine-blocked-plan-key",
	    _message_id: "message-genuine-blocked-plan"
	  });
	  const genuinelyBlockedCard = create_xstudio_artifact_request_card(genuinelyBlockedRequest, {
	    _message_index: 17
	  });
	  const genuinelyBlockedTexts = collectNormalTexts(genuinelyBlockedCard);
	  assert.equal(genuinelyBlockedTexts.includes("Blocked"), true);
	  assert.equal(genuinelyBlockedTexts.includes("Planning"), false);

	  const noRecommendationPlan = {
	    _type: PROJECT_PLAN_ARTIFACT_TYPE,
	    _goal: "Build an inventory tracker",
	    _summary: "Track stock across a small workspace.",
	    _current_question: {
	      _id: "storage_scope",
	      _label: "Storage scope",
	      _type: "single_choice",
	      _question: "Should this track one location or several locations?",
	      _required: true,
	      _options: [
	        { _id: "one", _label: "One location" },
	        { _id: "many", _label: "Several locations" }
	      ]
	    },
	    _unanswered_required_question_ids: ["storage_scope"],
	    _confirmation_readiness: {
	      _ready: false,
	      _unresolved_required_decisions: ["storage_scope"],
	      _blockers: []
	    }
	  };
	  const noRecommendationRequest = create_xstudio_artifact_request_view({
	    _id: "message-no-recommendation-plan",
	    _role: "assistant",
	    _text: "",
	    _created_at: "2026-07-13T00:00:00.000Z",
	    _intent: {
	      _message_type: "planning",
	      _artifact_type: PROJECT_PLAN_ARTIFACT_TYPE,
	      _project_plan: noRecommendationPlan
	    }
	  }, {
	    _key: "no-recommendation-plan-key",
	    _message_id: "message-no-recommendation-plan"
	  });
	  const noRecommendationCard = create_xstudio_artifact_request_card(noRecommendationRequest, {
	    _message_index: 18
	  });
	  const noRecommendationTexts = collectNormalTexts(noRecommendationCard);
	  assert.equal(noRecommendationTexts.includes("Planning"), true);
	  assert.equal(noRecommendationTexts.includes("0 entities · 0 views · 0 actions"), true);
	  assert.equal(noRecommendationTexts.some(text => text.startsWith("Recommendation:")), false);

  const guideModule = new XStudioModule(null);
  _xd.delete("guide.state");
  _xd.delete("guide.materialization");
  const guideMemory = {
    _goal: "Build a personal shopping list app",
    _current_focus: "working_shopping_list",
    _milestones: [
      {
        _id: "working_shopping_list",
        _title: "Working Shopping List",
        _items: [
          { _id: "shopping_item_model", _title: "Shopping Item model", _completed: true },
          { _id: "shopping_list_view", _title: "Shopping List view", _completed: true },
          { _id: "add_shopping_item", _title: "Add shopping item" },
          { _id: "mark_purchased", _title: "Mark purchased" }
        ]
      }
    ],
    _achievements: [
      "first_suggested_action_applied",
      "first_project_focus_set"
    ]
  };

  _xd.set("project.memory", guideMemory, { source: "guide-ui-test" });
  _xd.set("guide.recommendation", {
    _title: "Add shopping item",
    _reason: "Start by adding the first item.",
    _action: { _prompt: "Add shopping item" }
  }, { source: "guide-ui-test" });
  _xd.delete("guide.active_recommendation");
  const unavailableGuideCard = guideModule._project_memory_guide_card_data();
  const unavailableGuideTexts = collectNormalTexts(unavailableGuideCard);
  assert.equal(unavailableGuideTexts.includes("Build Guide"), true);
  assert.equal(unavailableGuideTexts.includes("Complete and confirm the project plan to begin building."), true);
  assert.equal(unavailableGuideTexts.includes("Your build steps will appear here once the plan is ready."), true);
  assert.equal(unavailableGuideTexts.some(text => /Parking Lot/i.test(text)), false);
  assert.equal(unavailableGuideTexts.some(text => /^Decisions\b/i.test(text)), false);
  assert.equal(unavailableGuideTexts.includes("Ready to build"), false);
  assert.equal(unavailableGuideTexts.includes("Current Milestone"), false);
  assert.equal(unavailableGuideTexts.includes("Achievements"), false);
  assert.equal(unavailableGuideTexts.includes("Do It"), false);
  assert.equal(unavailableGuideTexts.includes("Create first version"), false);
  assert.equal(unavailableGuideTexts.includes("Shopping Item model"), false);

  _xd.set("project.memory", {
    ...guideMemory,
    _project_plan_confirmed: true
  }, { source: "guide-ui-test" });
  const availableGuideCard = guideModule._project_memory_guide_card_data();
  const availableGuideTexts = collectNormalTexts(availableGuideCard);
  assert.equal(availableGuideTexts.includes("Complete and confirm the project plan to begin building."), false);
  assert.equal(availableGuideTexts.includes("Build Guide"), true);
  assert.equal(availableGuideTexts.includes("Ready to build"), true);
  assert.equal(availableGuideTexts.includes("Your app plan is confirmed and ready to start."), true);
  assert.equal(availableGuideTexts.some(text => /Parking Lot/i.test(text)), false);
  assert.equal(availableGuideTexts.some(text => /^Decisions\b/i.test(text)), false);
  assert.equal(availableGuideTexts.includes("Goal: Build a personal shopping list app"), true);
  assert.equal(availableGuideTexts.includes("Current Milestone"), false);
  assert.equal(availableGuideTexts.includes("✓ Shopping Item model"), false);
  assert.equal(availableGuideTexts.includes("✓ Shopping List view"), false);
  assert.equal(availableGuideTexts.includes("□ Add shopping item"), false);
  assert.equal(availableGuideTexts.includes("□ Mark purchased"), false);
  assert.equal(availableGuideTexts.includes("✓ First Suggested Action Applied"), true);
  assert.equal(availableGuideTexts.includes("✓ First Project Focus Set"), true);
  assert.equal(availableGuideTexts.includes("Recommended next"), true);
  assert.equal(availableGuideTexts.includes("Build app"), true);
  assert.equal(availableGuideTexts.includes("Build the confirmed plan into a runnable app."), true);
  assert.equal(availableGuideTexts.includes("Build progress"), true);
  assert.equal(availableGuideTexts.includes("Preparing starter"), true);
  assert.equal(availableGuideTexts.includes("Creating data"), true);
  assert.equal(availableGuideTexts.includes("Creating screens"), true);
  assert.equal(availableGuideTexts.includes("Connecting actions"), true);
  assert.equal(availableGuideTexts.includes("Composing main experience"), true);
  assert.equal(availableGuideTexts.includes("Validating app"), true);
  assert.equal(availableGuideTexts.includes("Final verification"), true);
  assert.equal(countViews(availableGuideCard, item =>
    String(item.class ?? "").includes("xstudio-guide-materialization-stage-pending")
  ), 7);
  assert.equal(availableGuideTexts.includes("Do It"), false);
  const availableRecommendation = findView(availableGuideCard, item =>
    item._id === "xstudio-guide-recommendation"
  );
  assert.equal(countViews(availableRecommendation, item =>
    String(item.class ?? "").includes("xstudio-guide-recommendation-task-block")
  ), 1);
  assert.equal(countViews(availableRecommendation, item =>
    String(item.class ?? "").includes("xstudio-guide-recommendation-description-block")
  ), 1);
  assert.equal(countViews(availableRecommendation, item =>
    String(item.class ?? "").includes("xstudio-guide-recommendation-progress-block")
  ), 1);
  assert.equal(countViews(availableRecommendation, item =>
    String(item.class ?? "").includes("xstudio-guide-recommendation-actions")
  ), 1);
  assert.equal(String(findView(availableGuideCard, item =>
    item._id === "xstudio-guide-empty-action"
  ).class).includes("xstudio-guide-empty-action-hidden"), true);
  assert.equal(countViews(availableGuideCard, item =>
    String(item.class ?? "") === "xstudio-guide-milestone-item" ||
    String(item.class ?? "").includes("xstudio-guide-milestone-item ")
  ), 0);
  assert.equal(countViews(availableGuideCard, item =>
    String(item.class ?? "") === "xstudio-guide-achievement"
  ), 2);
  assert.equal(availableGuideTexts.some(text =>
    /ready to start\.Goal|appFocus|Recommended nextCreate/.test(text)
  ), false);
  assert.equal(availableRecommendation._children.some(item =>
    item?._id === "xstudio-guide-recommendation-label" ||
    item?._id === "xstudio-guide-recommendation-title" ||
    item?._id === "xstudio-guide-recommendation-reason" ||
    item?._id === "xstudio-guide-recommendation-do-it"
  ), false);
  assert.equal(findView(availableGuideCard, item =>
    item?._id === "xstudio-guide-recommendation-do-it"
  )._text, "Build app");

  _xd.set("guide.recommendation", {
    _title: "Mark items as purchased",
    _reason: "Add the purchased-item behavior to the shopping list.",
    _action: { _prompt: "Create the Mark Purchased flow" }
  }, { source: "guide-ui-test" });
  _xd.delete("guide.active_recommendation");
  _xd.delete("guide.active_recommendation_status");
  const normalTaskGuideCard = guideModule._project_memory_guide_card_data();
  const normalTaskTexts = collectNormalTexts(normalTaskGuideCard);
  const normalTaskActionRow = findView(normalTaskGuideCard, item =>
    String(item.class ?? "").includes("xstudio-guide-recommendation-actions")
  );
  assert.equal(normalTaskTexts.includes("Recommended next"), true);
  assert.equal(normalTaskTexts.includes("Build app"), true);
  assert.equal(normalTaskTexts.includes("Build the confirmed plan into a runnable app."), true);
  assert.equal(normalTaskTexts.includes("Mark items as purchased"), false);
  assert.equal(normalTaskTexts.includes("Add the purchased-item behavior to the shopping list."), false);
  assert.equal(normalTaskTexts.includes("Create the Mark Purchased flow"), false);
  assert.equal(normalTaskTexts.includes("Build this step"), false);
  assert.equal(countViews(normalTaskActionRow, item => item._id === "xstudio-guide-recommendation-do-it"), 1);
  assert.equal(countViews(normalTaskActionRow, item => item._id === "xstudio-guide-recommendation-cancel"), 0);

  const longGuideTaskTitle = "Create the Mark Purchased flow with an exceptionally long task title that must wrap cleanly inside a narrow guide panel without joining the surrounding labels";
  const activeStandardRecommendation = {
    _title: "Mark items as purchased",
    _reason: "Current focus is Working Shopping List.",
    _action: { _prompt: longGuideTaskTitle }
  };
  const activeStateGuideCard = status => {
    _xd.set("guide.active_recommendation", activeStandardRecommendation, { source: "guide-ui-test" });
    _xd.set("guide.active_recommendation_status", status, { source: "guide-ui-test" });
    return guideModule._project_memory_guide_card_data();
  };
  const assertActiveState = (status, expectedButton, expectedDisabled, expectedStatusText) => {
    const card = activeStateGuideCard(status);
    const texts = collectNormalTexts(card);
    const actionRow = findView(card, item =>
      String(item.class ?? "").includes("xstudio-guide-recommendation-actions")
    );
    const retry = findView(actionRow, item => item._id === "xstudio-guide-recommendation-do-it");
    const cancel = findView(actionRow, item => item._id === "xstudio-guide-recommendation-cancel");
    assert.equal(texts.includes("Current task"), true);
    assert.equal(texts.includes(longGuideTaskTitle), true);
    assert.equal(texts.includes("Current focus"), true);
    assert.equal(texts.includes("Working Shopping List"), true);
    assert.equal(texts.includes("Current Task" + longGuideTaskTitle), false);
    assert.equal(texts.includes("Create the Mark Purchased flowCurrent focus"), false);
    assert.equal(texts.includes(expectedStatusText), true);
    assert.equal(texts.includes(expectedButton), true);
    assert.equal(retry._text, expectedButton);
    assert.equal(retry.disabled, expectedDisabled);
    assert.equal(cancel._text, "Cancel");
    assert.equal(cancel._on.click._params.event, "studio:guide-active-recommendation-cancel");
    assert.equal(actionRow._children.at(-2)._id, "xstudio-guide-recommendation-do-it");
    assert.equal(actionRow._children.at(-1)._id, "xstudio-guide-recommendation-cancel");
    return { card, retry, cancel };
  };
  assertActiveState("ready", "Build this step", false, "Ready");
  assertActiveState("running", "Running", true, "Running");
  const failedState = assertActiveState("failed", "Retry", false, "Failed · Retry available");
  assert.equal(failedState.retry._on.click._params.event, "studio:guide-recommendation-do-it");
  assert.equal(failedState.cancel.disabled, false);
  const completedState = assertActiveState("completed", "Completed", true, "Completed");
  assert.equal(completedState.cancel.disabled, true);
  assert.equal(/\.xstudio-guide-recommendation-actions\s*\{[\s\S]*?flex-wrap:\s*wrap;/.test(xstudioCss), true);
  assert.equal(/\.xstudio-guide-recommendation-title\s*\{[\s\S]*?white-space:\s*normal;/.test(xstudioCss), true);

  _xd.set("guide.state", {
    _available: true,
    _show_lower_level_actions: true
  }, { source: "guide-ui-test" });
  _xd.set("guide.recommendation", starterAdaptationRecommendation(), { source: "guide-ui-test" });
  _xd.delete("guide.active_recommendation");
  _xd.delete("guide.active_recommendation_status");
  const starterGuideCard = guideModule._project_memory_guide_card_data();
  const starterGuideTexts = collectNormalTexts(starterGuideCard);
  assert.equal(countViews(starterGuideCard, item =>
    String(item.class ?? "").includes("xstudio-guide-starter-adaptation-card")
  ), 1);
  assert.equal(starterGuideTexts.includes("Adapt the dashboard for your shopping list"), true);
  assert.equal(starterGuideTexts.includes("Keep the dashboard shell, theme controls, and responsive layout. Replace the generic metrics, records, activity, and settings sections with the shopping-list experience from your confirmed plan."), true);
  assert.equal(starterGuideTexts.includes("Ready"), true);
  assert.equal(starterGuideTexts.includes("Preserve"), true);
  assert.equal(starterGuideTexts.includes("Dashboard shell"), true);
  assert.equal(starterGuideTexts.includes("Theme selector"), true);
  assert.equal(starterGuideTexts.includes("Navigation"), true);
  assert.equal(starterGuideTexts.includes("Main scroll container"), true);
  assert.equal(starterGuideTexts.includes("Replace"), true);
  assert.equal(starterGuideTexts.includes("Generic metrics"), true);
  assert.equal(starterGuideTexts.includes("Records table"), true);
  assert.equal(starterGuideTexts.includes("Activity section"), true);
  assert.equal(starterGuideTexts.includes("Settings/demo content"), true);
  assert.equal(starterGuideTexts.includes("Add"), true);
  assert.equal(starterGuideTexts.includes("Shopping-list structure"), true);
  assert.equal(starterGuideTexts.includes("Shopping-item interaction area"), true);
  assert.equal(starterGuideTexts.includes("Adapt starter"), true);
  assert.equal(starterGuideTexts.includes("Build this step"), false);
  assert.equal(starterGuideTexts.includes("Create view"), false);
  assert.equal(starterGuideTexts.includes("Create flow"), false);
  assert.equal(starterGuideTexts.some(text => text.includes("starter-dashboard-technical-id")), false);
  assert.equal(starterGuideTexts.some(text => text.includes("starter-dashboard-view-id")), false);
  assert.equal(findView(starterGuideCard, item =>
    String(item.class ?? "").includes("xstudio-guide-starter-adaptation-debug-payload")
  )._text.includes("starter-dashboard-technical-id"), true);
  const starterGuideButton = findView(starterGuideCard, item =>
    item._id === "xstudio-guide-recommendation-do-it"
  );
  assert.equal(starterGuideButton._text, "Adapt starter");
  assert.equal(starterGuideButton.disabled, false);
  assert.equal(starterGuideButton._on.click._params.event, "studio:guide-recommendation-do-it");

  _xd.set("guide.active_recommendation", starterAdaptationRecommendation(), { source: "guide-ui-test" });
  _xd.set("guide.active_recommendation_status", "adapting", { source: "guide-ui-test" });
  const adaptingStarterGuideCard = guideModule._project_memory_guide_card_data();
  const adaptingStarterGuideTexts = collectNormalTexts(adaptingStarterGuideCard);
  assert.equal(adaptingStarterGuideTexts.includes("Adapting"), true);
  assert.equal(findView(adaptingStarterGuideCard, item =>
    item._id === "xstudio-guide-recommendation-do-it"
  ).disabled, true);

  _xd.set("guide.active_recommendation_status", "completed", { source: "guide-ui-test" });
  const completedStarterGuideCard = guideModule._project_memory_guide_card_data();
  const completedStarterGuideTexts = collectNormalTexts(completedStarterGuideCard);
  assert.equal(completedStarterGuideTexts.includes("Completed"), true);
  assert.equal(findView(completedStarterGuideCard, item =>
    item._id === "xstudio-guide-recommendation-do-it"
  )._text, "Completed");

  _xd.set("guide.active_recommendation_status", "failed", { source: "guide-ui-test" });
  const failedStarterGuideCard = guideModule._project_memory_guide_card_data();
  const failedStarterGuideTexts = collectNormalTexts(failedStarterGuideCard);
  assert.equal(failedStarterGuideTexts.includes("Failed · Retry available"), true);
  assert.equal(findView(failedStarterGuideCard, item =>
    item._id === "xstudio-guide-recommendation-do-it"
  )._text, "Retry");
  assert.equal(findView(failedStarterGuideCard, item =>
    item._id === "xstudio-guide-recommendation-do-it"
  ).disabled, false);

  {
    const retryGuideModule = new XStudioModule(null);
    let retrySendCount = 0;
    let retryInputValue = "";
    retryGuideModule._set_conversation_input_value = value => {
      retryInputValue = value;
    };
    retryGuideModule._render_guide_active_recommendation = () => {};
    retryGuideModule._send_conversation_message = async prompt => {
      retrySendCount += 1;
      assert.equal(prompt, "Adapt the selected dashboard starter for the shopping-list plan.");
    };
    _xd.set("guide.active_recommendation", starterAdaptationRecommendation(), { source: "guide-ui-test" });
    _xd.set("guide.active_recommendation_status", "failed", { source: "guide-ui-test" });
    await retryGuideModule._start_guide_recommendation();
    assert.equal(retrySendCount, 1);
    assert.equal(retryInputValue, "Adapt the selected dashboard starter for the shopping-list plan.");
    assert.equal(_xd.get("guide.active_recommendation_status"), "adapting");
    const retryStarterGuideCard = retryGuideModule._project_memory_guide_card_data();
    assert.equal(countViews(retryStarterGuideCard, item =>
      String(item.class ?? "").includes("xstudio-guide-starter-adaptation-card")
    ), 1);
    assert.equal(countViews(retryStarterGuideCard, item =>
      item._id === "xstudio-guide-recommendation-do-it"
    ), 1);
  }
  _xd.delete("guide.state");

  {
    const completionResult = materializeConfirmedPlanResult("completed");
    const seenRunningStates = [];
    let runtimeRefreshCount = 0;
    let executableRefreshCount = 0;
    const guideRefreshReasons = [];
    const { module: finalGuideModule, commands } = createConversationHarness({
      onCommand(command) {
        if (command._module === "xvibe" && command._op === "list-conversations") {
          return { _conversations: [{ _id: "conversation-timeout", _message_count: 1 }] };
        }
        if (command._module === "xvibe" && command._op === "get-last-messages") {
          return { _messages: [] };
        }
        if (command._module === "xvibe" && command._op === "append-message") {
          return { _message: { _id: "visible-guide-message" } };
        }
        if (command._module === "xvibe" && command._op === "materialize-confirmed-plan") {
          seenRunningStates.push(_xd.get("guide.active_recommendation_status"));
          return completionResult;
        }
        if (command._module === "xvibe" && command._op === "update-conversation-action") {
          return { _ok: true };
        }
        return { _ok: true };
      }
    });
    finalGuideModule._load_project_memory_for_current_app = async () => {};
    finalGuideModule._load_guide_recommendation = async () => {};
    finalGuideModule._refresh_studio_runtime = async () => {
      runtimeRefreshCount += 1;
    };
    finalGuideModule._refresh_after_conversation_executable_payload = async () => {
      executableRefreshCount += 1;
    };
    finalGuideModule._refresh_guide_after_success = async reason => {
      guideRefreshReasons.push(reason);
    };
    finalGuideModule._refresh_app_explorer = async () => {};
    finalGuideModule._load_studio_current_view_json = async () => {};
    finalGuideModule._refresh_object_tree_for_current_view = () => {};
    _xd.set("project.memory", {
      ...guideMemory,
      _project_plan_confirmed: true
    }, { source: "guide-ui-test" });
    _xd.delete("guide.recommendation");
    _xd.delete("guide.materialization");
    _xd.delete("guide.active_recommendation");
    _xd.delete("guide.active_recommendation_status");

    await finalGuideModule._start_guide_recommendation();

    const appendCommands = commands.filter(item =>
      item.command._module === "xvibe" && item.command._op === "append-message"
    );
    const analyzeCommands = commands.filter(item =>
      item.command._module === "xvibe" && item.command._op === "analyze-message"
    );
    const materializeCommands = commands.filter(item =>
      item.command._module === "xvibe" && item.command._op === "materialize-confirmed-plan"
    );
    const updateCommands = commands.filter(item =>
      item.command._module === "xvibe" && item.command._op === "update-conversation-action"
    );
    assert.equal(appendCommands.length, 1);
    assert.equal(appendCommands[0].command._params._message._role, "tool");
    assert.equal(appendCommands[0].command._params._message._text, "Build app");
    assert.equal(
      appendCommands[0].command._params._message._intent._actions[0]._id,
      "build-app"
    );
    assert.equal(
      appendCommands[0].command._params._message._intent._actions[0]._type,
      "module-op"
    );
    assert.equal(
      appendCommands[0].command._params._message._intent._actions[0]._execution_payload._op,
      "materialize-confirmed-plan"
    );
    assert.equal(analyzeCommands.length, 0);
    assert.equal(materializeCommands.length, 1);
    assert.equal(materializeCommands[0].command._params._app_id, "app-timeout");
    assert.equal(materializeCommands[0].command._params._env, "default");
    assert.equal(materializeCommands[0].command._params._conversation_id, "conversation-timeout");
    assert.equal(materializeCommands[0].command._params._message_id, "visible-guide-message");
    assert.equal(materializeCommands[0].command._params._action_id, "build-app");
    assert.equal(materializeCommands[0].command._params._resume_token, "guide-materialize:app-timeout:default:conversation-timeout:visible-guide-message");
    assert.equal(materializeCommands[0].command._params._guide_action._id, "build-app");
    assert.equal(materializeCommands[0].command._params._guide_action._action._execution_payload._op, "materialize-confirmed-plan");
    assert.deepEqual(seenRunningStates, ["running"]);
    assert.equal(_xd.get("guide.active_recommendation_status"), "completed");
    assert.equal(_xd.get("guide.materialization")._status, "completed");
    assert.equal(_xd.get("guide.materialization")._stages.filter(stage => stage._status === "completed").length, 7);
    assert.equal(runtimeRefreshCount, 1);
    assert.equal(executableRefreshCount, 1);
    assert.deepEqual(guideRefreshReasons, ["materialize-confirmed-plan-success"]);
    assert.equal(updateCommands[0].command._params._status, "running");
    assert.equal(updateCommands[0].command._params._action_id, "build-app");
    assert.equal(updateCommands.at(-1).command._params._status, "done");
    assert.equal(updateCommands.at(-1).command._params._result._completed_count, 5);
    assert.equal(updateCommands.at(-1).command._params._result._planned_change_count, 5);
    const completedBuildGuideCard = finalGuideModule._project_memory_guide_card_data();
    const completedBuildGuideTexts = collectNormalTexts(completedBuildGuideCard);
    assert.equal(completedBuildGuideTexts.includes("Build complete"), true);
    assert.equal(completedBuildGuideTexts.includes("Build app"), true);
    assert.equal(completedBuildGuideTexts.includes("completed"), true);
  }

  {
    let retryResolve;
    const retryCompletion = new Promise(resolve => {
      retryResolve = resolve;
    });
    const materializeResults = [
      materializeConfirmedPlanResult("failed", {
        _ok: false,
        _safe_error: "Build paused safely. Retry can continue from the failed stage."
      }),
      retryCompletion.then(() => materializeConfirmedPlanResult("completed"))
    ];
    let appendIndex = 0;
    const { module: retryFinalGuideModule, commands } = createConversationHarness({
      onCommand(command) {
        if (command._module === "xvibe" && command._op === "list-conversations") {
          return { _conversations: [{ _id: "conversation-timeout", _message_count: appendIndex }] };
        }
        if (command._module === "xvibe" && command._op === "get-last-messages") {
          return { _messages: [] };
        }
        if (command._module === "xvibe" && command._op === "append-message") {
          appendIndex += 1;
          return { _message: { _id: `visible-guide-message-${appendIndex}` } };
        }
        if (command._module === "xvibe" && command._op === "materialize-confirmed-plan") {
          return materializeResults.shift();
        }
        if (command._module === "xvibe" && command._op === "update-conversation-action") {
          return { _ok: true };
        }
        return { _ok: true };
      }
    });
    retryFinalGuideModule._load_project_memory_for_current_app = async () => {};
    retryFinalGuideModule._load_guide_recommendation = async () => {};
    retryFinalGuideModule._refresh_studio_runtime = async () => {};
    retryFinalGuideModule._refresh_after_conversation_executable_payload = async () => {};
    retryFinalGuideModule._refresh_guide_after_success = async () => {};
    retryFinalGuideModule._refresh_app_explorer = async () => {};
    retryFinalGuideModule._load_studio_current_view_json = async () => {};
    retryFinalGuideModule._refresh_object_tree_for_current_view = () => {};
    _xd.set("project.memory", {
      ...guideMemory,
      _project_plan_confirmed: true
    }, { source: "guide-ui-test" });
    _xd.delete("guide.recommendation");
    _xd.delete("guide.materialization");
    _xd.delete("guide.active_recommendation");
    _xd.delete("guide.active_recommendation_status");

    await retryFinalGuideModule._start_guide_recommendation();

    assert.equal(_xd.get("guide.active_recommendation_status"), "failed");
    const failedFinalGuideCard = retryFinalGuideModule._project_memory_guide_card_data();
    const failedFinalButton = findView(failedFinalGuideCard, item =>
      item._id === "xstudio-guide-recommendation-do-it"
    );
    const failedFinalCancel = findView(failedFinalGuideCard, item =>
      item._id === "xstudio-guide-recommendation-cancel"
    );
    const failedFinalTexts = collectNormalTexts(failedFinalGuideCard);
    assert.equal(failedFinalTexts.includes("Build failed"), true);
    assert.equal(failedFinalTexts.includes("Creating data"), true);
    assert.equal(failedFinalTexts.includes("Creating screens"), true);
    assert.equal(failedFinalTexts.includes("failed"), true);
    assert.equal(failedFinalTexts.includes("Build paused safely. Retry can continue from the failed stage."), true);
    assert.equal(countViews(failedFinalGuideCard, item =>
      String(item.class ?? "").includes("xstudio-guide-materialization-stage-completed")
    ), 2);
    assert.equal(countViews(failedFinalGuideCard, item =>
      String(item.class ?? "").includes("xstudio-guide-materialization-stage-failed")
    ), 1);
    assert.equal(failedFinalButton._text, "Retry build");
    assert.equal(failedFinalButton._on.click._params.event, "studio:guide-recommendation-do-it");
    assert.equal(failedFinalCancel._text, "Cancel");

    const firstRetry = retryFinalGuideModule._start_guide_recommendation();
    const duplicateRetry = retryFinalGuideModule._start_guide_recommendation();
    await flushAsync();
    await flushAsync();
    await flushAsync();

    let materializeCommands = commands.filter(item =>
      item.command._module === "xvibe" && item.command._op === "materialize-confirmed-plan"
    );
    assert.equal(materializeCommands.length, 2);
    assert.equal(_xd.get("guide.active_recommendation_status"), "running");
    retryResolve();
    await Promise.all([firstRetry, duplicateRetry]);

    materializeCommands = commands.filter(item =>
      item.command._module === "xvibe" && item.command._op === "materialize-confirmed-plan"
    );
    const appendCommands = commands.filter(item =>
      item.command._module === "xvibe" && item.command._op === "append-message"
    );
    const analyzeCommands = commands.filter(item =>
      item.command._module === "xvibe" && item.command._op === "analyze-message"
    );
    assert.equal(appendCommands.length, 1);
    assert.equal(materializeCommands.length, 2);
    assert.equal(analyzeCommands.length, 0);
    assert.equal(materializeCommands[0].command._params._guide_action._id, materializeCommands[1].command._params._guide_action._id);
    assert.equal(materializeCommands[0].command._params._guide_action._action._execution_payload._op, materializeCommands[1].command._params._guide_action._action._execution_payload._op);
    assert.equal(materializeCommands[0].command._params._message_id, "visible-guide-message-1");
    assert.equal(materializeCommands[1].command._params._message_id, "visible-guide-message-1");
    assert.equal(materializeCommands[0].command._params._action_id, "build-app");
    assert.equal(materializeCommands[1].command._params._action_id, "build-app");
    assert.equal(materializeCommands[0].command._params._resume_token, "guide-materialize:app-timeout:default:conversation-timeout:visible-guide-message-1");
    assert.equal(materializeCommands[1].command._params._resume_token, materializeCommands[0].command._params._resume_token);
    assert.equal(_xd.get("guide.active_recommendation_status"), "completed");
    assert.equal(_xd.get("guide.materialization")._status, "completed");
  }

  _xd.delete("guide.active_recommendation");
  _xd.delete("guide.active_recommendation_status");
  _xd.set("guide.state", {
    _available: true,
    _show_lower_level_actions: true
  }, { source: "guide-ui-test" });
  _xd.set("guide.recommendation", starterAdaptationRecommendation({
    _starter_adaptation: {
      _preserve: [],
      _replace: [],
      _add: [],
      _metadata: {
        _starter_id: "empty-starter-technical-id"
      }
    }
  }), { source: "guide-ui-test" });
  const emptyStarterGuideCard = guideModule._project_memory_guide_card_data();
  const emptyStarterGuideTexts = collectNormalTexts(emptyStarterGuideCard);
  assert.equal(countViews(emptyStarterGuideCard, item =>
    String(item.class ?? "").includes("xstudio-guide-starter-adaptation-card")
  ), 0);
  assert.equal(emptyStarterGuideTexts.includes("Build this step"), true);
  assert.equal(emptyStarterGuideTexts.includes("Adapt starter"), false);

  _xd.set("guide.recommendation", shoppingCrudRecommendation(), { source: "guide-ui-test" });
  _xd.delete("guide.active_recommendation");
  _xd.delete("guide.active_recommendation_status");
  const crudGuideCard = guideModule._project_memory_guide_card_data();
  const crudGuideTexts = collectNormalTexts(crudGuideCard);
  assert.equal(crudGuideTexts.includes("Recommended"), true);
  assert.equal(crudGuideTexts.includes("Add Shopping Item CRUD"), true);
  assert.equal(crudGuideTexts.includes("Data: Shopping Item"), true);
  assert.equal(crudGuideTexts.includes("Shopping Item list screen"), true);
  assert.equal(crudGuideTexts.some(text => text.includes("_execution_payload")), false);
  const crudGuideButton = findView(crudGuideCard, item =>
    String(item._id ?? "").startsWith("xstudio-crud-recommendation-apply-guide-")
  );
  assert.equal(crudGuideButton.disabled, undefined);
  assert.equal(crudGuideButton._on.click._params.event, "studio:intent-action-apply");
  assert.equal(findView(crudGuideCard, item =>
    item._id === "xstudio-guide-recommendation-do-it"
  ), null);

  _xd.set("guide.recommendation", {
    _recommendations: [
      shoppingCrudRecommendation(),
      shoppingCrudRecommendation({
        _title: "Add Shopping List CRUD",
        _entity_name: "Shopping List",
        _recommended: false,
        _order: 2,
        _creates: ["Shopping List data", "Shopping List screen", "Shopping List actions"],
        _action: {
          _label: "Add Shopping List CRUD",
          _execution_payload: {
            _module: "xvibe",
            _op: "build-crud",
            _params: {
              _entity_name: "Shopping List"
            }
          }
        }
      })
    ]
  }, { source: "guide-ui-test" });
  const multiCrudGuideCard = guideModule._project_memory_guide_card_data();
  const multiCrudGuideTexts = collectNormalTexts(multiCrudGuideCard);
  assert.equal(countViews(multiCrudGuideCard, item =>
    String(item.class ?? "").includes("xstudio-crud-recommendation-card")
  ), 2);
  assert.equal(multiCrudGuideTexts.includes("Option 2 of 2"), true);
  assert.equal(multiCrudGuideTexts.includes("Order: 2"), true);
  _xd.delete("guide.state");
  _xd.delete("guide.materialization");

  _xd.set("project.memory", {
    ...guideMemory,
    _project_plan_confirmed: true
  }, { source: "guide-ui-test" });
  _xd.delete("guide.recommendation");
  _xd.set("guide.state", {
    _available: true,
    _reason: "no_executable_recommendation",
    _message: "No executable build action is available for the current guide focus.",
    _blockers: ["no_executable_recommendation"]
  }, { source: "guide-ui-test" });
  const blockedGuideCard = guideModule._project_memory_guide_card_data();
  const blockedGuideTexts = collectNormalTexts(blockedGuideCard);
  assert.equal(blockedGuideTexts.includes("Recommended next"), true);
  assert.equal(blockedGuideTexts.includes("No executable action available"), false);
  assert.equal(blockedGuideTexts.includes("No executable build action is available for the current guide focus."), false);
  assert.equal(blockedGuideTexts.includes("Build app"), true);
  assert.equal(findView(blockedGuideCard, item =>
    item._id === "xstudio-guide-recommendation-do-it"
  ).disabled, false);

  _xd.set("project.memory", {
    _goal: "Build an inventory tracker",
    _current_focus: "",
    _project_plan_confirmed: true,
    _milestones: [],
    _achievements: []
  }, { source: "guide-ui-test" });
  _xd.delete("guide.recommendation");
  const confirmedEmptyGuideCard = guideModule._project_memory_guide_card_data();
  const confirmedEmptyGuideTexts = collectNormalTexts(confirmedEmptyGuideCard);
  assert.equal(confirmedEmptyGuideTexts.includes("Build Guide"), true);
  assert.equal(confirmedEmptyGuideTexts.includes("Ready to build"), true);
  assert.equal(confirmedEmptyGuideTexts.includes("Your app plan is confirmed and ready to start."), true);
  assert.equal(confirmedEmptyGuideTexts.includes("Complete and confirm the project plan to begin building."), false);
  assert.equal(confirmedEmptyGuideTexts.includes("Your build steps will appear here once the plan is ready."), false);
  assert.equal(confirmedEmptyGuideTexts.includes("No executable build action is available for the current guide focus."), false);
  assert.equal(confirmedEmptyGuideTexts.includes("Create first version"), false);
  assert.equal(confirmedEmptyGuideTexts.includes("Build app"), true);
  assert.equal(findView(confirmedEmptyGuideCard, item =>
    item._id === "xstudio-guide-recommendation-do-it"
  ).disabled, false);
  assert.equal(findView(confirmedEmptyGuideCard, item =>
    item._id === "xstudio-guide-empty-action-button"
  ), null);
  assert.equal(String(findView(confirmedEmptyGuideCard, item =>
    item._id === "xstudio-guide-empty-action"
  ).class).includes("xstudio-guide-empty-action-hidden"), true);

  const originalGetObject = XUI.getObject.bind(XUI);
  const mountedGuideUpdates = [];
  const labelUpdates = {};
  const mountedGuideModule = new XStudioModule(null);
  XUI.getObject = id => {
    if (id === "xstudio-guide-body") {
      return {
        update(data) {
          mountedGuideUpdates.push(data);
        }
      };
    }
    if ([
      "xstudio-guide-counts",
      "xstudio-guide-unavailable",
      "xstudio-guide-unavailable-detail",
      "xstudio-guide-ready-message",
      "xstudio-guide-goal",
      "xstudio-guide-focus",
      "xstudio-guide-milestone-title",
      "xstudio-guide-milestone-progress",
      "xstudio-guide-recommendation-label",
      "xstudio-guide-recommendation-title",
      "xstudio-guide-recommendation-reason"
    ].includes(id)) {
      return {
        setText(text) {
          labelUpdates[id] = text;
        }
      };
    }
    if (id === "xstudio-guide-focus-input") {
      return {
        setValue(value) {
          labelUpdates[id] = value;
        }
      };
    }
    if ([
      "xstudio-guide-milestone",
      "xstudio-guide-achievements",
      "xstudio-guide-recommendation",
      "xstudio-guide-empty-action"
    ].includes(id)) {
      return {
        addClass() {},
        removeClass() {}
      };
    }
    if ([
      "xstudio-guide-milestone-items",
      "xstudio-guide-achievements-list"
    ].includes(id)) {
      return {
        update() {}
      };
    }
    if ([
      "xstudio-guide-recommendation-do-it",
      "xstudio-guide-set-focus"
    ].includes(id)) {
      return {
        setText() {},
        dom: null
      };
    }
    return null;
  };
  try {
    _xd.set("project.memory", guideMemory, { source: "guide-ui-test" });
    mountedGuideModule._render_project_memory_guide();
    assert.equal(collectNormalTexts(mountedGuideUpdates.at(-1)).includes("Complete and confirm the project plan to begin building."), true);

    _xd.set("project.memory", {
      _goal: "Build an inventory tracker",
      _project_plan_confirmed: true,
      _milestones: [],
      _achievements: []
    }, { source: "guide-ui-test" });
    _xd.delete("guide.recommendation");
    mountedGuideModule._render_project_memory_guide();
    const latestMountedGuideTexts = collectNormalTexts(mountedGuideUpdates.at(-1));
    assert.equal(latestMountedGuideTexts.includes("Ready to build"), false);
    assert.equal(labelUpdates["xstudio-guide-counts"], "Ready to build");
    assert.equal(latestMountedGuideTexts.includes("Complete and confirm the project plan to begin building."), false);
    assert.equal(latestMountedGuideTexts.includes("Your app plan is confirmed and ready to start."), true);
    assert.equal(latestMountedGuideTexts.includes("No executable build action is available for the current guide focus."), false);
    assert.equal(latestMountedGuideTexts.includes("Build app"), true);
    assert.equal(latestMountedGuideTexts.includes("Create first version"), false);
  } finally {
    XUI.getObject = originalGetObject;
  }

  {
    const { module: planningGuideModule, commands: planningGuideCommands } = createConversationHarness({
      onCommand(command) {
        if (command._module === "planning" && command._op === "get-guide-recommendation") {
          return {
            _ok: true,
            _result: {
              _recommendation: {
                _title: "Create Shopping Item data",
                _reason: "Current focus is Working Shopping List.",
                _type: "entity",
                _priority: 100,
                _action: {
                  _prompt: "Create the Shopping Item data and its required item operations."
                }
              },
              _guide: {
                _available: true,
                _executable_actions_available: true
              },
              _guide_state: {
                _available: true,
                _reason: "ready"
              }
            }
          };
        }
        throw new Error(`Unexpected command ${command._module}.${command._op}`);
      }
    });
    let recommendationRenders = 0;
    planningGuideModule._render_guide_recommendation = () => {
      recommendationRenders += 1;
    };
    _xd.set("project.memory", {
      ...guideMemory,
      _project_plan_confirmed: true
    }, { source: "guide-ui-test" });
    await planningGuideModule._load_guide_recommendation("guide-ui-test");
    assert.equal(planningGuideCommands.some(({ command }) =>
      command._module === "planning" &&
      command._op === "get-guide-recommendation" &&
      command._params._conversation_id === "conversation-timeout"
    ), true);
    assert.equal(_xd.get("guide.recommendation")._title, "Create Shopping Item data");
    assert.equal(_xd.get("guide.state")._available, true);
    assert.equal(recommendationRenders, 1);
  }

  let confirmCallCount = 0;
  let persistedConfirmStatus = "";
  let renderedConfirmCount = 0;
  let confirmStatusText = "";
  const confirmModule = new XStudioModule(null);
  confirmModule._conversation_app_id = "shopping-app";
  confirmModule._conversation_env = "default";
  confirmModule._conversation_id = "conversation-shopping";
  confirmModule._send_xvibe_command = async (op, params) => {
    confirmCallCount += 1;
    assert.equal(op, "confirm-project-plan");
    assert.equal(params._app_id, "shopping-app");
    assert.equal(params._conversation_id, "conversation-shopping");
    return {
      _ok: true,
      _result: {
        _confirmed: true
      }
    };
  };
  confirmModule._persist_conversation_artifact_status_and_reload = async (_request, status) => {
    persistedConfirmStatus = status;
    return true;
  };
  confirmModule._refresh_guide_after_success = async () => true;
  confirmModule._open_guide_portlet = () => {};
  confirmModule._render_conversation_messages = () => {
    renderedConfirmCount += 1;
  };
  confirmModule._write_studio_status = statusText => {
    confirmStatusText = statusText;
  };

  await confirmModule._confirm_project_plan(readyConfirmButton._on.click._params.data);
  assert.equal(confirmCallCount, 1);
  assert.equal(persistedConfirmStatus, "done");
  assert.equal(confirmStatusText.includes("Plan confirmed"), true);
  assert.equal(renderedConfirmCount > 0, true);

  let incompletePersistedError = "";
  const incompleteModule = new XStudioModule(null);
  incompleteModule._conversation_app_id = "shopping-app";
  incompleteModule._conversation_env = "default";
  incompleteModule._conversation_id = "conversation-shopping";
  incompleteModule._send_xvibe_command = async () => incompleteFailureResult;
  incompleteModule._persist_conversation_artifact_status_and_reload = async (_request, status, errorText) => {
    assert.equal(status, "failed");
    incompletePersistedError = errorText;
    return true;
  };
  incompleteModule._render_conversation_messages = () => {};
  incompleteModule._write_studio_status = () => {};
  await incompleteModule._confirm_project_plan(readyConfirmButton._on.click._params.data);
  assert.equal(incompletePersistedError.includes("Required decision remains unresolved: List structure."), true);

  const sourceText = await (await import("node:fs/promises")).readFile(
    new URL("../src/XStudio/Conversation/XStudioArtifactCards.ts", import.meta.url),
    "utf8"
  );
	  assert.equal(sourceText.includes("PROJECT_PLAN_QUESTION_GROUPS"), false);
	  assert.equal(/shopping[-_\s]?list/i.test(sourceText), false);
	  assert.equal(/business[-_\s]?role/i.test(sourceText), false);
	  assert.equal(xstudioCss.includes("overflow-x: hidden"), true);
	  assert.equal(xstudioCss.includes(".xstudio-project-plan-meta-row"), true);
	  assert.equal(xstudioCss.includes("flex-wrap: wrap"), true);
	  assert.equal(xstudioCss.includes(".xstudio-project-plan-buttons > *"), true);
	  assert.equal(xstudioCss.includes(".xstudio-conversation-debug-summary:focus-visible"), true);
	  assert.equal(/\.xstudio-mutation-plan-heading\s*\{[\s\S]*?flex-wrap:\s*wrap;/.test(xstudioCss), true);
	  assert.equal(/\.xstudio-mutation-plan-step\s*\{[\s\S]*?grid-template-columns:\s*22px\s+minmax\(0,\s*1fr\);/.test(xstudioCss), true);
	  assert.equal(/\.xstudio-mutation-plan-step-body\s*\{[\s\S]*?min-width:\s*0;/.test(xstudioCss), true);
	  assert.equal(/\.xstudio-object-tree-hidden-tag\s*\{[\s\S]*?white-space:\s*nowrap;/.test(xstudioCss), true);
	  assert.equal(/\.xstudio-guide-milestone-items\s*\{[\s\S]*?flex-direction:\s*column;/.test(xstudioCss), true);
	  assert.equal(/\.xstudio-guide-milestone-item\s*\{[\s\S]*?white-space:\s*normal;/.test(xstudioCss), true);
	  assert.equal(/\.xstudio-guide-achievements-list\s*\{[\s\S]*?flex-direction:\s*column;/.test(xstudioCss), true);
	  assert.equal(/\.xstudio-guide-achievement\s*\{[\s\S]*?white-space:\s*normal;/.test(xstudioCss), true);
	  assert.equal(xstudioCss.includes(".xstudio-guide-unavailable"), true);

	  const guidanceRequest = create_xstudio_artifact_request_view({
    _id: "message-capability-guidance",
    _role: "assistant",
    _text: "",
    _created_at: "2026-07-13T00:00:00.000Z",
    _intent: {
      _artifact_type: CAPABILITY_GUIDANCE_ARTIFACT_TYPE,
      _capability_guidance: {
        _type: CAPABILITY_GUIDANCE_ARTIFACT_TYPE,
        _categories: [
          {
            _title: "Edit visually",
            _capabilities: [
              {
                _title: "Update text",
                _description: "Change visible object text.",
                _mode: "deterministic",
                _tested_prompt_examples: ["change title to My App"]
              }
            ]
          }
        ]
      }
    }
  }, {
    _key: "capability-guidance-key",
    _message_id: "message-capability-guidance"
  });
  const guidanceCard = create_xstudio_artifact_request_card(guidanceRequest, {
    _message_index: 2
  });
  assert.equal(findView(guidanceCard, item => String(item.class ?? "").includes("xstudio-capability-guidance-card")) !== null, true);
}

await _x.loadModuleAsync(XUI);
await _x.loadModuleAsync(XVM);

function resetThemeState() {
  storage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.className = "";
  document.documentElement.style.cssText = "";
}

{
  resetThemeState();
  window.localStorage.setItem("xpell.theme", "dark");

  XUI.applyDefaultTheme("terminal");

  assert.equal(document.documentElement.getAttribute("data-theme"), "dark");
  assert.equal(window.localStorage.getItem("xpell.theme"), "dark");
  assert.equal(document.documentElement.classList.contains("xtheme-dark"), true);
  assert.equal(document.documentElement.classList.contains("xtheme-terminal"), false);
}

{
  resetThemeState();

  XUI.applyDefaultTheme("terminal");

  assert.equal(document.documentElement.getAttribute("data-theme"), "terminal");
  assert.equal(window.localStorage.getItem("xpell.theme"), null);
}

{
  resetThemeState();
  window.localStorage.setItem("xpell.theme", "dark");

  XUI.applyTheme("light");

  assert.equal(document.documentElement.getAttribute("data-theme"), "light");
  assert.equal(window.localStorage.getItem("xpell.theme"), "light");
}

{
  resetThemeState();
  window.localStorage.setItem("xpell.theme", "dark");

  XUI.applyDefaultTheme({
    "--x-accent": "#ff00aa"
  });

  assert.equal(document.documentElement.style.getPropertyValue("--x-accent"), "#ff00aa");
  assert.equal(window.localStorage.getItem("xpell.theme"), "dark");
}

{
  const client = new XVMClient({
    _app_id: "readiness-test",
    _env: "default",
    _wormhole_url: "ws://localhost/wh/v2"
  });
  client._bind_events();

  _x.notReady("wormhole");
  _xem.fire("wormhole-open", {});
  assert.equal(_x.isReady("wormhole"), true);

  let mountCount = 0;
  const requiresWormhole = XUI.create({
    _type: "view",
    _id: "requires-wormhole-after-open",
    _requires: ["system.ready.wormhole"],
    _on_mount: () => {
      mountCount += 1;
    }
  });
  await requiresWormhole.onMount();
  assert.equal(mountCount, 1);

  _xem.fire("wormhole-close", {});
  assert.equal(_x.isReady("wormhole"), false);

  _x.ready("wormhole");
  _xem.fire("wormhole-error", {});
  assert.equal(_x.isReady("wormhole"), false);
}

{
  const client = new XVMClient({
    _app_id: "production-order-app",
    _env: "default",
    _wormhole_url: "ws://localhost/wh/v2"
  });
  const readyKey = client._server_xvm_subscription_ready_key();
  const rows = [
    { _id: "meal-1", calories: 10 },
    { _id: "meal-2", calories: 15 }
  ];
  let findCount = 0;
  let aggregateCount = 0;
  const originalExecute = _x.execute;

  try {
    _x.execute = async command => {
      if (command?._module === "entity-manager" && command?._op === "find") {
        findCount += 1;
        _xd.set("meal:records", rows, { source: "production-order-test" });
        return {
          _ok: true,
          _result: {
            _records: {
              _data: rows
            }
          }
        };
      }
      if (command?._module === "entity-manager" && command?._op === "aggregate") {
        aggregateCount += 1;
        _xd.set("meal:sum:calories", 25, { source: "production-order-test" });
        return {
          _ok: true,
          _result: {
            _aggregation: {
              _op: "sum",
              _field: "calories",
              _value: 25
            },
            _value: 25
          }
        };
      }
      return originalExecute.call(_x, command);
    };

    _xd.set(readyKey, false, { source: "production-order-test" });
    _xd.delete("meal:records");
    _xd.delete("meal:sum:calories");
    client._set_connection_status("connected", "wormhole-open");
    assert.equal(_x.isReady("wormhole"), true);
    assert.equal(_xd.get(readyKey), false);

    const loader = {
      _mode: "chain",
      _stop_on_error: true,
      _commands: [
        {
          _module: "entity-manager",
          _op: "find",
          _params: {
            _app_id: "production-order-app",
            _env: "default",
            _entity: "meal",
            _filter: {}
          }
        },
        {
          _module: "xd",
          _op: "set",
          _params: {
            key: "meal:records",
            value: "$prev._result._records._data",
            source: "entity-list:on-mount"
          }
        },
        {
          _module: "entity-manager",
          _op: "aggregate",
          _params: {
            _entity: "meal",
            _records: "$xdata:meal:records",
            _aggregation: {
              _op: "sum",
              _field: "calories"
            },
            _result_xdata_key: "meal:sum:calories"
          }
        },
        {
          _module: "xd",
          _op: "set",
          _params: {
            key: "meal:sum:calories",
            value: "$prev._result._value",
            source: "entity-aggregation:on-mount"
          }
        }
      ]
    };

    const view = XUI.create({
      _type: "view",
      _id: "production-order-view",
      _requires: [readyKey],
      _on_mount: loader
    });
    let mounted = false;
    const mountPromise = view.onMount().then(() => {
      mounted = true;
    });
    await Promise.resolve();
    assert.equal(mounted, false);
    assert.equal(findCount, 0);
    assert.equal(aggregateCount, 0);

    client._set_server_xvm_subscription_ready(true, "test-subscribe");
    await mountPromise;
    assert.equal(mounted, true);
    assert.equal(findCount, 1);
    assert.equal(aggregateCount, 1);
    assert.deepEqual(_xd.get("meal:records"), rows);
    assert.equal(_xd.get("meal:sum:calories"), 25);
    assert.equal(typeof _xd.get("meal:sum:calories"), "number");

    client._current_view_id = "production-order-view";
    client._app_view_id = "production-order-view";
    client._current_version = 1;
    client._edit_mode = false;
    client._app = {
      _app_id: "production-order-app",
      _env: "default",
      _meta: {
        _version: 1
      },
      _config: {}
    };
    client._xstudio.handle_xvm_update = () => {};
    const updateResult = await client._handle_xvm_update_payload({
      _app_id: "production-order-app",
      _env: "default",
      _view_id: "production-order-view",
      _version: 2,
      _view: {
        _type: "view",
        _id: "production-order-view",
        _requires: [readyKey],
        _on_mount: loader,
        _children: []
      }
    }, "xvm:update");
    assert.equal(updateResult._accepted, true, JSON.stringify(updateResult));
    assert.equal(updateResult._patched, true);
    assert.equal(findCount, 2);
    assert.equal(aggregateCount, 2);
    assert.equal(_xd.get("meal:sum:calories"), 25);
  } finally {
    _x.execute = originalExecute;
  }
}

{
  await registerXVMViewSupport();
  await registerXVMViewSupport();
  XUI.importObjectPack(XVMViewPack);
  await registerXVMViewSupport();

  const registeredViewRef = XUI.create({
    _type: "xvm-view",
    _view_id: "registered-smoke-view"
  });

  assert.equal(registeredViewRef instanceof XUIObject, true);
  assert.equal(registeredViewRef._type, "xvm-view");
  assert.equal(typeof registeredViewRef.resolveView, "function");
}

{
  storage.clear();
  document.body.replaceChildren();
  XVM.resetAppRuntime();
  await registerXVMViewSupport();

  const client = new XVMClient({
    _app_id: "cached-xvm-view-app",
    _env: "default",
    _wormhole_url: "ws://test",
    _edit: false
  });

  XDB.saveObject(client._cache_key_app, {
    _app: {
      _app_id: "cached-xvm-view-app",
      _env: "default",
      _meta: {
        _version: 1,
        _entry_view_id: "main"
      },
      _config: {
        _start: {
          _view_id: "main"
        }
      }
    },
    _view_ids: ["main", "toolbar"]
  });
  XDB.saveString(client._cache_key_version, "1");
  XDB.saveObject(client._cache_key_view("main"), {
    _type: "view",
    _id: "main",
    _children: [
      {
        _type: "xvm-view",
        _id: "toolbar-ref",
        _view_id: "toolbar"
      }
    ]
  });

  const consoleErrors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => {
    consoleErrors.push(args.map(arg => String(arg)).join(" "));
  };

  try {
    const usedCache = await client._render_cached_boot_view();
    assert.equal(usedCache, true);
    const ref = XUI.getObject("toolbar-ref");
    assert.equal(ref instanceof XVMView, true);
    assert.equal(ref._type, "xvm-view");
    assert.equal(
      consoleErrors.some(message => message.includes("Xpell object 'xvm-view' not found")),
      false
    );

    client._views_cache.set("toolbar", {
      _type: "view",
      _id: "toolbar",
      _children: [
        {
          _type: "label",
          _id: "toolbar-title",
          _text: "Toolbar"
        }
      ]
    });
    client._emit_view_cache_updated("toolbar");
    await flushAsync();

    assert.equal(XUI.getObject("toolbar-title")._text, "Toolbar");
  } finally {
    console.error = originalConsoleError;
  }
}

function assertClass(el, className) {
  assert.equal(
    el.classList.contains(className),
    true,
    `Expected class "${className}" in "${el.getAttribute("class")}"`
  );
}

function assertNoObjectStyle(el) {
  assert.equal(
    String(el.getAttribute("style") ?? "").includes("[object Object]"),
    false
  );
}

{
  const button = new XButton({ _text: "Save" });
  const dom = button.getDOMObject();

  button.update({
    class: "cta",
    _variant: "primary"
  });

  assertClass(dom, "cta");
  assertClass(dom, "xbutton");
  assertClass(dom, "xbutton--variant-primary");

  button.update({
    class: "secondary",
    _variant: "quiet"
  });

  assertClass(dom, "secondary");
  assertClass(dom, "xbutton");
  assertClass(dom, "xbutton--variant-quiet");
  assert.equal(dom.classList.contains("xbutton--variant-primary"), false);
}

{
  const button = new XButton({ _text: "Alias" });
  const dom = button.getDOMObject();

  button.update({ _class: "alias-class" });

  assertClass(dom, "alias-class");
  assertClass(dom, "xbutton");
}

{
  const view = new XView({});
  const dom = view.getDOMObject();

  view.update({ style: "color: red; display: flex;" });

  assert.equal(dom.style.getPropertyValue("color"), "red");
  assert.equal(dom.style.display, "flex");
  assertNoObjectStyle(dom);
}

{
  const view = new XView({});
  const dom = view.getDOMObject();

  view.update({
    style: "color: red; display: flex;",
    _style: {
      color: "blue",
      backgroundColor: "white"
    }
  });

  assert.equal(dom.style.getPropertyValue("color"), "blue");
  assert.equal(dom.style.getPropertyValue("background-color"), "white");
  assert.equal(dom.style.display, "flex");
  assertNoObjectStyle(dom);
}

{
  const view = new XView({ style: "display: flex;" });
  const dom = view.getDOMObject();

  view.update({ _visible: false });
  assert.equal(dom.style.display, "none");

  view.update({ _visible: true });
  assert.equal(dom.style.display, "flex");
}

{
  const view = new XView({
    style: "display: none;",
    _visible: false
  });
  const dom = view.getDOMObject();

  assert.equal(dom.style.display, "none");

  view.update({ _visible: true });

  assert.notEqual(dom.style.display, "none");

  view.update({ _text: "Later projection" });

  assert.notEqual(dom.style.display, "none");
}

{
  const view = new XView({
    style: "display: none;",
    _visible: false
  });
  const dom = view.getDOMObject();

  view.update({ _text: "Infer visible" });

  assert.equal(dom.style.display, "");
  assert.equal(view._visible, true);
}

{
  const view = new XView({});
  const dom = view.getDOMObject();

  view.update({ style: { color: "red" } });
  assertNoObjectStyle(dom);
}

{
  const view = new XView({});
  const dom = view.getDOMObject();

  view.update({
    title: "plain attribute",
    "data-object": { value: true },
    onclick: () => {}
  });

  assert.equal(dom.getAttribute("title"), "plain attribute");
  assert.equal(dom.hasAttribute("data-object"), false);
  assert.equal(dom.hasAttribute("onclick"), false);
}

{
  const button = new XButton({ _text: "Class reset" });
  const dom = button.getDOMObject();

  button.update({ class: "stale-class" });
  assertClass(dom, "stale-class");
  assertClass(dom, "xbutton");

  button.update({ _text: "No class in patch" });

  assert.equal(dom.classList.contains("stale-class"), false);
  assertClass(dom, "xbutton");
}

{
  const button = new XButton({ _text: "Semantic reset" });
  const dom = button.getDOMObject();

  button.update({
    _variant: "primary",
    _tone: "danger"
  });

  assertClass(dom, "xbutton--variant-primary");
  assertClass(dom, "xbutton--tone-danger");

  button.update({ _text: "No semantic fields in patch" });

  assert.equal(dom.classList.contains("xbutton--variant-primary"), false);
  assert.equal(dom.classList.contains("xbutton--tone-danger"), false);
  assertClass(dom, "xbutton");
}

{
  const table = new XTable({
    _id: "company-table",
    _data_source: "company:records",
    _columns: [
      { _key: "name", _label: "Name" },
      { _key: "domain", _label: "Domain" }
    ]
  });
  const dom = table.getDOMObject();
  const originalExecute = _x.execute;
  let command;

  _x.execute = async xcmd => {
    command = xcmd;
    return {
      _ok: true,
      _result: {
        _records: {
          _data: [
            { name: "Acme", domain: "acme.test" }
          ]
        }
      }
    };
  };

  try {
    await table.loadEntityDataSource();
  } finally {
    _x.execute = originalExecute;
  }

  assert.equal(command?._module, "entity-client");
  assert.equal(command?._op, "find");
  assert.equal(command?._params?._entity, "company");
  assert.equal(command?._params?._filter && Object.keys(command._params._filter).length, 0);
  assert.equal(dom.textContent.includes("Acme"), true);
  assert.equal(dom.textContent.includes("acme.test"), true);
  assert.equal(dom.textContent.includes("No data"), false);
}

{
  const flowClient = new FlowManagerClient();
  const button = new XButton({ _id: "save-company", _text: "Create" });
  const dom = button.getDOMObject();
  document.body.appendChild(dom);

  flowClient.set_ui_flow_state(button, "success");

  assert.equal(dom.textContent, "Saved");
  assertClass(dom, "xui-flow-success");

  const status = document
    .querySelectorAll("[data-xflow-status-for]")
    .find(node => node.getAttribute("data-xflow-status-for") === "save-company");

  assert.equal(status?.textContent, "Saved");
}

{
  await XUIRuntime.loadModules({
    _auto_start: false,
    _load_auth_client: false,
    _load_entity_client: true,
    _load_flow: false,
    _load_studio: false,
    _load_xai_client: false,
    _load_xvm: false
  });

  const entityClient = _x.getModule("entity-client");

  const assertFindOutput = async (responseShape, expectedRows, outputPath) => {
    entityClient._sync = {
      subscribe() {},
      async find() {
        return responseShape;
      }
    };

    _xd.delete(outputPath);

    const response = await _x.execute({
      _module: "entity-client",
      _op: "find",
      _params: {
        _entity: "company",
        _filter: {},
        _output: outputPath
      }
    });

    assert.equal(response, responseShape);
    assert.deepEqual(_xd.get(outputPath), expectedRows);
  };

  const records = [{ _id: "company-1", name: "Acme" }];
  const alternateRecords = [{ _id: "company-2", name: "Globex" }];
  const serverRecords = [{ _id: "company-3", name: "Initech" }];

  await assertFindOutput(
    {
      _ok: true,
      _result: {
        _records: {
          _data: records
        }
      }
    },
    records,
    "company.records"
  );

  await assertFindOutput(
    {
      _ok: true,
      _result: {
        records: {
          _data: alternateRecords
        }
      }
    },
    alternateRecords,
    "company.alternate_records"
  );

  await assertFindOutput(
    {
      _records: {
        _data: serverRecords
      }
    },
    serverRecords,
    "company.server_records"
  );
}
