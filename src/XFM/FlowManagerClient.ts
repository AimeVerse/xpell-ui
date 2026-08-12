import { XModule, type XCommand, _x, _xu, _xlog, _xd } from "@xpell/core";
import { _xem } from "../XEM/XEventManager";
import { XUI } from "../XUI/XUI";
import { XUIRuntime } from "../XUI/XUIRuntime";
import type {
    XpellSkill,
    XpellSkillCommand
} from "@xpell/core";

/* -------------------------------------------------------------------------- */

const is_debug = () =>
    true//typeof window !== "undefined" && (window as any)?.__xpell_debug === true;

const log_debug = (message: string, payload?: any) => {
    if (is_debug()) {
        _xlog.log(message, payload);
    }
};

type XFlowBinding = {
    _flow_id: string;
    _event: string;
    _app_id: string;
    _env?: string;
};

type XFlowTriggerPayload = {
    _flow_id: string;
    _event_name?: string;
    _event_payload?: object;
    _object_id?: string;
    _success_view?: string;
    _app_id?: string;
    _env?: string;
    _source?: "ui" | "event";
};

type XFlowUiState = {
    _key: string;
    _ignored?: boolean;
    _object?: any;
    _success_view?: string;
};

/* -------------------------------------------------------------------------- */

type XFlowCommandContext = {
    flow?: any;
    event?: any;
};

const read_path = (obj: any, path: string) => {
    return path
        .split(".")
        .filter(Boolean)
        .reduce((acc, key) => acc?.[key], obj);
};

const resolve_flow_value = (
    value: any,
    ctx: XFlowCommandContext
): any => {
    if (typeof value === "string") {
        if (value.startsWith("$flow.")) {
            return read_path(ctx.flow, value.slice("$flow.".length));
        }

        if (value.startsWith("$event.")) {
            return read_path(ctx.event, value.slice("$event.".length));
        }

        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => resolve_flow_value(item, ctx));
    }

    if (value && typeof value === "object") {
        const out: Record<string, any> = {};

        for (const key of Object.keys(value)) {
            out[key] = resolve_flow_value(value[key], ctx);
        }

        return out;
    }

    return value;
};

const run_command_or_list = async (
    cmd: any,
    ctx: XFlowCommandContext = {}
) => {
    const resolved_cmd = resolve_flow_value(cmd, ctx);

    if (Array.isArray(resolved_cmd)) {
        for (const item of resolved_cmd) {
            await _x.execute(item);
        }
        return;
    }

    await _x.execute(resolved_cmd);
};

export class FlowManagerClient extends XModule {
    static _name = "flow-client";
    static _instance: FlowManagerClient | null = null;

    static _skill: XpellSkill = {
        _id: "flow-client",
        _title: "Flow Manager Client",
        _version: "1.0.0",
        _active: true,
        _type: "client-module-api",
        _requires: ["xmodule", "xem", "xdata"],

        _description:
            "Client-side flow runtime bridge. Binds UI/runtime events to server flows, triggers flows through XUIRuntime, writes flow outputs into XData, and executes on_success/on_error commands.",

        _core_rules: [
            "Use flow-client to trigger server-side flows from UI/runtime events.",
            "Use _flow on XUIObject for common UI-triggered flows.",
            "Flow outputs are written to XData by output key.",
            "Use _on_success and _on_error in flow definitions for post-flow commands.",
            "Do not run server business logic directly on the client."
        ],

        _fields: {
            _flow: "XUIObject field for flow id or flow definition.",
            _flow_event: "DOM event that triggers _flow. Default click.",
            _flow_auto: "Disable automatic flow binding when false.",
            "_flow._payload": "Payload object passed to the flow.",
            "$xdata.key": "Use XData references inside flow payloads."
        }
    };

