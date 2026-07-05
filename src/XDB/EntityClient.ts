import {
    XModule,
    type XCommand,
    XResponseError,
    XResponseOK,
    _xd,
    _xlog,
    type XpellSkill,
    type XpellSkillCommand
} from "@xpell/core";


import XDBSyncManager from "./XDBSyncManager.js";

export class EntityClient extends XModule {

    static _name = "entity-client";
    static _skill: XpellSkill = {
        _id: "entity-client",
        _title: "Entity Client Runtime",
        _version: "1.0.0",
        _active: true,
        _type: "client-module-api",
        _requires: ["xmodule", "xdata"],

        _description:
            "Client-side runtime entity manager for synced CRUD operations and local entity cache access.",

        _core_rules: [
            "Use entity-client for runtime CRUD operations.",
            "Entity records are synced through XDBSyncManager.",
            "Entity subscriptions are created automatically on first usage.",
            "Use _entity to select the target entity.",
            "Use _filter for querying and updates."
        ],

        _fields: {
            _entity: "Entity name.",
            _filter: "Entity query filter.",
            _updates: "Update payload object.",
            data: "Record data for add operation.",
            _output: "Optional XData key to write successful operation output into.",
            _env: "Optional environment.",
            _app_id: "Optional application id."
        }
    };

    static _ops: Record<string, XpellSkillCommand> = {
        add: {
            _name: "add",
            _scope: "module",
            _description:
                "Add a new entity record.",
            _params: {
                _entity: "Entity name.",
                data: "Record data object.",
                _output: "Optional XData key to write successful operation output into.",
                _env: "Optional environment.",
                _app_id: "Optional application id."
            },
            _example: {
                _module: "entity-client",
                _op: "add",
                _params: {
                    _entity: "users",
                    data: {
                        username: "john"
                    }
                }
            }
        },

        find: {
            _name: "find",
            _scope: "module",
            _description:
                "Find entity records using a filter.",
            _params: {
                _entity: "Entity name.",
                _filter: "Query filter object.",
                _output: "Optional XData key to write successful operation output into.",
                _env: "Optional environment.",
                _app_id: "Optional application id."
            }
        },

        update: {
            _name: "update",
            _scope: "module",
            _description:
                "Update entity records using filter + update payload.",
            _params: {
                _entity: "Entity name.",
                _filter: "Query filter object.",
                _updates: "Update payload object.",
                _output: "Optional XData key to write successful operation output into.",
                _env: "Optional environment.",
                _app_id: "Optional application id."
            }
        },

        delete: {
            _name: "delete",
            _scope: "module",
            _description:
                "Delete entity records using a filter.",
            _params: {
                _entity: "Entity name.",
                _filter: "Query filter object.",
                _output: "Optional XData key to write successful operation output into.",
                _env: "Optional environment.",
                _app_id: "Optional application id."
            }
        },

        "sync-entity": {
            _name: "sync-entity",
            _scope: "module",
            _description:
                "Synchronize entity records from the server into the local runtime cache.",
            _params: {
                _entity: "Entity name.",
                _output: "Optional XData key to write successful operation output into.",
                _env: "Optional environment.",
                _app_id: "Optional application id."
            }
        },

        "get-local": {
            _name: "get-local",
            _scope: "module",
            _description:
                "Return locally cached entity records.",
            _params: {
                _entity: "Entity name.",
                _output: "Optional XData key to write successful operation output into."
            }
        }
    };

    private _sync = new XDBSyncManager();

    private _started = false;

    constructor() {
        super({ _name: EntityClient._name });
    }

    /* -------------------------------------------------- */
    /* HELPERS                                            */
    /* -------------------------------------------------- */

    private getCurrentAppId() {
        return (
            _xd.get("xvm:current_app_id")
            ?? "default"
        );
    }

    private getEnv(
        params: any
    ) {

        return (
            params?._env
            ?? "default"
        );
    }

    private getAppId(
        params: any
    ) {

        return (
            params?._app_id
            ?? this.getCurrentAppId()
        );
    }

