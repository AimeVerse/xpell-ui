import {
    XObject,
    type XObjectData,
    type XpellSkill,
    createNanoCommandWithSkill,
    _xlog
} from "@xpell/core";

import XUIObject from "../XUIObject";



export class XSVG extends XUIObject {

    static _xtype = "svg";
    static _skill: XpellSkill = {
        _id: "svg",
        _title: "XSVG",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],

        _description:
            "Inline SVG container for vector graphics, icons, diagrams, and animated visual elements.",

        _match: {
            _keywords: ["svg", "icon", "vector", "diagram", "path", "shape", "logo"],
            _priority: 40
        },

        _fields: {
            _url: "External SVG URL to fetch and inline.",
            src: "Alias for _url.",
            _svg_data: "Raw SVG markup string to inject.",
            viewBox: "SVG viewBox attribute.",
            width: "SVG width.",
            height: "SVG height.",
            fill: "SVG fill attribute.",
            stroke: "SVG stroke attribute.",
            xmlns: "SVG namespace."
        },

        _core_rules: [
            "Use svg for inline vector graphics, icons, and diagrams.",
            "Use image for normal raster/static images.",
            "Prefer XSVG shape objects for generated simple SVG graphics.",
            "Do not use svg as a generic layout container.",
            "Use _svg_data only with trusted SVG content."
        ],