    static _ops: Record<string, XpellSkillCommand> = {
        bind: {
            _name: "bind",
            _scope: "module",
            _description:
                "Bind a XEM/runtime event to a server flow execution.",
            _params: {
                _flow_id: "Flow id to execute.",
                _event: "XEM event name to listen for.",
                _app_id: "Current app id.",
                _env: "Optional environment. Defaults to default."
            },
            _example: {
                _module: "flow-client",
                _op: "bind",
                _params: {
                    _flow_id: "login",
                    _event: "user:login-requested",
                    _app_id: "my-app",
                    _env: "default"
                }
            }
        },

        trigger: {
            _name: "trigger",
            _scope: "module",
            _description:
                "Trigger a server flow directly from the client.",
            _params: {
                _flow_id: "Flow id to execute.",
                _event_payload: "Optional payload object passed to the flow.",
                _event_name: "Optional source event name.",
                _app_id: "Optional app id. Defaults from XUIRuntime client.",
                _env: "Optional environment. Defaults from XUIRuntime client.",
                _source: "Trigger source: ui or event."
            },
            _example: {
                _module: "flow-client",
                _op: "trigger",
                _params: {
                    _flow_id: "login",
                    _event_payload: {
                        username: "$xdata.login.username",
                        password: "$xdata.login.password"
                    },
                    _source: "ui"
                }
            }
        },

        help: {
            _name: "help",
            _scope: "module",
            _description: "Return flow-client help."
        }
    };

    private _bindings: XFlowBinding[] = [];
    private _bound_events: Set<string> = new Set();
    private _ui_listener_bound = false;
    private _ui_flows_in_flight: Set<string> = new Set();

    constructor() {
        super({ _name: FlowManagerClient._name });
        if (FlowManagerClient._instance) {
            return FlowManagerClient._instance;
        }
        FlowManagerClient._instance = this;
    }

    async onLoad() {

        if (this._ui_listener_bound) return;
        this._ui_listener_bound = true;
        _xem.on("ui:flow-trigger", async (payload: any) => {
            log_debug("[flow-client] ui:flow-trigger received raw", payload);
            if (!payload || typeof payload._flow_id !== "string") {
                _xlog.warn("[flow-client] invalid ui trigger", payload);
                return;
            }

            log_debug("[flow-client] ui-trigger received", payload);

            const client = (window as any)?.__xvm_client;


            const safe_payload = {
                _flow_id: payload._flow_id,
                _event_name: typeof payload._event_name === "string" ? payload._event_name : undefined,
                _event_payload: (payload.hasOwnProperty("_event_payload") && typeof payload._event_payload === "object" && payload._event_payload !== null) ? payload._event_payload : undefined,
                _object_id: typeof payload._object_id === "string" ? payload._object_id : undefined,
                _success_view: typeof payload._success_view === "string" ? payload._success_view : undefined,
                _app_id: payload._app_id ?? client?._app_id,
                _env: payload._env ?? client?._env,
                _source: payload._source === "ui" || payload._source === "event" ? payload._source : "ui"
            };

            try {
                await _x.execute({
                    _module: "flow-client",
                    _op: "trigger",
                    _params: safe_payload
                });
            } catch (err) {
                _xlog.error("[flow-client] ui trigger failed", err, safe_payload);
            }
        });
    }


    /* ------------------------------------------------------------------------ */
    /* REGISTER FLOW BINDING                                                    */
    /* ------------------------------------------------------------------------ */

    async _bind(xcmd: XCommand) {
        const params = _xu.ensure_params(xcmd?._params);

        const flow_id = _xu.ensure_string(params._flow_id, "_flow_id");
        const event = _xu.ensure_string(params._event, "_event");
        const app_id = _xu.ensure_string(params._app_id, "_app_id");
        const env = params._env ?? "default";

        const duplicate = this._bindings.find((binding) =>
            binding._flow_id === flow_id &&
            binding._event === event &&
            binding._app_id === app_id
        );

        if (duplicate) {
            log_debug("[flow-client] bind skipped (duplicate)", {
                flow_id,
                event,
                app_id
            });

            return { _ok: true, _duplicate: true };
        }

        const binding: XFlowBinding = {
            _flow_id: flow_id,
            _event: event,
            _app_id: app_id,
            _env: env
        };

        this._bindings.push(binding);

        this.ensure_event_listener(event);

        return { _ok: true };
    }

