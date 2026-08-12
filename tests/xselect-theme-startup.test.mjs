import assert from "node:assert/strict";
import { register } from "node:module";

register("./ignore-css-loader.mjs", import.meta.url);

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

  [Symbol.iterator]() {
    return this.el._classTokens[Symbol.iterator]();
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.attributes = new Map();
    this.childNodes = [];
    this.parentElement = null;
    this._classTokens = new Set();
    this.classList = new FakeClassList(this);
    this.listeners = new Map();
    this.style = {
      getPropertyValue: () => "",
      setProperty: () => {},
      removeProperty: () => {}
    };
  }

  set className(value) {
    this._classTokens = new Set(
      String(value ?? "")
        .split(/\s+/g)
        .map(token => token.trim())
        .filter(Boolean)
    );
  }

  get className() {
    return Array.from(this._classTokens).join(" ");
  }

  setAttribute(name, value) {
    const key = String(name);
    if (key === "class") {
      this.className = value;
      return;
    }

    this.attributes.set(key, String(value));
  }

  getAttribute(name) {
    const key = String(name);
    if (key === "class") return this.className || null;
    return this.attributes.get(key) ?? null;
  }

  hasAttribute(name) {
    return this.getAttribute(name) !== null;
  }

  removeAttribute(name) {
    const key = String(name);
    if (key === "class") {
      this.className = "";
      return;
    }

    this.attributes.delete(key);
  }

  appendChild(child) {
    child.parentElement = this;
    this.childNodes.push(child);
    return child;
  }

  append(child) {
    return this.appendChild(child);
  }

  addEventListener(type, handler) {
    const key = String(type);
    const listeners = this.listeners.get(key) ?? [];
    listeners.push(handler);
    this.listeners.set(key, listeners);
  }

  async dispatchEvent(event) {
    const evt = event ?? {};
    evt.target ??= this;
    evt.type ??= "change";
    for (const handler of this.listeners.get(evt.type) ?? []) {
      await handler(evt);
    }
    return true;
  }
}

class FakeOptionElement extends FakeElement {
  constructor() {
    super("option");
    this.value = "";
    this.selected = false;
    this.disabled = false;
    this.textContent = "";
  }
}

class FakeSelectElement extends FakeElement {
  constructor() {
    super("select");
    this._value = "";
    this.multiple = false;
  }

  get options() {
    return this.childNodes;
  }

  get selectedOptions() {
    return this.options.filter(option => option.selected);
  }

  get value() {
    return this._value;
  }

  set value(next) {
    this._value = String(next ?? "");
    for (const option of this.options) {
      option.selected = option.value === this._value;
    }
  }

  appendChild(child) {
    super.appendChild(child);
    if (!this._value && child.value) this.value = child.value;
    return child;
  }
}

const storage = new Map();
const documentElement = new FakeElement("html");
const documentBody = new FakeElement("body");

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
    if (tag === "select") return new FakeSelectElement();
    if (tag === "option") return new FakeOptionElement();
    return new FakeElement(tagName);
  },
  createElementNS: (_ns, tagName) => new FakeElement(tagName),
  getElementById: () => null,
  querySelector: () => null,
  documentElement,
  body: documentBody
};

globalThis.HTMLElement = FakeElement;
globalThis.HTMLSelectElement = FakeSelectElement;
globalThis.getComputedStyle = () => ({
  getPropertyValue: () => "block"
});

const {
  _x,
  _xd,
  XUI,
} = await import("../dist/xpell-ui.es.js");

_x.loadModule(XUI);

const originalExecute = _x.execute.bind(_x);
const xuiCommands = [];
const xdbCommands = [];
const malformedThemeCommands = [];

_x.execute = async (cmd) => {
  if (cmd?._module === "xui" && cmd?._op === "set-theme") {
    xuiCommands.push(cmd);
    if (!cmd._params?._theme) malformedThemeCommands.push(cmd);
  }

  if (cmd?._module === "xdb-client") {
    xdbCommands.push(cmd);
    const params = cmd._params ?? {};
    const key = params._key ?? params.key;

    if (cmd._op === "get-string") {
      const value = storage.get(String(key)) ?? null;
      const result = {
        _ok: true,
        _result: {
          value
        }
      };
      if (cmd._output?._target === "xdata" && cmd._output?._key) {
        _xd.set(cmd._output._key, value, { source: "test:xdb-client" });
      }
      return result;
    }

    if (cmd._op === "save-string") {
      storage.set(String(key), String(params._value ?? params.value ?? ""));
      return { _ok: true, _result: { saved: true } };
    }
  }

  return originalExecute(cmd);
};

