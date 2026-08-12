import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

register("./ignore-css-loader.mjs", import.meta.url);

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    clear() {
      values.clear();
    },
  };
}

const classList = {
  add() {},
  remove() {},
  toggle() {},
};

globalThis.window = {
  localStorage: createMemoryStorage(),
  sessionStorage: createMemoryStorage(),
  addEventListener() {},
  removeEventListener() {},
};
globalThis.document = {
  documentElement: {
    classList,
    setAttribute() {},
    getAttribute() {
      return "";
    },
  },
  body: {},
};
globalThis.HTMLElement = class HTMLElement {};

const {
  _x,
  XStudioModule,
  XUI,
} = await import("../dist/xpell-ui.es.js");

function registerRuntimeSkillObject(type, skillOverrides = {}) {
  class RuntimeSkillObject {
    static _xtype = type;
    static _skill = {
      _id: type,
      _title: type,
      _version: "1.0.0",
      _active: true,
      _type: "view-skill",
      _description: `${type} runtime component skill.`,
      _fields: {
        _data_source: "XData key for records.",
        _items: "Local items or XData key.",
      },
      _exports: {
        _xui_objects: [type],
      },
      _design: {
        _palette: {
          _title: type,
          _category: "Data Display",
          _default_object: { _type: type },
        },
        _inspector: {
          _fields: [
            { _key: "_data_source", _label: "Data Source", _input: "text" },
            { _key: "_items", _label: "Items", _input: "json" },
          ],
        },
      },
      ...skillOverrides,
    };

    static getOwnSkill() {
      return this._skill;
    }
  }

  XUI.importObject(type, RuntimeSkillObject);
  return RuntimeSkillObject;
}

function createConversationHarness({ onCommand, messages = [] } = {}) {
  const commands = [];
  const module = new XStudioModule({
    getActiveAppId() {
      return "app-runtime-skills";
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
      return { _ok: true, _result: {} };
    },
    isServerReady() {
      return true;
    },
  });
  module._conversation_app_id = "app-runtime-skills";
  module._conversation_env = "default";
  module._conversation_id = "conversation-runtime-skills";
  module._render_conversation_messages = () => {};
  module._write_studio_status = status => {
    module.__lastStatus = status;
  };
  return { module, commands, messages };
}

function runtimeSkillObjects(runtimeSkills) {
  const out = [];
  if (Array.isArray(runtimeSkills?._objects)) out.push(...runtimeSkills._objects);
  if (Array.isArray(runtimeSkills?._modules)) {
    for (const moduleItem of runtimeSkills._modules) {
      if (Array.isArray(moduleItem?._objects)) out.push(...moduleItem._objects);
    }
  }
  return out;
}

function runtimeSkillById(runtimeSkills, id) {
  return runtimeSkillObjects(runtimeSkills).find(skill => skill?._id === id) ?? null;
}

const originalGetSkills = _x.getSkills;
const verboseFields = {};
for (let index = 0; index < 80; index += 1) {
  verboseFields[`_field_${index}`] = `Field ${index} ${"x".repeat(120)}`;
}

registerRuntimeSkillObject("xgallery", {
  _title: "XGallery",
  _description: "Data-bound card gallery and card grid for record collections. Use for gallery, cards, grid, or tiles presentation.",
  _fields: {
    ...verboseFields,
    _data_source: "XData key for entity records.",
    _items: "Local items or XData key.",
    _item: "Maps record fields to card title, subtitle, meta, and actions.",
    _empty_text: "Text shown when there are no records.",
  },
  _match: {
    _keywords: ["gallery", "cards", "card", "grid", "tiles", "collection", "records"],
    _aliases: ["gallery", "cards", "card grid", "tiles"],
  },
  _implementation: "do not send component implementation".repeat(200),
  _design: {
    _palette: {
      _title: "Gallery",
      _category: "Data Display",
      _default_object: { _type: "xgallery", _data_source: "records" },
    },
    _inspector: {
      _fields: [
        { _key: "_data_source", _label: "Data Source", _input: "text" },
        { _key: "_items", _label: "Items", _input: "json" },
        { _key: "_item", _label: "Item Mapping", _input: "json" },
        { _key: "_empty_text", _label: "Empty Text", _input: "text" },
      ],
    },
  },
});

const FakePresentationPanel = registerRuntimeSkillObject("runtime-presentation-panel", {
  _id: "runtime-presentation-panel",
  _title: "Runtime Presentation Panel",
  _description: "Fake test presentation component that should be discovered generically.",
  _match: {
    _keywords: ["panel", "presentation"],
  },
});
XUI.importObject("runtime-presentation-panel-alias", FakePresentationPanel);