    /* ------------------------------------------------------------------------ */
    /* TRIGGER FLOW                                                             */
    /* ------------------------------------------------------------------------ */

    private normalize_trigger_payload(params_in: Record<string, any>): XFlowTriggerPayload {
        const params = _xu.ensure_params(params_in);

        return {
            _flow_id: _xu.ensure_string(params._flow_id, "_flow_id"),
            _event_name: typeof params._event_name === "string" ? params._event_name : undefined,
            _event_payload: typeof params._event_payload === "object" && params._event_payload !== null ? params._event_payload : {},
            _object_id: typeof params._object_id === "string" ? params._object_id : undefined,
            _success_view: typeof params._success_view === "string" ? params._success_view : undefined,
            _app_id: typeof params._app_id === "string" ? params._app_id : undefined,
            _env: typeof params._env === "string" ? params._env : undefined,
            _source: params._source === "ui" || params._source === "event" ? params._source : undefined
        };
    }

    private ui_flow_key(
        normalized: XFlowTriggerPayload,
        app_id: string,
        env?: string
    ) {
        return [
            app_id,
            env ?? "default",
            normalized._object_id ?? "",
            normalized._flow_id,
        ].join(":");
    }

    private read_success_view_from_ui_object(
        obj: any,
        normalized: XFlowTriggerPayload
    ): string | undefined {
        const candidates: any[] = [
            normalized._success_view,
            obj?._success_view,
            obj?._submit?._success_view,
            obj?._flow?._success_view,
        ];

        let parent = obj?.ui_parent;
        while (parent) {
            candidates.push(
                parent?._success_view,
                parent?._submit?._success_view,
                parent?._flow?._success_view,
            );
            parent = parent?.ui_parent;
        }

        const dom_form_id = obj?.dom?.closest?.("form")?.id;
        if (typeof dom_form_id === "string" && dom_form_id) {
            const form = XUI.getObject(dom_form_id) as any;
            candidates.push(form?._submit?._success_view, form?._success_view);
        }

        const success_view = candidates.find(
            (candidate) => typeof candidate === "string" && candidate.trim(),
        );
        return typeof success_view === "string" ? success_view.trim() : undefined;
    }

    private set_ui_flow_state(
        obj: any,
        state: "running" | "success" | "error",
        error?: string
    ) {
        if (!obj?.dom) return;

        const dom = obj.dom as HTMLElement;
        const button = dom instanceof HTMLButtonElement ? dom : null;
        const statusNode = this.get_ui_flow_status_node(obj, dom);
        const original = (obj as any).__xflow_submit_original ?? {
            _text: typeof obj._text === "string" ? obj._text : dom.textContent ?? "",
            _disabled: button?.disabled === true || dom.getAttribute("disabled") !== null,
            _title: dom.getAttribute("title") ?? "",
        };
        (obj as any).__xflow_submit_original = original;

        if (state === "running") {
            dom.removeAttribute("data-xflow-error");
            dom.removeAttribute("data-xflow-success");
            dom.removeAttribute("aria-invalid");
            dom.setAttribute("aria-busy", "true");
            dom.setAttribute("disabled", "true");
            if (button) button.disabled = true;
            if (button) obj.setText?.("Submitting...");
            this.apply_ui_flow_classes(dom, state);
            this.set_ui_flow_status(statusNode, "Saving...");
            return;
        }

        dom.removeAttribute("aria-busy");

        if (original._disabled) {
            dom.setAttribute("disabled", "true");
            if (button) button.disabled = true;
        } else {
            dom.removeAttribute("disabled");
            if (button) button.disabled = false;
        }

        if (state === "error") {
            const message = error || "Flow failed";
            dom.removeAttribute("data-xflow-success");
            dom.setAttribute("data-xflow-error", message);
            dom.setAttribute("aria-invalid", "true");
            dom.setAttribute("title", message);
            if (button) obj.setText?.("Retry");
            this.apply_ui_flow_classes(dom, state);
            this.set_ui_flow_status(statusNode, message);
            return;
        }

        dom.removeAttribute("data-xflow-error");
        dom.removeAttribute("aria-invalid");
        if (original._title) dom.setAttribute("title", original._title);
        else dom.removeAttribute("title");
        dom.setAttribute("data-xflow-success", "Saved");
        dom.setAttribute("title", original._title || "Saved");
        if (button) obj.setText?.("Saved");
        this.apply_ui_flow_classes(dom, state);
        this.set_ui_flow_status(statusNode, "Saved");
    }

