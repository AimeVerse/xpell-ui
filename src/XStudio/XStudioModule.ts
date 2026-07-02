import {
  XModule,
  type XpellSkill,
  type XpellSkillCommand,
} from "@xpell/core";
import { _xd, _xlog, XUtils as _xu } from "@xpell/core";

import { _xem } from "../XEM/XEventManager";
import Wormholes from "../Wormholes/Wormholes";
import { XUI } from "../XUI/XUI";
import { XVM, type XVMApp } from "../XVM/XVM";
import {
  create_studio_editor_view,
  studio_editor_views,
} from "./XSEditor";
import conversation_view from "./views/conversation.json";
import object_tree_view from "./views/object-tree.json";
import selected_object_inspector_view from "./views/selected-object-inspector.json";
import shell_view from "./views/shell.json";
import topbar_view from "./views/topbar.json";
import {
  _XD_KEYS,
  is_obj,
  to_err,
  type ServerGetViewRes,
  type ServerListEntitiesRes,
  type ServerListFlowsRes,
  type ServerListGeneratedModulesRes,
  type ServerListViewsRes,
  type VibeGenerationState,
} from "./XStudioTypes";

const LOG = "[xstudio]";
const VIBE_LOG = "[vibe-client]";
const STUDIO_VIEW_ID = "xstudio-editor";
const STUDIO_REGION_ID = "studio";
const STUDIO_CONTAINER_ID = "region-studio";
const STUDIO_SHELL_ID = "xstudio-shell";
const STUDIO_TOPBAR_ID = "xstudio-topbar";
const STUDIO_CANVAS_ID = "xstudio-canvas";
const STUDIO_TOGGLE_LEFT_DOCK_ID = "xstudio-toggle-left-dock";
const STUDIO_TOGGLE_RIGHT_DOCK_ID = "xstudio-toggle-right-dock";
const STUDIO_APP_EXPLORER_PORTLET_ID = "xstudio-app-explorer-portlet";
const STUDIO_APP_EXPLORER_BODY_ID = "xstudio-app-explorer-body";
const STUDIO_APP_EXPLORER_RESULTS_ID = "xstudio-app-explorer-results";
const STUDIO_APP_EXPLORER_SECTION_TOGGLE_ID = "xstudio-app-explorer-section-toggle";
const STUDIO_APP_EXPLORER_ADD_VIEW_BUTTON_ID = "xstudio-app-explorer-add-view";
const STUDIO_APP_EXPLORER_ADD_VIEW_DIALOG_ID = "xstudio-add-view-dialog";
const STUDIO_APP_EXPLORER_ADD_VIEW_ID_INPUT_ID = "xstudio-add-view-id";
const STUDIO_APP_EXPLORER_ADD_VIEW_TITLE_INPUT_ID = "xstudio-add-view-title";
const STUDIO_APP_EXPLORER_ADD_VIEW_TEMPLATE_SELECT_ID = "xstudio-add-view-template";
const STUDIO_APP_EXPLORER_ADD_VIEW_ERROR_ID = "xstudio-add-view-error";
const STUDIO_APP_EXPLORER_ADD_VIEW_CANCEL_ID = "xstudio-add-view-cancel";
const STUDIO_APP_EXPLORER_ADD_VIEW_CREATE_ID = "xstudio-add-view-create";
const STUDIO_OBJECT_PALETTE_DIALOG_ID = "xstudio-object-palette-dialog";
const STUDIO_OBJECT_PALETTE_SEARCH_ID = "xstudio-object-palette-search";
const STUDIO_OBJECT_PALETTE_RESULTS_ID = "xstudio-object-palette-results";
const STUDIO_OBJECT_PALETTE_CLOSE_ID = "xstudio-object-palette-close";
const STUDIO_OBJECT_TREE_PORTLET_ID = "xstudio-object-tree-portlet";
const STUDIO_OBJECT_TREE_ID = "xstudio-object-tree";
const STUDIO_OBJECT_TREE_BODY_ID = "xstudio-object-tree-body";
const STUDIO_OBJECT_TREE_RESULTS_ID = "xstudio-object-tree-results";
const STUDIO_OBJECT_TREE_SEARCH_ID = "xstudio-object-tree-search";
const STUDIO_OBJECT_TREE_SECTION_TOGGLE_ID = "xstudio-object-tree-section-toggle";
const STUDIO_SELECTED_OBJECT_PANEL_ID = "xstudio-selected-object-panel";
const STUDIO_SELECTED_OBJECT_JSON_ID = "xstudio-selected-object-json";
const STUDIO_SELECTED_OBJECT_FIELDS_CONTAINER_ID = "xstudio-selected-object-fields-container";
const STUDIO_SELECTED_OBJECT_SAVE_FIELDS_ID = "xstudio-selected-object-save-fields";
const STUDIO_SELECTED_OBJECT_CANCEL_FIELDS_ID = "xstudio-selected-object-cancel-fields";
const STUDIO_SELECTED_OBJECT_MOVE_UP_ID = "xstudio-selected-object-move-up";
const STUDIO_SELECTED_OBJECT_MOVE_DOWN_ID = "xstudio-selected-object-move-down";
const STUDIO_SELECTED_OBJECT_DUPLICATE_ID = "xstudio-selected-object-duplicate";
const STUDIO_SELECTED_OBJECT_DELETE_REQUEST_ID = "xstudio-selected-object-delete-request";
const STUDIO_SELECTED_OBJECT_DELETE_DIALOG_ID = "xstudio-selected-object-delete-dialog";
const STUDIO_SELECTED_OBJECT_DELETE_TYPE_ID = "xstudio-selected-object-delete-type";
const STUDIO_SELECTED_OBJECT_DELETE_NAME_ID = "xstudio-selected-object-delete-name";
const STUDIO_SELECTED_OBJECT_DELETE_CANCEL_ID = "xstudio-selected-object-delete-cancel";
const STUDIO_SELECTED_OBJECT_DELETE_CONFIRM_ID = "xstudio-selected-object-delete-confirm";
const STUDIO_OBJECT_TREE_DUPLICATE_DIALOG_ID = "xstudio-object-tree-duplicate-dialog";
const STUDIO_OBJECT_TREE_DUPLICATE_LABEL_ID = "xstudio-object-tree-duplicate-label";
const STUDIO_OBJECT_TREE_DUPLICATE_TYPE_ID = "xstudio-object-tree-duplicate-type";
const STUDIO_OBJECT_TREE_DUPLICATE_JSON_ID = "xstudio-object-tree-duplicate-json-id";
const STUDIO_OBJECT_TREE_DUPLICATE_CANCEL_ID = "xstudio-object-tree-duplicate-cancel";
const STUDIO_OBJECT_TREE_DUPLICATE_CONFIRM_ID = "xstudio-object-tree-duplicate-confirm";
const STUDIO_SELECTED_OBJECT_UPDATE_JSON_ID = "xstudio-selected-object-update-json";
const STUDIO_SELECTED_OBJECT_RESET_JSON_ID = "xstudio-selected-object-reset-json";
const STUDIO_SELECTED_OBJECT_PROPERTIES_PORTLET_ID = "xstudio-selected-object-properties-portlet";
const STUDIO_SELECTED_OBJECT_PROPERTIES_BODY_ID = "xstudio-selected-object-properties-body";
const STUDIO_SELECTED_OBJECT_PROPERTIES_SECTION_TOGGLE_ID = "xstudio-selected-object-properties-section-toggle";
const STUDIO_SELECTED_OBJECT_INTERACTIONS_SECTION_ID = "xstudio-selected-object-interactions-section";
const STUDIO_SELECTED_OBJECT_INTERACTIONS_BODY_ID = "xstudio-selected-object-interactions-body";
const STUDIO_SELECTED_OBJECT_INTERACTIONS_SECTION_TOGGLE_ID = "xstudio-selected-object-interactions-section-toggle";
const STUDIO_SELECTED_OBJECT_RAW_SECTION_ID = "xstudio-selected-object-raw-section";
const STUDIO_SELECTED_OBJECT_RAW_BODY_ID = "xstudio-selected-object-raw-body";
const STUDIO_SELECTED_OBJECT_RAW_SECTION_TOGGLE_ID = "xstudio-selected-object-raw-section-toggle";
const STUDIO_SELECTED_OBJECT_DANGER_SECTION_ID = "xstudio-selected-object-danger-section";
const STUDIO_SELECTED_OBJECT_DANGER_BODY_ID = "xstudio-selected-object-danger-body";
const STUDIO_SELECTED_OBJECT_DANGER_SECTION_TOGGLE_ID = "xstudio-selected-object-danger-section-toggle";
const STUDIO_SELECTED_OBJECT_ROW_CLASS = "xstudio-object-tree-row-selected";
const STUDIO_SELECTED_CANVAS_CLASS = "xstudio-selected-object";
const STUDIO_THEME_DEFAULT = "dark";
const STUDIO_THEME_SELECTOR_ID = "xstudio-theme-selector";
const STUDIO_THEME_CLASS_PREFIX = "xstudio-theme-";
const STUDIO_THEME_OPTIONS = ["terminal", "dark", "light"] as const;
const STUDIO_RUNTIME_SECTION_ID = "xstudio-runtime-section";
const STUDIO_CONVERSATION_SECTION_ID = "xstudio-conversation-section";
const STUDIO_CONVERSATION_TITLE_ID = "xstudio-conversation-title";
const STUDIO_CONVERSATION_SELECTOR_ID = "xstudio-conversation-selector";
const STUDIO_CONVERSATION_MESSAGES_ID = "xstudio-conversation-messages";
const STUDIO_CONVERSATION_INPUT_ID = "xstudio-conversation-input";
const STUDIO_CONVERSATION_SEND_BUTTON_ID = "xstudio-conversation-send-button";
const STUDIO_CONVERSATION_INPUT_XD_KEY = "studio:conversation_input";
const STUDIO_CONVERSATION_LAST_MESSAGES_LIMIT = 100;
const STUDIO_INTENT_ACTION_STATUS_SUGGESTED = "suggested";
const STUDIO_INTENT_ACTION_STATUS_DISMISSED = "dismissed";
const STUDIO_INTENT_ACTION_STATUS_RUNNING = "running";
const STUDIO_INTENT_ACTION_STATUS_DONE = "done";
const STUDIO_INTENT_ACTION_STATUS_FAILED = "failed";
const STUDIO_INTENT_ACTION_UNSUPPORTED_MESSAGE = "Execution not supported yet.";
const STUDIO_SUPPORTED_INTENT_APPLY_VIEW_EDIT_ACTIONS = new Set([
  "hide-object",
  "show-object",
  "remove-object",
  "duplicate-object",
]);
const STUDIO_INTENT_APPLY_VIEW_EDIT_REFRESH_ACTIONS = new Set([
  "hide-object",
  "show-object",
  "remove-object",
  "duplicate-object",
  "add-child",
  "move-object",
]);
const STUDIO_RUNTIME_INSPECTOR_SECTION_ID = "xstudio-runtime-inspector-section";
const STUDIO_JSON_SECTION_ID = "xstudio-json-section";
const STUDIO_MODULES_SECTION_ID = "xstudio-generated-modules-section";
const STUDIO_PORTLET_TOGGLE_ACTIVE_CLASS = "xstudio-portlet-toggle-active";
const STUDIO_PORTLET_HIDDEN_CLASS = "xstudio-portlet-hidden";
const STUDIO_EXPLORER_SECTION_COLLAPSED_CLASS = "xstudio-explorer-section-collapsed";
const STUDIO_OBJECT_TREE_CHILD_CONTAINER_FALLBACK_TYPES = new Set([
  "view",
  "stack",
  "grid",
  "form",
  "svg",
]);
const STUDIO_OBJECT_TREE_CHILD_LEAF_TYPES = new Set([
  "label",
  "button",
  "link",
  "input",
  "text",
  "password",
  "textarea",
  "select",
  "image",
  "video",
  "webcam",
  "style-sheet",
  "xvm-view",
  "circle",
  "rect",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
]);
type XStudioTheme = typeof STUDIO_THEME_OPTIONS[number];
type XStudioPortletId = "selected" | "prompt" | "conversation" | "runtime" | "inspector" | "json" | "modules";
type XStudioExplorerSectionId = "app_explorer" | "object_tree" | "properties" | "interactions" | "raw_json" | "danger";
type XStudioSelectedObjectInspectorSectionId = "properties" | "interactions" | "raw_json" | "danger";
type XStudioAppExplorerArtifactType = "view" | "flow" | "entity" | "module";
type XStudioAppExplorerCategoryId = "views" | "flows" | "entities" | "modules";
type XStudioAppExplorerSectionId = "app" | XStudioAppExplorerCategoryId;

const STUDIO_PORTLETS: Record<XStudioPortletId, {
  _object_id: string;
  _button_id?: string;
  _label: string;
}> = {
  selected: {
    _object_id: STUDIO_SELECTED_OBJECT_PANEL_ID,
    _label: "Selected Object",
  },
  prompt: {
    _object_id: STUDIO_VIEW_ID,
    _button_id: "xstudio-portlet-toggle-prompt",
    _label: "Prompt",
  },
  conversation: {
    _object_id: STUDIO_CONVERSATION_SECTION_ID,
    _button_id: "xstudio-portlet-toggle-conversation",
    _label: "Conversation",
  },
  runtime: {
    _object_id: STUDIO_RUNTIME_SECTION_ID,
    _button_id: "xstudio-portlet-toggle-runtime",
    _label: "Runtime",
  },
  inspector: {
    _object_id: STUDIO_RUNTIME_INSPECTOR_SECTION_ID,
    _button_id: "xstudio-portlet-toggle-inspector",
    _label: "Inspector",
  },
  json: {
    _object_id: STUDIO_JSON_SECTION_ID,
    _button_id: "xstudio-portlet-toggle-json",
    _label: "JSON",
  },
  modules: {
    _object_id: STUDIO_MODULES_SECTION_ID,
    _button_id: "xstudio-portlet-toggle-modules",
    _label: "Modules",
  },
};

const STUDIO_PORTLET_IDS = Object.keys(STUDIO_PORTLETS) as XStudioPortletId[];
const STUDIO_DEFAULT_PORTLET_VISIBILITY: Record<XStudioPortletId, boolean> = {
  selected: true,
  prompt: false,
  conversation: true,
  runtime: false,
  inspector: false,
  json: false,
  modules: false,
};
const STUDIO_EXPLORER_SECTIONS: Record<XStudioExplorerSectionId, {
  _section_id: string;
  _body_id: string;
  _toggle_id: string;
  _label: string;
}> = {
  app_explorer: {
    _section_id: STUDIO_APP_EXPLORER_PORTLET_ID,
    _body_id: STUDIO_APP_EXPLORER_BODY_ID,
    _toggle_id: STUDIO_APP_EXPLORER_SECTION_TOGGLE_ID,
    _label: "App Explorer",
  },
  object_tree: {
    _section_id: STUDIO_OBJECT_TREE_PORTLET_ID,
    _body_id: STUDIO_OBJECT_TREE_BODY_ID,
    _toggle_id: STUDIO_OBJECT_TREE_SECTION_TOGGLE_ID,
    _label: "Object Tree",
  },
  properties: {
    _section_id: STUDIO_SELECTED_OBJECT_PROPERTIES_PORTLET_ID,
    _body_id: STUDIO_SELECTED_OBJECT_PROPERTIES_BODY_ID,
    _toggle_id: STUDIO_SELECTED_OBJECT_PROPERTIES_SECTION_TOGGLE_ID,
    _label: "Properties",
  },
  interactions: {
    _section_id: STUDIO_SELECTED_OBJECT_INTERACTIONS_SECTION_ID,
    _body_id: STUDIO_SELECTED_OBJECT_INTERACTIONS_BODY_ID,
    _toggle_id: STUDIO_SELECTED_OBJECT_INTERACTIONS_SECTION_TOGGLE_ID,
    _label: "Interactions",
  },
  raw_json: {
    _section_id: STUDIO_SELECTED_OBJECT_RAW_SECTION_ID,
    _body_id: STUDIO_SELECTED_OBJECT_RAW_BODY_ID,
    _toggle_id: STUDIO_SELECTED_OBJECT_RAW_SECTION_TOGGLE_ID,
    _label: "Raw JSON",
  },
  danger: {
    _section_id: STUDIO_SELECTED_OBJECT_DANGER_SECTION_ID,
    _body_id: STUDIO_SELECTED_OBJECT_DANGER_BODY_ID,
    _toggle_id: STUDIO_SELECTED_OBJECT_DANGER_SECTION_TOGGLE_ID,
    _label: "Danger Zone",
  },
};
const STUDIO_EXPLORER_SECTION_IDS = Object.keys(STUDIO_EXPLORER_SECTIONS) as XStudioExplorerSectionId[];
const STUDIO_DEFAULT_EXPLORER_SECTION_OPEN: Record<XStudioExplorerSectionId, boolean> = {
  app_explorer: true,
  object_tree: true,
  properties: true,
  interactions: true,
  raw_json: false,
  danger: true,
};
const STUDIO_SELECTED_OBJECT_INSPECTOR_SECTION_IDS: XStudioSelectedObjectInspectorSectionId[] = [
  "properties",
  "interactions",
  "raw_json",
  "danger",
];
const STUDIO_SELECTED_OBJECT_FALLBACK_INSPECTOR_SECTIONS: XStudioSelectedObjectInspectorSectionId[] = [
  "properties",
  "raw_json",
  "danger",
];
const STUDIO_APP_EXPLORER_CATEGORIES: Record<XStudioAppExplorerCategoryId, {
  _label: string;
  _artifact_type: XStudioAppExplorerArtifactType;
  _empty_text: string;
}> = {
  views: {
    _label: "Views",
    _artifact_type: "view",
    _empty_text: "No views",
  },
  flows: {
    _label: "Flows",
    _artifact_type: "flow",
    _empty_text: "No flows",
  },
  entities: {
    _label: "Entities",
    _artifact_type: "entity",
    _empty_text: "No entities",
  },
  modules: {
    _label: "Modules",
    _artifact_type: "module",
    _empty_text: "No modules",
  },
};
const STUDIO_APP_EXPLORER_CATEGORY_IDS = Object.keys(STUDIO_APP_EXPLORER_CATEGORIES) as XStudioAppExplorerCategoryId[];
const STUDIO_DEFAULT_APP_EXPLORER_SECTION_OPEN: Record<XStudioAppExplorerSectionId, boolean> = {
  app: true,
  views: true,
  flows: true,
  entities: true,
  modules: true,
};
const STUDIO_SELECTED_OBJECT_EDITOR_ACTION_CONTROL_IDS = [
  STUDIO_SELECTED_OBJECT_SAVE_FIELDS_ID,
  STUDIO_SELECTED_OBJECT_CANCEL_FIELDS_ID,
];
const STUDIO_SELECTED_OBJECT_RAW_CONTROL_IDS = [
  STUDIO_SELECTED_OBJECT_JSON_ID,
  STUDIO_SELECTED_OBJECT_UPDATE_JSON_ID,
  STUDIO_SELECTED_OBJECT_RESET_JSON_ID,
];

const EVT_VIBE_GENERATION_STAGE = "vibe:generation-stage";
const EVT_VIBE_GENERATION_COMPLETE = "vibe:generation-complete";
const EVT_VIBE_GENERATION_FAILED = "vibe:generation-failed";
const EVT_XVIBE_ERROR = "xvibe:error";
const EVT_COMMAND_ERROR = "command:error";

const XSTUDIO_PACKAGE_VIEWS: Record<string, Record<string, any>> = {
  [STUDIO_SHELL_ID]: shell_view as Record<string, any>,
  [STUDIO_TOPBAR_ID]: topbar_view as Record<string, any>,
  [STUDIO_OBJECT_TREE_ID]: object_tree_view as Record<string, any>,
  [STUDIO_SELECTED_OBJECT_PANEL_ID]: selected_object_inspector_view as Record<string, any>,
  [STUDIO_CONVERSATION_SECTION_ID]: conversation_view as Record<string, any>,
  ...studio_editor_views,
};

type XStudioClientRuntime = {
  getActiveAppId(): string;
  getActiveEnv(): string;
  get_current_view_id(): string;
  get_app_view_id(): string;
  render_view(view_id: string): Promise<void>;
  _resolve_region?(): string;
  get_view?(view_id: string): Record<string, any> | null;
  get_current_view?(): Record<string, any> | null;
  _read_cached_view?(view_id: string): Record<string, any> | null;
  is_edit_mode_enabled?(): boolean;
  note_structured_view_edit?(edit: { _view_id?: string; _action?: string; _target_id?: string }): void;
  clear_pending_structured_view_edit?(edit: { _view_id?: string; _action?: string; _target_id?: string }): void;
  request_structured_view_edit_refresh?(edit: {
    _view_id?: string;
    _action?: string;
    _target_id?: string;
    _version?: number;
    _result?: any;
  }): Promise<Record<string, any> | void>;
  sendXcmd(xcmd: any): Promise<any>;
};

type StudioRuntimeAppContext = {
  _region: string;
  _container_id: string;
  _fallback_view_id?: string;
  _app_id?: string;
  _edit?: boolean;
};

type StudioXVMUpdateEvt = {
  _app_id: string;
  _env: string;
  _view_id: string;
  _version?: number;
  _view?: Record<string, any>;
  _generation_id?: string;
  _meta?: Record<string, any>;
};

type VibeGenerationFailureEvt = {
  _app_id?: string;
  _env?: string;
  _view_id?: string;
  _generation_id?: string;
  _meta?: Record<string, any>;
  _code?: string;
  _message?: string;
  _details?: any;
  _diagnostic?: any;
  _diagnostics?: any;
};

type XStudioSelectedObject = {
  _id: string;
  _json_id: string;
  _type: string;
  _text: string;
  _source_view_id: string;
  _path: string;
  _parent_path: string;
  _previous_sibling_id: string;
  _next_sibling_id: string;
  _is_xvm_ref_child: boolean;
  _json_metadata: string;
  _dom_status?: string;
};

type XStudioSelectedObjectInspectorDraft = {
  [key: string]: string;
};

type XStudioSkillInspectorField = {
  _key: string;
  _label?: string;
  _input?: "text" | "textarea" | "number" | "checkbox" | "select" | "json";
  _options?: string[];
  _placeholder?: string;
  _description?: string;
  _advanced?: boolean;
  _readonly?: boolean;
  _required?: boolean;
};

type XStudioSelectedObjectInspectorInput =
  NonNullable<XStudioSkillInspectorField["_input"]>;

type XStudioSelectedObjectInspectorResolvedField =
  XStudioSkillInspectorField & {
    _key: string;
    _label: string;
    _input: XStudioSelectedObjectInspectorInput;
    _control_id: string;
    _source: "design" | "fallback";
  };

type XStudioSelectedObjectInspectorField = string;

type XStudioConversationMessage = {
  _role: "user" | "assistant" | "system" | "tool";
  _text: string;
  _created_at: string;
  _id?: string;
  _intent?: Record<string, any>;
};

type XStudioIntentActionLocalStatus =
  | typeof STUDIO_INTENT_ACTION_STATUS_DISMISSED
  | typeof STUDIO_INTENT_ACTION_STATUS_RUNNING
  | typeof STUDIO_INTENT_ACTION_STATUS_DONE
  | typeof STUDIO_INTENT_ACTION_STATUS_FAILED;

type XStudioIntentActionView = {
  _key: string;
  _render_key: string;
  _id: string;
  _message_id: string;
  _action_index: number;
  _title: string;
  _description: string;
  _action_type: string;
  _confidence: string;
  _status: string;
  _requires_approval?: boolean;
  _params: Record<string, any> | null;
  _error: string;
};

type XStudioIntentActionParamsResult = {
  _ok: boolean;
  _error: string;
  _params: Record<string, any> | null;
};

type XStudioConversationSummary = {
  _id: string;
  _created_at?: string;
  _updated_at?: string;
  _message_count?: number;
  _last_message_at?: string;
  _title?: string;
  _metadata?: unknown;
};

type XStudioSelectedObjectApplyViewEditParams = {
  _app_id: string;
  _env: string;
  _view_id: string;
  _edit_action: string;
  _target_id: string;
  _target_type: string;
  _property_name?: string;
  _property_value?: any;
  _style_property?: string;
  _style_value?: string;
  _object_value?: Record<string, any>;
  _child?: Record<string, any>;
  _before_id?: string;
  _after_id?: string;
};

type XStudioObjectTreeNode = {
  _key: string;
  _node_key: string;
  _parent_node_key: string;
  _label: string;
  _label_primary: string;
  _label_secondary: string;
  _label_type: string;
  _search_text: string;
  _meta: XStudioSelectedObject | null;
  _object: Record<string, any> | null;
  _depth: number;
  _children: XStudioObjectTreeNode[];
  _placeholder?: string;
};

type XStudioSelectedObjectSiblingContext = {
  _is_root: boolean;
  _previous_sibling_id: string;
  _next_sibling_id: string;
};

type XStudioObjectTreeDuplicateTarget = {
  _meta: XStudioSelectedObject;
  _label: string;
};

type XStudioAppExplorerArtifact = {
  _id: string;
  _title: string;
  _type: XStudioAppExplorerArtifactType;
  _raw: any;
};

type XStudioAppExplorerArtifacts = Record<XStudioAppExplorerCategoryId, XStudioAppExplorerArtifact[]>;

type XStudioCreateViewTemplate = "blank" | "page" | "component";

export type XStudioObjectPaletteOptions = {
  onSelect?: (skill: XpellSkill) => void;
};

type XStudioObjectPaletteEntry = {
  _id: string;
  _title: string;
  _category: string;
  _search_text: string;
  _skill: XpellSkill;
};

type XStudioObjectPaletteClassEntry = {
  _name: string;
  _class: any;
};

type XStudioObjectPaletteSession = {
  resolve: (skill: XpellSkill | null) => void;
  cleanup: () => void;
  onSelect?: (skill: XpellSkill) => void;
};

type ServerCreateViewRes = {
  _ok?: boolean;
  _view_id?: string;
  _path?: string;
  _view?: Record<string, any>;
  _result?: {
    _view_id?: string;
    _path?: string;
    _view?: Record<string, any>;
  };
};

const empty_selected_object_inspector_draft = (): XStudioSelectedObjectInspectorDraft => ({});

let object_palette_session: XStudioObjectPaletteSession | null = null;

const object_palette_text = (value: unknown) => String(value ?? "").trim();

const object_palette_compare = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "base" });

const object_palette_registered_classes = (): XStudioObjectPaletteClassEntry[] => {
  const manager = (XUI as any)._object_manager;
  const classes =
    manager && typeof manager.getObjectClasses === "function"
      ? manager.getObjectClasses()
      : {};

  return Object.entries(classes)
    .map(([name, cls]) => ({ _name: name, _class: cls }))
    .sort((a, b) => object_palette_compare(a._name, b._name));
};

const object_palette_entries = (): XStudioObjectPaletteEntry[] => {
  const class_entries = object_palette_registered_classes();
  const skipped_without_skill: string[] = [];
  const skipped_without_palette: string[] = [];
  const classes_with_skills: string[] = [];
  const classes_with_palette: string[] = [];
  const seen_skill_ids = new Set<string>();
  const entries: XStudioObjectPaletteEntry[] = [];

  class_entries.forEach(({ _name, _class }) => {
    const skill = _class?._skill as XpellSkill | undefined;
    if (!skill) {
      skipped_without_skill.push(_name);
      return;
    }

    classes_with_skills.push(_name);

    const palette = skill._design?._palette;
    if (!is_obj(palette)) {
      skipped_without_palette.push(_name);
      return;
    }

    classes_with_palette.push(_name);

    const id = object_palette_text(skill._id);
    if (!id || seen_skill_ids.has(id)) return;
    seen_skill_ids.add(id);

    const title =
      object_palette_text(palette._title) ||
      object_palette_text(skill._title) ||
      id;
    const category = object_palette_text(palette._category) || "Other";

    entries.push({
      _id: id,
      _title: title,
      _category: category,
      _search_text: `${title}\n${id}\n${category}`.toLowerCase(),
      _skill: skill,
    });
  });

  _xlog.log("[xstudio] object palette registry", {
    _registered_classes_count: class_entries.length,
    _registered_classes: class_entries.map(entry => entry._name),
    _classes_with_skills_count: classes_with_skills.length,
    _classes_with_skills: classes_with_skills,
    _classes_with_palette_count: classes_with_palette.length,
    _classes_with_palette: classes_with_palette,
    _skipped_without_skill_count: skipped_without_skill.length,
    _skipped_without_skill: skipped_without_skill,
    _skipped_without_palette_count: skipped_without_palette.length,
    _skipped_without_palette: skipped_without_palette,
  });

  return entries.sort((a, b) => {
    const category_order = object_palette_compare(a._category, b._category);
    if (category_order !== 0) return category_order;
    const title_order = object_palette_compare(a._title, b._title);
    return title_order !== 0 ? title_order : object_palette_compare(a._id, b._id);
  });
};

const object_palette_filter = (
  entries: XStudioObjectPaletteEntry[],
  query: string,
) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return entries;
  return entries.filter(entry => entry._search_text.includes(normalized));
};

const object_palette_grouped_children = (
  entries: XStudioObjectPaletteEntry[],
  select_entry: (entry: XStudioObjectPaletteEntry, event?: Event) => void,
) => {
  if (entries.length === 0) {
    return [
      {
        _type: "label",
        _id: "xstudio-object-palette-empty",
        class: "xstudio-object-palette-empty",
        _text: "No objects",
      },
    ];
  }

  const children: Record<string, any>[] = [];
  let current_category = "";
  let current_group: Record<string, any> | null = null;

  entries.forEach((entry, index) => {
    if (entry._category !== current_category) {
      current_category = entry._category;
      current_group = {
        _type: "view",
        _id: `xstudio-object-palette-category-${index}`,
        class: "xstudio-object-palette-category",
        _children: [
          {
            _type: "label",
            class: "xstudio-object-palette-category-title",
            _text: current_category,
          },
        ],
      };
      children.push(current_group);
    }

    current_group?._children?.push({
      _type: "button",
      _id: `xstudio-object-palette-entry-${index}`,
      type: "button",
      class: "xstudio-object-palette-entry",
      title: `${entry._title} [${entry._id}]`,
      "data-xstudio-palette-id": entry._id,
      _children: [
        {
          _type: "span",
          class: "xstudio-object-palette-entry-title",
          _text: entry._title,
        },
        {
          _type: "span",
          class: "xstudio-object-palette-entry-id",
          _text: entry._id,
        },
      ],
      _on: {
        click: (event?: Event) => select_entry(entry, event),
        dblclick: (event?: Event) => select_entry(entry, event),
      },
    });
  });

  return children;
};

const set_object_palette_visible = (visible: boolean) => {
  const dialog = XUI.getObject(STUDIO_OBJECT_PALETTE_DIALOG_ID) as any;
  if (!dialog) return false;

  if (visible) {
    dialog.show?.();
  } else {
    dialog.hide?.();
  }

  dialog._visible = visible;
  dialog.dom?.setAttribute?.("aria-hidden", String(!visible));
  return true;
};

const focus_object_palette_entry = (direction: 1 | -1) => {
  if (typeof document === "undefined") return;

  const entries = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".xstudio-object-palette-entry"),
  );
  if (entries.length === 0) return;

  const active_index = entries.indexOf(document.activeElement as HTMLButtonElement);
  const next_index =
    active_index < 0
      ? direction > 0 ? 0 : entries.length - 1
      : (active_index + direction + entries.length) % entries.length;

  entries[next_index]?.focus();
};

export function showObjectPalette(
  options: XStudioObjectPaletteOptions = {},
): Promise<XpellSkill | null> {
  if (typeof document === "undefined") return Promise.resolve(null);

  if (object_palette_session) {
    const previous_session = object_palette_session;
    object_palette_session = null;
    previous_session.cleanup();
    previous_session.resolve(null);
  }
  set_object_palette_visible(false);

  const all_entries = object_palette_entries();
  let visible_entries = all_entries;

  return new Promise<XpellSkill | null>((resolve) => {
    const search = XUI.getObject(STUDIO_OBJECT_PALETTE_SEARCH_ID) as any;
    const results = XUI.getObject(STUDIO_OBJECT_PALETTE_RESULTS_ID) as any;
    const close = XUI.getObject(STUDIO_OBJECT_PALETTE_CLOSE_ID) as any;

    if (!search || !results || !set_object_palette_visible(true)) {
      resolve(null);
      return;
    }

    const finish = (skill: XpellSkill | null) => {
      const session = object_palette_session;
      if (!session) return;
      object_palette_session = null;
      session.cleanup();
      set_object_palette_visible(false);

      if (skill) {
        _xlog.log("[xstudio] object palette selected", {
          _id: skill._id,
          _title: skill._title,
          _category: skill._design?._palette?._category,
        });
        session.onSelect?.(skill);
      }

      session.resolve(skill);
    };

    const select_entry = (entry: XStudioObjectPaletteEntry, event?: Event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      finish(entry._skill);
    };

    const render = () => {
      const query = object_palette_text(search?.getValue?.() ?? search?.dom?.value);
      visible_entries = object_palette_filter(all_entries, query);
      results.update?.({
        _children: object_palette_grouped_children(visible_entries, select_entry),
      });
    };

    const on_input = () => render();
    const on_keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(null);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        focus_object_palette_entry(1);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        focus_object_palette_entry(-1);
        return;
      }

      if (
        event.key === "Enter" &&
        event.target === search.dom &&
        visible_entries[0]
      ) {
        event.preventDefault();
        finish(visible_entries[0]._skill);
      }
    };
    const on_close = (event: Event) => {
      event.preventDefault();
      finish(null);
    };

    object_palette_session = {
      resolve,
      onSelect: options.onSelect,
      cleanup: () => {
        search.dom?.removeEventListener?.("input", on_input);
        search.dom?.removeEventListener?.("keydown", on_keydown);
        results.dom?.removeEventListener?.("keydown", on_keydown);
        close?.dom?.removeEventListener?.("click", on_close);
      },
    };

    search.dom?.addEventListener?.("input", on_input);
    search.dom?.addEventListener?.("keydown", on_keydown);
    results.dom?.addEventListener?.("keydown", on_keydown);
    close?.dom?.addEventListener?.("click", on_close);

    search.setValue?.("");
    if (search.dom && "value" in search.dom) {
      search.dom.value = "";
    }
    render();

    queueMicrotask(() => {
      search.dom?.focus?.();
      search.dom?.select?.();
    });
  });
}

