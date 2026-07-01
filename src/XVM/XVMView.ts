import { XUIObject, type XUIObjectData } from "../XUI/XUIObject";
import { XObjectPack, _xlog, _xu, type XpellSkill } from "@xpell/core";

export type XVMViewResolver = (view_id: string) => Record<string, any> | null;

export interface XVMViewData extends XUIObjectData {
  _type: "xvm-view";
  _view_id: string;
  _params?: Record<string, any>;
  _xvm_view_stack?: string[];
}

export class XVMView extends XUIObject {
  static _xtype = "xvm-view";
  private static view_resolver: XVMViewResolver | null = null;
  static _skill: XpellSkill = {
    _id: "xvm-view",
    _title: "XVMView",
    _version: "1.0.0",
    _active: true,
    _type: "view-skill",
    _requires: ["xuiobject", "xvm"],

    _description:
      "Composable XVM view reference object. Use it like a JSON component to render another registered XVM view without duplicating its children.",
    _fields: {
      _view_id: "Required registered XVM view id to render.",
      _params: "Optional local params passed into the referenced view. Use $params.name inside referenced view JSON.",
      _id: "Optional local wrapper id. If omitted, the referenced view _id should be used.",
      class: "Optional local wrapper classes. Merged with referenced view class.",
      _xvm_view_stack: "Internal recursion-protection stack. Do not generate manually."
    },

    _core_rules: [
      "Use xvm-view to split large views into reusable registered XVM views.",
      "Always provide _view_id.",
      "Do not generate _xvm_view_stack manually.",
      "Prefer omitting local _id so the referenced view root _id is used.",
      "Prefer defining root class/style on the referenced view, not on the xvm-view wrapper.",
      "Use _params for component-like values.",
      "Inside the referenced view, use $params.foo or $params.foo.bar.",
      "Do not use xvm-view for external files; the referenced view must already exist in the XVM registry.",
      "Avoid recursive references between views.",
      "Do not inline the referenced view's _children unless explicitly asked.",
      "Use xvm-view for header, footer, toolbar, sidebar, repeated panels, and large reusable sections.",
      "Referenced views should be normal _type:'view' files with their own _id, class, and _children.",
      "Do not set local class unless you need wrapper-specific extra classes.",
      "Do not set local _id unless you intentionally need an id different from _view_id.",
      "When passing text/config into the referenced view, use _params and $params.* only.",
      "Never use $data or $xdata for static component params."
    ],

    _canonical_examples: [
      {
        _type: "xvm-view",
        _view_id: "page-toolbar",
        _params: {
          title: "Dashboard",
          subtitle: "Runtime overview"
        }
      },
      {
        _type: "xvm-view",
        _view_id: "kpi-card",
        _params: {
          title: "Active Apps",
          value: "12",
          trend: "+3 today"
        }
      }
    ],

    _design: {
      _inspector: {
        _fields: [
          { _key: "_view_id", _label: "View ID", _input: "text", _required: true },
          { _key: "_params", _label: "Params", _input: "json" },
          { _key: "_id", _label: "Wrapper ID", _input: "text" },
          { _key: "class", _label: "Class", _input: "text" },
          { _key: "_xvm_view_stack", _label: "View Stack", _input: "json", _advanced: true, _readonly: true }
        ]
      },
      _children: {
        _allowed: false,
        _insert_modes: ["before", "after"]
      },
      _palette: {
        _title: "XVM View",
        _category: "Advanced",
        _icon: "component",
        _default_object: {
          _type: "xvm-view",
          _view_id: "view-id"
        }
      }
    }
  };

  static setViewResolver(resolver: XVMViewResolver | null) {
    XVMView.view_resolver = resolver;
  }
  private static readonly missing_param = Symbol("xvm-view-missing-param");

  _view_id?: string;
  _params?: Record<string, any>;
  _xvm_view_stack?: string[];
  private _resolved = false;
  private _resolving = false;
  private _cache_listener_bound = false;
  private _explicit_id = false;
  private _referenced_root_patch: Record<string, any> | null = null;