    private apply_ui_flow_classes(
        dom: HTMLElement,
        state: "running" | "success" | "error"
    ) {
        dom.classList.toggle("xui-flow-running", state === "running");
        dom.classList.toggle("xui-flow-error", state === "error");
        dom.classList.toggle("xui-flow-success", state === "success");
    }

    private get_ui_flow_status_node(obj: any, dom: HTMLElement) {
        const owner_id =
            typeof obj?._id === "string" && obj._id
                ? obj._id
                : dom.id || undefined;

        if (owner_id) {
            const existing = Array
                .from(document.querySelectorAll("[data-xflow-status-for]"))
                .find((node) =>
                    node instanceof HTMLElement &&
                    node.getAttribute("data-xflow-status-for") === owner_id
                );

            if (existing instanceof HTMLElement) {
                return existing;
            }
        }

        const statusNode = document.createElement("span");
        statusNode.className = "xui-flow-status";
        statusNode.setAttribute("role", "status");
        statusNode.setAttribute("aria-live", "polite");

        if (owner_id) {
            statusNode.setAttribute("data-xflow-status-for", owner_id);
        }

        if (dom.parentElement) {
            dom.insertAdjacentElement("afterend", statusNode);
        } else {
            dom.appendChild(statusNode);
        }

        return statusNode;
    }

    private set_ui_flow_status(node: HTMLElement | undefined, message: string) {
        if (!node) return;
        node.textContent = message;
    }

    private begin_ui_flow(
        normalized: XFlowTriggerPayload,
        app_id: string,
        env?: string
    ): XFlowUiState | null {
        if (normalized._source !== "ui" || !normalized._object_id) return null;

        const key = this.ui_flow_key(normalized, app_id, env);
        if (this._ui_flows_in_flight.has(key)) {
            log_debug("[flow-client] ui flow ignored while running", {
                _flow_id: normalized._flow_id,
                _object_id: normalized._object_id,
            });
            return { _key: key, _ignored: true };
        }

        const obj = XUI.getObject(normalized._object_id) as any;
        this._ui_flows_in_flight.add(key);
        this.set_ui_flow_state(obj, "running");

        return {
            _key: key,
            _object: obj,
            _success_view: this.read_success_view_from_ui_object(obj, normalized),
        };
    }

    private async complete_ui_flow(
        state: XFlowUiState | null,
        status: "success" | "error",
        client?: any,
        error?: string
    ) {
        if (!state) return;
        this._ui_flows_in_flight.delete(state._key);
        this.set_ui_flow_state(state._object, status, error);

        if (status === "success" && state._success_view) {
            if (typeof client?.render_view === "function") {
                await client.render_view(state._success_view);
            } else {
                _xlog.warn("[flow-client] success view navigation unavailable", {
                    _success_view: state._success_view,
                });
            }
        }
    }

