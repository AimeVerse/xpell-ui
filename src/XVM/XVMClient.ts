import { _xd, _xlog } from "@xpell/core";

import { _xem } from "../XEM/XEventManager";
import Wormholes from "../Wormholes/Wormholes";
import { XDB } from "../XDB/XDBClient";
import { XVM, type XVMApp } from "./XVM";
import { XUI } from "../XUI/XUI";
import { XStudioModule } from "../XStudio/XStudioModule";
import {
  _XD_KEYS,
  is_obj,
  to_err,
  type ServerGetViewRes,
} from "../XStudio/XStudioTypes";

const LOG = "[xvm-client]";
const DEFAULT_REGION = "main";
const DEFAULT_CONTAINER_ID = "region-main";

const EVT_XVM_UPDATE = "xvm:update";
const EVT_XVM_VIEW_RENDERED = "xvm:view-rendered";
const EVT_XVM_CONNECTION = "xvm:connection-change";

type ServerXVMApp = {
  _app_id: string;
  _env: string;
  _meta?: Record<string, any>;
  _config?: Record<string, any>;
};

type ServerGetAppRes = {
  _app: ServerXVMApp;
  _view_ids?: string[];
  _views?: Record<string, any>;
  _flow_ids?: string[];
  _flows?: Record<string, any>;
};

type ServerUpdateEvt = {
  _app_id: string;
  _env: string;
  _view_id: string;
  _version?: number;
  _view: Record<string, any>;
  _generation_id?: string;
  _meta?: Record<string, any>;
};

type PendingStructuredViewEdit = {
  _view_id: string;
  _action: string;
  _target_id: string;
  _created_at: number;
};

type StructuredViewEditRefreshRequest = {
  _view_id?: string;
  _action?: string;
  _target_id?: string;
  _version?: number;
  _result?: any;
};

export type XVMClientConnectionChange = {
  _status: "connected" | "disconnected" | "error" | "connecting";
  _connected: boolean;
  _app_id: string;
  _env: string;
  _source?: string;
};

export type XVMClientOptions = {
  _app_id: string;
  _env: string;
  _edit?: boolean;
  _wormhole_url: string;
  _region?: string;
  _fallback_view_id?: string;
  _theme?: string | Record<string, string>;
  _debug?: boolean;
  onViewRendered?: (view_id: string) => void;
  onConnectionChange?: (payload: XVMClientConnectionChange) => void;
  onError?: (error: any) => void;
  onAppMounted?: (payload: { _app_id: string; _env: string; _region: string }) => void;
};

export type XVMClientLoadServerAppOptions = {
  _edit?: boolean;
};

const to_result = (raw: any) => {
  if (is_obj(raw) && typeof raw._ok === "boolean") {
    if (raw._ok !== true) throw new Error(to_err(raw._result ?? raw));
    return "_result" in raw ? raw._result : raw;
  }

  if (is_obj(raw) && is_obj(raw._payload) && typeof raw._payload._ok === "boolean") {
    if (raw._payload._ok !== true) throw new Error(to_err(raw._payload._result ?? raw._payload));
    return "_result" in raw._payload ? raw._payload._result : raw._payload;
  }

  if (is_obj(raw) && "_result" in raw) {
    return (raw as any)._result;
  }

  return raw;
};


export class XVMClient {
  _app_id: string;
  _env: string;
  _wormhole_url: string;
  _region_override?: string;
  _fallback_view_id?: string;
  _on_view_rendered?: (view_id: string) => void;
  _on_connection_change?: (payload: XVMClientConnectionChange) => void;
  _on_error?: (error: any) => void;
  _on_app_mounted?: (payload: { _app_id: string; _env: string; _region: string }) => void;

  _views_cache: Map<string, any> = new Map();
  _flows: Map<string, any> = new Map();
  _known_view_ids: Set<string> = new Set();
  _cmd_seq = 0;
  _app: ServerXVMApp | null = null;
  _current_view_id = "";
  _app_view_id = "";
  _current_version = 0;
  _bound = false;
  _app_mounted = false;
  _has_rendered_view = false;
  _app_needs_refresh = false;
  _connected = false;
  _subscribed = false;
  _debug = false;
  _theme?: string | Record<string, string>;
  _cache_key_app: string;
  _cache_key_version: string;
  _edit_mode = true;
  _xstudio: XStudioModule;
  _pending_structured_view_edits: PendingStructuredViewEdit[] = [];

  constructor(opts: XVMClientOptions) {
    this._app_id = opts._app_id;
    this._env = opts._env;
    this._edit_mode = this._resolve_edit_mode(opts._app_id, opts._edit);
    this._wormhole_url = opts._wormhole_url;
    this._region_override = typeof opts._region === "string" && opts._region.trim() ? opts._region.trim() : undefined;
    this._fallback_view_id =
      typeof opts._fallback_view_id === "string" && opts._fallback_view_id.trim() ? opts._fallback_view_id.trim() : undefined;
    this._on_view_rendered = typeof opts.onViewRendered === "function" ? opts.onViewRendered : undefined;
    this._on_connection_change = typeof opts.onConnectionChange === "function" ? opts.onConnectionChange : undefined;
    this._on_error = typeof opts.onError === "function" ? opts.onError : undefined;
    this._on_app_mounted = typeof opts.onAppMounted === "function" ? opts.onAppMounted : undefined;
    this._theme = opts._theme;
    this._debug = opts._debug === true;

    this._cache_key_app = `xvm:last_app:${this._env}:${this._app_id}`;
    this._cache_key_version = `xvm:version:${this._env}:${this._app_id}`;
    _xd.set(
      _XD_KEYS.XVM_APP_ID,
      this._app_id,
      {
        source: "xvm-client"
      }
    );

    _xd.set(
      _XD_KEYS.XVM_ENV,
      this._env,
      {
        source: "xvm-client"
      }
    );
    this._xstudio = new XStudioModule(this);
    _xem.fire("xvm:view-resolver-ready", {
      resolver: (view_id: string) => this.get_view(view_id)
    });
  }


  get_current_view_id(): string {
    return this._current_view_id;
  }


  getActiveAppId() {
    return this._app_id;
  }

  getActiveEnv() {
    return this._env;
  }

  get_app_view_id() {
    return this._app_view_id;
  }