        _canonical_examples: [
            {
                _type: "svg",
                viewBox: "0 0 24 24",
                width: 24,
                height: 24,
                _children: [
                    {
                        _type: "path",
                        d: "M12 2L2 22h20L12 2z"
                    }
                ]
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "_url", _label: "URL", _input: "text" },
                    { _key: "src", _label: "Source", _input: "text" },
                    { _key: "_svg_data", _label: "SVG Data", _input: "textarea" },
                    { _key: "viewBox", _label: "View Box", _input: "text" },
                    { _key: "width", _label: "Width", _input: "number" },
                    { _key: "height", _label: "Height", _input: "number" },
                    { _key: "fill", _label: "Fill", _input: "text" },
                    { _key: "stroke", _label: "Stroke", _input: "text" },
                    { _key: "xmlns", _label: "XMLNS", _input: "text" }
                ]
            },
            _children: {
                _allowed: true,
                _insert_modes: ["inside", "before", "after"]
            },
            _palette: {
                _title: "SVG",
                _category: "SVG",
                _icon: "shapes",
                _default_object: {
                    _type: "svg",
                    viewBox: "0 0 24 24",
                    width: 24,
                    height: 24,
                    _children: []
                }
            }
        }
    };

    private _svg_data!: string;
    _url: string | undefined;
    src: string | undefined // alias for _url to maintain compatibility with older code for HTML <img> tag

    constructor(data: XObjectData, defaults: XObjectData = {}, skipParse?: boolean) {
        const defaultsOut = {
            _type: XSVG._xtype,
            _html_tag: "svg",
            _svg_data: "",
            _html_ns: "http://www.w3.org/2000/svg",
            xmlns: "http://www.w3.org/2000/svg",
            ...defaults
        };
        super(data, defaultsOut, true);
        if (!skipParse) this.parse(data);
        // this.parse(data);
        if (this.src && !this._url) {
            this._url = this.src; // set _url from src
        }
        this.addNanoCommand(
            "load-svg-url",
            createNanoCommandWithSkill(
                async (cmd, obj?: XObject) => {
                    const url =
                        (cmd as any)._params?.url ??
                        (cmd as any)._params?.src;

                    if (url) {
                        await (obj as XSVG)?.getFromUrl(String(url));
                    }
                },
                {
                    _name: "load-svg-url",
                    _scope: "svg",
                    _description: "Load and inline SVG content from a trusted URL.",
                    _params: {
                        url: "SVG URL.",
                        src: "Alias for url."
                    }
                }
            )
        );

        this.addNanoCommand(
            "set-svg-data",
            createNanoCommandWithSkill(
                (cmd, obj?: XObject) => {
                    const data = (cmd as any)._params?.data;

                    if (data) {
                        (obj as XSVG)?.getFromData(String(data));
                    }
                },
                {
                    _name: "set-svg-data",
                    _scope: "svg",
                    _description: "Inject trusted SVG markup into the SVG object.",
                    _params: {
                        data: "Trusted SVG markup string."
                    }
                }
            )
        );

        this.addNanoCommand(
            "animate-svg",
            createNanoCommandWithSkill(
                async (cmd, obj?: XObject) => {
                    const className =
                        (cmd as any)._params?.className ??
                        (cmd as any)._params?.class ??
                        "fillPulse";

                    await (obj as XSVG)?.animate?.(String(className));
                },
                {
                    _name: "animate-svg",
                    _scope: "svg",
                    _description: "Apply an SVG animation CSS class.",
                    _params: {
                        className: "Animation class name.",
                        class: "Alias for className."
                    }
                }
            )
        );

        this.addNanoCommand(
            "stop-svg-animation",
            createNanoCommandWithSkill(
                (_cmd, obj?: XObject) => {
                    (obj as XSVG)?.stopAnimation?.();
                },
                {
                    _name: "stop-svg-animation",
                    _scope: "svg",
                    _description: "Stop SVG animation and restore the previous class."
                }
            )
        );

    }

    async onMount(): Promise<void> {
        await super.onMount();
        if (this._url) {
            await this.getFromUrl(this._url);
        } else if (this._svg_data) {
            this.getFromData(this._svg_data);
        }
    }


    async animate(className: string = "fillPulse") {

        //save the current class name
        if (this._dom_object) {
            this._prev_class_name = this._dom_object.className.baseVal; // save the previous class name
            // console.log("Previous class name:", this._prev_class_name);

            // remove the previous class name from the svg element
            this._dom_object.classList.remove(this._prev_class_name);
            void this.dom.offsetWidth;

            this._dom_object.classList.add(className);
        }
    }

    stopAnimation(): void {
        if (this._dom_object && this._prev_class_name) {
            // remove the current class name from the svg element
            this._dom_object.classList.remove(this._dom_object.className.baseVal);
            // restore the previous class name
            // console.log("Restoring previous class name:", this._prev_class_name);
            void this.dom.offsetWidth;

            this._dom_object.classList.add(this._prev_class_name);
            delete this._prev_class_name  // reset the previous class name
        }
    }

    private getDataFromSVGElement(svgData: string): any {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = svgData;
        // copy the viewBox and other attributes from the tempDiv to the _dom_object
        const tempSvg = tempDiv.querySelector("svg");
        if (tempSvg) {
            // Copy attributes from tempSvg to _dom_object
            const attributes = tempSvg.attributes;
            const ignoredAttributes = ["class"];
            for (let i = 0; i < attributes.length; i++) {
                const attr = attributes[i];
                if (ignoredAttributes.includes(attr.name)) continue; // skip ignored attributes
                this._dom_object.setAttribute(attr.name, attr.value);
            }
        }
        //get the svg path from the tempDiv and set it to the _dom_object
        const svgElement = tempDiv.querySelector("svg");
        if (svgElement) {
            this._dom_object.innerHTML = svgElement.innerHTML;
        }
    }

    /**
     * Load SVG content from external URL and inject into the DOM
     */
    async getFromUrl(url: string) {
        if (!this._dom_object) return;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const svgData = await response.text();
            this._svg_data = svgData;
            //load svg data into temp object
            this.getDataFromSVGElement(svgData);


            // this.parse(this); // re-parse if needed
        } catch (error) {
            _xlog.error("Error fetching SVG:", error);
        }
    }

    getFromData(data: string) {
        this._svg_data = data;
        if (this._dom_object) {
            //load svg data into temp object
            this.getDataFromSVGElement(data);


        }
    }

    getSVGData(): string {
        if (this._dom_object) {
            // return the innerHTML of the svg element
            return this._dom_object.outerHTML;
        }
        return "";
    }
}