try {
  _x.getSkills = () => ({
    _runtime: {
      _engine_id: "engine-test",
      _version: "test",
    },
    _skills: [
      {
        _id: "runtime-base-skill",
        _title: "Runtime Base Skill",
        _version: "1.0.0",
        _type: "runtime-api-skill",
      },
    ],
    _objects: [
      {
        _id: "xgallery",
        _title: "Duplicate Gallery",
        _version: "1.0.0",
        _exports: { _xui_objects: ["xgallery"] },
      },
    ],
    _modules: [
      {
        _name: "existing-module",
        _skills: [
          {
            _id: "existing-module-skill",
            _title: "Existing Module Skill",
            _version: "1.0.0",
            _type: "client-module-api",
          },
        ],
      },
      {
        _name: "xui",
        _skills: [
          {
            _id: "xui-module-skill",
            _title: "XUI Module Skill",
            _version: "1.0.0",
            _type: "client-module-api",
          },
        ],
        _objects: [
          {
            _id: "xgallery",
            _title: "Duplicate Gallery",
            _version: "1.0.0",
            _exports: { _xui_objects: ["xgallery"] },
          },
        ],
      },
    ],
  });

  const { module } = createConversationHarness();
  const runtimeSkills = module._conversation_runtime_context()._runtime_skills;
  const xgallery = runtimeSkillById(runtimeSkills, "xgallery");
  const fakePanel = runtimeSkillById(runtimeSkills, "runtime-presentation-panel");
  const xuiModule = runtimeSkills._modules.find(item => item._name === "xui");
  const serializedGallery = JSON.stringify(xgallery);

  assert.ok(xgallery);
  assert.equal(xgallery._exports._xui_objects.includes("xgallery"), true);
  assert.equal(xgallery._match._keywords.includes("gallery"), true);
  assert.equal(xgallery._design._palette._category, "Data Display");
  assert.equal(Object.keys(xgallery._fields).length <= 32, true);
  assert.equal(serializedGallery.includes("do not send component implementation"), false);
  assert.equal(serializedGallery.length < 10000, true);
  assert.ok(fakePanel);
  assert.equal(fakePanel._exports._xui_objects.includes("runtime-presentation-panel"), true);
  assert.equal(fakePanel._exports._xui_objects.includes("runtime-presentation-panel-alias"), true);
  assert.equal(runtimeSkills._skills.some(skill => skill._id === "runtime-base-skill"), true);
  assert.equal(runtimeSkills._modules.some(item => item._name === "existing-module"), true);
  assert.equal(xuiModule._objects.filter(skill => skill._id === "xgallery").length, 1);
  assert.equal(runtimeSkills._objects.filter(skill => skill._id === "xgallery").length, 1);

  const source = readFileSync(new URL("../src/XStudio/XStudioModule.ts", import.meta.url), "utf8");
  assert.equal(source.includes('=== "xgallery"'), false);
  assert.equal(source.includes("=== 'xgallery'"), false);

  const messages = [];
  const { module: analyzeModule, commands } = createConversationHarness({
    messages,
    onCommand(command, timeoutMs) {
      if (command._op === "get-last-messages") return { _ok: true, _result: { _messages: messages } };
      if (command._op === "list-conversations") return { _ok: true, _result: { _conversations: [] } };
      if (command._op === "append-message") {
        const message = {
          _id: "user-gallery-request",
          _role: "user",
          _text: command._params._message._text,
          _created_at: "2026-08-10T00:00:00.000Z",
        };
        messages.push(message);
        return { _ok: true, _result: { _message: message } };
      }
      if (command._op === "analyze-message") {
        assert.equal(timeoutMs, 45000);
        assert.ok(runtimeSkillById(command._params._runtime_context._runtime_skills, "xgallery"));
        return {
          _ok: true,
          _result: {
            _intent: { _message_type: "conversation", _execution_level: "none", _actions: [] },
          },
        };
      }
      throw new Error(`unexpected command ${command._op}`);
    },
  });

  await analyzeModule._append_conversation_message("Show the pot list in the main view as a gallery instead of a table.");
  const analyzeCommands = commands.filter(item => item.command._op === "analyze-message");
  assert.equal(analyzeCommands.length, 1);
  assert.equal(
    runtimeSkillById(analyzeCommands[0].command._params._runtime_context._runtime_skills, "xgallery")._fields._data_source,
    "XData key for entity records.",
  );
} finally {
  _x.getSkills = originalGetSkills;
}
