/*
XDBClientModule.ts
runtime bridge for _x.execute()

THIS MODULE DOES NOT:
- sync
- remote fetch
- websocket
- wormholes

ONLY:
- exposes XDBClient through runtime commands
*/

import {
    XModule,
    XResponseOK,
    XResponseError,
    type XCommand
} from "@xpell/core";

import type {
    XpellSkill,
    XpellSkillCommand
} from "@xpell/core";

import XDB from "./XDBClient.js";
import { _xlog } from "@xpell/core";

export class XDBClientModule extends XModule {

    static _name = "xdb-client";
    static _skill: XpellSkill = {
        _id: "xdb-client",
        _title: "XDB Client Module",
        _version: "1.0.0",
        _active: true,
        _type: "client-module-api",
        _requires: ["xmodule"],

        _description:
            "Client-side key-value persistence bridge for XDBClient/local storage style operations.",

        _core_rules: [
            "Use xdb-client for client-side persistence.",
            "Use XData/xd for reactive runtime state.",
            "Do not use xdb-client for server entity operations.",
            "Use string ops for simple values and object ops for JSON data."
        ]
    };

    static _ops: Record<string, XpellSkillCommand> = {
        info: {
            _name: "info",
            _scope: "module",
            _description: "Return XDB client module info."
        },
        has: {
            _name: "has",
            _scope: "module",
            _description: "Check whether a key exists.",
            _params: {
                key: "Storage key.",
                _key: "Storage key alias."
            }
        },
        "get-string": {
            _name: "get-string",
            _scope: "module",
            _description: "Get a stored string value.",
            _params: {
                key: "Storage key.",
                _key: "Storage key alias.",
                default: "Optional fallback when stored value is null.",
                _default: "Optional fallback alias."
            }
        },
        "save-string": {
            _name: "save-string",
            _scope: "module",
            _description: "Save a string value.",
            _params: {
                key: "Storage key.",
                _key: "Storage key alias.",
                value: "String value.",
                _value: "String value alias.",
                _debug: "Optional debug flag."
            }
        },
        "get-object": {
            _name: "get-object",
            _scope: "module",
            _description: "Get a stored JSON object.",
            _params: {
                key: "Storage key.",
                _key: "Storage key alias."
            }
        },
        "save-object": {
            _name: "save-object",
            _scope: "module",
            _description: "Save a JSON object.",
            _params: {
                key: "Storage key.",
                _key: "Storage key alias.",
                value: "Object value.",
                _value: "Object value alias."
            }
        },
        remove: {
            _name: "remove",
            _scope: "module",
            _description: "Remove a stored key.",
            _params: {
                key: "Storage key.",
                _key: "Storage key alias."
            }
        },
        clear: {
            _name: "clear",
            _scope: "module",
            _description: "Clear all client XDB storage."
        },
        keys: {
            _name: "keys",
            _scope: "module",
            _description: "Return all stored keys."
        }
    };

    constructor() {

        super({
            _name:
                XDBClientModule._name
        });
    }

    /*
    PARAMS
    */

    private _read_key(
        xcmd: XCommand
    ) {

        const params: any =
            xcmd?._params ?? {};

        return params.key ?? params._key;
    }

    private _read_value(
        xcmd: XCommand
    ) {

        const params: any =
            xcmd?._params ?? {};

        return params.value ?? params._value;
    }

    private _read_default(
        xcmd: XCommand
    ) {

        const params: any =
            xcmd?._params ?? {};

        return params._default ?? params.default;
    }

    /*
    INFO
    */

    async _info() {

        try {

            return new XResponseOK({
                version: "1.0.0"
            }).toXData();

        } catch (err) {

            return new XResponseError(err)
                .toXData();
        }
    }

    /*
    HAS
    */

    async _has(
        xcmd: XCommand
    ) {

        try {

            const key: any =
                this._read_key(xcmd);

            return new XResponseOK({
                exists:
                    XDB.has(key)
            }).toXData();

        } catch (err) {

            return new XResponseError(err)
                .toXData();
        }
    }

    /*
    GET STRING
    */

    async _get_string(
        xcmd: XCommand
    ) {

        try {

            const key: any =
                this._read_key(xcmd);

            const value =
                XDB.getString(key);

            return new XResponseOK({
                value:
                    value === null
                        ? this._read_default(xcmd) ?? null
                        : value
            }).toXData();

        } catch (err) {

            return new XResponseError(err)
                .toXData();
        }
    }

    /*
    SAVE STRING
    */

    async _save_string(
        xcmd: XCommand
    ) {

        try {

            const key: any =
                this._read_key(xcmd);

            const value: any =
                this._read_value(xcmd);

            const _debug = !!xcmd?._params?._debug;
            if (_debug) {
                _xlog.debug("[XDBClientModule] _save_string", { key, value });
            }

            XDB.saveString(
                key,
                value
            );

            return new XResponseOK({
                saved: true
            }).toXData();

        } catch (err) {

            return new XResponseError(err)
                .toXData();
        }
    }

    /*
    GET OBJECT
    */

    async _get_object(
        xcmd: XCommand
    ) {

        try {

            const key: any =
                this._read_key(xcmd);

            return new XResponseOK({
                value:
                    XDB.getObject(key)
            }).toXData();

        } catch (err) {

            return new XResponseError(err)
                .toXData();
        }
    }

    /*
    SAVE OBJECT
    */

    async _save_object(
        xcmd: XCommand
    ) {

        try {

            const key: any =
                this._read_key(xcmd);

            const value: any =
                this._read_value(xcmd);

            XDB.saveObject(
                key,
                value
            );

            return new XResponseOK({
                saved: true
            }).toXData();

        } catch (err) {

            return new XResponseError(err)
                .toXData();
        }
    }

    /*
    REMOVE
    */

    async _remove(
        xcmd: XCommand
    ) {

        try {

            const key: any =
                this._read_key(xcmd);

            XDB.remove(key);

            return new XResponseOK({
                removed: true
            }).toXData();

        } catch (err) {

            return new XResponseError(err)
                .toXData();
        }
    }

    /*
    CLEAR
    */

    async _clear() {

        try {

            XDB.clear();

            return new XResponseOK({
                cleared: true
            }).toXData();

        } catch (err) {

            return new XResponseError(err)
                .toXData();
        }
    }

    /*
    KEYS
    */

    async _keys() {

        try {

            return new XResponseOK({
                keys:
                    XDB.keys()
            }).toXData();

        } catch (err) {

            return new XResponseError(err)
                .toXData();
        }
    }
}

export default XDBClientModule;