const GENERATION_STAGE_STATUS: Record<string, string> = {
  preparing: "Preparing generation...",
  planning: "Planning...",
  "selecting-skills": "Selecting skills...",
  "loading-view": "Loading current view...",
  "building-prompt": "Building prompt...",
  generating: "Generating JSON...",
  parsing: "Parsing response...",
  validating: "Validating...",
  repairing: "Repairing...",
  saving: "Saving...",
  complete: "Done",
  completed: "Done",
  failed: "Generation failed",
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
    return raw._result;
  }

  return raw;
};

export class XStudioModule extends XModule {
  static _name = "xstudio";
  private static _shortcut_owner: XStudioModule | null = null;
  static _skill: XpellSkill = {
    _id: "xstudio",
    _title: "XStudio Module",
    _version: "1.0.0",
    _active: true,
    _type: "client-module-api",
    _requires: ["xmodule"],

    _description:
      "XStudio Module for managing and editing Xpell Artifacts.",

    _core_rules: [
      "Use XData/xd for reactive runtime state.",
      "Use string ops for simple values and object ops for JSON data."
    ]
  };

  static _ops: Record<string, XpellSkillCommand> = {
    info: {
      _name: "info",
      _scope: "module",
      _description: "Return XStudio module info."
    },
    "set-studio-theme": {
      _name: "set-studio-theme",
      _scope: "module",
      _description: "Set the local XStudio shell theme without changing the app canvas theme.",
      _params: {
        _theme: "XStudio shell theme: terminal, dark, or light."
      }
    },
    "toggle-portlet": {
      _name: "toggle-portlet",
      _scope: "module",
      _description: "Toggle a right-dock XStudio portlet without recreating it.",
      _params: {
        _portlet: "Portlet id: prompt, conversation, runtime, inspector, json, or modules."
      }
    },
  };

  private _xvm_client: XStudioClientRuntime | null = null;
  private _events_bound = false;
  private _generation_listeners_registered = false;
  private _cmd_seq = 0;
  private _active_generation_id = "";
  private _active_generation_view_id = "";
  private _left_dock_collapsed = false;
  private _right_dock_collapsed = false;
  private _shortcuts_registered = false;
  private _shortcut_keydown_handler: ((event: KeyboardEvent) => void) | null = null;
  private _selected_object: XStudioSelectedObject | null = null;
  private _selected_object_data: Record<string, any> | null = null;
  private _selected_object_pending_delete: XStudioSelectedObject | null = null;
  private _selected_object_pending_select_id = "";
  private _selected_object_json = "";
  private _selected_object_inspector_draft = empty_selected_object_inspector_draft();
  private _selected_object_inspector_fields: XStudioSelectedObjectInspectorResolvedField[] = [];
  private _selected_object_inspector_sections: XStudioSelectedObjectInspectorSectionId[] = [
    ...STUDIO_SELECTED_OBJECT_FALLBACK_INSPECTOR_SECTIONS,
  ];
  private _selected_tree_row_id = "";
  private _selected_canvas_element: HTMLElement | null = null;
  private _object_tree_render_seq = 0;
  private _object_tree_nodes: XStudioObjectTreeNode[] = [];
  private _object_tree_search_query = "";
  private _object_tree_view_id = "";
  private _object_tree_expanded_node_keys = new Set<string>();
  private _object_tree_touched_expansion_node_keys = new Set<string>();
  private _object_tree_pending_duplicate: XStudioObjectTreeDuplicateTarget | null = null;
  private _app_explorer_render_seq = 0;
  private _app_explorer_selected_key = "";
  private _app_explorer_artifacts: XStudioAppExplorerArtifacts = {
    views: [],
    flows: [],
    entities: [],
    modules: [],
  };
  private _app_explorer_section_open: Record<XStudioAppExplorerSectionId, boolean> = {
    ...STUDIO_DEFAULT_APP_EXPLORER_SECTION_OPEN,
  };
  private _studio_theme: XStudioTheme = STUDIO_THEME_DEFAULT;
  private _conversation_messages: XStudioConversationMessage[] = [];
  private _conversation_app_id = "";
  private _conversation_env = "";
  private _conversation_id = "";
  private _conversation_list: XStudioConversationSummary[] = [];
  private _conversation_ready: Promise<void> | null = null;
  private _conversation_action_status: Record<string, XStudioIntentActionLocalStatus> = {};
  private _conversation_action_error: Record<string, string> = {};
  private _portlet_visibility: Record<XStudioPortletId, boolean> = {
    ...STUDIO_DEFAULT_PORTLET_VISIBILITY,
  };
  private _explorer_section_open: Record<XStudioExplorerSectionId, boolean> = {
    ...STUDIO_DEFAULT_EXPLORER_SECTION_OPEN,
  };

  constructor(client?: XStudioClientRuntime | null) {
    super({
      _name: XStudioModule._name
    });

    this._xvm_client = client ?? null;
  }

  override async onLoad() {
    XUI.loadSVGPack();

  }

  private _client() {
    if (!this._xvm_client) {
      throw new Error("XStudioModule requires an XVMClient runtime");
    }
    return this._xvm_client;
  }

  bind_events() {
    if (this._events_bound) return;
    this._events_bound = true;
    this._register_generation_listeners();

    _xem.on("studio:runtime-refresh", async () => {
      await this._refresh_studio_runtime();
    });

    _xem.on("studio:inspect-last-run", async () => {
      await this._inspect_studio_latest_run();
    });

    _xem.on("studio:load-current-view", async () => {
      await this._load_studio_current_view_json();
    });

    _xem.on("xvm:view-rendered", (payload: any) => {
      const evt = this._normalize_event_payload(payload);
      if (!is_obj(evt)) return;
      if (evt._app_id !== this._client().getActiveAppId()) return;
      if (evt._env !== this._client().getActiveEnv()) return;
      this._refresh_object_tree_for_current_view();
      void this._refresh_app_explorer();
      void this._ensure_conversation_for_current_context();
    });

    _xem.on("xvm:view-navigated", (payload: any) => {
      const evt = this._normalize_event_payload(payload);
      if (!is_obj(evt)) return;

      const view_id = typeof evt._view_id === "string" ? evt._view_id.trim() : "";
      const region = typeof evt._region === "string" ? evt._region.trim() : "";
      if (!view_id || view_id === STUDIO_VIEW_ID || region === STUDIO_REGION_ID) return;
      if (region && region !== this._resolve_app_view_region()) return;

      this._clear_selected_object();
      this._refresh_object_tree_for_current_view();
      this._render_cached_app_explorer();
    });

    _xem.on("xvm:view-cache-updated", (payload: any) => {
      const evt = this._normalize_event_payload(payload);
      if (!is_obj(evt)) return;
      if (evt._app_id !== this._client().getActiveAppId()) return;
      if (evt._env !== this._client().getActiveEnv()) return;
      this._refresh_object_tree_for_current_view();
      this._render_cached_app_explorer();
    });

    _xem.on("studio:save-view", async () => {
      await this._save_studio_view_json();
    });

    _xem.on("studio:load-module", async () => {
      await this._load_studio_generated_module_source();
    });

    _xem.on("studio:save-module", async () => {
      await this._save_studio_generated_module_source();
    });

    _xem.on("studio:repair-module", async () => {
      await this._repair_studio_generated_module();
    });

    _xem.on("studio:disable-module", async () => {
      await this._disable_studio_generated_module();
    });

    _xem.on("studio:delete-module", async () => {
      await this._delete_studio_generated_module();
    });

    _xem.on("studio:toggle-left-dock", () => {
      this._toggle_left_dock();
    });

    _xem.on("studio:toggle-right-dock", () => {
      this._toggle_right_dock();
    });

    _xem.on("studio:explorer-section:toggle", (payload: any) => {
      const evt = this._normalize_event_payload(payload);
      const section_id = this._normalize_explorer_section_id(
        is_obj(evt) ? evt._section ?? evt.section ?? evt._id ?? evt.id : evt,
      );
      if (!section_id) {
        this._log("explorer section toggle ignored", { _payload: evt });
        return;
      }

      this._toggle_explorer_section(section_id);
    });

    _xem.on("studio:app-explorer:section-toggle", (payload: any) => {
      const evt = this._normalize_event_payload(payload);
      const section_id = this._normalize_app_explorer_section_id(
        is_obj(evt) ? evt._section ?? evt.section ?? evt._id ?? evt.id : evt,
      );
      if (!section_id) {
        this._log("app explorer section toggle ignored", { _payload: evt });
        return;
      }

      this._toggle_app_explorer_section(section_id);
    });

    _xem.on("studio:app-explorer:add-view-open", () => {
      this._open_add_view_dialog();
    });

    _xem.on("studio:app-explorer:add-view-cancel", () => {
      this._hide_add_view_dialog();
    });

    _xem.on("studio:app-explorer:add-view-input", () => {
      this._validate_add_view_dialog(false);
    });

    _xem.on("studio:app-explorer:add-view-create", async () => {
      await this._create_view_from_add_view_dialog();
    });

    _xem.on("studio:object-tree-search", (payload: any) => {
      this._log("studio:object-tree-search payload received", { _payload: payload });
      const evt = this._normalize_event_payload(payload);
      const value = this._object_tree_search_event_value(evt);
      this._log("studio:object-tree-search value for _update_object_tree_search", { _value: value });
      this._update_object_tree_search(value);
    });

    _xem.on("studio:preview-request", async () => {
      const prompt = String(_xd.get("studio:prompt") ?? "").trim();
      if (!prompt) {
        this._log("studio preview ignored: empty prompt");
        return;
      }

      this._send_studio_generate_artifact_prompt(
        prompt,
        this._resolve_studio_target_view_id() || "main",
        "studio-preview",
      );
    });

    _xem.on("studio:conversation-send", async () => {
      await this._send_conversation_message();
    });

    _xem.on("studio:conversation-new", async () => {
      await this._create_and_open_new_conversation();
    });

    _xem.on("studio:conversation-select", async (payload: any) => {
      await this._switch_conversation(payload);
    });

    _xem.on("studio:conversation-input", (payload: any) => {
      this._update_conversation_input_state(payload);
    });

    _xem.on("studio:conversation-keyup", (payload: any) => {
      this._handle_conversation_keyup(payload);
    });

    _xem.on("studio:intent-action-apply", (payload: any) => {
      void this._apply_conversation_intent_action(payload);
    });

    _xem.on("studio:intent-action-dismiss", (payload: any) => {
      void this._dismiss_conversation_intent_action(payload);
    });

    _xem.on("studio:apply-request", () => {
      this._log("studio apply ignored: preview already persists in V1");
    });

    _xem.on("studio:selected-object:save-fields", async () => {
      await this._save_selected_object_inspector_fields();
    });

    _xem.on("studio:selected-object:cancel-fields", () => {
      this._cancel_selected_object_inspector_fields();
    });

    _xem.on("studio:selected-object:field-changed", (payload: any) => {
      this._handle_selected_object_inspector_field_changed(payload);
    });

    _xem.on("studio:selected-object:move-up", async () => {
      await this._move_selected_object("up");
    });

    _xem.on("studio:selected-object:move-down", async () => {
      await this._move_selected_object("down");
    });

    _xem.on("studio:selected-object:duplicate", async () => {
      await this._duplicate_selected_object();
    });

    _xem.on("studio:object-tree:duplicate-cancel", () => {
      this._cancel_object_tree_node_duplicate();
    });

    _xem.on("studio:object-tree:duplicate-confirm", async () => {
      await this._confirm_object_tree_node_duplicate();
    });

    _xem.on("studio:selected-object:delete-request", () => {
      this._request_delete_selected_object();
    });

    _xem.on("studio:selected-object:delete-cancel", () => {
      this._hide_delete_selected_object_dialog();
    });

    _xem.on("studio:selected-object:delete-confirm", async () => {
      await this._confirm_delete_selected_object();
    });

    _xem.on("studio:selected-object:update-json", async () => {
      await this._update_selected_object_json_from_editor();
    });

    _xem.on("studio:selected-object:reset-json", () => {
      this._reset_selected_object_json_editor();
    });

    _xem.on("studio:close", async () => {
      await this._close_studio();
    });

    this._render_cached_app_explorer();
  }

  register_shortcuts() {
    this.unregister_shortcuts();
  }

  unregister_shortcuts() {
    if (!this._shortcuts_registered) return;
    if (typeof document !== "undefined" && this._shortcut_keydown_handler) {
      document.removeEventListener("keydown", this._shortcut_keydown_handler, true);
    }
    this._shortcut_keydown_handler = null;
    this._shortcuts_registered = false;
    if (XStudioModule._shortcut_owner === this) {
      XStudioModule._shortcut_owner = null;
    }
  }

  clear_active_generation() {
    this._active_generation_id = "";
    this._active_generation_view_id = "";
  }

  extend_runtime_app(base_app: XVMApp, ctx: StudioRuntimeAppContext): XVMApp {
    if (!this._can_edit(ctx)) return base_app;

    const views = is_obj(base_app._views) ? base_app._views : {};

    return {
      ...base_app,

      _shell: this._studio_shell_view(ctx._container_id),

      _containers: [
        { _id: ctx._container_id },
        { _id: STUDIO_CONTAINER_ID },
      ],

      _regions: [
        {
          _id: ctx._region,
          _container_id: ctx._container_id,
        },
        {
          _id: STUDIO_REGION_ID,
          _container_id: STUDIO_CONTAINER_ID,
          _hash_sync: false,
        },
      ],

      _views: {
        ...views,
        [STUDIO_VIEW_ID]: create_studio_editor_view(),
      },

      _router: {
        ...(is_obj(base_app._router) ? base_app._router : {}),
        _region: ctx._region,
        _fallback_view_id: ctx._fallback_view_id,
      },

      _start: {
        ...(is_obj(base_app._start) ? base_app._start : {}),
        _view_id: ctx._fallback_view_id,
        _region: ctx._region,
      },
    } as XVMApp;
  }

  handle_xvm_update(update: StudioXVMUpdateEvt) {
    this._complete_generation_from_update(update);
    this._refresh_object_tree_for_current_view();
    void this._refresh_app_explorer();
  }

  private _can_edit(ctx?: Pick<StudioRuntimeAppContext, "_app_id" | "_edit">) {
    const app_id = typeof ctx?._app_id === "string" ? ctx._app_id : this._xvm_client?.getActiveAppId?.();
    if (app_id === "vibe-system") return false;

    if (typeof ctx?._edit === "boolean") return ctx._edit;

    if (typeof this._xvm_client?.is_edit_mode_enabled === "function") {
      return this._xvm_client.is_edit_mode_enabled() === true;
    }

    return true;
  }

  private _normalize_studio_theme(theme: any): XStudioTheme {
    const value = String(theme ?? "").trim().toLowerCase();
    return (STUDIO_THEME_OPTIONS as readonly string[]).includes(value)
      ? (value as XStudioTheme)
      : STUDIO_THEME_DEFAULT;
  }

  private _studio_theme_class(theme: any = this._studio_theme) {
    return `${STUDIO_THEME_CLASS_PREFIX}${this._normalize_studio_theme(theme)}`;
  }

  private _read_studio_theme_selector_value() {
    const selector = XUI.getObject(STUDIO_THEME_SELECTOR_ID) as any;
    const value = selector?.getValue?.() ?? selector?.dom?.value ?? this._studio_theme;
    return this._normalize_studio_theme(value);
  }

  private _studio_shell_class() {
    return [
      "xstudio-shell",
      this._studio_theme_class(),
      this._left_dock_collapsed ? "xstudio-left-collapsed" : "",
      this._right_dock_collapsed ? "xstudio-right-collapsed" : "",
    ].filter(Boolean).join(" ");
  }

  private _left_dock_toggle_text() {
    return this._left_dock_collapsed ? "▶" : "◀";
  }

  private _right_dock_toggle_text() {
    return this._right_dock_collapsed ? "◀" : "▶";
  }

  private _left_dock_toggle_title() {
    return this._left_dock_collapsed ? "Expand left dock" : "Collapse left dock";
  }

  private _right_dock_toggle_title() {
    return this._right_dock_collapsed ? "Expand right dock" : "Collapse right dock";
  }

  private _explorer_section_is_open(section_id: XStudioExplorerSectionId) {
    return this._explorer_section_open[section_id] === true;
  }

  private _explorer_section_toggle_text(section_id: XStudioExplorerSectionId) {
    const config = STUDIO_EXPLORER_SECTIONS[section_id];
    return `${this._explorer_section_is_open(section_id) ? "▾" : "▸"} ${config._label}`;
  }

  private _explorer_section_toggle_title(section_id: XStudioExplorerSectionId) {
    const config = STUDIO_EXPLORER_SECTIONS[section_id];
    return `${this._explorer_section_is_open(section_id) ? "Collapse" : "Expand"} ${config._label}`;
  }

  private _clone_studio_package_view(view_id: string) {
    const view = XSTUDIO_PACKAGE_VIEWS[view_id];
    return view ? _xu.clone_json(view) : null;
  }

  private _find_view_data(root: any, object_id: string): Record<string, any> | null {
    if (!is_obj(root)) return null;
    if (root._id === object_id) return root;

    if (!Array.isArray(root._children)) return null;
    for (const child of root._children) {
      const found = this._find_view_data(child, object_id);
      if (found) return found;
    }

    return null;
  }

  private _set_view_data_button_state(root: Record<string, any>, object_id: string, text: string, title: string) {
    const button = this._find_view_data(root, object_id);
    if (!button) return;
    button._text = text;
    button.title = title;
  }

  private _set_view_data_select_value(root: Record<string, any>, object_id: string, value: string) {
    const select = this._find_view_data(root, object_id);
    if (!select) return;

    select._value = value;
    select.value = value;

    if (!Array.isArray(select._options)) return;

    for (const option of select._options) {
      if (!is_obj(option)) continue;
      option.selected = option.value === value;
    }
  }

  private _set_class_token_on_data(obj: Record<string, any>, class_name: string, enabled: boolean) {
    const classes = new Set(
      String(obj.class ?? "")
        .split(/\s+/g)
        .map((item) => item.trim())
        .filter(Boolean)
    );

    if (enabled) {
      classes.add(class_name);
    } else {
      classes.delete(class_name);
    }

    obj.class = Array.from(classes).join(" ");
  }

  private _set_view_data_display_visible(obj: Record<string, any>, visible: boolean) {
    obj._visible = visible;
    obj["aria-hidden"] = String(!visible);
    this._set_class_token_on_data(obj, STUDIO_PORTLET_HIDDEN_CLASS, !visible);

    const raw_style = typeof obj.style === "string" ? obj.style : "";
    const declarations = raw_style
      .split(";")
      .map((item) => item.trim())
      .filter((item) => item && !/^display\s*:/i.test(item));

    if (!visible) {
      declarations.push("display: none");
    }

    if (declarations.length > 0) {
      obj.style = `${declarations.join("; ")};`;
    } else {
      delete obj.style;
    }
  }

  private _set_view_data_portlet_button_state(root: Record<string, any>, portlet_id: XStudioPortletId) {
    const config = STUDIO_PORTLETS[portlet_id];
    if (!config._button_id) return;

    const button = this._find_view_data(root, config._button_id);
    if (!button) return;

    const visible = this._portlet_visibility[portlet_id] === true;
    button._text = config._label;
    button.title = `${visible ? "Hide" : "Show"} ${config._label}`;
    button["aria-pressed"] = String(visible);
    this._set_class_token_on_data(button, STUDIO_PORTLET_TOGGLE_ACTIVE_CLASS, visible);
  }

  private _apply_portlet_state_to_view_data(root: Record<string, any>) {
    for (const portlet_id of STUDIO_PORTLET_IDS) {
      const config = STUDIO_PORTLETS[portlet_id];
      const portlet = this._find_view_data(root, config._object_id);
      if (!portlet) continue;
      this._set_view_data_display_visible(
        portlet,
        this._portlet_visibility[portlet_id] === true,
      );
    }
  }

  private _set_view_data_explorer_section_state(root: Record<string, any>, section_id: XStudioExplorerSectionId) {
    const config = STUDIO_EXPLORER_SECTIONS[section_id];
    const open = this._explorer_section_is_open(section_id);

    const section = this._find_view_data(root, config._section_id);
    if (section) {
      this._set_class_token_on_data(section, STUDIO_EXPLORER_SECTION_COLLAPSED_CLASS, !open);
    }

    const body = this._find_view_data(root, config._body_id);
    if (body) {
      this._set_view_data_display_visible(body, open);
    }

    const toggle = this._find_view_data(root, config._toggle_id);
    if (toggle) {
      toggle._text = this._explorer_section_toggle_text(section_id);
      toggle.title = this._explorer_section_toggle_title(section_id);
      toggle["aria-expanded"] = String(open);
    }
  }

  private _apply_explorer_section_state_to_view_data(root: Record<string, any>) {
    for (const section_id of STUDIO_EXPLORER_SECTION_IDS) {
      this._set_view_data_explorer_section_state(root, section_id);
    }
  }

  private _apply_topbar_state_to_view_data(view: Record<string, any>) {
    this._set_view_data_button_state(
      view,
      STUDIO_TOGGLE_LEFT_DOCK_ID,
      this._left_dock_toggle_text(),
      this._left_dock_toggle_title(),
    );
    this._set_view_data_button_state(
      view,
      STUDIO_TOGGLE_RIGHT_DOCK_ID,
      this._right_dock_toggle_text(),
      this._right_dock_toggle_title(),
    );
    this._set_view_data_select_value(
      view,
      STUDIO_THEME_SELECTOR_ID,
      this._studio_theme,
    );

    for (const portlet_id of STUDIO_PORTLET_IDS) {
      this._set_view_data_portlet_button_state(view, portlet_id);
    }
  }

  private _resolve_studio_view(view_id: string) {
    const local_view = this._clone_studio_package_view(view_id);
    if (local_view) {
      if (view_id === STUDIO_TOPBAR_ID) {
        this._apply_topbar_state_to_view_data(local_view);
      }
      this._apply_explorer_section_state_to_view_data(local_view);
      return local_view;
    }

    const app_view = this._xvm_client?.get_view?.(view_id);
    return is_obj(app_view) ? app_view : null;
  }

  private _register_studio_view_resolver() {
    void _xem.fire("xvm:view-resolver-ready", {
      resolver: (view_id: string) => this._resolve_studio_view(view_id),
    });
  }

  private _studio_shell_view(main_container_id: string) {
    this._register_studio_view_resolver();

    const shell = this._clone_studio_package_view(STUDIO_SHELL_ID);
    if (!shell) throw new Error("XStudio shell view is not registered");

    shell.class = this._studio_shell_class();
    shell._theme = this._studio_theme;
    shell["data-xstudio-theme"] = this._studio_theme;

    const canvas = this._find_view_data(shell, STUDIO_CANVAS_ID);
    if (canvas) {
      canvas._children = [
        {
          _type: "view",
          _id: main_container_id,
          class: "xstudio-main-container",
        },
      ];
    }

    this._apply_portlet_state_to_view_data(shell);
    this._apply_explorer_section_state_to_view_data(shell);

    return shell;
  }

  private _set_shell_class_enabled(class_name: string, enabled: boolean) {
    const shell = XUI.getObject(STUDIO_SHELL_ID) as any;
    if (!shell) return;

    if (enabled) {
      shell.addClass?.(class_name);
    } else {
      shell.removeClass?.(class_name);
    }
  }

  private _apply_studio_theme(theme: any = this._studio_theme) {
    this._studio_theme = this._normalize_studio_theme(theme);

    const shell = XUI.getObject(STUDIO_SHELL_ID) as any;
    if (shell) {
      for (const option of STUDIO_THEME_OPTIONS) {
        shell.removeClass?.(`${STUDIO_THEME_CLASS_PREFIX}${option}`);
      }
      shell.addClass?.(this._studio_theme_class());
      shell.dom?.setAttribute?.("data-xstudio-theme", this._studio_theme);
    }

    const selector = XUI.getObject(STUDIO_THEME_SELECTOR_ID) as any;
    if (selector) {
      const current_value = selector?.getValue?.() ?? selector?.dom?.value;
      if (current_value !== this._studio_theme) {
        if (selector.setValue) {
          selector.setValue(this._studio_theme);
        } else if (selector.dom && "value" in selector.dom) {
          selector.dom.value = this._studio_theme;
        }
      }
    }

    return this._studio_theme;
  }

  private _set_button_text(object_id: string, text: string) {
    const button = XUI.getObject(object_id) as any;
    button?.setText?.(text);
  }

  private _set_button_title(object_id: string, title: string) {
    const button = XUI.getObject(object_id) as any;
    if (button?.dom?.setAttribute) {
      button.dom.setAttribute("title", title);
    }
  }

  private _set_object_attribute(object_id: string, name: string, value: string) {
    const object = XUI.getObject(object_id) as any;
    if (!object) return;

    object[name] = value;
    object.dom?.setAttribute?.(name, value);
  }

  private _set_object_class_token(object_id: string, class_name: string, enabled: boolean) {
    const object = XUI.getObject(object_id) as any;
    if (!object) return;

    if (enabled) {
      object.addClass?.(class_name);
    } else {
      object.removeClass?.(class_name);
    }
  }

  private _set_object_visible(object_id: string, visible: boolean) {
    const object = XUI.getObject(object_id) as any;
    if (!object) return;

    object._visible = visible;
    const dom = object.dom;
    if (dom instanceof HTMLElement) {
      dom.setAttribute("aria-hidden", String(!visible));
      if (visible) {
        dom.removeAttribute("hidden");
        dom.style.removeProperty("display");
      } else {
        dom.setAttribute("hidden", "true");
        dom.style.display = "none";
      }
    }
  }

  private _set_portlet_visible(object_id: string, visible: boolean) {
    const object = XUI.getObject(object_id) as any;
    if (!object) return;

    object._visible = visible;
    if (visible) {
      object.removeClass?.(STUDIO_PORTLET_HIDDEN_CLASS);
    } else {
      object.addClass?.(STUDIO_PORTLET_HIDDEN_CLASS);
    }

    object["aria-hidden"] = String(!visible);
    object.dom?.setAttribute?.("aria-hidden", String(!visible));

    const dom = object.dom;
    if (dom instanceof HTMLElement) {
      if (visible) {
        dom.style.removeProperty("display");
      } else {
        dom.style.display = "none";
      }
    }
  }

  private _set_portlet_button_state(portlet_id: XStudioPortletId) {
    const config = STUDIO_PORTLETS[portlet_id];
    if (!config._button_id) return;

    const visible = this._portlet_visibility[portlet_id] === true;
    this._set_button_text(config._button_id, config._label);
    this._set_button_title(config._button_id, `${visible ? "Hide" : "Show"} ${config._label}`);
    this._set_object_attribute(config._button_id, "aria-pressed", String(visible));
    this._set_object_class_token(config._button_id, STUDIO_PORTLET_TOGGLE_ACTIVE_CLASS, visible);
  }

  private _local_conversation_text(value: any) {
    return String(value ?? "").trim();
  }

  private _current_conversation_context() {
    return {
      _app_id: this._client().getActiveAppId(),
      _env: this._client().getActiveEnv(),
    };
  }

  private _conversation_context_matches(app_id: string, env: string) {
    return (
      this._conversation_app_id === app_id &&
      this._conversation_env === env &&
      this._conversation_id.length > 0
    );
  }

  private _conversation_action_key_part(value: string) {
    return encodeURIComponent(value);
  }

  private _conversation_message_id(message: XStudioConversationMessage, index: number) {
    return typeof message._id === "string" && message._id.trim()
      ? message._id.trim()
      : `${message._role}-${index}-${message._created_at || "no-time"}`;
  }

  private _conversation_action_key(
    message: XStudioConversationMessage,
    message_index: number,
    raw_action: Record<string, any>,
    action_index: number,
  ) {
    const action_id = this._intent_action_persisted_id(raw_action);
    const render_action_id = action_id || `action-${action_index + 1}`;
    const parts = [
      this._conversation_app_id || "no-app",
      this._conversation_env || "no-env",
      this._conversation_id || "no-conversation",
      this._conversation_message_id(message, message_index),
      render_action_id,
    ].map((part) => this._conversation_action_key_part(part));

    return parts.join(":");
  }

  private _reset_conversation_action_transient_state() {
    this._conversation_action_status = {};
    this._conversation_action_error = {};
    this._log("conversation action transient state reset", {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
    });
  }

  private _normalize_conversation_summary(value: any): XStudioConversationSummary | null {
    if (!is_obj(value) || typeof value._id !== "string" || !value._id.trim()) {
      return null;
    }

    return {
      _id: value._id.trim(),
      ...(typeof value._created_at === "string" ? { _created_at: value._created_at } : {}),
      ...(typeof value._updated_at === "string" ? { _updated_at: value._updated_at } : {}),
      ...(typeof value._message_count === "number" ? { _message_count: value._message_count } : {}),
      ...(typeof value._last_message_at === "string" ? { _last_message_at: value._last_message_at } : {}),
      ...(typeof value._title === "string" ? { _title: value._title } : {}),
      ...(value._metadata !== undefined ? { _metadata: value._metadata } : {}),
    };
  }

  private _normalize_conversation_message(value: any): XStudioConversationMessage | null {
    if (!is_obj(value)) return null;

    const role = String(value._role ?? "").trim();
    if (role !== "user" && role !== "assistant" && role !== "system" && role !== "tool") {
      return null;
    }

    if (typeof value._text !== "string") return null;

    return {
      _role: role,
      _text: value._text,
      _created_at:
        typeof value._created_at === "string" && value._created_at.trim()
          ? value._created_at.trim()
          : "",
      ...(typeof value._id === "string" && value._id.trim() ? { _id: value._id.trim() } : {}),
      ...(is_obj(value._intent) ? { _intent: { ...value._intent } } : {}),
    };
  }

  private _conversation_artifact_id(item: any) {
    if (typeof item === "string" && item.trim()) return item.trim();
    if (!is_obj(item)) return "";

    const id =
      typeof item._id === "string" && item._id.trim()
        ? item._id.trim()
        : typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : typeof item._name === "string" && item._name.trim()
            ? item._name.trim()
            : "";

    return id;
  }

  private _conversation_artifact_ids(key: string, mapper = (item: any) => this._conversation_artifact_id(item)) {
    const items = _xd.get(key);
    if (!Array.isArray(items)) return [];

    return items
      .map((item) => mapper(item))
      .filter((item): item is string => typeof item === "string" && item.length > 0);
  }

  private _conversation_selected_object_context() {
    const selected = this._selected_object;
    if (!selected) return null;

    const type = typeof selected._type === "string" ? selected._type.trim() : "";
    const json_id = typeof selected._json_id === "string" ? selected._json_id.trim() : "";
    const id = typeof selected._id === "string" ? selected._id.trim() : "";
    const source_view_id = typeof selected._source_view_id === "string" ? selected._source_view_id.trim() : "";
    const path = typeof selected._path === "string" ? selected._path.trim() : "";

    if (!type || !json_id || !source_view_id) return null;

    return {
      _type: type,
      _json_id: json_id,
      ...(id ? { _id: id } : {}),
      _source_view_id: source_view_id,
      ...(path ? { _path: path } : {}),
    };
  }

  private _conversation_selected_object_log_detail(selected_object: Record<string, any> | undefined) {
    return {
      _has_selected_object: is_obj(selected_object),
      _type: typeof selected_object?._type === "string" ? selected_object._type : "",
      _json_id: typeof selected_object?._json_id === "string" ? selected_object._json_id : "",
      _id: typeof selected_object?._id === "string" ? selected_object._id : "",
      _source_view_id: typeof selected_object?._source_view_id === "string" ? selected_object._source_view_id : "",
      _path: typeof selected_object?._path === "string" ? selected_object._path : "",
    };
  }

  private _conversation_runtime_context() {
    const active_view_id = this._resolve_studio_target_view_id();
    const selected_object = this._conversation_selected_object_context();
    const views = this._conversation_artifact_ids(_XD_KEYS.STUDIO_VIEWS);
    const flows = this._conversation_artifact_ids(_XD_KEYS.STUDIO_FLOWS);
    const modules = this._conversation_artifact_ids(
      _XD_KEYS.STUDIO_MODULES,
      (item: any) => this._get_studio_module_name(item),
    );
    const available_artifacts: Record<string, string[]> = {};

    if (views.length > 0) available_artifacts._views = views;
    if (flows.length > 0) available_artifacts._flows = flows;
    if (modules.length > 0) available_artifacts._modules = modules;

    return {
      ...(active_view_id ? { _active_view_id: active_view_id } : {}),
      ...(selected_object ? { _selected_object: selected_object } : {}),
      ...(Object.keys(available_artifacts).length > 0
        ? { _available_artifacts: available_artifacts }
        : {}),
    };
  }