  is_edit_mode_enabled() {
    return this._edit_mode && this._app_id !== "vibe-system";
  }

  note_structured_view_edit(edit: {
    _view_id?: string;
    _action?: string;
    _target_id?: string;
  }) {
    const view_id = typeof edit?._view_id === "string" ? edit._view_id.trim() : "";
    const action = typeof edit?._action === "string" ? edit._action.trim() : "";
    const target_id = typeof edit?._target_id === "string" ? edit._target_id.trim() : "";
    if (!view_id || !action) return;

    this._prune_pending_structured_view_edits();
    this._pending_structured_view_edits.push({
      _view_id: view_id,
      _action: action,
      _target_id: target_id,
      _created_at: Date.now(),
    });
  }

  clear_pending_structured_view_edit(edit: {
    _view_id?: string;
    _action?: string;
    _target_id?: string;
  }) {
    const view_id = typeof edit?._view_id === "string" ? edit._view_id.trim() : "";
    const action = typeof edit?._action === "string" ? edit._action.trim() : "";
    const target_id = typeof edit?._target_id === "string" ? edit._target_id.trim() : "";
    this._pending_structured_view_edits = this._pending_structured_view_edits.filter((pending) => {
      if (view_id && pending._view_id !== view_id) return true;
      if (action && pending._action !== action) return true;
      if (target_id && pending._target_id !== target_id) return true;
      return false;
    });
  }

  async request_structured_view_edit_refresh(edit: StructuredViewEditRefreshRequest) {
    const view_id = typeof edit?._view_id === "string" ? edit._view_id.trim() : "";
    const action = typeof edit?._action === "string" ? edit._action.trim() : "";
    const target_id = typeof edit?._target_id === "string" ? edit._target_id.trim() : "";
    if (!view_id) {
      return {
        _ok: false,
        _reason: "missing view id",
      };
    }

    const out = (await this._send_cmd("get-view", {
      _app_id: this._app_id,
      _env: this._env,
      _view_id: view_id,
    })) as ServerGetViewRes;

    if (!is_obj(out) || !is_obj(out._view)) {
      return {
        _ok: false,
        _reason: "invalid get-view response",
        _view_id: view_id,
      };
    }

    const fetched_version = Number(out._version);
    const requested_version = Number(edit?._version);
    const version = Number.isFinite(fetched_version) && fetched_version > 0
      ? fetched_version
      : Number.isFinite(requested_version) && requested_version > 0
        ? requested_version
        : 0;
    const update_payload: ServerUpdateEvt = {
      _app_id: this._app_id,
      _env: this._env,
      _view_id: view_id,
      ...(version > 0 ? { _version: version } : {}),
      _view: out._view,
      _meta: {
        _source: "xstudio:intent-action-refresh",
        _force_refresh: true,
        ...(action ? { _edit_action: action } : {}),
        ...(target_id ? { _target_id: target_id } : {}),
      },
    };
    const handled = await this._handle_xvm_update_payload(update_payload, EVT_XVM_UPDATE);

    return {
      _ok: handled._accepted === true,
      _view_id: view_id,
      _version: version || handled._version || 0,
      _handled: handled,
    };
  }

  sendServerXVMCommand(op: string, params: any) {
    return this._send_cmd(op, params);
  }

  _log(...args: any[]) {
    _xlog.log(LOG, ...args);
  }

  _debug_log(...args: any[]) {
    if (!this._debug) return;
    _xlog.debug(LOG, ...args);
  }

  _error(...args: any[]) {
    _xlog.error(LOG, ...args);
  }

  _emit_view_cache_updated(view_id: string) {
    if (!view_id) return;

    this._log("view cache updated", {
      _view_id: view_id
    });

    _xem.fire("xvm:view-cache-updated", {
      _view_id: view_id,
      _app_id: this._app_id,
      _env: this._env
    });
  }

  _normalize_event_payload(payload: any): any {
    const raw = typeof payload === "string" && payload.trim()
      ? (() => {
        try {
          return JSON.parse(payload);
        } catch {
          return payload;
        }
      })()
      : payload;

    if (is_obj(raw) && is_obj(raw?._payload)) return this._normalize_event_payload(raw._payload);
    if (is_obj(raw) && is_obj(raw?.payload)) return this._normalize_event_payload(raw.payload);
    if (is_obj(raw) && Array.isArray(raw?._args) && is_obj(raw._args[0])) return raw._args[0];
    if (is_obj(raw) && Array.isArray(raw?.args) && is_obj(raw.args[0])) return raw.args[0];
    if (is_obj(raw) && is_obj(raw?._data)) return raw._data;
    if (is_obj(raw) && is_obj(raw?.data)) return raw.data;
    return raw;
  }

  _cache_key_view(view_id: string) {
    return `xvm:view:${this._env}:${this._app_id}:${view_id}`;
  }