    private async trigger_flow(
        params_in: Record<string, any>
    ) {

        const normalized =
            this.normalize_trigger_payload(
                params_in
            );

        const client: any =
            XUIRuntime.requireClient();

        const app_id =
            normalized._app_id ??
            client?._app_id;

        const env =
            normalized._env ??
            client?._env;

        /* -------------------------------------------------- */
        /* VALIDATION                                         */
        /* -------------------------------------------------- */

        if (
            !app_id ||
            typeof app_id !== "string"
        ) {

            throw new Error(
                "[flow-client] missing _app_id (no payload and no XVM client)"
            );
        }

        /* -------------------------------------------------- */
        /* DEBUG                                              */
        /* -------------------------------------------------- */

        log_debug(
            "[flow-client] trigger",
            {
                event:
                    normalized._event_name,

                flow_id:
                    normalized._flow_id,

                payload:
                    normalized._event_payload,

                source:
                    normalized._source
            }
        );

        const ui_state = this.begin_ui_flow(normalized, app_id, env);
        if (ui_state?._ignored) {
            return {
                _ok: true,
                _ignored: true,
                _running: true,
                _flow_id: normalized._flow_id
            };
        }

        /* -------------------------------------------------- */
        /* SEND (NON-BLOCKING)                                */
        /* -------------------------------------------------- */

        const payload = {
            _module: "flow",
            _op: "run",
            _params: {
                _flow_id:
                    normalized._flow_id,

                _app_id:
                    app_id,

                ...(env !== undefined
                    ? { _env: env }
                    : {}),

                _event_payload:
                    normalized._event_payload || {},

                ...(normalized._event_name
                    ? {
                        _event_name:
                            normalized._event_name
                    }
                    : {})
            }
        };

        try {

            client
                .sendXcmd(payload)
                .then(async (res: any) => {

                    log_debug(
                        "[flow-client] async flow response",
                        res
                    );
                    log_debug(
                        "[flow-client] raw flow response",
                        JSON.parse(JSON.stringify(res))
                    );
                    const flow =
                        res?._flow ??
                        res?._result?._flow;

                    const failed =
                        res?._ok === false ||
                        res?._result?._ok === false ||
                        flow?._last?._ok === false;
                    const failure_message =
                        flow?._last?._error?._message ??
                        flow?._last?._result?._message ??
                        res?._error?._message ??
                        res?._result?._error?._message ??
                        "Flow failed";

                    const flow_definition =
                        client?._flows?.get(
                            normalized._flow_id
                        );

                    const last =
                        flow?._last;

                    const generated_app_id =
                        flow?._last?._result?._app_id;

                    const handler_context = {
                        flow,
                        event: normalized._event_payload
                    };

                    /* -------------------------------------- */
                    /* APPLY FLOW OUTPUTS                     */
                    /* -------------------------------------- */

                    if (
                        flow?._outputs &&
                        typeof flow._outputs === "object"
                    ) {

                        for (const key of Object.keys(flow._outputs)) {

                            const raw =
                                flow._outputs[key];

                            const value =
                                raw &&
                                    typeof raw === "object" &&
                                    raw._ok === true &&
                                    raw.hasOwnProperty("_result")
                                    ? raw._result
                                    : raw;

                            _xd.set(
                                key,
                                value,
                                {
                                    source: "flow-client"
                                }
                            );
                        }
                    }

                    /* -------------------------------------- */
                    /* SUCCESS / ERROR HANDLERS               */
                    /* -------------------------------------- */

                    if (
                        last &&
                        last._ok === true &&
                        flow_definition?._on_success
                    ) {

                        await run_command_or_list(
                            flow_definition._on_success,
                            handler_context
                        ).catch((error) => {

                            _xlog.error(
                                "[flow-client] on_success failed",
                                error
                            );

                        });
                    }

                    if (
                        last &&
                        last._ok !== true &&
                        flow_definition?._on_error
                    ) {

                        await run_command_or_list(
                            flow_definition._on_error,
                            handler_context
                        ).catch((error) => {

                            _xlog.error(
                                "[flow-client] on_error failed",
                                error
                            );

                        });
                    }

                    await _xem.fire("flow:completed", {
                        _flow_id: normalized._flow_id,
                        _app_id: app_id,
                        _env: env ?? "default",
                        _event_payload: normalized._event_payload,
                        _result: res
                    });

                    await this.complete_ui_flow(
                        ui_state,
                        failed ? "error" : "success",
                        client,
                        failed ? failure_message : undefined
                    );

                    if (
                        typeof generated_app_id === "string" &&
                        generated_app_id.trim().length > 0 &&
                        generated_app_id !== app_id
                    ) {
                        const target_app_id = generated_app_id.trim();
                        const target_env = env ?? "default";
                        log_debug("[flow-client] generated app detected", {
                            _app_id: target_app_id
                        });

                        _xd.set("xvibe.active_app", target_app_id, {
                            source: "flow-client"
                        });

                        if (
                            client &&
                            typeof client.load_server_app === "function"
                        ) {
                            try {
                                await client.load_server_app(
                                    target_app_id,
                                    target_env
                                );
                                return;
                            } catch (error) {
                                _xlog.error(
                                    "[flow-client] generated app switch failed",
                                    error
                                );
                            }
                        }

                        _xem.fire("studio:open-app", {
                            _app_id: target_app_id,
                            _env: target_env
                        });
                    }

                })
                .catch((err: any) => {

                    _xlog.error(
                        "FLOW SEND ERROR",
                        err
                    );
                    void this.complete_ui_flow(
                        ui_state,
                        "error",
                        client,
                        err instanceof Error ? err.message : String(err)
                    );

                });

        } catch (err) {

            _xlog.error(
                "FLOW SEND ERROR",
                err
            );
            await this.complete_ui_flow(
                ui_state,
                "error",
                client,
                err instanceof Error ? err.message : String(err)
            );

            throw err;
        }

        /* -------------------------------------------------- */
        /* RETURN IMMEDIATELY                                 */
        /* -------------------------------------------------- */

        return {
            _ok: true,
            _queued: true,
            _flow_id:
                normalized._flow_id
        };
    }