  constructor(data: XVMViewData) {
    super(data, {
      _type: "xvm-view",
      _html_tag: "div",
    }, true);

    this._explicit_id =
      typeof data?._id === "string" &&
      data._id.trim().length > 0;

    this.parse(data);
  }

  async onCreate() {
    await this.resolveView();
    await super.onCreate();
  }

  async onMount() {
    this.bindViewCacheRetry();

    await this.resolveView();

    await super.onMount();

    if (this._referenced_root_patch) {
      this.applyDomRootPatch(this._referenced_root_patch);
    }
  }

  private bindViewCacheRetry() {
    if (this._cache_listener_bound) return;

    this._cache_listener_bound = true;

    this.addEventListener(
      "xvm:view-cache-updated",
      (payload: any) => {

        if (this._resolved) return;
        if (this._resolving) return;
        if (!this._view_id) return;

        if (payload?._view_id !== this._view_id) {
          return;
        }

        _xlog.debug(
          "[XVMView] retrying unresolved view",
          {
            _view_id: this._view_id
          }
        );

        void this.resolveView();
      }
    );
  }

  override update(data: Partial<XVMViewData>) {
    const next_view_id = data?._view_id;
    const next_params = data?._params;

    const view_changed =
      typeof next_view_id === "string" &&
      next_view_id !== this._view_id;

    const params_changed =
      next_params !== undefined &&
      next_params !== this._params;

    if (view_changed || params_changed) {
      this._resolved = false;
    }

    if (view_changed) {
      this._view_id = next_view_id;
    }

    if (next_params !== undefined) {
      this._params = next_params;
    }

    if (Array.isArray(data?._xvm_view_stack)) {
      this._xvm_view_stack = [...data._xvm_view_stack];
    }

    super.update(data as any);

    if (!this._resolved && !this._resolving) {
      void this.resolveView();
    }
  }

  async resolveView() {
    if (this._resolved) return;
    if (this._resolving) return;
    if (!this._view_id) return;

    const stack = this.getViewStack();

    if (stack.includes(this._view_id)) {
      this._resolving = true;
      try {
        _xlog.warn("[XVMView] recursion detected", {
          _view_id: this._view_id,
          _stack: stack,
        });
        this.update({
          _children: []
        });
        this._resolved = true;
      } finally {
        this._resolving = false;
      }
      return;
    }

    const next_stack = [...stack, this._view_id];
    this._resolving = true;
    try {
      _xlog.debug(`[XVMView] resolving view: ${this._view_id}`);

      const view = XVMView.view_resolver?.(this._view_id) ?? null;
      if (!view || !Array.isArray(view._children)) {
        _xlog.warn("[XVMView] view not available yet", {
          _view_id: this._view_id,
        });
        return;
      }

      this.applyReferencedRoot(view);

      const children = this.applyParams(this.clone(view._children));
      this.injectViewStack(children, next_stack);

      if (this._params) {
        _xlog.debug("[XVMView] applied params");
      }

      this.update({
        _children: children as XUIObjectData["_children"],
      });
      this._resolved = true;
    } catch (err) {
      _xlog.warn("[XVMView] failed to resolve view", this._view_id, err);
    } finally {
      this._resolving = false;
    }
  }