  private _conversation_append_message_id(result: any) {
    const message = is_obj(result?._message)
      ? result._message
      : is_obj(result?._result?._message)
        ? result._result._message
        : null;
    return typeof message?._id === "string" && message._id.trim()
      ? message._id.trim()
      : "";
  }

  private async _analyze_conversation_message(text: string, message_id: string) {
    const runtime_context = this._conversation_runtime_context();
    const params: Record<string, any> = {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      _message: text,
      _runtime_context: runtime_context,
    };

    if (message_id) {
      params._message_id = message_id;
    }

    this._log(
      "analyze-message selected object detail",
      this._conversation_selected_object_log_detail(runtime_context._selected_object),
    );

    this._log("analyze-message runtime context", {
      _active_view_id: runtime_context._active_view_id,
      _selected_object: runtime_context._selected_object,
    });

    this._log("analyze-message requested", {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      ...(message_id ? { _message_id: message_id } : {}),
    });

    const result = await this._send_xvibe_command("analyze-message", params);
    this._log("analyze-message completed", {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      ...(is_obj(result?._intent) ? { _intent: result._intent } : {}),
    });
    return result;
  }

  private _conversation_label(conversation: XStudioConversationSummary) {
    const title = typeof conversation._title === "string" ? conversation._title.trim() : "";
    const count = typeof conversation._message_count === "number" ? conversation._message_count : 0;
    const name = title || conversation._id;
    return count > 0 ? `${name} (${count})` : name;
  }

  private _active_conversation_summary() {
    return this._conversation_list.find((item) => item._id === this._conversation_id) ?? null;
  }

  private _render_conversation_title() {
    const conversation = this._active_conversation_summary();
    const title = conversation
      ? `Conversation: ${this._conversation_label(conversation)}`
      : this._conversation_id
        ? `Conversation: ${this._conversation_id}`
        : "No conversation open";
    this._set_studio_label(STUDIO_CONVERSATION_TITLE_ID, title);
  }

  private _render_conversation_selector() {
    const selector = XUI.getObject(STUDIO_CONVERSATION_SELECTOR_ID) as any;
    if (!selector) return;

    const conversations = this._conversation_list.length > 0
      ? this._conversation_list
      : this._conversation_id
        ? [{ _id: this._conversation_id } as XStudioConversationSummary]
        : [];

    const options = conversations.length > 0
      ? conversations.map((conversation) => ({
        label: this._conversation_label(conversation),
        value: conversation._id,
        selected: conversation._id === this._conversation_id,
      }))
      : [
        {
          label: "No conversation",
          value: "",
          selected: true,
        },
      ];

    selector._options = options;
    selector.renderOptions?.();
    selector.setValue?.(this._conversation_id);
    selector.value = this._conversation_id;
    this._render_conversation_title();
  }

  private async _list_conversations(app_id: string, env: string) {
    const result = await this._send_xvibe_command("list-conversations", {
      _app_id: app_id,
      _env: env,
    });
    const conversations = Array.isArray(result?._conversations)
      ? result._conversations
        .map((item: any) => this._normalize_conversation_summary(item))
        .filter((item: XStudioConversationSummary | null): item is XStudioConversationSummary => item !== null)
      : [];

    this._conversation_list = conversations;
    this._render_conversation_selector();
    return conversations;
  }

  private async _create_conversation(app_id: string, env: string) {
    const result = await this._send_xvibe_command("create-conversation", {
      _app_id: app_id,
      _env: env,
      _title: "XStudio Conversation",
      _metadata: {
        _source: "xstudio",
      },
    });
    const conversation = this._normalize_conversation_summary(result?._conversation);
    if (!conversation) {
      throw new Error("xvibe.create-conversation returned no conversation");
    }

    this._conversation_list = [
      conversation,
      ...this._conversation_list.filter((item) => item._id !== conversation._id),
    ];
    return conversation;
  }

  private async _load_conversation_messages() {
    if (!this._conversation_app_id || !this._conversation_env || !this._conversation_id) {
      this._conversation_messages = [];
      this._render_conversation_messages();
      return;
    }

    const result = await this._send_xvibe_command("get-last-messages", {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      _limit: STUDIO_CONVERSATION_LAST_MESSAGES_LIMIT,
    });
    const messages = Array.isArray(result?._messages)
      ? result._messages
        .map((item: any) => this._normalize_conversation_message(item))
        .filter((item: XStudioConversationMessage | null): item is XStudioConversationMessage => item !== null)
      : [];

    this._conversation_messages = messages;
    this._reset_conversation_action_transient_state();
    this._render_conversation_messages();
  }

  private async _open_conversation(
    app_id: string,
    env: string,
    conversation_id: string,
    options: { _log_switch?: boolean; _refresh_list?: boolean } = {},
  ) {
    const next_id = String(conversation_id ?? "").trim();
    if (!next_id) return;

    this._conversation_app_id = app_id;
    this._conversation_env = env;
    this._conversation_id = next_id;

    if (options._refresh_list) {
      await this._list_conversations(app_id, env);
    } else {
      this._render_conversation_selector();
    }

    this._log("conversation opened", {
      _app_id: app_id,
      _env: env,
      _conversation_id: next_id,
    });
    if (options._log_switch) {
      this._log("conversation switched", {
        _app_id: app_id,
        _env: env,
        _conversation_id: next_id,
      });
    }

    await this._load_conversation_messages();
  }

  private async _ensure_conversation_for_current_context() {
    if (!this._can_edit()) return;

    if (this._conversation_ready) {
      await this._conversation_ready;
      return;
    }

    this._conversation_ready = (async () => {
      const { _app_id: app_id, _env: env } = this._current_conversation_context();

      if (this._conversation_context_matches(app_id, env)) {
        await this._load_conversation_messages();
        return;
      }

      this._conversation_app_id = app_id;
      this._conversation_env = env;
      this._conversation_id = "";
      this._conversation_messages = [];
      this._render_conversation_messages();

      const conversations = await this._list_conversations(app_id, env);
      const active = conversations[0] ?? await this._create_conversation(app_id, env);
      await this._open_conversation(app_id, env, active._id);
    })();

    try {
      await this._conversation_ready;
    } finally {
      this._conversation_ready = null;
    }
  }

  private async _create_and_open_new_conversation() {
    if (!this._can_edit()) return;
    if (this._conversation_ready) {
      await this._conversation_ready;
    }

    const { _app_id: app_id, _env: env } = this._current_conversation_context();
    const conversation = await this._create_conversation(app_id, env);
    this._conversation_messages = [];
    this._render_conversation_messages();
    await this._open_conversation(app_id, env, conversation._id, {
      _log_switch: true,
      _refresh_list: true,
    });
  }

  private async _switch_conversation(payload?: any) {
    if (!this._can_edit()) return;
    if (this._conversation_ready) {
      await this._conversation_ready;
    }

    const conversation_id =
      is_obj(payload) && typeof payload._conversation_id === "string"
        ? payload._conversation_id.trim()
        : "";
    if (!conversation_id) return;

    const { _app_id: app_id, _env: env } = this._current_conversation_context();
    if (this._conversation_context_matches(app_id, env) && this._conversation_id === conversation_id) {
      await this._load_conversation_messages();
      return;
    }

    await this._open_conversation(app_id, env, conversation_id, {
      _log_switch: true,
    });
  }

