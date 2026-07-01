/**
 * XUI Core Objects
 *
 * Object-pack registry for the built-in XUI primitives.
 *
 * This module defines the default mapping between `_type` / HTML tag aliases
 * and their corresponding XUI classes. It is used by the Xpell runtime to
 * materialize UI nodes from JSON/UI schemas (e.g. `XDB.create({ _type })`,
 * view factories, manifests, or dynamic UI generation).
 *
 * ---
 *
 * ## What this pack provides
 *
 * - Canonical XUI primitives (`XView`, `XLabel`, `XButton`, `XInput`, ...)
 * - HTML tag aliases mapped to `XHTML` (e.g. `header`, `section`, `p`, `li`, ...)
 * - Convenience alias: `"div"` → `XView`
 * - SVG primitives (`XSVG`, `XSVGCircle`, `XSVGPath`, ...)
 *
 * ---
 *
 * ## Contract
 *
 * - Keys are `_type` values (or HTML tag aliases)
 * - Values are XUI classes that extend `XUIObject`
 * - Registration order must remain stable to keep `_type` resolution deterministic
 *
 * @packageDocumentation
 * @since 2022-07-22
 * @copyright
 * © 2022–present Aime Technologies. All rights reserved.
 */

import { XUIObject, type XUIObjectData } from "../XUIObject";
import { _x, _xd, type XObjectData, XObjectPack, _xlog, XObject, createNanoCommandWithSkill } from "@xpell/core";
import { _xem } from "../../XEM/XEventManager"
import type {
    XpellSkill,
    XpellSkillCommand,
    XNanoCommand
} from "@xpell/core";

import { XInput, XPassword, XTextArea, XTextField, XSelect } from "./XInput";
import { XSVG, XSVGCircle, XSVGEllipse, XSVGLine, XSVGPath, XSVGPolygon, XSVGPolyline, XSVGRect } from "./SVGObjects";
import { XStyleSheet } from "./XStyleSheet";
export class XView extends XUIObject {

    static _xtype = "view";

    static _skill: XpellSkill = {
        _id: "view",
        _title: "XView",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],
        _description:
            "Basic XUI container view. Used as a generic layout/root container for child UI objects.",
        _fields: {
            _children: "Child UI objects.",
            _theme: "Optional theme when used as root view.",
            class: "Optional CSS class. Defaults to xview."
        },
        _core_rules: [
            "Use view as a generic container.",
            "Use _children for nested UI structure.",
            "Do not use view when a more semantic object exists."
        ],
        _canonical_examples: [
            {
                _type: "view",
                _id: "main",
                _children: []
            }
        ]
    };

    constructor(data: XUIObjectData) {
        const defaults = {
            _type: XView._xtype,
            class: "xview",
            _html_tag: "div"
        };
        super(data, defaults, true);
        this.parse(data);

    }

}

export class XForm extends XUIObject {
    static _xtype = "form"
    static _skill: XpellSkill = {
        _id: "form",
        _title: "XForm",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],

        _description:
            "Semantic HTML form container for grouping input fields and submit actions.",

        _fields: {
            _children: "Form fields, labels, buttons, and layout children.",
            action: "Optional native form action URL.",
            method: "Optional native form method, usually get or post.",
            name: "Optional form name.",
            autocomplete: "Browser autocomplete behavior.",
            novalidate: "Disable native browser validation."
        },

        _core_rules: [
            "Use form when inputs belong to one submit action.",
            "Use field components inside form when available.",
            "Use button with type:'submit' for native submit behavior.",
            "Prefer _flow or _on.submit for app logic.",
            "Do not use form only as a visual container."
        ],