export class XSVGShape extends XUIObject {

    static _xtype = "svg-shape";

    static _skill: XpellSkill = {
        _id: "svg-shape",
        _title: "XSVGShape",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["xuiobject"],
        _description:
            "Base SVG shape node used inside SVG containers.",

        _fields: {
            fill: "SVG fill color.",
            stroke: "SVG stroke color.",
            "stroke-width": "SVG stroke width.",
            opacity: "SVG opacity.",
            transform: "SVG transform string.",
            class: "Optional SVG CSS class."
        },

        _core_rules: [
            "SVG shapes should usually be children of svg.",
            "Use SVG shapes for vector graphics and diagrams.",
            "Do not use svg-shape directly; use circle, rect, path, line, etc."
        ],
        _canonical_examples: [
            {
                _type: "circle",
                cx: 100,
                cy: 60,
                r: 40,
                fill: "currentColor"
            }
        ]
    };

    constructor(data: XObjectData, defaults: XObjectData = {}, skipParse?: boolean) {

        const defaultsOut = {
            _type: XSVGShape._xtype,
            _html_ns: "http://www.w3.org/2000/svg",
            ...defaults
        };

        super(data, defaultsOut, true);
        if (!skipParse) this.parse(data);
    }
}

export class XSVGCircle extends XSVGShape {
    static _xtype = "circle"
    static _skill: XpellSkill = {
        _id: "circle",
        _title: "XSVGCircle",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["svg-shape"],

        _description:
            "SVG circle shape.",

        _fields: {
            cx: "Circle center X.",
            cy: "Circle center Y.",
            r: "Circle radius.",
            fill: "Fill color.",
            stroke: "Stroke color."
        },
        _canonical_examples: [
            {
                _type: "circle",
                cx: 100,
                cy: 60,
                r: 40,
                fill: "currentColor"
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "cx", _label: "Center X", _input: "number" },
                    { _key: "cy", _label: "Center Y", _input: "number" },
                    { _key: "r", _label: "Radius", _input: "number" },
                    { _key: "fill", _label: "Fill", _input: "text" },
                    { _key: "stroke", _label: "Stroke", _input: "text" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Circle",
                _category: "SVG",
                _icon: "circle",
                _default_object: {
                    _type: "circle",
                    cx: 12,
                    cy: 12,
                    r: 10,
                    fill: "currentColor"
                }
            }
        }
    }

    constructor(data: XObjectData) {
        const defaults = {
            _type: XSVGCircle._xtype,
            _html_tag: "circle",
            _html_ns: "http://www.w3.org/2000/svg",

        }
        super(data, defaults, true);
        this.parse(data);
    }
}



export class XSVGEllipse extends XSVGShape {
    static _xtype = "ellipse"

    static _skill: XpellSkill = {
        _id: "ellipse",
        _title: "XSVGEllipse",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["svg-shape"],

        _description:
            "SVG ellipse shape.",

        _fields: {
            cx: "Ellipse center X.",
            cy: "Ellipse center Y.",
            rx: "Horizontal radius.",
            ry: "Vertical radius.",
            fill: "Fill color.",
            stroke: "Stroke color."
        },

        _canonical_examples: [
            {
                _type: "ellipse",
                cx: 100,
                cy: 60,
                rx: 80,
                ry: 40,
                fill: "none",
                stroke: "currentColor"
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "cx", _label: "Center X", _input: "number" },
                    { _key: "cy", _label: "Center Y", _input: "number" },
                    { _key: "rx", _label: "Radius X", _input: "number" },
                    { _key: "ry", _label: "Radius Y", _input: "number" },
                    { _key: "fill", _label: "Fill", _input: "text" },
                    { _key: "stroke", _label: "Stroke", _input: "text" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Ellipse",
                _category: "SVG",
                _icon: "circle-dot",
                _default_object: {
                    _type: "ellipse",
                    cx: 12,
                    cy: 12,
                    rx: 10,
                    ry: 6,
                    fill: "none",
                    stroke: "currentColor"
                }
            }
        }
    };

