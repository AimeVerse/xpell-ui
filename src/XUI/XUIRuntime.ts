import { _x, _xlog } from "@xpell/core";

import { XUI } from "./XUI";
import { XVM } from "../XVM/XVM";
import { XFM } from "../XFM/FlowManagerClient";
import { XVMClient, type XVMClientOptions } from "../XVM/XVMClient";
import { EntityClient } from "../XDB/EntityClient";
import { XDBClientModule } from "../XDB/XDBModule";
import { XAuth } from "../XAuth/XAuthClient";
import {XStudioModule} from "../XStudio/XStudioModule";
import {_xai} from "../XAI/XAIClient";

/* -------------------------------------------------------------------------- */

export type XUIRuntimeOptions = {
  _auto_start?: boolean;
  _load_flow?: boolean;
  _load_xvm?: boolean;
  _load_auth_client?: boolean;
  _load_entity_client?: boolean;
  _load_studio?: boolean;
  _load_xai_client?: boolean;
};

export type XUIRuntimeAppOptions = XVMClientOptions & {
  _runtime?: XUIRuntimeOptions;
  _object_packs?: any[];
  _modules?: any[];
  _debug?: boolean;
};

/* -------------------------------------------------------------------------- */

export class XUIRuntime {
  private static _client: XVMClient | null = null;
  // TODO: client apps should provide /favicon.ico or a favicon link in their HTML shell.

  /* ---------------------------------------------------------------------- */
  /* LOAD MODULES                                                           */
  /* ---------------------------------------------------------------------- */



  static async loadModules(opts: XUIRuntimeOptions = {}) {
    const {
      _auto_start: auto_start = true,
      _load_flow: load_flow = true,
      _load_xvm: load_xvm = true,
      _load_auth_client: load_auth_client = true,
      _load_entity_client: load_entity_client = true,
      _load_studio: load_studio = true,
      _load_xai_client: load_xai_client = true
    } = opts;

    await _x.loadModuleAsync(XUI);
    await _x.loadModuleAsync(new XDBClientModule());

    if (load_auth_client) {
      await _x.loadModuleAsync(XAuth);
    }

    if (load_xvm) {
      await _x.loadModuleAsync(XVM);
    }

    if (load_flow) {
      await _x.loadModuleAsync(XFM);
    }

    if (load_entity_client) {
      await _x.loadModuleAsync(new EntityClient());
    }

    if (load_studio) {
      await _x.loadModuleAsync(new XStudioModule());
    }

    if (load_xai_client) {
      await _x.loadModuleAsync(_xai);
    }

    if (auto_start) {
      _x.start();
    }
  }

  /* ---------------------------------------------------------------------- */
  /* LOAD APP                                                               */
  /* ---------------------------------------------------------------------- */

  static async loadApp(opts: XUIRuntimeAppOptions) {
    if (!opts?._app_id) throw new Error("Missing app_id");
    if (!opts?._wormhole_url) throw new Error("Missing wormhole_url");

    /* -------------------------------------------------------------- */
    /* 1. Load modules                                                */
    /* -------------------------------------------------------------- */

    await this.loadModules(opts._runtime);

    if (Array.isArray(opts._modules)) {

      for (const mod of opts._modules) {

        await _x.loadModuleAsync(mod);

      }

    }
    const xui = _x.getModule("xui");



    if (Array.isArray(opts._object_packs)) {
      for (const pack of opts._object_packs) {
        if(opts._debug) _xlog.debug("[XUIRuntime] Importing object pack", pack.getObjects());
        xui.importObjectPack(pack);
      }
    }

    /* -------------------------------------------------------------- */
    /* 2. Create XVM client                                           */
    /* -------------------------------------------------------------- */

    const client = new XVMClient({
      _app_id: opts._app_id,
      _env: opts._env ?? "default",
      _wormhole_url: opts._wormhole_url,

      _region: opts._region,
      _fallback_view_id: opts._fallback_view_id,

      onViewRendered: opts.onViewRendered,
      onConnectionChange: opts.onConnectionChange,
      onError: opts.onError,
      onAppMounted: opts.onAppMounted,
      _theme: opts._theme,
      _debug: opts._debug === true,
    });

    this._client = client;
    if (typeof window !== "undefined") {
      (window as any).__xvm_client = client;
    }

    /* -------------------------------------------------------------- */
    /* 3. Bootstrap app                                               */
    /* -------------------------------------------------------------- */

    await client.bootstrap();

    return client;
  }

  /* ---------------------------------------------------------------------- */
  /* GET CLIENT                                                             */
  /* ---------------------------------------------------------------------- */

  static getClient(): XVMClient | null {
    return this._client;
  }

  static requireClient(): XVMClient {
    if (!this._client) {
      throw new Error("[xui-runtime] XVMClient not initialized");
    }
    return this._client;
  }
}

export default XUIRuntime;