  private async _append_conversation_message(text: string) {
    if (!this._can_edit()) return;
    await this._ensure_conversation_for_current_context();
    if (!this._conversation_app_id || !this._conversation_env || !this._conversation_id) return;

    const append_result = await this._send_xvibe_command("append-message", {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      _message: {
        _role: "user",
        _text: text,
      },
    });
    this._log("conversation message appended", {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      _role: "user",
    });

    this._set_conversation_input_value("");

    try {
      await this._analyze_conversation_message(
        text,
        this._conversation_append_message_id(append_result),
      );
    } catch (err) {
      const message = `Analyze message failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("analyze-message failed", {
        _app_id: this._conversation_app_id,
        _env: this._conversation_env,
        _conversation_id: this._conversation_id,
        _error: to_err(err),
      });
    } finally {
      await this._list_conversations(this._conversation_app_id, this._conversation_env);
      await this._load_conversation_messages();
    }
  }

  private _conversation_intent_summary(message: XStudioConversationMessage) {
    if (!is_obj(message._intent)) return message._text;

    return message._text || "Intent analyzed.";
  }

  private _conversation_intent_value(intent: Record<string, any>, key: string) {
    return intent[`_${key}`] ?? intent[key];
  }

  private _conversation_debug_value(value: any) {
    if (value === undefined || value === null || value === "") return "-";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return _xu.safe_compact_inline_json(value, 4000) || String(value);
  }

  private _conversation_debug_json(value: any) {
    if (value === undefined || value === null || value === "") return "-";
    try {
      return _xu.compact_json(value, 6000);
    } catch {
      return _xu.safe_compact_inline_json(value, 6000) || String(value);
    }
  }

  private _conversation_raw_action_params(intent: Record<string, any>) {
    const raw_actions = intent._actions ?? intent.actions;
    if (!Array.isArray(raw_actions)) return null;

    const params = raw_actions
      .map((raw_action) => is_obj(raw_action) && is_obj(raw_action._params) ? raw_action._params : null)
      .filter((raw_params): raw_params is Record<string, any> => raw_params !== null);

    if (params.length === 0) return null;
    return params.length === 1 ? params[0] : params;
  }

  private _conversation_debug_row(label: string, value: any, block = false) {
    return {
      _type: "view",
      class: `xstudio-conversation-debug-row${block ? " xstudio-conversation-debug-row-block" : ""}`,
      _children: [
        {
          _type: "label",
          class: "xstudio-conversation-debug-label",
          _text: `${label}:`,
        },
        {
          _type: "label",
          class: "xstudio-conversation-debug-value",
          _text: block ? this._conversation_debug_json(value) : this._conversation_debug_value(value),
        },
      ],
    };
  }

  private _conversation_intent_debug_view(message: XStudioConversationMessage, index: number) {
    if (!is_obj(message._intent)) return null;

    const intent = message._intent;
    return {
      _type: "xhtml",
      _html_tag: "details",
      _id: `xstudio-conversation-debug-${index}`,
      class: "xstudio-conversation-debug",
      _children: [
        {
          _type: "xhtml",
          _html_tag: "summary",
          class: "xstudio-conversation-debug-summary",
          _text: "Debug ▼",
        },
        {
          _type: "view",
          class: "xstudio-conversation-debug-content",
          _children: [
            this._conversation_debug_row("processor", this._conversation_intent_value(intent, "processor")),
            this._conversation_debug_row("processor_chain", this._conversation_intent_value(intent, "processor_chain")),
            this._conversation_debug_row("message_type", this._conversation_intent_value(intent, "message_type")),
            this._conversation_debug_row("execution_level", this._conversation_intent_value(intent, "execution_level")),
            this._conversation_debug_row("confidence", this._conversation_intent_value(intent, "confidence")),
            this._conversation_debug_row("raw intent", intent, true),
            this._conversation_debug_row("raw action params", this._conversation_raw_action_params(intent), true),
          ],
        },
      ],
    };
  }

  private _conversation_message_key(message: XStudioConversationMessage, index: number) {
    const message_id = typeof message._id === "string" && message._id.trim()
      ? message._id.trim()
      : `${message._role}-${index}-${message._created_at || "no-time"}`;

    return [
      this._conversation_app_id || "no-app",
      this._conversation_env || "no-env",
      this._conversation_id || "no-conversation",
      message_id,
    ].join("::");
  }

  private _intent_action_text(action: Record<string, any>, key: string, fallback = "") {
    const raw = action[`_${key}`] ?? action[key];
    if (raw === undefined || raw === null) return fallback;
    const value = String(raw).trim();
    return value || fallback;
  }

  private _intent_action_persisted_id(action: Record<string, any>) {
    const raw = action._id;
    if (raw === undefined || raw === null) return "";
    return String(raw).trim();
  }

  private _missing_intent_action_persisted_id_error() {
    return "Cannot update conversation action: missing persisted action._id.";
  }

  private _intent_action_natural_title(edit_action: string) {
    switch (edit_action) {
      case "hide-object":
        return "Hide selected object";
      case "show-object":
        return "Show selected object";
      case "remove-object":
        return "Delete selected object";
      case "duplicate-object":
        return "Duplicate selected object";
      case "move-object":
        return "Move selected object";
      default:
        return "";
    }
  }

  private _intent_action_display_title(raw_action: Record<string, any>, action_type: string, action_index: number) {
    const edit_action = is_obj(raw_action._params) && typeof raw_action._params._edit_action === "string"
      ? raw_action._params._edit_action.trim()
      : "";
    const natural_title = this._intent_action_natural_title(edit_action);
    const raw_title = this._intent_action_text(raw_action, "title");

    if (raw_title && raw_title !== action_type && raw_title !== edit_action) return raw_title;
    if (natural_title) return natural_title;
    if (action_type && action_type !== "-" && action_type !== "apply-view-edit") return action_type;
    return `Action ${action_index + 1}`;
  }

  private _conversation_intent_actions(message: XStudioConversationMessage, message_index: number) {
    if (message._role !== "tool" || !is_obj(message._intent)) return [];

    const raw_actions = message._intent._actions ?? message._intent.actions;
    if (!Array.isArray(raw_actions)) return [];

    return raw_actions
      .map((raw_action, action_index): XStudioIntentActionView | null => {
        if (!is_obj(raw_action)) return null;

        const action_id = this._intent_action_persisted_id(raw_action);
        const message_id = this._conversation_message_id(message, message_index);
        const action_key = this._conversation_action_key(
          message,
          message_index,
          raw_action,
          action_index,
        );
        const action_type = this._intent_action_text(raw_action, "action_type", "-");
        const title = this._intent_action_display_title(raw_action, action_type, action_index);
        const source_status = this._intent_action_text(
          raw_action,
          "status",
          STUDIO_INTENT_ACTION_STATUS_SUGGESTED,
        );

        return {
          _key: action_key,
          _render_key: action_key,
          _id: action_id,
          _message_id: message_id,
          _action_index: action_index,
          _title: title,
          _description: this._intent_action_text(raw_action, "description"),
          _action_type: action_type,
          _confidence: this._intent_action_text(raw_action, "confidence"),
          _status: this._conversation_action_status[action_key] ?? source_status,
          ...(typeof raw_action._requires_approval === "boolean"
            ? { _requires_approval: raw_action._requires_approval }
            : {}),
          _params: is_obj(raw_action._params) ? { ...raw_action._params } : null,
          _error:
            this._conversation_action_error[action_key] ||
            this._intent_action_text(raw_action, "error") ||
            this._intent_action_text(raw_action, "reason"),
        };
      })
      .filter((action): action is XStudioIntentActionView => action !== null);
  }

  private _intent_action_event_payload(action: XStudioIntentActionView) {
    return {
      _action_key: action._key,
      _action_id: action._id,
      _action_title: action._title,
      _action_type: action._action_type,
    };
  }

  private _normalize_intent_action_event_payload(payload?: any) {
    if (!is_obj(payload)) return null;
    const action_key = typeof payload._action_key === "string" ? payload._action_key.trim() : "";
    if (!action_key) return null;

    return {
      _action_key: action_key,
      _action_id: typeof payload._action_id === "string" ? payload._action_id.trim() : "",
      _action_title: typeof payload._action_title === "string" ? payload._action_title.trim() : "",
      _action_type: typeof payload._action_type === "string" ? payload._action_type.trim() : "",
    };
  }

  private _intent_action_edit_action(action: XStudioIntentActionView) {
    return typeof action._params?._edit_action === "string"
      ? action._params._edit_action.trim()
      : "";
  }

  private _is_supported_intent_apply_view_edit_action(action: XStudioIntentActionView) {
    const edit_action = this._intent_action_edit_action(action);
    if (STUDIO_SUPPORTED_INTENT_APPLY_VIEW_EDIT_ACTIONS.has(edit_action)) return true;

    if (edit_action !== "move-object" || !is_obj(action._params)) return false;

    const direction = typeof action._params._move_direction === "string"
      ? action._params._move_direction.trim().toLowerCase()
      : "";
    return action._params._requires_resolution === true &&
      (direction === "up" || direction === "down");
  }

  private _intent_action_card_execute_state(action: XStudioIntentActionView) {
    if (action._action_type !== "apply-view-edit") {
      return {
        _can_execute: false,
        _disabled_reason: "unsupported action type",
      };
    }

    if (
      action._status !== STUDIO_INTENT_ACTION_STATUS_SUGGESTED &&
      action._status !== STUDIO_INTENT_ACTION_STATUS_FAILED
    ) {
      return {
        _can_execute: false,
        _disabled_reason: `status is ${action._status || "unknown"}`,
      };
    }

    if (!is_obj(action._params)) {
      return {
        _can_execute: false,
        _disabled_reason: "missing params",
      };
    }

    if (!this._is_supported_intent_apply_view_edit_action(action)) {
      return {
        _can_execute: false,
        _disabled_reason: "unsupported edit action",
      };
    }

    if (action._requires_approval === false) {
      return {
        _can_execute: false,
        _disabled_reason: "approval disabled",
      };
    }

    return {
      _can_execute: true,
      _disabled_reason: "",
    };
  }

  private _find_conversation_intent_action(action_key: string) {
    for (let index = 0; index < this._conversation_messages.length; index += 1) {
      const action = this._conversation_intent_actions(this._conversation_messages[index], index)
        .find((item) => item._key === action_key);
      if (action) return action;
    }

    return null;
  }

  private _set_conversation_action_status(
    action_key: string,
    status: XStudioIntentActionLocalStatus,
    error = "",
  ) {
    if (!action_key) return;

    this._conversation_action_status[action_key] = status;
    if (error) {
      this._conversation_action_error[action_key] = error;
    } else {
      delete this._conversation_action_error[action_key];
    }

    this._render_conversation_messages();
  }

  private async _update_conversation_action_status(
    action: XStudioIntentActionView,
    status: XStudioIntentActionLocalStatus,
    error = "",
    action_result?: any,
  ) {
    if (!this._conversation_app_id || !this._conversation_env || !this._conversation_id) {
      throw new Error("No active conversation selected.");
    }

    const action_id = action._id.trim();
    if (!action_id) {
      throw new Error(this._missing_intent_action_persisted_id_error());
    }

    const params: Record<string, any> = {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      _message_id: action._message_id,
      _action_id: action_id,
      _action_index: action._action_index,
      _status: status,
    };

    if (error) {
      params._error = error;
      params._reason = error;
    }
    if (action_result !== undefined) {
      params._result = action_result;
    }

    this._log("conversation action status update requested", {
      _conversation_id: this._conversation_id,
      _message_id: action._message_id,
      _action_id: action_id,
      _action_index: action._action_index,
      _status: status,
      ...(error ? { _error: error } : {}),
    });
    this._log("update conversation action", {
      _message_id: action._message_id,
      _action_id: action_id,
      _status: status,
      _has_result: action_result !== undefined,
      _result_ok: is_obj(action_result) && action_result._ok === true,
    });
    const result = await this._send_xvibe_command("update-conversation-action", params);
    this._log("conversation action status update completed", {
      _conversation_id: this._conversation_id,
      _message_id: action._message_id,
      _action_id: action_id,
      _action_index: action._action_index,
      _status: status,
      _result: result,
    });
    return result;
  }

  private async _persist_conversation_action_status_and_reload(
    action: XStudioIntentActionView,
    status: XStudioIntentActionLocalStatus,
    error = "",
    action_result?: any,
  ) {
    if (!action._id.trim()) {
      const message = this._missing_intent_action_persisted_id_error();
      this._set_conversation_action_status(
        action._key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("conversation action status update skipped", {
        _conversation_id: this._conversation_id,
        _message_id: action._message_id,
        _action_id: "",
        _action_index: action._action_index,
        _status: status,
        _error: message,
      });
      return false;
    }

    try {
      await this._update_conversation_action_status(
        action,
        status,
        error,
        action_result,
      );
      await this._load_conversation_messages();
      return true;
    } catch (err) {
      this._set_conversation_action_status(
        action._key,
        status,
        error || to_err(err),
      );
      this._error("conversation action status update failed", {
        _conversation_id: this._conversation_id,
        _message_id: action._message_id,
        _action_id: action._id,
        _action_index: action._action_index,
        _status: status,
        _error: to_err(err),
      });
      return false;
    }
  }

  private _conversation_apply_result_message(edit_action: string) {
    switch (edit_action) {
      case "hide-object":
        return "Hidden selected object.";
      case "duplicate-object":
        return "Duplicated selected object.";
      case "remove-object":
        return "Deleted selected object.";
      case "move-object":
        return "Moved selected object.";
      default:
        return "";
    }
  }

  private _append_conversation_apply_result_message(edit_action: string) {
    const text = this._conversation_apply_result_message(edit_action);
    if (!text) return;

    this._conversation_messages.push({
      _role: "assistant",
      _text: text,
      _created_at: new Date().toISOString(),
    });
    this._render_conversation_messages();
  }

  private _resolve_conversation_intent_move_params(
    params: Record<string, any>,
  ): XStudioIntentActionParamsResult {
    const direction = typeof params._move_direction === "string"
      ? params._move_direction.trim().toLowerCase()
      : "";

    if (direction !== "up" && direction !== "down") {
      return {
        _ok: false,
        _error: "Move direction is not supported.",
        _params: null,
      };
    }

    const selected = this._selected_object;
    if (!selected) {
      return {
        _ok: false,
        _error: "Select an object first",
        _params: null,
      };
    }

    const selected_target_id = this._selected_object_json_id(selected);
    const target_id =
      typeof params._target_id === "string" && params._target_id.trim()
        ? params._target_id.trim()
        : selected_target_id;
    if (!target_id) {
      return {
        _ok: false,
        _error: "Action target is missing.",
        _params: null,
      };
    }

    if (!selected_target_id) {
      return {
        _ok: false,
        _error: "selected object has no persisted JSON id",
        _params: null,
      };
    }

    if (target_id !== selected_target_id) {
      return {
        _ok: false,
        _error: "Selected object does not match action target.",
        _params: null,
      };
    }

    const view_id =
      typeof params._view_id === "string" && params._view_id.trim()
        ? params._view_id.trim()
        : selected._source_view_id.trim();
    const selected_view_id = selected._source_view_id.trim();
    if (!selected_view_id || (view_id && view_id !== selected_view_id)) {
      return {
        _ok: false,
        _error: "Selected object does not match action source view.",
        _params: null,
      };
    }

    const sibling_context = this._selected_object_sibling_context(selected);
    if (!sibling_context) {
      return {
        _ok: false,
        _error: "Could not resolve selected object siblings.",
        _params: null,
      };
    }

    if (sibling_context._is_root) {
      return {
        _ok: false,
        _error: "Root object cannot be moved.",
        _params: null,
      };
    }

    const anchor_id = direction === "up"
      ? sibling_context._previous_sibling_id
      : sibling_context._next_sibling_id;
    if (!anchor_id) {
      return {
        _ok: false,
        _error: direction === "up"
          ? "Selected object is already the first child."
          : "Selected object is already the last child.",
        _params: null,
      };
    }

    const resolved_params: Record<string, any> = {
      ...params,
      _edit_action: "move-object",
      _view_id: view_id,
      _target_id: target_id,
      _target_type:
        typeof params._target_type === "string" && params._target_type.trim()
          ? params._target_type.trim()
          : selected._type.trim() || "object",
      ...(direction === "up"
        ? { _before_id: anchor_id }
        : { _after_id: anchor_id }),
    };

    delete resolved_params._move_direction;
    delete resolved_params._requires_resolution;
    if (direction === "up") {
      delete resolved_params._after_id;
    } else {
      delete resolved_params._before_id;
    }

    return {
      _ok: true,
      _error: "",
      _params: resolved_params,
    };
  }

  private _prepare_conversation_intent_apply_view_edit_params(
    action: XStudioIntentActionView,
  ): XStudioIntentActionParamsResult {
    if (action._action_type !== "apply-view-edit") {
      return {
        _ok: false,
        _error: STUDIO_INTENT_ACTION_UNSUPPORTED_MESSAGE,
        _params: null,
      };
    }

    if (action._requires_approval === false) {
      return {
        _ok: false,
        _error: "Action approval is disabled.",
        _params: null,
      };
    }

    if (!is_obj(action._params)) {
      return {
        _ok: false,
        _error: "Action params are missing.",
        _params: null,
      };
    }

    const params = _xu.clone_json(action._params) as Record<string, any>;
    if (!is_obj(params)) {
      return {
        _ok: false,
        _error: "Action params are invalid.",
        _params: null,
      };
    }

    const edit_action = typeof params._edit_action === "string"
      ? params._edit_action.trim()
      : "";
    params._edit_action = edit_action;

    if (edit_action === "move-object") {
      if (params._requires_resolution === true && typeof params._move_direction === "string" && params._move_direction.trim()) {
        return this._resolve_conversation_intent_move_params(params);
      }

      return {
        _ok: false,
        _error: STUDIO_INTENT_ACTION_UNSUPPORTED_MESSAGE,
        _params: null,
      };
    }

    if (!STUDIO_SUPPORTED_INTENT_APPLY_VIEW_EDIT_ACTIONS.has(edit_action)) {
      return {
        _ok: false,
        _error: STUDIO_INTENT_ACTION_UNSUPPORTED_MESSAGE,
        _params: null,
      };
    }

    return {
      _ok: true,
      _error: "",
      _params: params,
    };
  }

  private _merge_conversation_intent_apply_view_edit_context(
    params: Record<string, any>,
  ): XStudioIntentActionParamsResult {
    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();

    if (!app_id) {
      return {
        _ok: false,
        _error: "No active app selected",
        _params: null,
      };
    }

    if (!env) {
      return {
        _ok: false,
        _error: "No active environment selected",
        _params: null,
      };
    }

    const selected = this._selected_object;
    const selected_target_id = this._selected_object_json_id(selected);
    const selected_view_id = selected?._source_view_id.trim() ?? "";
    const current_view_id = this._resolve_studio_target_view_id();

    const view_id =
      typeof params._view_id === "string" && params._view_id.trim()
        ? params._view_id.trim()
        : selected_view_id || current_view_id;
    const target_id =
      typeof params._target_id === "string" && params._target_id.trim()
        ? params._target_id.trim()
        : selected_target_id;
    const target_type =
      typeof params._target_type === "string" && params._target_type.trim()
        ? params._target_type.trim()
        : selected?._type.trim() || "object";
    const edit_action =
      typeof params._edit_action === "string" && params._edit_action.trim()
        ? params._edit_action.trim()
        : "";

    if (!view_id) {
      return {
        _ok: false,
        _error: "Action source view is missing.",
        _params: null,
      };
    }

    if (!target_id) {
      return {
        _ok: false,
        _error: "Action target is missing.",
        _params: null,
      };
    }

    if (!edit_action) {
      return {
        _ok: false,
        _error: "Action edit type is missing.",
        _params: null,
      };
    }

    return {
      _ok: true,
      _error: "",
      _params: {
        ...params,
        _app_id: app_id,
        _env: env,
        _view_id: view_id,
        _target_id: target_id,
        _target_type: target_type,
        _edit_action: edit_action,
      },
    };
  }

  private async _apply_conversation_intent_action(payload?: any) {
    const payload_action = this._normalize_intent_action_event_payload(payload);
    if (!payload_action) return;

    const action = this._find_conversation_intent_action(payload_action._action_key);
    this._log("intent action execute requested", {
      ...payload_action,
      ...(action
        ? {
          _requires_approval: action._requires_approval,
          _edit_action: action._params?._edit_action,
        }
        : {}),
    });

    if (!action) {
      const message = "Action not found.";
      this._set_conversation_action_status(
        payload_action._action_key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("intent action execute failed", {
        ...payload_action,
        _message: message,
      });
      return;
    }

    if (!action._id.trim()) {
      const message = this._missing_intent_action_persisted_id_error();
      this._set_conversation_action_status(
        action._key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("intent action execute failed", {
        _action_key: action._key,
        _message_id: action._message_id,
        _action_id: "",
        _action_type: action._action_type,
        _reason: message,
      });
      return;
    }

    this._set_conversation_action_status(action._key, STUDIO_INTENT_ACTION_STATUS_RUNNING);

    const prepared = this._prepare_conversation_intent_apply_view_edit_params(action);
    if (!prepared._ok || !prepared._params) {
      this._set_conversation_action_status(
        action._key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        prepared._error,
      );
      await this._persist_conversation_action_status_and_reload(
        action,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        prepared._error,
      );
      this._write_studio_status(prepared._error);
      this._error("intent action execute failed", {
        _action_key: action._key,
        _action_type: action._action_type,
        _reason: prepared._error,
      });
      return;
    }

    const context_result = this._merge_conversation_intent_apply_view_edit_context(prepared._params);
    if (!context_result._ok || !context_result._params) {
      this._set_conversation_action_status(
        action._key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        context_result._error,
      );
      await this._persist_conversation_action_status_and_reload(
        action,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        context_result._error,
      );
      this._write_studio_status(context_result._error);
      this._error("intent action execute failed", {
        _action_key: action._key,
        _action_type: action._action_type,
        _reason: context_result._error,
      });
      return;
    }

    const params = context_result._params;
    this._write_studio_status(`Executing ${action._title || action._action_type}...`);
    this._log("intent action apply-view-edit params", {
      _app_id: params._app_id,
      _env: params._env,
      _view_id: params._view_id,
      _target_id: params._target_id,
      _target_type: params._target_type,
      _edit_action: params._edit_action,
    });

    const structured_edit = {
      _view_id: typeof params._view_id === "string" ? params._view_id : "",
      _action: typeof params._edit_action === "string" ? params._edit_action : "",
      _target_id: typeof params._target_id === "string" ? params._target_id : "",
    };
    const should_track_structured_edit =
      STUDIO_INTENT_APPLY_VIEW_EDIT_REFRESH_ACTIONS.has(structured_edit._action);

    try {
      if (should_track_structured_edit) {
        this._xvm_client?.note_structured_view_edit?.(structured_edit);
      }

      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        if (should_track_structured_edit) {
          this._xvm_client?.clear_pending_structured_view_edit?.(structured_edit);
        }

        const message = this._format_apply_view_edit_failure(result);
        this._set_conversation_action_status(
          action._key,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          message,
        );
        await this._persist_conversation_action_status_and_reload(
          action,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          message,
          result,
        );
        this._write_studio_status(message);
        this._error("intent action execute failed", {
          _action_key: action._key,
          _action_type: action._action_type,
          _edit_action: params._edit_action,
          _structured_error: result,
        });
        return;
      }

      const new_target_id = params._edit_action === "duplicate-object"
        ? this._extract_new_target_id(result)
        : "";
      if (new_target_id) {
        this._selected_object_pending_select_id = new_target_id;
      }

      await this._persist_conversation_action_status_and_reload(
        action,
        STUDIO_INTENT_ACTION_STATUS_DONE,
        "",
        result,
      );
      this._append_conversation_apply_result_message(params._edit_action);
      this._write_studio_status("Action applied");
      this._log("intent action execute completed", {
        _action_key: action._key,
        _action_type: action._action_type,
        _edit_action: params._edit_action,
        ...(new_target_id ? { _new_target_id: new_target_id } : {}),
        _result: result,
      });

      const refresh_payload = this._intent_action_execute_refresh_payload(params, result);
      this._log("intent action execute refresh requested", refresh_payload);
      try {
        const refresh_result = await this._request_intent_action_execute_refresh(params, result);
        this._log("intent action execute refresh completed", {
          ...refresh_payload,
          _refresh: refresh_result ?? null,
        });
      } catch (refresh_err) {
        this._log("intent action execute refresh completed", {
          ...refresh_payload,
          _refresh: {
            _ok: false,
            _error: to_err(refresh_err),
          },
        });
        this._error("intent action execute refresh failed", {
          ...refresh_payload,
          _error: to_err(refresh_err),
        });
      }
      this._refresh_object_tree_for_current_view();
      this._clear_conversation_action_selection_if_hidden_or_removed(params);
    } catch (err) {
      if (should_track_structured_edit) {
        this._xvm_client?.clear_pending_structured_view_edit?.(structured_edit);
      }

      const message = "Action execution failed.";
      this._set_conversation_action_status(
        action._key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      await this._persist_conversation_action_status_and_reload(
        action,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("intent action execute failed", {
        _action_key: action._key,
        _action_type: action._action_type,
        _edit_action: params._edit_action,
        _error: to_err(err),
      });
    }
  }

  private async _dismiss_conversation_intent_action(payload?: any) {
    const payload_action = this._normalize_intent_action_event_payload(payload);
    if (!payload_action) return;

    const action = this._find_conversation_intent_action(payload_action._action_key);
    if (!action) {
      this._error("intent action dismiss failed", {
        ...payload_action,
        _message: "Action not found.",
      });
      return;
    }

    this._set_conversation_action_status(
      action._key,
      STUDIO_INTENT_ACTION_STATUS_DISMISSED,
    );
    await this._persist_conversation_action_status_and_reload(
      action,
      STUDIO_INTENT_ACTION_STATUS_DISMISSED,
    );
    this._log("intent action dismissed", {
      _action_key: action._key,
      _action_id: action._id,
      _message_id: action._message_id,
    });
  }

  private _conversation_intent_action_card(action: XStudioIntentActionView, message_index: number, action_index: number) {
    const is_running = action._status === STUDIO_INTENT_ACTION_STATUS_RUNNING;
    const is_done = action._status === STUDIO_INTENT_ACTION_STATUS_DONE;
    const is_failed = action._status === STUDIO_INTENT_ACTION_STATUS_FAILED;
    const execute_state = this._intent_action_card_execute_state(action);
    const is_apply_disabled = !execute_state._can_execute;
    const status_class = _xu.normalize_id(action._status) ?? "unknown";
    const action_payload = this._intent_action_event_payload(action);
    const apply_text = is_running ? "Running" : is_done ? "✓ Applied" : is_failed ? "Retry" : "Apply";
    const apply_title = is_running
      ? "Action is running"
      : is_done
        ? "Action completed"
        : is_failed
          ? execute_state._disabled_reason || "Retry action"
          : execute_state._disabled_reason || "Execute approved action";
    const edit_action = this._intent_action_edit_action(action);
    this._log("intent action card state", {
      _action_id: action._id,
      _action_type: action._action_type,
      _status: action._status,
      _requires_approval: action._requires_approval,
      _has_params: is_obj(action._params),
      _edit_action: edit_action,
      _can_execute: execute_state._can_execute,
      _disabled_reason: execute_state._disabled_reason,
    });

    if (is_done) {
      return {
        _type: "view",
        _id: `xstudio-intent-action-${message_index}-${action_index}`,
        class: `xstudio-intent-action-card xstudio-intent-action-card-${status_class} xstudio-intent-action-card-compact`,
        _children: [
          {
            _type: "label",
            class: "xstudio-intent-action-success",
            _text: `✓ Applied${action._title ? `: ${action._title}` : ""}`,
          },
        ],
      };
    }

    const button_children = [
      {
        _type: "button",
        _id: `xstudio-intent-action-apply-${message_index}-${action_index}`,
        type: "button",
        class: `xstudio-intent-action-button xstudio-intent-action-apply${is_done ? " xstudio-intent-action-applied" : ""}`,
        _text: apply_text,
        title: apply_title,
        ...(is_apply_disabled ? { disabled: true } : {}),
        _on: {
          click: {
            _module: "xem",
            _op: "fire",
            _params: {
              event: "studio:intent-action-apply",
              data: action_payload,
            },
          },
        },
      },
      ...(!is_done && !is_running
        ? [
          {
            _type: "button",
            _id: `xstudio-intent-action-dismiss-${message_index}-${action_index}`,
            type: "button",
            class: "xstudio-intent-action-button xstudio-intent-action-dismiss",
            _text: "Dismiss",
            title: "Dismiss action",
            _on: {
              click: {
                _module: "xem",
                _op: "fire",
                _params: {
                  event: "studio:intent-action-dismiss",
                  data: action_payload,
                },
              },
            },
          },
        ]
        : []),
    ];

    return {
      _type: "view",
      _id: `xstudio-intent-action-${message_index}-${action_index}`,
      class: `xstudio-intent-action-card xstudio-intent-action-card-${status_class}`,
      _children: [
        {
          _type: "view",
          class: "xstudio-intent-action-content",
          _children: [
            {
              _type: "label",
              class: "xstudio-intent-action-title",
              _text: action._title,
            },
            ...(action._description
              ? [
                {
                  _type: "label",
                  class: "xstudio-intent-action-description",
                  _text: action._description,
                },
              ]
              : []),
            ...(action._error
              ? [
                {
                  _type: "label",
                  class: "xstudio-intent-action-error",
                  _text: action._error,
                },
              ]
              : []),
          ],
        },
        {
          _type: "view",
          class: "xstudio-intent-action-buttons",
          _children: button_children,
        },
      ],
    };
  }

  private _conversation_intent_actions_view(message: XStudioConversationMessage, message_index: number) {
    const actions = this._conversation_intent_actions(message, message_index)
      .filter((action) =>
        action._status !== STUDIO_INTENT_ACTION_STATUS_DISMISSED,
      );

    if (actions.length === 0) return null;

    return {
      _type: "view",
      _id: `xstudio-intent-actions-${message_index}`,
      class: "xstudio-intent-actions",
      _children: [
        {
          _type: "label",
          class: "xstudio-intent-actions-title",
          _text: "Suggested actions:",
        },
        ...actions.map((action, action_index) =>
          this._conversation_intent_action_card(action, message_index, action_index),
        ),
      ],
    };
  }

  private _conversation_message_view(message: XStudioConversationMessage, index: number) {
    const role =
      message._role === "assistant" ||
        message._role === "system" ||
        message._role === "tool"
        ? message._role
        : "user";
    const label =
      role === "user"
        ? "You"
        : role === "assistant"
          ? "Assistant"
          : role === "system"
            ? "System"
            : "Tool";
    const created_at = this._format_conversation_time(message._created_at);
    const actions_view = this._conversation_intent_actions_view(message, index);
    const debug_view = this._conversation_intent_debug_view(message, index);

    return {
      _type: "view",
      _id: `xstudio-conversation-message-${index}`,
      class: `xstudio-conversation-message xstudio-conversation-message-${role}`,
      _children: [
        {
          _type: "view",
          class: "xstudio-conversation-meta",
          _children: [
            {
              _type: "label",
              class: "xstudio-conversation-role",
              _text: label,
            },
            {
              _type: "label",
              class: "xstudio-conversation-time",
              _text: created_at,
            },
          ],
        },
        {
          _type: "label",
          class: "xstudio-conversation-bubble",
          _text: this._conversation_intent_summary(message),
        },
        ...(debug_view ? [debug_view] : []),
        ...(actions_view ? [actions_view] : []),
      ],
    };
  }

  private _format_conversation_time(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private _scroll_conversation_to_bottom() {
    const list = XUI.getObject(STUDIO_CONVERSATION_MESSAGES_ID) as any;
    const dom = list?.dom;
    if (!(dom instanceof HTMLElement)) return;
    dom.scrollTop = dom.scrollHeight;
  }

  private _render_conversation_messages() {
    const list = XUI.getObject(STUDIO_CONVERSATION_MESSAGES_ID) as any;
    if (!list) return;

    const messages = this._conversation_messages.map((message) => ({ ...message }));
    const children = messages.length > 0
      ? messages.map((message, index) => this._conversation_message_view(message, index))
      : [
        {
          _id: "xstudio-conversation-empty",
          _type: "label",
          class: "xstudio-conversation-empty",
          _text: "No messages yet.",
        },
      ];

    list.update?.({ _children: children });
    queueMicrotask(() => this._scroll_conversation_to_bottom());
  }

  private _set_conversation_send_enabled(enabled: boolean) {
    this._set_studio_control_disabled(STUDIO_CONVERSATION_SEND_BUTTON_ID, !enabled);
  }

  private _update_conversation_input_state(payload?: any) {
    const value = is_obj(payload) && typeof payload._value === "string"
      ? payload._value
      : this._read_conversation_input_value();
    this._set_conversation_send_enabled(this._local_conversation_text(value).length > 0);
  }

  private _handle_conversation_keyup(payload?: any) {
    this._update_conversation_input_state(payload);
    if (!is_obj(payload)) return;

    const key = String(payload._key ?? "");
    const uses_command_modifier = payload._meta_key === true || payload._ctrl_key === true;
    if (key !== "Enter" || !uses_command_modifier) return;

    void this._send_conversation_message(payload._value);
  }

  private _read_conversation_input_value() {
    const input = XUI.getObject(STUDIO_CONVERSATION_INPUT_ID) as any;
    const value = input?.getValue?.() ?? input?.dom?.value ?? _xd.get(STUDIO_CONVERSATION_INPUT_XD_KEY) ?? "";
    return String(value ?? "");
  }

  private _set_conversation_input_value(value: string) {
    const input = XUI.getObject(STUDIO_CONVERSATION_INPUT_ID) as any;
    if (input?.setValue) {
      input.setValue(value);
    } else if (input?.dom && "value" in input.dom) {
      input.dom.value = value;
    }
    _xd.set(STUDIO_CONVERSATION_INPUT_XD_KEY, value, { source: "xstudio-conversation" });
    this._set_conversation_send_enabled(this._local_conversation_text(value).length > 0);
  }

  private _apply_portlet_state() {
    for (const portlet_id of STUDIO_PORTLET_IDS) {
      const config = STUDIO_PORTLETS[portlet_id];
      this._set_portlet_visible(config._object_id, this._portlet_visibility[portlet_id] === true);
      this._set_portlet_button_state(portlet_id);
    }
  }

  private _apply_explorer_section_state() {
    for (const section_id of STUDIO_EXPLORER_SECTION_IDS) {
      const config = STUDIO_EXPLORER_SECTIONS[section_id];
      const open = this._explorer_section_is_open(section_id);
      this._set_object_class_token(config._section_id, STUDIO_EXPLORER_SECTION_COLLAPSED_CLASS, !open);
      this._set_object_class_token(config._body_id, STUDIO_PORTLET_HIDDEN_CLASS, !open);
      this._set_object_visible(config._body_id, open);
      this._set_button_text(config._toggle_id, this._explorer_section_toggle_text(section_id));
      this._set_button_title(config._toggle_id, this._explorer_section_toggle_title(section_id));
      this._set_object_attribute(config._toggle_id, "aria-expanded", String(open));
    }
  }

  private _normalize_portlet_id(value: any): XStudioPortletId | "" {
    const portlet_id = String(value ?? "").trim().toLowerCase();
    return (STUDIO_PORTLET_IDS as readonly string[]).includes(portlet_id)
      ? (portlet_id as XStudioPortletId)
      : "";
  }

  private _normalize_explorer_section_id(value: any): XStudioExplorerSectionId | "" {
    const section_id = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
    return (STUDIO_EXPLORER_SECTION_IDS as readonly string[]).includes(section_id)
      ? (section_id as XStudioExplorerSectionId)
      : "";
  }

  private _normalize_app_explorer_section_id(value: any): XStudioAppExplorerSectionId | "" {
    const section_id = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
    if (section_id === "app") return "app";
    return (STUDIO_APP_EXPLORER_CATEGORY_IDS as readonly string[]).includes(section_id)
      ? (section_id as XStudioAppExplorerCategoryId)
      : "";
  }

  private _apply_dock_state() {
    this._set_shell_class_enabled("xstudio-left-collapsed", this._left_dock_collapsed);
    this._set_shell_class_enabled("xstudio-right-collapsed", this._right_dock_collapsed);
    this._set_button_text(
      "xstudio-toggle-left-dock",
      this._left_dock_toggle_text(),
    );
    this._set_button_title(
      "xstudio-toggle-left-dock",
      this._left_dock_toggle_title(),
    );
    this._set_button_text(
      "xstudio-toggle-right-dock",
      this._right_dock_toggle_text(),
    );
    this._set_button_title(
      "xstudio-toggle-right-dock",
      this._right_dock_toggle_title(),
    );
    this._apply_portlet_state();
    this._apply_explorer_section_state();
  }

  private _toggle_left_dock() {
    this._left_dock_collapsed = !this._left_dock_collapsed;
    this._apply_dock_state();
  }

  private _toggle_right_dock() {
    this._right_dock_collapsed = !this._right_dock_collapsed;
    this._apply_dock_state();
  }

  private _toggle_explorer_section(section_id: XStudioExplorerSectionId) {
    const open = !this._explorer_section_is_open(section_id);
    this._explorer_section_open[section_id] = open;
    this._apply_explorer_section_state();
    this._log(
      section_id === "app_explorer"
        ? "app explorer section toggled"
        : "explorer section toggled",
      {
        _section: section_id,
        _open: open,
      },
    );
  }

  private _app_explorer_section_is_open(section_id: XStudioAppExplorerSectionId) {
    return this._app_explorer_section_open[section_id] === true;
  }

  private _toggle_app_explorer_section(section_id: XStudioAppExplorerSectionId) {
    const open = !this._app_explorer_section_is_open(section_id);
    this._app_explorer_section_open[section_id] = open;
    this._render_cached_app_explorer();
    this._log("app explorer section toggled", {
      _section: section_id,
      _open: open,
    });
  }

  private _normalize_create_view_template(value: any): XStudioCreateViewTemplate {
    const template = String(value ?? "").trim().toLowerCase();
    return template === "page" || template === "component" ? template : "blank";
  }

  private _set_add_view_error(message: string) {
    this._set_studio_label(STUDIO_APP_EXPLORER_ADD_VIEW_ERROR_ID, message);
    this._set_object_class_token(
      STUDIO_APP_EXPLORER_ADD_VIEW_ERROR_ID,
      "xstudio-add-view-error-visible",
      Boolean(message),
    );
    this._set_object_attribute(
      STUDIO_APP_EXPLORER_ADD_VIEW_ID_INPUT_ID,
      "aria-invalid",
      String(Boolean(message)),
    );
  }

  private _set_add_view_dialog_busy(busy: boolean) {
    this._set_studio_control_disabled(STUDIO_APP_EXPLORER_ADD_VIEW_ID_INPUT_ID, busy);
    this._set_studio_control_disabled(STUDIO_APP_EXPLORER_ADD_VIEW_TITLE_INPUT_ID, busy);
    this._set_studio_control_disabled(STUDIO_APP_EXPLORER_ADD_VIEW_TEMPLATE_SELECT_ID, busy);
    this._set_studio_control_disabled(STUDIO_APP_EXPLORER_ADD_VIEW_CANCEL_ID, busy);
    this._set_studio_control_disabled(STUDIO_APP_EXPLORER_ADD_VIEW_CREATE_ID, busy);
  }

  private _add_view_dialog_values(show_errors: boolean) {
    const view_id = this._read_studio_control_value(STUDIO_APP_EXPLORER_ADD_VIEW_ID_INPUT_ID).trim();
    const title = this._read_studio_control_value(STUDIO_APP_EXPLORER_ADD_VIEW_TITLE_INPUT_ID).trim();
    const template = this._normalize_create_view_template(
      this._read_studio_control_value(STUDIO_APP_EXPLORER_ADD_VIEW_TEMPLATE_SELECT_ID),
    );
    let error = "";

    if (!view_id) {
      error = show_errors ? "View ID is required." : "";
    } else if (!/^[a-z0-9_-]+$/.test(view_id)) {
      error = "Use lowercase letters, numbers, hyphen, or underscore only.";
    }

    return {
      _ok: !error && Boolean(view_id),
      _view_id: view_id,
      _title: title,
      _template: template,
      _error: error,
    };
  }

  private _validate_add_view_dialog(show_errors: boolean) {
    const result = this._add_view_dialog_values(show_errors);
    this._set_add_view_error(result._error);
    return result;
  }

  private _open_add_view_dialog() {
    this._set_studio_control_value(STUDIO_APP_EXPLORER_ADD_VIEW_ID_INPUT_ID, "");
    this._set_studio_control_value(STUDIO_APP_EXPLORER_ADD_VIEW_TITLE_INPUT_ID, "");
    this._set_studio_control_value(STUDIO_APP_EXPLORER_ADD_VIEW_TEMPLATE_SELECT_ID, "blank");
    this._set_add_view_error("");
    this._set_add_view_dialog_busy(false);

    const dialog = XUI.getObject(STUDIO_APP_EXPLORER_ADD_VIEW_DIALOG_ID) as any;
    dialog?.show?.();
    queueMicrotask(() => {
      const input = XUI.getObject(STUDIO_APP_EXPLORER_ADD_VIEW_ID_INPUT_ID) as any;
      input?.dom?.focus?.();
    });
    this._log("add view dialog opened");
  }

  private _hide_add_view_dialog() {
    this._set_add_view_dialog_busy(false);
    this._set_add_view_error("");
    const dialog = XUI.getObject(STUDIO_APP_EXPLORER_ADD_VIEW_DIALOG_ID) as any;
    dialog?.hide?.();
  }

  private _created_view_id(result: ServerCreateViewRes, fallback: string) {
    const direct = typeof result?._view_id === "string" ? result._view_id.trim() : "";
    const nested = typeof result?._result?._view_id === "string" ? result._result._view_id.trim() : "";
    return direct || nested || fallback;
  }

  private async _create_view_from_add_view_dialog() {
    const form = this._validate_add_view_dialog(true);
    if (!form._ok) return;

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();

    if (!app_id) {
      this._set_add_view_error("No active app selected.");
      return;
    }

    if (!env) {
      this._set_add_view_error("No active environment selected.");
      return;
    }

    this._set_add_view_dialog_busy(true);
    this._write_studio_status(`Creating ${form._view_id}...`);
    this._log("create view requested", {
      _app_id: app_id,
      _env: env,
      _view_id: form._view_id,
      _template: form._template,
    });

    try {
      const result = await this._send_server_xvm_command("create-view", {
        _app_id: app_id,
        _env: env,
        _view_id: form._view_id,
        _title: form._title,
        _template: form._template,
      }) as ServerCreateViewRes;
      const view_id = this._created_view_id(result, form._view_id);

      this._app_explorer_section_open.app = true;
      this._app_explorer_section_open.views = true;
      await this._refresh_app_explorer();
      this._app_explorer_selected_key = this._app_explorer_artifact_key("view", view_id);
      this._render_cached_app_explorer();
      this._hide_add_view_dialog();
      this._write_studio_status(`Created ${view_id}`);
      this._log("create view completed", {
        _app_id: app_id,
        _env: env,
        _view_id: view_id,
        _template: form._template,
      });
    } catch (err) {
      const message = `Create view failed: ${to_err(err)}`;
      this._set_add_view_error(message);
      this._write_studio_status(message);
      this._error("create view failed", {
        _app_id: app_id,
        _env: env,
        _view_id: form._view_id,
        _template: form._template,
        _error: to_err(err),
      });
      this._set_add_view_dialog_busy(false);
    }
  }

  private async _toggle_studio() {
    try {
      if (!this._can_edit()) {
        this._log("studio toggle ignored: edit mode disabled", {
          _app_id: this._xvm_client?.getActiveAppId?.(),
        });
        return;
      }

      const active_view_id = (XVM as any).getActiveViewId?.({ region: STUDIO_REGION_ID });
      if (active_view_id === STUDIO_VIEW_ID) {
        await this._close_studio();
        return;
      }

      await (XVM as any).show?.(STUDIO_VIEW_ID, {
        region: STUDIO_REGION_ID,
        allowCreateFromRaw: true,
      });
      this._apply_dock_state();
      this._refresh_object_tree_for_current_view();
      this._log("studio opened");
    } catch (err) {
      this._error("studio toggle failed", err);
    }
  }

  private _get_cached_view(view_id: string) {
    if (!view_id) return null;
    if (typeof this._xvm_client?._read_cached_view === "function") {
      const persisted_view = this._xvm_client._read_cached_view(view_id);
      if (is_obj(persisted_view)) return persisted_view;
    }
    if (typeof this._xvm_client?.get_view === "function") {
      return this._xvm_client.get_view(view_id);
    }
    if (
      this._xvm_client?.get_current_view_id?.() === view_id &&
      typeof this._xvm_client?.get_current_view === "function"
    ) {
      return this._xvm_client.get_current_view();
    }
    return null;
  }

  private _format_tree_text(text: any, max_chars = 48) {
    if (typeof text !== "string") return "";
    const clean = text.trim().replace(/\s+/g, " ");
    if (!clean) return "";
    return clean.length > max_chars
      ? `${clean.slice(0, Math.max(0, max_chars - 3))}...`
      : clean;
  }

  private _format_object_tree_label_parts(obj: Record<string, any>) {
    const type = typeof obj._type === "string" && obj._type.trim() ? obj._type.trim() : "object";
    const text = this._format_tree_text(obj._text, 56);
    const name = this._format_tree_text(obj._name, 56);
    const label = this._format_tree_text(obj._label, 56);
    const title = this._format_tree_text(obj._title, 56);
    const id = this._format_tree_text(obj._id, 36);
    const id_label = id ? `#${id}` : "";
    const view_ref = type === "xvm-view"
      ? this._format_tree_text(obj._view_id, 36)
      : "";

    const primary = text || name || label || title || id_label || view_ref || "(anonymous)";
    const secondary_parts: string[] = [];

    if (id_label && id_label !== primary) secondary_parts.push(id_label);
    if (view_ref && view_ref !== primary) secondary_parts.push(`ref:${view_ref}`);

    return {
      _primary: primary,
      _secondary: secondary_parts.join(" "),
      _type: type,
      _title: [
        primary,
        ...secondary_parts,
        `[${type}]`,
      ].filter(Boolean).join(" "),
    };
  }

  private _format_object_tree_label(obj: Record<string, any>) {
    return this._format_object_tree_label_parts(obj)._title;
  }

  private _object_tree_search_text(obj: Record<string, any>) {
    return [
      obj._id,
      obj._text,
      obj._name,
      obj._title,
      obj._label,
      obj._type,
    ]
      .map((value) => value === undefined || value === null ? "" : String(value).trim().toLowerCase())
      .filter(Boolean)
      .join("\n");
  }

  private _selected_object_matches(a: XStudioSelectedObject | null, b: XStudioSelectedObject | null) {
    if (!a || !b) return false;
    if (a._source_view_id !== b._source_view_id) return false;

    const a_id = a._json_id.trim() || a._id.trim();
    const b_id = b._json_id.trim() || b._id.trim();
    if (a_id || b_id) {
      return Boolean(a_id && b_id && a_id === b_id && a._type === b._type);
    }

    return a._path === b._path && a._type === b._type;
  }

  private _safe_selected_json_preview(obj: Record<string, any> | null) {
    if (!obj) return "";
    try {
      return JSON.stringify(
        obj,
        (_key, value) => {
          if (typeof value === "function") return undefined;
          return value;
        },
        2,
      );
    } catch {
      return String(obj);
    }
  }

  private _safe_selected_json_metadata(obj: Record<string, any>) {
    const metadata = obj._meta;
    if (!is_obj(metadata)) return "";

    try {
      return JSON.stringify(metadata, (_key, value) => {
        if (typeof value === "function") return undefined;
        return value;
      });
    } catch {
      return String(metadata);
    }
  }

  private _object_tree_node_key(
    source_view_id: string,
    tree_path: string,
    path: string,
    type: string,
    json_id: string,
  ) {
    return [
      source_view_id.trim() || "unknown-view",
      tree_path.trim() || path.trim() || "$",
      json_id.trim() || "anonymous",
      type.trim() || "object",
    ].join("::");
  }

  private _flatten_object_tree_nodes(
    nodes: XStudioObjectTreeNode[],
    out: XStudioObjectTreeNode[] = [],
  ) {
    for (const node of nodes) {
      out.push(node);
      if (node._children.length > 0) {
        this._flatten_object_tree_nodes(node._children, out);
      }
    }

    return out;
  }

  private _sync_object_tree_expansion_defaults(nodes: XStudioObjectTreeNode[]) {
    const flat_nodes = this._flatten_object_tree_nodes(nodes);
    const live_node_keys = new Set(flat_nodes.map((node) => node._node_key));

    for (const key of Array.from(this._object_tree_expanded_node_keys)) {
      if (!live_node_keys.has(key)) this._object_tree_expanded_node_keys.delete(key);
    }

    for (const key of Array.from(this._object_tree_touched_expansion_node_keys)) {
      if (!live_node_keys.has(key)) this._object_tree_touched_expansion_node_keys.delete(key);
    }

    for (const node of flat_nodes) {
      if (node._children.length === 0) continue;
      if (node._depth > 1) continue;
      if (this._object_tree_touched_expansion_node_keys.has(node._node_key)) continue;

      this._object_tree_expanded_node_keys.add(node._node_key);
    }
  }

  private _object_tree_node_is_expanded(node: XStudioObjectTreeNode, search_active: boolean) {
    if (node._children.length === 0) return false;
    if (search_active) return true;
    return this._object_tree_expanded_node_keys.has(node._node_key);
  }

  private _toggle_object_tree_node(node: XStudioObjectTreeNode) {
    if (node._children.length === 0) return;

    const expanded = !this._object_tree_expanded_node_keys.has(node._node_key);
    this._object_tree_touched_expansion_node_keys.add(node._node_key);
    if (expanded) {
      this._object_tree_expanded_node_keys.add(node._node_key);
    } else {
      this._object_tree_expanded_node_keys.delete(node._node_key);
    }

    this._log("object tree node toggled", {
      _node_key: node._node_key,
      _label: node._label,
      _expanded: expanded,
      _depth: node._depth,
      _source_view_id: node._meta?._source_view_id ?? "",
      _target_id: node._meta?._json_id ?? "",
    });
    this._render_cached_object_tree_nodes();
  }

  private _object_tree_style_hides_object(style: any) {
    if (typeof style === "string") {
      return /(?:^|;)\s*display\s*:\s*none\s*(?:;|$)/i.test(style) ||
        /(?:^|;)\s*visibility\s*:\s*hidden\s*(?:;|$)/i.test(style);
    }

    if (!is_obj(style)) return false;

    const display = String(style.display ?? style.Display ?? "").trim().toLowerCase();
    const visibility = String(style.visibility ?? style.Visibility ?? "").trim().toLowerCase();
    return display === "none" || visibility === "hidden";
  }

  private _object_tree_node_is_visible(node: XStudioObjectTreeNode) {
    const obj = node._object;
    if (!obj) return true;

    if (obj._visible === false) return false;
    if (obj.hidden === true) return false;
    if (String(obj["aria-hidden"] ?? "").trim().toLowerCase() === "true") return false;
    if (this._object_tree_style_hides_object(obj.style)) return false;
    if (this._object_tree_style_hides_object(obj._style)) return false;

    return true;
  }

  private _object_tree_node_can_edit_visibility(node: XStudioObjectTreeNode) {
    const meta = node._meta;
    if (!meta) return false;
    if (!meta._json_id.trim()) return false;
    if (!meta._source_view_id.trim()) return false;
    return meta._path.trim() !== "$";
  }

  private _build_object_tree_nodes(
    obj: Record<string, any>,
    source_view_id: string,
    path: string,
    parent_path: string,
    previous_sibling_id: string,
    next_sibling_id: string,
    parent_node_key: string,
    tree_path: string,
    depth: number,
    is_xvm_ref_child: boolean,
    allow_xvm_refs: boolean,
    out: XStudioObjectTreeNode[],
  ) {
    if (!is_obj(obj)) return;

    const type = typeof obj._type === "string" && obj._type.trim() ? obj._type.trim() : "object";
    const json_id = typeof obj._id === "string" && obj._id.trim() ? obj._id.trim() : "";
    const text = typeof obj._text === "string" && obj._text.trim() ? obj._text.trim() : "";
    const node_key = this._object_tree_node_key(source_view_id, tree_path, path, type, json_id);
    const meta: XStudioSelectedObject = {
      _id: json_id,
      _json_id: json_id,
      _type: type,
      _text: text,
      _source_view_id: source_view_id,
      _path: path,
      _parent_path: parent_path,
      _previous_sibling_id: previous_sibling_id,
      _next_sibling_id: next_sibling_id,
      _is_xvm_ref_child: is_xvm_ref_child,
      _json_metadata: this._safe_selected_json_metadata(obj),
    };

    const label_parts = this._format_object_tree_label_parts(obj);
    const node: XStudioObjectTreeNode = {
      _key: "",
      _node_key: node_key,
      _parent_node_key: parent_node_key,
      _label: label_parts._title,
      _label_primary: label_parts._primary,
      _label_secondary: label_parts._secondary,
      _label_type: label_parts._type,
      _search_text: this._object_tree_search_text(obj),
      _meta: meta,
      _object: obj,
      _depth: depth,
      _children: [],
    };
    out.push(node);

    if (Array.isArray(obj._children)) {
      obj._children.forEach((child: any, index: number) => {
        if (!is_obj(child)) return;
        const previous = index > 0 ? obj._children[index - 1] : null;
        const next = index < obj._children.length - 1 ? obj._children[index + 1] : null;
        this._build_object_tree_nodes(
          child,
          source_view_id,
          `${path}._children[${index}]`,
          path,
          is_obj(previous) && typeof previous._id === "string" ? previous._id.trim() : "",
          is_obj(next) && typeof next._id === "string" ? next._id.trim() : "",
          node_key,
          `${tree_path}._children[${index}]`,
          depth + 1,
          is_xvm_ref_child,
          allow_xvm_refs,
          node._children,
        );
      });
    }

    if (type !== "xvm-view" || !allow_xvm_refs) return;

    const ref_id = typeof obj._view_id === "string" && obj._view_id.trim() ? obj._view_id.trim() : "";
    if (!ref_id) return;

    const referenced_view = this._get_cached_view(ref_id);
    if (!is_obj(referenced_view) || !Array.isArray(referenced_view._children)) {
      node._children.push({
        _key: "",
        _node_key: this._object_tree_node_key(
          source_view_id,
          `${tree_path}::xvm-ref(${ref_id})::missing`,
          path,
          "placeholder",
          "",
        ),
        _parent_node_key: node_key,
        _label: "referenced view not loaded",
        _label_primary: "referenced view not loaded",
        _label_secondary: "",
        _label_type: "",
        _search_text: "",
        _meta: null,
        _object: null,
        _depth: depth + 1,
        _children: [],
        _placeholder: "referenced view not loaded",
      });
      return;
    }

    referenced_view._children.forEach((child: any, index: number) => {
      if (!is_obj(child)) return;
      const previous = index > 0 ? referenced_view._children[index - 1] : null;
      const next = index < referenced_view._children.length - 1 ? referenced_view._children[index + 1] : null;
      this._build_object_tree_nodes(
        child,
        ref_id,
        `$._children[${index}]`,
        "$",
        is_obj(previous) && typeof previous._id === "string" ? previous._id.trim() : "",
        is_obj(next) && typeof next._id === "string" ? next._id.trim() : "",
        node_key,
        `${tree_path}::xvm-ref(${ref_id})._children[${index}]`,
        depth + 1,
        true,
        false,
        node._children,
      );
    });
  }

  private _normalized_object_tree_search_query() {
    return this._object_tree_search_query.trim().toLowerCase();
  }

  private _filter_object_tree_nodes(nodes: XStudioObjectTreeNode[]) {
    const query = this._normalized_object_tree_search_query();
    if (!query) return nodes;

    const filter_node = (node: XStudioObjectTreeNode): XStudioObjectTreeNode | null => {
      const child_matches = node._children
        .map((child) => filter_node(child))
        .filter((child): child is XStudioObjectTreeNode => child !== null);
      const node_matches = Boolean(node._meta && node._search_text.includes(query));

      if (!node_matches && child_matches.length === 0) return null;

      return {
        ...node,
        _children: child_matches,
      };
    };

    return nodes
      .map((node) => filter_node(node))
      .filter((node): node is XStudioObjectTreeNode => node !== null);
  }

  private _render_cached_object_tree_nodes() {
    this._render_object_tree_nodes(this._filter_object_tree_nodes(this._object_tree_nodes));
  }

  private _app_explorer_artifact_key(type: XStudioAppExplorerArtifactType, id: string) {
    return `${type}:${id}`;
  }

  private _normalize_app_explorer_artifact(
    item: any,
    type: XStudioAppExplorerArtifactType,
  ): XStudioAppExplorerArtifact | null {
    const fallback = type === "module"
      ? this._get_studio_module_name(item)
      : this._format_studio_list_item(item);
    const id =
      typeof item === "string" && item.trim()
        ? item.trim()
        : is_obj(item) && typeof item._id === "string" && item._id.trim()
          ? item._id.trim()
          : is_obj(item) && typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : fallback.trim();

    if (!id) return null;

    const title =
      type === "module"
        ? this._format_studio_module_list_item(item)
        : this._format_studio_list_item(item);

    return {
      _id: id,
      _title: title || id,
      _type: type,
      _raw: item,
    };
  }

  private _normalize_app_explorer_artifacts(
    items: any[],
    type: XStudioAppExplorerArtifactType,
  ) {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => this._normalize_app_explorer_artifact(item, type))
      .filter((item): item is XStudioAppExplorerArtifact => item !== null)
      .sort((a, b) => a._id.localeCompare(b._id));
  }

  private _resolve_app_view_region() {
    const region =
      typeof this._xvm_client?._resolve_region === "function"
        ? this._xvm_client._resolve_region()
        : "";
    return typeof region === "string" && region.trim() ? region.trim() : "main";
  }

  private _active_xvm_app_view_id() {
    try {
      const active_view_id = (XVM as any).getActiveViewId?.({
        region: this._resolve_app_view_region(),
      });
      return typeof active_view_id === "string" && active_view_id.trim()
        ? active_view_id.trim()
        : "";
    } catch {
      return "";
    }
  }

  private _app_explorer_current_view_id() {
    return this._active_xvm_app_view_id() ||
      this._xvm_client?.get_app_view_id?.() ||
      this._xvm_client?.get_current_view_id?.() ||
      "";
  }

  private _select_app_explorer_artifact(artifact: XStudioAppExplorerArtifact) {
    this._app_explorer_selected_key = this._app_explorer_artifact_key(artifact._type, artifact._id);
    this._render_cached_app_explorer();
    this._log("app explorer artifact selected", {
      _type: artifact._type,
      _id: artifact._id,
    });

    if (artifact._type === "view") {
      this._log("app explorer view selected", {
        _view_id: artifact._id,
        _current_view_id: this._app_explorer_current_view_id(),
        _loaded: false,
      });
    }
  }