    constructor(data: XObjectData) {
        const defaults = {
            _type: XSVGEllipse._xtype,
            _html_tag: "ellipse",
            _html_ns: "http://www.w3.org/2000/svg",

        }
        super(data, defaults, true);
        this.parse(data);
    }
}

export class XSVGRect extends XSVGShape {
    static _xtype = "rect"
    static _skill: XpellSkill = {
        _id: "rect",
        _title: "XSVGRect",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["svg-shape"],

        _description:
            "SVG rectangle shape.",

        _fields: {
            x: "Rectangle X position.",
            y: "Rectangle Y position.",
            width: "Rectangle width.",
            height: "Rectangle height.",
            rx: "Optional horizontal corner radius.",
            ry: "Optional vertical corner radius.",
            fill: "Fill color.",
            stroke: "Stroke color."
        },

        _canonical_examples: [
            {
                _type: "rect",
                x: 10,
                y: 10,
                width: 120,
                height: 60,
                rx: 8,
                fill: "currentColor"
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "x", _label: "X", _input: "number" },
                    { _key: "y", _label: "Y", _input: "number" },
                    { _key: "width", _label: "Width", _input: "number" },
                    { _key: "height", _label: "Height", _input: "number" },
                    { _key: "rx", _label: "Radius X", _input: "number" },
                    { _key: "ry", _label: "Radius Y", _input: "number" },
                    { _key: "fill", _label: "Fill", _input: "text" },
                    { _key: "stroke", _label: "Stroke", _input: "text" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Rectangle",
                _category: "SVG",
                _icon: "square",
                _default_object: {
                    _type: "rect",
                    x: 2,
                    y: 2,
                    width: 20,
                    height: 20,
                    fill: "currentColor"
                }
            }
        }
    };
    constructor(data: XObjectData) {
        const defaults = {
            _type: XSVGRect._xtype,
            _html_tag: "rect",
            _html_ns: "http://www.w3.org/2000/svg",

        }
        super(data, defaults, true);
        this.parse(data);
    }
}

export class XSVGLine extends XSVGShape {
    static _xtype = "line"
    static _skill: XpellSkill = {
        _id: "line",
        _title: "XSVGLine",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["svg-shape"],

        _description: "SVG line shape.",

        _fields: {
            x1: "Line start X.",
            y1: "Line start Y.",
            x2: "Line end X.",
            y2: "Line end Y.",
            stroke: "Line stroke color.",
            "stroke-width": "Line stroke width."
        },

        _canonical_examples: [
            {
                _type: "line",
                x1: 0,
                y1: 0,
                x2: 100,
                y2: 100,
                stroke: "currentColor",
                "stroke-width": 2
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "x1", _label: "X1", _input: "number" },
                    { _key: "y1", _label: "Y1", _input: "number" },
                    { _key: "x2", _label: "X2", _input: "number" },
                    { _key: "y2", _label: "Y2", _input: "number" },
                    { _key: "stroke", _label: "Stroke", _input: "text" },
                    { _key: "stroke-width", _label: "Stroke Width", _input: "number" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Line",
                _category: "SVG",
                _icon: "slash",
                _default_object: {
                    _type: "line",
                    x1: 0,
                    y1: 0,
                    x2: 24,
                    y2: 24,
                    stroke: "currentColor"
                }
            }
        }
    };
    constructor(data: XObjectData) {
        const defaults = {
            _type: XSVGLine._xtype,
            _html_tag: "line",
            _html_ns: "http://www.w3.org/2000/svg",
        }
        super(data, defaults, true);
        this.parse(data);
    }
}