    async _trigger(xcmd: XCommand) {
        const params = _xu.ensure_params(xcmd?._params);
        return await this.trigger_flow(params);
    }

    /* ------------------------------------------------------------------------ */
    /* EVENT LISTENER                                                           */
    /* ------------------------------------------------------------------------ */

    private ensure_event_listener(event: string) {
        if (this._bound_events.has(event)) return;

        this._bound_events.add(event);

        _xem.on(event, async (payload: any) => {
            const evt_payload =
                payload && Array.isArray(payload._args)
                    ? payload._args[0]
                    : payload;

            for (const binding of this._bindings) {
                if (binding._event !== event) continue;
                if (evt_payload?._source === "ui") continue;

                try {
                    await this.trigger_flow({
                        _flow_id: binding._flow_id,
                        _app_id: binding._app_id,
                        _env: binding._env,
                        _event_name: event,
                        _event_payload: evt_payload ?? {},
                        _source: "event"
                    });
                } catch (err) {
                    console.error("[flow-client] flow execution failed", err);
                }
            }
        });
    }

    /* ------------------------------------------------------------------------ */
    /* HELP                                                                     */
    /* ------------------------------------------------------------------------ */

    async _help() {
        return {
            _module: this._name,
            _ops: {
                bind: {
                    _params: ["_flow_id", "_event", "_app_id", "_env?"],
                    _desc: "Bind event → flow execution"
                },
                trigger: {
                    _params: ["_flow_id", "_event_payload?", "_event_name?", "_app_id?", "_env?"],
                    _desc: "Trigger flow execution directly"
                }
            }
        };
    }
}


export const XFM = new FlowManagerClient();
export const _xfm = XFM;
export default XFM;