  private async _open_app_explorer_view(artifact: XStudioAppExplorerArtifact) {
    if (artifact._type !== "view") return false;

    const view_id = artifact._id.trim();
    if (!view_id) return false;

    const key = this._app_explorer_artifact_key(artifact._type, artifact._id);
    if (this._app_explorer_selected_key !== key) {
      this._select_app_explorer_artifact(artifact);
    }

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();
    const previous_view_id = this._app_explorer_current_view_id();

    this._write_studio_status(`Opening ${view_id}...`);
    this._log("app explorer open requested", {
      _app_id: app_id,
      _env: env,
      _view_id: view_id,
      _previous_view_id: previous_view_id,
    });

    try {
      this._clear_selected_object();
      await this._client().render_view(view_id);
      this._refresh_object_tree_for_current_view();
      this._render_cached_app_explorer();
      this._write_studio_status(`Opened ${view_id}`);
      this._log("app explorer view opened", {
        _app_id: app_id,
        _env: env,
        _view_id: view_id,
        _previous_view_id: previous_view_id,
        _current_view_id: this._app_explorer_current_view_id(),
      });
      return true;
    } catch (err) {
      const message = `Open view failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("app explorer open failed", {
        _app_id: app_id,
        _env: env,
        _view_id: view_id,
        _error: to_err(err),
      });
      return false;
    }
  }

  private _app_explorer_label_children(
    primary: string,
    secondary: string,
    type?: XStudioAppExplorerArtifactType,
  ) {
    const children: Record<string, any>[] = [
      {
        _type: "span",
        class: "xstudio-object-tree-label-primary",
        _text: primary,
      },
    ];

    if (secondary) {
      children.push({
        _type: "span",
        class: "xstudio-object-tree-label-secondary",
        _text: secondary,
      });
    }

    if (type) {
      children.push({
        _type: "span",
        class: "xstudio-object-tree-type-tag xstudio-app-explorer-type-tag",
        _text: `[${type}]`,
      });
    }

    return children;
  }

  private _app_explorer_toggle_row(
    row_id: string,
    section_id: XStudioAppExplorerSectionId,
    label: string,
    depth: number,
    secondary = "",
  ) {
    const expanded = this._app_explorer_section_is_open(section_id);
    const children: Record<string, any>[] = [
      {
        _type: "button",
        _id: `${row_id}-toggle`,
        type: "button",
        class: "xstudio-object-tree-chevron",
        title: expanded ? "Collapse" : "Expand",
        "aria-expanded": String(expanded),
        _text: expanded ? "▾" : "▸",
        _on: {
          click: (event?: Event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            this._toggle_app_explorer_section(section_id);
          },
        },
      },
      {
        _type: "button",
        _id: `${row_id}-label`,
        type: "button",
        class: "xstudio-object-tree-label xstudio-app-explorer-label",
        title: label,
        _children: this._app_explorer_label_children(label, secondary),
        _on: {
          click: (event?: Event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            this._toggle_app_explorer_section(section_id);
          },
        },
      },
    ];

    if (section_id === "views") {
      children.push({
        _type: "button",
        _id: STUDIO_APP_EXPLORER_ADD_VIEW_BUTTON_ID,
        type: "button",
        class: "xstudio-explorer-section-action xstudio-app-explorer-add-view-button",
        title: "Add View",
        _text: "+ Add View",
        _on: {
          click: {
            _module: "xem",
            _op: "fire",
            _params: {
              event: "studio:app-explorer:add-view-open",
            },
          },
        },
      });
    }

    return {
      _type: "view",
      _id: row_id,
      class: "xstudio-object-tree-row xstudio-app-explorer-row xstudio-app-explorer-section-row",
      _style: {
        "--xstudio-tree-indent": `${depth * 14}px`,
      },
      _children: children,
    };
  }

  private _app_explorer_artifact_row(
    row_id: string,
    artifact: XStudioAppExplorerArtifact,
    depth: number,
  ) {
    const key = this._app_explorer_artifact_key(artifact._type, artifact._id);
    const selected = key === this._app_explorer_selected_key;
    const current = artifact._type === "view" && artifact._id === this._app_explorer_current_view_id();
    const secondary = artifact._title && artifact._title !== artifact._id ? artifact._title : "";

    return {
      _type: "view",
      _id: row_id,
      class: [
        "xstudio-object-tree-row",
        "xstudio-app-explorer-row",
        selected ? "xstudio-app-explorer-row-selected" : "",
        current ? "xstudio-app-explorer-row-current" : "",
      ].filter(Boolean).join(" "),
      title: artifact._title || artifact._id,
      _style: {
        "--xstudio-tree-indent": `${depth * 14}px`,
      },
      _children: [
        {
          _type: "view",
          _id: `${row_id}-toggle`,
          class: "xstudio-object-tree-chevron xstudio-object-tree-chevron-spacer",
        },
        {
          _type: "button",
          _id: `${row_id}-label`,
          type: "button",
          class: "xstudio-object-tree-label xstudio-app-explorer-label",
          title: artifact._title || artifact._id,
          _children: this._app_explorer_label_children(artifact._id, secondary, artifact._type),
          _on: {
            click: (event?: Event) => {
              event?.preventDefault?.();
              event?.stopPropagation?.();
              this._select_app_explorer_artifact(artifact);
            },
            dblclick: (event?: Event) => {
              event?.preventDefault?.();
              event?.stopPropagation?.();
              void this._open_app_explorer_view(artifact);
            },
          },
        },
      ],
    };
  }

  private _render_app_explorer_category(
    category_id: XStudioAppExplorerCategoryId,
    seq: number,
  ) {
    const config = STUDIO_APP_EXPLORER_CATEGORIES[category_id];
    const artifacts = this._app_explorer_artifacts[category_id] ?? [];
    const row_id = `xstudio-app-explorer-${category_id}-${seq}`;
    const children: Record<string, any>[] = [
      this._app_explorer_toggle_row(row_id, category_id, config._label, 1),
    ];

    if (this._app_explorer_section_is_open(category_id)) {
      if (artifacts.length === 0) {
        children.push({
          _type: "view",
          _id: `${row_id}-empty`,
          class: "xstudio-object-tree-placeholder-row xstudio-app-explorer-empty-row",
          _style: {
            "--xstudio-tree-indent": "28px",
          },
          _children: [
            {
              _type: "view",
              class: "xstudio-object-tree-chevron xstudio-object-tree-chevron-spacer",
            },
            {
              _type: "label",
              class: "xstudio-object-tree-placeholder-label",
              _text: config._empty_text,
            },
          ],
        });
      } else {
        artifacts.forEach((artifact, index) => {
          children.push(this._app_explorer_artifact_row(
            `${row_id}-artifact-${index}`,
            artifact,
            2,
          ));
        });
      }
    }

    return {
      _type: "view",
      _id: `${row_id}-item`,
      class: "xstudio-object-tree-item xstudio-app-explorer-category",
      _children: children,
    };
  }

  private _render_cached_app_explorer() {
    const target = XUI.getObject(STUDIO_APP_EXPLORER_RESULTS_ID) as any;
    if (!target) return;

    this._app_explorer_render_seq += 1;
    const seq = this._app_explorer_render_seq;
    const app_id = this._xvm_client?.getActiveAppId?.() ?? "";
    const app_secondary = app_id && app_id !== "App" ? app_id : "";
    const root_children: Record<string, any>[] = [
      this._app_explorer_toggle_row(
        `xstudio-app-explorer-app-${seq}`,
        "app",
        "App",
        0,
        app_secondary,
      ),
    ];

    if (this._app_explorer_section_is_open("app")) {
      for (const category_id of STUDIO_APP_EXPLORER_CATEGORY_IDS) {
        root_children.push(this._render_app_explorer_category(category_id, seq));
      }
    }

    target.update?.({ _children: root_children });
  }

  async _refresh_app_explorer() {
    const app_id = this._xvm_client?.getActiveAppId?.() ?? "";
    const env = this._xvm_client?.getActiveEnv?.() ?? "";

    if (!app_id) {
      this._app_explorer_artifacts = {
        views: [],
        flows: [],
        entities: [],
        modules: [],
      };
      this._render_cached_app_explorer();
      return false;
    }

    const params = { _app_id: app_id, _env: env };
    const empty = {
      _views: [],
      _flows: [],
      _entities: [],
      _modules: [],
    };
    const [views_res, flows_res, entities_res, modules_res] = await Promise.all([
      (this._send_server_xvm_command("list-views", params) as Promise<ServerListViewsRes>)
        .catch((err) => {
          this._error("app explorer list views failed", { _error: to_err(err) });
          return empty;
        }),
      (this._send_server_xvm_command("list-flows", params) as Promise<ServerListFlowsRes>)
        .catch((err) => {
          this._error("app explorer list flows failed", { _error: to_err(err) });
          return empty;
        }),
      (this._send_server_xvm_command("list-entities", params) as Promise<ServerListEntitiesRes>)
        .catch((err) => {
          this._error("app explorer list entities failed", { _error: to_err(err) });
          return empty;
        }),
      (this._send_server_xvm_command("list-generated-modules", {}) as Promise<ServerListGeneratedModulesRes>)
        .catch((err) => {
          this._error("app explorer list modules failed", { _error: to_err(err) });
          return empty;
        }),
    ]);

    this._app_explorer_artifacts = {
      views: this._normalize_app_explorer_artifacts(
        Array.isArray(views_res?._views) ? views_res._views : [],
        "view",
      ),
      flows: this._normalize_app_explorer_artifacts(
        Array.isArray(flows_res?._flows) ? flows_res._flows : [],
        "flow",
      ),
      entities: this._normalize_app_explorer_artifacts(
        Array.isArray(entities_res?._entities) ? entities_res._entities : [],
        "entity",
      ),
      modules: this._normalize_app_explorer_artifacts(
        Array.isArray(modules_res?._modules) ? modules_res._modules : [],
        "module",
      ),
    };

    this._render_cached_app_explorer();
    this._log("app explorer loaded", {
      _app_id: app_id,
      _env: env,
      _views: this._app_explorer_artifacts.views.length,
      _flows: this._app_explorer_artifacts.flows.length,
      _entities: this._app_explorer_artifacts.entities.length,
      _modules: this._app_explorer_artifacts.modules.length,
    });
    return true;
  }

  private _object_tree_label_children(node: XStudioObjectTreeNode) {
    const children: Record<string, any>[] = [
      {
        _type: "span",
        class: "xstudio-object-tree-label-primary",
        _text: node._label_primary || node._label,
      },
    ];

    if (node._label_secondary) {
      children.push({
        _type: "span",
        class: "xstudio-object-tree-label-secondary",
        _text: node._label_secondary,
      });
    }

    if (node._label_type) {
      children.push({
        _type: "span",
        class: "xstudio-object-tree-type-tag",
        _text: `[${node._label_type}]`,
      });
    }

    return children;
  }

  private _object_tree_visibility_icon(hidden: boolean) {
    const line_attrs = {
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.8",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    };

    return {
      _type: "svg",
      class: "xstudio-object-tree-visibility-icon",
      viewBox: "0 0 24 24",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": "true",
      focusable: "false",
      _children: [
        {
          _type: "path",
          ...line_attrs,
          d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z",
        },
        {
          _type: "circle",
          ...line_attrs,
          cx: "12",
          cy: "12",
          r: "3",
        },
        ...(hidden
          ? [
            {
              _type: "path",
              ...line_attrs,
              d: "M4 4l16 16",
            },
          ]
          : []),
      ],
    };
  }

  private _object_tree_chevron_button(
    node: XStudioObjectTreeNode,
    row_id: string,
    expanded: boolean,
    search_active: boolean,
  ) {
    const has_children = node._children.length > 0;
    const can_toggle = has_children && !search_active;

    return {
      _type: "button",
      _id: `${row_id}-toggle`,
      type: "button",
      class: [
        "xstudio-object-tree-chevron",
        has_children ? "" : "xstudio-object-tree-chevron-spacer",
        can_toggle ? "" : "xstudio-object-tree-chevron-disabled",
      ].filter(Boolean).join(" "),
      title: has_children
        ? search_active
          ? "Search expands matching branches"
          : expanded
            ? "Collapse"
            : "Expand"
        : "",
      "aria-expanded": has_children ? String(expanded) : "false",
      "aria-hidden": has_children ? "false" : "true",
      _text: has_children ? (expanded ? "▾" : "▸") : "",
      ...(has_children
        ? {}
        : { disabled: true }),
      ...(can_toggle
        ? {
          _on: {
            click: (event?: Event) => {
              event?.preventDefault?.();
              event?.stopPropagation?.();
              this._toggle_object_tree_node(node);
            },
          },
        }
        : {}),
    };
  }

  private _object_tree_visibility_button(node: XStudioObjectTreeNode, row_id: string) {
    const visible = this._object_tree_node_is_visible(node);
    const action = visible ? "hide" : "show";
    const disabled = !this._object_tree_node_can_edit_visibility(node);
    const action_label = visible ? "Hide" : "Show";

    return {
      _type: "button",
      _id: `${row_id}-visibility`,
      type: "button",
      class: [
        "xstudio-object-tree-visibility-action",
        visible
          ? "xstudio-object-tree-visibility-visible"
          : "xstudio-object-tree-visibility-hidden",
        disabled ? "xstudio-object-tree-visibility-disabled" : "",
      ].filter(Boolean).join(" "),
      title: disabled ? "Visibility cannot be edited" : `${action_label} ${node._label}`,
      "aria-label": disabled ? "Visibility cannot be edited" : `${action_label} ${node._label}`,
      ...(disabled ? { disabled: true } : {}),
      _children: [
        this._object_tree_visibility_icon(!visible),
      ],
      ...(disabled
        ? {}
        : {
          _on: {
            click: (event?: Event) => {
              event?.preventDefault?.();
              event?.stopPropagation?.();
              void this._apply_object_tree_node_visibility(node, action);
            },
          },
        }),
    };
  }

  private _object_tree_node_sibling_context(node: XStudioObjectTreeNode) {
    return node._meta
      ? this._selected_object_sibling_context(node._meta)
      : null;
  }

  private _object_tree_node_can_move(node: XStudioObjectTreeNode, direction: "up" | "down") {
    const meta = node._meta;
    if (!meta) return false;
    if (!meta._json_id.trim()) return false;
    if (!meta._source_view_id.trim()) return false;

    const sibling_context = this._object_tree_node_sibling_context(node);
    if (!sibling_context || sibling_context._is_root) return false;

    return direction === "up"
      ? Boolean(sibling_context._previous_sibling_id)
      : Boolean(sibling_context._next_sibling_id);
  }

  private _object_tree_node_can_duplicate(node: XStudioObjectTreeNode) {
    const meta = node._meta;
    if (!meta) return false;
    if (!meta._json_id.trim()) return false;
    if (!meta._source_view_id.trim()) return false;
    return !this._selected_object_is_root_view(meta);
  }

  private _object_tree_child_capability(node: XStudioObjectTreeNode, log = false) {
    const meta = node._meta;
    const object_id = meta?._json_id?.trim() || meta?._id?.trim() || "";
    const type = meta?._type?.trim() ?? "";
    const normalized_type = type.toLowerCase();
    const skill = type ? this._resolve_selected_object_skill(type) : null;
    const design_allowed_raw = skill?._design?._children?._allowed;
    const design_allowed = design_allowed_raw === true;
    const design_disallowed = design_allowed_raw === false;
    const has_children_array = Array.isArray(node._object?._children);
    const leaf_type = STUDIO_OBJECT_TREE_CHILD_LEAF_TYPES.has(normalized_type);
    const fallback_allowed =
      !leaf_type &&
      STUDIO_OBJECT_TREE_CHILD_CONTAINER_FALLBACK_TYPES.has(normalized_type);
    const allowed =
      !leaf_type &&
      (
        has_children_array ||
        (!design_disallowed && (design_allowed || fallback_allowed))
      );

    if (log) {
      this._log("object tree child capability resolved", {
        _object_id: object_id,
        _object_type: type,
        _skill_found: Boolean(skill),
        _design_children_allowed: design_allowed,
        _design_children_disallowed: design_disallowed,
        _has_children_array: has_children_array,
        _fallback_allowed: fallback_allowed,
        _leaf_type: leaf_type,
        _allowed: allowed,
      });
    }

    return {
      _allowed: allowed,
      _object_id: object_id,
      _object_type: type,
      _skill: skill,
      _skill_found: Boolean(skill),
      _design_children_allowed: design_allowed,
      _design_children_disallowed: design_disallowed,
      _has_children_array: has_children_array,
      _fallback_allowed: fallback_allowed,
      _leaf_type: leaf_type,
    };
  }

  private _object_tree_node_can_add_child(node: XStudioObjectTreeNode) {
    return this._object_tree_child_capability(node)._allowed;
  }

  private _object_tree_quick_action_button(
    row_id: string,
    action: "move-up" | "move-down" | "duplicate" | "add-child",
    text: string,
    title: string,
    disabled: boolean,
    on_click: (event?: Event) => void,
  ) {
    return {
      _type: "button",
      _id: `${row_id}-${action}`,
      type: "button",
      class: [
        "xstudio-object-tree-quick-action",
        `xstudio-object-tree-${action}-action`,
        disabled ? "xstudio-object-tree-quick-action-disabled" : "",
      ].filter(Boolean).join(" "),
      title,
      "aria-label": title,
      ...(disabled ? { disabled: true } : {}),
      _text: text,
      ...(disabled
        ? {}
        : {
          _on: {
            click: on_click,
          },
        }),
    };
  }

  private _object_tree_action_buttons(node: XStudioObjectTreeNode, row_id: string) {
    const child_capability = this._object_tree_child_capability(node, true);
    const can_add_child = child_capability._allowed;
    const can_move_up = this._object_tree_node_can_move(node, "up");
    const can_move_down = this._object_tree_node_can_move(node, "down");
    const can_duplicate = this._object_tree_node_can_duplicate(node);
    const children: Record<string, any>[] = [];

    if (can_add_child) {
      children.push(
        this._object_tree_quick_action_button(
          row_id,
          "add-child",
          "+",
          `Add child to ${node._label}`,
          false,
          (event?: Event) => {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            void this._open_object_tree_add_child_palette(node);
          },
        ),
      );
    }

    children.push(
      this._object_tree_quick_action_button(
        row_id,
        "move-up",
        "↑",
        can_move_up ? `Move up ${node._label}` : "Object cannot move up",
        !can_move_up,
        (event?: Event) => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          void this._apply_object_tree_node_move(node, "up");
        },
      ),
      this._object_tree_quick_action_button(
        row_id,
        "move-down",
        "↓",
        can_move_down ? `Move down ${node._label}` : "Object cannot move down",
        !can_move_down,
        (event?: Event) => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          void this._apply_object_tree_node_move(node, "down");
        },
      ),
      this._object_tree_quick_action_button(
        row_id,
        "duplicate",
        "⧉",
        can_duplicate ? `Duplicate ${node._label}` : "Object cannot be duplicated",
        !can_duplicate,
        (event?: Event) => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          this._request_object_tree_node_duplicate(node);
        },
      ),
      this._object_tree_visibility_button(node, row_id),
    );

    return {
      _type: "view",
      _id: `${row_id}-actions`,
      class: [
        "xstudio-object-tree-actions",
        can_add_child ? "xstudio-object-tree-actions-has-add-child" : "",
      ].filter(Boolean).join(" "),
      _children: children,
    };
  }

  private async _open_object_tree_add_child_palette(node: XStudioObjectTreeNode) {
    const meta = node._meta;
    if (!meta || !this._object_tree_node_can_add_child(node)) return;

    this._log("object tree add child palette opened", {
      _target_id: meta._json_id || meta._id,
      _target_type: meta._type,
      _source_view_id: meta._source_view_id,
      _path: meta._path,
    });

    const selected_skill = await showObjectPalette();

    if (!selected_skill) {
      this._log("object tree add child palette cancelled", {
        _target_id: meta._json_id || meta._id,
        _target_type: meta._type,
        _source_view_id: meta._source_view_id,
      });
      return;
    }

    this._log("object tree add child palette selected", {
      _target_id: meta._json_id || meta._id,
      _target_type: meta._type,
      _source_view_id: meta._source_view_id,
      _skill_id: selected_skill._id,
      _skill_type: selected_skill._type,
      _skill_title: selected_skill._title,
      _default_object: selected_skill._design?._palette?._default_object ?? null,
    });

    await this._apply_object_tree_node_add_child(node, selected_skill);
  }

  private async _apply_object_tree_node_add_child(
    node: XStudioObjectTreeNode,
    selected_skill: XpellSkill,
  ) {
    const meta = node._meta;
    if (!meta || !this._object_tree_node_can_add_child(node)) return false;

    this._selected_object_pending_select_id = "";

    const target_id = meta._json_id.trim();
    const source_view_id = meta._source_view_id.trim();
    const target_type = meta._type.trim() || "object";
    const default_object = selected_skill._design?._palette?._default_object;

    if (!target_id || !source_view_id) {
      this._write_studio_status("Object cannot accept a child");
      this._error("object tree add child failed", {
        _reason: "missing_target_or_source_view",
        _source_view_id: source_view_id,
        _target_id: target_id,
        _target_type: target_type,
        _skill_id: selected_skill._id,
        _path: meta._path,
      });
      return false;
    }

    if (!is_obj(default_object)) {
      this._write_studio_status("Selected object has no default palette object");
      this._error("object tree add child failed", {
        _reason: "missing_default_object",
        _source_view_id: source_view_id,
        _target_id: target_id,
        _target_type: target_type,
        _skill_id: selected_skill._id,
      });
      return false;
    }

    const child = _xu.clone_json(default_object) as Record<string, any>;
    if (!is_obj(child)) {
      this._write_studio_status("Selected object default is invalid");
      this._error("object tree add child failed", {
        _reason: "invalid_default_object",
        _source_view_id: source_view_id,
        _target_id: target_id,
        _target_type: target_type,
        _skill_id: selected_skill._id,
      });
      return false;
    }

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();

    if (!app_id) {
      this._write_studio_status("No active app selected");
      this._error("object tree add child failed", {
        _reason: "missing_app",
        _source_view_id: source_view_id,
        _target_id: target_id,
        _target_type: target_type,
        _skill_id: selected_skill._id,
      });
      return false;
    }

    if (!env) {
      this._write_studio_status("No active environment selected");
      this._error("object tree add child failed", {
        _reason: "missing_env",
        _app_id: app_id,
        _source_view_id: source_view_id,
        _target_id: target_id,
        _target_type: target_type,
        _skill_id: selected_skill._id,
      });
      return false;
    }

    const params: XStudioSelectedObjectApplyViewEditParams = {
      _app_id: app_id,
      _env: env,
      _view_id: source_view_id,
      _edit_action: "add-child",
      _target_id: target_id,
      _target_type: target_type,
      _child: child,
    };

    this._write_studio_status("Adding child object...");
    this._log("object tree add child requested", {
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_type: params._target_type,
      _skill_id: selected_skill._id,
      _skill_type: selected_skill._type,
      _child_type: child._type,
      _child_id: typeof child._id === "string" ? child._id : "",
      _path: meta._path,
      _parent_path: meta._parent_path,
    });

    try {
      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._selected_object_pending_select_id = "";
        this._write_studio_status(this._format_apply_view_edit_failure(result));
        this._error("object tree add child failed", {
          _structured_error: result,
        });
        return false;
      }

      const new_target_id = this._extract_new_target_id(result);
      if (new_target_id) {
        this._selected_object_pending_select_id = new_target_id;
      }

      await this._request_object_tree_structured_edit_refresh(params, result);
      this._refresh_object_tree_for_current_view();
      this._write_studio_status(
        new_target_id
          ? "Added child object"
          : "Added child object; preserved selection",
      );
      this._log("object tree add child completed", {
        _new_target_id: new_target_id,
        _result: result,
      });
      return true;
    } catch (err) {
      this._selected_object_pending_select_id = "";
      const message = `Add child failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("object tree add child failed", {
        _error: to_err(err),
      });
      return false;
    }
  }

  private async _request_object_tree_structured_edit_refresh(
    params: XStudioSelectedObjectApplyViewEditParams,
    result: any,
  ) {
    try {
      const refresh_result = await this._request_intent_action_execute_refresh(params, result);
      this._log("object tree quick action refresh completed", {
        _edit_action: params._edit_action,
        _view_id: params._view_id,
        _target_id: params._target_id,
        _refresh: refresh_result ?? null,
      });
    } catch (err) {
      this._log("object tree quick action refresh completed", {
        _edit_action: params._edit_action,
        _view_id: params._view_id,
        _target_id: params._target_id,
        _refresh: {
          _ok: false,
          _error: to_err(err),
        },
      });
    }
  }