export class XSVGPolyline extends XSVGShape {
    static _xtype = "polyline"
    static _skill: XpellSkill = {
        _id: "polyline",
        _title: "XSVGPolyline",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["svg-shape"],

        _description: "SVG polyline shape.",

        _fields: {
            points: "List of points for the polyline.",
            fill: "Fill color.",
            stroke: "Stroke color."
        },

        _canonical_examples: [
            {
                _type: "polyline",
                points: "10,10 50,50 90,10",
                fill: "none",
                stroke: "currentColor"
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "points", _label: "Points", _input: "textarea" },
                    { _key: "fill", _label: "Fill", _input: "text" },
                    { _key: "stroke", _label: "Stroke", _input: "text" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Polyline",
                _category: "SVG",
                _icon: "chart-no-axes-column-increasing",
                _default_object: {
                    _type: "polyline",
                    points: "2,12 8,6 14,12 22,4",
                    fill: "none",
                    stroke: "currentColor"
                }
            }
        }
    };

    constructor(data: XObjectData) {
        const defaults = {
            _type: XSVGPolyline._xtype,
            _html_tag: "polyline",
            _html_ns: "http://www.w3.org/2000/svg",

        }
        super(data, defaults, true);
        this.parse(data);
    }
}

export class XSVGPolygon extends XSVGShape {
    static _xtype = "polygon"
    static _skill: XpellSkill = {
        _id: "polygon",
        _title: "XSVGPolygon",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["svg-shape"],

        _description: "SVG polygon shape.",

        _fields: {
            points: "List of points for the polygon.",
            fill: "Fill color.",
            stroke: "Stroke color."
        },

        _canonical_examples: [
            {
                _type: "polygon",
                points: "10,10 50,50 90,10",
                fill: "none",
                stroke: "currentColor"
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "points", _label: "Points", _input: "textarea" },
                    { _key: "fill", _label: "Fill", _input: "text" },
                    { _key: "stroke", _label: "Stroke", _input: "text" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Polygon",
                _category: "SVG",
                _icon: "pentagon",
                _default_object: {
                    _type: "polygon",
                    points: "12,2 22,22 2,22",
                    fill: "currentColor"
                }
            }
        }
    };

    constructor(data: XObjectData) {
        const defaults = {
            _type: XSVGPolygon._xtype,
            _html_tag: "polygon",
            _html_ns: "http://www.w3.org/2000/svg",

        }
        super(data, defaults, true);
        this.parse(data);
    }
}

export class XSVGPath extends XSVGShape {
    static _xtype = "path"
    static _skill: XpellSkill = {
        _id: "path",
        _title: "XSVGPath",
        _version: "1.0.0",
        _active: true,
        _type: "view-skill",
        _requires: ["svg-shape"],

        _description: "SVG path shape.",

        _fields: {
            d: "Path data.",
            fill: "Fill color.",
            stroke: "Stroke color."
        },

        _canonical_examples: [
            {
                _type: "path",
                d: "M10,10 L90,90",
                fill: "none",
                stroke: "currentColor"
            }
        ],

        _design: {
            _inspector: {
                _fields: [
                    { _key: "d", _label: "Path Data", _input: "textarea" },
                    { _key: "fill", _label: "Fill", _input: "text" },
                    { _key: "stroke", _label: "Stroke", _input: "text" }
                ]
            },
            _children: {
                _allowed: false,
                _insert_modes: ["before", "after"]
            },
            _palette: {
                _title: "Path",
                _category: "SVG",
                _icon: "pen-line",
                _default_object: {
                    _type: "path",
                    d: "M4,20 L20,4",
                    fill: "none",
                    stroke: "currentColor"
                }
            }
        }
    };

    constructor(data: XObjectData) {
        const defaults = {
            _type: XSVGPath._xtype,
            _html_tag: "path",
            _html_ns: "http://www.w3.org/2000/svg",

        }
        super(data, defaults, true);
        this.parse(data);
    }
}
