// ============================================================================
// xpell-ui/src/index.ts
// - Explicit core exports to avoid collisions
// - xpell-ui overrides `_xem` with DOM-adapted XEventManager
// - Clean Wormholes surface (v1 + v2 + facade)
// ============================================================================

/**
 * Xpell — Real-Time User Interface Platform
 * TypeScript Edition
 *
 * Library entry point for xpell-ui.
 */

/* -------------------------------------------------------------------------- */
/* Core exports (SAFE + deterministic)                                        */
/* -------------------------------------------------------------------------- */

// 1) Export core TYPES only (safe)
export type {
  XValue,
  IXData,
  XObjectData,
  XDataXporter,
  XDataXporterHandler,
  XObjectOnEventIndex,
  XObjectOnEventHandler,
  XEventListener,
  XEventListenerOptions,
  XNanoCommandPack,
  XNanoCommand,
  XCommandData,
  XModuleData,
  XErrorOptions,
  XErrorLevel,
  XErrorMeta,
  XResponseData,
  XFrameScheduler,
  XpellSkill,
  XpellSkillType,
  XpellSkillCommand,
  XpellSkillModule,
  XArtifactIntent,
  XArtifactValidationResult,
  XArtifactStrategy
} from "@xpell/core";

// 2) (Optional) default export — keep only if intentional
export { default as XpellCore } from "@xpell/core";


// 3) Explicit core runtime exports (exclude core XEM)
export {
  Xpell,
  _x,
  XUtils,
  _xu,
  XData,
  _xd,
  _XData,
  XParser,
  XCommand,
  XLogger,
  _xlog,
  _XLogger,
  XModule,
  XObject,
  XObjectPack,
  XObjectManager,
  XParams,
  XError,
  XD_FRAME_NUMBER,
  XD_FPS,
  XpellEngine,
  XResponse,
  XResponseOK,
  XResponseError,
  
} from "@xpell/core";



/* -------------------------------------------------------------------------- */
/* Wormholes (v1 + v2 + facade)                                               */
/* -------------------------------------------------------------------------- */

// Re-export only the public UI surface (avoid exporting *everything)
export type {
  WormholesOpenOptions,
  WormholesClientAPI,
  WHEnvelope,
  WHKind,
  WHEventPayload,
  XCmd,
} from "./Wormholes/wh.types";

export {
  // helpful for advanced users / debugging
  parseEnvelope,
  stringifyEnvelope,
  makeEnvelope,
  makeHello,
  makeAuth,
  makeReq,
  makeEvt,
} from "./Wormholes/wh.codec";

// Implementations (explicit)
export { default as WormholesV1 } from "./Wormholes/Wormholes.v1";
export { default as WormholesV2 } from "./Wormholes/Wormholes.v2";

// Facade (default export = singleton instance)
// NOTE: This file should export:
//  - default Wormholes (singleton)
//  - export { Wormholes } (named singleton) optional
//  - export class WormholesFacade (class)
export { default as Wormholes } from "./Wormholes/Wormholes";
export { WormholesFacade } from "./Wormholes/Wormholes";


/* -------------------------------------------------------------------------- */
/* XUI (renderer)                                                             */
/* -------------------------------------------------------------------------- */

export { XUI, XUI as _xui, XUIModule } from "./XUI/XUI";
export { XUIObject } from "./XUI/XUIObject";
export type { XUIObjectData, XUIFlowDef } from "./XUI/XUIObject";

export * from "./XUI/CoreObjects/index";

export { XUIAnimate, _AnimateCSS } from "./XUI/XUIAnimations";

/* -------------------------------------------------------------------------- */
/* XVM (SPA runtime)                                                          */
/* -------------------------------------------------------------------------- */

export { XVM, _xvm } from "./XVM/XVM";
export type {
  XVMApp,
  XVMRouteSpec,
  XVMRegionSpec,
  XVMContainerSpec,
  XVMViewFactory,
  RegionConfig,
  NavigateOptions,
  ShowOptions,
  CloseOptions,
} from "./XVM/XVM";
export { XVMClient } from "./XVM/XVMClient";
export type { XVMClientOptions, XVMClientConnectionChange } from "./XVM/XVMClient";
export type { XVMView, XVMViewData, XVMViewPack, XVMViewResolver } from "./XVM/XVMView";

/* -------------------------------------------------------------------------- */
/* XStudio                                                                    */
/* -------------------------------------------------------------------------- */

export { XStudioModule, showObjectPalette } from "./XStudio/XStudioModule";
export type { XStudioObjectPaletteOptions } from "./XStudio/XStudioModule";
export { _XD_KEYS } from "./XStudio/XStudioTypes";
export type {
  ServerGetViewRes,
  ServerListFlowsRes,
  ServerListGeneratedModulesRes,
  ServerListViewsRes,
  VibeGenerationState,
} from "./XStudio/XStudioTypes";

/* -------------------------------------------------------------------------- */
/* XDB                                                                        */
/* -------------------------------------------------------------------------- */

export { XDB, XDB as _xdb, XDBClient as _XDataBase } from "./XDB/XDBClient";

/* -------------------------------------------------------------------------- */
/* XAuth                                                                      */
/* -------------------------------------------------------------------------- */

export {
  XAuthClient,
  XAuth,
  _xauth,
  AUTH_SESSION_KEY,
  AUTH_XD_KEYS,
} from "./XAuth/XAuthClient";

export type {
  AuthXDataKey,
  XAuthSession,
  XAuthResult,
} from "./XAuth/XAuthClient";

/* -------------------------------------------------------------------------- */
/* XEM (UI adapter overrides core exports)                                    */
/* -------------------------------------------------------------------------- */

export { XEventManager, XEventManager as _xem } from "./XEM/XEventManager";

export { FlowManagerClient, XFM, _xfm } from "./XFM/FlowManagerClient";
export { XUIRuntime ,type XUIRuntimeOptions, type XUIRuntimeAppOptions} from "./XUI/XUIRuntime";
export * from "./XUI/CoreObjects/index";
