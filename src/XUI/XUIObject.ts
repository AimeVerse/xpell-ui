// ============================================================================
// xpell-ui/src/XUI/XUIObject.ts
// PATCH: make XUIObject overrides compatible with XObject (TS5 strict)
// - Do NOT override base fields with incompatible types
// - Keep UI convenience by casting where needed (runtime unchanged)
// ============================================================================

import {
    XObject, type XObjectData,
    type XEventListenerOptions, _xlog, type XObjectOnEventIndex,
    type XNanoCommand, type XDataXporter,
    XData,
    type XpellSkill,
    type XpellSkillCommand,
    type XNanoCommandPack
} from "@xpell/core";

import { _xem } from "../XEM/XEventManager"

import XUI from "./XUI";
import _xuiobject_basic_nano_commands from "./XUINanoCommands";
import { XUIAnimate } from "./XUIAnimations";
import XUIRuntime from "./XUIRuntime";

const reservedWords = { _children: "child objects" };
const xpellObjectHtmlFieldsMapping: { [k: string]: string } = { "_id": "id", "css-class": "class", "animation": "xyz", "input-type": "type" };
const semanticProjectionFields = [
    "_variant",
    "_tone",
    "_size",
    "_density",
    "_elevation"
] as const;
const domProjectionFields = [
    "class",
    "_class",
    "css-class",
    "style",
    "_style",
    "_visible",
    ...semanticProjectionFields
] as const;
const RESERVED_DOM_EVENT_ALIASES: Record<string, string> = {
    "_click": "click",
    "_change": "change",
    "_input": "input",
    "_submit": "submit",
    "_focus": "focus",
    "_blur": "blur",
    "_keydown": "keydown",
    "_keyup": "keyup",
    "_mouseenter": "mouseenter",
    "_mouseleave": "mouseleave",
};

export type XUIHandler = Function | string | any | any[];

export type XUIFlowDef = string | { _id: string; _payload?: Record<string, any>; };

const XUIOBJECT_SKILL: XpellSkill = {
    _id: "xuiobject",
    _title: "XUIObject Runtime UI Contract",
    _version: "1.0.0",
    _active: true,
    _type: "view-skill",
    _requires: ["xobject", "xem", "xdata"],

    _description:
        "Base UI runtime object for DOM creation, mounting, visibility, styling classes, semantic variants, UI events, and flow triggering.",

    _fields: {
        _html_tag: "DOM tag to create.",
        _html_ns: "Optional DOM namespace.",
        _html: "Generated HTML cache.",
        _visible: "Current visibility state.",
        _parent_element: "DOM parent element id.",
        _text: "Text content/value.",
        _on_show: "Handler when object is shown.",
        _on_hide: "Handler when object is hidden.",
        _on_show_animation: "Animation class used on show.",
        _on_hide_animation: "Animation class used on hide.",
        _flow: "Flow id or flow definition triggered by UI event.",
        _flow_event: "DOM event that triggers _flow. Default click.",
        _flow_auto: "Disable automatic flow binding when false.",
        _variant: "Semantic visual variant.",
        _tone: "Semantic color/tone.",
        _size: "Semantic size.",
        _density: "Semantic density.",
        _elevation: "Semantic elevation.",
        "_dom_attrs": "Any non-underscore field is passed as a DOM attribute when supported, e.g. id, title, role, aria-label, data-*."
    },

    _core_rules: [
        "Use XUIObject fields for UI behavior only.",
        "Use _children for UI composition.",
        "Use _variant, _tone, _size, _density, and _elevation instead of raw class/style.",
        "Use _on.click for local UI actions.",
        "Use _flow for app/business actions.",
        "Do not generate JavaScript functions in JSON."
    ],

    _notes: [
        "XUIObject extends XObject.",
        "XUIObject binds DOM events from _on/_once.",
        "XUIObject can trigger flows through _flow and ui:flow-trigger."
    ]
};


export interface XUIObjectData extends XObjectData {
    _html_tag?: string;
    _html_ns?: string | null;
    _html?: string;
    _visible?: boolean;
    _parent_element?: string;
    _class?: string | null;
    _style?: Record<string, string | number | null | undefined> | null;
    // _on_click?: XUIHandler;
    _on_show?: XUIHandler;
    _on_hide?: XUIHandler;
    _on_show_animation?: string;
    _on_hide_animation?: string;
    _flow?: string;
    _flow_event?: string;
    _flow_auto?: boolean;
    _variant?: string;
    _tone?: string;
    _size?: string;
    _density?: string;
    _elevation?: string;
    _update_data_source_on_change?: boolean;
    _update_data_source_event?: "input" | "change";
}