    private ensureEntitySubscription(
        entity: string,
        params: any
    ) {

        try {

            this._sync.subscribe({

                _entity:
                    entity,

                _app_id:
                    this.getAppId(params),

                _env:
                    this.getEnv(params)

            });

        } catch { }
    }

    private getEntity(
        params: any
    ) {

        const entity =
            params?._entity;

        if (!entity) {
            throw new Error(
                "missing _entity"
            );
        }

        return entity;
    }

    private getOutputKey(
        params: any
    ) {

        const output =
            params?._output;

        return typeof output === "string" && output.trim()
            ? output.trim()
            : undefined;
    }

    private getOutputResult(
        res: any
    ) {

        const result =
            res?._result ?? res;

        if (
            result &&
            typeof result === "object"
        ) {

            if (result._records !== undefined) {
                return result._records;
            }

            if (result._record !== undefined) {
                return result._record;
            }
        }

        return result;
    }

    private getCount(
        value: any
    ) {

        if (Array.isArray(value)) {
            return value.length;
        }

        if (
            value &&
            typeof value === "object"
        ) {
            return Object.keys(value).length;
        }

        return undefined;
    }

    private getFindRowsCandidate(
        value: any
    ) {

        if (Array.isArray(value)) {
            return value;
        }

        if (
            value &&
            typeof value === "object"
        ) {

            if (Array.isArray(value._data)) {
                return value._data;
            }

            if (Array.isArray(value.data)) {
                return value.data;
            }
        }

        return undefined;
    }

    private normalizeFindRows(
        res: any
    ) {

        const result =
            res?._result;

        const candidates = [
            res?._data,
            res?._records,
            res?.records,
            result?._data,
            result?._records,
            result?.records,
            result
        ];

        for (const candidate of candidates) {
            const rows =
                this.getFindRowsCandidate(candidate);

            if (rows) {
                return rows;
            }
        }

        return [];
    }

    private hasFindRowsShape(
        res: any
    ) {

        const result =
            res?._result;

        return [res, result].some(value => (
            value &&
            typeof value === "object" &&
            (
                Object.prototype.hasOwnProperty.call(value, "_data") ||
                Object.prototype.hasOwnProperty.call(value, "_records") ||
                Object.prototype.hasOwnProperty.call(value, "records")
            )
        ));
    }

    private isSuccessfulFindResponse(
        res: any
    ) {

        if (res?._ok === false) {
            return false;
        }

        return res?._ok === true || this.hasFindRowsShape(res);
    }

    private writeFindOutput(
        params: any,
        res: any,
        diagnostics?: boolean
    ) {

        const output =
            this.getOutputKey(params);

        const success =
            this.isSuccessfulFindResponse(res);

        if (!output || !success) {
            if (
                diagnostics &&
                !output &&
                success
            ) {
                _xlog.log("[xentity] output skipped", {
                    _reason:
                        "no_output"
                });
            }

            return;
        }

        const rows =
            this.normalizeFindRows(res);

        _xd.set(
            output,
            rows,
            {
                source:
                    "entity-client"
            }
        );

        if (diagnostics) {
            _xlog.log("[xentity] output written", {
                _path:
                    output,
                _count:
                    rows.length
            });
        }
    }

    private writeOutput(
        params: any,
        res: any,
        diagnostics?: boolean
    ) {

        const output =
            this.getOutputKey(params);

        if (!output || res?._ok !== true) {
            if (
                diagnostics &&
                !output &&
                res?._ok === true
            ) {
                _xlog.log("[xentity] output skipped", {
                    _reason:
                        "no_output"
                });
            }

            return;
        }

        const result =
            this.getOutputResult(res);

        const value =
            result &&
                typeof result === "object" &&
                Object.prototype.hasOwnProperty.call(result, "_data")
                ? result._data
                : result;

        _xd.set(
            output,
            value,
            {
                source:
                    "entity-client"
            }
        );

        if (diagnostics) {
            _xlog.log("[xentity] output written", {
                _path:
                    output,
                _count:
                    this.getCount(value)
            });
        }
    }

    /* -------------------------------------------------- */
    /* START                                              */
    /* -------------------------------------------------- */

