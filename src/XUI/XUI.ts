/**
 * XUI — Xpell User Interface Module
 *
 * Universal HTML & CSS UI engine for the Xpell runtime.
 * Provides DOM-backed UI object creation, mounting, removal,
 * and low-level visibility utilities across browsers and devices.
 *
 * ---
 *
 * ## Responsibilities
 *
 * - Create, mount, and remove DOM-backed UI objects
 * - Provide visibility helpers (without owning navigation)
 * - Manage the UI player and root containers
 * - Handle first-user-gesture utilities (audio, video, etc.)
 *
 * ---
 *
 * ## XVM Contract Compatibility
 *
 * XUI MUST remain navigation-agnostic.
 *
 * - `XUI.add()` and `XUI.mount()` MUST NOT call `show()` or `onShow()`
 * - `XVM.stackInternal()` is the ONLY place allowed to call `target.show()`
 *
 * This separation guarantees deterministic navigation,
 * predictable lifecycle behavior, and multi-container safety.
 *
 * ---
 *
 * ## Architectural Boundary
 *
 * - **XUI**: Structure, DOM binding, lifecycle helpers
 * - **XVM**: Navigation, stacking, history, URL sync, regions, containers
 * 
 * XUI builds the interface; XVM runs the application.
 *
 * @packageDocumentation
 * @since 2022-07-22
 * @author Tamir Fridman
 * @copyright
 * © 2022–present Aime Technologies. All rights reserved.
 */


import XUIObject from "./XUIObject";

import {
  _xd,
  _xlog,
  XModule,
  type XModuleData,
  type XObjectData,
  setXEventManager,
} from "@xpell/core";

import { _xem } from "../XEM/XEventManager";
import {XUIObjectPack ,XUISVGObjectPack} from "./CoreObjects/XUICoreObjects";
import type {
  XpellSkill,
  XpellSkillCommand
} from "@xpell/core";

import "./Style/xui.css";

export const FIRST_USER_GESTURE = "first-user-gesture";
const XUI_THEME_STORAGE_KEY = "xpell.theme";
const XUI_THEME_XD_KEY = "xui.theme";
type XUIThemeSource = "user" | "persisted" | "view-default" | "framework-default";
type XUIApplyThemeOptions = {
  _persist?: boolean;
  _respect_persisted?: boolean;
  _source?: XUIThemeSource;
  _view_theme?: string | Record<string, string>;
};

const XUI_SKILL: XpellSkill = {
  _id: "xui",
  _title: "XUI Runtime Module",
  _version: "1.0.0",
  _active: true,
  _type: "client-module-api",
  _requires: ["xmodule", "xuiobject"],

  _description:
    "Client-side UI module for creating, mounting, removing, theming, and managing DOM-backed XUI objects.",

  _core_rules: [
    "XUI creates and mounts UI objects.",
    "XUI does not own navigation; XVM controls active views.",
    "XUI.add() and XUI.mount() must not call show().",
    "Use XUI object _type values, not raw HTML unless needed.",
    "Use themes and semantic fields instead of raw style/class."
  ]
};

/**
 * XUI Module - Xpell User Interface Module for HTML and CSS
 */
export class XUIModule extends XModule {
  static _module_name = "xui";

  static _skill: XpellSkill = XUI_SKILL;