export class XUIObject extends XObject {

    static _xtype = "xuiobject";
    static _skill: XpellSkill = XUIOBJECT_SKILL;


    static getOwnNanoCommands(): XNanoCommandPack {
        return {
            ..._xuiobject_basic_nano_commands
        };
    }

    static getNanoCommands(): XNanoCommandPack {
        return {
            ...super.getNanoCommands(),
            ...this.getOwnNanoCommands()
        };
    }

    static getNanoCommandSkills(): XpellSkillCommand[] {
        const ownsNanoCommands =
            Object.prototype.hasOwnProperty.call(
                this,
                "getOwnNanoCommands"
            );

        if (!ownsNanoCommands) {
            return [];
        }

        return Object
            .values(this.getOwnNanoCommands())
            .map((cmd: any) =>
                cmd.getSkill?.() ??
                cmd._skill
            )
            .filter(Boolean) as XpellSkillCommand[];
    }

    declare _id: string;
    declare _type: string;

    // ✅ MUST match base XObject contract (TS override compatibility)
    declare _children: Array<XObject | XObjectData>;
    declare _parent: XObject | null;

    declare _name?: string;
    declare _data_source?: string;
    declare _on: XObjectOnEventIndex;
    declare _once: XObjectOnEventIndex;
    declare _on_create?: string | Function | undefined;
    declare _on_mount?: string | Function | undefined;
    declare _on_frame?: string | Function | undefined;
    declare _on_data?: string | Function | undefined;
    declare _on_event?: string | Function | undefined;
    declare _process_frame: boolean;
    declare _process_data: boolean;

    declare protected _xem_options: XEventListenerOptions;
    declare protected _nano_commands: { [k: string]: XNanoCommand };
    declare protected _cache_cmd_txt?: string;
    declare protected _cache_jcmd?: any;

    // ✅ MUST match base XObject contract (string[] not string)
    declare protected _event_listeners_ids: { [eventName: string]: string[] };

    declare protected _xporter: XDataXporter;

    _html_tag: string;
    _html_ns?: string | null;
    protected _dom_object: any;
    _html?: string | undefined;
    _base_display?: string | undefined | null;
    #_text: string = "";
    #_project_text_on_dom_projection = false;
    #_preserve_children_on_dom_projection = false;
    #_has_explicit_visible_projection = false;
    #_reset_style_on_dom_projection = false;
    #_style_projection_keys = new Set<string>();
    _visible: boolean;
    _parent_element?: string;
    // _on_click?: XUIHandler;
    _on_show?: XUIHandler;
    _on_hide?: XUIHandler;
    _on_show_animation?: string;
    _on_hide_animation?: string;
    _flow?: XUIFlowDef;
    _flow_event?: string;
    _variant?: string;
    _tone?: string;
    _size?: string;
    _density?: string;
    _elevation?: string;

    constructor(data: XUIObjectData, defaults: XUIObjectData, skipParse?: boolean) {
        super(data, defaults, true);
        this._html_tag = "div";
        this._html_ns = null;
        this._dom_object = null;
        this._type = "view";
        this._html = "";
        this._children = [];
        this._visible = true;

        // NOTE: _support_html is UI-only. If core typings don't have it, keep cast.
        this._xem_options = <any>{ _once: false, _support_html: true };

        this.addXporterDataIgnoreFields(["_dom_object", "_html", "_xem_options", "#_text"]);
        super.addNanoCommandPack(_xuiobject_basic_nano_commands);

        if (!skipParse && data) this.parse(data, reservedWords);

    }



    parse(data: XObjectData, ignore?: any): void {
        if (data && typeof data === "object" && (data as any)._on_click) {
            if (!(data as any)._on) (data as any)._on = {};
            if (!(data as any)._on.click) { (data as any)._on.click = (data as any)._on_click }
            delete (data as any)._on_click;
            _xlog.warn("[XUIObject] _on_click is deprecated. Use _on.click instead.");
        }
        if (
            data &&
            typeof data === "object" &&
            Object.prototype.hasOwnProperty.call(data, "_visible")
        ) {
            this.#_has_explicit_visible_projection = true;
        }
        super.parse(data, ignore);
    }

    // --------------------------------------------------------------------------
    // UI convenience typed accessors (DO NOT change base field types)
    // --------------------------------------------------------------------------
    get ui_parent(): XUIObject | null {
        return (this._parent as any) as XUIObject | null;
    }

    get ui_children(): XUIObject[] {
        return this._children.filter((c: any) => c instanceof XUIObject) as any;
    }