  private async _apply_object_tree_node_move(
    node: XStudioObjectTreeNode,
    direction: "up" | "down",
  ) {
    const meta = node._meta;
    if (!meta) return;

    const target_id = meta._json_id.trim();
    const source_view_id = meta._source_view_id.trim();
    const target_type = meta._type.trim() || "object";
    const sibling_context = this._object_tree_node_sibling_context(node);
    const anchor_id = direction === "up"
      ? sibling_context?._previous_sibling_id ?? ""
      : sibling_context?._next_sibling_id ?? "";

    if (!target_id || !source_view_id || !sibling_context || sibling_context._is_root || !anchor_id) {
      this._write_studio_status(
        direction === "up"
          ? "Object cannot move up"
          : "Object cannot move down",
      );
      this._log("object tree quick move action", {
        _direction: direction,
        _ignored: true,
        _source_view_id: source_view_id,
        _target_id: target_id,
        _path: meta._path,
      });
      return;
    }

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();

    if (!app_id) {
      this._write_studio_status("No active app selected");
      return;
    }

    if (!env) {
      this._write_studio_status("No active environment selected");
      return;
    }

    const params: XStudioSelectedObjectApplyViewEditParams = {
      _app_id: app_id,
      _env: env,
      _view_id: source_view_id,
      _edit_action: "move-object",
      _target_id: target_id,
      _target_type: target_type,
      ...(direction === "up"
        ? { _before_id: anchor_id }
        : { _after_id: anchor_id }),
    };

    this._write_studio_status(
      direction === "up"
        ? "Moving object up..."
        : "Moving object down...",
    );
    this._log("object tree quick move action", {
      _direction: direction,
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_type: params._target_type,
      _before_id: params._before_id,
      _after_id: params._after_id,
      _path: meta._path,
      _parent_path: meta._parent_path,
    });

    try {
      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._write_studio_status(this._format_apply_view_edit_failure(result));
        this._error("object tree quick move failed", {
          _direction: direction,
          _structured_error: result,
        });
        return;
      }

      await this._request_object_tree_structured_edit_refresh(params, result);
      this._refresh_object_tree_for_current_view();
      this._write_studio_status(
        direction === "up"
          ? "Moved object up"
          : "Moved object down",
      );
      this._log("object tree quick move result", {
        _direction: direction,
        _result: result,
      });
    } catch (err) {
      const message = `Move ${direction} failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("object tree quick move failed", {
        _direction: direction,
        _error: to_err(err),
      });
    }
  }

  private _object_tree_duplicate_display_label(
    meta: XStudioSelectedObject,
    label: string,
  ) {
    const clean_label = label.trim();
    if (clean_label) return clean_label;
    return this._format_selected_object_delete_name(meta);
  }

  private _request_object_tree_node_duplicate(node: XStudioObjectTreeNode) {
    const meta = node._meta;
    if (!meta) return;

    const target_id = meta._json_id.trim();
    const source_view_id = meta._source_view_id.trim();
    if (!target_id || !source_view_id || this._selected_object_is_root_view(meta)) {
      this._write_studio_status("Object cannot be duplicated");
      this._log("object tree quick duplicate action", {
        _ignored: true,
        _source_view_id: source_view_id,
        _target_id: target_id,
        _path: meta._path,
      });
      return;
    }

    const pending: XStudioObjectTreeDuplicateTarget = {
      _meta: { ...meta },
      _label: this._object_tree_duplicate_display_label(meta, node._label),
    };
    this._object_tree_pending_duplicate = pending;
    this._set_studio_label(
      STUDIO_OBJECT_TREE_DUPLICATE_LABEL_ID,
      `Label: ${pending._label || "-"}`,
    );
    this._set_studio_label(
      STUDIO_OBJECT_TREE_DUPLICATE_TYPE_ID,
      `Type: ${pending._meta._type.trim() || "object"}`,
    );
    this._set_studio_label(
      STUDIO_OBJECT_TREE_DUPLICATE_JSON_ID,
      `ID: ${target_id || pending._meta._id.trim() || "-"}`,
    );
    this._set_studio_control_disabled(STUDIO_OBJECT_TREE_DUPLICATE_CANCEL_ID, false);
    this._set_studio_control_disabled(STUDIO_OBJECT_TREE_DUPLICATE_CONFIRM_ID, false);

    const dialog = XUI.getObject(STUDIO_OBJECT_TREE_DUPLICATE_DIALOG_ID) as any;
    dialog?.show?.();
    this._log("object tree duplicate confirmation opened", {
      _source_view_id: source_view_id,
      _target_id: target_id,
      _target_type: pending._meta._type.trim() || "object",
      _label: pending._label,
      _path: pending._meta._path,
      _parent_path: pending._meta._parent_path,
    });
  }

  private _hide_object_tree_duplicate_dialog() {
    this._object_tree_pending_duplicate = null;
    this._set_studio_control_disabled(STUDIO_OBJECT_TREE_DUPLICATE_CANCEL_ID, false);
    this._set_studio_control_disabled(STUDIO_OBJECT_TREE_DUPLICATE_CONFIRM_ID, false);
    const dialog = XUI.getObject(STUDIO_OBJECT_TREE_DUPLICATE_DIALOG_ID) as any;
    dialog?.hide?.();
  }

  private _cancel_object_tree_node_duplicate() {
    const pending = this._object_tree_pending_duplicate;
    this._log("object tree duplicate cancelled", {
      _source_view_id: pending?._meta._source_view_id ?? "",
      _target_id: pending?._meta._json_id ?? "",
      _target_type: pending?._meta._type ?? "",
      _label: pending?._label ?? "",
    });
    this._hide_object_tree_duplicate_dialog();
  }

  private async _confirm_object_tree_node_duplicate() {
    const pending = this._object_tree_pending_duplicate;
    if (!pending) {
      this._hide_object_tree_duplicate_dialog();
      this._write_studio_status("No object duplicate target selected");
      return;
    }

    this._set_studio_control_disabled(STUDIO_OBJECT_TREE_DUPLICATE_CANCEL_ID, true);
    this._set_studio_control_disabled(STUDIO_OBJECT_TREE_DUPLICATE_CONFIRM_ID, true);
    this._log("object tree duplicate confirmed", {
      _source_view_id: pending._meta._source_view_id,
      _target_id: pending._meta._json_id,
      _target_type: pending._meta._type,
      _label: pending._label,
      _path: pending._meta._path,
      _parent_path: pending._meta._parent_path,
    });

    const ok = await this._apply_object_tree_node_duplicate_target(
      pending._meta,
      pending._label,
    );
    if (ok) {
      this._hide_object_tree_duplicate_dialog();
      return;
    }

    this._set_studio_control_disabled(STUDIO_OBJECT_TREE_DUPLICATE_CANCEL_ID, false);
    this._set_studio_control_disabled(STUDIO_OBJECT_TREE_DUPLICATE_CONFIRM_ID, false);
  }

  private async _apply_object_tree_node_duplicate_target(
    meta: XStudioSelectedObject,
    label: string,
  ) {
    const target_id = meta._json_id.trim();
    const source_view_id = meta._source_view_id.trim();
    const target_type = meta._type.trim() || "object";
    if (!target_id || !source_view_id || this._selected_object_is_root_view(meta)) {
      this._write_studio_status("Object cannot be duplicated");
      this._log("object tree quick duplicate action", {
        _ignored: true,
        _source_view_id: source_view_id,
        _target_id: target_id,
        _path: meta._path,
      });
      return false;
    }

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();

    if (!app_id) {
      this._write_studio_status("No active app selected");
      return false;
    }

    if (!env) {
      this._write_studio_status("No active environment selected");
      return false;
    }

    const params: XStudioSelectedObjectApplyViewEditParams = {
      _app_id: app_id,
      _env: env,
      _view_id: source_view_id,
      _edit_action: "duplicate-object",
      _target_id: target_id,
      _target_type: target_type,
    };

    this._write_studio_status("Duplicating object...");
    this._log("object tree quick duplicate action", {
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_type: params._target_type,
      _label: label,
      _path: meta._path,
      _parent_path: meta._parent_path,
    });

    try {
      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._write_studio_status(this._format_apply_view_edit_failure(result));
        this._error("object tree quick duplicate failed", {
          _structured_error: result,
        });
        return false;
      }

      const new_target_id = this._extract_new_target_id(result);
      if (new_target_id && this._selected_object_matches(this._selected_object, meta)) {
        this._selected_object_pending_select_id = new_target_id;
      }

      await this._request_object_tree_structured_edit_refresh(params, result);
      this._refresh_object_tree_for_current_view();
      this._write_studio_status("Duplicated object");
      this._log("object tree quick duplicate result", {
        _new_target_id: new_target_id,
        _result: result,
      });
      return true;
    } catch (err) {
      const message = `Duplicate failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("object tree quick duplicate failed", {
        _error: to_err(err),
      });
      return false;
    }
  }

  private async _apply_object_tree_node_visibility(
    node: XStudioObjectTreeNode,
    action: "hide" | "show",
  ) {
    const meta = node._meta;
    if (!meta) return;

    const target_id = meta._json_id.trim();
    const source_view_id = meta._source_view_id.trim();
    const target_type = meta._type.trim() || "object";
    if (!target_id || !source_view_id || meta._path.trim() === "$") {
      this._write_studio_status("Object visibility cannot be edited");
      this._log("object tree quick visibility action", {
        _action: action,
        _ignored: true,
        _reason: "visibility_not_editable",
        _source_view_id: source_view_id,
        _target_id: target_id,
      });
      return;
    }

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();

    if (!app_id) {
      this._write_studio_status("No active app selected");
      return;
    }

    if (!env) {
      this._write_studio_status("No active environment selected");
      return;
    }

    const params: XStudioSelectedObjectApplyViewEditParams = {
      _app_id: app_id,
      _env: env,
      _view_id: source_view_id,
      _target_id: target_id,
      _target_type: target_type,
      _edit_action: action === "hide" ? "hide-object" : "show-object",
    };

    this._write_studio_status(
      action === "hide"
        ? "Hiding object..."
        : "Showing object...",
    );
    this._log("object tree quick visibility action", {
      _action: action,
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_type: params._target_type,
      _edit_action: params._edit_action,
      _path: meta._path,
      _parent_path: meta._parent_path,
    });

    try {
      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._write_studio_status(this._format_apply_view_edit_failure(result));
        this._error("object tree quick visibility failed", {
          _action: action,
          _structured_error: result,
        });
        return;
      }

      this._write_studio_status(
        action === "hide"
          ? "Hidden object"
          : "Shown object",
      );
      this._log("object tree quick visibility result", {
        _action: action,
        _result: result,
      });
      this._refresh_object_tree_for_current_view();
    } catch (err) {
      const message = `${action === "hide" ? "Hide" : "Show"} failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("object tree quick visibility failed", {
        _action: action,
        _error: to_err(err),
      });
    }
  }

  private _object_tree_search_event_value(evt: any) {
    const value = is_obj(evt) ? evt._value ?? evt.value ?? "" : evt;
    if (value !== "$event.target.value") return value;

    const search = XUI.getObject(STUDIO_OBJECT_TREE_SEARCH_ID) as any;
    const current_value = search?.getValue?.() ?? search?.dom?.value ?? "";
    this._log("studio:object-tree-search unresolved $event.target.value; using XUI input value", {
      _value: current_value,
    });
    return current_value;
  }

  private _update_object_tree_search(value: any) {
    this._log("_update_object_tree_search value received", { _value: value });
    const next_query = String(value ?? "");
    if (next_query === this._object_tree_search_query) return;

    this._object_tree_search_query = next_query;
    this._render_cached_object_tree_nodes();
  }

  private _render_object_tree_nodes(nodes: XStudioObjectTreeNode[]) {
    const tree_results = XUI.getObject(STUDIO_OBJECT_TREE_RESULTS_ID) as any;
    const renderTarget = tree_results ?? XUI.getObject(STUDIO_OBJECT_TREE_ID) as any;
    if (!renderTarget) return;

    this._object_tree_render_seq += 1;
    const seq = this._object_tree_render_seq;
    let selected_row_id = "";
    let row_index = 0;
    const search_active = Boolean(this._normalized_object_tree_search_query());
    const search = this._normalized_object_tree_search_query();
    const results = (tree_results?.dom ?? renderTarget.dom ?? null) as HTMLElement | null;
    const filtered_count = this._flatten_object_tree_nodes(nodes).length;

    this._log("object tree render", {
      _filtered_nodes: filtered_count,
      _search: search,
      _render_target: renderTarget._id ?? renderTarget.dom?.id ?? "",
    });

    if (nodes.length === 0) {
      renderTarget.update?.({
        _children: [
          {
            _type: "label",
            _id: `xstudio-object-tree-empty-${seq}`,
            class: "xstudio-dock-placeholder",
            _text: search_active ? "No matching objects." : "No objects found.",
          },
        ],
      });
      this._log("object tree rendered", {
        _children_rendered: renderTarget.dom?.children?.length ?? 0,
        "results.clientHeight": results?.clientHeight ?? null,
        "results.scrollHeight": results?.scrollHeight ?? null,
        "results.offsetHeight": results?.offsetHeight ?? null,
      });
      this._selected_tree_row_id = "";
      return;
    }

    const render_node = (node: XStudioObjectTreeNode): Record<string, any> => {
      const row_id = `xstudio-object-tree-row-${seq}-${row_index}`;
      row_index += 1;
      node._key = row_id;
      const selected = this._selected_object_matches(this._selected_object, node._meta);
      if (selected) selected_row_id = row_id;
      const expanded = this._object_tree_node_is_expanded(node, search_active);

      if (!node._meta) {
        return {
          _type: "view",
          _id: row_id,
          class: "xstudio-object-tree-placeholder-row",
          _style: {
            "--xstudio-tree-indent": `${node._depth * 14}px`,
          },
          _children: [
            {
              _type: "view",
              _id: `${row_id}-toggle`,
              class: "xstudio-object-tree-chevron xstudio-object-tree-chevron-spacer",
            },
            {
              _type: "label",
              _id: `${row_id}-label`,
              class: "xstudio-object-tree-placeholder-label",
              _text: node._placeholder ?? node._label,
            },
          ],
        };
      }

      const row = {
        _type: "view",
        _id: row_id,
        class: [
          "xstudio-object-tree-row",
          node._meta._is_xvm_ref_child ? "xstudio-object-tree-row-ref" : "",
          this._object_tree_node_is_visible(node) ? "" : "xstudio-object-tree-row-hidden",
          selected ? STUDIO_SELECTED_OBJECT_ROW_CLASS : "",
        ].filter(Boolean).join(" "),
        title: node._label,
        _style: {
          "--xstudio-tree-indent": `${node._depth * 14}px`,
        },
        _children: [
          this._object_tree_chevron_button(node, row_id, expanded, search_active),
          {
            _type: "button",
            _id: `${row_id}-label`,
            type: "button",
            class: "xstudio-object-tree-label",
            title: node._label,
            _children: this._object_tree_label_children(node),
            _on: {
              click: (event?: Event) => {
                event?.preventDefault?.();
                event?.stopPropagation?.();
                this._select_object_tree_node(node, row_id);
              },
            },
          },
          this._object_tree_action_buttons(node, row_id),
        ],
      };

      const item_children: Record<string, any>[] = [row];
      if (expanded && node._children.length > 0) {
        item_children.push({
          _type: "view",
          _id: `${row_id}-children`,
          class: "xstudio-object-tree-children",
          _children: node._children.map((child) => render_node(child)),
        });
      }

      return {
        _type: "view",
        _id: `${row_id}-item`,
        class: "xstudio-object-tree-item",
        _children: item_children,
      };
    };

    const children = nodes.map((node) => render_node(node));

    this._selected_tree_row_id = selected_row_id;
    renderTarget.update?.({ _children: children });
    this._log("object tree rendered", {
      _children_rendered: renderTarget.dom?.children?.length ?? 0,
      "results.clientHeight": results?.clientHeight ?? null,
      "results.scrollHeight": results?.scrollHeight ?? null,
      "results.offsetHeight": results?.offsetHeight ?? null,
    });
  }

  private _clear_selected_canvas_highlight() {
    if (this._selected_canvas_element) {
      this._selected_canvas_element.classList.remove(STUDIO_SELECTED_CANVAS_CLASS);
      this._selected_canvas_element = null;
    }
  }

  private _apply_selected_canvas_highlight(meta: XStudioSelectedObject) {
    this._clear_selected_canvas_highlight();

    if (!meta._id) {
      return "No ID";
    }

    if (typeof document === "undefined") {
      return "DOM unavailable";
    }

    const el = document.getElementById(meta._id);
    if (!(el instanceof HTMLElement)) {
      return "DOM element not found";
    }

    const canvas = document.getElementById("xstudio-canvas");
    if (canvas instanceof HTMLElement && !canvas.contains(el)) {
      return "DOM element not found";
    }

    el.classList.add(STUDIO_SELECTED_CANVAS_CLASS);
    this._selected_canvas_element = el;
    return "Highlighted";
  }

  private _mark_selected_tree_row(row_id: string) {
    if (typeof document === "undefined") return;

    document
      .querySelectorAll(`.${STUDIO_SELECTED_OBJECT_ROW_CLASS}`)
      .forEach((el) => el.classList.remove(STUDIO_SELECTED_OBJECT_ROW_CLASS));

    const row = document.getElementById(row_id);
    row?.classList.add(STUDIO_SELECTED_OBJECT_ROW_CLASS);
    this._selected_tree_row_id = row_id;
  }

  private _has_own_field(obj: Record<string, any>, field: string) {
    return Object.prototype.hasOwnProperty.call(obj, field);
  }

  private _is_inspector_primitive_value(value: unknown) {
    return (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    );
  }

  private _primitive_field_as_string(obj: Record<string, any>, field: string) {
    if (!this._has_own_field(obj, field)) return "";
    const value = obj[field];
    if (value === undefined || value === null) return "";
    if (typeof value === "object" || typeof value === "function") return "";
    return String(value);
  }

  private _normalize_inspector_input(input: unknown): XStudioSelectedObjectInspectorInput | null {
    if (
      input === "text" ||
      input === "textarea" ||
      input === "number" ||
      input === "checkbox" ||
      input === "select" ||
      input === "json"
    ) {
      return input;
    }

    return null;
  }

  private _infer_inspector_input_for_key(
    key: string,
    value?: unknown,
  ): XStudioSelectedObjectInspectorInput {
    if (key === "_text") return "textarea";
    if (key === "class" || key === "_class") return "text";
    if (key === "style" || key === "_style") return "textarea";
    if (key === "disabled") return "checkbox";
    if (key === "placeholder") return "text";
    if (key === "value") return "text";
    if (key === "src") return "text";
    if (key === "href") return "text";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "checkbox";
    return "text";
  }

  private _inspector_label_for_key(key: string) {
    return key
      .replace(/^_+/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  private _inspector_control_id(key: string, index: number) {
    const safe_key = key
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "field";

    return `xstudio-selected-object-field-${index}-${safe_key}`;
  }

  private _normalize_design_inspector_fields(
    skill: XpellSkill | null,
    obj: Record<string, any>,
  ): XStudioSelectedObjectInspectorResolvedField[] {
    const fields = skill?._design?._inspector?._fields;
    if (!Array.isArray(fields) || fields.length === 0) return [];

    const out: XStudioSelectedObjectInspectorResolvedField[] = [];

    fields.forEach((field, index) => {
      if (!is_obj(field) || typeof field._key !== "string" || !field._key.trim()) {
        return;
      }

      const key = field._key.trim();
      const input =
        this._normalize_inspector_input(field._input) ??
        this._infer_inspector_input_for_key(key, obj[key]);

      out.push({
        ...field,
        _key: key,
        _label:
          typeof field._label === "string" && field._label.trim()
            ? field._label.trim()
            : this._inspector_label_for_key(key),
        _input: input,
        _control_id: this._inspector_control_id(key, index),
        _source: "design",
      });
    });

    return out;
  }

  private _fallback_inspector_field_allowed(key: string, value: unknown) {
    if (!this._is_inspector_primitive_value(value)) return false;

    if (
      key === "_id" ||
      key === "_type" ||
      key === "_children" ||
      key === "_html" ||
      key === "_html_tag" ||
      key === "_html_ns" ||
      key === "_parent" ||
      key === "_parent_element"
    ) {
      return false;
    }

    if (
      key.startsWith("_on") ||
      key.startsWith("_once") ||
      key.startsWith("_process") ||
      key.startsWith("_xvm_view_stack")
    ) {
      return false;
    }

    return true;
  }

  private _infer_selected_object_inspector_fields(
    obj: Record<string, any>,
  ): XStudioSelectedObjectInspectorResolvedField[] {
    const preferred = [
      "_text",
      "class",
      "_class",
      "style",
      "_style",
      "disabled",
      "placeholder",
      "value",
      "src",
      "href",
    ];
    const keys = [
      ...preferred.filter(key => this._has_own_field(obj, key)),
      ...Object.keys(obj).filter(key => !preferred.includes(key)),
    ];
    const seen = new Set<string>();
    const fields: XStudioSelectedObjectInspectorResolvedField[] = [];

    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);

      const value = obj[key];
      if (!this._fallback_inspector_field_allowed(key, value)) continue;

      fields.push({
        _key: key,
        _label: this._inspector_label_for_key(key),
        _input: this._infer_inspector_input_for_key(key, value),
        _control_id: this._inspector_control_id(key, fields.length),
        _source: "fallback",
      });
    }

    return fields;
  }

  private _resolve_selected_object_skill(type: string) {
    const normalized_type = type.trim();
    if (!normalized_type) return null;

    const object_skills =
      typeof (XUI as any).getObjectSkills === "function"
        ? (XUI as any).getObjectSkills() as XpellSkill[]
        : [];

    return object_skills.find(skill => skill?._id === normalized_type) ?? null;
  }

  private _selected_object_type_from_data(obj: Record<string, any> | null) {
    if (obj && typeof obj._type === "string" && obj._type.trim()) {
      return obj._type.trim();
    }

    return this._selected_object?._type?.trim() ?? "";
  }

  private _normalize_selected_object_inspector_section_id(
    value: unknown,
  ): XStudioSelectedObjectInspectorSectionId | null {
    const section_id = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
    return (STUDIO_SELECTED_OBJECT_INSPECTOR_SECTION_IDS as readonly string[]).includes(section_id)
      ? (section_id as XStudioSelectedObjectInspectorSectionId)
      : null;
  }

  private _resolve_selected_object_inspector_sections(
    obj: Record<string, any> | null,
  ): XStudioSelectedObjectInspectorSectionId[] {
    const type = this._selected_object_type_from_data(obj);
    const skill = type ? this._resolve_selected_object_skill(type) : null;
    const design = skill?._design as
      | {
        _inspector?: unknown;
        inspector?: unknown;
      }
      | undefined;
    const inspector_raw = is_obj(design?._inspector)
      ? design?._inspector
      : is_obj(design?.inspector)
        ? design?.inspector
        : undefined;
    const inspector = inspector_raw as
      | { _sections?: unknown; sections?: unknown }
      | undefined;
    const sections_raw =
      Array.isArray(inspector?._sections)
        ? inspector?._sections
        : Array.isArray(inspector?.sections)
          ? inspector?.sections
          : null;
    const has_sections_metadata = sections_raw !== null;
    const seen = new Set<XStudioSelectedObjectInspectorSectionId>();
    const sections: XStudioSelectedObjectInspectorSectionId[] = [];

    if (sections_raw) {
      for (const item of sections_raw) {
        const section_id = this._normalize_selected_object_inspector_section_id(item);
        if (!section_id || seen.has(section_id)) continue;
        seen.add(section_id);
        sections.push(section_id);
      }
    }

    const resolved = has_sections_metadata
      ? sections
      : [...STUDIO_SELECTED_OBJECT_FALLBACK_INSPECTOR_SECTIONS];

    this._log("inspector sections resolved", {
      _type: type,
      _skill_id: skill?._id ?? "",
      _source: has_sections_metadata ? "design" : "fallback",
      _sections: resolved.map(section => section === "raw_json" ? "raw-json" : section),
    });

    return resolved;
  }

  private _resolve_selected_object_inspector_fields(
    obj: Record<string, any> | null,
  ): XStudioSelectedObjectInspectorResolvedField[] {
    if (!obj) {
      this._log("inspector fields resolved", {
        _type: "",
        _source: "none",
        _count: 0,
        _fields: [],
      });
      return [];
    }

    const type = this._selected_object_type_from_data(obj);
    const skill = this._resolve_selected_object_skill(type);
    const design_fields = this._normalize_design_inspector_fields(skill, obj);
    const fields =
      design_fields.length > 0
        ? design_fields
        : this._infer_selected_object_inspector_fields(obj);

    this._log("inspector fields resolved", {
      _type: type,
      _skill_id: skill?._id ?? "",
      _source: design_fields.length > 0 ? "design" : "fallback",
      _count: fields.length,
      _fields: fields.map(field => field._key),
    });

    return fields;
  }

  private _stringify_inspector_field_value(
    obj: Record<string, any>,
    field: XStudioSelectedObjectInspectorResolvedField,
  ) {
    if (!this._has_own_field(obj, field._key)) {
      return field._input === "checkbox" ? "false" : "";
    }

    const value = obj[field._key];
    if (value === undefined || value === null) return "";

    if (field._input === "json") {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return "";
      }
    }

    if (field._input === "checkbox") {
      return value === true || String(value).toLowerCase() === "true"
        ? "true"
        : "false";
    }

    if (typeof value === "object" || typeof value === "function") return "";

    return String(value);
  }

  private _selected_object_inspector_draft_from_json(
    obj: Record<string, any> | null,
    fields: XStudioSelectedObjectInspectorResolvedField[],
  ) {
    if (!obj) return empty_selected_object_inspector_draft();

    const draft: XStudioSelectedObjectInspectorDraft = {};
    for (const field of fields) {
      draft[field._key] = this._stringify_inspector_field_value(obj, field);
    }
    return draft;
  }

  private _set_studio_control_value(object_id: string, value: string) {
    const control = XUI.getObject(object_id) as any;
    if (!control) return;

    const normalized = String(value ?? "");
    const dom = control.dom;

    if (dom instanceof HTMLInputElement && dom.type === "checkbox") {
      dom.checked = normalized === "true";
      dom.value = normalized;
      control.checked = dom.checked;
      control.value = normalized;
      return;
    }

    if (typeof control.renderOptions === "function") {
      control.renderOptions();
    }

    if (typeof control.setValue === "function") {
      control.setValue(normalized);
    } else if (control.dom && "value" in control.dom) {
      control.dom.value = normalized;
    }

    control.value = normalized;
  }

  private _read_studio_control_value(object_id: string) {
    const control = XUI.getObject(object_id) as any;
    if (!control) return "";

    const dom = control.dom;
    if (dom instanceof HTMLInputElement && dom.type === "checkbox") {
      return dom.checked ? "true" : "false";
    }

    if (typeof control.getValue === "function") {
      return String(control.getValue() ?? "");
    }

    if (control.dom && "value" in control.dom) {
      return String(control.dom.value ?? "");
    }

    return "";
  }

  private _write_selected_object_json_editor(value: string) {
    _xd.set(_XD_KEYS.STUDIO_SELECTED_OBJECT_RAW_JSON, value, { source: "xstudio-selected-object-json" });
    this._set_studio_control_value(STUDIO_SELECTED_OBJECT_JSON_ID, value);
  }

  private _write_selected_object_inspector_draft(
    draft: XStudioSelectedObjectInspectorDraft | null,
    source: string,
  ) {
    _xd.set(_XD_KEYS.STUDIO_SELECTED_OBJECT_INSPECTOR_DRAFT, draft, { source });

    if (!draft) return;

    for (const [key, value] of Object.entries(draft)) {
      _xd.set(`studio:selected_object_inspector:${key}`, value, { source });
    }
  }

  private _selected_object_inspector_field_control(
    field: XStudioSelectedObjectInspectorResolvedField,
    disabled: boolean,
  ): Record<string, any> {
    const readonly = field._readonly === true;
    const readonly_uses_disabled =
      field._input === "checkbox" ||
      field._input === "select";
    const control_disabled = disabled || (readonly && readonly_uses_disabled);
    const control_readonly = readonly && !control_disabled;
    const event_name =
      field._input === "select" || field._input === "checkbox"
        ? "change"
        : "input";
    const base = {
      _id: field._control_id,
      class: [
        "xstudio-selected-object-editor-input",
        `xstudio-selected-object-editor-input-${field._input}`,
        field._readonly === true ? "xstudio-selected-object-editor-input-readonly" : "",
      ].filter(Boolean).join(" "),
      placeholder: field._placeholder ?? "",
      title: field._description ?? field._label,
      ...(control_disabled ? { disabled: true } : {}),
      ...(control_readonly ? { readonly: true } : {}),
      _data_source: `studio:selected_object_inspector:${field._key}`,
      _data_output: `studio:selected_object_inspector:${field._key}`,
      _update_data_source_event: event_name,
      _on: {
        [event_name]: {
          _module: "xem",
          _op: "fire",
          _params: {
            event: "studio:selected-object:field-changed",
            data: {
              _key: field._key,
              _input: field._input,
            },
          },
        },
      },
    };

    if (field._input === "textarea" || field._input === "json") {
      return {
        ...base,
        _type: "textarea",
      };
    }

    if (field._input === "select") {
      return {
        ...base,
        _type: "select",
        _options: [
          ...(Array.isArray(field._options)
            ? field._options.map((option: string) => ({
              label: String(option),
              value: String(option),
            }))
            : []),
        ],
      };
    }

    if (field._input === "checkbox") {
      return {
        ...base,
        _type: "input",
        _input_type: "checkbox",
      };
    }

    return {
      ...base,
      _type: "text",
      ...(field._input === "number" ? { type: "number" } : {}),
    };
  }

  private _render_selected_object_inspector_fields(
    fields: XStudioSelectedObjectInspectorResolvedField[],
    draft: XStudioSelectedObjectInspectorDraft,
    has_selected_object: boolean,
  ) {
    const container = XUI.getObject(STUDIO_SELECTED_OBJECT_FIELDS_CONTAINER_ID) as any;
    if (!container) return;

    const children = fields.length > 0
      ? fields.map(field => ({
        _id: `${field._control_id}-row`,
        _type: "view",
        class: [
          "xstudio-selected-object-editor-row",
          `xstudio-selected-object-editor-row-${field._input}`,
          field._advanced ? "xstudio-selected-object-editor-row-advanced" : "",
          field._required ? "xstudio-selected-object-editor-row-required" : "",
        ].filter(Boolean).join(" "),
        _children: [
          {
            _type: "label",
            class: [
              "xstudio-selected-object-editor-label",
              field._required ? "xstudio-selected-object-editor-label-required" : "",
            ].filter(Boolean).join(" "),
            _text: field._required ? `${field._label} *` : field._label,
            title: field._description ?? field._key,
          },
          this._selected_object_inspector_field_control(
            field,
            !has_selected_object,
          ),
        ],
      }))
      : [
        {
          _id: "xstudio-selected-object-fields-empty",
          _type: "label",
          class: "xstudio-selected-object-editor-empty",
          _text: has_selected_object ? "No editable fields" : "Select an object",
        },
      ];

    container.update?.({ _children: children });

    for (const field of fields) {
      this._set_studio_control_value(field._control_id, draft[field._key] ?? "");
      this._set_selected_object_field_editable_state(field, has_selected_object);
    }
  }

  private _set_studio_control_disabled(object_id: string, disabled: boolean) {
    const control = XUI.getObject(object_id) as any;
    if (!control) return;

    control.disabled = disabled;

    if (control.dom instanceof HTMLElement) {
      if (disabled) {
        control.dom.setAttribute("disabled", "true");
      } else {
        control.dom.removeAttribute("disabled");
      }
    }
  }

  private _set_selected_object_field_editable_state(
    field: XStudioSelectedObjectInspectorResolvedField,
    has_selected_object: boolean,
  ) {
    const control = XUI.getObject(field._control_id) as any;
    if (!control) return;

    const readonly = field._readonly === true;
    const readonly_uses_disabled =
      field._input === "checkbox" ||
      field._input === "select";
    const disabled = !has_selected_object || (readonly && readonly_uses_disabled);
    const read_only = has_selected_object && readonly && !disabled;

    control.disabled = disabled;
    control.readonly = read_only;
    control.readOnly = read_only;

    const dom = control.dom;
    if (
      dom instanceof HTMLInputElement ||
      dom instanceof HTMLTextAreaElement ||
      dom instanceof HTMLSelectElement
    ) {
      dom.disabled = disabled;
      if (disabled) {
        dom.setAttribute("disabled", "true");
      } else {
        dom.removeAttribute("disabled");
      }
    }

    if (dom instanceof HTMLInputElement || dom instanceof HTMLTextAreaElement) {
      dom.readOnly = read_only;
      if (read_only) {
        dom.setAttribute("readonly", "true");
      } else {
        dom.removeAttribute("readonly");
      }
    }
  }

  private _selected_object_inspector_section_supported(
    section_id: XStudioSelectedObjectInspectorSectionId,
  ) {
    return this._selected_object_inspector_sections.includes(section_id);
  }

  private _set_selected_object_inspector_section_visible(
    section_id: XStudioSelectedObjectInspectorSectionId,
    visible: boolean,
  ) {
    const config = STUDIO_EXPLORER_SECTIONS[section_id];
    this._set_object_class_token(config._section_id, STUDIO_PORTLET_HIDDEN_CLASS, !visible);
    this._set_object_visible(config._section_id, visible);
  }

  private _apply_selected_object_inspector_sections() {
    for (const section_id of STUDIO_SELECTED_OBJECT_INSPECTOR_SECTION_IDS) {
      this._set_selected_object_inspector_section_visible(
        section_id,
        this._selected_object_inspector_section_supported(section_id),
      );
    }
  }

  private _reset_selected_object_json_editor() {
    if (!this._selected_object) {
      this._write_studio_status("Select an object first");
      this._log("selected object JSON reset ignored", { _message: "Select an object first" });
      return;
    }

    this._write_selected_object_json_editor(this._selected_object_json);
    this._write_studio_status("Reset selected object JSON");
  }

  private _selected_object_json_error(message: string) {
    this._write_studio_status(message);
    this._log("selected object JSON update ignored", { _message: message });
  }

  private _set_selected_object_inspector_controls(
    draft: XStudioSelectedObjectInspectorDraft,
    has_selected_object: boolean,
  ) {
    this._apply_selected_object_inspector_sections();

    if (this._selected_object_inspector_section_supported("properties")) {
      this._render_selected_object_inspector_fields(
        this._selected_object_inspector_fields,
        draft,
        has_selected_object,
      );
    } else {
      this._render_selected_object_inspector_fields([], draft, false);
    }

    const has_editable_fields =
      has_selected_object &&
      this._selected_object_inspector_section_supported("properties") &&
      this._selected_object_inspector_fields.some(field => field._readonly !== true);

    for (const control_id of STUDIO_SELECTED_OBJECT_EDITOR_ACTION_CONTROL_IDS) {
      this._set_studio_control_disabled(control_id, !has_editable_fields);
    }

    for (const control_id of STUDIO_SELECTED_OBJECT_RAW_CONTROL_IDS) {
      this._set_studio_control_disabled(control_id, !has_selected_object);
    }
  }

  private _parse_children_path_indices(path: string) {
    if (path === "$") return [] as number[];
    if (!path.startsWith("$._children[")) return null;

    const indices: number[] = [];
    let offset = 1;
    while (offset < path.length) {
      const match = path.slice(offset).match(/^\._children\[(\d+)\]/);
      if (!match) return null;
      indices.push(Number(match[1]));
      offset += match[0].length;
    }

    return indices;
  }

  private _get_cached_json_node_by_path(
    root: Record<string, any>,
    path: string,
  ): Record<string, any> | null {
    const indices = this._parse_children_path_indices(path.trim());
    if (!indices) return null;

    let current: Record<string, any> = root;
    for (const index of indices) {
      if (!Array.isArray(current._children)) return null;
      const child = current._children[index];
      if (!is_obj(child)) return null;
      current = child;
    }

    return current;
  }

  private _sibling_context_from_parent_children(
    children: any[],
    index: number,
  ): XStudioSelectedObjectSiblingContext | null {
    const current = children[index];
    if (!is_obj(current)) return null;

    const previous = index > 0 ? children[index - 1] : null;
    const next = index < children.length - 1 ? children[index + 1] : null;
    const previous_id =
      is_obj(previous) && typeof previous._id === "string"
        ? previous._id.trim()
        : "";
    const next_id =
      is_obj(next) && typeof next._id === "string"
        ? next._id.trim()
        : "";

    return {
      _is_root: false,
      _previous_sibling_id: previous_id,
      _next_sibling_id: next_id,
    };
  }

  private _find_selected_object_sibling_context_by_path(
    view: Record<string, any>,
    selected: XStudioSelectedObject,
  ): XStudioSelectedObjectSiblingContext | null {
    const path = selected._path.trim();
    const parent_path = selected._parent_path.trim();
    const indices = this._parse_children_path_indices(path);
    const parent_indices = this._parse_children_path_indices(parent_path || "$");
    if (!indices || !parent_indices) return null;
    if (indices.length === 0) {
      return {
        _is_root: true,
        _previous_sibling_id: "",
        _next_sibling_id: "",
      };
    }

    const parent = this._get_cached_json_node_by_path(view, parent_path || "$");
    if (!parent) return null;

    if (!Array.isArray(parent._children)) return null;
    const index = indices[indices.length - 1];
    const current = parent._children[index];
    if (!is_obj(current)) return null;

    const selected_id = selected._json_id.trim();
    const current_id = typeof current._id === "string" ? current._id.trim() : "";
    if (!selected_id || !current_id || selected_id !== current_id) return null;

    return this._sibling_context_from_parent_children(parent._children, index);
  }

  private _selected_object_sibling_context(
    selected: XStudioSelectedObject | null = this._selected_object,
  ) {
    if (!selected) return null;

    const source_view_id = selected._source_view_id.trim();
    if (!source_view_id) return null;

    const view = this._get_cached_view(source_view_id);
    if (!is_obj(view)) return null;

    return this._find_selected_object_sibling_context_by_path(view, selected);
  }

  private _set_selected_object_move_controls(
    selected: XStudioSelectedObject | null = this._selected_object,
  ) {
    const sibling_context = this._selected_object_sibling_context(selected);
    const has_movable_selection = Boolean(
      selected &&
      selected._json_id.trim() &&
      selected._source_view_id.trim() &&
      sibling_context &&
      !sibling_context._is_root,
    );

    this._set_studio_control_disabled(
      STUDIO_SELECTED_OBJECT_MOVE_UP_ID,
      !(has_movable_selection && Boolean(sibling_context?._previous_sibling_id)),
    );
    this._set_studio_control_disabled(
      STUDIO_SELECTED_OBJECT_MOVE_DOWN_ID,
      !(has_movable_selection && Boolean(sibling_context?._next_sibling_id)),
    );
  }

  private _selected_object_is_root_view(selected: XStudioSelectedObject | null) {
    if (!selected) return false;
    if (selected._path.trim() === "$") return true;
    return this._selected_object_sibling_context(selected)?._is_root === true;
  }

  private _set_selected_object_delete_controls(
    selected: XStudioSelectedObject | null = this._selected_object,
  ) {
    this._set_studio_control_disabled(
      STUDIO_SELECTED_OBJECT_DELETE_REQUEST_ID,
      !selected || this._selected_object_is_root_view(selected),
    );
  }

  private _set_selected_object_duplicate_controls(
    selected: XStudioSelectedObject | null = this._selected_object,
  ) {
    this._set_studio_control_disabled(
      STUDIO_SELECTED_OBJECT_DUPLICATE_ID,
      !selected ||
      !selected._json_id.trim() ||
      this._selected_object_is_root_view(selected),
    );
  }

  private _populate_selected_object_inspector_draft(obj: Record<string, any> | null) {
    this._selected_object_data = obj;
    this._selected_object_inspector_sections = this._resolve_selected_object_inspector_sections(obj);
    this._selected_object_inspector_fields = this._resolve_selected_object_inspector_fields(obj);
    this._selected_object_inspector_draft = this._selected_object_inspector_draft_from_json(
      obj,
      this._selected_object_inspector_fields,
    );
    this._write_selected_object_inspector_draft(
      this._selected_object_inspector_draft,
      "xstudio-object-tree",
    );
    this._set_selected_object_inspector_controls(this._selected_object_inspector_draft, obj !== null);
  }

  private _clear_selected_object_inspector_draft() {
    this._selected_object_data = null;
    this._selected_object_inspector_sections = this._resolve_selected_object_inspector_sections(null);
    this._selected_object_inspector_fields = [];
    this._selected_object_inspector_draft = empty_selected_object_inspector_draft();
    this._write_selected_object_inspector_draft(null, "xstudio-object-tree");
    this._set_selected_object_inspector_controls(this._selected_object_inspector_draft, false);
  }

  private _read_selected_object_inspector_draft_from_controls() {
    const draft: XStudioSelectedObjectInspectorDraft = {};

    for (const field of this._selected_object_inspector_fields) {
      draft[field._key] = this._read_studio_control_value(field._control_id);
    }

    return draft;
  }

  private _handle_selected_object_inspector_field_changed(payload: any) {
    const evt = this._normalize_event_payload(payload);
    const key =
      is_obj(evt) && typeof evt._key === "string"
        ? evt._key
        : "";
    const input =
      is_obj(evt) && typeof evt._input === "string"
        ? evt._input
        : "";

    this._log("inspector field changed", {
      _field: key,
      _input: input,
    });
  }

  private _selected_object_apply_error(message: string, field: XStudioSelectedObjectInspectorField | "fields") {
    this._write_studio_status(message);
    this._log("selected object inspector apply ignored", { _field: field, _message: message });
  }

  private _selected_object_move_error(message: string, direction: "up" | "down") {
    this._write_studio_status(message);
    this._log("selected object move ignored", { _direction: direction, _message: message });
  }

  private _selected_object_duplicate_error(message: string, selected: XStudioSelectedObject | null) {
    this._write_studio_status(message);
    this._log("selected object duplicate ignored", {
      _message: message,
      ...this._selected_object_persisted_metadata(selected),
    });
  }

  private _selected_object_delete_error(message: string, selected: XStudioSelectedObject | null) {
    this._write_studio_status(message);
    this._log("selected object delete ignored", {
      _message: message,
      ...this._selected_object_persisted_metadata(selected),
    });
  }

  private _selected_object_persisted_metadata(selected: XStudioSelectedObject | null) {
    return {
      _selected_id: selected?._id ?? "",
      _json_id: selected?._json_id ?? "",
      _source_view_id: selected?._source_view_id ?? "",
      _path: selected?._path ?? "",
      _parent_path: selected?._parent_path ?? "",
    };
  }

  private _log_selected_object_persisted_metadata(selected: XStudioSelectedObject | null) {
    this._log(
      "selected object persisted metadata",
      this._selected_object_persisted_metadata(selected),
    );
  }

  private _selected_object_json_id(selected: XStudioSelectedObject | null) {
    return selected?._json_id?.trim() ?? "";
  }

  private _selected_object_matches_target_id(target_id: string) {
    const selected = this._selected_object;
    if (!selected) return false;

    const normalized_target_id = target_id.trim();
    if (!normalized_target_id) return false;

    return selected._json_id.trim() === normalized_target_id ||
      selected._id.trim() === normalized_target_id;
  }

  private _selected_canvas_target_is_visible(target_id: string) {
    if (typeof document === "undefined" || typeof window === "undefined") return false;

    const selected = this._selected_object;
    const dom_id = selected?._id.trim() || target_id.trim();
    if (!dom_id) return false;

    const el = document.getElementById(dom_id);
    if (!(el instanceof HTMLElement)) return false;

    const canvas = document.getElementById(STUDIO_CANVAS_ID);
    if (canvas instanceof HTMLElement && !canvas.contains(el)) return false;

    const style = window.getComputedStyle(el);
    return style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0";
  }

  private _clear_conversation_action_selection_if_hidden_or_removed(params: Record<string, any>) {
    const edit_action = typeof params._edit_action === "string" ? params._edit_action.trim() : "";
    if (edit_action !== "hide-object" && edit_action !== "remove-object") return;

    const target_id = typeof params._target_id === "string" ? params._target_id.trim() : "";
    if (!this._selected_object_matches_target_id(target_id)) return;

    if (edit_action === "remove-object" || !this._selected_canvas_target_is_visible(target_id)) {
      this._clear_selected_object();
    }
  }

  private _selected_object_persisted_id_error(context: string, selected: XStudioSelectedObject | null) {
    this._write_studio_status("selected object has no persisted JSON id");
    this._log(`${context} ignored`, {
      _message: "selected object has no persisted JSON id",
      ...this._selected_object_persisted_metadata(selected),
    });
  }

  private _format_apply_view_edit_failure(result: any) {
    const error_value = result?._error;
    const error = is_obj(error_value) ? error_value : {};
    const details = is_obj(error._details) ? error._details : {};
    const error_message =
      typeof error_value === "string" && error_value.trim()
        ? error_value.trim()
        : "";
    const message =
      typeof error._message === "string" && error._message.trim()
        ? error._message.trim()
        : error_message ||
        (typeof result?._message === "string" && result._message.trim()
          ? result._message.trim()
          : "");
    const reason =
      typeof result?._reason === "string" && result._reason.trim()
        ? result._reason.trim()
        : typeof error._reason === "string" && error._reason.trim()
          ? error._reason.trim()
          : typeof details._reason === "string" && details._reason.trim()
            ? details._reason.trim()
            : "";
    const code =
      typeof error._code === "string" && error._code.trim()
        ? error._code.trim()
        : "";
    const primary = message || reason || code || "Structured view edit failed";

    if (reason && primary !== reason && !primary.includes(reason)) {
      return `Apply failed: ${primary} (${reason})`;
    }

    return `Apply failed: ${primary}`;
  }

  private _extract_new_target_id(result: any): string {
    const candidates = [
      result?._new_target_id,
      result?._created_id,
      result?._created_object_id,
      result?._created_target_id,
      result?._result?._new_target_id,
      result?._result?._created_id,
      result?._result?._created_object_id,
      result?._result?._created_target_id,
      result?._mutation?._new_target_id,
      result?._mutation?._created_id,
      result?._mutation?._created_object_id,
      result?._mutation?._created_target_id,
      result?._result?._mutation?._new_target_id,
      result?._result?._mutation?._created_id,
      result?._result?._mutation?._created_object_id,
      result?._result?._mutation?._created_target_id,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    return "";
  }

  private _extract_apply_view_edit_version(result: any): number {
    const candidates = [
      result?._version,
      result?._result?._version,
      result?._payload?._version,
      result?._mutation?._version,
      result?._result?._mutation?._version,
      result?._app?._meta?._version,
      result?._result?._app?._meta?._version,
    ];

    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value) && value > 0) return value;
    }

    return 0;
  }

  private _intent_action_execute_refresh_payload(
    params: Record<string, any>,
    result: any,
  ) {
    return {
      _edit_action: typeof params._edit_action === "string" ? params._edit_action : "",
      _view_id: typeof params._view_id === "string" ? params._view_id : "",
      _target_id: typeof params._target_id === "string" ? params._target_id : "",
      _ok: is_obj(result) && result._ok === true,
      _version: this._extract_apply_view_edit_version(result),
    };
  }

  private async _request_intent_action_execute_refresh(
    params: Record<string, any>,
    result: any,
  ) {
    const payload = this._intent_action_execute_refresh_payload(params, result);
    if (!STUDIO_INTENT_APPLY_VIEW_EDIT_REFRESH_ACTIONS.has(payload._edit_action)) {
      return {
        _ok: false,
        _reason: "unsupported edit action",
      };
    }

    if (typeof this._xvm_client?.request_structured_view_edit_refresh !== "function") {
      return {
        _ok: false,
        _reason: "refresh helper unavailable",
      };
    }

    return this._xvm_client.request_structured_view_edit_refresh({
      _view_id: payload._view_id,
      _action: payload._edit_action,
      _target_id: payload._target_id,
      _version: payload._version,
      _result: result,
    });
  }

  private _build_selected_object_inspector_edit_params(
    field: XStudioSelectedObjectInspectorField,
    selected: XStudioSelectedObject,
    draft: XStudioSelectedObjectInspectorDraft,
    app_id: string,
    env: string,
  ) {
    const view_id = selected._source_view_id.trim();
    const id = selected._json_id.trim();
    const type = selected._type.trim() || "object";
    const base: XStudioSelectedObjectApplyViewEditParams = {
      _app_id: app_id,
      _env: env,
      _view_id: view_id,
      _edit_action: "set-property",
      _target_id: id,
      _target_type: type,
    };

    const field_meta = this._selected_object_inspector_fields
      .find(item => item._key === field);

    if (!field_meta) {
      return {
        _ok: false,
        _error: `Unknown inspector field: ${field}`,
        _params: null,
      };
    }

    if (field_meta._readonly === true) {
      return {
        _ok: false,
        _error: `${field_meta._label} is readonly`,
        _params: null,
      };
    }

    const raw_value = draft[field] ?? "";

    if (field_meta._required && !String(raw_value).trim()) {
      return {
        _ok: false,
        _error: `${field_meta._label} is required`,
        _params: null,
      };
    }

    const parsed = this._parse_selected_object_inspector_field_value(
      field_meta,
      raw_value,
    );

    if (!parsed._ok) {
      return {
        _ok: false,
        _error: parsed._error,
        _params: null,
      };
    }

    return {
      _ok: true,
      _error: "",
      _params: {
        ...base,
        _property_name: field_meta._key,
        _property_value: parsed._value,
      },
    };
  }

  private _parse_selected_object_inspector_field_value(
    field: XStudioSelectedObjectInspectorResolvedField,
    raw_value: string,
  ): {
    _ok: boolean;
    _error: string;
    _value: any;
  } {
    if (field._input === "json") {
      const value = raw_value.trim();
      if (!value) {
        return {
          _ok: true,
          _error: "",
          _value: null,
        };
      }

      try {
        return {
          _ok: true,
          _error: "",
          _value: JSON.parse(value),
        };
      } catch (err) {
        return {
          _ok: false,
          _error: `Invalid ${field._label} JSON: ${to_err(err)}`,
          _value: null,
        };
      }
    }

    if (field._input === "number") {
      const value = raw_value.trim();
      if (!value) {
        return {
          _ok: true,
          _error: "",
          _value: null,
        };
      }

      const number_value = Number(value);
      if (!Number.isFinite(number_value)) {
        return {
          _ok: false,
          _error: `${field._label} must be a number`,
          _value: null,
        };
      }

      return {
        _ok: true,
        _error: "",
        _value: number_value,
      };
    }

    if (field._input === "checkbox") {
      return {
        _ok: true,
        _error: "",
        _value: raw_value.trim().toLowerCase() === "true",
      };
    }

    return {
      _ok: true,
      _error: "",
      _value: raw_value,
    };
  }

  private _changed_selected_object_inspector_fields(
    previous: XStudioSelectedObjectInspectorDraft,
    next: XStudioSelectedObjectInspectorDraft,
  ) {
    const fields: XStudioSelectedObjectInspectorField[] = [];

    for (const field of this._selected_object_inspector_fields) {
      if (field._readonly === true) continue;
      if ((previous[field._key] ?? "") !== (next[field._key] ?? "")) {
        fields.push(field._key);
      }
    }

    return fields;
  }

  private async _apply_selected_object_inspector_edit(
    field: XStudioSelectedObjectInspectorField,
    selected: XStudioSelectedObject,
    params: XStudioSelectedObjectApplyViewEditParams,
  ) {
    this._log("selected object inspector apply request", {
      _field: field,
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _edit_action: params._edit_action,
      _path: selected._path,
      _parent_path: selected._parent_path,
    });

    try {
      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._write_studio_status(this._format_apply_view_edit_failure(result));
        this._error("selected object inspector apply failed", {
          _field: field,
          _structured_error: result,
        });
        return false;
      }

      this._log("selected object inspector apply result", {
        _field: field,
        _result: result,
      });
      return true;
    } catch (err) {
      const message = `Apply failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("selected object inspector apply failed", {
        _field: field,
        _error: to_err(err),
      });
      return false;
    }
  }

  private async _save_selected_object_inspector_fields() {
    this._log("inspector save requested", {
      _field_count: this._selected_object_inspector_fields.length,
      ...this._selected_object_persisted_metadata(this._selected_object),
    });

    if (!this._selected_object) {
      this._set_selected_object_inspector_controls(this._selected_object_inspector_draft, false);
      this._selected_object_apply_error("Select an object first", "fields");
      return;
    }

    if (this._selected_object_inspector_fields.length === 0) {
      this._selected_object_apply_error("Selected object has no editable inspector fields", "fields");
      return;
    }

    const target_id = this._selected_object_json_id(this._selected_object);
    if (!target_id) {
      this._selected_object_persisted_id_error("selected object inspector apply", this._selected_object);
      return;
    }

    if (!this._selected_object._source_view_id.trim()) {
      this._selected_object_apply_error("Selected object has no source view", "fields");
      return;
    }

    const next_draft = this._read_selected_object_inspector_draft_from_controls();
    const changed_fields = this._changed_selected_object_inspector_fields(
      this._selected_object_inspector_draft,
      next_draft,
    );

    if (changed_fields.length === 0) {
      this._write_studio_status("No selected object field changes to save");
      return;
    }

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();

    if (!app_id) {
      this._selected_object_apply_error("No active app selected", "fields");
      return;
    }

    if (!env) {
      this._selected_object_apply_error("No active environment selected", "fields");
      return;
    }

    const edits: {
      _field: XStudioSelectedObjectInspectorField;
      _params: XStudioSelectedObjectApplyViewEditParams;
    }[] = [];

    for (const field of changed_fields) {
      const edit_result = this._build_selected_object_inspector_edit_params(
        field,
        this._selected_object,
        next_draft,
        app_id,
        env,
      );

      if (!edit_result._ok || !edit_result._params) {
        this._selected_object_apply_error(edit_result._error, field);
        return;
      }

      edits.push({
        _field: field,
        _params: edit_result._params,
      });
    }

    this._write_studio_status(
      edits.length === 1
        ? "Saving selected object field..."
        : `Saving ${edits.length} selected object fields...`,
    );

    for (const edit of edits) {
      const ok = await this._apply_selected_object_inspector_edit(
        edit._field,
        this._selected_object,
        edit._params,
      );
      if (!ok) {
        return;
      }
    }

    if (this._selected_object_data) {
      for (const edit of edits) {
        if (typeof edit._params._property_name === "string") {
          this._selected_object_data[edit._params._property_name] =
            edit._params._property_value;
        }
      }
      this._selected_object_json = this._safe_selected_json_preview(this._selected_object_data);
    }

    this._selected_object_inspector_draft = next_draft;
    this._write_selected_object_inspector_draft(
      this._selected_object_inspector_draft,
      "xstudio-selected-object-inspector",
    );
    this._set_selected_object_inspector_controls(this._selected_object_inspector_draft, true);
    this._write_studio_status(
      edits.length === 1
        ? "Saved selected object field"
        : `Saved ${edits.length} selected object fields`,
    );
  }

  private _cancel_selected_object_inspector_fields() {
    if (!this._selected_object) {
      this._set_selected_object_inspector_controls(this._selected_object_inspector_draft, false);
      this._selected_object_apply_error("Select an object first", "fields");
      return;
    }

    this._selected_object_inspector_draft = this._selected_object_inspector_draft_from_json(
      this._selected_object_data,
      this._selected_object_inspector_fields,
    );
    this._set_selected_object_inspector_controls(this._selected_object_inspector_draft, true);
    this._write_selected_object_inspector_draft(
      this._selected_object_inspector_draft,
      "xstudio-selected-object-inspector-cancel",
    );
    this._write_studio_status("Canceled selected object field edits");
  }

  private async _update_selected_object_json_from_editor() {
    const selected = this._selected_object;

    if (!selected) {
      this._selected_object_json_error("Select an object first");
      return;
    }

    const target_id = this._selected_object_json_id(selected);
    if (!target_id) {
      this._selected_object_persisted_id_error("selected object JSON update", selected);
      return;
    }

    if (!selected._source_view_id.trim()) {
      this._selected_object_json_error("Selected object has no source view");
      return;
    }

    if (selected._path === "$") {
      this._selected_object_json_error("Root view JSON editing is not supported in V1");
      return;
    }

    const raw_json = this._read_studio_control_value(STUDIO_SELECTED_OBJECT_JSON_ID);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw_json);
    } catch (err) {
      this._selected_object_json_error(`Invalid JSON: ${to_err(err)}`);
      return;
    }

    if (!is_obj(parsed)) {
      this._selected_object_json_error("Selected object JSON must be an object");
      return;
    }

    const parsed_id = typeof parsed._id === "string" ? parsed._id.trim() : "";
    if (parsed_id !== target_id) {
      this._selected_object_json_error("Selected object JSON must keep the same _id");
      return;
    }

    const parsed_type = typeof parsed._type === "string" ? parsed._type.trim() : "";
    if (parsed_type !== selected._type) {
      this._selected_object_json_error("Selected object JSON must keep the same _type");
      return;
    }

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();

    if (!app_id) {
      this._selected_object_json_error("No active app selected");
      return;
    }

    if (!env) {
      this._selected_object_json_error("No active environment selected");
      return;
    }

    const params: XStudioSelectedObjectApplyViewEditParams = {
      _app_id: app_id,
      _env: env,
      _view_id: selected._source_view_id.trim(),
      _edit_action: "replace-object",
      _target_id: target_id,
      _target_type: selected._type.trim(),
      _object_value: parsed,
    };

    this._write_studio_status("Updating selected object JSON...");
    this._log("selected object JSON update request", {
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_type: params._target_type,
      _path: selected._path,
      _parent_path: selected._parent_path,
    });

    try {
      const result =
        await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._write_studio_status(this._format_apply_view_edit_failure(result));
        this._error("selected object JSON update failed", {
          _structured_error: result,
        });
        return;
      }

      this._write_studio_status("Updated selected object JSON");
      this._log("selected object JSON update result", {
        _result: result,
      });
    } catch (err) {
      const message = `Update JSON failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("selected object JSON update failed", {
        _error: to_err(err),
      });
    }
  }

  private async _move_selected_object(direction: "up" | "down") {
    const selected = this._selected_object;

    if (!selected) {
      this._set_selected_object_move_controls(null);
      this._selected_object_move_error("Select an object first", direction);
      return;
    }

    const target_id = this._selected_object_json_id(selected);
    if (!target_id) {
      this._set_selected_object_move_controls(selected);
      this._selected_object_persisted_id_error("selected object move", selected);
      return;
    }

    const source_view_id = selected._source_view_id.trim();
    if (!source_view_id) {
      this._selected_object_move_error("Selected object has no source view", direction);
      return;
    }

    const sibling_context = this._selected_object_sibling_context(selected);
    if (!sibling_context || sibling_context._is_root) {
      this._set_selected_object_move_controls(selected);
      this._selected_object_move_error("Root object cannot be moved", direction);
      return;
    }

    this._log("move-object resolved siblings", {
      _target_id: target_id,
      _source_view_id: source_view_id,
      _previous_sibling_id: sibling_context._previous_sibling_id,
      _next_sibling_id: sibling_context._next_sibling_id,
    });

    const anchor_id =
      direction === "up"
        ? sibling_context._previous_sibling_id
        : sibling_context._next_sibling_id;
    if (!anchor_id) {
      this._set_selected_object_move_controls(selected);
      this._selected_object_move_error(
        direction === "up"
          ? "Selected object is already the first child"
          : "Selected object is already the last child",
        direction,
      );
      return;
    }

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();

    if (!app_id) {
      this._selected_object_move_error("No active app selected", direction);
      return;
    }

    if (!env) {
      this._selected_object_move_error("No active environment selected", direction);
      return;
    }

    const params: XStudioSelectedObjectApplyViewEditParams = {
      _app_id: app_id,
      _env: env,
      _view_id: source_view_id,
      _edit_action: "move-object",
      _target_id: target_id,
      _target_type: selected._type.trim() || "object",
      ...(direction === "up"
        ? { _before_id: anchor_id }
        : { _after_id: anchor_id }),
    };

    this._write_studio_status(
      direction === "up"
        ? "Moving selected object up..."
        : "Moving selected object down...",
    );
    this._log("selected object move request", {
      _direction: direction,
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_type: params._target_type,
      _before_id: params._before_id,
      _after_id: params._after_id,
      _path: selected._path,
      _parent_path: selected._parent_path,
    });

    try {
      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._write_studio_status(this._format_apply_view_edit_failure(result));
        this._error("selected object move failed", {
          _direction: direction,
          _structured_error: result,
        });
        return;
      }

      this._write_studio_status(
        direction === "up"
          ? "Moved selected object up"
          : "Moved selected object down",
      );
      this._log("selected object move result", {
        _direction: direction,
        _result: result,
      });
    } catch (err) {
      const message = `Move ${direction} failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("selected object move failed", {
        _direction: direction,
        _error: to_err(err),
      });
    }
  }

  private async _duplicate_selected_object() {
    const selected = this._selected_object;

    if (!selected) {
      this._set_selected_object_duplicate_controls(null);
      this._selected_object_duplicate_error("Select an object first", null);
      return;
    }

    const target_id = this._selected_object_json_id(selected);
    if (!target_id) {
      this._set_selected_object_duplicate_controls(selected);
      this._selected_object_persisted_id_error("selected object duplicate", selected);
      return;
    }

    const source_view_id = selected._source_view_id.trim();
    if (!source_view_id) {
      this._selected_object_duplicate_error("Selected object has no source view", selected);
      return;
    }

    if (this._selected_object_is_root_view(selected)) {
      this._set_selected_object_duplicate_controls(selected);
      this._selected_object_duplicate_error("Root object cannot be duplicated", selected);
      return;
    }

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();

    if (!app_id) {
      this._selected_object_duplicate_error("No active app selected", selected);
      return;
    }

    if (!env) {
      this._selected_object_duplicate_error("No active environment selected", selected);
      return;
    }

    const params: XStudioSelectedObjectApplyViewEditParams = {
      _app_id: app_id,
      _env: env,
      _view_id: source_view_id,
      _target_id: target_id,
      _target_type: selected._type.trim() || "object",
      _edit_action: "duplicate-object",
    };

    this._write_studio_status("Duplicating selected object...");
    this._log("selected object duplicate request", {
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_type: params._target_type,
      _edit_action: params._edit_action,
      _path: selected._path,
      _parent_path: selected._parent_path,
    });

    try {
      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._write_studio_status(this._format_apply_view_edit_failure(result));
        this._error("selected object duplicate failed", {
          _structured_error: result,
        });
        return;
      }

      const new_target_id = this._extract_new_target_id(result);
      if (new_target_id) {
        this._selected_object_pending_select_id = new_target_id;
      }

      this._write_studio_status(
        new_target_id
          ? "Duplicated selected object"
          : "Duplicated selected object; preserved selection",
      );
      this._log("selected object duplicate result", {
        _new_target_id: new_target_id,
        _result: result,
      });
      this._refresh_object_tree_for_current_view();
    } catch (err) {
      const message = `Duplicate failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("selected object duplicate failed", {
        _error: to_err(err),
      });
    }
  }

  private _format_selected_object_delete_name(selected: XStudioSelectedObject) {
    const text = selected._text.trim();
    if (text) return text;

    const json_id = selected._json_id.trim();
    if (json_id) return json_id;

    const id = selected._id.trim();
    return id || "-";
  }

  private _hide_delete_selected_object_dialog() {
    this._selected_object_pending_delete = null;
    this._set_studio_control_disabled(STUDIO_SELECTED_OBJECT_DELETE_CANCEL_ID, false);
    this._set_studio_control_disabled(STUDIO_SELECTED_OBJECT_DELETE_CONFIRM_ID, false);
    const dialog = XUI.getObject(STUDIO_SELECTED_OBJECT_DELETE_DIALOG_ID) as any;
    dialog?.hide?.();
  }

  private _request_delete_selected_object() {
    const selected = this._selected_object;

    if (!selected) {
      this._set_selected_object_delete_controls(null);
      this._selected_object_delete_error("Select an object first", null);
      return;
    }

    if (this._selected_object_is_root_view(selected)) {
      this._set_selected_object_delete_controls(selected);
      this._selected_object_delete_error("Root view cannot be deleted", selected);
      return;
    }

    this._selected_object_pending_delete = { ...selected };
    this._set_studio_label(STUDIO_SELECTED_OBJECT_DELETE_TYPE_ID, selected._type.trim() || "-");
    this._set_studio_label(STUDIO_SELECTED_OBJECT_DELETE_NAME_ID, this._format_selected_object_delete_name(selected));
    this._set_studio_control_disabled(STUDIO_SELECTED_OBJECT_DELETE_CANCEL_ID, false);
    this._set_studio_control_disabled(STUDIO_SELECTED_OBJECT_DELETE_CONFIRM_ID, false);

    const dialog = XUI.getObject(STUDIO_SELECTED_OBJECT_DELETE_DIALOG_ID) as any;
    dialog?.show?.();
  }

  private async _confirm_delete_selected_object() {
    const selected = this._selected_object_pending_delete;

    if (!selected) {
      this._hide_delete_selected_object_dialog();
      this._selected_object_delete_error("Select an object first", null);
      return;
    }

    const target_id = this._selected_object_json_id(selected);
    if (!target_id) {
      this._hide_delete_selected_object_dialog();
      this._selected_object_persisted_id_error("selected object delete", selected);
      return;
    }

    const source_view_id = selected._source_view_id.trim();
    if (!source_view_id) {
      this._hide_delete_selected_object_dialog();
      this._selected_object_delete_error("Selected object has no source view", selected);
      return;
    }

    if (this._selected_object_is_root_view(selected)) {
      this._hide_delete_selected_object_dialog();
      this._set_selected_object_delete_controls(selected);
      this._selected_object_delete_error("Root view cannot be deleted", selected);
      return;
    }

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();

    if (!app_id) {
      this._selected_object_delete_error("No active app selected", selected);
      return;
    }

    if (!env) {
      this._selected_object_delete_error("No active environment selected", selected);
      return;
    }

    const params: XStudioSelectedObjectApplyViewEditParams = {
      _app_id: app_id,
      _env: env,
      _view_id: source_view_id,
      _target_id: target_id,
      _target_type: selected._type.trim() || "object",
      _edit_action: "remove-object",
    };

    this._set_studio_control_disabled(STUDIO_SELECTED_OBJECT_DELETE_CANCEL_ID, true);
    this._set_studio_control_disabled(STUDIO_SELECTED_OBJECT_DELETE_CONFIRM_ID, true);
    this._write_studio_status("Deleting selected object...");
    this._log("selected object delete request", {
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_type: params._target_type,
      _edit_action: params._edit_action,
      _path: selected._path,
      _parent_path: selected._parent_path,
    });

    try {
      this._xvm_client?.note_structured_view_edit?.({
        _view_id: params._view_id,
        _action: params._edit_action,
        _target_id: params._target_id,
      });

      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._xvm_client?.clear_pending_structured_view_edit?.({
          _view_id: params._view_id,
          _action: params._edit_action,
          _target_id: params._target_id,
        });
        this._set_studio_control_disabled(STUDIO_SELECTED_OBJECT_DELETE_CANCEL_ID, false);
        this._set_studio_control_disabled(STUDIO_SELECTED_OBJECT_DELETE_CONFIRM_ID, false);
        this._write_studio_status(this._format_apply_view_edit_failure(result));
        this._error("selected object delete failed", {
          _structured_error: result,
        });
        return;
      }

      this._hide_delete_selected_object_dialog();
      this._write_studio_status("Deleted selected object");
      this._log("selected object delete result", {
        _result: result,
      });
      this._refresh_object_tree_for_current_view();
    } catch (err) {
      this._xvm_client?.clear_pending_structured_view_edit?.({
        _view_id: params._view_id,
        _action: params._edit_action,
        _target_id: params._target_id,
      });
      this._set_studio_control_disabled(STUDIO_SELECTED_OBJECT_DELETE_CANCEL_ID, false);
      this._set_studio_control_disabled(STUDIO_SELECTED_OBJECT_DELETE_CONFIRM_ID, false);
      const message = `Delete failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("selected object delete failed", {
        _error: to_err(err),
      });
    }
  }

  private _update_selected_object_inspector() {
    const selected = this._selected_object;

    if (!selected) {
      this._set_selected_object_inspector_controls(this._selected_object_inspector_draft, false);
      this._write_selected_object_json_editor("");
      this._set_selected_object_move_controls(null);
      this._set_selected_object_duplicate_controls(null);
      this._set_selected_object_delete_controls(null);
      return;
    }

    this._set_selected_object_inspector_controls(this._selected_object_inspector_draft, true);
    this._write_selected_object_json_editor(this._selected_object_json);
    this._set_selected_object_move_controls(selected);
    this._set_selected_object_duplicate_controls(selected);
    this._set_selected_object_delete_controls(selected);
  }

  private _clear_selected_object() {
    this._hide_delete_selected_object_dialog();
    this._selected_object_pending_select_id = "";
    this._selected_object = null;
    this._selected_object_json = "";
    this._selected_tree_row_id = "";
    this._clear_selected_canvas_highlight();
    this._clear_selected_object_inspector_draft();
    _xd.set(_XD_KEYS.STUDIO_SELECTED_OBJECT, null, { source: "xstudio-object-tree" });
    this._update_selected_object_inspector();
  }

  private _select_object_tree_node(node: XStudioObjectTreeNode, row_id: string) {
    if (!node._meta) return;

    this._selected_object_pending_select_id = "";
    const selected = { ...node._meta };
    selected._dom_status = this._apply_selected_canvas_highlight(selected);

    this._selected_object = selected;
    this._selected_object_json = this._safe_selected_json_preview(node._object);
    this._populate_selected_object_inspector_draft(node._object);
    _xd.set(_XD_KEYS.STUDIO_SELECTED_OBJECT, selected, { source: "xstudio-object-tree" });
    this._log_selected_object_persisted_metadata(selected);
    this._mark_selected_tree_row(row_id);
    this._update_selected_object_inspector();
  }

  private _resolve_object_tree_view_id() {
    return this._resolve_studio_target_view_id();
  }

  private _refresh_object_tree_for_current_view() {
    if (!XUI.getObject(STUDIO_OBJECT_TREE_ID)) return;

    const view_id = this._resolve_object_tree_view_id();
    const view = this._get_cached_view(view_id);

    if (!view_id || !is_obj(view)) {
      this._object_tree_nodes = [];
      this._object_tree_view_id = "";
      this._object_tree_expanded_node_keys.clear();
      this._object_tree_touched_expansion_node_keys.clear();
      const tree = (XUI.getObject(STUDIO_OBJECT_TREE_RESULTS_ID) ?? XUI.getObject(STUDIO_OBJECT_TREE_ID)) as any;
      tree?.update?.({
        _children: [
          {
            _type: "label",
            _id: `xstudio-object-tree-missing-${this._object_tree_render_seq + 1}`,
            class: "xstudio-dock-placeholder",
            _text: "No active view loaded.",
          },
        ],
      });
      this._clear_selected_object();
      return;
    }

    const nodes: XStudioObjectTreeNode[] = [];
    if (view_id !== this._object_tree_view_id) {
      this._object_tree_view_id = view_id;
      this._object_tree_expanded_node_keys.clear();
      this._object_tree_touched_expansion_node_keys.clear();
    }

    this._build_object_tree_nodes(view, view_id, "$", "$", "", "", "", "$", 0, false, true, nodes);
    this._object_tree_nodes = nodes;
    this._sync_object_tree_expansion_defaults(nodes);
    const flat_nodes = this._flatten_object_tree_nodes(nodes);
    this._log("object tree cache", { _total_nodes: flat_nodes.length });

    const previous_selected = this._selected_object;
    const pending_select_id = this._selected_object_pending_select_id.trim();
    const pending_selected_node = pending_select_id
      ? flat_nodes.find((node) =>
        node._meta?._json_id.trim() === pending_select_id ||
        node._meta?._id.trim() === pending_select_id)
      : undefined;
    if (pending_selected_node) {
      this._selected_object_pending_select_id = "";
    }

    const next_selected_node =
      pending_selected_node ||
      (previous_selected
        ? flat_nodes.find((node) => this._selected_object_matches(previous_selected, node._meta))
        : undefined);

    if (previous_selected && !next_selected_node && !pending_select_id) {
      this._clear_selected_object();
    } else if (next_selected_node?._meta) {
      const dom_status = this._apply_selected_canvas_highlight(next_selected_node._meta);
      this._selected_object = { ...next_selected_node._meta, _dom_status: dom_status };
      this._selected_object_json = this._safe_selected_json_preview(next_selected_node?._object ?? null);
      this._populate_selected_object_inspector_draft(next_selected_node?._object ?? null);
      _xd.set(_XD_KEYS.STUDIO_SELECTED_OBJECT, this._selected_object, { source: "xstudio-object-tree" });
      this._log_selected_object_persisted_metadata(this._selected_object);
    }

    this._render_cached_object_tree_nodes();
    this._update_selected_object_inspector();
  }

  private _log(...args: any[]) {
    _xlog.log(LOG, ...args);
  }

  private _error(...args: any[]) {
    _xlog.error(LOG, ...args);
  }

  private _vibe_log(...args: any[]) {
    _xlog.log(VIBE_LOG, ...args);
  }

  private async _send_command(_module: string, _op: string, _params: Record<string, any>) {
    const req_id = ++this._cmd_seq;
    this._log(`-> ${_module}.${_op}`, { _req_id: req_id, _params });
    try {
      const raw = await this._client().sendXcmd({ _module, _op, _params });
      this._log(`<- ${_module}.${_op} raw`, { _req_id: req_id, _raw: raw });
      const result = to_result(raw);
      this._log(`<- ${_module}.${_op} result`, { _req_id: req_id, _result: result });
      return result;
    } catch (err: any) {
      this._error(`xx ${_module}.${_op} failed`, { _req_id: req_id, _error: to_err(err) });
      throw err;
    }
  }

  private _send_server_xvm_command(_op: string, _params: Record<string, any>) {
    return this._send_command("server-xvm", _op, _params);
  }

  private _send_studio_command(_op: string, _params: Record<string, any>) {
    return this._send_command("studio", _op, _params);
  }

  private _send_xvibe_command(_op: string, _params: Record<string, any>) {
    return this._send_command("xvibe", _op, _params);
  }

  private _send_module_creator_command(_op: string, _params: Record<string, any>) {
    return this._send_command("module-creator", _op, _params);
  }

  private _send_generation_fire_and_listen(xcmd: any) {
    try {
      const request_id = Wormholes.sendXcmdFireAndListen(xcmd);
      this._vibe_log("generation fire-and-listen started", {
        _generation_id: xcmd?._params?._generation_id,
        _request_id: request_id,
        _op: xcmd?._op,
      });
    } catch (err) {
      if (this._is_timeout_error(err)) {
        this._vibe_log("generation request ack timed out; still listening for events", {
          _generation_id: xcmd?._params?._generation_id,
        });
        this._vibe_log("generation ack timeout ignored", {
          _generation_id: xcmd?._params?._generation_id,
        });
        return;
      }
      throw err;
    }
  }

  private _send_studio_generate_artifact_prompt(prompt: string, view_id: string, source: string) {
    let generation_id = "";

    try {
      const normalized_prompt = String(prompt ?? "").trim();
      const target_view_id = String(view_id ?? "").trim();

      if (!normalized_prompt) {
        this._write_studio_status("No edit prompt to apply");
        this._log("studio generate-artifact ignored: empty prompt", { _source: source });
        return false;
      }

      if (!target_view_id) {
        this._write_studio_status("No target view selected");
        this._error("studio generate-artifact failed: missing view_id", { _source: source });
        return false;
      }

      const app_id = this._client().getActiveAppId();
      const env = this._client().getActiveEnv();
      const artifact_type = "auto";

      if (!app_id) {
        this._write_studio_status("No active app selected");
        this._error("studio generate-artifact failed: missing app_id", {
          _source: source,
          _app_id: app_id,
          _view_id: target_view_id,
        });
        return false;
      }

      generation_id = _xu.guid();
      this._start_generation(generation_id, target_view_id);
      this._log("studio generate-artifact request", {
        _source: source,
        _artifact_type: artifact_type,
        _app_id: app_id,
        _env: env,
        _view_id: target_view_id,
        _generation_id: generation_id,
      });

      this._send_generation_fire_and_listen({
        _module: "studio",
        _op: "generate-artifact",
        _params: {
          _prompt: normalized_prompt,
          _app_id: app_id,
          _env: env,
          _view_id: target_view_id,
          _generation_id: generation_id,
          _artifact_type: artifact_type,
        },
      });
      this._set_generation_state("running", "Preparing generation...");
      return true;
    } catch (err) {
      if (this._is_timeout_error(err)) {
        this._vibe_log("generation request ack timed out; still listening for events", {
          _generation_id: generation_id,
          _source: source,
        });
        this._vibe_log("generation ack timeout ignored", {
          _generation_id: generation_id,
          _source: source,
        });
        return true;
      }

      this.clear_active_generation();
      this._set_generation_state("failed", to_err(err), err);
      this._write_studio_status(`Apply failed: ${to_err(err)}`);
      this._error("studio generate-artifact failed", { _source: source, _error: to_err(err) });
      return false;
    }
  }

  private _normalize_event_payload(payload: any): any {
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

  private _is_timeout_error(err: any) {
    const e = is_obj(err) ? ((err as any)._error ?? err) : err;
    return is_obj(e) && (e as any)._code === "E_TIMEOUT";
  }

  private _format_generation_error(evt: VibeGenerationFailureEvt) {
    const code = typeof evt._code === "string" && evt._code.trim() ? evt._code.trim() : "";
    const message =
      typeof evt._message === "string" && evt._message.trim()
        ? evt._message.trim()
        : "";

    if (code && message) return `${code}: ${message}`;
    if (message) return message;
    if (code) return code;
    return "Generation failed";
  }

  private _normalize_generation_stage(stage: string) {
    return stage.trim().toLowerCase().replaceAll("_", "-");
  }

  private _humanize_generation_stage(stage: string) {
    const text = stage
      .trim()
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .replace(/\s+/g, " ")
      .toLowerCase();

    if (!text) return "Generating...";
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}...`;
  }

  private _format_generation_stage_message(evt: Record<string, any>) {
    const message = typeof evt._message === "string" && evt._message.trim() ? evt._message.trim() : "";
    if (message) return message;

    const stage = typeof evt._stage === "string" && evt._stage.trim() ? evt._stage.trim() : "";
    if (!stage) return "Generating...";

    const normalized_stage = this._normalize_generation_stage(stage);
    return GENERATION_STAGE_STATUS[normalized_stage] ?? this._humanize_generation_stage(stage);
  }

  private _write_generation_state(state: VibeGenerationState, status: string, error?: any) {
    _xd.set(_XD_KEYS.STUDIO_GENERATION_STATE, state, { source: "vibe-client" });
    _xd.set(_XD_KEYS.STUDIO_GENERATION_STATUS, status, { source: "vibe-client" });
    if (error !== undefined) {
      _xd.set(_XD_KEYS.STUDIO_GENERATION_ERROR, error, { source: "vibe-client" });
    }
  }

  private _set_generation_state(state: VibeGenerationState, status: string, error?: any) {
    this._write_generation_state(state, status, error);
    const button_text = this._set_studio_generation_ui(state, status);
    this._vibe_log("generation-status updated", {
      _state: state,
      _status: status,
      _button_text: button_text,
      _generation_id: this._active_generation_id,
    });
  }

  private _remember_generation_id(generation_id?: string) {
    if (typeof generation_id !== "string" || !generation_id.trim()) return;
    _xd.set(_XD_KEYS.STUDIO_GENERATION_ID, generation_id.trim(), { source: "vibe-client" });
  }

  private _get_event_generation_id(evt: Record<string, any>) {
    if (!is_obj(evt)) return "";

    const direct = evt._generation_id;
    if (typeof direct === "string" && direct.trim()) return direct.trim();

    const meta = evt._meta?._generation_id;
    if (typeof meta === "string" && meta.trim()) return meta.trim();

    const data = evt._data?._generation_id ?? evt.data?._generation_id;
    if (typeof data === "string" && data.trim()) return data.trim();

    const payload = evt._payload?._generation_id ?? evt.payload?._generation_id;
    if (typeof payload === "string" && payload.trim()) return payload.trim();

    const args_payload = Array.isArray(evt._args)
      ? evt._args[0]
      : Array.isArray(evt.args)
        ? evt.args[0]
        : null;
    const args_generation_id = args_payload?._generation_id ?? args_payload?._meta?._generation_id;
    return typeof args_generation_id === "string" && args_generation_id.trim()
      ? args_generation_id.trim()
      : "";
  }

  private _event_matches_active_generation(evt: Record<string, any>) {
    if (!this._active_generation_id) return false;
    if (evt._app_id !== this._client().getActiveAppId() || evt._env !== this._client().getActiveEnv()) return false;

    const event_generation_id = this._get_event_generation_id(evt);

    if (event_generation_id) {
      return event_generation_id === this._active_generation_id;
    }

    if (typeof evt._view_id === "string" && this._active_generation_view_id) {
      return evt._view_id === this._active_generation_view_id;
    }

    return false;
  }

  private _generation_event_matches(evt: Record<string, any>) {
    const event_generation_id = this._get_event_generation_id(evt);

    if (this._active_generation_id) {
      return event_generation_id === this._active_generation_id;
    }

    const active_app_id = this._client().getActiveAppId();
    const active_env = this._client().getActiveEnv();
    const has_app_id = typeof evt._app_id === "string" && evt._app_id.trim();
    const has_env = typeof evt._env === "string" && evt._env.trim();
    if (has_app_id && evt._app_id !== active_app_id) return false;
    if (has_env && evt._env !== active_env) return false;

    const has_app_env_match = Boolean(has_app_id && has_env);
    const view_id = typeof evt._view_id === "string" && evt._view_id.trim() ? evt._view_id.trim() : "";
    const view_matches =
      view_id === this._client().get_app_view_id() ||
      view_id === this._client().get_current_view_id();

    const matched = has_app_env_match || view_matches;
    if (matched) {
      this._vibe_log("generation event fallback match", {
        _generation_id: event_generation_id,
        _app_id: evt._app_id,
        _env: evt._env,
        _view_id: evt._view_id,
      });
    }

    return matched;
  }

  private _start_generation(generation_id: string, view_id: string) {
    this._active_generation_id = generation_id;
    this._active_generation_view_id = view_id;
    this._remember_generation_id(generation_id);
    this._vibe_log("generation started", {
      _generation_id: generation_id,
      _app_id: this._client().getActiveAppId(),
      _env: this._client().getActiveEnv(),
      _view_id: view_id,
    });
    this._set_generation_state("pending", "Preparing generation...");
  }

  private _complete_generation_from_update(upd: StudioXVMUpdateEvt) {
    if (!this._event_matches_active_generation(upd as any)) return;
    this._vibe_log("generation completed from xvm:update", {
      _generation_id: this._active_generation_id,
      _view_id: upd._view_id,
    });
    this._remember_generation_id(upd._generation_id || this._active_generation_id);
    this.clear_active_generation();
    this._set_generation_state("completed", "Generation complete");
  }

  private _fail_generation_from_event(evt: VibeGenerationFailureEvt, source_evt: string, error_payload: any = evt) {
    this._vibe_log("generation-failed received", {
      _source: source_evt,
      _generation_id: this._get_event_generation_id(evt as any),
      _app_id: evt._app_id,
      _env: evt._env,
      _stage: (evt as any)._stage,
      _message: evt._message,
    });

    if (!this._generation_event_matches(evt as any)) {
      this._vibe_log("generation failed ignored", {
        _source: source_evt,
        _generation_id: this._get_event_generation_id(evt as any),
        _active_generation_id: this._active_generation_id,
        _app_id: evt._app_id,
        _env: evt._env,
        _view_id: evt._view_id,
        _current_app_view_id: this._resolve_studio_target_view_id(),
      });
      return;
    }
    const message = this._format_generation_error(evt);
    this._vibe_log("generation failed shown", {
      _source: source_evt,
      _generation_id: this._get_event_generation_id(evt as any) || this._active_generation_id,
      _code: evt._code,
      _message: evt._message,
    });
    this._remember_generation_id(this._get_event_generation_id(evt as any) || this._active_generation_id);
    this.clear_active_generation();
    this._set_generation_state("failed", message, error_payload);
  }

  private _handle_generation_stage(payload: any) {
    const evt_payload = this._normalize_event_payload(payload);
    if (!is_obj(evt_payload)) return;

    this._vibe_log("generation-stage received", {
      _generation_id: this._get_event_generation_id(evt_payload),
      _app_id: evt_payload._app_id,
      _env: evt_payload._env,
      _stage: evt_payload._stage,
      _message: evt_payload._message,
    });

    if (!this._generation_event_matches(evt_payload)) return;

    const message = this._format_generation_stage_message(evt_payload);
    const stage =
      typeof evt_payload._stage === "string" && evt_payload._stage.trim()
        ? this._normalize_generation_stage(evt_payload._stage)
        : "";
    const next_state: VibeGenerationState =
      stage === "complete" || stage === "completed"
        ? "completed"
        : stage === "failed"
          ? "failed"
          : "running";
    const complete_has_message = typeof evt_payload._message === "string" && evt_payload._message.trim();
    const status = next_state === "completed" && !complete_has_message ? "Generation complete" : message;
    const button_text = next_state === "running"
      ? this._short_generation_status(status)
      : "Go";

    this._vibe_log("generation stage shown", {
      _stage: evt_payload._stage,
      _message: evt_payload._message,
      _status: status,
      _button_text: button_text,
      _generation_id: this._get_event_generation_id(evt_payload),
    });

    this._remember_generation_id(this._get_event_generation_id(evt_payload));

    if (next_state === "completed") {
      this.clear_active_generation();
      this._set_generation_state("completed", status);
      return;
    }

    if (next_state === "failed") {
      this.clear_active_generation();
      this._set_generation_state("failed", status, evt_payload);
      return;
    }

    this._set_generation_state("running", status);
  }

  private _handle_generation_complete(payload: any) {
    const evt_payload = this._normalize_event_payload(payload);
    if (!is_obj(evt_payload)) return;

    if (!this._event_matches_active_generation(evt_payload)) return;

    this._vibe_log("generation complete received", {
      _generation_id: this._get_event_generation_id(evt_payload),
      _app_id: evt_payload._app_id,
      _env: evt_payload._env,
      _view_id: evt_payload._view_id,
      _message: evt_payload._message,
    });

    this._remember_generation_id(this._get_event_generation_id(evt_payload) || this._active_generation_id);
    this.clear_active_generation();
    this._set_generation_state("completed", evt_payload._message ?? "Generation complete");
  }

  private _register_generation_listeners() {
    if (this._generation_listeners_registered) {
      return;
    }
    this._generation_listeners_registered = true;

    _xem.on(EVT_VIBE_GENERATION_STAGE, (payload: any) => {
      this._vibe_log("generation-stage raw", payload);
      this._handle_generation_stage(payload);
    });

    _xem.on(EVT_VIBE_GENERATION_COMPLETE, (payload: any) => {
      this._vibe_log("generation-complete raw", payload);
      this._handle_generation_complete(payload);
    });

    const handle_generation_failure = (payload: any, source_evt: string) => {
      const evt_payload = this._normalize_event_payload(payload);
      if (!is_obj(evt_payload)) return;
      this._fail_generation_from_event(evt_payload as VibeGenerationFailureEvt, source_evt);
    };

    _xem.on(EVT_VIBE_GENERATION_FAILED, (payload: any) => {
      this._vibe_log("generation-failed raw", payload);
      handle_generation_failure(payload, EVT_VIBE_GENERATION_FAILED);
    });
    _xem.on(EVT_XVIBE_ERROR, (payload: any) => {
      handle_generation_failure(payload, EVT_XVIBE_ERROR);
    });
    _xem.on(EVT_COMMAND_ERROR, (payload: any) => {
      handle_generation_failure(payload, EVT_COMMAND_ERROR);
    });

    this._vibe_log("generation listeners registered", {
      _events: [
        EVT_VIBE_GENERATION_STAGE,
        EVT_VIBE_GENERATION_COMPLETE,
        EVT_VIBE_GENERATION_FAILED,
      ],
    });
  }

  private async _close_studio() {
    try {
      await (XVM as any).close?.({ region: STUDIO_REGION_ID });
      this._clear_selected_canvas_highlight();
      this._log("studio closed");
    } catch (err) {
      this._error("studio close failed", err);
    }
  }

  private _short_generation_status(status: string) {
    const text = typeof status === "string" ? status.trim() : "";
    if (!text) return "Working...";

    const mapped: Record<string, string> = {
      "Preparing generation...": "Preparing...",
      "Planning intent...": "Planning...",
      "Planning...": "Planning...",
      "Selecting skills...": "Selecting...",
      "Skills selected": "Skills selected",
      "Loading current view...": "Loading...",
      "Building prompt...": "Prompt...",
      "Generating JSON...": "Generating...",
      "Parsing response...": "Parsing...",
      "Validating artifact...": "Validating...",
      "Validating...": "Validating...",
      "Repairing artifact...": "Repairing...",
      "Repairing...": "Repairing...",
      "Saving view...": "Saving...",
      "Saving...": "Saving...",
      "View updated": "Done",
      "Done": "Done",
      "Generation failed": "Failed",
    };

    if (mapped[text]) return mapped[text];
    return text.length <= 22 ? text : "Working...";
  }

  _set_studio_generation_ui(state: VibeGenerationState, status: string) {
    const button = XUI.getObject("xstudio-preview-button") as any;
    const status_label = XUI.getObject("xstudio-generation-status") as any;
    const running = state === "pending" || state === "running";
    const button_text = running ? this._short_generation_status(status) : "Go";

    if (button) {
      button.setText?.(button_text);
      if (button.dom) {
        if (running) {
          button.dom.setAttribute("disabled", "true");
        } else {
          button.dom.removeAttribute("disabled");
        }
      }
    }

    status_label?.setText?.(status);
    return button_text;
  }

  async _set_studio_theme(xcmd: any) {
    const params = xcmd?._params ?? xcmd ?? {};
    const requested_theme = params?._theme ?? params?.theme;
    const requested_theme_value = String(requested_theme ?? "").trim().toLowerCase();
    const has_valid_requested_theme =
      (STUDIO_THEME_OPTIONS as readonly string[]).includes(requested_theme_value);
    const theme = has_valid_requested_theme
      ? requested_theme_value
      : this._read_studio_theme_selector_value();

    return {
      _ok: true,
      _result: {
        _theme: this._apply_studio_theme(theme),
      },
    };
  }

  async _toggle_portlet(xcmd: any) {
    const params = xcmd?._params ?? xcmd ?? {};
    const portlet_id = this._normalize_portlet_id(
      params?._portlet ?? params?.portlet ?? params?._id ?? params?.id,
    );

    if (!portlet_id) {
      return {
        _ok: false,
        _result: {
          _error: "Unknown XStudio portlet.",
        },
      };
    }

    const visible = this._portlet_visibility[portlet_id] !== true;
    this._portlet_visibility[portlet_id] = visible;

    if (visible) {
      this._right_dock_collapsed = false;
    }

    this._apply_dock_state();

    return {
      _ok: true,
      _result: {
        _portlet: portlet_id,
        _visible: visible,
      },
    };
  }

  private async _send_conversation_message(raw_value?: any) {
    const text = this._local_conversation_text(
      raw_value === undefined ? this._read_conversation_input_value() : raw_value,
    );
    this._set_conversation_send_enabled(text.length > 0);
    if (!text) return;

    await this._append_conversation_message(text);
  }

  _set_studio_label(object_id: string, text: string) {
    const label = XUI.getObject(object_id) as any;
    label?.setText?.(text);
  }

  _set_studio_json_editor(text: string) {
    const editor = XUI.getObject("xstudio-json") as any;
    if (editor?.setValue) {
      editor.setValue(text);
    } else if (editor?.dom && "value" in editor.dom) {
      editor.dom.value = text;
    }
  }

  _set_studio_run_inspector(text: string) {
    const editor = XUI.getObject("xstudio-run-inspector") as any;
    if (editor?.setValue) {
      editor.setValue(text);
    } else if (editor?.dom && "value" in editor.dom) {
      editor.dom.value = text;
    }
  }

  _set_studio_module_source_editor(text: string) {
    const editor = XUI.getObject("xstudio-module-source") as any;
    editor?.setValue?.(text);
  }

  _set_studio_selected_module_editor(text: string) {
    const editor = XUI.getObject("xstudio-selected-module") as any;
    editor?.setValue?.(text);
  }

  _write_studio_status(status: string) {
    _xd.set(_XD_KEYS.STUDIO_STATUS, status, { source: "xstudio-runtime" });
    this._set_studio_label("xstudio-status", status);
  }

  _get_studio_module_name(item: any) {
    if (typeof item === "string" && item.trim()) return item.trim();
    if (!is_obj(item)) return "";

    const name =
      typeof item._name === "string" && item._name.trim()
        ? item._name.trim()
        : typeof item._id === "string" && item._id.trim()
          ? item._id.trim()
          : typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : "";

    return name;
  }

  _get_studio_module_state(item: any) {
    if (!is_obj(item)) return "";
    return typeof item._state === "string" && item._state.trim()
      ? item._state.trim()
      : "";
  }

  _get_studio_modules() {
    const modules = _xd.get(_XD_KEYS.STUDIO_MODULES);
    return Array.isArray(modules) ? modules : [];
  }

  _resolve_studio_selected_module(options: { allow_dev_fallback?: boolean } = {}) {
    const selected_module = String(_xd.get(_XD_KEYS.STUDIO_SELECTED_MODULE) ?? "").trim();
    if (selected_module) return selected_module;

    const modules = this._get_studio_modules();
    if (modules.length > 0) {
      this._write_studio_status("Select a module first");
      return "";
    }

    if (options.allow_dev_fallback === false) {
      this._write_studio_status("Select a module first");
      return "";
    }

    const fallback = "tic-tac-toe";
    _xd.set(_XD_KEYS.STUDIO_SELECTED_MODULE, fallback, { source: "xstudio-module-editor" });
    this._set_studio_selected_module_editor(fallback);
    return fallback;
  }

  _format_studio_list_item(item: any) {
    if (typeof item === "string") return item;
    if (!is_obj(item)) return String(item);

    const id =
      typeof item._id === "string" && item._id.trim()
        ? item._id.trim()
        : typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : "";
    const title =
      typeof item._title === "string" && item._title.trim()
        ? item._title.trim()
        : typeof item._name === "string" && item._name.trim()
          ? item._name.trim()
          : "";

    if (id && title && title !== id) return `${id} (${title})`;
    if (id) return id;
    if (title) return title;

    try {
      return JSON.stringify(item);
    } catch {
      return String(item);
    }
  }

  _format_studio_list(label: string, items: any[]) {
    if (!Array.isArray(items) || items.length === 0) return `${label}: -`;
    return `${label}: ${items.map((item) => this._format_studio_list_item(item)).join(", ")}`;
  }

  _format_studio_module_list_item(item: any) {
    const name = this._get_studio_module_name(item);
    const state = this._get_studio_module_state(item);

    if (name && state) return `${name} (${state})`;
    if (name) return name;

    try {
      return JSON.stringify(item);
    } catch {
      return String(item);
    }
  }

  _format_studio_module_list(items: any[]) {
    if (!Array.isArray(items) || items.length === 0) return "Modules: -";
    return `Modules: ${items.map((item) => this._format_studio_module_list_item(item)).join(", ")}`;
  }

  _format_studio_run_inspector_section(section: any) {
    if (!is_obj(section)) return "";

    const label =
      typeof section._label === "string" && section._label.trim()
        ? section._label.trim()
        : typeof section._file === "string" && section._file.trim()
          ? section._file.trim()
          : "Section";
    const preview =
      typeof section._preview === "string"
        ? section._preview
        : section._content === undefined || section._content === null
          ? ""
          : JSON.stringify(section._content, null, 2);

    return [`## ${label}`, preview || "-"].join("\n");
  }

  _format_studio_run_inspector(result: any) {
    const inspector = is_obj(result?._inspector) ? result._inspector : {};
    const summary_text =
      typeof inspector._summary_text === "string" && inspector._summary_text.trim()
        ? inspector._summary_text.trim()
        : is_obj(result?._summary)
          ? JSON.stringify(result._summary, null, 2)
          : "No run summary.";
    const sections =
      Array.isArray(inspector._sections)
        ? inspector._sections
          .map((section: any) => this._format_studio_run_inspector_section(section))
          .filter((section: string) => section.trim().length > 0)
        : [];

    return [
      summary_text,
      ...sections,
    ].join("\n\n");
  }

  _extract_studio_generated_module_response(result: any, selected_module: string) {
    const direct_source =
      is_obj(result) && typeof result._source === "string"
        ? result._source
        : undefined;
    const module_source =
      is_obj(result?._module) && typeof result._module._source === "string"
        ? result._module._source
        : undefined;
    const nested_source =
      is_obj(result?._result) && typeof result._result._source === "string"
        ? result._result._source
        : undefined;
    const nested_module_source =
      is_obj(result?._result?._module) && typeof result._result._module._source === "string"
        ? result._result._module._source
        : undefined;

    const direct_name =
      is_obj(result) && typeof result._name === "string" && result._name.trim()
        ? result._name.trim()
        : "";
    const module_name =
      is_obj(result?._module) && typeof result._module._name === "string" && result._module._name.trim()
        ? result._module._name.trim()
        : "";

    return {
      _name: direct_name || module_name || selected_module,
      _source: direct_source ?? module_source ?? nested_source ?? nested_module_source,
    };
  }

  _resolve_studio_target_view_id() {
    const active_app_view_id = this._active_xvm_app_view_id();
    if (active_app_view_id && active_app_view_id !== STUDIO_VIEW_ID) {
      return active_app_view_id;
    }

    const current_view_id = this._client().get_current_view_id() === STUDIO_VIEW_ID
      ? ""
      : this._client().get_current_view_id();
    return this._client().get_app_view_id() || current_view_id || "";
  }

  async _inspect_studio_latest_run() {
    try {
      const app_id = this._client().getActiveAppId();
      const env = this._client().getActiveEnv();
      const generation_id = String(_xd.get(_XD_KEYS.STUDIO_GENERATION_ID) ?? "").trim();

      if (!app_id) {
        throw new Error("Missing active app id");
      }

      this._set_studio_label("xstudio-run-inspector-status", "Inspecting...");

      const out = await this._send_studio_command("inspect-latest-run", {
        _app_id: app_id,
        _env: env,
        ...(generation_id ? { _generation_id: generation_id } : {}),
      });
      if (!is_obj(out) || out._ok !== true) {
        throw new Error(`Invalid inspect-latest-run response: ${to_err(out)}`);
      }

      const formatted = this._format_studio_run_inspector(out);
      const status =
        is_obj(out._summary) && typeof out._summary._status === "string"
          ? out._summary._status
          : is_obj(out._inspector) && typeof out._inspector._status === "string"
            ? out._inspector._status
            : "completed";

      _xd.set(_XD_KEYS.STUDIO_RUN_INSPECTOR, formatted, { source: "xstudio-runtime" });
      this._set_studio_run_inspector(formatted);
      this._set_studio_label("xstudio-run-inspector-status", status);
      this._write_studio_status("Run inspected");
    } catch (err) {
      const message = `Inspect last run failed: ${to_err(err)}`;
      this._set_studio_label("xstudio-run-inspector-status", "failed");
      this._write_studio_status(message);
      this._error("studio inspect latest run failed", err);
    }
  }

  async _refresh_studio_runtime() {
    try {
      const app_id = this._client().getActiveAppId();
      const env = this._client().getActiveEnv();

      if (!app_id) {
        throw new Error("Missing active app id");
      }

      this._write_studio_status("Refreshing runtime...");

      const params = { _app_id: app_id, _env: env };
      const [views_res, flows_res, modules_res] = await Promise.all([
        this._send_server_xvm_command("list-views", params) as Promise<ServerListViewsRes>,
        this._send_server_xvm_command("list-flows", params) as Promise<ServerListFlowsRes>,
        // TODO: move list-generated-modules to module-creator once server API is available.
        this._send_server_xvm_command("list-generated-modules", {}) as Promise<ServerListGeneratedModulesRes>,
      ]);

      const views = Array.isArray(views_res?._views) ? views_res._views : [];
      const flows = Array.isArray(flows_res?._flows) ? flows_res._flows : [];
      const modules = Array.isArray(modules_res?._modules) ? modules_res._modules : [];

      _xd.set(_XD_KEYS.STUDIO_VIEWS, views, { source: "xstudio-runtime" });
      _xd.set(_XD_KEYS.STUDIO_FLOWS, flows, { source: "xstudio-runtime" });
      _xd.set(_XD_KEYS.STUDIO_MODULES, modules, { source: "xstudio-runtime" });

      const selected_module = String(_xd.get(_XD_KEYS.STUDIO_SELECTED_MODULE) ?? "").trim();
      if (!selected_module && modules.length > 0) {
        const first_module = this._get_studio_module_name(modules[0]);
        if (first_module) {
          _xd.set(_XD_KEYS.STUDIO_SELECTED_MODULE, first_module, { source: "xstudio-runtime" });
          this._set_studio_selected_module_editor(first_module);
        }
      }

      this._set_studio_label("xstudio-views-list", this._format_studio_list("Views", views));
      this._set_studio_label("xstudio-flows-list", this._format_studio_list("Flows", flows));
      this._set_studio_label("xstudio-modules-list", this._format_studio_module_list(modules));
      this._write_studio_status("Runtime refreshed");
      return true;
    } catch (err) {
      const message = `Runtime refresh failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("studio runtime refresh failed", err);
      return false;
    }
  }

  async _load_studio_current_view_json() {
    try {
      const app_id = this._client().getActiveAppId();
      const env = this._client().getActiveEnv();
      const view_id = this._resolve_studio_target_view_id();

      if (!app_id || !view_id) {
        throw new Error("Missing active app id or view id");
      }

      this._write_studio_status(`Loading ${view_id}...`);

      const out = (await this._send_server_xvm_command("get-view", { _app_id: app_id, _env: env, _view_id: view_id })) as ServerGetViewRes;
      if (!is_obj(out) || !is_obj(out._view)) {
        throw new Error(`Invalid get-view response for '${view_id}'`);
      }

      const json = JSON.stringify(out._view, null, 2);
      _xd.set(_XD_KEYS.STUDIO_JSON, json, { source: "xstudio-runtime" });
      this._set_studio_json_editor(json);
      this._write_studio_status(`Loaded ${view_id}`);
    } catch (err) {
      const message = `Load current view failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("studio load current view failed", err);
    }
  }

  async _save_studio_view_json() {
    try {
      const app_id = this._client().getActiveAppId();
      const env = this._client().getActiveEnv();
      const json = String(_xd.get(_XD_KEYS.STUDIO_JSON) ?? "").trim();

      if (!app_id) {
        throw new Error("Missing active app id");
      }
      if (!json) {
        throw new Error("studio:json is empty");
      }

      const view = JSON.parse(json);
      if (!is_obj(view)) {
        throw new Error("studio:json must be a JSON object");
      }

      const json_view_id =
        typeof view._id === "string" && view._id.trim()
          ? view._id.trim()
          : "";
      const view_id = json_view_id || this._resolve_studio_target_view_id();

      if (!view_id) {
        throw new Error("Missing view id");
      }

      this._write_studio_status(`Saving ${view_id}...`);

      await this._send_server_xvm_command("save-view-json", {
        _app_id: app_id,
        _env: env,
        _view_id: view_id,
        _view: view,
      });

      this._write_studio_status(`Saved ${view_id}`);
    } catch (err) {
      const message = `Save view failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("studio save view failed", err);
    }
  }

  async _load_studio_generated_module_source() {
    try {
      const selected_module = this._resolve_studio_selected_module();
      if (!selected_module) return;

      this._write_studio_status(`Loading module ${selected_module}...`);

      const out = await this._send_module_creator_command("get-generated-module", {
        _name: selected_module,
      });

      this._log("studio get-generated-module result", out);

      const parsed = this._extract_studio_generated_module_response(out, selected_module);

      if (typeof parsed._source !== "string") {
        this._error("studio get-generated-module missing source", {
          _selected_module: selected_module,
          _result: out,
        });
        throw new Error(`Invalid get-generated-module response for '${selected_module}'`);
      }

      _xd.set(_XD_KEYS.STUDIO_MODULE_SOURCE, parsed._source, { source: "xstudio-module-editor" });
      this._set_studio_module_source_editor(parsed._source);
      this._write_studio_status(`Loaded module ${parsed._name}`);
    } catch (err) {
      const message = `Load module failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("studio load module failed", err);
    }
  }

  async _save_studio_generated_module_source() {
    try {
      const selected_module = this._resolve_studio_selected_module();
      if (!selected_module) return;

      const source = String(_xd.get(_XD_KEYS.STUDIO_MODULE_SOURCE) ?? "");

      this._write_studio_status(`Saving module ${selected_module}...`);

      await this._send_module_creator_command("save-generated-module-source", {
        _name: selected_module,
        _source: source,
      });

      const runtime_refreshed = await this._refresh_studio_runtime();
      this._write_studio_status(
        runtime_refreshed
          ? `Saved module ${selected_module}. Runtime refreshed`
          : `Saved module ${selected_module}. Runtime refresh failed`
      );
    } catch (err) {
      const message = `Save module failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("studio save module failed", err);
    }
  }

  async _repair_studio_generated_module() {
    try {
      const selected_module = this._resolve_studio_selected_module();
      if (!selected_module) return;

      const prompt = String(_xd.get(_XD_KEYS.STUDIO_MODULE_REPAIR_PROMPT) ?? "").trim();

      if (!prompt) {
        throw new Error("studio:module_repair_prompt is empty");
      }

      this._write_studio_status(`Repairing module ${selected_module}...`);

      await this._send_module_creator_command("repair-generated-module", {
        _name: selected_module,
        _prompt: prompt,
      });

      const out = await this._send_module_creator_command("get-generated-module", {
        _name: selected_module,
      });

      const parsed = this._extract_studio_generated_module_response(out, selected_module);

      if (typeof parsed._source !== "string") {
        throw new Error(`Invalid get-generated-module response for '${selected_module}'`);
      }

      _xd.set(_XD_KEYS.STUDIO_MODULE_SOURCE, parsed._source, { source: "xstudio-module-editor" });
      this._set_studio_module_source_editor(parsed._source);
      const runtime_refreshed = await this._refresh_studio_runtime();
      this._write_studio_status(
        runtime_refreshed
          ? `Repaired module ${parsed._name}. Runtime refreshed`
          : `Repaired module ${parsed._name}. Runtime refresh failed`
      );
    } catch (err) {
      const message = `Repair module failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("studio repair module failed", err);
    }
  }

  async _disable_studio_generated_module() {
    try {
      const selected_module = this._resolve_studio_selected_module();
      if (!selected_module) return;

      this._write_studio_status(`Disabling module ${selected_module}...`);

      await this._send_module_creator_command("disable-generated-module", {
        _name: selected_module,
      });

      const runtime_refreshed = await this._refresh_studio_runtime();
      this._write_studio_status(
        runtime_refreshed
          ? `Disabled module ${selected_module}. Runtime refreshed`
          : `Disabled module ${selected_module}. Runtime refresh failed`
      );
    } catch (err) {
      const message = `Disable module failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("studio disable module failed", err);
    }
  }

  async _delete_studio_generated_module() {
    try {
      const selected_module = this._resolve_studio_selected_module({ allow_dev_fallback: false });
      if (!selected_module) return;

      this._write_studio_status(`Deleting module ${selected_module}...`);

      await this._send_module_creator_command("delete-generated-module", {
        _name: selected_module,
      });

      const runtime_refreshed = await this._refresh_studio_runtime();
      this._write_studio_status(
        runtime_refreshed
          ? `Deleted module ${selected_module}. Runtime refreshed`
          : `Deleted module ${selected_module}. Runtime refresh failed`
      );
    } catch (err) {
      const message = `Delete module failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("studio delete module failed", err);
    }
  }
}
