import { type XpellSkill } from "@xpell/core";

import XUIObject, { type XUIObjectData } from "../XUIObject";


export type XStyleSheetRuleValue =
    string | number;

export type XStyleSheetRules =
    Record<string, XStyleSheetRuleValue>;

export type XStyleSheetData =
    XUIObjectData & {
        _href?: string | string[];
        _classes?: Record<string, string | XStyleSheetRules>;
        _vars?: Record<string, string>;
        _media?: Record<string, Record<string, string | XStyleSheetRules>>;
    };

export class XStyleSheet extends XUIObject {

    static _xtype = "style-sheet";

    static _skill: XpellSkill = {
        _id: "style-sheet",
        _title: "XStyleSheet",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],

        _description:
            "Runtime-managed stylesheet object. Defines CSS classes, CSS variables, optional media rules, or external stylesheet links for XUI views.",

        _fields: {
            _href:
                "Optional external stylesheet URL or list of URLs. When present, XStyleSheet injects stylesheet links instead of generating inline CSS.",
            _classes:
                "Map of class names to CSS declarations. Values may be CSS strings or style objects.",
            _vars:
                "Map of CSS variables to values. Usually written as --var-name.",
            _media:
                "Optional map of media queries to class rule maps.",
            class:
                "Class applied to the generated stylesheet DOM element only. Not used for styling application UI objects."
        },

        _core_rules: [
            "Use style-sheet to define reusable runtime CSS classes.",
            "Use class fields on XUI objects to apply generated classes.",
            "Prefer style-sheet over repeated inline style strings.",
            "Do not use style-sheet for JavaScript logic.",
            "Use _href for external stylesheet links instead of @import in inline CSS.",
            "Keep generated CSS deterministic and data-only.",
            "Do not place application classes on the style-sheet object itself."
        ],

        _canonical_examples: [
            {
                _type: "style-sheet",
                _href: "styles/common.css"
            },
            {
                _type: "style-sheet",
                _id: "system-styles",
                _classes: {
                    "system-home": {
                        "max-width": "720px",
                        "margin": "0 auto"
                    },
                    "hero-actions": "display:flex;gap:12px;align-items:center;"
                },
                _vars: {
                    "--app-accent": "#635bff"
                }
            },
            {
                _type: "style-sheet",
                _classes: {
                    "calc-button": {
                        "padding": "12px",
                        "border-radius": "8px"
                    }
                }
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "_href", _label: "Href", _input: "json" },
                    { _key: "_classes", _label: "Classes", _input: "json" },
                    { _key: "_vars", _label: "Variables", _input: "json" },
                    { _key: "_media", _label: "Media Rules", _input: "json" },
                    { _key: "class", _label: "Element Class", _input: "text" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Style Sheet",
                _category: "Advanced",
                _icon: "file-css",
                _default_object: {
                    _type: "style-sheet",
                    _classes: {}
                }
            }
        }
    };

    _href?: string | string[];
    _classes?: Record<string, string | XStyleSheetRules>;
    _vars?: Record<string, string>;
    _media?: Record<string, Record<string, string | XStyleSheetRules>>;

    constructor(data: XStyleSheetData) {
        const defaults = {
            _type: XStyleSheet._xtype,
            _html_tag: "style"
        };

        super(data, defaults, true);
        this.parse(data);
    }

    override getDOMObject(): HTMLElement {
        if (this.hasStyleHref()) {
            if (!this._dom_object) {
                this._dom_object = this.createLinkDOMObject();
            }

            return this._dom_object;
        }

        const dom = super.getDOMObject();
        dom.textContent = this.renderCSS();
        return dom;
    }

    override update(data: Partial<XStyleSheetData>) {
        const hrefChanged =
            Object.prototype.hasOwnProperty.call(data, "_href");

        super.update(data);

        if (hrefChanged) {
            this._href = data._href;
        }

        if (this._dom_object && hrefChanged) {
            const old_dom = this._dom_object as HTMLElement;
            const parent = old_dom.parentNode;
            this._dom_object = null;
            const next_dom = this.getDOMObject();

            if (parent) {
                parent.replaceChild(next_dom, old_dom);
            }

            return;
        }

        if (this._dom_object && !this.hasStyleHref()) {
            this.dom.textContent = this.renderCSS();
        }
    }

    private hasStyleHref(): boolean {
        if (Array.isArray(this._href)) {
            return this._href.some(
                href =>
                    typeof href === "string" &&
                    href.trim().length > 0
            );
        }

        return (
            typeof this._href === "string" &&
            this._href.trim().length > 0
        );
    }

    private createLinkDOMObject(): HTMLElement {
        const hrefs =
            (Array.isArray(this._href)
                ? this._href
                : [this._href])
                .filter(
                    (href): href is string =>
                        typeof href === "string" &&
                        href.trim().length > 0
                );

        if (hrefs.length === 1) {
            return this.createLinkElement(
                hrefs[0]
            );
        }

        const container =
            document.createElement("div");

        for (const href of hrefs) {
            container.appendChild(
                this.createLinkElement(href)
            );
        }

        return container;
    }

    private createLinkElement(href: string): HTMLLinkElement {
        if (!href.trim()) {
            throw new Error(
                "Invalid stylesheet href"
            );
        }

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = this.resolveStyleHref(href);
        return link;
    }

    private resolveStyleHref(href: string): string {
        const value = href.trim();

        if (
            value.startsWith("/") ||
            value.startsWith("//") ||
            /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)
        ) {
            return value;
        }

        return `/${value}`;
    }

    private renderCSS(): string {
        const parts: string[] = [];

        if (this._vars && Object.keys(this._vars).length > 0) {
            parts.push(`:root {\n${this.renderRuleBody(this._vars)}\n}`);
        }

        if (this._classes) {
            for (const [class_name, rules] of Object.entries(this._classes)) {
                parts.push(this.renderClassRule(class_name, rules));
            }
        }

        if (this._media) {
            for (const [query, class_map] of Object.entries(this._media)) {
                const body = Object
                    .entries(class_map)
                    .map(([class_name, rules]) =>
                        this.renderClassRule(class_name, rules)
                    )
                    .join("\n\n");

                parts.push(`@media ${query} {\n${body}\n}`);
            }
        }

        return parts.join("\n\n");
    }

    private renderClassRule(
        class_name: string,
        rules: string | XStyleSheetRules
    ): string {
        const safe_class_name =
            class_name.startsWith(".")
                ? class_name
                : `.${class_name}`;

        if (typeof rules === "string") {
            return `${safe_class_name} {\n${rules}\n}`;
        }

        return `${safe_class_name} {\n${this.renderRuleBody(rules)}\n}`;
    }

    private renderRuleBody(
        rules: Record<string, string | number>
    ): string {
        return Object
            .entries(rules)
            .map(([key, value]) => `  ${key}: ${String(value)};`)
            .join("\n");
    }
}