  static _ops: Record<string, XpellSkillCommand> = {
    "register-theme": {
      _name: "register-theme",
      _scope: "module",
      _description: "Register a named XUI theme token object.",
      _params: {
        _name: "Theme name.",
        _tokens: "CSS variable token map."
      }
    },

    "apply-theme": {
      _name: "apply-theme",
      _scope: "module",
      _description: "Apply a named CSS theme or inline token theme.",
      _params: {
        _theme: "Theme name or CSS variable token map."
      }
    },

    "set-theme": {
      _name: "set-theme",
      _scope: "module",
      _description: "Alias for apply-theme.",
      _params: {
        _theme: "Theme name or CSS variable token map."
      }
    },

    "create-player": {
      _name: "create-player",
      _scope: "module",
      _description: "Create the root XUI player element.",
      _params: {
        _id: "Player id. Default xplayer.",
        class: "Optional CSS class.",
        _parent_element: "Optional parent DOM element id.",
        _set_as_main_player: "Whether to set as main XUI player.",
        _theme: "Optional theme name or token map."
      }
    },
    "show": {
      _name: "show",
      _scope: "module",
      _description: "Show a XUI object by id.",
      _params: {
        _id: "XUI object id."
      }
    },
    "hide": {
      _name: "hide",
      _scope: "module",
      _description: "Hide a XUI object by id.",
      _params: {
        _id: "XUI object id."
      }
    },
    "toggle": {
      _name: "toggle",
      _scope: "module",
      _description: "Toggle visibility of a XUI object by id.",
      _params: {
        _id: "XUI object id."
      }
    }
  };

  private _player_element: HTMLElement | null = null;
  private _first_gesture_occurred = false;
  private _themes: Record<string, Record<string, string>> = {};
  private _active_theme?: string;

  private _readPersistedTheme() {
    if (typeof window === "undefined") return "";

    try {
      const theme = window.localStorage?.getItem(XUI_THEME_STORAGE_KEY);
      return typeof theme === "string" ? theme.trim() : "";
    } catch (err) {
      _xlog.debug("[XUI] Theme persistence read skipped", err);
      return "";
    }
  }