    async start() {

        if (this._started) {
            return;
        }

        this._started = true;
        this._sync.start();
    }

    /* -------------------------------------------------- */
    /* CRUD                                               */
    /* -------------------------------------------------- */

    async _add(
        xcmd: XCommand
    ) {

        try {

            const params =
                xcmd?._params ?? {};

            const entity =
                this.getEntity(params);

            this.ensureEntitySubscription(
                entity,
                params
            );

            const res =
                await this._sync.add(
                    entity,
                    params.data ?? {}
                );

            this.writeOutput(
                params,
                res
            );

            return res;

        } catch (err) {

            return new XResponseError(
                err
            ).toXData();
        }
    }

    async _find(
        xcmd: XCommand
    ) {

        try {

            const params =
                xcmd?._params ?? {};

            const entity =
                this.getEntity(params);

            this.ensureEntitySubscription(
                entity,
                params
            );

            const filter =
                params._filter ?? params.filter ?? {};

            const output =
                this.getOutputKey(params);

            _xlog.log("[xentity] find request", {
                _entity:
                    entity,
                _filter:
                    filter,
                _output:
                    output
            });

            const res =
                await this._sync.find(
                    entity,
                    filter
                );

            if (this.isSuccessfulFindResponse(res)) {
                const rows =
                    this.normalizeFindRows(res);

                _xlog.log("[xentity] find response", {
                    _entity:
                        entity,
                    _count:
                        rows.length,
                    _has_output:
                        !!output,
                    _output:
                        output
                });
            } else {
                _xlog.error("[xentity] find failed", {
                    _entity:
                        entity,
                    _error:
                        res?._error ?? res?._result ?? res
                });
            }

            this.writeFindOutput(
                params,
                res,
                true
            );

            return res;

        } catch (err) {

            _xlog.error("[xentity] find failed", {
                _entity:
                    xcmd?._params?._entity,
                _error:
                    err
            });

            return new XResponseError(
                err
            ).toXData();
        }
    }

    async _update(
        xcmd: XCommand
    ) {

        try {

            const params =
                xcmd?._params ?? {};

            const entity =
                this.getEntity(params);

            this.ensureEntitySubscription(
                entity,
                params
            );

            const res =
                await this._sync.update(
                    entity,
                    params._filter ?? params.filter ?? {},
                    params._updates ?? params.updates ?? {}
                );

            this.writeOutput(
                params,
                res
            );

            return res;

        } catch (err) {

            return new XResponseError(
                err
            ).toXData();
        }
    }

    async _delete(
        xcmd: XCommand
    ) {

        try {

            const params =
                xcmd?._params ?? {};

            const entity =
                this.getEntity(params);

            this.ensureEntitySubscription(
                entity,
                params
            );

            const res =
                await this._sync.delete(
                    entity,
                    params._filter ?? params.filter ?? {}
                );

            this.writeOutput(
                params,
                res
            );

            return res;

        } catch (err) {

            return new XResponseError(
                err
            ).toXData();
        }
    }

    async _sync_entity(
        xcmd: XCommand
    ) {

        try {

            const params =
                xcmd?._params ?? {};

            const entity =
                this.getEntity(params);

            this.ensureEntitySubscription(
                entity,
                params
            );

            const records =
                await this._sync.syncEntity(
                    entity
                );

            const res = new XResponseOK({
                _records:
                    records
            }).toXData();

            this.writeOutput(
                params,
                res
            );

            return res;

        } catch (err) {

            return new XResponseError(
                err
            ).toXData();
        }
    }

    async _get_local(
        xcmd: XCommand
    ) {

        try {

            const params =
                xcmd?._params ?? {};

            const entity =
                this.getEntity(params);

            this.ensureEntitySubscription(
                entity,
                params
            );

            const res = new XResponseOK({

                _records:
                    this._sync.getLocalRecords(
                        entity
                    )

            }).toXData();

            this.writeOutput(
                params,
                res
            );

            return res;

        } catch (err) {

            return new XResponseError(
                err
            ).toXData();
        }
    }
}

export default EntityClient;