  _collect_data_sources(node: any, out: Set<string>) {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach((n) => this._collect_data_sources(n, out));
      return;
    }
    if (typeof node !== "object") return;
    if (typeof node._data_source === "string" && node._data_source.trim()) {
      out.add(String(node._data_source));
    }
    Object.values(node).forEach((v) => this._collect_data_sources(v as any, out));
  }

  _log_view_payload(view_id: string, view_json: Record<string, any>, source: string) {
    const sources = new Set<string>();
    this._collect_data_sources(view_json, sources);
    const list = Array.from(sources);
    const sample = list.slice(0, 8).reduce((acc, key) => {
      acc[key] = _xd.get(key);
      return acc;
    }, {} as Record<string, any>);
    this._debug_log(`view payload (${source})`, {
      _view_id: view_id,
      _data_sources_count: list.length,
      _data_sources_sample: list.slice(0, 8),
      _data_values_sample: sample,
    });
  }

  _set_connection_status(status: XVMClientConnectionChange["_status"], source?: string) {
    const connected = status === "connected";
    this._connected = connected;
    if (!connected) this._subscribed = false;
    const payload: XVMClientConnectionChange = {
      _status: status,
      _connected: connected,
      _app_id: this._app_id,
      _env: this._env,
      ...(source ? { _source: source } : {}),
    };
    if (this._on_connection_change) this._on_connection_change(payload);
    _xem.fire(EVT_XVM_CONNECTION, payload);
  }

  _sync_cache_state() {
    // TODO: consider adding a timestamp and/or version to the cache and use it to determine staleness of cached data
    // noop (kept for API parity)
  }

  _set_current_version(version: number) {
    this._current_version = Number.isFinite(version) ? Number(version) : 0;
  }

  _get_version_from_app(app: ServerXVMApp | null | undefined) {
    if (!is_obj(app?._meta)) return 0;
    const raw = (app!._meta as any)._version;
    return Number.isFinite(raw) ? Number(raw) : 0;
  }

  _should_accept_push_version(next_version: number, source: string) {
    if (!Number.isFinite(next_version)) return false;
    if (next_version <= this._current_version) {
      this._log(`ignore stale payload source='${source}' next=${next_version} current=${this._current_version}`);
      return false;
    }
    return true;
  }

  _prune_pending_structured_view_edits() {
    const now = Date.now();
    this._pending_structured_view_edits = this._pending_structured_view_edits.filter((pending) =>
      now - pending._created_at < 30000
    );
  }

  _consume_pending_structured_view_edit(view_id: string, action: string) {
    const normalized_view_id = typeof view_id === "string" ? view_id.trim() : "";
    const normalized_action = typeof action === "string" ? action.trim() : "";
    if (!normalized_view_id || !normalized_action) return null;

    this._prune_pending_structured_view_edits();
    const index = this._pending_structured_view_edits.findIndex((pending) =>
      pending._view_id === normalized_view_id &&
      (pending._action === normalized_action ||
        (normalized_action === "remove-object" && pending._action === "remove"))
    );
    if (index < 0) return null;

    const [pending] = this._pending_structured_view_edits.splice(index, 1);
    return pending ?? null;
  }

  _consume_pending_structured_view_edit_for_view(view_id: string) {
    const normalized_view_id = typeof view_id === "string" ? view_id.trim() : "";
    if (!normalized_view_id) return null;

    this._prune_pending_structured_view_edits();
    const index = this._pending_structured_view_edits.findIndex((pending) =>
      pending._view_id === normalized_view_id
    );
    if (index < 0) return null;

    const [pending] = this._pending_structured_view_edits.splice(index, 1);
    return pending ?? null;
  }

  _bump_version_if_newer(next_version: number, source: string) {
    if (!Number.isFinite(next_version)) return;
    if (next_version > this._current_version) {
      this._set_current_version(next_version);
      XDB.saveString(this._cache_key_version, String(next_version));
      return;
    }
    if (next_version < this._current_version) {
      this._log(`older payload version source='${source}' next=${next_version} current=${this._current_version}`);
    }
  }

  _persist_cached_app(app: ServerXVMApp, view_ids: string[], version: number) {
    XDB.saveObject(this._cache_key_app, { _app: app, _view_ids: view_ids });
    XDB.saveString(this._cache_key_version, String(version));
  }

  _persist_cached_view(view_id: string, view: Record<string, any>) {
    XDB.saveObject(this._cache_key_view(view_id), view);
  }

  _read_cached_view(view_id: string): Record<string, any> | null {
    const v = XDB.getObject(this._cache_key_view(view_id));
    return is_obj(v) ? (v as Record<string, any>) : null;
  }

  _normalize_view_ids(view_ids: unknown): string[] {
    if (!Array.isArray(view_ids)) return [];
    return view_ids.filter((v) => typeof v === "string" && v.trim().length > 0).map((v) => String(v));
  }

  _pick_entry_view_id(app: ServerXVMApp | null, view_ids: string[]) {
    const from_meta =
      is_obj(app?._meta) && typeof (app!._meta as any)._entry_view_id === "string"
        ? String((app!._meta as any)._entry_view_id)
        : "";
    if (from_meta) return from_meta;

    const from_start =
      is_obj(app?._config?._start) && typeof (app!._config!._start as any)._view_id === "string"
        ? String((app!._config!._start as any)._view_id)
        : "";
    if (from_start) return from_start;

    return view_ids[0] ?? "";
  }

  _ordered_view_ids(entry: string, view_ids: string[]) {
    return [entry, ...view_ids.filter((view_id) => view_id !== entry)];
  }

  _resolve_edit_mode(app_id: string, edit?: boolean) {
    if (app_id === "vibe-system") return false;
    if (typeof edit === "boolean") return edit;
    return true;
  }

  _set_app_scope(app_id: string, env: string, edit?: boolean) {
    this._app_id = app_id;
    this._env = env;
    this._edit_mode = this._resolve_edit_mode(app_id, edit);
    this._cache_key_app = `xvm:last_app:${env}:${app_id}`;
    this._cache_key_version = `xvm:version:${env}:${app_id}`;

    _xd.set(_XD_KEYS.XVM_APP_ID, app_id, { source: "xvm-client" });
    _xd.set(_XD_KEYS.XVM_ENV, env, { source: "xvm-client" });
  }

  _reset_app_state_for_switch() {
    this._views_cache.clear();
    this._flows.clear();
    this._known_view_ids.clear();
    this._current_view_id = "";
    this._app_view_id = "";
    this._current_version = 0;
    this._app = null;
    this._app_needs_refresh = true;
    this._app_mounted = false;
    this._has_rendered_view = false;
    this._subscribed = false;
    this._xstudio.clear_active_generation();
  }

  _log_load_server_app_failure(
    stage: string,
    app_id: string,
    env: string,
    previous_app_id: string,
    previous_env: string,
    err: any
  ) {
    this._error("load_server_app failed", {
      _stage: stage,
      _app_id: app_id,
      _env: env,
      _current_app_id: previous_app_id,
      _current_env: previous_env,
      _error: to_err(err),
    });
  }

  async _send_cmd(_op: string, _params: Record<string, any>) {
    const req_id = ++this._cmd_seq;
    this._debug_log(`-> [${req_id}] server-xvm.${_op}`, _params);
    try {
      const raw = await Wormholes.sendXcmd({ _module: "server-xvm", _op, _params });
      this._debug_log(`<- [${req_id}] server-xvm.${_op} raw`, raw);
      const result = to_result(raw);

      if (is_obj(result)) {
        if (_op === "get-app") {
          const app_obj = is_obj((result as any)._app) ? (result as any)._app : {};
          const view_ids = this._normalize_view_ids((result as any)._view_ids);
          const views_obj = is_obj((result as any)._views) ? (result as any)._views : {};
          this._debug_log(`<- [${req_id}] server-xvm.${_op} summary`, {
            _app_id: (app_obj as any)._app_id,
            _env: (app_obj as any)._env,
            _version: (app_obj as any)?._meta?._version,
            _view_ids_count: view_ids.length,
            _views_count: Object.keys(views_obj).length,
          });
        } else if (_op === "get-view") {
          this._debug_log(`<- [${req_id}] server-xvm.${_op} summary`, {
            _app_id: (result as any)._app_id,
            _env: (result as any)._env,
            _version: (result as any)._version,
            _view_id: (result as any)?._view?._id,
          });
        } else {
          this._debug_log(`<- [${req_id}] server-xvm.${_op} result`, result);
        }
      } else {
        this._debug_log(`<- [${req_id}] server-xvm.${_op} result`, result);
      }
      return result;
    } catch (err: any) {
      this._error(`xx [${req_id}] server-xvm.${_op} failed`, to_err(err));
      throw err;
    }
  }

  async _wait_for_wormhole_open() {
    if (Wormholes._ready || this._connected) {
      this._log("wormhole already connected");
      return;
    }
    this._log("waiting for wormhole-open...");
    await new Promise<void>((resolve, reject) => {
      let done = false;
      const finish = (fn: () => void) => {
        if (done) return;
        done = true;
        fn();
      };
      _xem.on("wormhole-open", () => {
        this._log("wormhole-open received");
        finish(resolve);
      });
      _xem.on("wormhole-error", (err: any) => {
        this._error("wormhole-error while waiting", to_err(err));
        finish(() => reject(new Error(to_err(err))));
      });
      _xem.on("wormhole-close", () => {
        this._error("wormhole-close while waiting");
        finish(() => reject(new Error("Wormhole closed before server-xvm bootstrap")));
      });
    });
  }

  _ensure_connected() {
    if (Wormholes._ready || this._connected) {
      this._set_connection_status("connected", "ready");
      return;
    }

    if (!this._wormhole_url) throw new Error("Missing wormhole URL");

    Wormholes.open({
      _url: this._wormhole_url,
      _auto_reconnect: true,
      _hello_payload: { _client: "xvm-client", _app: this._app_id },
    });
    this._log(`wormhole open requested url='${this._wormhole_url}'`);
    this._set_connection_status("connecting", "open");
  }

  _resolve_region(): string {
    const router_region =
      is_obj(this._app?._config?._router) && typeof this._app?._config?._router?._region === "string"
        ? this._app!._config!._router!._region
        : "";
    if (router_region) return router_region;
    if (this._region_override) return this._region_override;
    return DEFAULT_REGION;
  }

  _resolve_container_id(region: string): string {
    if (region === DEFAULT_REGION) return DEFAULT_CONTAINER_ID;
    return region;
  }

  _create_offline_app(message: string): XVMApp {
    const region = this._resolve_region();
    const container_id = this._resolve_container_id(region);
    return {
      _player: { _id: "xplayer", _set_as_main_player: true },
      _containers: [{ _id: container_id }],
      _regions: [{ _id: region, _container_id: container_id }],
      _views: {
        "view-server-offline": {
          _type: "view",
          _id: "view-server-offline",
          class: "screen",
          _children: [
            { _type: "label", class: "screen-title", _text: "Server views unavailable" },
            { _type: "label", class: "screen-sub", _text: message },
          ],
        },
      },
      _router: { _region: region, _fallback_view_id: "view-server-offline" },
      _start: { _view_id: "view-server-offline", _region: region },
    };
  }

  _build_runtime_app(): XVMApp {
    if (!this._app) throw new Error("Server app metadata missing");

    const config = is_obj(this._app._config) ? this._app._config : {};
    const views = Object.fromEntries(this._views_cache.entries());

    const fallback_view_id =
      (is_obj(config._router) &&
        typeof config._router._fallback_view_id === "string" &&
        config._router._fallback_view_id) ||
      this._fallback_view_id ||
      this._current_view_id ||
      Object.keys(views)[0];

    const region =
      (is_obj(config._router) &&
        typeof config._router._region === "string" &&
        config._router._region) ||
      this._region_override ||
      DEFAULT_REGION;

    const default_container_id = this._resolve_container_id(region);

    const app_theme =
      typeof (this._app as any)?._theme === "string" &&
        (this._app as any)._theme.trim()
        ? (this._app as any)._theme.trim()
        : undefined;

    const fallback_theme =
      typeof this._theme === "string" && this._theme.trim()
        ? this._theme.trim()
        : this._theme;

    const base_app: XVMApp = {
      _player: is_obj((config as any)._player)
        ? (config as any)._player
        : {
          _id: "xplayer",
          _set_as_main_player: true,
        },

      _shell: (config as any)._shell,

      _theme: app_theme ?? fallback_theme,

      _containers: Array.isArray((config as any)._containers)
        ? (config as any)._containers
        : [{ _id: default_container_id }],

      _regions: Array.isArray((config as any)._regions)
        ? (config as any)._regions
        : [{ _id: region, _container_id: default_container_id }],

      _views: views,

      _router: is_obj((config as any)._router)
        ? (config as any)._router
        : {
          _region: region,
          _fallback_view_id: fallback_view_id,
        },

      _start: is_obj((config as any)._start)
        ? (config as any)._start
        : {
          _view_id: fallback_view_id,
          _region: region,
      },
    };

    return this._xstudio.extend_runtime_app(base_app, {
      _region: region,
      _container_id: default_container_id,
      _fallback_view_id: fallback_view_id,
      _app_id: this._app_id,
      _edit: this.is_edit_mode_enabled(),
    });
  }

  _sync_views_to_xvm() {
    const entries = Array.from(this._views_cache.entries());
    if (entries.length === 0) return;
    for (const [view_id, view_json] of entries) {
      if (!is_obj(view_json)) continue;
      const raw_view = typeof (view_json as any)._id === "string" ? view_json : { ...view_json, _id: view_id };
      (XVM as any).registerRawView(raw_view);
    }
    this._app_needs_refresh = false;
    this._log("xvm raw views synced", { _count: entries.length });
  }

  _get_active_render_view_id() {
    const region = this._resolve_region();
    try {
      const active_view_id = (XVM as any).getActiveViewId?.({ region });
      if (typeof active_view_id === "string" && active_view_id.trim()) {
        return active_view_id.trim();
      }
    } catch (err) {
      this._log("active render view lookup failed", {
        _region: region,
        _error: to_err(err),
      });
    }

    if (this._app_view_id) return this._app_view_id;
    return this._current_view_id;
  }

  _view_references_xvm_view(value: any, view_id: string): boolean {
    if (!view_id) return false;

    if (Array.isArray(value)) {
      return value.some((item) => this._view_references_xvm_view(item, view_id));
    }

    if (!is_obj(value)) return false;

    if (
      value._type === "xvm-view" &&
      typeof value._view_id === "string" &&
      value._view_id.trim() === view_id
    ) {
      return true;
    }

    if (Array.isArray(value._children)) {
      return this._view_references_xvm_view(value._children, view_id);
    }

    return false;
  }

  _resolve_edit_mode_rerender_target(updated_view_id: string) {
    if (!this.is_edit_mode_enabled()) return null;

    const active_view_id = this._get_active_render_view_id();
    if (!active_view_id) return null;

    if (active_view_id === updated_view_id) {
      return {
        _active_view_id: active_view_id,
        _reason: "active-view",
      };
    }

    const active_view = this._views_cache.get(active_view_id);
    if (
      is_obj(active_view) &&
      this._view_references_xvm_view(active_view, updated_view_id)
    ) {
      return {
        _active_view_id: active_view_id,
        _reason: "referenced-xvm-view",
      };
    }

    return null;
  }

  _collect_runtime_subtree_ids(object_id: string) {
    const root = XUI.getObject(object_id) as any;
    const ids: string[] = [];
    const seen = new Set<string>();

    const visit = (obj: any) => {
      if (!obj) return;

      const id = typeof obj._id === "string" ? obj._id.trim() : "";
      if (id && seen.has(id)) return;
      if (id) seen.add(id);

      const children = Array.isArray(obj._children) ? obj._children : [];
      for (const child of children) {
        visit(child);
      }

      if (id) ids.push(id);
    };

    visit(root);
    return ids;
  }

  _remove_runtime_view_subtree(view_id: string) {
    const ids = this._collect_runtime_subtree_ids(view_id);

    try {
      if (typeof (XVM as any).remove === "function") {
        (XVM as any).remove(view_id);
      } else {
        XUI.remove(view_id);
      }
    } catch (err) {
      this._error("edit-mode full rerender remove failed", {
        _view_id: view_id,
        _error: to_err(err),
      });
      XUI.remove(view_id);
    }

    for (const id of ids) {
      if (id === view_id) continue;
      try {
        XUI.remove(id);
      } catch { }
    }
  }

  async _rerender_edit_mode_after_view_update(
    upd: ServerUpdateEvt,
    context?: { _action?: string; _target_id?: string },
  ) {
    const target = this._resolve_edit_mode_rerender_target(upd._view_id);
    if (!target) return false;

    const active_view = this._views_cache.get(target._active_view_id);
    if (!is_obj(active_view)) return false;

    const action = typeof context?._action === "string" ? context._action.trim() : "";
    const is_remove_object = action === "remove-object" || action === "remove";
    this._log(
      is_remove_object
        ? "edit-mode full rerender after remove-object"
        : "edit-mode full rerender after view update",
      {
        _updated_view_id: upd._view_id,
        _active_view_id: target._active_view_id,
        _reason: target._reason,
      });

    const updated_view =
      typeof upd._view._id === "string" ? upd._view : { ...upd._view, _id: upd._view_id };
    (XVM as any).registerRawView?.(updated_view);
    if (target._active_view_id !== upd._view_id) {
      const active_raw_view =
        typeof active_view._id === "string"
          ? active_view
          : { ...active_view, _id: target._active_view_id };
      (XVM as any).registerRawView?.(active_raw_view);
    }

    this._app_needs_refresh = true;
    this._remove_runtime_view_subtree(target._active_view_id);

    await this.render_view(target._active_view_id);
    return true;
  }

  setTheme(theme: string | Record<string, string>) {
    this._theme = theme;
    XUI.applyTheme(theme);
  }

  async _ensure_view(view_id: string) {
    if (this._views_cache.has(view_id)) return;

    const cached_view = this._read_cached_view(view_id);
    if (cached_view) {
      this._views_cache.set(view_id, cached_view);
      this._emit_view_cache_updated(view_id);
      this._known_view_ids.add(view_id);
      this._sync_cache_state();
      this._app_needs_refresh = true;
      return;
    }

    const out = (await this._send_cmd("get-view", { _app_id: this._app_id, _env: this._env, _view_id: view_id })) as ServerGetViewRes;
    if (!is_obj(out) || !is_obj(out._view)) {
      throw new Error(`Invalid get-view response for '${view_id}'`);
    }
    const next_version = Number.isFinite(out._version) ? Number(out._version) : this._current_version;
    this._bump_version_if_newer(next_version, "get-view");
    this._views_cache.set(view_id, out._view);
    this._emit_view_cache_updated(view_id);
    this._known_view_ids.add(view_id);
    this._persist_cached_view(view_id, out._view);
    this._sync_cache_state();
    this._app_needs_refresh = true;
    this._log_view_payload(view_id, out._view, "get-view");
  }

  async _fetch_view_from_server(view_id: string, source: string) {
    const out = (await this._send_cmd("get-view", { _app_id: this._app_id, _env: this._env, _view_id: view_id })) as ServerGetViewRes;
    if (!is_obj(out) || !is_obj(out._view)) {
      throw new Error(`Invalid ${source} response for '${view_id}'`);
    }

    const next_version = Number.isFinite(out._version) ? Number(out._version) : this._current_version;
    this._bump_version_if_newer(next_version, source);

    this._views_cache.set(view_id, out._view);
    this._emit_view_cache_updated(view_id);
    this._known_view_ids.add(view_id);
    this._persist_cached_view(view_id, out._view);
    this._sync_cache_state();
    this._app_needs_refresh = true;
    this._log_view_payload(view_id, out._view, source);
  }

  async _hydrate_all_views_from_server(source: string) {
    const params: any = {
      _env: this._env,
      _include_views: false,
      _include_flows: true,
    };

    if (
      typeof this._app_id === "string" &&
      this._app_id.trim().length > 0
    ) {
      params._app_id = this._app_id;
    }

    const out = (await this._send_cmd(
      "get-app",
      params
    )) as ServerGetAppRes;

    if (!is_obj(out) || !is_obj(out._app)) {
      throw new Error(`Invalid ${source} get-app(include_views=true) response`);
    }

    this._app = out._app as ServerXVMApp;

    const next_version = this._get_version_from_app(this._app);
    this._bump_version_if_newer(next_version, source);

    const view_ids = this._normalize_view_ids(out._view_ids);
    this._persist_cached_app(this._app, view_ids, next_version);
    this._known_view_ids.clear();
    view_ids.forEach((v) => this._known_view_ids.add(v));

    const views_obj = is_obj(out._views) ? out._views : {};
    for (const [view_id, view_json] of Object.entries(views_obj)) {
      if (!is_obj(view_json)) continue;
      this._views_cache.set(view_id, view_json);
      this._emit_view_cache_updated(view_id);
      this._known_view_ids.add(view_id);
      this._persist_cached_view(view_id, view_json);
      this._log_view_payload(view_id, view_json, source);
    }

    this._sync_cache_state();
    this._app_needs_refresh = true;
  }

  async _mount_runtime_app() {
    const runtime_app = this._build_runtime_app();
    const region = this._resolve_region();
    const player_id =
      is_obj((runtime_app as any)._player) && typeof (runtime_app as any)._player._id === "string"
        ? String((runtime_app as any)._player._id)
        : "xplayer";
    const regions_summary = Array.isArray(runtime_app._regions)
      ? runtime_app._regions.map((r: any) => ({
        _id: r?._id,
        _container_id: r?._container_id,
      }))
      : [];

    this._log("mount_runtime_app:before", {
      _region: region,
      _views_cache_size: this._views_cache.size,
      _current_view_id: this._current_view_id,
      _regions: regions_summary,
    });
    if (typeof document !== "undefined") {
      const existing_players = Array.from(document.querySelectorAll(`#${player_id}`));
      if (existing_players.length > 0) {
        existing_players.forEach((el) => el.parentElement?.removeChild(el));
        this._log("mount_runtime_app:cleared_player", { _player_id: player_id, _count: existing_players.length });
      }
    }
    await XVM.app(runtime_app as any);
    this._app_mounted = true;
    this._app_needs_refresh = false;
    this._log("mount_runtime_app:after", {
      _region: region,
      _views_cache_size: this._views_cache.size,
      _current_view_id: this._current_view_id,
    });
    if (this._on_app_mounted) {
      this._on_app_mounted({ _app_id: this._app_id, _env: this._env, _region: region });
    }
  }

  async _navigate_view(view_id: string, region: string) {
    this._debug_log("navigate:try", { _signature: "positional", _view_id: view_id, _region: region });
    try {
      await (XVM as any).navigate(view_id, { _region: region });
      this._debug_log("navigate:ok", { _signature: "positional", _view_id: view_id, _region: region });
    } catch (err: any) {
      this._error("navigate:failed", {
        _signature: "positional",
        _view_id: view_id,
        _region: region,
        _error: to_err(err),
      });
      throw err;
    }
  }

  async render_view(view_id: string) {
    if (!view_id) return;
    await this._ensure_view(view_id);

    if (!this._app_mounted) {
      await this._mount_runtime_app();
    } else if (this._app_needs_refresh) {
      this._sync_views_to_xvm();
    }

    const region = this._resolve_region();
    try {
      await this._navigate_view(view_id, region);
    } catch (err) {
      this._error(`navigate failed for '${view_id}', hydrating all views`, to_err(err));
      await this._hydrate_all_views_from_server("navigate-recovery");
      await this._mount_runtime_app();
      await this._navigate_view(view_id, region);
    }
    this._current_view_id = view_id;
    if (region !== "studio") {
      this._app_view_id = view_id;
      this._log("app view tracked", { _view_id: view_id, _region: region });
    }
    this._has_rendered_view = true;
    if (this._on_view_rendered) this._on_view_rendered(view_id);
    await _xem.fire(EVT_XVM_VIEW_RENDERED, { _view_id: view_id, _app_id: this._app_id, _env: this._env });
  }

  async _render_cached_boot_view() {
    const cached_app_wrap = XDB.getObject(this._cache_key_app);
    if (!is_obj(cached_app_wrap) || !is_obj((cached_app_wrap as any)._app)) {
      this._log("boot cache miss");
      return false;
    }

    const cached_app = (cached_app_wrap as any)._app as ServerXVMApp;
    const cached_view_ids = this._normalize_view_ids((cached_app_wrap as any)._view_ids);
    const cached_version_raw = XDB.getString(this._cache_key_version);
    const cached_version = Number.isFinite(Number(cached_version_raw))
      ? Number(cached_version_raw)
      : this._get_version_from_app(cached_app);
    const cached_entry = this._pick_entry_view_id(cached_app, cached_view_ids);
    const cached_entry_view = cached_entry ? this._read_cached_view(cached_entry) : null;

    if (!cached_entry || !cached_entry_view) {
      this._log("boot cache partial: app found, entry view missing");
      return false;
    }

    this._app = cached_app;
    this._known_view_ids.clear();
    cached_view_ids.forEach((v) => this._known_view_ids.add(v));
    this._views_cache.clear();
    this._views_cache.set(cached_entry, cached_entry_view);
    this._sync_cache_state();
    this._set_current_version(cached_version);
    this._log(`boot cache hit entry='${cached_entry}' version=${cached_version}`);
    await this.render_view(cached_entry);
    return true;
  }

  _apply_server_get_app(res: ServerGetAppRes) {
    if (!is_obj(res) || !is_obj(res._app)) {
      throw new Error("Invalid get-app response");
    }

    const next_app = res._app as ServerXVMApp;
    const next_version = this._get_version_from_app(next_app);
    const next_view_ids = this._normalize_view_ids(res._view_ids);

    this._app = next_app;
    this._known_view_ids.clear();
    next_view_ids.forEach((v) => this._known_view_ids.add(v));
    this._flows.clear();

    if (res._flows && typeof res._flows === "object") {
      for (const key of Object.keys(res._flows)) {
        this._flows.set(
          key,
          res._flows[key]
        );
      }
    }
    this._bump_version_if_newer(next_version, "get-app");
    this._persist_cached_app(this._app, next_view_ids, next_version);
    this._app_needs_refresh = true;
    return {
      _accepted: true,
      _version: next_version,
      _view_ids: next_view_ids,
    };
  }

  async _apply_server_view_payload(res: ServerGetViewRes, source: string) {
    if (!is_obj(res) || !is_obj(res._view) || typeof (res as any)._view._id !== "string") {
      throw new Error(`Invalid ${source} response`);
    }

    const view_id = String((res as any)._view._id);
    const next_version = Number.isFinite(res._version) ? Number(res._version) : this._current_version;
    this._views_cache.set(view_id, res._view);
    this._emit_view_cache_updated(view_id);
    this._known_view_ids.add(view_id);
    this._persist_cached_view(view_id, res._view);
    this._sync_cache_state();
    this._app_needs_refresh = true;

    this._bump_version_if_newer(next_version, source);

    return { _accepted: true, _view_id: view_id, _version: next_version };
  }

  _pending_structured_edit_for_update(upd: ServerUpdateEvt) {
    const meta = is_obj(upd._meta) ? upd._meta : {};
    const action = typeof meta._edit_action === "string" ? meta._edit_action.trim() : "";
    const target_id = typeof meta._target_id === "string" ? meta._target_id.trim() : "";

    if (action) {
      const pending = this._consume_pending_structured_view_edit(upd._view_id, action);
      if (pending) return pending;
      return {
        _view_id: upd._view_id,
        _action: action,
        _target_id: target_id,
        _created_at: Date.now(),
      };
    }

    return this._consume_pending_structured_view_edit_for_view(upd._view_id);
  }

  async _handle_xvm_update_payload(payload: any, source_evt: string) {
    try {
      const evt_payload = this._normalize_event_payload(payload);

      if (!is_obj(evt_payload)) {
        return {
          _accepted: false,
          _reason: "invalid payload",
        };
      }

      if (evt_payload._app_id !== this._app_id || evt_payload._env !== this._env) {
        return {
          _accepted: false,
          _reason: "scope mismatch",
          _app_id: evt_payload._app_id,
          _env: evt_payload._env,
        };
      }

      if (typeof evt_payload._view_id !== "string" || !is_obj(evt_payload._view)) {
        return {
          _accepted: false,
          _reason: "invalid view update",
        };
      }

      const upd = evt_payload as ServerUpdateEvt;
      const next_version = Number.isFinite(upd._version) ? Number(upd._version) : 0;
      const update_meta = is_obj(upd._meta) ? upd._meta : {};
      const force_current_refresh =
        update_meta._source === "xstudio:intent-action-refresh" &&
        update_meta._force_refresh === true &&
        next_version > 0 &&
        next_version === this._current_version;

      if (next_version > 0 && !force_current_refresh && !this._should_accept_push_version(next_version, source_evt)) {
        return {
          _accepted: false,
          _reason: "stale version",
          _view_id: upd._view_id,
          _version: next_version,
        };
      }

      const pending_structured_edit = this._pending_structured_edit_for_update(upd);

      this._views_cache.set(upd._view_id, upd._view);
      this._emit_view_cache_updated(upd._view_id);
      this._known_view_ids.add(upd._view_id);
      this._persist_cached_view(upd._view_id, upd._view);
      this._sync_cache_state();

      if (next_version > 0) {
        this._set_current_version(next_version);
        XDB.saveString(this._cache_key_version, String(next_version));
      }

      this._xstudio.handle_xvm_update(upd);

      this._log(
        `update applied source='${source_evt}' view='${upd._view_id}' version=${next_version || this._current_version} active='${this._current_view_id}'`
      );

      if (await this._rerender_edit_mode_after_view_update(upd, pending_structured_edit ?? undefined)) {
        return {
          _accepted: true,
          _rerendered: true,
          _view_id: upd._view_id,
          _version: next_version || this._current_version,
        };
      }

      if (this._current_view_id === upd._view_id || this._app_view_id === upd._view_id) {
        const live_obj = XUI.getObject(upd._view_id) as any;

        if (live_obj && typeof live_obj.update === "function") {
          this._log("live view update via XUIObject.update", {
            _view_id: upd._view_id,
            _version: next_version || this._current_version,
          });

          live_obj.update(upd._view);
          (XVM as any).registerRawView?.(upd._view);
          this._app_needs_refresh = false;
          this._current_view_id = upd._view_id;
          this._app_view_id = upd._view_id;

          if (this._on_view_rendered) this._on_view_rendered(upd._view_id);
          await _xem.fire(EVT_XVM_VIEW_RENDERED, {
            _view_id: upd._view_id,
            _app_id: this._app_id,
            _env: this._env,
          });
          return {
            _accepted: true,
            _rerendered: false,
            _patched: true,
            _view_id: upd._view_id,
            _version: next_version || this._current_version,
          };
        }

        this._log("live view update fallback rerender", {
          _view_id: upd._view_id,
          _version: next_version || this._current_version,
        });
        (XVM as any).registerRawView?.(upd._view);
        this._app_needs_refresh = true;
        await this.render_view(upd._view_id);
        return {
          _accepted: true,
          _rerendered: true,
          _view_id: upd._view_id,
          _version: next_version || this._current_version,
        };
      }

      return {
        _accepted: true,
        _rerendered: false,
        _view_id: upd._view_id,
        _version: next_version || this._current_version,
      };
    } catch (err) {
      this._error("update handler failed", err);
      return {
        _accepted: false,
        _reason: "handler failed",
        _error: to_err(err),
      };
    }
  }

  _bind_events() {
    if (this._bound) return;
    this._bound = true;

    _xem.on("wormhole-open", () => {
      this._set_connection_status("connected", "wormhole-open");
    });

    _xem.on("wormhole-close", () => {
      this._set_connection_status("disconnected", "wormhole-close");
    });

    _xem.on("wormhole-error", () => {
      this._set_connection_status("error", "wormhole-error");
    });

    _xem.on(EVT_XVM_UPDATE, (payload: any) => {
      void this._handle_xvm_update_payload(payload, EVT_XVM_UPDATE);
    });

    this._xstudio.bind_events();

  }

  async bootstrap() {
    this._bind_events();
    const used_cache = await this._render_cached_boot_view();

    try {
      this._ensure_connected();
      await this._wait_for_wormhole_open();

      const params: any = {
        _env: this._env,
        _include_views: false,
        _include_flows: true,
      };

      if (
        typeof this._app_id === "string" &&
        this._app_id.trim().length > 0
      ) {
        params._app_id = this._app_id;
      }

      const out = (await this._send_cmd(
        "get-app",
        params
      )) as ServerGetAppRes;
      const app_apply = this._apply_server_get_app(out);

      const entry = this._pick_entry_view_id(this._app, app_apply._view_ids);

      if (!entry) {
        throw new Error("Server app has no entry view");
      }

      const ordered_view_ids = this._ordered_view_ids(entry, app_apply._view_ids);
      this._log("bootstrap hydrate views", {
        _count: ordered_view_ids.length,
        _entry: entry,
      });
      for (const view_id of ordered_view_ids) {
        await this._fetch_view_from_server(view_id, "bootstrap-hydrate");
      }
      const entry_apply = { _accepted: true };

      if (entry_apply._accepted || this._current_view_id !== entry) {
        await this.render_view(entry);
      }

      await this._send_cmd("subscribe", { _app_id: this._app_id, _env: this._env });
      this._subscribed = true;
      this._set_connection_status("connected", "subscribe");
      this._log(
        `boot complete cache=${used_cache ? "yes" : "no"} server_version=${app_apply._version || 0} current=${this._current_version} entry='${entry}'`
      );
    } catch (err) {
      const msg = to_err(err);
      this._set_connection_status("error", "bootstrap");
      this._error(msg);
      if (this._on_error) this._on_error(err);
      if (!this._has_rendered_view) {
        await XVM.app(this._create_offline_app(msg) as any);
      } else {
        this._log("offline: using cached rendered view");
      }
    }
  }

  get_view(view_id: string): Record<string, any> | null {
    if (!view_id) return null;
    return this._views_cache.get(view_id) ?? null;
  }

  get_current_view(): Record<string, any> | null {
    if (!this._current_view_id) return null;
    return this.get_view(this._current_view_id);
  }

  async sendXcmd(xcmd: any) {
    return await Wormholes.sendXcmd(xcmd);
  }

  isWormholeReady() {
    return Wormholes._ready === true && this._connected === true;
  }

  isServerReady() {
    return this.isWormholeReady() && this._subscribed === true;
  }


  async load_server_app(app_id: string, env = this._env, opts: XVMClientLoadServerAppOptions = {}) {
    const target_app_id = typeof app_id === "string" ? app_id.trim() : "";
    if (!target_app_id) {
      throw new Error("xvm.load_server_app: missing app_id");
    }

    const target_env = typeof env === "string" && env.trim() ? env.trim() : "default";
    const target_edit_mode = this._resolve_edit_mode(target_app_id, opts._edit);
    const previous_app_id = this._app_id;
    const previous_env = this._env;
    let stage = "requested";

    this._log("load_server_app requested", {
      _app_id: target_app_id,
      _env: target_env,
      _edit: target_edit_mode,
      _current_app_id: previous_app_id,
      _current_env: previous_env,
    });

    try {
      stage = "get-app";
      const out = await this._send_cmd("get-app", {
        _app_id: target_app_id,
        _env: target_env,
        _include_views: false,
        _include_flows: true,
      }) as ServerGetAppRes;

      if (!is_obj(out) || !is_obj(out._app)) {
        throw new Error("Invalid get-app response");
      }

      const target_app = out._app as ServerXVMApp;
      const target_view_ids = this._normalize_view_ids(out._view_ids);
      const target_entry = this._pick_entry_view_id(target_app, target_view_ids);

      this._log("load_server_app get-app result summary", {
        _app_id: target_app._app_id,
        _env: target_app._env,
        _version: target_app?._meta?._version,
        _view_ids_count: target_view_ids.length,
        _flows_count: is_obj(out._flows) ? Object.keys(out._flows).length : 0,
      });

      if (!target_entry) {
        throw new Error("Server app has no entry view");
      }

      this._log("load_server_app entry selected", {
        _app_id: target_app_id,
        _env: target_env,
        _entry_view_id: target_entry,
      });

      stage = "commit-state";
      this._set_app_scope(target_app_id, target_env, target_edit_mode);
      this._reset_app_state_for_switch();

      const app_apply = this._apply_server_get_app(out);
      const entry = this._pick_entry_view_id(this._app, app_apply._view_ids);

      if (!entry) {
        throw new Error("Server app has no entry view");
      }

      stage = "hydrate";
      const ordered_view_ids = this._ordered_view_ids(entry, app_apply._view_ids);
      for (const view_id of ordered_view_ids) {
        await this._fetch_view_from_server(view_id, "load-server-app");
      }
      this._log("load_server_app hydrated views", {
        _app_id: target_app_id,
        _env: target_env,
        _entry_view_id: entry,
        _count: ordered_view_ids.length,
      });

      stage = "reset-runtime";
      (XVM as any).resetAppRuntime?.();

      stage = "mount";
      await this._mount_runtime_app();
      this._log("load_server_app mounted", {
        _app_id: target_app_id,
        _env: target_env,
        _edit: target_edit_mode,
        _entry_view_id: entry,
      });

      stage = "render";
      await this.render_view(entry);

      stage = "subscribe";
      await this._send_cmd("subscribe", { _app_id: target_app_id, _env: target_env });
      this._subscribed = true;
      this._set_connection_status("connected", "load-server-app");
      this._log("load_server_app subscribed", {
        _app_id: target_app_id,
        _env: target_env,
      });

      this._log("load_server_app completed", {
        _app_id: target_app_id,
        _env: target_env,
        _edit: target_edit_mode,
        _entry_view_id: entry,
      });

      return { _ok: true, _app_id: target_app_id, _env: target_env, _edit: target_edit_mode, _entry_view_id: entry };
    } catch (err) {
      this._log_load_server_app_failure(stage, target_app_id, target_env, previous_app_id, previous_env, err);
      throw err;
    }
  }
}

export default XVMClient;
