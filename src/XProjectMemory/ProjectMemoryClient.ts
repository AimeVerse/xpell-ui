import {
    XModule,
    type XCommand,
    _xd,
    _xlog,
    _xu
} from "@xpell/core";

import type {
    XpellSkill,
    XpellSkillCommand
} from "@xpell/core";

import { _xem } from "../XEM/XEventManager";
import Wormholes from "../Wormholes/Wormholes";

const PROJECT_MEMORY_MODULE = "project-memory-client";
const PROJECT_MEMORY_RESULT_KEY = "project.memory";
const XVM_APP_ID_KEY = "xvm:current_app_id";
const XVM_ENV_KEY = "xvm:current_env";

type ProjectMemoryScope = {
    _app_id: string;
    _env?: string;
};

type ProjectMemoryAction = "get" | "patch" | "save";

const xdata_source = {
    source: PROJECT_MEMORY_MODULE
};

const safe_error = (
    err: unknown
) => {
    if (err instanceof Error) {
        return {
            _message: err.message
        };
    }

    return {
        _message: String(err)
    };
};

const is_error_result = (
    value: any
) =>
    _xu.is_plain_object(value) &&
    value._ok === false;

const unwrap_result = (
    raw: any
) => {
    if (
        _xu.is_plain_object(raw?._payload) &&
        "_result" in raw._payload
    ) {
        return raw._payload._result;
    }

    if (
        _xu.is_plain_object(raw) &&
        "_result" in raw
    ) {
        return raw._result;
    }

    return raw;
};

const unwrap_memory = (
    raw: any
) => {
    const result = unwrap_result(raw);

    if (
        _xu.is_plain_object(result?._memory)
    ) {
        return result._memory;
    }

    return result;
};

export class ProjectMemoryClient extends XModule {
    static _name = PROJECT_MEMORY_MODULE;
    static _instance: ProjectMemoryClient | null = null;

    static _skill: XpellSkill = {
        _id: PROJECT_MEMORY_MODULE,
        _title: "Project Memory Client",
        _version: "1.0.0",
        _active: true,
        _type: "client-module-api",
        _requires: ["xmodule", "xdata", "xem", "wormholes", "server-xvm"],

        _description:
            "Client-side Project Memory bridge. Loads, patches, and saves server-owned project memory through server-xvm and mirrors the returned memory into XData.",

        _core_rules: [
            "Use project-memory-client for client Project Memory access.",
            "Project Memory persistence is owned by server-xvm.",
            "Store only server-returned Project Memory in XData.",
            "Do not write Project Memory files or treat client XData as the source of truth."
        ],

        _fields: {
            "project.memory": "Default XData key for the latest server-returned Project Memory.",
            "_app_id": "Target XVM app id. Defaults from current XVM/XData state.",
            "_env": "Target XVM environment. Defaults from current XVM/XData state.",
            "_result_key": "XData key where the server-returned Project Memory is stored."
        }
    };

    static _ops: Record<string, XpellSkillCommand> = {
        get: {
            _name: "get",
            _scope: "module",
            _description:
                "Load Project Memory from server-xvm and store it in XData.",
            _params: {
                _app_id: "Optional app id. Defaults from current XVM/XData state.",
                _env: "Optional env. Defaults from current XVM/XData state.",
                _result_key: "Optional XData result key. Defaults to project.memory."
            },
            _example: {
                _module: PROJECT_MEMORY_MODULE,
                _op: "get",
                _params: {
                    _result_key: PROJECT_MEMORY_RESULT_KEY
                }
            }
        },

        patch: {
            _name: "patch",
            _scope: "module",
            _description:
                "Patch Project Memory through server-xvm and store the updated memory in XData.",
            _params: {
                _app_id: "Optional app id. Defaults from current XVM/XData state.",
                _env: "Optional env. Defaults from current XVM/XData state.",
                _patch: "Plain object patch to apply.",
                _result_key: "Optional XData result key. Defaults to project.memory."
            },
            _example: {
                _module: PROJECT_MEMORY_MODULE,
                _op: "patch",
                _params: {
                    _patch: {
                        _notes: []
                    },
                    _result_key: PROJECT_MEMORY_RESULT_KEY
                }
            }
        },

        save: {
            _name: "save",
            _scope: "module",
            _description:
                "Save Project Memory through server-xvm and store the updated memory in XData.",
            _params: {
                _app_id: "Optional app id. Defaults from current XVM/XData state.",
                _env: "Optional env. Defaults from current XVM/XData state.",
                _memory: "Full Project Memory object to save.",
                _result_key: "Optional XData result key. Defaults to project.memory."
            },
            _example: {
                _module: PROJECT_MEMORY_MODULE,
                _op: "save",
                _params: {
                    _memory: {},
                    _result_key: PROJECT_MEMORY_RESULT_KEY
                }
            }
        }
    };

    constructor() {
        super({
            _name: ProjectMemoryClient._name
        });

        if (ProjectMemoryClient._instance) {
            return ProjectMemoryClient._instance;
        }

        ProjectMemoryClient._instance = this;
    }

    private current_client() {
        return typeof window !== "undefined"
            ? (window as any).__xvm_client
            : undefined;
    }

