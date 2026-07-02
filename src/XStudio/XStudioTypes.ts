export const _XD_KEYS = {
  XVM_APP_ID: "xvm:current_app_id",
  XVM_ENV: "xvm:current_env",
  STUDIO_GENERATION_ID: "studio:generation_id",
  STUDIO_GENERATION_STATE: "studio:generation_state",
  STUDIO_GENERATION_STATUS: "studio:generation_status",
  STUDIO_GENERATION_ERROR: "studio:generation_error",
  STUDIO_STATUS: "studio:status",
  STUDIO_JSON: "studio:json",
  STUDIO_SELECTED_MODULE: "studio:selected_module",
  STUDIO_MODULE_SOURCE: "studio:module_source",
  STUDIO_MODULE_REPAIR_PROMPT: "studio:module_repair_prompt",
  STUDIO_RUN_INSPECTOR: "studio:run_inspector",
  STUDIO_SELECTED_OBJECT: "studio:selected_object",
  STUDIO_SELECTED_OBJECT_INSPECTOR_DRAFT: "studio:selected_object_inspector:draft",
  STUDIO_SELECTED_OBJECT_DRAFT_TEXT: "studio:selected_object_inspector:_text",
  STUDIO_SELECTED_OBJECT_DRAFT_CLASS: "studio:selected_object_inspector:_class",
  STUDIO_SELECTED_OBJECT_DRAFT_STYLE_PROPERTY: "studio:selected_object_inspector:_style_property",
  STUDIO_SELECTED_OBJECT_DRAFT_STYLE_VALUE: "studio:selected_object_inspector:_style_value",
  STUDIO_SELECTED_OBJECT_DRAFT_DISABLED: "studio:selected_object_inspector:disabled",
  STUDIO_SELECTED_OBJECT_DRAFT_PLACEHOLDER: "studio:selected_object_inspector:placeholder",
  STUDIO_SELECTED_OBJECT_RAW_JSON: "studio:selected_object:raw_json",
  STUDIO_VIEWS: "studio:views",
  STUDIO_FLOWS: "studio:flows",
  STUDIO_MODULES: "studio:modules",
};

export type ServerGetViewRes = {
  _app_id: string;
  _env: string;
  _version?: number;
  _view: Record<string, any>;
};

export type ServerListViewsRes = {
  _views?: any[];
};

export type ServerListFlowsRes = {
  _flows?: any[];
};

export type ServerListEntitiesRes = {
  _entities?: any[];
};

export type ServerListGeneratedModulesRes = {
  _modules?: any[];
};

export type VibeGenerationState = "idle" | "pending" | "running" | "completed" | "failed";

export const is_obj = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null && !Array.isArray(v);

export const to_err = (e: any) => {
  if (e instanceof Error) return e.message || String(e);
  if (typeof e === "string") return e;
  if (is_obj(e)) {
    const maybe = (e as any)._error ?? (e as any).error ?? (e as any)._result ?? e;
    if (maybe instanceof Error) return maybe.message || String(maybe);
    if (typeof maybe?.message === "string") return maybe.message;
    try {
      return JSON.stringify(maybe);
    } catch {
      return String(maybe);
    }
  }
  return String(e);
};