  private applyReferencedRoot(view: Record<string, any>) {
    const root: Record<string, any> = {};

    if (
      !this._explicit_id &&
      typeof view._id === "string" &&
      view._id.trim()
    ) {
      root._id = view._id.trim();
    }

    const ref_class =
      typeof view.class === "string"
        ? view.class.trim()
        : "";

    const own_class =
      typeof (this as any).class === "string"
        ? String((this as any).class).trim()
        : "";

    const runtime_class =
      typeof this._type === "string" && this._type.trim()
        ? `x${this._type.trim()}`
        : "";

    const runtime_tokens = runtime_class.split(/\s+/).filter(Boolean);
    const runtime_token_set = new Set(runtime_tokens);

    const merged_class = [
      ...ref_class.split(/\s+/).filter((token) => token && !runtime_token_set.has(token)),
      ...own_class.split(/\s+/).filter((token) => token && !runtime_token_set.has(token)),
      ...runtime_tokens
    ].filter((v, i, arr) => arr.indexOf(v) === i).join(" ");

    if (merged_class) {
      root.class = merged_class;
    }

    for (const key of Object.keys(view)) {
      if (
        key === "_id" ||
        key === "_type" ||
        key === "_children" ||
        key === "_theme" ||
        key === "_on" ||
        key === "_once" ||
        key === "_on_create" ||
        key === "_on_mount" ||
        key === "_on_data" ||
        key === "_on_frame" ||
        key === "_process_data" ||
        key === "_process_frame" ||
        key === "_params" ||
        key === "_xvm_view_stack"
      ) {
        continue;
      }

      if (
        key === "style" ||
        key === "_style" ||
        key === "_html_tag" ||
        key.startsWith("data-") ||
        key.startsWith("aria-")
      ) {
        root[key] = view[key];
      }
    }

    if (Object.keys(root).length > 0) {
      this._referenced_root_patch = root;
      super.update(root as any);
      this.applyDomRootPatch(root);
    }
  }

  private applyDomRootPatch(root: Record<string, any>) {
    const dom = (this as any).dom as HTMLElement | undefined;
    if (!dom) return;

    if (typeof root._id === "string" && root._id.trim()) {
      dom.id = root._id.trim();
    }

    if (typeof root.class === "string" && root.class.trim()) {
      dom.className = root.class.trim();
    }

    if (typeof root.style === "string") {
      dom.setAttribute("style", root.style);
    }

    for (const key of Object.keys(root)) {
      if (key.startsWith("data-") || key.startsWith("aria-")) {
        const value = root[key];

        if (value === undefined || value === null) {
          dom.removeAttribute(key);
        } else {
          dom.setAttribute(key, String(value));
        }
      }
    }
  }

  private clone<T>(value: T): T {
    if (typeof structuredClone === "function") return structuredClone(value);
    return _xu.clone_json(value);
  }

  private applyParams(value: unknown): unknown {
    if (typeof value === "string") return this.resolveParamString(value);

    if (Array.isArray(value)) {
      return value.map((item) => this.applyParams(item));
    }

    if (_xu.is_plain_object(value)) {
      const out = value as Record<string, any>;
      for (const key of Object.keys(out)) {
        out[key] = this.applyParams(out[key]);
      }
      return out;
    }

    return value;
  }

  private resolveParamString(value: string): unknown {
    if (!value.startsWith("$params.")) return value;

    const path = value.slice("$params.".length);
    if (!path) return value;

    const resolved = _xu.get_path(this._params, path, XVMView.missing_param);
    return resolved === XVMView.missing_param ? value : resolved;
  }

  private getViewStack(): string[] {
    if (!Array.isArray(this._xvm_view_stack)) return [];
    return this._xvm_view_stack.filter((view_id) => typeof view_id === "string" && view_id.length > 0);
  }

  private injectViewStack(value: unknown, stack: string[]) {
    if (Array.isArray(value)) {
      for (const item of value) {
        this.injectViewStack(item, stack);
      }
      return;
    }

    if (!_xu.is_plain_object(value)) return;

    const obj = value as Record<string, any>;

    if (obj._type === XVMView._xtype) {
      obj._xvm_view_stack = [...stack];
    }

    if (Array.isArray(obj._children)) {
      this.injectViewStack(obj._children, stack);
    }
  }
}

export class XVMViewPack extends XObjectPack {
  static getObjects() {
    return {
      [XVMView._xtype]: XVMView,
    };
  }
}

export default XVMViewPack;