function themeSelectData(id = "home-theme-select") {
  return {
    _type: "select",
    _id: id,
    _data_source: "settings.theme",
    _data_output: "settings.theme",
    _update_data_source_event: "change",
    _persist: {
      _store: "xdb-client",
      _key: "settings.theme",
      _default: "terminal"
    },
    _options: [
      { value: "terminal", label: "Terminal" },
      { value: "dark", label: "Dark" },
      { value: "light", label: "Light" }
    ],
    _on_data: [
      {
        _op: "select-value",
        _params: {
          value: "$data"
        }
      },
      {
        _module: "xui",
        _op: "set-theme",
        _params: {
          _theme: "$data"
        }
      }
    ],
    _on: {
      change: {
        _module: "xui",
        _op: "set-theme",
        _params: {
          _theme: "$event.target.value"
        }
      }
    }
  };
}

async function flush() {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
  await new Promise(resolve => setTimeout(resolve, 0));
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
}

function resetRuntime() {
  storage.clear();
  _xd.clean();
  xuiCommands.length = 0;
  xdbCommands.length = 0;
  malformedThemeCommands.length = 0;
  documentElement.attributes.clear();
  documentElement._classTokens.clear();
  documentBody.childNodes = [];
  XUI._player_element = null;
  XUI._active_theme = undefined;
}

async function mountThemeSelect(id) {
  const player = XUI.createPlayer(`player-${id}`, "xplayer", undefined, true);
  const themeWrites = [];
  const originalSetAttribute = player.setAttribute.bind(player);
  player.setAttribute = (name, value) => {
    if (name === "data-theme") themeWrites.push(String(value));
    return originalSetAttribute(name, value);
  };
  XUI.applyDefaultTheme("terminal", player);
  const select = XUI.create(themeSelectData(id));
  XUI.mount(select, document.body);
  await flush();
  return { select, themeWrites };
}

try {
  {
    resetRuntime();
    const { select, themeWrites } = await mountThemeSelect("clean");
    assert.equal(select.getValue(), "terminal");
    assert.equal(XUI.getPlayerElement().getAttribute("data-theme"), "terminal");
    assert.deepEqual(themeWrites, ["terminal"]);
    assert.equal(malformedThemeCommands.length, 0);
    assert.equal(
      xuiCommands.every(cmd => cmd._params?._theme === "terminal"),
      true
    );
    await select.dispose();
  }

  {
    resetRuntime();
    storage.set("settings.theme", "dark");
    const { select, themeWrites } = await mountThemeSelect("persisted");
    assert.equal(
      select.getValue(),
      "dark",
      JSON.stringify({
        xdbCommands,
        xuiCommands,
        settingsTheme: storage.get("settings.theme"),
        xdataTheme: _xd.get("settings.theme")
      })
    );
    assert.equal(XUI.getPlayerElement().getAttribute("data-theme"), "dark");
    assert.deepEqual(themeWrites, ["terminal", "dark"]);
    assert.equal(malformedThemeCommands.length, 0);
    await select.dispose();
  }

  {
    resetRuntime();
    const { select, themeWrites } = await mountThemeSelect("manual");
    select.setValue("light");
    await select.dom.dispatchEvent({
      type: "change",
      target: {
        value: select.getValue()
      }
    });
    await flush();
    assert.equal(XUI.getPlayerElement().getAttribute("data-theme"), "light");
    assert.deepEqual(themeWrites, ["terminal", "light"]);
    assert.equal(storage.get("settings.theme"), "light");
    assert.equal(storage.get("xpell.theme"), "light");
    assert.equal(malformedThemeCommands.length, 0);
    await select.dispose();
  }

  {
    resetRuntime();
    _xd.set("settings.theme", undefined, { source: "test:empty-startup" });
    const { select } = await mountThemeSelect("empty-startup");
    assert.equal(select.getValue(), "terminal");
    assert.equal(malformedThemeCommands.length, 0);
    await select.dispose();
  }

  {
    resetRuntime();
    let changeHandlerCount = 0;
    const select = XUI.create({
      ...themeSelectData("authored-change"),
      _persist: undefined,
      _on_data: undefined,
      _on: {
        change: async () => {
          changeHandlerCount += 1;
        }
      }
    });
    XUI.mount(select, document.body);
    await flush();
    select.setValue("dark");
    await select.dom.dispatchEvent({
      type: "change",
      target: {
        value: select.getValue()
      }
    });
    await flush();
    assert.equal(changeHandlerCount, 1);
    await select.dispose();
  }
} finally {
  _x.execute = originalExecute;
}