        _canonical_examples: [
            {
                _type: "form",
                _id: "login-form",
                _flow: {
                    _id: "login",
                    _payload: {
                        username: "$xdata.login.username",
                        password: "$xdata.login.password"
                    }
                },
                _flow_event: "submit",
                _children: []
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "action", _label: "Action", _input: "text" },
                    { _key: "method", _label: "Method", _input: "text" },
                    { _key: "name", _label: "Name", _input: "text" },
                    { _key: "autocomplete", _label: "Autocomplete", _input: "text" },
                    { _key: "novalidate", _label: "No Validate", _input: "checkbox" }
                ]
            },
            _children: {
                _allowed: true,
                _insert_modes: ["inside", "before", "after"]
            },
            _palette: {
                _title: "Form",
                _category: "Input",
                _icon: "clipboard-list",
                _default_object: {
                    _type: "form",
                    _children: []
                }
            }
        }
    };

    static override getArtifactStrategy() {
        return "merge" as const;
    }

    constructor(data: XUIObjectData) {
        const tag = "form"
        const defaults = {
            _type: tag,
            class: "x" + tag,
            _html_tag: tag
        }
        super(data, defaults, true);
        this.parse(data)
        this.addNanoCommand(
            "submit",
            createNanoCommandWithSkill(
                (_cmd, obj?: XObject) => {
                    (obj as XForm)?.submit();
                },
                {
                    _name: "submit",
                    _scope: "form",
                    _description: "Submit the current form."
                }
            )
        );

        this.addNanoCommand(
            "reset",
            createNanoCommandWithSkill(
                (_cmd, obj?: XObject) => {
                    (obj as XForm)?.reset();
                },
                {
                    _name: "reset",
                    _scope: "form",
                    _description: "Reset the current form fields."
                }
            )
        );
    }

    submit() {

        const form = this.dom as HTMLFormElement;
        if (typeof form.requestSubmit === "function") {
            form.requestSubmit();
            return;
        }
        form.submit();
    }

    reset() {
        const form = this.dom as HTMLFormElement;
        form.reset();

    }
}

export class XImage extends XUIObject {

    static _xtype = "image";

    static _skill: XpellSkill = {
        _id: "image",
        _title: "XImage",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],

        _description:
            "Image UI object rendered as an HTML img element.",

        _fields: {
            src: "Image URL/source.",
            alt: "Accessible alternative text.",
            width: "Optional image width.",
            height: "Optional image height.",
            loading: "Browser loading mode, e.g. lazy or eager.",
            decoding: "Browser decoding mode, e.g. async.",
            _children: "Do not use children with image."
        },

        _core_rules: [
            "Use image for visual image content.",
            "Always provide alt text when possible.",
            "Use src for the image URL.",
            "Do not place _children inside image."
        ],

        _canonical_examples: [
            {
                _type: "image",
                src: "/logo.png",
                alt: "Logo"
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "src", _label: "Source", _input: "text" },
                    { _key: "alt", _label: "Alt Text", _input: "text" },
                    { _key: "width", _label: "Width", _input: "number" },
                    { _key: "height", _label: "Height", _input: "number" },
                    { _key: "loading", _label: "Loading", _input: "text" },
                    { _key: "decoding", _label: "Decoding", _input: "text" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Image",
                _category: "Media",
                _icon: "image",
                _default_object: {
                    _type: "image",
                    src: "/image.png",
                    alt: "Image"
                }
            }
        }
    };

    constructor(data: XUIObjectData) {
        const defaults = {
            _type: XImage._xtype,
            class: "x" + XImage._xtype,
            _html_tag: "img"
        };

        super(data, defaults, true);
        this.parse(data);
    }
}

export class XVideo extends XUIObject {
    static _xtype = "video";

    static _skill: XpellSkill = {
        _id: "video",
        _title: "XVideo",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],

        _description:
            "Video UI object rendered as an HTML video element.",

        _fields: {
            src: "Video URL/source.",
            controls: "Show browser video controls.",
            autoplay: "Autoplay video when allowed by browser.",
            muted: "Mute video.",
            loop: "Loop playback.",
            poster: "Poster image URL.",
            width: "Optional video width.",
            height: "Optional video height.",
            preload: "Browser preload mode: none, metadata, or auto.",
            _children: "Optional source/track children only when needed."
        },

        _core_rules: [
            "Use video for video playback.",
            "Use controls:true for user-controlled playback.",
            "Autoplay usually requires muted:true.",
            "Use poster for preview image when available.",
            "Do not use video as a generic container."
        ],