    // --------------------------------------------------------------------------

    async dispose() {
        this._dom_object = undefined;
        this._html = undefined;
        this._base_display = undefined;
        this.#_text = "";
        // this._on_click = undefined;
        this._on_show = undefined;
        this._on_hide = undefined;
        this._flow = undefined;
        this._flow_event = undefined;

        super.dispose();
    }

    remove() {
        if (this._dom_object instanceof HTMLElement) {
            this._dom_object.remove();
            this._dom_object = null;
        }
    }

    private applyDomProjection() {
        const dom_object = this._dom_object as HTMLElement | undefined | null;
        if (!dom_object) return;

        for (const field of Object.keys(this)) {
            if (!Object.prototype.hasOwnProperty.call(this, field)) continue;
            const val = (this as any)[field];
            if (val == null) continue;

            let outName = field;
            if (xpellObjectHtmlFieldsMapping.hasOwnProperty(field)) {
                outName = xpellObjectHtmlFieldsMapping[field];
            }

            if (
                outName === "class" ||
                outName === "style" ||
                field === "_class" ||
                field === "_style"
            ) {
                continue;
            }

            if (typeof val === "object" || typeof val === "function") {
                continue;
            }

            if (!outName.startsWith("_")) {
                dom_object.setAttribute(outName, String(val));
            }
        }

        this.applyClassProjection(dom_object);
        this.applyStyleProjection(dom_object);

        if (this.#_project_text_on_dom_projection) {
            this.#_text = String((this as any)["_text"] ?? "");

            if (
                this.#_preserve_children_on_dom_projection &&
                dom_object.childNodes.length > 0
            ) {
                const firstChild = dom_object.firstChild;

                if (firstChild?.nodeType === Node.TEXT_NODE) {
                    firstChild.textContent = this.#_text;
                } else {
                    dom_object.insertBefore(
                        document.createTextNode(this.#_text),
                        firstChild
                    );
                }
            } else {
                dom_object.textContent = this.#_text;
            }
        }

        this.#_project_text_on_dom_projection = false;
        this.#_preserve_children_on_dom_projection = false;

        this.applyVisibilityProjection(dom_object);
    }

    private applyClassProjection(el: HTMLElement) {
        const currentTokens = this.splitClass(el.getAttribute("class") || "");
        const projectedTokens = new Set<string>();

        for (const token of this.getClassProjectionTokens()) {
            projectedTokens.add(token);
        }

        for (const token of currentTokens) {
            if (
                this.isPreservedRuntimeClass(token) &&
                !this.isSemanticRuntimeClass(token)
            ) {
                projectedTokens.add(token);
            }
        }

        for (const token of this.getSemanticClassTokens()) {
            projectedTokens.add(token);
        }

        el.setAttribute("class", Array.from(projectedTokens).join(" "));
    }

    private getClassProjectionTokens(): string[] {
        const tokens: string[] = [];

        for (const field of ["class", "_class", "css-class"]) {
            const value = (this as any)[field];

            if (
                value == null ||
                typeof value === "object" ||
                typeof value === "function"
            ) {
                continue;
            }

            tokens.push(...this.splitClass(String(value)));
        }

        return tokens;
    }

    private getSemanticClassTokens(): string[] {
        const tokens = [`x${this._type}`];

        for (const field of semanticProjectionFields) {
            const value = (this as any)[field];

            if (!value) continue;

            const cleanField = field.replace("_", "");

            tokens.push(`x${this._type}--${cleanField}-${value}`);
        }

        return tokens;
    }

    private isSemanticRuntimeClass(token: string): boolean {
        return /^x[^-\s]+--(?:variant|tone|size|density|elevation)-/.test(token);
    }

    private isPreservedRuntimeClass(token: string): boolean {
        return token === `x${this._type}` || token.startsWith("animate__");
    }

    private applyStyleProjection(el: HTMLElement) {
        const styleValue = (this as any).style;
        const hasStyleField = Object.prototype.hasOwnProperty.call(this, "style");

        if (this.#_reset_style_on_dom_projection) {
            el.removeAttribute("style");
            this.#_style_projection_keys.clear();
            this.#_reset_style_on_dom_projection = false;
        }

        // Projection order is intentional: the style string is applied first,
        // then _style overrides individual CSS properties.
        if (hasStyleField) {
            if (typeof styleValue === "string") {
                el.setAttribute("style", styleValue);
            } else if (styleValue == null || typeof styleValue === "object" || typeof styleValue === "function") {
                el.removeAttribute("style");
            } else {
                el.setAttribute("style", String(styleValue));
            }

            this.#_style_projection_keys.clear();
        }

        const styleObject = (this as any)._style;
        const nextStyleProjectionKeys = new Set<string>();
        if (!styleObject || typeof styleObject !== "object" || Array.isArray(styleObject)) {
            for (const key of this.#_style_projection_keys) {
                el.style.removeProperty(key);
            }

            this.#_style_projection_keys.clear();
            return;
        }

        for (const [name, value] of Object.entries(styleObject)) {
            if (
                value == null ||
                typeof value === "object" ||
                typeof value === "function"
            ) {
                continue;
            }

            const styleName = this.normalizeStylePropertyName(name);
            nextStyleProjectionKeys.add(styleName);

            el.style.setProperty(
                styleName,
                String(value)
            );
        }

        for (const key of this.#_style_projection_keys) {
            if (!nextStyleProjectionKeys.has(key)) {
                el.style.removeProperty(key);
            }
        }

        this.#_style_projection_keys = nextStyleProjectionKeys;
    }

    private normalizeStylePropertyName(name: string): string {
        if (name.startsWith("--")) return name;

        return name.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
    }

    private applyVisibilityProjection(el: HTMLElement) {
        if (this.#_has_explicit_visible_projection) {
            if (this._visible === false) {
                const currentDisplay = el.style.display;
                if (currentDisplay && currentDisplay !== "none") {
                    this._base_display = currentDisplay;
                }

                el.style.display = "none";
                return;
            }

            if (this._visible === true) {
                if (
                    this._base_display &&
                    this._base_display !== "none" &&
                    (!el.style.display || el.style.display === "none")
                ) {
                    el.style.display = this._base_display;
                } else if (el.style.display === "none") {
                    el.style.removeProperty("display");
                }

                return;
            }
        }

        if (el.hasAttribute("hidden") || el.style.display === "none") {
            this._visible = false;
            if (el.hasAttribute("hidden") && el.style.display !== "none") {
                el.style.display = "none";
            }
            return;
        }

        this._visible = true;
        if (!this._base_display && el.style.display && el.style.display !== "none") {
            this._base_display = el.style.display;
        }
    }

    getDOMObject(): HTMLElement {
        if (!this._dom_object) {
            const dom_object = (this._html_ns)
                ? document.createElementNS(this._html_ns, this._html_tag)
                : document.createElement(this._html_tag);

            if (this._children.length > 0) {
                this._children.forEach((child: any) => {
                    dom_object.appendChild(child.getDOMObject());
                });
            }

            this._dom_object = dom_object;

            this.#_project_text_on_dom_projection = false;
            this.#_preserve_children_on_dom_projection = false;

            if ((this as any)["_text"] && String((this as any)["_text"]).length > 0) {
                this.#_project_text_on_dom_projection = true;
                this.#_preserve_children_on_dom_projection = true;
            }

            this.applyDomProjection();
        }
        return this._dom_object;
    }

    get dom() {
        return this.getDOMObject();
    }

    set _text(text: string) {
        this.#_text = text;
        this.#_project_text_on_dom_projection = true;
        this.applyDomProjection();
    }

    get _text() {
        return this.#_text;
    }

    getHTML() {
        const dom = this.getDOMObject();
        this._html = dom?.outerHTML;
        return this._html;
    }

    attach(parentElementId: string) {
        document.getElementById(parentElementId)?.append(this.getDOMObject());
        this.onMount();
    }

    mount(parentElementId: string) {
        const obj = document.getElementById(parentElementId);
        if (obj) {
            obj.appendChild(this.getDOMObject());
            this.onMount();
        }
    }

    append(xObject: XUIObject | XObjectData | any) {
        if (!(xObject instanceof XUIObject)) {
            xObject = XUI.create(xObject);
        }

        super.append(xObject); // base handles _children/_parent types

        if (this._dom_object instanceof HTMLElement) {
            this._dom_object.appendChild((xObject as XUIObject).dom);
            if (!(xObject as any)._mounted) (xObject as XUIObject).onMount();
            return xObject;
        }

        return xObject;
    }

    /**
   * UI override: bind DOM events via UI XEventManager adapter.
   * This keeps legacy behavior:
   * - addEventListener("click", ...) binds to DOM when possible
   * - listener ids are tracked in _event_listeners_ids[eventName] as string[]
   */
    addEventListener(eventName: string, handler: any, options: XEventListenerOptions = {} as any): string {
        // const id = (_xem as any).on(eventName, handler, { ...(options as any), _support_html: true }, this);

        // if (!this._event_listeners_ids) (this as any)._event_listeners_ids = {};
        // if (!this._event_listeners_ids[eventName]) this._event_listeners_ids[eventName] = [];
        // this._event_listeners_ids[eventName].push(id);
        const id = super.addEventListener(eventName, handler, { ...(options as any), _support_html: true });
        return id;
    }

    // /**
    //  * UI override: remove a specific listener id (both DOM + bus) via UI _xem.
    //  */
    // removeEventListener(listenerId: string): void {
    //     try {
    //         (_xem as any).remove(listenerId);
    //     } catch (e) {
    //         // ignore
    //     }

    //     // cleanup index
    //     if (!this._event_listeners_ids) return;
    //     for (const [ev, ids] of Object.entries(this._event_listeners_ids)) {
    //         const idx = (ids as string[]).indexOf(listenerId);
    //         if (idx >= 0) (ids as string[]).splice(idx, 1);
    //         if ((ids as string[]).length === 0) delete this._event_listeners_ids[ev];
    //     }
    // }

    // /**
    //  * UI override convenience: remove ALL listeners for an eventName.
    //  */
    // removeAllEventListeners(eventName?: string): void {
    //     if (!this._event_listeners_ids) return;

    //     const keys = eventName ? [eventName] : Object.keys(this._event_listeners_ids);
    //     for (const ev of keys) {
    //         const ids = this._event_listeners_ids[ev] || [];
    //         for (const id of ids) {
    //             try {
    //                 (_xem as any).remove(id);
    //             } catch { }
    //         }
    //         delete this._event_listeners_ids[ev];
    //     }
    // }

    removeAllEventListeners(eventName?: string): void {
        const index = (this as any)._event_listeners_ids;

        if (!index || typeof index !== "object" || Array.isArray(index)) {
            (this as any)._event_listeners_ids = {};
            return;
        }

        const keys = eventName ? [eventName] : Object.keys(index);

        for (const ev of keys) {
            const ids = Array.isArray(index[ev]) ? [...index[ev]] : [];

            for (const id of ids) {
                try {
                    (_xem as any).remove(id);
                } catch {
                    // backward-compatible cleanup: ignore stale listener ids
                }
            }

            delete index[ev];
        }
    }

    // ✅ MUST match base signature: removeChild(child: XObject, dispose?: boolean)
    removeChild(child: XObject, dispose?: boolean): void {
        const child_dom = child instanceof XUIObject ? child.getDOMObject() : undefined;

        if (
            this._dom_object instanceof HTMLElement &&
            child_dom instanceof HTMLElement &&
            child_dom.parentElement === this._dom_object
        ) {
            this._dom_object.removeChild(child_dom);
        }

        super.removeChild(child, dispose);
    }

    setText(text: string) {
        this._text = text;
    }

    getValue(): string {
        return (this.dom as any)?.value ?? this._text ?? "";
    }

    setStyleAttribute(attr: string, val: string) {
        if (this._dom_object instanceof HTMLElement) {
            this._dom_object.style.setProperty(attr, val);
        }
    }

    // XUIObject — class helpers (safe for "a b c" inputs)
    //
    // - Accepts single or multi-class strings (space/newline/tab separated)
    // - Never feeds spaces into DOMTokenList APIs
    // - Keeps (this as any).class in sync when possible
    // - Backward compatible: addClass("a b") now works instead of throwing

    private splitClass(input: string): string[] {
        return String(input || "")
            .split(/\s+/g)
            .map(s => s.trim())
            .filter(Boolean);
    }

    addClass(className: string) {
        const tokens = this.splitClass(className);
        if (tokens.length === 0) return;

        if (this._dom_object instanceof HTMLElement) {
            this._dom_object.classList.add(...tokens);
        }

        const cur = this.splitClass(String((this as any).class || ""));
        const set = new Set([...cur, ...tokens]);
        (this as any).class = Array.from(set).join(" ");
    }

    removeClass(className: string) {
        const tokens = this.splitClass(className);
        if (tokens.length === 0) return;

        if (this._dom_object instanceof HTMLElement) {
            this._dom_object.classList.remove(...tokens);
        }

        const cur = this.splitClass(String((this as any).class || ""));
        const remove = new Set(tokens);
        (this as any).class = cur.filter(c => !remove.has(c)).join(" ");
    }

    toggleClass(className: string) {
        const tokens = this.splitClass(className);
        if (tokens.length === 0) return;

        if (this._dom_object instanceof HTMLElement) {
            for (const t of tokens) this._dom_object.classList.toggle(t);
            (this as any).class = this._dom_object.className;
            return;
        }

        const cur = new Set(this.splitClass(String((this as any).class || "")));
        for (const t of tokens) {
            if (cur.has(t)) cur.delete(t);
            else cur.add(t);
        }
        (this as any).class = Array.from(cur).join(" ");
    }

    replaceClass(oldClass: string, newClass: string) {
        const oldTokens = this.splitClass(oldClass);
        const newTokens = this.splitClass(newClass);

        if (this._dom_object instanceof HTMLElement) {
            if (oldTokens.length) this._dom_object.classList.remove(...oldTokens);
            if (newTokens.length) this._dom_object.classList.add(...newTokens);
            (this as any).class = this._dom_object.className;
            return;
        }

        const cur = this.splitClass(String((this as any).class || ""));
        const remove = new Set(oldTokens);
        const kept = cur.filter(c => !remove.has(c));
        const set = new Set([...kept, ...newTokens]);
        (this as any).class = Array.from(set).join(" ");
    }


    show() {
        const el = this.getDOMObject();
        if (!(el instanceof HTMLElement)) return;

        const currentDisplay = getComputedStyle(el).getPropertyValue("display");
        if (currentDisplay && currentDisplay !== "none") {
            this._visible = true;
            return;
        }

        if (!this._base_display || this._base_display === "none") {
            this._base_display = "block";
        }

        if (this._on_show_animation) {
            el.classList.add(XUIAnimate._animation_base_class, this._on_show_animation);
            this.addEventListener(
                "animationend",
                () => el.classList.remove(this._on_show_animation as string),
                { _once: true } as any
            );
        }

        el.style.display = this._base_display;
        this._visible = true;
        this.onShow();
    }

    hide() {
        const el = this.getDOMObject();
        if (!(el instanceof HTMLElement)) return;

        const computedDisplay = getComputedStyle(el).getPropertyValue("display");
        if (computedDisplay === "none") {
            this._visible = false;
            return;
        }

        if (!this._base_display || this._base_display === "none") {
            this._base_display = computedDisplay || "block";
        }

        this._visible = false;

        if (this._on_hide_animation) {
            el.classList.add(XUIAnimate._animation_base_class, this._on_hide_animation);
            this.addEventListener(
                "animationend",
                () => {
                    el.classList.remove(this._on_hide_animation as string);
                    el.style.display = "none";
                    this.onHide();
                },
                { _once: true } as any
            );
            return;
        }

        el.style.display = "none";
        this.onHide();
    }

    async animate(animation: string, infinite: boolean = false) {
        if (this._dom_object instanceof HTMLElement) {
            return new Promise((resolve) => {
                this._dom_object.classList.add(XUIAnimate._animation_base_class, animation);
                if (infinite) {
                    this._dom_object.classList.add("animate__infinite");
                    (this as any)["_active_animation"] = animation;
                    resolve(true);
                } else {
                    this.addEventListener(
                        "animationend",
                        () => {
                            this._dom_object.classList.remove(animation);
                            resolve(true);
                        },
                        { _once: true } as any
                    );
                }
            });
        }
    }

    stopAnimation() {
        if (this._dom_object instanceof HTMLElement && (this as any)["_active_animation"]) {
            this._dom_object.classList.remove(<any>(this as any)["active-animation"], "animate__infinite");
            delete (this as any)["_active_animation"];
        }
    }

    toggle() {
        const el = this._dom_object;
        if (el instanceof HTMLElement) {
            const cs = getComputedStyle(el).getPropertyValue("display");
            this._visible = cs !== "none";
        }
        if (this._visible) this.hide();
        else this.show();
    }

    click() {
        if (this._dom_object instanceof HTMLElement) {
            this._dom_object.click();
        }
    }

    async onMount() {
        if ((this as any)._mounted) return;

        await super.onMount();

        const el = this._dom_object;



        if (el instanceof HTMLElement) {
            const onMap = (this as any)._on || {};
            const onceMap = (this as any)._once || {};

            const bindEvent = (eventName: string, handler: any, once = false) => {
                if (eventName === "show" || eventName === "hide") return;

                const resolvedEventName =
                    RESERVED_DOM_EVENT_ALIASES[eventName] ?? eventName;

                if (resolvedEventName.startsWith("xem:")) {
                    const xemEvent = resolvedEventName.slice(4);
                    if (!xemEvent) return;

                    this.addEventListener(
                        xemEvent,
                        handler,
                        once ? { _once: true } : undefined
                    );
                    return;
                }

                if (
                    resolvedEventName.startsWith("_") &&
                    !RESERVED_DOM_EVENT_ALIASES[eventName]
                ) {
                    const xemEvent = resolvedEventName.slice(1);
                    if (!xemEvent) return;

                    this.addEventListener(
                        xemEvent,
                        handler,
                        once ? { _once: true } : undefined
                    );
                    return;
                }

                el.addEventListener(
                    resolvedEventName,
                    async (e: any) => {
                        await this.checkAndRunInternalFunction(handler, e);
                    },
                    once ? { once: true } : undefined
                );
            };

            if (!(this as any)._dom_events_bound) {
                (this as any)._dom_events_bound = true;

                for (const eventName of Object.keys(onMap)) {
                    bindEvent(eventName, onMap[eventName], false);
                }

                for (const eventName of Object.keys(onceMap)) {
                    bindEvent(eventName, onceMap[eventName], true);
                }
            }


            // --------------------------------
            // 🔒 bind FLOW ONLY ONCE
            // --------------------------------
            if (this._flow && (this as any)._flow_auto !== false && !(this as any)._flow_bound) {
                (this as any)._flow_bound = true;

                const eventName = this._flow_event || "click";

                const hasHandler =
                    (this as any)._on?.[eventName] ||
                    (this as any)._once?.[eventName];

                if (!hasHandler) {
                    el.addEventListener(eventName, async (e: any) => {
                        try {
                            let flowId: string | undefined;
                            let payloadTemplate: Record<string, any> | undefined;
                            if (typeof this._flow === "string") {
                                flowId = this._flow;

                            } else if (
                                this._flow &&
                                typeof this._flow === "object"
                            ) {

                                flowId = this._flow._id;
                                payloadTemplate = this._flow._payload;
                            }

                            if (!flowId) {
                                _xlog.warn("[XUIObject] missing _flow._id");
                                return;
                            }

                            const ctx = {
                                event: {
                                    type: e?.type,
                                    value: e?.target?.value,
                                    checked: e?.target?.checked,
                                    key: e?.key
                                }
                            };

                            let payload: Record<string, any>;

                            if (
                                payloadTemplate &&
                                typeof payloadTemplate === "object"
                            ) {

                                payload = this.resolveFlowPayload(
                                    payloadTemplate,
                                    ctx
                                );

                            } else {

                                // fallback behavior
                                payload = ctx.event;
                            }

                            _xem.fire("ui:flow-trigger", {
                                _flow_id: flowId,
                                _event_name: eventName,
                                _event_payload: payload,
                                _object_id: this._id,
                                _app_id: XUIRuntime.getClient()?._app_id,
                                _source: "ui"
                            });

                        } catch (err) {

                            _xlog.error(
                                "[XUIObject] _flow trigger failed",
                                err
                            );
                        }
                    });
                }
            }

            // --------------------------------
            // visibility state
            // --------------------------------
            try {

                const cs =
                    getComputedStyle(el).getPropertyValue("display");

                this._visible = cs !== "none";

                if (!this._base_display && cs && cs !== "none") {
                    this._base_display = cs;
                }

            } catch {

                this._visible = true;
            }
        } else {
            this._visible = true;
        }


        (this as any)._mounted = true;
    }


    private resolveFlowPayload(template: any, ev: any) {

        const eventCtx = {
            type: ev?.type,
            value: ev?.target?.value,
            checked: ev?.target?.checked,
            key: ev?.key,
            target: ev?.target
        };

        const resolve = (val: any): any => {

            if (typeof val === "string") {

                /* ---------------- xdata ---------------- */

                if (val.startsWith("$xdata.")) {
                    const key = val.slice(7);
                    return XData.get(key);
                }

                /* ---------------- event ---------------- */

                if (val === "$event") {
                    return eventCtx;
                }

                if (val.startsWith("$event.")) {
                    const key = val.slice(7);
                    return eventCtx[key as keyof typeof eventCtx];
                }

                return val;
            }

            /* ---------------- arrays ---------------- */

            if (Array.isArray(val)) {
                return val.map(resolve);
            }

            /* ---------------- objects ---------------- */

            if (val && typeof val === "object") {
                const out: any = {};

                for (const k of Object.keys(val)) {
                    out[k] = resolve(val[k]);
                }

                return out;
            }

            return val;
        };

        return resolve(template);
    }

    async onShow() {
        if (this._on_show) {
            this.checkAndRunInternalFunction(this._on_show);
        } else if (this._on && (this._on as any).show) {
            this.checkAndRunInternalFunction((this._on as any).show);
        } else if (this._once && (this._once as any).show) {
            this.checkAndRunInternalFunction((this._once as any).show);
        }

        this._children.forEach((child: any) => {
            if (child.onShow && typeof child.onShow === "function") child.onShow();
        });
    }

    async onHide() {
        if (this._on_hide) {
            this.checkAndRunInternalFunction(this._on_hide);
        } else if (this._on && (this._on as any).hide) {
            this.checkAndRunInternalFunction((this._on as any).hide);
        } else if (this._once && (this._once as any).hide) {
            this.checkAndRunInternalFunction((this._once as any).hide);
        }

        this._children.forEach((child: any) => {
            if (child.onHide && typeof child.onHide === "function") child.onHide();
        });
    }


    setDOMAttribute(
        key: string,
        value: any
    ) {
        (this as any)[key] = value;

        const el =
            this._dom_object;

        if (!(el instanceof HTMLElement)) {
            return;
        }

        if (
            value === undefined ||
            value === null ||
            value === false
        ) {
            el.removeAttribute(key);
            return;
        }

        el.setAttribute(
            key,
            String(value)
        );
    }

    /**
     * This is the core of XUIObject's "patch" capability: it updates the current object with new data, applying changes to the DOM and children as needed, while keeping the same instance.
     * @param next 
     * @returns 
     */
    update(next: XUIObjectData) {
        if (!next) return;

        // -------------------------
        // basic props
        // -------------------------

        if (next._text !== undefined) {
            this.#_text = next._text as any;
            this.#_project_text_on_dom_projection = true;
        }

        this.replaceDomProjectionFields(next);

        // -------------------------
        // generic attributes (🔥 important)
        // -------------------------

        for (const key of Object.keys(next)) {
            if (key.startsWith("_")) continue;
            if ((domProjectionFields as readonly string[]).includes(key)) continue;

            const val = (next as any)[key];
            if (val == null) continue;

            (this as any)[key] = val;
        }

        this.applyDomProjection();

        // -------------------------
        // children patch
        // -------------------------

        if (Array.isArray(next._children)) {
            this.patchChildren(next._children as any[]);
        }
    }

    private replaceDomProjectionFields(next: XUIObjectData) {
        this.#_reset_style_on_dom_projection = true;

        for (const field of domProjectionFields) {
            if (!Object.prototype.hasOwnProperty.call(next, field)) {
                delete (this as any)[field];
                continue;
            }

            const value = (next as any)[field];

            if (value === undefined || value === null) {
                delete (this as any)[field];
                continue;
            }

            (this as any)[field] = value;
        }

        if (Object.prototype.hasOwnProperty.call(next, "_visible")) {
            const visible = (next as any)._visible;

            if (typeof visible === "boolean") {
                this._visible = visible;
                this.#_has_explicit_visible_projection = true;
                return;
            }
        }

        this.#_has_explicit_visible_projection = false;
    }

    private patchChildren(nextChildren: XObjectData[]) {
        const current = this.ui_children;

        const byId = new Map<string, XUIObject>();
        for (const c of current) {
            if (c._id) byId.set(c._id, c);
        }

        const newChildren: XUIObject[] = [];

        for (const childData of nextChildren) {
            let existing: XUIObject | undefined;

            const childId = (childData as any)?._id;
            if (typeof childId === "string" && childId) {
                existing = byId.get(childId);
            }

            if (existing) {
                existing.update(childData as any);
                newChildren.push(existing);
                byId.delete(existing._id);
            } else {
                const created = XUI.create(childData as any);
                newChildren.push(created);
            }
        }

        for (const leftover of byId.values()) {
            this.removeChild(leftover, true);
        }

        // Rebuild children graph without disposing reused children.
        for (const child of [...this.ui_children]) {
            if (newChildren.includes(child)) {
                super.removeChild(child, false);
            }
        }

        for (const child of newChildren) {
            if (!this.ui_children.includes(child)) {
                super.append(child);
            }
        }

        if (this._dom_object instanceof HTMLElement) {
            this._dom_object.replaceChildren(...newChildren.map((child) => child.dom));

            for (const child of newChildren) {
                if (!(child as any)._mounted) {
                    child.onMount();
                }
            }
        }
    }

    protected applySemanticClasses(el: HTMLElement) {

        // base type class
        el.classList.add(`x${this._type}`);

        const semanticFields = [
            "_variant",
            "_tone",
            "_size",
            "_density",
            "_elevation"
        ];

        for (const field of semanticFields) {

            const value = (this as any)[field];

            if (!value) continue;

            const cleanField = field.replace("_", "");

            el.classList.add(
                `x${this._type}--${cleanField}-${value}`
            );
        }
    }
}

export default XUIObject;