  private _persistTheme(theme: string) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage?.setItem(XUI_THEME_STORAGE_KEY, theme);
    } catch (err) {
      _xlog.debug("[XUI] Theme persistence write skipped", err);
    }
  }

  private _syncDocumentThemeClass(theme: string) {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    Array
      .from(root.classList)
      .filter(cls => cls.startsWith("xtheme-"))
      .forEach(cls => root.classList.remove(cls));

    root.setAttribute("data-theme", theme);
    root.classList.add(`xtheme-${theme}`);
  }

  private _debugThemeSourceResolved(
    persisted_theme: string,
    view_theme: string,
    resolved_theme: string,
    source: XUIThemeSource,
  ) {
    _xlog.debug("[xui] theme source resolved", {
      _persisted_theme: persisted_theme,
      _view_theme: view_theme,
      _resolved_theme: resolved_theme,
      _source: source,
    });
  }

  _events = {
    _loaded: "xui-loaded",
  };

  /**
   * @fires "xui-loaded" event
   */
  constructor() {
    super({ _name: XUIModule._module_name });

    // Register default objects
    _xlog.log("[XUI] Registering default XUI object pack...");
    this.importObjectPack(XUIObjectPack);

  }


  loadSVGPack() {
    _xlog.debug("[XUI] Registering XUI SVG object pack...");
    this.importObjectPack(XUISVGObjectPack);
  }


  async onLoad() {
    // Set the XEventManager instance for the entire app (DOM adapter)
    setXEventManager(_xem);
    const persisted_theme = this._readPersistedTheme();
    if (persisted_theme) {
      this.applyTheme(persisted_theme, undefined, {
        _persist: false,
        _source: "persisted",
      });
    } else {
      this._debugThemeSourceResolved("", "", "", "framework-default");
    }
    _xem.fire(this._events._loaded);
  }

  getPlayerElement(): HTMLElement | null {
    return this._player_element;
  }
  /* ------------------------------------------------------------------------ */
  /* Core creation / mounting                                                  */
  /* ------------------------------------------------------------------------ */

  /**
   * Create a XUIObject
   */
  create(data?: XObjectData): XUIObject {
    const d = data ?? { _type: "view", _children: [] };
    if (!(d as any)._type) (d as any)._type = "view";
    return super.create(d) as XUIObject;
  }


  registerTheme(name: string, tokens: Record<string, string>) {
    this._themes[name] = tokens;
  }

  applyTheme(
    theme: string | Record<string, string>,
    root?: HTMLElement,
    opts: XUIApplyThemeOptions = {},
  ) {

    const target =
      root ||
      this._player_element ||
      document.documentElement;

    /* ------------------------------------------------------------
     Remove previous theme classes
    ------------------------------------------------------------ */

    Array
      .from(target.classList)
      .filter(cls => cls.startsWith("xtheme-"))
      .forEach(cls => target.classList.remove(cls));

    /* ------------------------------------------------------------
     Named theme (CSS driven)
    ------------------------------------------------------------ */
    if (typeof theme === "string") {
      const view_theme = typeof opts._view_theme === "string"
        ? opts._view_theme.trim()
        : theme.trim();
      const requested_theme = theme.trim();
      if (!requested_theme) return;
      const persisted_theme = opts._respect_persisted
        ? this._readPersistedTheme()
        : "";
      const resolved_theme = persisted_theme || requested_theme;
      const source: XUIThemeSource = persisted_theme
        ? "persisted"
        : opts._source ?? "user";
      const should_persist = opts._persist ?? source === "user";

      this._debugThemeSourceResolved(
        persisted_theme,
        view_theme,
        resolved_theme,
        source,
      );

      if (
        this._active_theme === resolved_theme &&
        target.getAttribute("data-theme") === resolved_theme
      ) {
        return;
      }

      this._active_theme = resolved_theme;
      target.setAttribute(
        "data-theme",
        resolved_theme
      );
      target.classList.add(
        `xtheme-${resolved_theme}`
      );
      this._syncDocumentThemeClass(resolved_theme);
      if (should_persist) this._persistTheme(resolved_theme);
      _xd.set(XUI_THEME_XD_KEY, resolved_theme, {
        source: `xui.theme.${source}`,
      });
      _xlog.log("Applied CSS theme", resolved_theme);
      return;
    }

    /* ------------------------------------------------------------
     Inline token theme
    ------------------------------------------------------------ */

    for (const [key, val] of Object.entries(theme)) {
      target.style.setProperty(key, val);
    }

    _xlog.log("Applied inline token theme", theme);
  }

  applyDefaultTheme(
    theme: string | Record<string, string>,
    root?: HTMLElement,
  ) {
    if (typeof theme === "string") {
      this.applyTheme(theme, root, {
        _persist: false,
        _respect_persisted: true,
        _source: "view-default",
        _view_theme: theme,
      });
      return;
    }

    this.applyTheme(theme, root);
  }

  /**
   * Resolve a DOM parent target.
   * Priority:
   * 1) explicit parent argument (HTMLElement or "#id" string)
   * 2) xobj._parent_element (if provided)
   * 3) current player element
   * 4) document.body
   */
  private resolveMountTarget(xobj: XUIObject, parent?: HTMLElement | string | null): HTMLElement | null {
    if (typeof parent === "string") return document.querySelector<HTMLElement>("#" + parent);
    if (parent instanceof HTMLElement) return parent;

    const pe = (xobj as any)?._parent_element;
    if (pe) return document.querySelector<HTMLElement>("#" + pe);

    return this._player_element ?? document.body;
  }

  /**
   * Mount an existing XUIObject into a parent.
   * IMPORTANT: DOES NOT call show() or onShow().
   * Mounting is structural; visibility is controlled by XUIObject.show/hide (called by XVM stack).
   */
  mount(xobj: XUIObject, parent?: HTMLElement | string | null): XUIObject {
    const el = xobj.getDOMObject();
    const target = this.resolveMountTarget(xobj, parent);

    if (!target) {
      _xlog.log(`XUI.mount | Parent not found for object ${xobj?._id ?? "[no-id]"}`);
      return xobj;
    }

    target.appendChild(el);

    if (typeof (xobj as any).onMount === "function") {
      try {
        (xobj as any).onMount();
      } catch (e) {
        _xlog.error(e);
      }
    }

    // NOTE: intentionally no onShow() here (XVM controls showing)
    return xobj;
  }

  /**
   * Create + mount a XUIObject.
   * IMPORTANT: DOES NOT call show() or onShow().
   */
  /**
 * Create + mount a XUIObject.
 * IMPORTANT: DOES NOT call show() or onShow().
 *
 * Contract fix:
 * - _on_create / _on.create / _once.create fire AFTER the full tree is mounted/registered
 * - runs once per object, async-safe, never crashes the app
 */
  add(xData: XObjectData, parent?: HTMLElement | string | null): XUIObject {
    const root = this.create(xData);
    const mounted = this.mount(root, parent);

    // Post-mount create pass (tree-complete)
    queueMicrotask(() => {
      const run = async (o: any): Promise<void> => {
        if (!o) return;

        try {
          if (typeof o.onCreate === "function") await o.onCreate();
        } catch (e) {
          // optional: _xlog.error(e);
        }

        const kids = o._children;
        if (Array.isArray(kids)) {
          for (const c of kids) {
            if (c && typeof (c as any).onCreate === "function") {
              await run(c);
            }
          }
        }
      };

      run(mounted).catch(() => { });
    });

    return mounted;
  }


  /**
   * Append XUIObject to the parent XUI Object by ID.
   */
  append(xobj: XUIObject | XObjectData, parentXobjId: string) {
    const parent = this.getObject(parentXobjId) as XUIObject | undefined;
    if (parent) return parent.append(xobj);

    _xlog.log(
      `XUI.append | Parent object ${parentXobjId} not found for object ${(xobj as any)._id ?? "[no-id]"
      }`
    );
  }

  /**
   * Wrap an array of XObjectData with a wrapper object (layout helper).
   */
  wrap(xObjects: XObjectData[], wrapper?: XObjectData): XObjectData {
    const w = wrapper ?? { _type: "view", class: "xflex", _children: [] };

    if (!w._children) w._children = [];
    if (!w.class) w.class = "xflex";
    else if (!String(w.class).includes("xflex")) w.class += " xflex";
    if (!w._type) w._type = "view";

    for (const xobj of xObjects) w._children!.push(xobj);
    return w;
  }



  /**
   * Navigate the browser to a new URL
   */
  openUrl(url: string, newWindow?: boolean) {
    if (!newWindow) document.location.href = url;
    else window.open(url);
  }

  /**
   * Removes the XUIObject from the DOM by ID and from the Object Manager
   * @override
   */
  remove(objectId: string) {
    if ((this as any)._log_rules?.removeObject) _xlog.log("XUI remove object " + objectId);

    const obj = this.getObject(objectId) as any;
    if (obj && typeof obj.remove === "function") {
      try {
        obj.remove();
      } catch (e) {
        _xlog.error(e);
      }
    }

    super.remove(objectId);
  }

  /* ------------------------------------------------------------------------ */
  /* First user gesture (kept; improved)                                      */
  /* ------------------------------------------------------------------------ */

  get firstUserGestureOccurred() {
    return this._first_gesture_occurred;
  }

  waitForFirstUserGesture(): Promise<void> {
    if (this._first_gesture_occurred) return Promise.resolve();

    return new Promise((resolve) => {
      document.addEventListener(FIRST_USER_GESTURE, () => resolve(), { once: true } as any);
    });
  }

  /**
   * Fires FIRST_USER_GESTURE once via a transparent overlay.
   * Useful for Web APIs that require user interaction (audio unlock, pointer lock, fullscreen, etc).
   *
   * - Idempotent
   * - Uses position:fixed to always cover viewport
   */
  enableFirstUserGestureEvent(opts?: { overlayId?: string }) {
    if (this._first_gesture_occurred) return;

    const overlayId = opts?.overlayId ?? "first-gesture-overlay";
    if (document.getElementById(overlayId)) return;

    const vstyle =
      "position:fixed;z-index:10000;width:100%;height:100vh;top:0;left:0;background:transparent;";

    const obj = this.create({
      _type: "view",
      _id: overlayId,
      style: vstyle,
    });

    (obj as any).onClick = `document.dispatchEvent(new CustomEvent("${FIRST_USER_GESTURE}"));`;
    document.body.appendChild(obj.getDOMObject());

    document.addEventListener(
      FIRST_USER_GESTURE,
      () => {
        this.remove(overlayId);
        this._first_gesture_occurred = true;
      },
      { once: true } as any
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Player                                                                   */
  /* ------------------------------------------------------------------------ */

  /**
   * Creates a player element and appends it to the DOM.
   * If setAsMainPlayer=true, sets it as default mount root for XUI.add/mount.
   */
  createPlayer(
    playerId: string = "xplayer",
    cssClass?: string,
    parentElementId?: string,
    setAsMainPlayer?: boolean,
    theme?: string | Record<string, string>,
  ): HTMLDivElement {
    const parent = parentElementId ? document.getElementById(parentElementId) : document.body;

    const div = document.createElement("div");
    div.id = playerId;
    div.className = cssClass ?? playerId;

    if (!cssClass) {
      div.style.width = "100%";
      div.style.height = "100%";
      div.style.position = "absolute";
      div.style.top = "0";
      div.style.left = "0";
    }

    if (!this._player_element || setAsMainPlayer) this._player_element = div;

    if (parent) {
      (parent as HTMLElement).style.margin = "0";
      (parent as HTMLElement).style.padding = "0";
      parent.appendChild(div);
    }

    if (theme) {
      this.applyDefaultTheme(theme, div);
    }
    return div;
  }

  /* ------------------------------------------------------------------------ */
  /* Visibility helpers (stay in XUI)                                         */
  /* ------------------------------------------------------------------------ */

  show(objectId: string) {
    const obj = this.getObject(objectId) as XUIObject | undefined;
    obj?.show();
  }

  hide(objectId: string) {
    const obj = this.getObject(objectId) as XUIObject | undefined;
    obj?.hide();
  }

  toggle(objectId: string) {
    const obj = this.getObject(objectId) as XUIObject | undefined;
    obj?.toggle();
  }

  /**
   * ops
   */

  async _show(cmd: any) {
    const p = cmd?._params ?? cmd;
    const id = p?._id ?? p?.id;
    if (!id) throw new Error("xui show: missing _id");
    this.show(String(id));
    return { _ok: true, _result: { _id: id } };
  }

  async _hide(cmd: any) {
    const p = cmd?._params ?? cmd;
    const id = p?._id ?? p?.id;
    if (!id) throw new Error("xui hide: missing _id");
    this.hide(String(id));
    return { _ok: true, _result: { _id: id } };
  }

  async _toggle(cmd: any) {
    const p = cmd?._params ?? cmd;
    const id = p?._id ?? p?.id;
    if (!id) throw new Error("xui toggle: missing _id");
    this.toggle(String(id));
    return { _ok: true, _result: { _id: id } };
  }
  



  async _register_theme(cmd: any) {
    const p = cmd?._params ?? cmd;

    const name = p?._name ?? p?.name;
    const tokens = p?._tokens ?? p?.tokens;

    if (!name) throw new Error("xui register-theme: missing _name");
    if (!tokens || typeof tokens !== "object") {
      throw new Error("xui register-theme: missing _tokens");
    }

    this.registerTheme(String(name), tokens);
    return { _ok: true, _result: { _name: name } };
  }

  async _apply_theme(cmd: any) {
    const p = cmd?._params ?? cmd;

    const theme =
      p?._theme ??
      p?.theme ??
      p?._tokens ??
      p?.tokens;

    if (!theme) throw new Error("xui apply-theme: missing _theme");

    this.applyTheme(theme);
    return { _ok: true, _result: { _theme: theme } };
  }

  async _set_theme(cmd: any) {
    return this._apply_theme(cmd);
  }

  async _create_player(cmd: any) {
    const p = cmd?._params ?? cmd;

    const player = this.createPlayer(
      p?._id ?? p?.id ?? "xplayer",
      p?.class,
      p?._parent_element,
      p?._set_as_main_player !== false,
      p?._theme
    );

    return {
      _ok: true,
      _result: {
        _id: player.id
      }
    };
  }


}


/* -------------------------------------------------------------------------- */
/* Public singleton                                                           */
/* -------------------------------------------------------------------------- */

export const XUI = new XUIModule();

export default XUI;