        _canonical_examples: [
            {
                _type: "video",
                src: "/intro.mp4",
                controls: true,
                poster: "/intro-poster.jpg"
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "src", _label: "Source", _input: "text" },
                    { _key: "controls", _label: "Controls", _input: "checkbox" },
                    { _key: "autoplay", _label: "Autoplay", _input: "checkbox" },
                    { _key: "muted", _label: "Muted", _input: "checkbox" },
                    { _key: "loop", _label: "Loop", _input: "checkbox" },
                    { _key: "poster", _label: "Poster", _input: "text" },
                    { _key: "width", _label: "Width", _input: "number" },
                    { _key: "height", _label: "Height", _input: "number" },
                    { _key: "preload", _label: "Preload", _input: "text" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Video",
                _category: "Media",
                _icon: "video",
                _default_object: {
                    _type: "video",
                    controls: true
                }
            }
        }
    };

    constructor(data: XObjectData) {
        const defaults = {
            _type: XVideo._xtype,
            class: "x" + XVideo._xtype,
            _html_tag: "video"
        };

        super(data, defaults, true);
        this.parse(data);
    }
}

export class XWebcam extends XUIObject {
    static _xtype = "webcam";

    static _skill: XpellSkill = {
        _id: "webcam",
        _title: "XWebcam",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],
        _description: "Webcam video object using browser mediaDevices.getUserMedia.",

        _fields: {
            autoplay: "Autoplay webcam video.",
            muted: "Mute webcam video.",
            _video_constraints: "getUserMedia video constraints."
        },

        _core_rules: [
            "Use webcam only when live camera input is required.",
            "Requires browser camera permission.",
            "Do not use webcam for normal video playback; use video instead."
        ],
        _canonical_examples: [
            {
                _type: "webcam",
                autoplay: true,
                muted: true,
                _video_constraints: { video: true, width: 320, height: 280 }
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "autoplay", _label: "Autoplay", _input: "checkbox" },
                    { _key: "muted", _label: "Muted", _input: "checkbox" },
                    { _key: "_video_constraints", _label: "Video Constraints", _input: "json" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Webcam",
                _category: "Media",
                _icon: "camera",
                _default_object: {
                    _type: "webcam",
                    autoplay: true,
                    muted: true,
                    _video_constraints: { video: true, width: 320, height: 280 }
                }
            }
        }
    };

    autoplay: boolean;
    muted: boolean;
    _video_constraints: { video: boolean; width: number; height: number; };


    constructor(data: XObjectData) {
        const defaults = {
            _type: XWebcam._xtype,
            class: "x" + XWebcam._xtype,
            _html_tag: "video"
        };

        super(data, defaults, true);
        this.parse(data);

        this.autoplay = true;
        this.muted = true;
        this._video_constraints = {
            video: true,
            width: 320,
            height: 280
        };

        this.addNanoCommand(
            "start-camera",
            createNanoCommandWithSkill(
                (_cmd, obj?: XObject) => {
                    const cam = obj as XWebcam;
                    cam?.setSource?.(cam.dom);
                },
                {
                    _name: "start-camera",
                    _scope: "webcam",
                    _description: "Request camera permission and start webcam stream."
                }
            )
        );

        this.addNanoCommand(
            "pause-camera",
            createNanoCommandWithSkill(
                (_cmd, obj?: XObject) => {
                    (obj as XWebcam)?.pause?.();
                },
                {
                    _name: "pause-camera",
                    _scope: "webcam",
                    _description: "Pause the webcam video element."
                }
            )
        );
    }

    /**
     * this method checks if the browser has "getMedia" support for webcam & mic
     * @returns boolean
     */
    isAvailable() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    setSource(video_elem: any) {

        navigator.mediaDevices.getUserMedia(this._video_constraints).then((stream) => {
            video_elem.srcObject = stream;
            video_elem.addEventListener('loadeddata', async () => {
            });
        });
    }

    get isPlaying() {
        const v: any = this.getDOMObject()
        return !!(v?.currentTime > 0 && !v?.paused && !v?.ended && v?.readyState > 2);
    }

    async pause() {
        const v: any = this.getDOMObject()
        v?.pause()
        //Spell.run("xai handpose stop-detect")
    }
}



/**
 * 
 * based on bootstrap card component:
 * 
 * <div class="card" style="width: 18rem;">
  <img class="card-img-top" src="..." alt="Card image cap">
  <div class="card-body">
    <h5 class="card-title">Card title</h5>
    <p class="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
    <a href="#" class="btn btn-primary">Go somewhere</a>
  </div>
</div>
 */

// use with 


export class XLink extends XUIObject {
    static _xtype = "link"

    static _skill: XpellSkill = {
        _id: "link",
        _title: "XLink",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],

        _description:
            "Hyperlink UI object rendered as an HTML anchor element.",