    private resolve_scope(
        params: Record<string, any>
    ): ProjectMemoryScope {
        const client = this.current_client();

        const app_id =
            _xu.read_optional_string(params._app_id, "_app_id") ||
            _xu.read_optional_string(_xd.get(XVM_APP_ID_KEY), XVM_APP_ID_KEY) ||
            _xu.read_optional_string(client?._app_id, "__xvm_client._app_id");

        if (!app_id) {
            throw new Error(
                "project-memory-client: missing _app_id (no params, XData, or current XVM client)"
            );
        }

        const env =
            _xu.read_optional_string(params._env, "_env") ||
            _xu.read_optional_string(_xd.get(XVM_ENV_KEY), XVM_ENV_KEY) ||
            _xu.read_optional_string(client?._env, "__xvm_client._env") ||
            "default";

        return {
            _app_id: app_id,
            _env: env
        };
    }

    private result_key(
        params: Record<string, any>
    ) {
        return (
            _xu.read_optional_string(params._result_key, "_result_key") ||
            PROJECT_MEMORY_RESULT_KEY
        );
    }

    private async send_project_memory_command(
        action: ProjectMemoryAction,
        server_op: string,
        params: Record<string, any>,
        payload: Record<string, any> = {}
    ) {
        const scope = this.resolve_scope(params);
        const result_key = this.result_key(params);

        try {
            const raw = await Wormholes.sendXcmd({
                _module: "server-xvm",
                _op: server_op,
                _params: {
                    ...scope,
                    ...payload
                }
            });

            if (
                is_error_result(raw) ||
                is_error_result(raw?._payload)
            ) {
                const error = is_error_result(raw?._payload)
                    ? raw._payload
                    : raw;

                _xem.fire("project-memory:error", {
                    ...scope,
                    _op: action,
                    _result_key: result_key,
                    _error: error
                });

                return error;
            }

            const result = unwrap_memory(raw);

            _xd.set(
                result_key,
                result,
                xdata_source
            );

            _xem.fire(
                action === "get"
                    ? "project-memory:loaded"
                    : "project-memory:saved",
                {
                    ...scope,
                    _op: action,
                    _result_key: result_key,
                    _memory: result
                }
            );

            return result;
        } catch (err) {
            const error = {
                _ok: false,
                _error: safe_error(err)
            };

            _xlog.error(
                "[project-memory-client] command failed",
                {
                    ...scope,
                    _op: action,
                    _error: error._error
                }
            );

            _xem.fire("project-memory:error", {
                ...scope,
                _op: action,
                _result_key: result_key,
                _error: error
            });

            return error;
        }
    }

    private emit_project_memory_error(
        action: ProjectMemoryAction,
        params: Record<string, any>,
        err: unknown
    ) {
        const client = this.current_client();
        const error = {
            _ok: false,
            _error: safe_error(err)
        };

        const scope = {
            _app_id:
                typeof params._app_id === "string"
                    ? params._app_id
                    : typeof _xd.get(XVM_APP_ID_KEY) === "string"
                        ? _xd.get(XVM_APP_ID_KEY)
                        : typeof client?._app_id === "string"
                            ? client._app_id
                            : undefined,
            _env:
                typeof params._env === "string"
                    ? params._env
                    : typeof _xd.get(XVM_ENV_KEY) === "string"
                        ? _xd.get(XVM_ENV_KEY)
                        : typeof client?._env === "string"
                            ? client._env
                            : "default"
        };

        let result_key = PROJECT_MEMORY_RESULT_KEY;
        try {
            result_key = this.result_key(params);
        } catch {
            result_key = PROJECT_MEMORY_RESULT_KEY;
        }

        _xlog.error(
            "[project-memory-client] command failed",
            {
                ...scope,
                _op: action,
                _error: error._error
            }
        );

        _xem.fire("project-memory:error", {
            ...scope,
            _op: action,
            _result_key: result_key,
            _error: error
        });

        return error;
    }

    async _get(
        xcmd: XCommand
    ) {
        const params =
            _xu.ensure_params(
                xcmd?._params
            );

        try {
            return await this.send_project_memory_command(
                "get",
                "get-project-memory",
                params
            );
        } catch (err) {
            return this.emit_project_memory_error(
                "get",
                params,
                err
            );
        }
    }

    async _patch(
        xcmd: XCommand
    ) {
        const params =
            _xu.ensure_params(
                xcmd?._params
            );

        try {
            const patch =
                _xu.ensure_object(
                    params._patch,
                    "_patch"
                );

            return await this.send_project_memory_command(
                "patch",
                "patch-project-memory",
                params,
                {
                    _patch: patch
                }
            );
        } catch (err) {
            return this.emit_project_memory_error(
                "patch",
                params,
                err
            );
        }
    }

    async _save(
        xcmd: XCommand
    ) {
        const params =
            _xu.ensure_params(
                xcmd?._params
            );

        try {
            const memory =
                _xu.ensure_object(
                    params._memory,
                    "_memory"
                );

            return await this.send_project_memory_command(
                "save",
                "save-project-memory",
                params,
                {
                    _memory: memory
                }
            );
        } catch (err) {
            return this.emit_project_memory_error(
                "save",
                params,
                err
            );
        }
    }
}

export const ProjectMemory = new ProjectMemoryClient();
export const _project_memory = ProjectMemory;
export default ProjectMemory;
