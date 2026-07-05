import assert from "node:assert/strict";
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
}

class FakeTableElement extends FakeElement {}
class FakeButtonElement extends FakeElement {
  constructor(tagName) {
    super(tagName);
    this.disabled = false;
  }
}

const storage = new Map();

globalThis.window = {
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
  }
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
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: selector => {
    const matches = [];
    const wantsFlowStatus = selector === "[data-xflow-status-for]";

    const visit = node => {
      if (wantsFlowStatus && node instanceof FakeElement && node.hasAttribute("data-xflow-status-for")) {
        matches.push(node);
      }

      if (Array.isArray(node?.childNodes)) {
        node.childNodes.forEach(visit);
      }
    };

    visit(globalThis.document.body);
    return matches;
  },
  body: new FakeElement("body")
};

globalThis.HTMLElement = FakeElement;
globalThis.HTMLTableElement = FakeTableElement;
globalThis.HTMLButtonElement = FakeButtonElement;
globalThis.Node = FakeTextNode;
globalThis.getComputedStyle = el => ({
  getPropertyValue: name => el.style.getPropertyValue(name)
});

const ui = await import("../dist/xpell-ui.es.js");
const { _x, _xd, FlowManagerClient, XButton, XTable, XUI, XUIObject, XUIRuntime, XVM, XView } = ui;

assert.equal("XVMView" in ui, false);

await _x.loadModuleAsync(XUI);
await _x.loadModuleAsync(XVM);

{
  const registeredViewRef = XUI.create({
    _type: "xvm-view",
    _view_id: "registered-smoke-view"
  });

  assert.equal(registeredViewRef instanceof XUIObject, true);
  assert.equal(registeredViewRef._type, "xvm-view");
  assert.equal(typeof registeredViewRef.resolveView, "function");
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