        _fields: {
            href: "Link URL.",
            target: "Browser target such as _blank.",
            rel: "Relationship attribute.",
            download: "Enable browser download behavior.",
            _text: "Visible link text."
        },

        _match: {
            _keywords: [
                "link",
                "hyperlink",
                "url",
                "website",
                "web page",
                "open page",
                "external site",
                "navigate",
                "navigation",
                "anchor",
                "href",
                "target blank",
                "_blank"
            ]
        },
        _core_rules: [
            "Use link for navigation URLs and external resources.",
            "Use button for actions.",
            "Use target:'_blank' for external links when needed.",
            "Use rel:'noopener noreferrer' with _blank for security."
        ],

        _canonical_examples: [
            {
                _type: "link",
                href: "https://xpell.ai",
                target: "_blank",
                _text: "Open Xpell"
            },
            {
                "_type": "link",
                "_text": "Documentation",
                "href": "https://docs.example.com"
            },
            {
                "_type": "link",
                "_text": "Open Website",
                "href": "https://example.com",
                "target": "_blank",
                "rel": "noopener noreferrer"
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "href", _label: "Href", _input: "text" },
                    { _key: "target", _label: "Target", _input: "text" },
                    { _key: "rel", _label: "Rel", _input: "text" },
                    { _key: "download", _label: "Download", _input: "checkbox" },
                    { _key: "_text", _label: "Text", _input: "textarea" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Link",
                _category: "Basic",
                _icon: "link",
                _default_object: {
                    _type: "link",
                    _text: "Link",
                    href: "#"
                }
            }
        }
    };

    constructor(data: XObjectData) {
        const tag = "link"
        const defaults = {
            _type: XLink._xtype,
            class: "x" + XLink._xtype,
            _html_tag: "a"
        }
        super(data, defaults, true);
        this.parse(data);
    }
}

export class XLabel extends XUIObject {
    static _xtype = "label"
    static _skill: XpellSkill = {
        _id: "label",
        _title: "XLabel",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],

        _description:
            "Text label UI object rendered as an HTML label element.",

        _fields: {
            _text: "Visible label text.",
            for: "Optional id of associated input/control."
        },

        _core_rules: [
            "Use label for short text and form labels.",
            "Use for when connecting label to an input id.",
            "Use button or link for interactive actions."
        ],
        _canonical_examples: [
            {
                _type: "label",
                _text: "Username",
                class: "form-label"
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "_text", _label: "Text", _input: "textarea" },
                    { _key: "for", _label: "For", _input: "text" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Label",
                _category: "Basic",
                _icon: "tag",
                _default_object: {
                    _type: "label",
                    _text: "Label"
                }
            }
        }
    };
    constructor(data: XObjectData) {
        const defaults = {
            _type: XLabel._xtype,
            _html_tag: "label",
            class: "xlabel"
        }
        super(data, defaults, true);
        this.parse(data)
    }
}





export class XButton extends XUIObject {
    static _xtype = "button"
    static _skill: XpellSkill = {
        _id: "button",
        _title: "XButton",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],

        _description:
            "Clickable button UI object rendered as an HTML button element.",

        _fields: {
            _text: "Visible button text.",
            type: "Button type: button, submit, or reset.",
            disabled: "Disable the button.",
            _on: "Use _on.click for local nano-command actions.",
            _flow: "Use _flow for app/business actions.",
            _flow_event: "Event that triggers _flow. Usually click."
        },

        _core_rules: [
            "Use button for actions.",
            "Use link for navigation URLs.",
            "Use type:'submit' inside forms when submitting a form.",
            "Prefer _flow for business actions.",
            "Use _on.click for local UI actions."
        ],

        _canonical_examples: [
            {
                _type: "button",
                _text: "Login",
                type: "submit",
                _variant: "primary",
                _flow: {
                    _id: "login",
                    _payload: {
                        username: "$xdata.login.username",
                        password: "$xdata.login.password"
                    }
                }
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "_text", _label: "Text", _input: "textarea" },
                    { _key: "type", _label: "Type", _input: "text" },
                    { _key: "disabled", _label: "Disabled", _input: "checkbox" },
                    { _key: "_on", _label: "Events", _input: "json" },
                    { _key: "_flow", _label: "Flow", _input: "json" },
                    { _key: "_flow_event", _label: "Flow Event", _input: "text" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Button",
                _category: "Basic",
                _icon: "square-mouse-pointer",
                _default_object: {
                    _type: "button",
                    _text: "Button"
                }
            }
        }
    };

    static getArtifactStrategy() {
        return "merge" as const;
    }

    constructor(data: XObjectData) {
        const defs = {
            _type: XButton._xtype,
            class: "xbutton",
            _html_tag: "button"
        }
        super(data, defs, true);
        this.parse(data)
    }

}



export class XHTML extends XUIObject {
    static _xtype = "xhtml";

    static _skill: XpellSkill = {
        _id: "xhtml",
        _title: "XHTML",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],

        _description:
            "Generic raw HTML wrapper object for unsupported or custom HTML tags.",

        _fields: {
            _html_tag:
                "HTML tag name to render, e.g. div, span, article, section, nav.",

            _children:
                "Nested UI objects or XHTML content.",

            _text:
                "Optional text content."
        },

        _core_rules: [
            "Prefer semantic XUI objects when available.",
            "Use xhtml only when no dedicated XUI wrapper exists.",
            "Use _html_tag to select the rendered HTML tag.",
            "Do not use xhtml as the default container type."
        ],

        _canonical_examples: [
            {
                _type: "xhtml",
                _html_tag: "p",
                _text: "This is a paragraph of text wrapped in an XHTML object.",
                _children: []
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "_html_tag", _label: "HTML Tag", _input: "text" },
                    { _key: "_text", _label: "Text", _input: "textarea" }
                ]
            },
            _children: {
                _allowed: true,
                _insert_modes: ["inside", "before", "after"]
            },
            _palette: {
                _title: "HTML",
                _category: "Advanced",
                _icon: "code-xml",
                _default_object: {
                    _type: "xhtml",
                    _html_tag: "div",
                    _children: []
                }
            }
        }
    };


    constructor(data: XUIObjectData) {
        const t = (data?._type ?? "").toString();

        const defaults = {
            _type: XHTML._xtype,
            _html_tag: data["_html_tag"]
                ? data["_html_tag"]
                : (t && t !== XHTML._xtype ? t : "div"),
        };

        super(data, defaults, true);
        this.parse(data);
    }
}




export class XUIObjectPack extends XObjectPack {
    static getObjects() {
        return {
            [XView._xtype]: XView, // "view"
            "div": XView, //alias for XView
            "header": XHTML,
            "aside": XHTML,
            "main": XHTML,
            "section": XHTML,
            "article": XHTML,
            "nav": XHTML,
            "footer": XHTML,
            "span": XHTML,
            "p": XHTML,
            "a": XLink,
            "ul": XHTML,
            "ol": XHTML,
            "li": XHTML,
            "h1": XHTML, "h2": XHTML, "h3": XHTML, "h4": XHTML, "h5": XHTML, "h6": XHTML,
            [XStyleSheet._xtype]: XStyleSheet, //"style-sheet"
            [XLabel._xtype]: XLabel, //"label"
            [XLink._xtype]: XLink, //"link"
            [XButton._xtype]: XButton, //"button"
            [XTextField._xtype]: XTextField, //"text"
            [XPassword._xtype]: XPassword, //"password"
            [XInput._xtype]: XInput, //"input"
            [XTextArea._xtype]: XTextArea, //"textarea"
            [XSelect._xtype]: XSelect, //"select"
            [XVideo._xtype]: XVideo, //"video"
            [XImage._xtype]: XImage, //"image"
            [XForm._xtype]: XForm,   //"form"
            [XWebcam._xtype]: XWebcam,   //"webcam"
            [XHTML._xtype]: XHTML,   //"xhtml"
        }
    }
}


export class XUISVGObjectPack extends XObjectPack {
    static getObjects() {
        return {
            [XSVG._xtype]: XSVG,  //"svg"
            [XSVGCircle._xtype]: XSVGCircle, //"circle"
            [XSVGRect._xtype]: XSVGRect, //"rect"
            [XSVGEllipse._xtype]: XSVGEllipse, //"ellipse"
            [XSVGLine._xtype]: XSVGLine, //"line"
            [XSVGPolyline._xtype]: XSVGPolyline, //"polyline"
            [XSVGPolygon._xtype]: XSVGPolygon, //"polygon"
            [XSVGPath._xtype]: XSVGPath, //"path"

        }
    }
}
export default XUIObjectPack

