import {
  XModule,
  type XpellSkill,
  type XpellSkillCommand,
} from "@xpell/core";
import { _x, _xd, _xlog, XUtils as _xu } from "@xpell/core";

import { _xem } from "../XEM/XEventManager";
import Wormholes from "../Wormholes/Wormholes";
import { XUI } from "../XUI/XUI";
import { XVM, type XVMApp } from "../XVM/XVM";
import {
  create_studio_editor_view,
  studio_editor_views,
} from "./XSEditor";
import {
  CRUD_FIELD_SUGGESTION_ARTIFACT_TYPE,
  EXECUTION_GRAPH_ARTIFACT_TYPE,
  MUTATION_PLAN_ARTIFACT_TYPE,
  PROJECT_PLAN_ARTIFACT_TYPE,
  type XStudioArtifactRequestView,
  type XStudioMutationPlanExecutionState,
  create_xstudio_artifact_request_view,
  normalize_xstudio_artifact_request_event_payload,
  xstudio_artifact_request_success_message,
  xstudio_project_plan_current_question_key,
} from "./Conversation/XStudioArtifactCards";
import {
  create_xstudio_conversation_message_list,
  create_xstudio_crud_recommendation_card,
  type XStudioConversationMessage,
  type XStudioConversationRenderMessage,
  type XStudioIntentActionView,
  type XStudioPlanningGreetingQuickStart,
} from "./Conversation/XStudioConversation";
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
import "./xstudio.css";

const LOG = "[xstudio]";
const VIBE_LOG = "[vibe-client]";
const STUDIO_VIEW_ID = "xstudio-editor";
const STUDIO_REGION_ID = "studio";
const STUDIO_CONTAINER_ID = "region-studio";
const STUDIO_SHELL_ID = "xstudio-shell";
const STUDIO_TOPBAR_ID = "xstudio-topbar";
const STUDIO_CANVAS_ID = "xstudio-canvas";
const STUDIO_GUIDE_CARD_ID = "xstudio-guide-card";
const STUDIO_GUIDE_TOGGLE_ID = "xstudio-guide-toggle";
const STUDIO_GUIDE_BODY_ID = "xstudio-guide-body";
const STUDIO_GUIDE_GOAL_ID = "xstudio-guide-goal";
const STUDIO_GUIDE_FOCUS_ID = "xstudio-guide-focus";
const STUDIO_GUIDE_COUNTS_ID = "xstudio-guide-counts";
const STUDIO_GUIDE_UNAVAILABLE_ID = "xstudio-guide-unavailable";
const STUDIO_GUIDE_UNAVAILABLE_DETAIL_ID = "xstudio-guide-unavailable-detail";
const STUDIO_GUIDE_READY_MESSAGE_ID = "xstudio-guide-ready-message";
const STUDIO_GUIDE_EMPTY_ACTION_ID = "xstudio-guide-empty-action";
const STUDIO_GUIDE_FOCUS_INPUT_ID = "xstudio-guide-focus-input";
const STUDIO_GUIDE_SET_FOCUS_ID = "xstudio-guide-set-focus";
const STUDIO_GUIDE_MILESTONE_ID = "xstudio-guide-milestone";
const STUDIO_GUIDE_MILESTONE_TITLE_ID = "xstudio-guide-milestone-title";
const STUDIO_GUIDE_MILESTONE_PROGRESS_ID = "xstudio-guide-milestone-progress";
const STUDIO_GUIDE_MILESTONE_ITEMS_ID = "xstudio-guide-milestone-items";
const STUDIO_GUIDE_ACHIEVEMENTS_ID = "xstudio-guide-achievements";
const STUDIO_GUIDE_ACHIEVEMENTS_LIST_ID = "xstudio-guide-achievements-list";
const STUDIO_GUIDE_RECOMMENDATION_ID = "xstudio-guide-recommendation";
const STUDIO_GUIDE_RECOMMENDATION_LABEL_ID = "xstudio-guide-recommendation-label";
const STUDIO_GUIDE_RECOMMENDATION_TITLE_ID = "xstudio-guide-recommendation-title";
const STUDIO_GUIDE_RECOMMENDATION_REASON_ID = "xstudio-guide-recommendation-reason";
const STUDIO_GUIDE_RECOMMENDATION_DO_IT_ID = "xstudio-guide-recommendation-do-it";
const STUDIO_GUIDE_RECOMMENDATION_STATUS_ID = "xstudio-guide-recommendation-status";
const STUDIO_GUIDE_RECOMMENDATION_FOCUS_ID = "xstudio-guide-recommendation-focus";
const STUDIO_GUIDE_RECOMMENDATION_PROGRESS_ID = "xstudio-guide-recommendation-progress";
const STUDIO_GUIDE_RECOMMENDATION_CANCEL_ID = "xstudio-guide-recommendation-cancel";
const STUDIO_GUIDE_STARTER_ADAPTATION_STATUS_ID = "xstudio-guide-starter-adaptation-status";
const STUDIO_TOGGLE_LEFT_DOCK_ID = "xstudio-toggle-left-dock";
const STUDIO_TOGGLE_RIGHT_DOCK_ID = "xstudio-toggle-right-dock";
const STUDIO_OBJECT_PICKER_TOGGLE_ID = "xstudio-object-picker-toggle";
const STUDIO_OBJECT_TREE_PICKER_TOGGLE_ID = "xstudio-object-tree-picker-toggle";
const STUDIO_OBJECT_PICKER_TOGGLE_IDS = [
  STUDIO_OBJECT_PICKER_TOGGLE_ID,
  STUDIO_OBJECT_TREE_PICKER_TOGGLE_ID,
];
const STUDIO_ARRANGE_TOGGLE_ID = "xstudio-arrange-toggle";
const STUDIO_OBJECT_TREE_ARRANGE_TOGGLE_ID = "xstudio-object-tree-arrange-toggle";
const STUDIO_ARRANGE_TOGGLE_IDS = [
  STUDIO_ARRANGE_TOGGLE_ID,
  STUDIO_OBJECT_TREE_ARRANGE_TOGGLE_ID,
];
const STUDIO_LEFT_RESIZE_DIVIDER_ID = "xstudio-left-resize-divider";
const STUDIO_APP_EXPLORER_PORTLET_ID = "xstudio-app-explorer-portlet";
const STUDIO_APP_EXPLORER_BODY_ID = "xstudio-app-explorer-body";
const STUDIO_APP_EXPLORER_RESULTS_ID = "xstudio-app-explorer-results";
const STUDIO_APP_EXPLORER_SECTION_TOGGLE_ID = "xstudio-app-explorer-section-toggle";
const STUDIO_APP_EXPLORER_ADD_VIEW_BUTTON_ID = "xstudio-app-explorer-add-view";
const STUDIO_APP_EXPLORER_ADD_BUTTON_ID = "xstudio-app-explorer-add";
const STUDIO_APP_EXPLORER_ADD_MENU_ID = "xstudio-app-explorer-add-menu";
const STUDIO_APP_EXPLORER_DATA_FEATURE_DRAWER_ID = "xstudio-data-feature-panel";
const STUDIO_APP_EXPLORER_DATA_FEATURE_BODY_ID = "xstudio-data-feature-body";
const STUDIO_APP_EXPLORER_DATA_FEATURE_FIELD_PREFIX = "xstudio-data-feature-field";
const STUDIO_APP_EXPLORER_DATA_FEATURE_NAME_ID = "xstudio-data-feature-name";
const STUDIO_APP_EXPLORER_DATA_FEATURE_ENTITY_ID = "xstudio-data-feature-entity-id";
const STUDIO_APP_EXPLORER_DATA_FEATURE_ERROR_ID = "xstudio-data-feature-error";
const STUDIO_APP_EXPLORER_DATA_FEATURE_CREATE_ID = "xstudio-data-feature-create";
const STUDIO_APP_EXPLORER_DATA_FEATURE_CANCEL_ID = "xstudio-data-feature-cancel";
const STUDIO_APP_EXPLORER_DATA_FEATURE_PREVIEW_ID = "xstudio-data-feature-preview";
const STUDIO_APP_EXPLORER_DATA_FEATURE_PROGRESS_ID = "xstudio-data-feature-progress";
const STUDIO_APP_EXPLORER_DATA_FEATURE_ASK_INPUT_ID = "xstudio-data-feature-ask-input";
const STUDIO_APP_EXPLORER_DATA_FEATURE_ASK_BUTTON_ID = "xstudio-data-feature-ask-button";
const STUDIO_APP_EXPLORER_DATA_FEATURE_ASK_STATUS_ID = "xstudio-data-feature-ask-status";
const STUDIO_APP_EXPLORER_DATA_FEATURE_ASK_MESSAGES_ID = "xstudio-data-feature-ask-messages";
const STUDIO_APP_EXPLORER_DATA_FEATURE_REVIEW_ID = "xstudio-data-feature-review";
const STUDIO_APP_EXPLORER_DATA_FEATURE_REPLACE_ID = "xstudio-data-feature-replace";
const STUDIO_APP_EXPLORER_DATA_FEATURE_MERGE_ID = "xstudio-data-feature-merge";
const STUDIO_APP_EXPLORER_DATA_FEATURE_CANCEL_SUGGESTION_ID = "xstudio-data-feature-cancel-suggestion";
const STUDIO_APP_EXPLORER_DATA_FEATURE_OPTION_PREFIX = "xstudio-data-feature-option";
const STUDIO_DATA_FEATURE_PROVIDER_AUTH_MESSAGE = "AI suggestions are unavailable because the configured provider could not authenticate.";
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
const STUDIO_SELECTED_OBJECT_INTERACTION_ADD_CLICK_ID = "xstudio-selected-object-interaction-add-click";
const STUDIO_SELECTED_OBJECT_INTERACTION_REMOVE_CLICK_ID = "xstudio-selected-object-interaction-remove-click";
const STUDIO_SELECTED_OBJECT_INTERACTION_VIEW_SELECT_ID = "xstudio-selected-object-interaction-view-select";
const STUDIO_SELECTED_OBJECT_INTERACTION_SAVE_ID = "xstudio-selected-object-interaction-save";
const STUDIO_SELECTED_OBJECT_INTERACTION_CANCEL_ID = "xstudio-selected-object-interaction-cancel";
const STUDIO_SELECTED_OBJECT_RAW_SECTION_ID = "xstudio-selected-object-raw-section";
const STUDIO_SELECTED_OBJECT_RAW_BODY_ID = "xstudio-selected-object-raw-body";
const STUDIO_SELECTED_OBJECT_RAW_SECTION_TOGGLE_ID = "xstudio-selected-object-raw-section-toggle";
const STUDIO_SELECTED_OBJECT_DANGER_SECTION_ID = "xstudio-selected-object-danger-section";
const STUDIO_SELECTED_OBJECT_DANGER_BODY_ID = "xstudio-selected-object-danger-body";
const STUDIO_SELECTED_OBJECT_DANGER_SECTION_TOGGLE_ID = "xstudio-selected-object-danger-section-toggle";
const STUDIO_SELECTED_OBJECT_ROW_CLASS = "xstudio-object-tree-row-selected";
const STUDIO_SELECTED_CANVAS_CLASS = "xstudio-selected-object";
const STUDIO_OBJECT_PICKER_ACTIVE_CLASS = "xstudio-object-picker-active";
const STUDIO_OBJECT_PICKER_TOGGLE_ACTIVE_CLASS = "xstudio-object-picker-toggle-active";
const STUDIO_OBJECT_PICKER_OVERLAY_ID = "xstudio-object-picker-overlay";
const STUDIO_OBJECT_PICKER_LABEL_ID = "xstudio-object-picker-label";
const STUDIO_ARRANGE_ACTIVE_CLASS = "xstudio-arrange-active";
const STUDIO_ARRANGE_TOGGLE_ACTIVE_CLASS = "xstudio-arrange-toggle-active";
const STUDIO_ARRANGE_OVERLAY_ID = "xstudio-arrange-overlay";
const STUDIO_ARRANGE_LABEL_ID = "xstudio-arrange-label";
const STUDIO_ARRANGE_INDICATOR_ID = "xstudio-arrange-indicator";
const STUDIO_ARRANGE_DRAG_THRESHOLD_PX = 5;
const STUDIO_ARRANGE_SCROLL_EDGE_PX = 42;
const STUDIO_ARRANGE_SCROLL_STEP_PX = 14;
const STUDIO_OBJECT_TREE_DRAG_EXPAND_DELAY_MS = 450;
const STUDIO_OBJECT_TREE_REVEAL_CLASS = "xstudio-object-tree-row-reveal";
const STUDIO_THEME_DEFAULT = "dark";
const STUDIO_THEME_SELECTOR_ID = "xstudio-theme-selector";
const STUDIO_THEME_CLASS_PREFIX = "xstudio-theme-";
const STUDIO_THEME_OPTIONS = ["terminal", "dark", "light"] as const;
const STUDIO_LEFT_SIDEBAR_WIDTH_STORAGE_KEY = "xstudio:left_sidebar_width";
const STUDIO_LEFT_SIDEBAR_DEFAULT_WIDTH = 300;
const STUDIO_LEFT_SIDEBAR_MIN_WIDTH = 240;
const STUDIO_LEFT_SIDEBAR_MAX_WIDTH_FALLBACK = 720;
const STUDIO_CANVAS_MIN_WIDTH = 360;
const STUDIO_RIGHT_SIDEBAR_WIDTH_FALLBACK = 500;
const STUDIO_RUNTIME_SECTION_ID = "xstudio-runtime-section";
const STUDIO_CONVERSATION_SECTION_ID = "xstudio-conversation-section";
const STUDIO_CONVERSATION_TITLE_ID = "xstudio-conversation-title";
const STUDIO_CONVERSATION_ACTIVE_TASK_HEADER_ID = "xstudio-conversation-active-task-header";
const STUDIO_CONVERSATION_ACTIVE_TASK_HEADER_TITLE_ID = "xstudio-conversation-active-task-header-title";
const STUDIO_CONVERSATION_ACTIVE_TASK_ID = "xstudio-conversation-active-task";
const STUDIO_CONVERSATION_ACTIVE_TASK_LABEL_ID = "xstudio-conversation-active-task-label";
const STUDIO_CONVERSATION_ACTIVE_TASK_TITLE_ID = "xstudio-conversation-active-task-title";
const STUDIO_CONVERSATION_ACTIVE_TASK_RETRY_ID = "xstudio-conversation-active-task-retry";
const STUDIO_CONVERSATION_ACTIVE_TASK_CANCEL_ID = "xstudio-conversation-active-task-cancel";
const STUDIO_CONVERSATION_SELECTOR_ID = "xstudio-conversation-selector";
const STUDIO_CONVERSATION_MESSAGES_ID = "xstudio-conversation-messages";
const STUDIO_CONVERSATION_INPUT_ID = "xstudio-conversation-input";
const STUDIO_CONVERSATION_SEND_BUTTON_ID = "xstudio-conversation-send-button";
const STUDIO_CONVERSATION_INPUT_XD_KEY = "studio:conversation_input";
const STUDIO_CONVERSATION_LAST_MESSAGES_LIMIT = 100;
const STUDIO_ANALYZE_MESSAGE_TIMEOUT_MS = 45000;
const STUDIO_ANALYZE_MESSAGE_TIMEOUT_TEXT = "Analysis took too long. Please retry.";
const STUDIO_CAPABILITY_GUIDANCE_PROMPT = "What can I do with Visual Xpell?";
const STUDIO_PLANNING_STAGE = "planning";
const STUDIO_PLANNING_GREETING_QUICK_STARTS: XStudioPlanningGreetingQuickStart[] = [
  {
    _id: "crm",
    _label: "CRM",
    _prompt: "I want to build a CRM",
    _send: true,
  },
  {
    _id: "inventory",
    _label: "Inventory",
    _prompt: "I want to build an inventory system",
    _send: true,
  },
  {
    _id: "dashboard",
    _label: "Dashboard",
    _prompt: "I want to build an operations dashboard",
    _send: true,
  },
  {
    _id: "music-playlist",
    _label: "Music playlist",
    _prompt: "I want to build a hospital music playlist app",
    _send: true,
  },
  {
    _id: "custom-app",
    _label: "Custom app",
    _prompt: "I want to build ",
    _send: false,
  },
];
const STUDIO_INTENT_ACTION_STATUS_SUGGESTED = "suggested";
const STUDIO_INTENT_ACTION_STATUS_DISMISSED = "dismissed";
const STUDIO_INTENT_ACTION_STATUS_RUNNING = "running";
const STUDIO_INTENT_ACTION_STATUS_DONE = "done";
const STUDIO_INTENT_ACTION_STATUS_FAILED = "failed";
const STUDIO_INTENT_ACTION_UNSUPPORTED_MESSAGE = "Execution not supported yet.";
const STUDIO_FIX_PROJECT_VIEWS_ACTION_TYPE = "fix-project-views";
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
  "set-style",
  "set-styles",
  "remove-style",
  "add-class",
  "remove-class",
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
type XStudioPortletId = "selected" | "prompt" | "conversation" | "guide" | "runtime" | "inspector" | "json" | "modules" | "data_feature";
type XStudioExplorerSectionId = "app_explorer" | "object_tree" | "properties" | "interactions" | "raw_json" | "danger";
type XStudioSelectedObjectInspectorSectionId = "properties" | "interactions" | "raw_json" | "danger";
type XStudioAppExplorerArtifactType = "view" | "flow" | "entity" | "module";
type XStudioAppExplorerCategoryId = "views" | "flows" | "entities" | "modules";
type XStudioAppExplorerSectionId = "app" | XStudioAppExplorerCategoryId;
type XStudioSidebarResizeDragState = {
  _start_x: number;
  _start_width: number;
  _pointer_id: number;
};
type XStudioPickerResolvedObject = {
  _id: string;
  _type: string;
  _element: HTMLElement;
  _object: any;
  _node: XStudioObjectTreeNode | null;
};

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
  guide: {
    _object_id: STUDIO_GUIDE_CARD_ID,
    _button_id: "xstudio-portlet-toggle-guide",
    _label: "Guide",
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
  data_feature: {
    _object_id: STUDIO_APP_EXPLORER_DATA_FEATURE_DRAWER_ID,
    _label: "Data Feature",
  },
};

const STUDIO_PORTLET_IDS = Object.keys(STUDIO_PORTLETS) as XStudioPortletId[];
const STUDIO_DEFAULT_PORTLET_VISIBILITY: Record<XStudioPortletId, boolean> = {
  selected: true,
  prompt: false,
  conversation: true,
  guide: false,
  runtime: false,
  inspector: false,
  json: false,
  modules: false,
  data_feature: false,
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
const STUDIO_DATA_FEATURE_FIELD_TYPES: XStudioDataFeatureFieldType[] = ["String", "Number", "Boolean", "Date"];
const STUDIO_DATA_FEATURE_OPTION_IDS: XStudioDataFeatureOptionId[] = [
  "entity",
  "list_view",
  "create_form",
  "create_flow",
  "update_flow",
  "delete_flow",
];
const STUDIO_DATA_FEATURE_DEFAULT_OPTIONS: Record<XStudioDataFeatureOptionId, boolean> = {
  entity: true,
  list_view: true,
  create_form: true,
  create_flow: true,
  update_flow: true,
  delete_flow: true,
};
const STUDIO_DATA_FEATURE_OPTION_LABELS: Record<XStudioDataFeatureOptionId, string> = {
  entity: "Entity",
  list_view: "List view",
  create_form: "Create form",
  create_flow: "Create flow",
  update_flow: "Update flow",
  delete_flow: "Delete flow",
};
const STUDIO_DATA_FEATURE_PROGRESS_STEPS: {
  _id: XStudioDataFeatureProgressStepId;
  _label: string;
}[] = [
  { _id: "entity", _label: "Creating entity" },
  { _id: "actions", _label: "Creating actions" },
  { _id: "form", _label: "Creating form" },
  { _id: "list", _label: "Creating list view" },
];
const STUDIO_SELECTED_OBJECT_EDITOR_ACTION_CONTROL_IDS = [
  STUDIO_SELECTED_OBJECT_SAVE_FIELDS_ID,
  STUDIO_SELECTED_OBJECT_CANCEL_FIELDS_ID,
  STUDIO_SELECTED_OBJECT_INTERACTION_SAVE_ID,
  STUDIO_SELECTED_OBJECT_INTERACTION_CANCEL_ID,
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
const PROJECT_MEMORY_XD_KEY = "project.memory";
const PROJECT_MEMORY_FOCUS_DRAFT_XD_KEY = "studio:guide_focus_draft";
const GUIDE_RECOMMENDATION_XD_KEY = "guide.recommendation";
const GUIDE_STATE_XD_KEY = "guide.state";
const GUIDE_ACTIVE_RECOMMENDATION_XD_KEY = "guide.active_recommendation";
const GUIDE_ACTIVE_RECOMMENDATION_STATUS_XD_KEY = "guide.active_recommendation_status";
const GUIDE_MATERIALIZATION_XD_KEY = "guide.materialization";
const GUIDE_MATERIALIZATION_ACTION_ID = "build-app";
const GUIDE_MATERIALIZATION_RESUME_TOKEN_PREFIX = "guide-materialize";
const GUIDE_MATERIALIZATION_STAGES = [
  { _id: "preparing-starter", _title: "Preparing starter" },
  { _id: "creating-data", _title: "Creating data" },
  { _id: "creating-screens", _title: "Creating screens" },
  { _id: "connecting-actions", _title: "Connecting actions" },
  { _id: "composing-main-experience", _title: "Composing main experience" },
  { _id: "validating-app", _title: "Validating app" },
  { _id: "final-verification", _title: "Final verification" },
] as const;

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
  isWormholeReady?(): boolean;
  isServerReady?(): boolean;
  sendXcmd(xcmd: any, timeoutMs?: number): Promise<any>;
};

type XStudioSendCommandOptions = {
  _timeout_ms?: number;
};

type XStudioConversationAnalysisRequest = {
  _request_id: number;
  _app_id: string;
  _env: string;
  _conversation_id: string;
  _message_id: string;
  _prompt_key: string;
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

type XStudioSelectedObjectClickInteractionKind = "none" | "navigate" | "custom";

type XStudioSelectedObjectClickInteractionDraft = {
  _kind: XStudioSelectedObjectClickInteractionKind;
  _view_id: string;
  _custom_json: string;
  _uses_legacy_view_id?: boolean;
};

type XStudioIntentActionLocalStatus =
  | typeof STUDIO_INTENT_ACTION_STATUS_DISMISSED
  | typeof STUDIO_INTENT_ACTION_STATUS_RUNNING
  | typeof STUDIO_INTENT_ACTION_STATUS_DONE
  | typeof STUDIO_INTENT_ACTION_STATUS_FAILED;

type XStudioGuideActiveRecommendationStatus =
  | "ready"
  | "running"
  | "adapting"
  | "completed"
  | "failed";

type XStudioGuideMaterializationStageStatus =
  | "pending"
  | "running"
  | "completed"
  | "skipped"
  | "failed";

type XStudioIntentActionParamsResult = {
  _ok: boolean;
  _error: string;
  _params: Record<string, any> | null;
};

type XStudioAppendConversationMessageOptions = {
  _analyze?: boolean;
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
  _interaction_scope?: "_on" | "_once";
  _trigger?: string;
  _handler?: Record<string, any> | null;
  _style_property?: string;
  _style_value?: string;
  _object_value?: Record<string, any>;
  _child?: Record<string, any>;
  _before_id?: string;
  _after_id?: string;
  _target_parent_id?: string;
  _move_position?: string;
};

type XStudioAddObjectInsertMode = "inside" | "before" | "after";
type XStudioArrangeDropMode = XStudioAddObjectInsertMode;

type XStudioArrangeSourceResolution =
  | {
    _ok: true;
    _id: string;
    _type: string;
    _resolved: XStudioPickerResolvedObject;
    _node: XStudioObjectTreeNode;
  }
  | {
    _ok: false;
    _reason: string;
    _message: string;
  };

type XStudioArrangeDropValidation =
  | {
    _ok: true;
    _mode: XStudioArrangeDropMode;
    _source_id: string;
    _source_type: string;
    _target_id: string;
    _source_view_id: string;
    _source_node: XStudioObjectTreeNode;
    _target_node: XStudioObjectTreeNode;
    _parent_node: XStudioObjectTreeNode;
    _parent_id: string;
    _before_id: string;
    _after_id: string;
  }
  | {
    _ok: false;
    _reason: string;
    _message: string;
  };

type XStudioArrangeDropPreview = {
  _target: XStudioPickerResolvedObject;
  _mode: XStudioArrangeDropMode;
  _validation: XStudioArrangeDropValidation;
};

type XStudioObjectTreeDragKind = "handle" | "row";

type XStudioAddObjectInsertionResolution =
  | {
    _ok: true;
    _mode: XStudioAddObjectInsertMode;
    _params: XStudioSelectedObjectApplyViewEditParams;
    _selected_id: string;
    _target_id: string;
  }
  | {
    _ok: false;
    _reason: string;
    _message: string;
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
type XStudioDataFeatureFieldType = "String" | "Number" | "Boolean" | "Date";
type XStudioDataFeatureProgressStepId = "entity" | "actions" | "form" | "list";
type XStudioDataFeatureStatus = "idle" | "running" | "failed" | "completed";
type XStudioDataFeatureSuggestionStatus = "idle" | "loading" | "failed" | "review";

type XStudioDataFeatureFieldDraft = {
  _key: string;
  _name: string;
  _field_id: string;
  _type: XStudioDataFeatureFieldType;
  _required: boolean;
  _default: string;
  _options: string;
  _field_id_touched: boolean;
};

type XStudioDataFeatureSuggestedField = {
  _name: string;
  _field_id: string;
  _type: XStudioDataFeatureFieldType;
  _required: boolean;
  _default?: unknown;
  _options?: unknown[];
};

type XStudioDataFeatureSuggestedDraft = {
  _feature_name: string;
  _entity_id: string;
  _fields: XStudioDataFeatureSuggestedField[];
  _generation_options: Partial<Record<XStudioDataFeatureOptionId, boolean>>;
  _assumptions: string[];
  _warnings: string[];
};

type XStudioDataFeatureState = {
  _open: boolean;
  _add_menu_open: boolean;
  _suggestion_prompt: string;
  _suggestion_status: XStudioDataFeatureSuggestionStatus;
  _suggestion_error: string;
  _suggestion_debug_details: string;
  _suggestion_assumptions: string[];
  _suggestion_warnings: string[];
  _suggestion_pending_draft: XStudioDataFeatureSuggestedDraft | null;
  _feature_name: string;
  _entity_id: string;
  _entity_id_touched: boolean;
  _fields: XStudioDataFeatureFieldDraft[];
  _options: Record<XStudioDataFeatureOptionId, boolean>;
  _status: XStudioDataFeatureStatus;
  _error: string;
  _progress: Record<XStudioDataFeatureProgressStepId, "pending" | "running" | "done" | "failed">;
  _created_artifacts: {
    _views: string[];
    _flows: string[];
    _entities: string[];
  };
};

type XStudioDataFeatureOptionId =
  | "entity"
  | "list_view"
  | "create_form"
  | "create_flow"
  | "update_flow"
  | "delete_flow";

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
const empty_selected_object_click_interaction_draft = (): XStudioSelectedObjectClickInteractionDraft => ({
  _kind: "none",
  _view_id: "",
  _custom_json: "",
  _uses_legacy_view_id: false,
});
const empty_data_feature_progress = (): XStudioDataFeatureState["_progress"] => ({
  entity: "pending",
  actions: "pending",
  form: "pending",
  list: "pending",
});
const create_data_feature_field = (key: string): XStudioDataFeatureFieldDraft => ({
  _key: key,
  _name: "",
  _field_id: "",
  _type: "String",
  _required: false,
  _default: "",
  _options: "",
  _field_id_touched: false,
});
const empty_data_feature_state = (): XStudioDataFeatureState => ({
  _open: false,
  _add_menu_open: false,
  _suggestion_prompt: "",
  _suggestion_status: "idle",
  _suggestion_error: "",
  _suggestion_debug_details: "",
  _suggestion_assumptions: [],
  _suggestion_warnings: [],
  _suggestion_pending_draft: null,
  _feature_name: "",
  _entity_id: "",
  _entity_id_touched: false,
  _fields: [create_data_feature_field("field-1")],
  _options: { ...STUDIO_DATA_FEATURE_DEFAULT_OPTIONS },
  _status: "idle",
  _error: "",
  _progress: empty_data_feature_progress(),
  _created_artifacts: {
    _views: [],
    _flows: [],
    _entities: [],
  },
});

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

const runtime_skill_string = (value: unknown, max = 360) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const runtime_skill_string_array = (value: unknown, max_items = 16, max_len = 96) => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const text = runtime_skill_string(item, max_len);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= max_items) break;
  }
  return out;
};

const runtime_skill_json_value = (value: unknown, depth = 0): any => {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return runtime_skill_string(value, 180);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    if (depth >= 2) return value.length > 0 ? `[${value.length} items]` : [];
    return value.slice(0, 8).map(item => runtime_skill_json_value(item, depth + 1));
  }
  if (is_obj(value)) {
    if (depth >= 2) return Object.keys(value).length > 0 ? "{...}" : {};
    const out: Record<string, any> = {};
    for (const key of Object.keys(value).slice(0, 16)) {
      const next = runtime_skill_json_value(value[key], depth + 1);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return undefined;
};

const runtime_skill_compact_field_value = (value: unknown) => {
  if (typeof value === "string") return runtime_skill_string(value, 220);
  if (!is_obj(value)) return runtime_skill_json_value(value);

  const out: Record<string, any> = {};
  for (const key of [
    "_key",
    "_label",
    "_input",
    "_description",
    "_placeholder",
    "_required",
    "_advanced",
    "_readonly",
  ]) {
    if (value[key] === undefined) continue;
    out[key] = typeof value[key] === "string"
      ? runtime_skill_string(value[key], 160)
      : runtime_skill_json_value(value[key]);
  }
  if (Array.isArray(value._options)) {
    out._options = runtime_skill_string_array(value._options, 12, 72);
  }
  return out;
};

const runtime_skill_compact_fields = (value: unknown) => {
  if (!is_obj(value)) return undefined;
  const out: Record<string, any> = {};
  const preferred = [
    "_type",
    "_children",
    "_data_source",
    "_data_output",
    "_update_data_source_event",
    "_items",
    "_rows",
    "_item",
    "_columns",
    "_row_key",
    "_empty_text",
    "_empty",
    "_actions",
    "_on",
    "_on_data",
    "_flow",
    "_flow_event",
  ];
  const keys = [
    ...preferred.filter(key => Object.prototype.hasOwnProperty.call(value, key)),
    ...Object.keys(value).filter(key => !preferred.includes(key)),
  ].slice(0, 32);
  for (const key of keys) {
    out[key] = runtime_skill_compact_field_value(value[key]);
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

const runtime_skill_compact_inspector_fields = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  const fields = value
    .slice(0, 16)
    .map(field => runtime_skill_compact_field_value(field))
    .filter(item => is_obj(item) && typeof item._key === "string");
  return fields.length > 0 ? fields : undefined;
};

const runtime_skill_compact_design = (value: unknown) => {
  if (!is_obj(value)) return undefined;
  const out: Record<string, any> = {};

  if (is_obj(value._palette)) {
    out._palette = {
      ...(typeof value._palette._title === "string"
        ? { _title: runtime_skill_string(value._palette._title, 120) }
        : {}),
      ...(typeof value._palette._category === "string"
        ? { _category: runtime_skill_string(value._palette._category, 120) }
        : {}),
      ...(typeof value._palette._icon === "string"
        ? { _icon: runtime_skill_string(value._palette._icon, 80) }
        : {}),
      ...(is_obj(value._palette._default_object)
        ? { _default_object: runtime_skill_json_value(value._palette._default_object) }
        : {}),
    };
  }

  if (is_obj(value._children)) {
    out._children = {
      ...(typeof value._children._allowed === "boolean"
        ? { _allowed: value._children._allowed }
        : {}),
      ...(Array.isArray(value._children._accepted_types)
        ? { _accepted_types: runtime_skill_string_array(value._children._accepted_types, 24, 80) }
        : {}),
      ...(Array.isArray(value._children._insert_modes)
        ? { _insert_modes: runtime_skill_string_array(value._children._insert_modes, 8, 40) }
        : {}),
    };
  }

  const inspector = is_obj(value._inspector) ? value._inspector : null;
  const inspector_fields = runtime_skill_compact_inspector_fields(inspector?._fields);
  if (inspector || inspector_fields) {
    out._inspector = {
      ...(Array.isArray(inspector?._sections)
        ? { _sections: runtime_skill_string_array(inspector?._sections, 8, 40) }
        : {}),
      ...(inspector_fields ? { _fields: inspector_fields } : {}),
    };
  }

  if (Array.isArray(value._actions)) {
    out._actions = value._actions.slice(0, 8).map(action => runtime_skill_json_value(action));
  }

  return Object.keys(out).length > 0 ? out : undefined;
};

const runtime_skill_compact_exports = (value: unknown, object_types: string[] = []) => {
  const source = is_obj(value) ? value : {};
  const xui_objects = runtime_skill_string_array([
    ...object_types,
    ...(Array.isArray(source._xui_objects) ? source._xui_objects : []),
  ], 48, 96);
  const modules = Array.isArray(source._modules)
    ? source._modules.slice(0, 16).map((module_item: any) => ({
      ...(typeof module_item?._name === "string"
        ? { _name: runtime_skill_string(module_item._name, 120) }
        : {}),
      ...(typeof module_item?._scope === "string"
        ? { _scope: runtime_skill_string(module_item._scope, 40) }
        : {}),
      ...(typeof module_item?._description === "string"
        ? { _description: runtime_skill_string(module_item._description, 240) }
        : {}),
      ...(Array.isArray(module_item?._ops)
        ? {
          _ops: module_item._ops.slice(0, 40).map((op: any) => ({
            ...(typeof op?._name === "string" ? { _name: runtime_skill_string(op._name, 120) } : {}),
            ...(typeof op?._scope === "string" ? { _scope: runtime_skill_string(op._scope, 40) } : {}),
            ...(typeof op?._description === "string"
              ? { _description: runtime_skill_string(op._description, 180) }
              : {}),
          })),
        }
        : {}),
    })).filter((item: any) => Object.keys(item).length > 0)
    : [];
  const out: Record<string, any> = {};
  if (xui_objects.length > 0) out._xui_objects = xui_objects;
  if (modules.length > 0) out._modules = modules;
  return Object.keys(out).length > 0 ? out : undefined;
};

const runtime_skill_compact_skill = (
  skill: unknown,
  object_types: string[] = [],
): XpellSkill | null => {
  if (!is_obj(skill)) return null;

  const id = runtime_skill_string(skill._id || object_types[0], 120);
  if (!id) return null;

  const xui_types = runtime_skill_string_array([
    ...object_types,
    skill._xtype,
    skill._xui_type,
    skill._object_type,
    skill._id,
    ...(Array.isArray(skill._xui_objects) ? skill._xui_objects : []),
    ...(Array.isArray(skill._exports?._xui_objects) ? skill._exports._xui_objects : []),
  ], 48, 96);

  const out: Record<string, any> = {
    _id: id,
  };

  for (const key of ["_name", "_title", "_version", "_type"] as const) {
    if (typeof skill[key] === "string" && skill[key].trim()) {
      out[key] = runtime_skill_string(skill[key], 160);
    }
  }
  if (typeof skill._active === "boolean") out._active = skill._active;
  if (xui_types.length > 0) {
    out._xtype = xui_types[0];
    out._xui_type = xui_types[0];
    out._object_type = xui_types[0];
  }
  if (typeof skill._description === "string") {
    out._description = runtime_skill_string(skill._description, 420);
  }

  const fields = runtime_skill_compact_fields(skill._fields);
  if (fields) out._fields = fields;

  if (is_obj(skill._match)) {
    const match: Record<string, any> = {};
    const match_source = skill._match as Record<string, any>;
    for (const key of ["_keywords", "_aliases", "_requires_any", "_requires_all", "_exclude_keywords"]) {
      if (Array.isArray(match_source[key])) {
        match[key] = runtime_skill_string_array(match_source[key], 24, 96);
      }
    }
    if (typeof match_source._priority === "number") match._priority = match_source._priority;
    if (Object.keys(match).length > 0) out._match = match;
  }

  for (const key of ["_aliases", "_keywords"] as const) {
    if (Array.isArray(skill[key])) out[key] = runtime_skill_string_array(skill[key], 24, 96);
  }

  const exports_value = runtime_skill_compact_exports(skill._exports, xui_types);
  if (exports_value) out._exports = exports_value;

  const design = runtime_skill_compact_design(skill._design);
  if (design) out._design = design;

  if (skill._capabilities !== undefined) {
    out._capabilities = runtime_skill_json_value(skill._capabilities);
  }

  for (const key of ["_core_rules", "_priority_rules", "_notes"] as const) {
    if (Array.isArray(skill[key])) out[key] = runtime_skill_string_array(skill[key], 8, 220);
  }

  if (Array.isArray(skill._canonical_examples) && skill._canonical_examples.length > 0) {
    out._canonical_examples = skill._canonical_examples
      .slice(0, 2)
      .map(item => runtime_skill_json_value(item));
  }

  return out as XpellSkill;
};

const runtime_skill_id = (skill: unknown) =>
  is_obj(skill) && typeof skill._id === "string" ? skill._id.trim() : "";

const runtime_skill_xui_types = (skill: unknown) => {
  if (!is_obj(skill)) return [];
  return runtime_skill_string_array([
    skill._xtype,
    skill._xui_type,
    skill._object_type,
    skill._id,
    ...(Array.isArray(skill._xui_objects) ? skill._xui_objects : []),
    ...(Array.isArray(skill._exports?._xui_objects) ? skill._exports._xui_objects : []),
  ], 48, 96);
};

const runtime_component_skill_records = () => {
  const records = new Map<string, { _skill: XpellSkill; _types: string[] }>();

  for (const { _name, _class } of object_palette_registered_classes()) {
    const raw_skill =
      typeof _class?.getOwnSkill === "function"
        ? _class.getOwnSkill()
        : _class?._skill;
    const raw_id = runtime_skill_id(raw_skill);
    const id = raw_id || runtime_skill_string(_class?._xtype || _name, 120);
    if (!id) continue;

    const existing = records.get(id);
    const types = runtime_skill_string_array([
      ...(existing?._types ?? []),
      _name,
      _class?._xtype,
      ...runtime_skill_xui_types(raw_skill),
    ], 64, 96);
    const compact = runtime_skill_compact_skill(raw_skill, types);
    if (!compact) continue;

    records.set(id, {
      _skill: compact,
      _types: types,
    });
  }

  return Array.from(records.values());
};

const runtime_skill_add_unique = (
  out: XpellSkill[],
  seen: Set<string>,
  skill: XpellSkill | null,
) => {
  const id = runtime_skill_id(skill);
  if (!id || seen.has(id)) return;
  seen.add(id);
  out.push(skill as XpellSkill);
};

const runtime_skill_compact_skill_array = (
  value: unknown,
  seen = new Set<string>(),
  object_types_by_id = new Map<string, string[]>(),
) => {
  const out: XpellSkill[] = [];
  if (!Array.isArray(value)) return out;

  for (const skill of value) {
    const id = runtime_skill_id(skill);
    const object_types = id ? object_types_by_id.get(id) ?? [] : [];
    runtime_skill_add_unique(out, seen, runtime_skill_compact_skill(skill, object_types));
  }

  return out;
};

const runtime_skill_compact_module = (
  module_item: unknown,
  component_records: Array<{ _skill: XpellSkill; _types: string[] }>,
) => {
  if (!is_obj(module_item)) return null;

  const name = runtime_skill_string(module_item._name, 120);
  if (!name) return null;

  const component_types_by_id = new Map(
    component_records.map(record => [record._skill._id, record._types]),
  );
  const skill_seen = new Set<string>();
  const object_seen = new Set<string>();
  const skills = runtime_skill_compact_skill_array(
    module_item._skills,
    skill_seen,
    component_types_by_id,
  );
  const objects: XpellSkill[] = [];

  if (name === "xui") {
    for (const record of component_records) {
      runtime_skill_add_unique(objects, object_seen, record._skill);
    }
  }
  for (const skill of runtime_skill_compact_skill_array(
    module_item._objects,
    object_seen,
    component_types_by_id,
  )) {
    objects.push(skill);
  }

  const out: Record<string, any> = { _name: name };
  if (skills.length > 0) out._skills = skills;
  if (objects.length > 0) out._objects = objects;
  return out;
};

const runtime_skill_compact_snapshot = (raw_snapshot: unknown) => {
  const component_records = runtime_component_skill_records();
  const component_types_by_id = new Map(
    component_records.map(record => [record._skill._id, record._types]),
  );
  const component_types = runtime_skill_string_array(
    component_records.flatMap(record => record._types),
    128,
    96,
  ).sort(object_palette_compare);
  const component_skills = component_records.map(record => record._skill);
  const raw = is_obj(raw_snapshot) ? raw_snapshot : {};
  const skill_seen = new Set<string>();
  const object_seen = new Set<string>();
  const module_seen = new Set<string>();
  const modules: Record<string, any>[] = [];
  const objects: XpellSkill[] = [];

  for (const skill of component_skills) {
    runtime_skill_add_unique(objects, object_seen, skill);
  }
  for (const skill of runtime_skill_compact_skill_array(raw._objects, object_seen, component_types_by_id)) {
    objects.push(skill);
  }

  if (Array.isArray(raw._modules)) {
    for (const module_item of raw._modules) {
      const compact_module = runtime_skill_compact_module(module_item, component_records);
      if (!compact_module?._name || module_seen.has(compact_module._name)) continue;
      module_seen.add(compact_module._name);
      modules.push(compact_module);
    }
  }

  if (!module_seen.has("xui") && component_skills.length > 0) {
    modules.push({
      _name: "xui",
      _objects: component_skills,
    });
  }

  const runtime_context: Record<string, any> = {
    ...(is_obj(raw._runtime) ? { _runtime: runtime_skill_json_value(raw._runtime) } : {}),
    _skills: runtime_skill_compact_skill_array(raw._skills, skill_seen, component_types_by_id),
    _objects: objects,
    _modules: modules,
  };

  if (typeof raw._synced_at === "string") runtime_context._synced_at = raw._synced_at;
  if (typeof raw._skills_count === "number") runtime_context._skills_count = raw._skills_count;

  return {
    _runtime_skills: runtime_context,
    _component_diagnostics: {
      _count: component_skills.length,
      _types: component_types,
    },
  };
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
  static _is_project_memory_apply_success(result: any) {
    if (!is_obj(result)) return false;
    if (result._ok === false) return false;
    if (is_obj(result._memory)) return true;
    if (is_obj(result._result) && is_obj(result._result._memory)) return true;
    return false;
  }

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
        _portlet: "Portlet id: prompt, conversation, guide, runtime, inspector, json, or modules."
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
  private _left_sidebar_width = STUDIO_LEFT_SIDEBAR_DEFAULT_WIDTH;
  private _left_sidebar_resize_bound = false;
  private _left_sidebar_resize_drag_state: XStudioSidebarResizeDragState | null = null;
  private _left_sidebar_resize_divider_dom: HTMLElement | null = null;
  private _left_sidebar_pointer_down_handler: ((event: any) => void) | null = null;
  private _left_sidebar_double_click_handler: ((event: any) => void) | null = null;
  private _left_sidebar_keydown_handler: ((event: KeyboardEvent) => void) | null = null;
  private _left_sidebar_move_handler: ((event: any) => void) | null = null;
  private _left_sidebar_up_handler: ((event: any) => void) | null = null;
  private _left_sidebar_window_resize_handler: (() => void) | null = null;
  private _shortcuts_registered = false;
  private _shortcut_keydown_handler: ((event: KeyboardEvent) => void) | null = null;
  private _object_picker_active = false;
  private _object_picker_canvas_dom: HTMLElement | null = null;
  private _object_picker_pointer_move_handler: ((event: PointerEvent) => void) | null = null;
  private _object_picker_pointer_leave_handler: ((event: PointerEvent) => void) | null = null;
  private _object_picker_pointer_down_handler: ((event: PointerEvent) => void) | null = null;
  private _object_picker_click_handler: ((event: MouseEvent) => void) | null = null;
  private _object_picker_hover: XStudioPickerResolvedObject | null = null;
  private _object_picker_overlay_dom: HTMLElement | null = null;
  private _object_picker_label_dom: HTMLElement | null = null;
  private _arrange_mode_active = false;
  private _arrange_canvas_dom: HTMLElement | null = null;
  private _arrange_pointer_down_handler: ((event: PointerEvent) => void) | null = null;
  private _arrange_pointer_move_handler: ((event: PointerEvent) => void) | null = null;
  private _arrange_pointer_up_handler: ((event: PointerEvent) => void) | null = null;
  private _arrange_pointer_cancel_handler: ((event: PointerEvent) => void) | null = null;
  private _arrange_pointer_leave_handler: ((event: PointerEvent) => void) | null = null;
  private _arrange_click_handler: ((event: MouseEvent) => void) | null = null;
  private _arrange_dblclick_handler: ((event: MouseEvent) => void) | null = null;
  private _arrange_contextmenu_handler: ((event: MouseEvent) => void) | null = null;
  private _arrange_drag_source: XStudioArrangeSourceResolution | null = null;
  private _arrange_hover: XStudioPickerResolvedObject | null = null;
  private _arrange_drop_preview: XStudioArrangeDropPreview | null = null;
  private _arrange_dragging = false;
  private _arrange_committing = false;
  private _arrange_start_x = 0;
  private _arrange_start_y = 0;
  private _arrange_last_x = 0;
  private _arrange_last_y = 0;
  private _arrange_pointer_id = -1;
  private _arrange_drag_app_id = "";
  private _arrange_drag_env = "";
  private _arrange_overlay_dom: HTMLElement | null = null;
  private _arrange_label_dom: HTMLElement | null = null;
  private _arrange_indicator_dom: HTMLElement | null = null;
  private _arrange_scroll_frame = 0;
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
  private _selected_object_click_interaction_original = empty_selected_object_click_interaction_draft();
  private _selected_object_click_interaction_draft = empty_selected_object_click_interaction_draft();
  private _selected_tree_row_id = "";
  private _selected_canvas_element: HTMLElement | null = null;
  private _object_tree_render_seq = 0;
  private _object_tree_nodes: XStudioObjectTreeNode[] = [];
  private _object_tree_search_query = "";
  private _object_tree_view_id = "";
  private _object_tree_expanded_node_keys = new Set<string>();
  private _object_tree_touched_expansion_node_keys = new Set<string>();
  private _object_tree_pending_duplicate: XStudioObjectTreeDuplicateTarget | null = null;
  private _object_tree_drag_source: XStudioArrangeSourceResolution | null = null;
  private _object_tree_drop_preview: XStudioArrangeDropPreview | null = null;
  private _object_tree_dragging = false;
  private _object_tree_drag_committing = false;
  private _object_tree_drag_start_kind: XStudioObjectTreeDragKind = "row";
  private _object_tree_drag_start_x = 0;
  private _object_tree_drag_start_y = 0;
  private _object_tree_drag_last_x = 0;
  private _object_tree_drag_last_y = 0;
  private _object_tree_drag_pointer_id = -1;
  private _object_tree_drag_app_id = "";
  private _object_tree_drag_env = "";
  private _object_tree_drag_source_row: HTMLElement | null = null;
  private _object_tree_drop_row: HTMLElement | null = null;
  private _object_tree_scroll_frame = 0;
  private _object_tree_expand_timer = 0;
  private _object_tree_expand_node_key = "";
  private _object_tree_pointer_move_handler: ((event: PointerEvent) => void) | null = null;
  private _object_tree_pointer_up_handler: ((event: PointerEvent) => void) | null = null;
  private _object_tree_pointer_cancel_handler: ((event: PointerEvent) => void) | null = null;
  private _object_tree_keydown_handler: ((event: KeyboardEvent) => void) | null = null;
  private _object_tree_click_suppress_handler: ((event: MouseEvent) => void) | null = null;
  private _object_tree_drag_suppress_click = false;
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
  private _data_feature_state: XStudioDataFeatureState = empty_data_feature_state();
  private _data_feature_field_seq = 1;
  private _data_feature_previous_portlet_visibility: Record<XStudioPortletId, boolean> | null = null;
  private _data_feature_initial_snapshot = "";
  private _data_feature_scope_key = "";
  private _app_explorer_recent_artifact_keys = new Set<string>();
  private _studio_theme: XStudioTheme = STUDIO_THEME_DEFAULT;
  private _conversation_messages: XStudioConversationMessage[] = [];
  private _conversation_transient_messages: XStudioConversationMessage[] = [];
  private _conversation_analyzing = false;
  private _conversation_analysis_seq = 0;
  private _active_conversation_analysis_request: XStudioConversationAnalysisRequest | null = null;
  private _timed_out_conversation_analysis_prompt_keys = new Set<string>();
  private _completed_conversation_analysis_prompt_keys: Record<string, string> = {};
  private _ignored_conversation_analysis_message_ids = new Set<string>();
  private _conversation_preserve_transient_load = false;
  private _conversation_app_id = "";
  private _conversation_env = "";
  private _conversation_id = "";
  private _conversation_list: XStudioConversationSummary[] = [];
  private _conversation_ready: Promise<void> | null = null;
  private _pending_app_explorer_refresh = false;
  private _pending_conversation_load = false;
  private _pending_project_memory_load = false;
  private _flushing_pending_server_ready = false;
  private _project_memory_loaded_scope = "";
  private _project_memory_loading_scope = "";
  private _conversation_action_status: Record<string, XStudioIntentActionLocalStatus> = {};
  private _conversation_action_error: Record<string, any> = {};
  private _conversation_action_result: Record<string, any> = {};
  private _guide_structured_action_running_key = "";
  private _project_plan_expanded: Record<string, boolean> = {};
  private _mutation_plan_collapsed: Record<string, boolean> = {};
  private _mutation_plan_execution_state: Record<string, XStudioMutationPlanExecutionState> = {};
  private _planning_question_multi_answers: Record<string, string[]> = {};
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
    this._left_sidebar_width = this._read_persisted_left_sidebar_width();
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

  private _server_ready() {
    if (typeof this._xvm_client?.isServerReady === "function") {
      return this._xvm_client.isServerReady() === true;
    }
    if (typeof this._xvm_client?.isWormholeReady === "function") {
      return this._xvm_client.isWormholeReady() === true;
    }
    return Wormholes._ready === true;
  }

  private _mark_pending_server_refresh(refresh: "app-explorer" | "conversation" | "both") {
    if (refresh === "app-explorer" || refresh === "both") this._pending_app_explorer_refresh = true;
    if (refresh === "conversation" || refresh === "both") this._pending_conversation_load = true;
  }

  private async _flush_pending_server_refreshes() {
    if (this._flushing_pending_server_ready || !this._server_ready()) return;
    if (
      !this._pending_app_explorer_refresh &&
      !this._pending_conversation_load &&
      !this._pending_project_memory_load
    ) return;

    this._flushing_pending_server_ready = true;
    const refresh_app_explorer = this._pending_app_explorer_refresh;
    const load_conversation = this._pending_conversation_load;
    const load_project_memory = this._pending_project_memory_load;
    this._pending_app_explorer_refresh = false;
    this._pending_conversation_load = false;
    this._pending_project_memory_load = false;

    try {
      if (refresh_app_explorer) await this._refresh_app_explorer();
      if (load_conversation) await this._ensure_conversation_for_current_context();
      if (load_project_memory) await this._load_project_memory_for_current_app("server-ready");
    } finally {
      this._flushing_pending_server_ready = false;
    }
  }

  private _project_memory_scope_key(app_id: string, env: string) {
    return `${env}::${app_id}`;
  }

  private _project_memory_should_skip_system_app(app_id: string) {
    if (app_id === "vibe-system") return true;

    const app = (this._xvm_client as any)?._app;
    if (!is_obj(app)) return false;

    return app._system === true || app._readonly === true;
  }

  private async _load_project_memory_for_current_app(
    reason: string,
    opts: {
      _force?: boolean;
    } = {}
  ) {
    let app_id = "";
    let env = "default";

    try {
      app_id = this._client().getActiveAppId();
      env = this._client().getActiveEnv() || "default";
    } catch (err) {
      this._pending_project_memory_load = true;
      this._log("project memory load deferred: missing client", {
        _reason: reason,
        _error: to_err(err),
      });
      return;
    }

    if (!app_id) {
      this._log("project memory load skipped: missing app id", {
        _reason: reason,
        _env: env,
      });
      return;
    }

    if (this._project_memory_should_skip_system_app(app_id)) {
      this._debug_log("project memory skipped for system app", {
        _reason: reason,
        _app_id: app_id,
        _env: env,
      });
      return;
    }

    const scope = this._project_memory_scope_key(app_id, env);

    if (this._project_memory_loading_scope === scope) {
      this._debug_log("project memory load skipped: already loading", {
        _reason: reason,
        _app_id: app_id,
        _env: env,
      });
      return;
    }

    if (!opts._force && this._project_memory_loaded_scope === scope) {
      this._debug_log("project memory load skipped: already loaded", {
        _reason: reason,
        _app_id: app_id,
        _env: env,
      });
      return;
    }

    if (!this._server_ready()) {
      this._pending_project_memory_load = true;
      this._log("project memory load deferred: server not ready", {
        _reason: reason,
        _app_id: app_id,
        _env: env,
      });
      return;
    }

    this._project_memory_loading_scope = scope;
    this._pending_project_memory_load = false;

    this._log("project memory load requested", {
      _reason: reason,
      _app_id: app_id,
      _env: env,
      _result_key: PROJECT_MEMORY_XD_KEY,
    });

    try {
      const result = await _x.execute({
        _module: "project-memory-client",
        _op: "get",
        _params: {
          _app_id: app_id,
          _env: env,
          _result_key: PROJECT_MEMORY_XD_KEY,
        },
      });

      if (is_obj(result) && result._ok === false) {
        this._error("project memory load failed", {
          _reason: reason,
          _app_id: app_id,
          _env: env,
          _error: result._error ?? result,
        });
        return;
      }

      const memory = _xd.get(PROJECT_MEMORY_XD_KEY);
      this._project_memory_loaded_scope = scope;
      this._render_project_memory_guide();
      this._render_conversation_messages();

      this._log("project memory loaded", {
        _reason: reason,
        _app_id: app_id,
        _env: env,
        _result_key: PROJECT_MEMORY_XD_KEY,
        _has_memory: is_obj(memory),
        _updated_at: is_obj(memory) ? memory._updated_at : undefined,
      });
      await this._load_guide_recommendation("project-memory-loaded");
    } catch (err) {
      this._error("project memory load failed", {
        _reason: reason,
        _app_id: app_id,
        _env: env,
        _error: to_err(err),
      });
    } finally {
      if (this._project_memory_loading_scope === scope) {
        this._project_memory_loading_scope = "";
      }
    }
  }

  private _project_memory_text(memory: any, key: string, fallback: string) {
    const value = is_obj(memory) ? memory[key] : undefined;
    return typeof value === "string" && value.trim()
      ? value.trim()
      : fallback;
  }

  private _project_memory_count(memory: any, key: string) {
    const value = is_obj(memory) ? memory[key] : undefined;
    return Array.isArray(value) ? value.length : 0;
  }

  private _project_memory_guide_status_text(memory: any) {
    return this._project_memory_guide_available(memory) ? "Ready to build" : "";
  }

  private _guide_normalized_text(value: any) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[_/.-]+/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private _project_memory_milestone_label(value: any) {
    const raw = is_obj(value)
      ? value._title ?? value.title ?? value._label ?? value.label ?? value._name ?? value.name ?? value._id ?? value.id
      : value;
    return typeof raw === "string" && raw.trim() ? raw.trim() : "";
  }

  private _normalize_project_memory_milestone(raw_milestone: any, index = 0) {
    if (!is_obj(raw_milestone)) return null;

    const title = this._project_memory_milestone_label(raw_milestone);
    const id = typeof raw_milestone._id === "string" && raw_milestone._id.trim()
      ? raw_milestone._id.trim()
      : typeof raw_milestone.id === "string" && raw_milestone.id.trim()
        ? raw_milestone.id.trim()
        : title || `milestone-${index}`;
    const raw_items = Array.isArray(raw_milestone._items)
      ? raw_milestone._items
      : Array.isArray(raw_milestone.items)
        ? raw_milestone.items
        : [];
    const items = raw_items
      .map((raw_item: any, item_index: number) => {
        if (!is_obj(raw_item)) return null;

        const item_title = this._project_memory_milestone_label(raw_item);
        const item_id = typeof raw_item._id === "string" && raw_item._id.trim()
          ? raw_item._id.trim()
          : typeof raw_item.id === "string" && raw_item.id.trim()
            ? raw_item.id.trim()
            : item_title || `${id}-item-${item_index}`;
        if (!item_title) return null;

        return {
          _id: item_id,
          _title: item_title,
          _completed:
            raw_item._completed === true ||
            raw_item.completed === true ||
            raw_item._status === "completed" ||
            raw_item.status === "completed",
        };
      })
      .filter((item: any) => item !== null);

    if (!id || !title || items.length === 0) return null;

    const progress = raw_milestone._progress ?? raw_milestone.progress;

    return {
      _id: id,
      _title: title,
      _items: items,
      ...(progress !== undefined ? { _progress: progress } : {}),
    };
  }

  private _project_memory_milestones(memory: any) {
    const raw_milestones = is_obj(memory) && Array.isArray(memory._milestones)
      ? memory._milestones
      : [];

    return raw_milestones
      .map((raw_milestone: any, index: number) =>
        this._normalize_project_memory_milestone(raw_milestone, index)
      )
      .filter((milestone: any) => milestone !== null);
  }

  private _project_memory_current_milestone(memory: any) {
    const focus = this._project_memory_text(memory, "_current_focus", "");
    const normalized_focus = this._guide_normalized_text(focus);
    if (!normalized_focus) return null;

    return this._project_memory_milestones(memory).find((milestone: any) =>
      this._guide_normalized_text(milestone._id) === normalized_focus ||
      this._guide_normalized_text(milestone._title) === normalized_focus
    ) ?? null;
  }

  private _project_memory_milestone_next_item(milestone: any) {
    return is_obj(milestone) && Array.isArray(milestone._items)
      ? milestone._items.find((item: any) => item?._completed !== true) ?? null
      : null;
  }

  private _project_memory_milestone_progress_text(milestone: any) {
    const progress = is_obj(milestone) ? milestone._progress ?? milestone.progress : undefined;
    if (typeof progress === "string" && progress.trim()) return progress.trim();
    if (is_obj(progress)) {
      const completed = typeof progress._completed === "number"
        ? progress._completed
        : typeof progress.completed === "number"
          ? progress.completed
          : undefined;
      const total = typeof progress._total === "number"
        ? progress._total
        : typeof progress.total === "number"
          ? progress.total
          : undefined;
      if (
        typeof completed === "number" &&
        Number.isFinite(completed) &&
        typeof total === "number" &&
        Number.isFinite(total)
      ) {
        return `${completed} / ${total} completed`;
      }
    }

    const items = is_obj(milestone) && Array.isArray(milestone._items)
      ? milestone._items
      : [];
    const completed = items.filter((item: any) => item?._completed === true).length;
    const total = items.length;
    return `${completed} / ${total} completed`;
  }

  private _project_memory_milestone_children(milestone: any) {
    const next_item = this._project_memory_milestone_next_item(milestone);
    const items = is_obj(milestone) && Array.isArray(milestone._items)
      ? milestone._items
      : [];

    return items.map((item: any, index: number) => ({
      _id: `xstudio-guide-milestone-item-${index}`,
      _type: "label",
      class: [
        "xstudio-guide-milestone-item",
        item._completed === true ? "xstudio-guide-milestone-item-complete" : "xstudio-guide-milestone-item-open",
        next_item && item._id === next_item._id ? "xstudio-guide-milestone-item-next" : "",
      ].filter(Boolean).join(" "),
      _text: `${item._completed === true ? "✓" : "□"} ${item._title}`,
    }));
  }

  private _guide_recommendation_matches_milestone_item(recommendation: any, item: any) {
    if (!recommendation || !item) return false;

    const item_title = this._guide_normalized_text(item._title);
    const item_id = this._guide_normalized_text(item._id);
    const recommendation_parts = [
      recommendation._title,
      recommendation._reason,
      recommendation._action?._prompt,
    ].map((part) => this._guide_normalized_text(part)).filter(Boolean);

    return recommendation_parts.some((part) =>
      part === item_title ||
      part === item_id ||
      part.includes(item_title) ||
      part.includes(item_id)
    );
  }

  private _guide_recommendation_title(recommendation: any, next_item: any) {
    if (typeof recommendation?._title === "string" && recommendation._title.trim()) {
      return recommendation._title.trim();
    }

    if (
      next_item &&
      this._guide_recommendation_matches_milestone_item(recommendation, next_item) &&
      typeof recommendation?._action?._prompt === "string" &&
      recommendation._action._prompt.trim()
    ) {
      return recommendation._action._prompt.trim().replace(/[.。]+$/u, "");
    }

    return "Next step";
  }

  private _guide_recommendation_dynamic_milestone(recommendation: any) {
    if (!is_obj(recommendation)) return null;

    const direct_milestone = [
      recommendation._milestone,
      recommendation.milestone,
      recommendation._current_milestone,
      recommendation.current_milestone,
      recommendation._guide_milestone,
      recommendation.guide_milestone,
    ].find((candidate) => is_obj(candidate));
    const normalized_direct =
      this._normalize_project_memory_milestone(direct_milestone, 0);
    if (normalized_direct) return normalized_direct;

    const raw_milestones = Array.isArray(recommendation._milestones)
      ? recommendation._milestones
      : Array.isArray(recommendation.milestones)
        ? recommendation.milestones
        : [];
    const normalized_milestones = raw_milestones
      .map((raw_milestone: any, index: number) =>
        this._normalize_project_memory_milestone(raw_milestone, index)
      )
      .filter((milestone: any) => milestone !== null);
    if (normalized_milestones.length > 0) return normalized_milestones[0];

    const raw_items = Array.isArray(recommendation._items)
      ? recommendation._items
      : Array.isArray(recommendation.items)
        ? recommendation.items
        : [];
    if (raw_items.length === 0) return null;

    return this._normalize_project_memory_milestone({
      _id: recommendation._milestone_id ?? recommendation.milestone_id ?? recommendation._type ?? "guide-milestone",
      _title:
        recommendation._milestone_title ??
        recommendation.milestone_title ??
        recommendation._focus ??
        recommendation.focus ??
        recommendation._title,
      _items: raw_items,
      ...(recommendation._progress !== undefined ? { _progress: recommendation._progress } : {}),
      ...(recommendation.progress !== undefined ? { progress: recommendation.progress } : {}),
    }, 0);
  }

  private _guide_current_milestone(memory: any, recommendation: any = null) {
    const stored_milestone = this._project_memory_current_milestone(memory);
    if (stored_milestone) return stored_milestone;

    return this._guide_recommendation_dynamic_milestone(recommendation);
  }

  private _guide_task_title(recommendation: any) {
    if (typeof recommendation?._action?._prompt === "string" && recommendation._action._prompt.trim()) {
      return recommendation._action._prompt.trim().replace(/[.。]+$/u, "");
    }

    if (typeof recommendation?._title === "string" && recommendation._title.trim()) {
      return recommendation._title.trim();
    }

    return "";
  }

  private _is_materialize_confirmed_plan_recommendation(recommendation: any) {
    if (!is_obj(recommendation)) return false;
    const action = is_obj(recommendation._action) ? recommendation._action : {};
    const command = this._intent_action_execution_payload(action);
    return is_obj(command) &&
      command._module === "xvibe" &&
      command._op === "materialize-confirmed-plan";
  }

  private _guide_materialization_status(value: any): XStudioGuideMaterializationStageStatus {
    const status = String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
    if (status === "running" || status === "in-progress" || status === "working") return "running";
    if (status === "completed" || status === "complete" || status === "done" || status === "success") return "completed";
    if (status === "skipped" || status === "skip") return "skipped";
    if (status === "failed" || status === "failure" || status === "error") return "failed";
    return "pending";
  }

  private _guide_materialization_default_stages(
    first_status: XStudioGuideMaterializationStageStatus = "pending",
  ) {
    return GUIDE_MATERIALIZATION_STAGES.map((stage, index) => ({
      _id: stage._id,
      _title: stage._title,
      _status: index === 0 ? first_status : ("pending" as XStudioGuideMaterializationStageStatus),
    }));
  }

  private _guide_materialization_result_source(result: any) {
    const parsed_error = this._guide_materialization_error_payload(result);
    if (!is_obj(result)) return null;
    return [
      parsed_error?._materialization,
      parsed_error?.materialization,
      parsed_error?._progress,
      parsed_error?.progress,
      parsed_error,
      result._materialization,
      result.materialization,
      result._result?._materialization,
      result._result?.materialization,
      result._progress,
      result.progress,
      result._result?._progress,
      result._result?.progress,
      result,
      result._result,
    ].find((candidate) => is_obj(candidate)) ?? null;
  }

  private _guide_materialization_error_payload(result: any) {
    const message = typeof result?.message === "string" ? result.message.trim() : "";
    if (!message || !message.startsWith("{")) return null;
    try {
      const parsed = JSON.parse(message);
      return is_obj(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private _guide_materialization_raw_stages(source: any) {
    if (!is_obj(source)) return [];
    const stages =
      source._stages ??
      source.stages ??
      source._stage_progress ??
      source.stage_progress ??
      source._progress_stages ??
      source.progress_stages;
    return Array.isArray(stages) ? stages : [];
  }

  private _guide_materialization_stage_title(raw_stage: any, fallback: string) {
    if (is_obj(raw_stage)) {
      return this._first_display_text(raw_stage, [
        "_title",
        "title",
        "_label",
        "label",
        "_name",
        "name",
        "_id",
        "id",
      ]) || fallback;
    }
    return fallback;
  }

  private _guide_materialization_stages_from_result(
    result: any,
    fallback_status: XStudioGuideMaterializationStageStatus,
  ) {
    const source = this._guide_materialization_result_source(result);
    const raw_stages = this._guide_materialization_raw_stages(source);
    const default_stages = this._guide_materialization_default_stages();

    if (raw_stages.length === 0) {
      if (fallback_status === "completed") {
        return default_stages.map((stage) => ({ ...stage, _status: "completed" as const }));
      }
      if (fallback_status === "failed") {
        return default_stages.map((stage, index) => ({
          ...stage,
          _status: index === 0 ? "failed" as const : "pending" as const,
        }));
      }
      return this._guide_materialization_default_stages(fallback_status);
    }

    return default_stages.map((stage, index) => {
      const raw_stage = raw_stages[index];
      if (!is_obj(raw_stage)) return stage;
      return {
        _id: typeof raw_stage._id === "string" && raw_stage._id.trim()
          ? raw_stage._id.trim()
          : typeof raw_stage.id === "string" && raw_stage.id.trim()
            ? raw_stage.id.trim()
            : stage._id,
        _title: this._guide_materialization_stage_title(raw_stage, stage._title),
        _status: this._guide_materialization_status(raw_stage._status ?? raw_stage.status),
        ...(typeof raw_stage._message === "string" && raw_stage._message.trim()
          ? { _message: raw_stage._message.trim() }
          : typeof raw_stage.message === "string" && raw_stage.message.trim()
            ? { _message: raw_stage.message.trim() }
            : {}),
      };
    });
  }

  private _guide_materialization_state() {
    const state = _xd.get(GUIDE_MATERIALIZATION_XD_KEY);
    return is_obj(state) ? state : null;
  }

  private _guide_materialization_safe_error(result: any, fallback = "Build failed. You can retry safely.") {
    const source = this._guide_materialization_result_source(result);
    const safe_sources = [
      source,
      this._guide_materialization_error_payload(result),
      result,
      result?._result,
    ].filter(is_obj);
    const safe_keys = [
      "_safe_error",
      "safe_error",
      "_safe_message",
      "safe_message",
      "_user_message",
      "user_message",
    ];
    for (const candidate of safe_sources) {
      const message = this._first_display_text(candidate, safe_keys);
      if (message) return message;
    }

    const generic_message = safe_sources
      .map((candidate) => this._first_display_text(candidate, ["_message", "message"]))
      .find((message) => message && !message.trim().startsWith("{"));
    return generic_message || fallback;
  }

  private _set_guide_materialization_state(state: Record<string, any>) {
    _xd.set(GUIDE_MATERIALIZATION_XD_KEY, state, {
      source: "xstudio-guide",
    });
    this._render_guide_recommendation();
  }

  private _guide_materialization_running_stages() {
    const current = this._guide_materialization_state();
    const stages = Array.isArray(current?._stages)
      ? current._stages
      : this._guide_materialization_default_stages();
    let running_assigned = false;

    return stages.map((stage: any, index: number) => {
      const status = this._guide_materialization_status(stage?._status ?? stage?.status);
      if (status === "completed" || status === "skipped") {
        return { ...stage, _status: status };
      }
      if (!running_assigned) {
        running_assigned = true;
        return { ...stage, _status: "running" as const };
      }
      return {
        ...stage,
        _status: "pending" as const,
      };
    });
  }

  private _guide_materialization_result_state(
    result: any,
    status: XStudioGuideActiveRecommendationStatus,
    params: Record<string, any>,
    action: XStudioIntentActionView,
    error = "",
  ) {
    const source = this._guide_materialization_result_source(result);
    const resume_token =
      (typeof params._resume_token === "string" ? params._resume_token : "") ||
      this._first_display_text(source ?? {}, ["_resume_token", "resume_token"]) ||
      this._first_display_text(result, ["_resume_token", "resume_token"]);
    return {
      ...(this._guide_materialization_state() ?? {}),
      _status: status,
      ...(resume_token ? { _resume_token: resume_token } : {}),
      _conversation_message_id: action._message_id,
      _conversation_action_id: action._id,
      _conversation_action_key: action._key,
      _stages: this._guide_materialization_stages_from_result(
        result,
        status === "completed" ? "completed" : status === "failed" ? "failed" : "running",
      ),
      ...(error ? { _error: error } : {}),
      ...(result !== undefined ? { _result: result } : {}),
    };
  }

  private _guide_materialization_resume_token(
    recommendation: Record<string, any>,
    action_id: string,
    message_id: string,
  ) {
    const existing =
      recommendation._resume_token ??
      recommendation.resume_token ??
      recommendation._action?._resume_token ??
      recommendation._action?.resume_token;
    if (typeof existing === "string" && existing.trim()) return existing.trim();

    let active_app_id = "";
    let active_env = "";
    try {
      active_app_id = this._client().getActiveAppId?.() || "";
      active_env = this._client().getActiveEnv?.() || "";
    } catch {
      active_app_id = "";
      active_env = "";
    }

    return [
      GUIDE_MATERIALIZATION_RESUME_TOKEN_PREFIX,
      this._conversation_app_id || active_app_id || "app",
      this._conversation_env || active_env || "default",
      this._conversation_id || "conversation",
      message_id || action_id || GUIDE_MATERIALIZATION_ACTION_ID,
    ].map((part) => _xu.normalize_id(String(part)) ?? "id").join(":");
  }

  private _guide_materialization_recommendation(memory: any) {
    if (!this._project_memory_guide_available(memory)) return null;

    let active_app_id = "";
    let active_env = "";
    try {
      active_app_id = this._client().getActiveAppId?.() || "";
      active_env = this._client().getActiveEnv?.() || "";
    } catch {
      active_app_id = "";
      active_env = "";
    }
    const app_id = this._conversation_app_id || active_app_id || "";
    const env = this._conversation_env || active_env || "";
    const materialization = this._guide_materialization_state();

    return {
      _id: GUIDE_MATERIALIZATION_ACTION_ID,
      _type: "materialization",
      _title: "Build app",
      _reason: "Build the confirmed plan into a runnable app.",
      ...(materialization ? { _materialization: materialization } : {}),
      ...(typeof materialization?._resume_token === "string" ? { _resume_token: materialization._resume_token } : {}),
      ...(typeof materialization?._conversation_message_id === "string"
        ? { _conversation_message_id: materialization._conversation_message_id }
        : {}),
      ...(typeof materialization?._conversation_action_id === "string"
        ? { _conversation_action_id: materialization._conversation_action_id }
        : {}),
      ...(typeof materialization?._conversation_action_key === "string"
        ? { _conversation_action_key: materialization._conversation_action_key }
        : {}),
      _action: {
        _id: GUIDE_MATERIALIZATION_ACTION_ID,
        _prompt: "Build app",
        _execution_payload: {
          _module: "xvibe",
          _op: "materialize-confirmed-plan",
          _params: {
            _app_id: app_id,
            _env: env,
            ...(typeof materialization?._resume_token === "string"
              ? { _resume_token: materialization._resume_token }
              : {}),
          },
        },
      },
    };
  }

  private _guide_lower_level_actions_visible() {
    const guide_state = this._normalize_guide_state(_xd.get(GUIDE_STATE_XD_KEY));
    return Boolean(
      guide_state?._advanced ||
      guide_state?._advanced_workflow ||
      guide_state?._manual_repair ||
      guide_state?._manual_repair_mode ||
      guide_state?._show_lower_level_actions,
    );
  }

  private _guide_recommendation_description(recommendation: any) {
    if (!is_obj(recommendation)) return "";
    return this._first_display_text(recommendation, [
      "_description",
      "description",
      "_reason",
      "reason",
      "_summary",
      "summary",
    ]);
  }

  private _guide_recommendation_focus_text(memory: any, milestone: any) {
    const focus = this._project_memory_text(memory, "_current_focus", "");
    if (!focus) return "No focus set";

    if (
      is_obj(milestone) &&
      (
        this._guide_normalized_text(milestone._id) === this._guide_normalized_text(focus) ||
        this._guide_normalized_text(milestone._title) === this._guide_normalized_text(focus)
      )
    ) {
      return milestone._title || focus;
    }

    return this._project_memory_achievement_label(focus);
  }

  private _guide_recommendation_status_text(
    active: any,
    status: XStudioGuideActiveRecommendationStatus | "",
  ) {
    if (!active) return "";
    if (this._is_materialize_confirmed_plan_recommendation(active)) {
      if (status === "failed") return "Build failed";
      if (status === "completed") return "Build complete";
      if (status === "ready") return "Ready";
      return "Building";
    }
    if (status === "failed") return "Failed · Retry available";
    if (status === "completed") return "Completed";
    if (status === "ready") return "Ready";
    if (status === "adapting") return "Adapting";
    return "Running";
  }

  private _guide_recommendation_action_text(
    active: any,
    status: XStudioGuideActiveRecommendationStatus | "",
  ) {
    if (active && this._is_materialize_confirmed_plan_recommendation(active)) {
      if (status === "failed") return "Retry build";
      if (status === "completed") return "Build complete";
      if (status === "ready") return "Build app";
      return "Building";
    }
    if (!active) return "Build this step";
    if (status === "failed") return "Retry";
    if (status === "completed") return "Completed";
    if (status === "ready") return "Build this step";
    return "Running";
  }

  private _guide_recommendation_action_title(
    active: any,
    status: XStudioGuideActiveRecommendationStatus | "",
  ) {
    if (active && this._is_materialize_confirmed_plan_recommendation(active)) {
      if (status === "failed") return "Retry app build";
      if (status === "completed") return "App build completed";
      if (status === "ready") return "Build app";
      return "App build is running";
    }
    if (!active) return "Start suggested task";
    if (status === "failed") return "Retry current task";
    if (status === "completed") return "Task completed";
    if (status === "ready") return "Start current task";
    return "Task is running";
  }

  private _guide_recommendation_action_disabled(
    active: any,
    status: XStudioGuideActiveRecommendationStatus | "",
    recommendation_blocker: string,
    prompt: string,
  ) {
    if (recommendation_blocker || !prompt) return true;
    if (!active) return false;
    return status !== "failed" && status !== "ready";
  }

  private _guide_materialization_display_state(
    recommendation: any,
    active: any,
    active_status: XStudioGuideActiveRecommendationStatus | "",
  ) {
    const state = is_obj(active?._materialization)
      ? this._guide_materialization_state() ?? active._materialization
      : this._guide_materialization_state() ??
        (is_obj(recommendation?._materialization) ? recommendation._materialization : null);
    const stage_status =
      active_status === "running" || active_status === "adapting"
        ? "running"
        : active_status === "completed"
          ? "completed"
          : active_status === "failed"
            ? "failed"
            : "pending";
    return {
      _status: active_status || String(state?._status ?? "pending"),
      _stages: Array.isArray(state?._stages)
        ? state._stages
        : this._guide_materialization_default_stages(stage_status),
      _error: typeof state?._error === "string" ? state._error : "",
    };
  }

  private _guide_materialization_stage_children(
    recommendation: any,
    active: any,
    active_status: XStudioGuideActiveRecommendationStatus | "",
  ) {
    if (!this._is_materialize_confirmed_plan_recommendation(active ?? recommendation)) return [];

    const state = this._guide_materialization_display_state(recommendation, active, active_status);
    return [{
      _type: "view",
      class: "xstudio-guide-materialization-progress",
      "aria-label": "Build app progress",
      _children: [
        {
          _type: "label",
          class: "xstudio-guide-recommendation-label",
          _text: "Build progress",
        },
        {
          _type: "view",
          class: "xstudio-guide-materialization-stages",
          _children: state._stages.map((stage: any, index: number) => {
            const status = this._guide_materialization_status(stage?._status ?? stage?.status);
            const title = typeof stage?._title === "string" && stage._title.trim()
              ? stage._title.trim()
              : GUIDE_MATERIALIZATION_STAGES[index]?._title ?? `Stage ${index + 1}`;
            return {
              _id: `xstudio-guide-materialization-stage-${index}`,
              _type: "view",
              class: [
                "xstudio-guide-materialization-stage",
                `xstudio-guide-materialization-stage-${status}`,
              ].join(" "),
              _children: [
                {
                  _type: "label",
                  class: "xstudio-guide-materialization-stage-title",
                  _text: title,
                },
                {
                  _type: "label",
                  class: "xstudio-guide-materialization-stage-status",
                  _text: status,
                },
              ],
            };
          }),
        },
        ...(state._error
          ? [{
            _type: "label",
            class: "xstudio-guide-materialization-error",
            _text: state._error,
          }]
          : []),
      ],
    }];
  }

  private _guide_recommendation_standard_children(options: {
    _memory: any;
    _display_recommendation: any;
    _active_recommendation: any;
    _active_status: XStudioGuideActiveRecommendationStatus | "";
    _milestone: any;
    _next_item: any;
    _recommendation_blocker: string;
    _recommendation_matches_milestone: boolean;
  }) {
    const active = options._active_recommendation;
    const display_recommendation = options._display_recommendation;
    const active_status = options._active_status;
    const recommendation_blocker = options._recommendation_blocker;
    const prompt = typeof display_recommendation?._action?._prompt === "string"
      ? display_recommendation._action._prompt.trim()
      : "";
    const status_text = this._guide_recommendation_status_text(active, active_status);
    const title = recommendation_blocker
      ? "No executable action available"
      : active
        ? this._guide_task_title(active)
        : this._guide_recommendation_title(display_recommendation, options._next_item);
    const description = recommendation_blocker ||
      this._guide_recommendation_description(display_recommendation);
    const progress = options._milestone
      ? this._project_memory_milestone_progress_text(options._milestone)
      : "";
    const focus = this._guide_recommendation_focus_text(options._memory, options._milestone);
    const label = active
      ? "Current task"
      : display_recommendation || recommendation_blocker
        ? "Recommended next"
        : "Next suggested step";
    const action_disabled = this._guide_recommendation_action_disabled(
      active,
      active_status,
      recommendation_blocker,
      prompt,
    );
    const materialization_recommendation =
      this._is_materialize_confirmed_plan_recommendation(display_recommendation);
    const action_text = materialization_recommendation && !active
      ? "Build app"
      : this._guide_recommendation_action_text(active, active_status);
    const action_title = materialization_recommendation && !active
      ? "Build app"
      : this._guide_recommendation_action_title(active, active_status);

    return [
      {
        _type: "view",
        class: [
          "xstudio-guide-recommendation-status-block",
          ...(!status_text ? ["xstudio-guide-recommendation-status-block-empty"] : []),
        ].join(" "),
        "aria-label": "Guide task status",
        _children: status_text
          ? [{
            _id: STUDIO_GUIDE_RECOMMENDATION_STATUS_ID,
            _type: "label",
            class: "xstudio-guide-recommendation-status",
            _text: status_text,
          }]
          : [],
      },
      {
        _type: "view",
        class: "xstudio-guide-recommendation-task-block",
        "aria-label": active ? "Current task" : "Recommended task",
        _children: [
          {
            _id: STUDIO_GUIDE_RECOMMENDATION_LABEL_ID,
            _type: "label",
            class: "xstudio-guide-recommendation-label",
            _text: label,
          },
          {
            _id: STUDIO_GUIDE_RECOMMENDATION_TITLE_ID,
            _type: "label",
            class: "xstudio-guide-recommendation-title",
            _text: title,
          },
        ],
      },
      ...(active
        ? [{
          _type: "view",
          class: "xstudio-guide-recommendation-focus-block",
          "aria-label": "Current focus",
          _children: [
            {
              _type: "label",
              class: "xstudio-guide-recommendation-label",
              _text: "Current focus",
            },
            {
              _id: STUDIO_GUIDE_RECOMMENDATION_FOCUS_ID,
              _type: "label",
              class: "xstudio-guide-recommendation-focus",
              _text: focus,
            },
          ],
        }]
        : []),
      {
        _type: "view",
        class: [
          "xstudio-guide-recommendation-description-block",
          ...(!description ? ["xstudio-guide-recommendation-description-block-empty"] : []),
        ].join(" "),
        "aria-label": "Task description",
        _children: description
          ? [{
            _id: STUDIO_GUIDE_RECOMMENDATION_REASON_ID,
            _type: "label",
            class: "xstudio-guide-recommendation-reason",
            _text: description,
          }]
          : [],
      },
      {
        _type: "view",
        class: [
          "xstudio-guide-recommendation-progress-block",
          ...(!progress ? ["xstudio-guide-recommendation-progress-block-empty"] : []),
        ].join(" "),
        "aria-label": "Guide progress",
        _children: progress
          ? [
            {
              _type: "label",
              class: "xstudio-guide-recommendation-label",
              _text: "Progress",
            },
            {
              _id: STUDIO_GUIDE_RECOMMENDATION_PROGRESS_ID,
              _type: "label",
              class: "xstudio-guide-recommendation-progress",
              _text: progress,
            },
          ]
          : [],
      },
      ...this._guide_materialization_stage_children(
        display_recommendation,
        active,
        active_status,
      ),
      {
        _type: "view",
        class: "xstudio-guide-recommendation-actions",
        "aria-label": "Guide task actions",
        _children: [
          {
            _id: STUDIO_GUIDE_RECOMMENDATION_DO_IT_ID,
            _type: "button",
            type: "button",
            class: "xstudio-guide-recommendation-do-it",
            _text: action_text,
            title: action_title,
            disabled: action_disabled,
            _on: {
              click: {
                _module: "xem",
                _op: "fire",
                _params: {
                  event: "studio:guide-recommendation-do-it",
                },
              },
            },
          },
          ...(active
            ? [{
              _id: STUDIO_GUIDE_RECOMMENDATION_CANCEL_ID,
              _type: "button",
              type: "button",
              class: "xstudio-guide-recommendation-cancel",
              _text: "Cancel",
              title: "Cancel current task",
              disabled: active_status === "completed",
              _on: {
                click: {
                  _module: "xem",
                  _op: "fire",
                  _params: {
                    event: "studio:guide-active-recommendation-cancel",
                  },
                },
              },
            }]
            : []),
        ],
      },
    ];
  }

  private _project_memory_achievement_label(value: any) {
    const raw = is_obj(value)
      ? value._title ?? value.title ?? value._label ?? value.label ?? value._name ?? value.name ?? value._id ?? value.id
      : value;
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) return "";

    const known: Record<string, string> = {
      first_focus_set: "First Focus Set",
      "first-focus-set": "First Focus Set",
      first_recommendation: "First Recommendation",
      "first-recommendation": "First Recommendation",
      first_suggested_action_applied: "First Suggested Action Applied",
      "first-suggested-action-applied": "First Suggested Action Applied",
    };
    if (known[text]) return known[text];

    return text
      .replace(/^achievement[:/_-]+/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private _project_memory_achievements(memory: any) {
    const achievements = is_obj(memory) && Array.isArray(memory._achievements)
      ? memory._achievements
      : [];
    return achievements
      .slice(-3)
      .map((item: any) => this._project_memory_achievement_label(item))
      .filter((item: string) => item.length > 0);
  }

  private _project_memory_achievement_children(memory: any) {
    return this._project_memory_achievements(memory).map((label, index) => ({
      _id: `xstudio-guide-achievement-${index}`,
      _type: "label",
      class: "xstudio-guide-achievement",
      _text: `✓ ${label}`,
    }));
  }

  private _project_memory_explicitly_confirmed(memory: any) {
    if (!is_obj(memory)) return false;

    return [
      memory._project_plan_confirmed,
      memory.project_plan_confirmed,
      memory._planning_confirmed,
      memory.planning_confirmed,
      memory._plan_confirmed,
      memory.plan_confirmed,
      memory._confirmed,
      memory.confirmed,
    ].some((value) => value === true || value === "true" || value === "confirmed");
  }

  private _conversation_has_confirmed_project_plan() {
    const messages = [
      ...this._conversation_messages,
      ...this._conversation_transient_messages,
    ];

    for (let index = 0; index < messages.length; index += 1) {
      const request = this._conversation_artifact_request(messages[index], index);
      if (!request || request._artifact_type !== PROJECT_PLAN_ARTIFACT_TYPE) continue;

      const local_status = this._conversation_action_status[request._key];
      const local_result = this._conversation_action_result[request._key];
      if (
        local_status === STUDIO_INTENT_ACTION_STATUS_DONE ||
        request._status === STUDIO_INTENT_ACTION_STATUS_DONE ||
        local_result === "Plan confirmed."
      ) {
        return true;
      }
    }

    return false;
  }

  private _project_memory_guide_available(memory: any) {
    return this._project_memory_explicitly_confirmed(memory) ||
      this._conversation_has_confirmed_project_plan();
  }

  private _project_memory_guide_has_content(memory: any, display_recommendation: any) {
    const milestone = this._guide_current_milestone(memory, display_recommendation);
    const blocker = display_recommendation
      ? ""
      : this._guide_recommendation_blocker_text(
        memory,
        milestone,
        this._project_memory_milestone_next_item(milestone),
      );
    return Boolean(milestone) ||
      this._project_memory_achievements(memory).length > 0 ||
      Boolean(display_recommendation) ||
      Boolean(blocker);
  }

  private _project_memory_guide_empty_action_children(memory: any, display_recommendation: any) {
    const has_content = this._project_memory_guide_has_content(memory, display_recommendation);
    return {
      _id: STUDIO_GUIDE_EMPTY_ACTION_ID,
      _type: "view",
      class: [
        "xstudio-guide-empty-action",
        ...(has_content ? ["xstudio-guide-empty-action-hidden"] : []),
      ].join(" "),
      _children: has_content ? [] : [
        {
          _type: "label",
          class: "xstudio-guide-empty-action-text",
          _text: "No executable build action is available for the current guide focus.",
        },
      ],
    };
  }

  private _guide_recommendation_action_key(recommendation: any, index: number) {
    const title = this._first_display_text(recommendation, ["_title", "title"]) ||
      this._first_display_text(this._recommendation_action_source(recommendation), [
        "_title",
        "title",
        "_label",
        "label",
        "_prompt",
        "prompt",
      ]);
    const normalized_title = _xu.normalize_id(title) ?? "crud";
    let app_id = "app";
    let env = "default";
    try {
      app_id = this._client().getActiveAppId() || app_id;
      env = this._client().getActiveEnv() || env;
    } catch {
      // The guide can be rendered in isolated tests before a client is mounted.
    }
    return [
      "guide-recommendation",
      app_id,
      env,
      normalized_title,
      String(index),
    ].join("::");
  }

  private _guide_crud_recommendation_action_view(
    recommendation: any,
    index: number,
    total: number,
    active_status: XStudioGuideActiveRecommendationStatus | "" = "",
  ) {
    if (!is_obj(recommendation) || !this._is_crud_recommendation(recommendation)) return null;

    const normalized_action = this._normalize_conversation_intent_action(
      this._normalize_crud_recommendation_action(recommendation, index, total),
    );
    if (!is_obj(normalized_action)) return null;

    const action_key = this._guide_recommendation_action_key(recommendation, index);
    const source_status = this._intent_action_text(
      normalized_action,
      "status",
      STUDIO_INTENT_ACTION_STATUS_SUGGESTED,
    );
    const local_status = this._conversation_action_status[action_key] ??
      (active_status === "failed"
        ? STUDIO_INTENT_ACTION_STATUS_FAILED
        : active_status === "running"
          ? STUDIO_INTENT_ACTION_STATUS_RUNNING
          : source_status);
    const source_error =
      this._intent_action_text(normalized_action, "error") ||
      this._intent_action_text(normalized_action, "reason");
    const visible_source_error =
      normalized_action._executable === false || local_status === STUDIO_INTENT_ACTION_STATUS_FAILED
        ? source_error
        : "";
    const action: XStudioIntentActionView = {
      _key: action_key,
      _render_key: action_key,
      _id: "",
      _message_id: "",
      _action_index: index,
      _title: this._intent_action_text(normalized_action, "title", "Build CRUD foundation"),
      _description: this._intent_action_text(normalized_action, "description"),
      _action_type: this._intent_action_text(normalized_action, "action_type", "crud-recommendation"),
      _confidence: this._intent_action_text(normalized_action, "confidence"),
      _status: local_status,
      ...(typeof normalized_action._executable === "boolean"
        ? { _executable: normalized_action._executable }
        : {}),
      _has_execution_payload: normalized_action._has_execution_payload === true,
      _execution_payload_error:
        this._intent_action_text(normalized_action, "execution_payload_error"),
      _execution_payload: is_obj(normalized_action._execution_payload)
        ? { ...normalized_action._execution_payload }
        : null,
      ...(typeof normalized_action._requires_approval === "boolean"
        ? { _requires_approval: normalized_action._requires_approval }
        : {}),
      _params: is_obj(normalized_action._params) ? { ...normalized_action._params } : null,
      _result: this._conversation_action_result[action_key] ??
        normalized_action._result ??
        normalized_action.result,
      _error: this._conversation_action_error[action_key] || visible_source_error,
      _recommendation_kind: "crud",
      _recommendation_badge: this._intent_action_text(normalized_action, "recommendation_badge"),
      _recommendation_order: this._intent_action_text(normalized_action, "recommendation_order"),
      _recommendation_dependency: this._intent_action_text(normalized_action, "recommendation_dependency"),
      _recommendation_entity_name: this._intent_action_text(normalized_action, "recommendation_entity_name"),
      _recommendation_expected_artifacts: Array.isArray(normalized_action._recommendation_expected_artifacts)
        ? normalized_action._recommendation_expected_artifacts.filter((item: any) =>
          typeof item === "string" && item.trim()
        )
        : [],
      _recommendation_button_label: this._intent_action_text(normalized_action, "recommendation_button_label"),
      _recommendation_debug: normalized_action._recommendation_debug,
      ...(typeof normalized_action._recommended === "boolean"
        ? { _recommended: normalized_action._recommended }
        : {}),
    };

    return {
      ...action,
      _execute_state: this._intent_action_card_execute_state(action),
    };
  }

  private _guide_crud_recommendation_cards(
    recommendations: any[],
    active_status: XStudioGuideActiveRecommendationStatus | "" = "",
  ) {
    const crud_recommendations = recommendations
      .filter((recommendation) => this._is_crud_recommendation(recommendation));
    return crud_recommendations
      .map((recommendation, index) =>
        this._guide_crud_recommendation_action_view(
          recommendation,
          index,
          crud_recommendations.length,
          active_status,
        )
      )
      .filter((action): action is NonNullable<ReturnType<typeof this._guide_crud_recommendation_action_view>> =>
        action !== null
      )
      .map((action, index) =>
        create_xstudio_crud_recommendation_card(action, {
          _id_suffix: `guide-${index}`,
          _surface: "guide",
        })
      );
  }

  private _starter_adaptation_type_text(recommendation: any) {
    if (!is_obj(recommendation)) return "";

    const action = this._recommendation_action_source(recommendation);
    return [
      this._first_display_text(recommendation, [
        "_recommendation_type",
        "recommendation_type",
        "_semantic_type",
        "semantic_type",
        "_type",
        "type",
        "_kind",
        "kind",
        "_capability",
        "capability",
      ]),
      this._first_display_text(action, [
        "_recommendation_type",
        "recommendation_type",
        "_semantic_type",
        "semantic_type",
        "_type",
        "type",
        "_kind",
        "kind",
        "_action_type",
        "action_type",
        "_capability",
        "capability",
      ]),
    ].filter(Boolean).join(" ").toLowerCase().replace(/_/g, "-");
  }

  private _starter_adaptation_source(recommendation: any) {
    if (!is_obj(recommendation)) return null;

    const action = this._recommendation_action_source(recommendation);
    const candidates = [
      recommendation._starter_adaptation,
      recommendation.starter_adaptation,
      recommendation._adaptation,
      recommendation.adaptation,
      recommendation._change_summary,
      recommendation.change_summary,
      action._starter_adaptation,
      action.starter_adaptation,
      action._adaptation,
      action.adaptation,
      action._change_summary,
      action.change_summary,
    ];

    return candidates.find((candidate) => is_obj(candidate) || Array.isArray(candidate)) ?? null;
  }

  private _starter_adaptation_visible_label(value: any) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (!is_obj(value)) return "";

    return this._first_display_text(value, [
      "_title",
      "title",
      "_label",
      "label",
      "_name",
      "name",
      "_text",
      "text",
      "_description",
      "description",
    ]);
  }

  private _starter_adaptation_summary_values(source: any, keys: string[]) {
    if (!is_obj(source)) return [];

    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) return value;
      if (typeof value === "string" && value.trim()) return value.split(/\r?\n|,/);
    }

    return [];
  }

  private _starter_adaptation_summary_items(source: any, kind: "preserve" | "replace" | "add") {
    const key_map: Record<"preserve" | "replace" | "add", string[]> = {
      preserve: [
        "_preserve",
        "preserve",
        "_preserved",
        "preserved",
        "_kept",
        "kept",
      ],
      replace: [
        "_replace",
        "replace",
        "_replaced",
        "replaced",
        "_remove",
        "remove",
      ],
      add: [
        "_add",
        "add",
        "_added",
        "added",
        "_build",
        "build",
        "_build_next",
        "build_next",
      ],
    };

    const values = Array.isArray(source)
      ? source.filter((item) => {
        if (!is_obj(item)) return false;
        const item_kind = this._first_display_text(item, [
          "_kind",
          "kind",
          "_type",
          "type",
          "_section",
          "section",
          "_change",
          "change",
        ]).toLowerCase().replace(/_/g, "-");
        return item_kind === kind ||
          item_kind === `${kind}-item` ||
          (kind === "preserve" && item_kind === "keep");
      })
      : this._starter_adaptation_summary_values(source, key_map[kind]);

    return values
      .map((item) => this._starter_adaptation_visible_label(item).replace(/^\s*[-*•]\s*/, "").trim())
      .filter((item) => item.length > 0);
  }

  private _starter_adaptation_summary(recommendation: any) {
    const source = this._starter_adaptation_source(recommendation);
    if (!source) {
      return {
        _preserve: [],
        _replace: [],
        _add: [],
      };
    }

    return {
      _preserve: this._starter_adaptation_summary_items(source, "preserve"),
      _replace: this._starter_adaptation_summary_items(source, "replace"),
      _add: this._starter_adaptation_summary_items(source, "add"),
    };
  }

  private _starter_adaptation_summary_has_items(summary: {
    _preserve: string[];
    _replace: string[];
    _add: string[];
  }) {
    return summary._preserve.length > 0 ||
      summary._replace.length > 0 ||
      summary._add.length > 0;
  }

  private _is_starter_adaptation_recommendation(recommendation: any) {
    if (!is_obj(recommendation)) return false;

    const type_text = this._starter_adaptation_type_text(recommendation);
    const semantic_type_matches =
      /\bstarter[-\s]*(adapt|adaptation)\b/.test(type_text) ||
      /\badapt[-\s]*starter\b/.test(type_text);
    if (!semantic_type_matches) return false;

    return this._starter_adaptation_summary_has_items(
      this._starter_adaptation_summary(recommendation),
    );
  }

  private _starter_adaptation_description(recommendation: any) {
    return this._first_display_text(recommendation, [
      "_description",
      "description",
      "_reason",
      "reason",
      "_summary",
      "summary",
    ]);
  }

  private _starter_adaptation_status_label(active: any, status: XStudioGuideActiveRecommendationStatus | "") {
    if (!active) return "Ready";
    if (status === "failed") return "Failed · Retry available";
    if (status === "completed") return "Completed";
    return "Adapting";
  }

  private _starter_adaptation_action_label(active: any, status: XStudioGuideActiveRecommendationStatus | "") {
    if (!active) return "Adapt starter";
    if (status === "failed") return "Retry";
    if (status === "completed") return "Completed";
    return "Adapting";
  }

  private _starter_adaptation_summary_section(title: string, items: string[], id_suffix: string) {
    return {
      _type: "view",
      class: [
        "xstudio-guide-starter-adaptation-summary-section",
        ...(items.length === 0 ? ["xstudio-guide-starter-adaptation-summary-section-empty"] : []),
      ].join(" "),
      _children: [
        {
          _type: "label",
          class: "xstudio-guide-starter-adaptation-summary-title",
          _text: title,
        },
        {
          _type: "view",
          class: "xstudio-guide-starter-adaptation-summary-list",
          _children: items.map((item, index) => ({
            _id: `xstudio-guide-starter-adaptation-${id_suffix}-${index}`,
            _type: "label",
            class: "xstudio-guide-starter-adaptation-summary-item",
            _text: item,
          })),
        },
      ],
    };
  }

  private _starter_adaptation_debug_text(recommendation: any) {
    try {
      return JSON.stringify(
        {
          _recommendation: recommendation,
          _starter_adaptation: this._starter_adaptation_source(recommendation),
        },
        null,
        2,
      );
    } catch {
      return "Starter adaptation metadata could not be serialized.";
    }
  }

  private _guide_starter_adaptation_card(
    recommendation: any,
    active: any,
    active_status: XStudioGuideActiveRecommendationStatus | "" = "",
  ) {
    const summary = this._starter_adaptation_summary(recommendation);
    const prompt = typeof recommendation?._action?._prompt === "string"
      ? recommendation._action._prompt.trim()
      : "";
    const disabled = Boolean(active && active_status !== "failed") || !prompt;

    return {
      _id: "xstudio-guide-starter-adaptation-card",
      _type: "view",
      class: [
        "xstudio-guide-starter-adaptation-card",
        ...(active ? ["xstudio-guide-starter-adaptation-card-active"] : []),
        ...(active_status === "failed" ? ["xstudio-guide-starter-adaptation-card-failed"] : []),
        ...(active_status === "completed" ? ["xstudio-guide-starter-adaptation-card-completed"] : []),
      ].join(" "),
      _children: [
        {
          _type: "view",
          class: "xstudio-guide-starter-adaptation-heading",
          _children: [
            {
              _id: STUDIO_GUIDE_RECOMMENDATION_LABEL_ID,
              _type: "label",
              class: "xstudio-guide-recommendation-label",
              _text: "Recommended next",
            },
            {
              _id: STUDIO_GUIDE_STARTER_ADAPTATION_STATUS_ID,
              _type: "label",
              class: "xstudio-guide-starter-adaptation-status",
              _text: this._starter_adaptation_status_label(active, active_status),
            },
          ],
        },
        {
          _id: STUDIO_GUIDE_RECOMMENDATION_TITLE_ID,
          _type: "label",
          class: "xstudio-guide-recommendation-title xstudio-guide-starter-adaptation-title",
          _text: recommendation?._title || "Adapt selected starter",
        },
        {
          _id: STUDIO_GUIDE_RECOMMENDATION_REASON_ID,
          _type: "label",
          class: "xstudio-guide-recommendation-reason xstudio-guide-starter-adaptation-description",
          _text: this._starter_adaptation_description(recommendation),
        },
        {
          _type: "view",
          class: "xstudio-guide-starter-adaptation-summary",
          _children: [
            this._starter_adaptation_summary_section("Preserve", summary._preserve, "preserve"),
            this._starter_adaptation_summary_section("Replace", summary._replace, "replace"),
            this._starter_adaptation_summary_section("Add", summary._add, "add"),
          ],
        },
        {
          _id: STUDIO_GUIDE_RECOMMENDATION_DO_IT_ID,
          _type: "button",
          type: "button",
          class: "xstudio-guide-recommendation-do-it xstudio-guide-starter-adaptation-do-it",
          _text: this._starter_adaptation_action_label(active, active_status),
          title: active
            ? active_status === "failed"
              ? "Retry starter adaptation"
              : active_status === "completed"
                ? "Starter adaptation completed"
                : "Starter adaptation is in progress"
            : "Adapt selected starter",
          disabled,
          _on: {
            click: {
              _module: "xem",
              _op: "fire",
              _params: {
                event: "studio:guide-recommendation-do-it",
              },
            },
          },
        },
        {
          _type: "xhtml",
          _html_tag: "details",
          class: "xstudio-guide-starter-adaptation-debug",
          _children: [
            {
              _type: "xhtml",
              _html_tag: "summary",
              class: "xstudio-guide-starter-adaptation-debug-summary",
              _text: "Technical details",
            },
            {
              _type: "label",
              class: "xstudio-guide-starter-adaptation-debug-payload debug-payload",
              _text: this._starter_adaptation_debug_text(recommendation),
            },
          ],
        },
      ],
    };
  }

  private _project_memory_guide_unavailable_children() {
    return [
      {
        _id: STUDIO_GUIDE_UNAVAILABLE_ID,
        _type: "label",
        class: "xstudio-guide-unavailable",
        _text: "Complete and confirm the project plan to begin building.",
      },
      {
        _id: STUDIO_GUIDE_UNAVAILABLE_DETAIL_ID,
        _type: "label",
        class: "xstudio-guide-unavailable-detail",
        _text: "Your build steps will appear here once the plan is ready.",
      },
    ];
  }

  private _project_memory_guide_available_children(memory: any) {
    const focus = this._project_memory_text(memory, "_current_focus", "");
    const recommendations = this._normalize_guide_recommendations(
      _xd.get(GUIDE_RECOMMENDATION_XD_KEY),
    );
    const recommendation = recommendations[0] ?? null;
    const active_recommendation = this._active_guide_recommendation();
    const active_status = this._active_guide_recommendation_status();
    const show_lower_level_mode = this._guide_lower_level_actions_visible();
    const materialization_recommendation = show_lower_level_mode
      ? null
      : this._guide_materialization_recommendation(memory);
    const display_recommendation = active_recommendation ?? materialization_recommendation ?? recommendation;
    const materialization_primary_visible =
      Boolean(materialization_recommendation) &&
      (!active_recommendation || this._is_materialize_confirmed_plan_recommendation(active_recommendation));
    const display_recommendations = active_recommendation
      ? [active_recommendation]
      : materialization_recommendation
        ? [materialization_recommendation]
        : recommendations;
    const show_lower_level_guide_cards =
      !materialization_recommendation ||
      Boolean(active_recommendation && !this._is_materialize_confirmed_plan_recommendation(active_recommendation));
    const crud_recommendation_cards = show_lower_level_guide_cards
      ? this._guide_crud_recommendation_cards(
        display_recommendations,
        active_recommendation ? active_status : "",
      )
      : [];
    const starter_adaptation_card = display_recommendation &&
      this._is_starter_adaptation_recommendation(display_recommendation)
      ? this._guide_starter_adaptation_card(
        display_recommendation,
        active_recommendation,
        active_recommendation ? active_status : "",
      )
      : null;
    const milestone = materialization_primary_visible
      ? null
      : this._guide_current_milestone(memory, display_recommendation);
    const milestone_children = this._project_memory_milestone_children(milestone);
    const achievement_children = this._project_memory_achievement_children(memory);
    const recommendation_matches_milestone = this._guide_recommendation_matches_milestone_item(
      display_recommendation,
      this._project_memory_milestone_next_item(milestone),
    );
    const next_item = this._project_memory_milestone_next_item(milestone);
    const recommendation_blocker = display_recommendation
      ? ""
      : this._guide_recommendation_blocker_text(memory, milestone, next_item);

    return [
      {
        _id: STUDIO_GUIDE_READY_MESSAGE_ID,
        _type: "label",
        class: "xstudio-guide-message",
        _text: "Your app plan is confirmed and ready to start.",
      },
      this._project_memory_guide_empty_action_children(memory, display_recommendation),
      {
        _id: STUDIO_GUIDE_GOAL_ID,
        _type: "label",
        class: "xstudio-guide-line",
        _text: `Goal: ${this._project_memory_text(memory, "_goal", "No goal set")}`,
      },
      {
        _id: STUDIO_GUIDE_FOCUS_ID,
        _type: "label",
        class: "xstudio-guide-line",
        _text: `Focus: ${this._project_memory_text(memory, "_current_focus", "No focus set")}`,
      },
      {
        _type: "view",
        class: "xstudio-guide-focus-row",
        _children: [
          {
            _id: STUDIO_GUIDE_FOCUS_INPUT_ID,
            _type: "input",
            type: "text",
            class: "xstudio-guide-focus-input",
            placeholder: "Set current focus",
            value: focus,
            _text: focus,
            _data_output: PROJECT_MEMORY_FOCUS_DRAFT_XD_KEY,
            _update_data_source_event: "input",
          },
          {
            _id: STUDIO_GUIDE_SET_FOCUS_ID,
            _type: "button",
            type: "button",
            class: "xstudio-guide-set-focus",
            _text: "Set Focus",
            title: "Update guide focus",
            _on: {
              click: {
                _module: "xem",
                _op: "fire",
                _params: {
                  event: "studio:guide-set-focus",
                },
              },
            },
          },
        ],
      },
      {
        _id: STUDIO_GUIDE_MILESTONE_ID,
        _type: "view",
        class: [
          "xstudio-guide-milestone",
          ...(!milestone ? ["xstudio-guide-milestone-hidden"] : []),
        ].join(" "),
        _children: milestone ? [
          {
            _type: "label",
            class: "xstudio-guide-milestone-label",
            _text: "Current Milestone",
          },
          {
            _id: STUDIO_GUIDE_MILESTONE_TITLE_ID,
            _type: "label",
            class: "xstudio-guide-milestone-title",
            _text: milestone?._title || "",
          },
          {
            _type: "label",
            class: "xstudio-guide-milestone-label",
            _text: "Progress",
          },
          {
            _id: STUDIO_GUIDE_MILESTONE_PROGRESS_ID,
            _type: "label",
            class: "xstudio-guide-milestone-progress",
            _text: milestone ? this._project_memory_milestone_progress_text(milestone) : "",
          },
          {
            _id: STUDIO_GUIDE_MILESTONE_ITEMS_ID,
            _type: "view",
            class: "xstudio-guide-milestone-items",
            _children: milestone_children,
          },
        ] : [],
      },
      {
        _id: STUDIO_GUIDE_ACHIEVEMENTS_ID,
        _type: "view",
        class: [
          "xstudio-guide-achievements",
          ...(achievement_children.length === 0 ? ["xstudio-guide-achievements-hidden"] : []),
        ].join(" "),
        _children: [
          {
            _type: "label",
            class: "xstudio-guide-achievements-label",
            _text: "Achievements",
          },
          {
            _id: STUDIO_GUIDE_ACHIEVEMENTS_LIST_ID,
            _type: "view",
            class: "xstudio-guide-achievements-list",
            _children: achievement_children,
          },
        ],
      },
      {
        _id: STUDIO_GUIDE_RECOMMENDATION_ID,
        _type: "view",
        class: [
          "xstudio-guide-recommendation",
          ...(crud_recommendation_cards.length > 0 ? ["xstudio-guide-recommendation-crud"] : []),
          ...(starter_adaptation_card ? ["xstudio-guide-recommendation-starter-adaptation"] : []),
          ...(!display_recommendation && !recommendation_blocker
            ? ["xstudio-guide-recommendation-hidden"]
            : []),
        ].join(" "),
        _children: crud_recommendation_cards.length > 0
          ? crud_recommendation_cards
          : starter_adaptation_card
            ? [starter_adaptation_card]
          : this._guide_recommendation_standard_children({
            _memory: memory,
            _display_recommendation: display_recommendation,
            _active_recommendation: active_recommendation,
            _active_status: active_recommendation ? active_status : "",
            _milestone: milestone,
            _next_item: next_item,
            _recommendation_blocker: recommendation_blocker,
            _recommendation_matches_milestone: recommendation_matches_milestone,
          }),
      },
    ];
  }

  private _project_memory_guide_body_children(memory: any) {
    return this._project_memory_guide_available(memory)
      ? this._project_memory_guide_available_children(memory)
      : this._project_memory_guide_unavailable_children();
  }

  private _set_guide_empty_action_visible(visible: boolean) {
    const section = XUI.getObject(STUDIO_GUIDE_EMPTY_ACTION_ID) as any;
    if (!section) return;
    if (visible) {
      section.removeClass?.("xstudio-guide-empty-action-hidden");
      return;
    }
    section.addClass?.("xstudio-guide-empty-action-hidden");
  }

  private _normalize_guide_recommendation(value: any) {
    const unwrapped = is_obj(value) && "_result" in value ? value._result : value;
    const candidate_arrays = is_obj(unwrapped)
      ? [
        unwrapped._recommendations,
        unwrapped.recommendations,
        unwrapped._candidates,
        unwrapped.candidates,
        unwrapped._options,
        unwrapped.options,
        unwrapped._crud_recommendations,
        unwrapped.crud_recommendations,
      ]
      : [];
    const candidate_array = candidate_arrays.find((candidate) => Array.isArray(candidate)) as any[] | undefined;
    const recommended_candidate = candidate_array
      ?.find((candidate, candidate_index) =>
        is_obj(candidate) &&
        this._recommendation_is_marked_recommended(candidate, candidate_index)
      );
    const raw = is_obj(recommended_candidate)
      ? recommended_candidate
      : Array.isArray(candidate_array) && is_obj(candidate_array[0])
        ? candidate_array[0]
        : is_obj(unwrapped) && is_obj(unwrapped._recommendation)
      ? unwrapped._recommendation
      : is_obj(unwrapped) && is_obj(unwrapped.recommendation)
        ? unwrapped.recommendation
        : is_obj(unwrapped) && is_obj(unwrapped._guide_recommendation)
          ? unwrapped._guide_recommendation
          : unwrapped;
    if (!is_obj(raw)) return null;

    const title = typeof raw._title === "string"
      ? raw._title.trim()
      : typeof raw.title === "string"
        ? raw.title.trim()
        : "";
    const reason = typeof raw._reason === "string"
      ? raw._reason.trim()
      : typeof raw.reason === "string"
        ? raw.reason.trim()
        : "";
    const description = typeof raw._description === "string"
      ? raw._description.trim()
      : typeof raw.description === "string"
        ? raw.description.trim()
        : typeof raw._summary === "string"
          ? raw._summary.trim()
          : typeof raw.summary === "string"
            ? raw.summary.trim()
            : "";
    const type = typeof raw._type === "string"
      ? raw._type.trim()
      : typeof raw.type === "string"
        ? raw.type.trim()
        : "";
    const priority_raw = raw._priority ?? raw.priority;
    const priority = typeof priority_raw === "number" && Number.isFinite(priority_raw)
      ? priority_raw
      : 0;
    const action = this._recommendation_action_source(raw);
    const prompt = typeof action._prompt === "string"
      ? action._prompt.trim()
      : typeof action.prompt === "string"
        ? action.prompt.trim()
        : "";
    const milestone_source = [
      raw._milestone,
      raw.milestone,
      raw._current_milestone,
      raw.current_milestone,
      raw._guide_milestone,
      raw.guide_milestone,
      is_obj(unwrapped) ? unwrapped._milestone : null,
      is_obj(unwrapped) ? unwrapped.milestone : null,
      is_obj(unwrapped) ? unwrapped._current_milestone : null,
      is_obj(unwrapped) ? unwrapped.current_milestone : null,
      is_obj(unwrapped) ? unwrapped._guide_milestone : null,
      is_obj(unwrapped) ? unwrapped.guide_milestone : null,
    ].find((candidate) => is_obj(candidate));
    const milestone =
      this._normalize_project_memory_milestone(milestone_source, 0);
    const milestones_source = Array.isArray(raw._milestones)
      ? raw._milestones
      : Array.isArray(raw.milestones)
        ? raw.milestones
        : is_obj(unwrapped) && Array.isArray(unwrapped._milestones)
          ? unwrapped._milestones
          : is_obj(unwrapped) && Array.isArray(unwrapped.milestones)
            ? unwrapped.milestones
            : [];
    const milestones = milestones_source
      .map((raw_milestone: any, index: number) =>
        this._normalize_project_memory_milestone(raw_milestone, index)
      )
      .filter((item: any) => item !== null);
    const items_source = Array.isArray(raw._items)
      ? raw._items
      : Array.isArray(raw.items)
        ? raw.items
        : is_obj(unwrapped) && Array.isArray(unwrapped._items)
          ? unwrapped._items
          : is_obj(unwrapped) && Array.isArray(unwrapped.items)
            ? unwrapped.items
            : [];
    const progress = raw._progress ??
      raw.progress ??
      (is_obj(unwrapped) ? unwrapped._progress : undefined) ??
      (is_obj(unwrapped) ? unwrapped.progress : undefined);

    if (!title && !reason && !prompt && !milestone && milestones.length === 0 && items_source.length === 0) return null;

    return {
      ...(raw._id !== undefined ? { _id: raw._id } : {}),
      ...(raw.id !== undefined ? { _id: raw.id } : {}),
      _title: title,
      _reason: reason,
      ...(description ? { _description: description } : {}),
      _type: type,
      _priority: priority,
      _action: {
        ...(is_obj(action) ? action : {}),
        ...(prompt ? { _prompt: prompt } : {}),
      },
      ...(raw._recommendation_type !== undefined ? { _recommendation_type: raw._recommendation_type } : {}),
      ...(raw.recommendation_type !== undefined ? { _recommendation_type: raw.recommendation_type } : {}),
      ...(raw._semantic_type !== undefined ? { _semantic_type: raw._semantic_type } : {}),
      ...(raw.semantic_type !== undefined ? { _semantic_type: raw.semantic_type } : {}),
      ...(raw._conversation_message_id !== undefined ? { _conversation_message_id: raw._conversation_message_id } : {}),
      ...(raw.conversation_message_id !== undefined ? { _conversation_message_id: raw.conversation_message_id } : {}),
      ...(raw._conversation_action_id !== undefined ? { _conversation_action_id: raw._conversation_action_id } : {}),
      ...(raw.conversation_action_id !== undefined ? { _conversation_action_id: raw.conversation_action_id } : {}),
      ...(raw._conversation_action_key !== undefined ? { _conversation_action_key: raw._conversation_action_key } : {}),
      ...(raw.conversation_action_key !== undefined ? { _conversation_action_key: raw.conversation_action_key } : {}),
      ...(raw._resume_token !== undefined ? { _resume_token: raw._resume_token } : {}),
      ...(raw.resume_token !== undefined ? { _resume_token: raw.resume_token } : {}),
      ...(raw._materialization !== undefined ? { _materialization: raw._materialization } : {}),
      ...(raw.materialization !== undefined ? { _materialization: raw.materialization } : {}),
      ...(raw._starter_adaptation !== undefined ? { _starter_adaptation: raw._starter_adaptation } : {}),
      ...(raw.starter_adaptation !== undefined ? { _starter_adaptation: raw.starter_adaptation } : {}),
      ...(raw._adaptation !== undefined ? { _adaptation: raw._adaptation } : {}),
      ...(raw.adaptation !== undefined ? { _adaptation: raw.adaptation } : {}),
      ...(raw._change_summary !== undefined ? { _change_summary: raw._change_summary } : {}),
      ...(raw.change_summary !== undefined ? { _change_summary: raw.change_summary } : {}),
      ...(raw._starter_id !== undefined ? { _starter_id: raw._starter_id } : {}),
      ...(raw.starter_id !== undefined ? { _starter_id: raw.starter_id } : {}),
      ...(raw._starter_view_id !== undefined ? { _starter_view_id: raw._starter_view_id } : {}),
      ...(raw.starter_view_id !== undefined ? { _starter_view_id: raw.starter_view_id } : {}),
      _debug: {
        _recommendation: raw,
        _action: action,
      },
      ...(this._is_crud_recommendation(raw)
        ? {
          _recommendation_kind: "crud",
          _recommendation_entity_name: this._recommendation_entity_name(raw),
          _recommendation_expected_artifacts: this._recommendation_expected_artifacts(raw),
          _recommendation_dependency: this._recommendation_dependency_text(raw, 0),
          _recommended: this._recommendation_is_marked_recommended(raw, 0),
        }
        : {}),
      ...(milestone ? { _milestone: milestone } : {}),
      ...(milestones.length > 0 ? { _milestones: milestones } : {}),
      ...(items_source.length > 0 ? { _items: items_source } : {}),
      ...(progress !== undefined ? { _progress: progress } : {}),
      ...(typeof raw._milestone_id === "string" ? { _milestone_id: raw._milestone_id } : {}),
      ...(typeof raw.milestone_id === "string" ? { _milestone_id: raw.milestone_id } : {}),
      ...(typeof raw._milestone_title === "string" ? { _milestone_title: raw._milestone_title } : {}),
      ...(typeof raw.milestone_title === "string" ? { _milestone_title: raw.milestone_title } : {}),
      ...(typeof raw._focus === "string" ? { _focus: raw._focus } : {}),
      ...(typeof raw.focus === "string" ? { _focus: raw.focus } : {}),
    };
  }

  private _normalize_guide_recommendations(value: any) {
    const unwrapped = is_obj(value) && "_result" in value ? value._result : value;
    const candidate_arrays = is_obj(unwrapped)
      ? [
        unwrapped._recommendations,
        unwrapped.recommendations,
        unwrapped._candidates,
        unwrapped.candidates,
        unwrapped._options,
        unwrapped.options,
        unwrapped._crud_recommendations,
        unwrapped.crud_recommendations,
      ]
      : [];
    const candidate_array = candidate_arrays.find((candidate) => Array.isArray(candidate)) as any[] | undefined;
    if (Array.isArray(candidate_array)) {
      return candidate_array
        .map((candidate) => this._normalize_guide_recommendation(candidate))
        .filter((candidate: any) => candidate !== null);
    }

    const single = this._normalize_guide_recommendation(value);
    return single ? [single] : [];
  }

  private _normalize_guide_state(value: any) {
    const unwrapped = is_obj(value) && "_result" in value ? value._result : value;
    const raw = is_obj(unwrapped) && is_obj(unwrapped._guide_state)
      ? unwrapped._guide_state
      : is_obj(unwrapped) && is_obj(unwrapped.guide_state)
        ? unwrapped.guide_state
        : is_obj(unwrapped) && is_obj(unwrapped._guide)
          ? unwrapped._guide
          : is_obj(unwrapped) && is_obj(unwrapped.guide)
            ? unwrapped.guide
            : unwrapped;
    return is_obj(raw) ? raw : null;
  }

  private _guide_recommendation_blocker_text(memory: any, milestone: any, next_item: any) {
    if (!this._project_memory_guide_available(memory)) return "";

    if (!next_item && milestone) return "";

    const guide_state = this._normalize_guide_state(_xd.get(GUIDE_STATE_XD_KEY));
    const message = typeof guide_state?._message === "string" && guide_state._message.trim()
      ? guide_state._message.trim()
      : "";
    const reason = typeof guide_state?._blocked_reason === "string" && guide_state._blocked_reason.trim()
      ? guide_state._blocked_reason.trim()
      : typeof guide_state?._reason === "string" && guide_state._reason.trim()
        ? guide_state._reason.trim()
        : "";

    if (message) return message;

    if (next_item?._title) {
      return `The guide could not produce an executable action for ${next_item._title}.`;
    }

    if (reason && reason !== "ready") {
      return "No executable build action is available for the current guide focus.";
    }

    if (!milestone) {
      return "No executable build action is available for the current guide focus.";
    }

    return "";
  }

  private async _load_guide_recommendation(reason: string) {
    if (!this._server_ready()) {
      this._debug_log("guide recommendation load skipped: server not ready", {
        _reason: reason,
      });
      return;
    }

    let app_id = "";
    let env = "default";
    try {
      app_id = this._client().getActiveAppId();
      env = this._client().getActiveEnv() || "default";
    } catch (err) {
      this._error("guide recommendation load failed", {
        _reason: reason,
        _error: to_err(err),
      });
      return;
    }

    if (!app_id) {
      _xd.set(GUIDE_RECOMMENDATION_XD_KEY, null, {
        source: "xstudio-guide",
      });
      this._render_guide_recommendation();
      this._log("guide recommendation load skipped: missing app id", {
        _reason: reason,
        _env: env,
      });
      return;
    }

    try {
      let result: any;
      try {
        result = await this._send_planning_command("get-guide-recommendation", {
          _app_id: app_id,
          _env: env,
          ...(this._conversation_id ? { _conversation_id: this._conversation_id } : {}),
        });
      } catch (planning_err) {
        this._debug_log("planning guide recommendation unavailable; falling back to XVibe", {
          _reason: reason,
          _app_id: app_id,
          _env: env,
          _error: to_err(planning_err),
        });
        result = await this._send_xvibe_command("get-guide-recommendation", {
          _app_id: app_id,
          _env: env,
        });
      }
      if (is_obj(result) && result._ok === false) {
        _xd.set(GUIDE_RECOMMENDATION_XD_KEY, null, {
          source: "xstudio-guide",
        });
        _xd.set(GUIDE_STATE_XD_KEY, this._normalize_guide_state(result), {
          source: "xstudio-guide",
        });
        this._render_guide_recommendation();
        this._error("guide recommendation load failed", {
          _reason: reason,
          _app_id: app_id,
          _env: env,
          _error: result._error ?? result,
        });
        return;
      }

      const recommendations = this._normalize_guide_recommendations(result);
      const recommendation = recommendations.length > 1
        ? { _recommendations: recommendations }
        : recommendations[0] ?? null;
      _xd.set(GUIDE_STATE_XD_KEY, this._normalize_guide_state(result), {
        source: "xstudio-guide",
      });
      _xd.set(GUIDE_RECOMMENDATION_XD_KEY, recommendation, {
        source: "xstudio-guide",
      });
      this._render_guide_recommendation();
      if (!recommendation) {
        this._log("guide recommendation empty", {
          _reason: reason,
          _app_id: app_id,
          _env: env,
          _result: result,
        });
        return;
      }

      this._log("guide recommendation loaded", {
        _reason: reason,
        _app_id: app_id,
        _env: env,
        _result: recommendation,
        _title: recommendations[0]?._title ?? "",
        _recommendation_count: recommendations.length,
      });
    } catch (err) {
      _xd.set(GUIDE_RECOMMENDATION_XD_KEY, null, {
        source: "xstudio-guide",
      });
      _xd.set(GUIDE_STATE_XD_KEY, null, {
        source: "xstudio-guide",
      });
      this._render_guide_recommendation();
      this._error("guide recommendation load failed", {
        _reason: reason,
        _app_id: app_id,
        _env: env,
        _error: to_err(err),
      });
    }
  }

  private _project_memory_guide_card_data() {
    const memory = _xd.get(PROJECT_MEMORY_XD_KEY);
    const active_recommendation = this._active_guide_recommendation();
    const active_status = this._active_guide_recommendation_status();

    return {
      _id: STUDIO_GUIDE_CARD_ID,
      _type: "view",
      class: [
        "xstudio-portlet",
        "xstudio-section",
        "xstudio-guide-card",
        "xstudio-guide-portlet",
        ...(active_recommendation ? ["xstudio-guide-active-task"] : []),
        ...(active_status === "failed" ? ["xstudio-guide-active-task-failed"] : []),
      ].join(" "),
      _children: [
        {
          _type: "view",
          class: "xstudio-portlet-header xstudio-guide-header",
          _children: [
            {
              _type: "view",
              class: "xstudio-guide-title-wrap",
              _children: [
                {
                  _type: "label",
                  class: "xstudio-guide-title",
                  _text: "Build Guide",
                },
                {
                  _id: STUDIO_GUIDE_COUNTS_ID,
                  _type: "label",
                  class: "xstudio-guide-counts",
                  _text: this._project_memory_guide_status_text(memory),
                },
              ],
            },
          ],
        },
        {
          _id: STUDIO_GUIDE_BODY_ID,
          _type: "view",
          class: "xstudio-portlet-body xstudio-guide-body",
          _children: this._project_memory_guide_body_children(memory),
        },
      ],
    };
  }

  private _append_project_memory_guide_to_shell(shell: Record<string, any>) {
    if (this._find_view_data(shell, STUDIO_GUIDE_CARD_ID)) return;

    const portlet_stack = this._find_view_data(shell, STUDIO_CONTAINER_ID);
    if (!portlet_stack) return;

    if (!Array.isArray(portlet_stack._children)) portlet_stack._children = [];

    const guide = this._project_memory_guide_card_data();
    const conversation_index = portlet_stack._children.findIndex((child: any) =>
      is_obj(child) && child._id === STUDIO_CONVERSATION_SECTION_ID
    );
    if (conversation_index >= 0) {
      portlet_stack._children.splice(conversation_index, 0, guide);
      return;
    }

    portlet_stack._children.unshift(guide);
  }

  private _render_project_memory_guide() {
    const memory = _xd.get(PROJECT_MEMORY_XD_KEY);
    const body = XUI.getObject(STUDIO_GUIDE_BODY_ID) as any;
    body?.update?.({
      _children: this._project_memory_guide_body_children(memory),
    });

    if (!this._project_memory_guide_available(memory)) {
      this._set_studio_label(STUDIO_GUIDE_COUNTS_ID, "");
      this._set_studio_label(
        STUDIO_GUIDE_UNAVAILABLE_ID,
        "Complete and confirm the project plan to begin building.",
      );
      this._set_studio_label(
        STUDIO_GUIDE_UNAVAILABLE_DETAIL_ID,
        "Your build steps will appear here once the plan is ready.",
      );
      this._render_project_memory_milestone(memory);
      this._render_project_memory_achievements(memory);
      this._render_guide_recommendation();
      return;
    }

    const goal = this._project_memory_text(memory, "_goal", "No goal set");
    const focus = this._project_memory_text(memory, "_current_focus", "No focus set");
    const raw_focus = this._project_memory_text(memory, "_current_focus", "");

    this._set_studio_label(STUDIO_GUIDE_GOAL_ID, `Goal: ${goal}`);
    this._set_studio_label(STUDIO_GUIDE_FOCUS_ID, `Focus: ${focus}`);
    this._set_studio_label(STUDIO_GUIDE_COUNTS_ID, this._project_memory_guide_status_text(memory));
    this._set_studio_label(
      STUDIO_GUIDE_READY_MESSAGE_ID,
      "Your app plan is confirmed and ready to start.",
    );

    const input = XUI.getObject(STUDIO_GUIDE_FOCUS_INPUT_ID) as any;
    if (input?.setValue) {
      input.setValue(raw_focus);
    } else if (input?.dom && "value" in input.dom) {
      input.dom.value = raw_focus;
    }

    _xd.set(PROJECT_MEMORY_FOCUS_DRAFT_XD_KEY, raw_focus, {
      source: "xstudio-guide",
    });
    this._render_project_memory_milestone(memory);
    this._render_project_memory_achievements(memory);
    this._render_guide_recommendation();
  }

  private _render_project_memory_milestone(memory: any) {
    if (!this._project_memory_guide_available(memory)) {
      const section = XUI.getObject(STUDIO_GUIDE_MILESTONE_ID) as any;
      const list = XUI.getObject(STUDIO_GUIDE_MILESTONE_ITEMS_ID) as any;
      section?.addClass?.("xstudio-guide-milestone-hidden");
      list?.update?.({ _children: [] });
      this._set_guide_empty_action_visible(false);
      return;
    }

    const focus = this._project_memory_text(memory, "_current_focus", "");
    const milestones = this._project_memory_milestones(memory);
    const recommendation = this._active_guide_recommendation() ??
      this._normalize_guide_recommendation(_xd.get(GUIDE_RECOMMENDATION_XD_KEY));
    const stored_milestone = this._project_memory_current_milestone(memory);
    const milestone = stored_milestone ??
      this._guide_recommendation_dynamic_milestone(recommendation);
    const section = XUI.getObject(STUDIO_GUIDE_MILESTONE_ID) as any;
    const list = XUI.getObject(STUDIO_GUIDE_MILESTONE_ITEMS_ID) as any;
    _xlog.log("[xstudio] guide milestones render", {
      _focus: focus,
      _milestones_count: milestones.length,
      _using_dynamic_milestone: !stored_milestone && Boolean(milestone),
      _matched_milestone_id: milestone?._id ?? "",
      _matched_items_count: Array.isArray(milestone?._items) ? milestone._items.length : 0,
    });
    if (!section || !list) return;

    if (!milestone) {
      section.addClass?.("xstudio-guide-milestone-hidden");
      this._set_studio_label(STUDIO_GUIDE_MILESTONE_TITLE_ID, "");
      this._set_studio_label(STUDIO_GUIDE_MILESTONE_PROGRESS_ID, "");
      list.update?.({ _children: [] });
      this._set_guide_empty_action_visible(!this._project_memory_guide_has_content(memory, recommendation));
      return;
    }

    this._set_guide_empty_action_visible(false);
    section.removeClass?.("xstudio-guide-milestone-hidden");
    this._set_studio_label(STUDIO_GUIDE_MILESTONE_TITLE_ID, milestone._title);
    this._set_studio_label(
      STUDIO_GUIDE_MILESTONE_PROGRESS_ID,
      this._project_memory_milestone_progress_text(milestone),
    );
    list.update?.({
      _children: this._project_memory_milestone_children(milestone),
    });
  }

  private _render_project_memory_achievements(memory: any) {
    if (!this._project_memory_guide_available(memory)) {
      const section = XUI.getObject(STUDIO_GUIDE_ACHIEVEMENTS_ID) as any;
      const list = XUI.getObject(STUDIO_GUIDE_ACHIEVEMENTS_LIST_ID) as any;
      section?.addClass?.("xstudio-guide-achievements-hidden");
      list?.update?.({ _children: [] });
      this._set_guide_empty_action_visible(false);
      return;
    }

    const section = XUI.getObject(STUDIO_GUIDE_ACHIEVEMENTS_ID) as any;
    const list = XUI.getObject(STUDIO_GUIDE_ACHIEVEMENTS_LIST_ID) as any;
    if (!section || !list) return;

    const children = this._project_memory_achievement_children(memory);
    if (children.length === 0) {
      section.addClass?.("xstudio-guide-achievements-hidden");
      list.update?.({ _children: [] });
      return;
    }

    this._set_guide_empty_action_visible(false);
    section.removeClass?.("xstudio-guide-achievements-hidden");
    list.update?.({ _children: children });
  }

  private _render_guide_recommendation() {
    if (!this._project_memory_guide_available(_xd.get(PROJECT_MEMORY_XD_KEY))) {
      const section = XUI.getObject(STUDIO_GUIDE_RECOMMENDATION_ID) as any;
      section?.addClass?.("xstudio-guide-recommendation-hidden");
      this._set_studio_control_disabled(STUDIO_GUIDE_RECOMMENDATION_DO_IT_ID, true);
      this._set_guide_empty_action_visible(false);
      return;
    }

    const recommendations = this._normalize_guide_recommendations(
      _xd.get(GUIDE_RECOMMENDATION_XD_KEY),
    );
    const recommendation = recommendations[0] ?? null;
    const active = this._active_guide_recommendation();
    const active_status = this._active_guide_recommendation_status();
    const memory = _xd.get(PROJECT_MEMORY_XD_KEY);
    const show_lower_level_mode = this._guide_lower_level_actions_visible();
    const materialization_recommendation = show_lower_level_mode
      ? null
      : this._guide_materialization_recommendation(memory);
    const display_recommendation = active ?? materialization_recommendation ?? recommendation;
    const materialization_primary_visible =
      Boolean(materialization_recommendation) &&
      (!active || this._is_materialize_confirmed_plan_recommendation(active));
    const display_recommendations = active ? [active] : recommendations;
    const show_lower_level_guide_cards =
      !materialization_recommendation ||
      Boolean(active && !this._is_materialize_confirmed_plan_recommendation(active));
    const card_recommendations = active
      ? [active]
      : materialization_recommendation
        ? [materialization_recommendation]
        : display_recommendations;
    const milestone = materialization_primary_visible
      ? null
      : this._guide_current_milestone(memory, display_recommendation);
    const next_item = this._project_memory_milestone_next_item(milestone);
    const recommendation_blocker = display_recommendation
      ? ""
      : this._guide_recommendation_blocker_text(
        memory,
        milestone,
        next_item,
      );
    const recommendation_matches_milestone =
      this._guide_recommendation_matches_milestone_item(display_recommendation, next_item);
    const section = XUI.getObject(STUDIO_GUIDE_RECOMMENDATION_ID) as any;
    if (!section) {
      this._debug_log("guide recommendation render skipped: card not mounted", {
        _has_recommendation: display_recommendation !== null,
        _result_key: GUIDE_RECOMMENDATION_XD_KEY,
      });
      return;
    }

    if (!display_recommendation && !recommendation_blocker) {
      section.addClass?.("xstudio-guide-recommendation-hidden");
      section.removeClass?.("xstudio-guide-recommendation-crud");
      section.removeClass?.("xstudio-guide-recommendation-starter-adaptation");
      this._set_studio_label(STUDIO_GUIDE_RECOMMENDATION_LABEL_ID, "Next suggested step");
      this._set_studio_label(STUDIO_GUIDE_RECOMMENDATION_TITLE_ID, "");
      this._set_studio_label(STUDIO_GUIDE_RECOMMENDATION_REASON_ID, "");
      this._set_studio_control_disabled(STUDIO_GUIDE_RECOMMENDATION_DO_IT_ID, true);
      this._set_guide_empty_action_visible(!this._project_memory_guide_has_content(
        memory,
        display_recommendation,
      ));
      return;
    }

    this._set_guide_empty_action_visible(false);
    section.removeClass?.("xstudio-guide-recommendation-hidden");
    const crud_recommendation_cards = show_lower_level_guide_cards
      ? this._guide_crud_recommendation_cards(
        card_recommendations,
        active ? active_status : "",
      )
      : [];
    if (crud_recommendation_cards.length > 0) {
      section.addClass?.("xstudio-guide-recommendation-crud");
      section.removeClass?.("xstudio-guide-recommendation-starter-adaptation");
      section.update?.({ _children: crud_recommendation_cards });
      return;
    }

    section.removeClass?.("xstudio-guide-recommendation-crud");
    if (this._is_starter_adaptation_recommendation(display_recommendation)) {
      section.addClass?.("xstudio-guide-recommendation-starter-adaptation");
      section.update?.({
        _children: [
          this._guide_starter_adaptation_card(
            display_recommendation,
            active,
            active ? active_status : "",
          ),
        ],
      });
      return;
    }

    section.removeClass?.("xstudio-guide-recommendation-starter-adaptation");
    const next_recommendation_section = this._project_memory_guide_available_children(memory)
      .find((child: any) => is_obj(child) && child._id === STUDIO_GUIDE_RECOMMENDATION_ID);
    if (is_obj(next_recommendation_section) && Array.isArray(next_recommendation_section._children)) {
      section.update?.({ _children: next_recommendation_section._children });
    }
    this._set_studio_label(
      STUDIO_GUIDE_RECOMMENDATION_LABEL_ID,
      active
        ? "Current task"
        : display_recommendation || recommendation_blocker
          ? "Recommended next"
          : "Next suggested step",
    );
    this._set_studio_label(
      STUDIO_GUIDE_RECOMMENDATION_TITLE_ID,
      recommendation_blocker
        ? "No executable action available"
        : active
          ? this._guide_task_title(active)
          : this._guide_recommendation_title(display_recommendation, next_item),
    );
    this._set_studio_label(
      STUDIO_GUIDE_RECOMMENDATION_REASON_ID,
      recommendation_blocker || this._guide_recommendation_description(display_recommendation),
    );
    this._set_studio_label(
      STUDIO_GUIDE_RECOMMENDATION_STATUS_ID,
      this._guide_recommendation_status_text(active, active_status),
    );
    this._set_studio_label(
      STUDIO_GUIDE_RECOMMENDATION_FOCUS_ID,
      this._guide_recommendation_focus_text(memory, milestone),
    );
    this._set_studio_label(
      STUDIO_GUIDE_RECOMMENDATION_PROGRESS_ID,
      milestone ? this._project_memory_milestone_progress_text(milestone) : "",
    );
    const recommendation_button = XUI.getObject(STUDIO_GUIDE_RECOMMENDATION_DO_IT_ID) as any;
    const recommendation_prompt = typeof display_recommendation?._action?._prompt === "string"
      ? display_recommendation._action._prompt.trim()
      : "";
    const materialization_display =
      !active && this._is_materialize_confirmed_plan_recommendation(display_recommendation);
    const action_text = materialization_display
      ? "Build app"
      : this._guide_recommendation_action_text(active, active_status);
    const action_title = materialization_display
      ? "Build app"
      : this._guide_recommendation_action_title(active, active_status);
    recommendation_button?.setText?.(action_text);
    if (recommendation_button?.dom instanceof HTMLElement) {
      recommendation_button.dom.setAttribute("title", action_title);
    }
    this._set_studio_control_disabled(
      STUDIO_GUIDE_RECOMMENDATION_DO_IT_ID,
      this._guide_recommendation_action_disabled(
        active,
        active_status,
        recommendation_blocker,
        recommendation_prompt,
      ),
    );
    this._set_studio_control_disabled(
      STUDIO_GUIDE_RECOMMENDATION_CANCEL_ID,
      active_status === "completed",
    );
  }

  private async _start_guide_recommendation() {
    if (this._conversation_analyzing) return;

    const active = this._active_guide_recommendation();
    if (active) {
      if (this._active_guide_recommendation_status() === "failed") {
        await this._retry_guide_active_recommendation();
      }
      return;
    }

    const materialization_recommendation = this._guide_lower_level_actions_visible()
      ? null
      : this._guide_materialization_recommendation(_xd.get(PROJECT_MEMORY_XD_KEY));
    const recommendation = this._normalize_guide_recommendation(
      _xd.get(GUIDE_RECOMMENDATION_XD_KEY),
    ) ?? materialization_recommendation;
    const actionable_recommendation = materialization_recommendation ?? recommendation;
    const action_prompt = typeof actionable_recommendation?._action?._prompt === "string"
      ? actionable_recommendation._action._prompt.trim()
      : "";
    if (!actionable_recommendation || !action_prompt) return;

    _xd.set(GUIDE_ACTIVE_RECOMMENDATION_XD_KEY, actionable_recommendation, {
      source: "xstudio-guide",
    });
    _xd.set(GUIDE_ACTIVE_RECOMMENDATION_STATUS_XD_KEY, this._is_starter_adaptation_recommendation(actionable_recommendation)
      ? "adapting"
      : "running", {
      source: "xstudio-guide",
    });
    this._set_conversation_input_value(action_prompt);
    this._render_guide_active_recommendation();
    this._log("guide recommendation started", {
      _title: actionable_recommendation._title,
      _prompt: action_prompt,
    });
    await this._send_guide_recommendation_message(actionable_recommendation, action_prompt);
  }

  private async _retry_guide_active_recommendation() {
    if (this._conversation_analyzing) return;
    if (this._active_guide_recommendation_status() !== "failed") return;

    const active = this._active_guide_recommendation();
    const prompt = typeof active?._action?._prompt === "string"
      ? active._action._prompt.trim()
      : "";
    if (!active || !prompt) return;

    _xd.set(GUIDE_ACTIVE_RECOMMENDATION_STATUS_XD_KEY, this._is_starter_adaptation_recommendation(active)
      ? "adapting"
      : "running", {
      source: "xstudio-guide",
    });
    this._set_conversation_input_value(prompt);
    this._render_guide_active_recommendation();
    this._log("guide active recommendation retry requested", {
      _title: active._title,
      _prompt: prompt,
    });
    await this._send_guide_recommendation_message(active, prompt, {
      _append_visible_message: false,
    });
  }

  private _guide_recommendation_execution_payload(recommendation: Record<string, any> | null) {
    if (!recommendation) return null;

    const action = is_obj(recommendation._action) ? recommendation._action : {};
    return this._intent_action_execution_payload(action);
  }

  private _has_structured_guide_action(recommendation: Record<string, any> | null) {
    return is_obj(this._guide_recommendation_execution_payload(recommendation));
  }

  private _is_primary_experience_guide_action(recommendation: Record<string, any> | null) {
    if (!recommendation) return false;

    const action = is_obj(recommendation._action) ? recommendation._action : {};
    const command = this._guide_recommendation_execution_payload(recommendation);
    if (!is_obj(command)) return false;

    const identifiers = [
      recommendation._id,
      recommendation.id,
      recommendation._type,
      recommendation.type,
      recommendation._semantic_type,
      recommendation.semantic_type,
      recommendation._role,
      action._id,
      action.id,
      action._type,
      action.type,
      action._semantic_type,
      action.semantic_type,
      action._role,
      command._params?._role,
      command._params?._semantic_type,
    ].map((item) => String(item ?? "").trim());

    return identifiers.includes("primary-experience") ||
      identifiers.includes("compose-primary-experience") ||
      identifiers.includes("compose-and-verify-primary-experience");
  }

  private _guide_structured_action_id(recommendation: Record<string, any>) {
    if (typeof recommendation._conversation_action_id === "string" && recommendation._conversation_action_id.trim()) {
      return recommendation._conversation_action_id.trim();
    }

    if (this._is_primary_experience_guide_action(recommendation)) {
      return "compose-and-verify-primary-experience";
    }

    const action = is_obj(recommendation._action) ? recommendation._action : {};
    const id = [
      action._id,
      action.id,
      action._role,
      recommendation._id,
      recommendation.id,
      recommendation._semantic_type,
      recommendation._role,
    ].find((item) => typeof item === "string" && item.trim());
    return typeof id === "string" ? id.trim() : "guide-action";
  }

  private _guide_structured_action_key(action_id: string, message_id: string) {
    return [
      this._conversation_app_id || "no-app",
      this._conversation_env || "no-env",
      this._conversation_id || "no-conversation",
      message_id || "guide-message",
      action_id || "guide-action",
    ].map((part) => this._conversation_action_key_part(part)).join(":");
  }

  private _guide_structured_action_message_id(recommendation: Record<string, any>) {
    return typeof recommendation._conversation_message_id === "string" &&
      recommendation._conversation_message_id.trim()
      ? recommendation._conversation_message_id.trim()
      : "";
  }

  private _remember_guide_structured_action_identity(
    recommendation: Record<string, any>,
    action_id: string,
    message_id: string,
    action_key: string,
    extra: Record<string, any> = {},
  ) {
    const remembered = {
      ...recommendation,
      _conversation_message_id: message_id,
      _conversation_action_id: action_id,
      _conversation_action_key: action_key,
      ...extra,
    };
    _xd.set(GUIDE_ACTIVE_RECOMMENDATION_XD_KEY, remembered, {
      source: "xstudio-guide",
    });
    return remembered;
  }

  private _enrich_guide_execution_payload(
    command: Record<string, any>,
    action_id: string,
    message_id: string,
    recommendation: Record<string, any>,
  ) {
    const params = is_obj(command._params)
      ? (_xu.clone_json(command._params) as Record<string, any>)
      : {};

    return {
      ...command,
      _params: {
        ...params,
        _app_id: typeof params._app_id === "string" && params._app_id.trim()
          ? params._app_id.trim()
          : this._conversation_app_id,
        _env: typeof params._env === "string" && params._env.trim()
          ? params._env.trim()
          : this._conversation_env,
        ...(this._conversation_id ? { _conversation_id: this._conversation_id } : {}),
        ...(message_id ? { _message_id: message_id } : {}),
        ...(action_id ? { _action_id: action_id } : {}),
        ...(command._module === "xvibe" && command._op === "materialize-confirmed-plan"
          ? {
            _resume_token:
              typeof params._resume_token === "string" && params._resume_token.trim()
                ? params._resume_token.trim()
                : this._guide_materialization_resume_token(recommendation, action_id, message_id),
          }
          : {}),
        _guide_action: _xu.clone_json(recommendation),
      },
    };
  }

  private _guide_structured_persisted_action(
    recommendation: Record<string, any>,
    action_id: string,
  ) {
    const action = is_obj(recommendation._action) ? recommendation._action : {};
    const command = this._guide_recommendation_execution_payload(recommendation);
    if (!is_obj(command)) return null;

    const title = this._guide_task_title(recommendation) ||
      (typeof action._title === "string" ? action._title.trim() : "") ||
      (typeof action._prompt === "string" ? action._prompt.trim() : "") ||
      "Guide action";
    const action_type = typeof action._type === "string" && action._type.trim()
      ? action._type.trim()
      : typeof action._action_type === "string" && action._action_type.trim()
        ? action._action_type.trim()
        : "module-op";

    return {
      _id: action_id,
      _type: action_type,
      _action_type: action_type,
      _title: title,
      ...(typeof recommendation._reason === "string" && recommendation._reason.trim()
        ? { _description: recommendation._reason.trim() }
        : {}),
      ...(typeof action._prompt === "string" && action._prompt.trim()
        ? { _prompt: action._prompt.trim() }
        : {}),
      ...(typeof action._role === "string" && action._role.trim()
        ? { _role: action._role.trim() }
        : {}),
      _status: STUDIO_INTENT_ACTION_STATUS_SUGGESTED,
      _execution_payload: command,
      _requires_approval: false,
    };
  }

  private async _append_structured_guide_task_message(
    recommendation: Record<string, any>,
    prompt: string,
    action_id: string,
  ) {
    if (!this._can_edit()) return null;
    const preserve_transient_load = this._conversation_preserve_transient_load;
    this._conversation_preserve_transient_load = true;
    try {
      await this._ensure_conversation_for_current_context();
    } finally {
      this._conversation_preserve_transient_load = preserve_transient_load;
    }
    if (!this._conversation_app_id || !this._conversation_env || !this._conversation_id) {
      return null;
    }

    const persisted_action =
      this._guide_structured_persisted_action(recommendation, action_id);
    if (!persisted_action) return null;

    const title = this._guide_task_title(recommendation) || prompt || "Guide action";
    const append_result = await this._send_xvibe_command("append-message", {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      _message: {
        _role: "tool",
        _text: title,
        _intent: {
          _message_type: "guide-action",
          _execution_level: "deterministic",
          _should_mutate: true,
          _actions: [persisted_action],
        },
        _metadata: {
          _source: "xstudio.guide.structured-action",
          _normalized_prompt: this._conversation_prompt_key(prompt),
          _guide_recommendation: _xu.clone_json(recommendation),
        },
      },
    });
    const message_id = this._conversation_append_message_id(append_result);
    if (!message_id) return null;

    await this._list_conversations(this._conversation_app_id, this._conversation_env);
    await this._load_conversation_messages();
    return {
      _ok: true,
      _message_id: message_id,
      _append_result: append_result,
    };
  }

  private _guide_structured_action_view(
    recommendation: Record<string, any>,
    message_id: string,
  ): XStudioIntentActionView | null {
    const action = is_obj(recommendation._action) ? recommendation._action : {};
    const command = this._guide_recommendation_execution_payload(recommendation);
    if (!is_obj(command)) return null;

    const action_id = this._guide_structured_action_id(recommendation);
    const title = this._guide_task_title(recommendation) ||
      (typeof action._title === "string" ? action._title.trim() : "") ||
      "Guide action";
    const key = this._guide_structured_action_key(action_id, message_id);
    const enriched_command = this._enrich_guide_execution_payload(
      command,
      action_id,
      message_id,
      recommendation,
    );

    return {
      _key: key,
      _render_key: key,
      _id: action_id,
      _message_id: message_id,
      _action_index: 0,
      _title: title,
      _description: typeof recommendation._reason === "string" ? recommendation._reason : "",
      _action_type: typeof action._action_type === "string" && action._action_type.trim()
        ? action._action_type.trim()
        : "module-op",
      _confidence: typeof action._confidence === "string" ? action._confidence : "",
      _status: STUDIO_INTENT_ACTION_STATUS_SUGGESTED,
      _executable: true,
      _has_execution_payload: true,
      _execution_payload_error: "",
      _execution_payload: enriched_command,
      _requires_approval: false,
      _params: is_obj(enriched_command._params) ? { ...enriched_command._params } : null,
      _error: "",
    };
  }

  private _guide_primary_experience_zero_planned_changes(result: any) {
    if (!is_obj(result)) return false;
    const sources = [
      result,
      result._result,
      result._mutation_plan_result,
      result._result?._mutation_plan_result,
      result._mutation_plan,
      result._result?._mutation_plan,
    ].filter(is_obj);

    return sources.some((source) => {
      const explicit_count = source._planned_change_count ?? source.planned_change_count;
      if (typeof explicit_count === "number") return explicit_count === 0;

      const explicit_steps = source._planned_changes ?? source.planned_changes;
      if (Array.isArray(explicit_steps)) return explicit_steps.length === 0;

      const steps = source._steps ?? source.steps;
      const status = String(source._status ?? source.status ?? "").trim().toLowerCase();
      if (Array.isArray(steps) && steps.length === 0 && status !== "completed") return true;

      return false;
    });
  }

  private async _send_structured_guide_recommendation_message(
    recommendation: Record<string, any>,
    prompt: string,
    options: { _append_visible_message?: boolean } = {},
  ) {
    let active_recommendation = recommendation;
    let message_id = this._guide_structured_action_message_id(active_recommendation);
    const action_id = this._guide_structured_action_id(active_recommendation);
    let action_key = typeof active_recommendation._conversation_action_key === "string" &&
      active_recommendation._conversation_action_key.trim()
      ? active_recommendation._conversation_action_key.trim()
      : this._guide_structured_action_key(action_id, message_id);

    if (this._guide_structured_action_running_key === action_key) {
      this._log("guide structured action ignored: already running", {
        _action_key: action_key,
        _action_id: action_id,
        _message_id: message_id,
      });
      return;
    }

    if (!message_id && options._append_visible_message === false) {
      this._retain_active_guide_recommendation_after_failure(
        "guide-structured-action-message-missing",
        "Guide action is missing its original conversation message.",
      );
      return;
    }

    if (!message_id && this._active_guide_recommendation_status() !== "failed") {
      const append_result =
        await this._append_structured_guide_task_message(
          active_recommendation,
          prompt,
          action_id,
        );
      if (!is_obj(append_result) || append_result._ok !== true) {
        this._retain_active_guide_recommendation_after_failure(
          "guide-structured-action-message-missing",
          "Guide action could not append the conversation message.",
        );
        return;
      }

      message_id = typeof append_result?._message_id === "string"
        ? append_result._message_id
        : "";
      action_key = this._guide_structured_action_key(action_id, message_id);
      const command = this._guide_recommendation_execution_payload(active_recommendation);
      const resume_token =
        is_obj(command) && command._module === "xvibe" && command._op === "materialize-confirmed-plan"
          ? this._guide_materialization_resume_token(active_recommendation, action_id, message_id)
          : "";
      active_recommendation = this._remember_guide_structured_action_identity(
        active_recommendation,
        action_id,
        message_id,
        action_key,
        resume_token
          ? {
            _resume_token: resume_token,
            _materialization: {
              ...(is_obj(active_recommendation._materialization) ? active_recommendation._materialization : {}),
              _status: "running",
              _resume_token: resume_token,
              _conversation_message_id: message_id,
              _conversation_action_id: action_id,
              _conversation_action_key: action_key,
              _stages: this._guide_materialization_default_stages("running"),
            },
          }
          : {},
      );
      if (resume_token) {
        this._set_guide_materialization_state({
          ...(this._guide_materialization_state() ?? {}),
          _status: "running",
          _resume_token: resume_token,
          _conversation_message_id: message_id,
          _conversation_action_id: action_id,
          _conversation_action_key: action_key,
          _stages: this._guide_materialization_default_stages("running"),
        });
      }
    }

    const action = this._guide_structured_action_view(active_recommendation, message_id);
    if (!action) {
      this._retain_active_guide_recommendation_after_failure(
        "guide-structured-action-missing",
        "Guide action is missing execution payload.",
      );
      return;
    }

    this._guide_structured_action_running_key = action._key;
    try {
      await this._apply_conversation_execution_payload(action);
    } finally {
      if (this._guide_structured_action_running_key === action._key) {
        this._guide_structured_action_running_key = "";
      }
    }
  }

  private async _send_guide_recommendation_message(
    recommendation: Record<string, any>,
    prompt: string,
    options: { _append_visible_message?: boolean } = {},
  ) {
    if (this._has_structured_guide_action(recommendation)) {
      await this._send_structured_guide_recommendation_message(recommendation, prompt, options);
      return;
    }

    await this._send_conversation_message(prompt);
  }

  private _conversation_analyze_requires_follow_up(result: any) {
    const intent = is_obj(result?._intent)
      ? result._intent
      : is_obj(result?._result?._intent)
        ? result._result._intent
        : is_obj(result?._message?._intent)
          ? result._message._intent
          : is_obj(result?._result?._message?._intent)
            ? result._result._message._intent
            : null;
    if (!intent) return false;

    const artifact_request = intent._artifact_request ?? intent.artifact_request;
    if (is_obj(artifact_request)) return true;

    const actions = intent._actions ?? intent.actions;
    return Array.isArray(actions) && actions.length > 0;
  }

  private _active_guide_recommendation() {
    return this._normalize_guide_recommendation(
      _xd.get(GUIDE_ACTIVE_RECOMMENDATION_XD_KEY),
    );
  }

  private _active_guide_recommendation_status(): XStudioGuideActiveRecommendationStatus | "" {
    if (!this._active_guide_recommendation()) return "";

    const status = String(_xd.get(GUIDE_ACTIVE_RECOMMENDATION_STATUS_XD_KEY) ?? "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
    if (status === "failed" || status === "failure" || status === "error") return "failed";
    if (status === "completed" || status === "complete" || status === "done") return "completed";
    if (status === "ready") return "ready";
    if (status === "adapting" || status === "adapt-starter" || status === "starter-adaptation") return "adapting";
    return "running";
  }

  private _render_guide_active_recommendation() {
    const active = this._active_guide_recommendation();
    const status = this._active_guide_recommendation_status();
    const title = this._guide_task_title(active);
    const header = XUI.getObject(STUDIO_CONVERSATION_ACTIVE_TASK_HEADER_ID) as any;
    const card = XUI.getObject(STUDIO_CONVERSATION_ACTIVE_TASK_ID) as any;
    const guide = XUI.getObject(STUDIO_GUIDE_CARD_ID) as any;
    const retry = XUI.getObject(STUDIO_CONVERSATION_ACTIVE_TASK_RETRY_ID) as any;

    if (!active || !title) {
      header?.addClass?.("xstudio-conversation-active-task-hidden");
      card?.addClass?.("xstudio-conversation-active-task-hidden");
      guide?.removeClass?.("xstudio-guide-active-task");
      guide?.removeClass?.("xstudio-guide-active-task-failed");
      retry?.addClass?.("xstudio-conversation-active-task-hidden");
      this._set_studio_label(STUDIO_CONVERSATION_ACTIVE_TASK_HEADER_TITLE_ID, "");
      this._set_studio_label(STUDIO_CONVERSATION_ACTIVE_TASK_LABEL_ID, "Current Task");
      this._set_studio_label(STUDIO_CONVERSATION_ACTIVE_TASK_TITLE_ID, "");
      this._render_guide_recommendation();
      return;
    }

    header?.removeClass?.("xstudio-conversation-active-task-hidden");
    card?.removeClass?.("xstudio-conversation-active-task-hidden");
    guide?.addClass?.("xstudio-guide-active-task");
    if (status === "failed") {
      guide?.addClass?.("xstudio-guide-active-task-failed");
      retry?.removeClass?.("xstudio-conversation-active-task-hidden");
    } else {
      guide?.removeClass?.("xstudio-guide-active-task-failed");
      retry?.addClass?.("xstudio-conversation-active-task-hidden");
    }
    this._set_studio_label(STUDIO_CONVERSATION_ACTIVE_TASK_HEADER_TITLE_ID, title);
    this._set_studio_label(
      STUDIO_CONVERSATION_ACTIVE_TASK_LABEL_ID,
      status === "failed"
        ? "Task Failed"
        : status === "completed"
          ? "Task Completed"
          : "Current Task",
    );
    this._set_studio_label(STUDIO_CONVERSATION_ACTIVE_TASK_TITLE_ID, title);
    this._set_studio_control_disabled(STUDIO_CONVERSATION_ACTIVE_TASK_RETRY_ID, status !== "failed");
    this._set_studio_control_disabled(STUDIO_CONVERSATION_ACTIVE_TASK_CANCEL_ID, false);
    this._render_guide_recommendation();
  }

  private _cancel_guide_active_recommendation() {
    const active = this._active_guide_recommendation();
    if (!active) return;

    _xd.delete(GUIDE_ACTIVE_RECOMMENDATION_XD_KEY, {
      source: "xstudio-guide",
    });
    _xd.delete(GUIDE_ACTIVE_RECOMMENDATION_STATUS_XD_KEY, {
      source: "xstudio-guide",
    });
    this._render_guide_active_recommendation();
    this._log("guide active recommendation cancelled", {
      _title: active._title,
    });
  }

  private async _refresh_guide_after_success(
    reason: string,
    opts: {
      _clear_active_recommendation?: boolean;
      _log_message?: string;
      _detail?: Record<string, any>;
    } = {},
  ) {
    const active = this._active_guide_recommendation();
    const should_clear_active = opts._clear_active_recommendation === true && Boolean(active);

    if (should_clear_active) {
      _xd.delete(GUIDE_ACTIVE_RECOMMENDATION_XD_KEY, {
        source: "xstudio-guide",
      });
      _xd.delete(GUIDE_ACTIVE_RECOMMENDATION_STATUS_XD_KEY, {
        source: "xstudio-guide",
      });
      this._log("guide active recommendation completed", {
        _reason: reason,
        _title: active?._title,
      });
      this._render_guide_active_recommendation();
    }

    await this._load_project_memory_for_current_app(reason, {
      _force: true,
    });
    await this._load_guide_recommendation(reason);
    this._render_project_memory_guide();

    if (opts._log_message) {
      this._log(opts._log_message, {
        _reason: reason,
        _cleared_active_recommendation: should_clear_active,
        ...(active ? { _active_recommendation_title: active._title } : {}),
        ...(opts._detail ?? {}),
      });
    }
  }

  private async _complete_active_guide_recommendation(reason: string) {
    if (!this._active_guide_recommendation()) return;

    await this._refresh_guide_after_success(reason, {
      _clear_active_recommendation: true,
    });
  }

  private _retain_active_guide_recommendation_after_failure(reason: string, error?: any) {
    const active = this._active_guide_recommendation();
    if (!active) return;

    _xd.set(GUIDE_ACTIVE_RECOMMENDATION_STATUS_XD_KEY, "failed", {
      source: "xstudio-guide",
    });
    this._render_guide_active_recommendation();
    this._log("guide active recommendation retained after failure", {
      _reason: reason,
      _title: active._title,
      ...(error === undefined ? {} : { _error: to_err(error) }),
    });
  }

  private _open_guide_portlet(reason: string) {
    this._right_dock_collapsed = false;
    this._portlet_visibility.guide = true;
    this._apply_dock_state();

    const card = XUI.getObject(STUDIO_GUIDE_CARD_ID) as any;
    card?.removeClass?.("xstudio-guide-collapsed");

    const toggle = XUI.getObject(STUDIO_GUIDE_TOGGLE_ID) as any;
    toggle?.setText?.("▴");
    if (toggle?.dom instanceof HTMLElement) {
      toggle.dom.setAttribute("aria-expanded", "true");
      toggle.dom.setAttribute("title", "Collapse Guide");
    }

    this._log("guide portlet opened", { _reason: reason });
  }

  private _toggle_project_memory_guide() {
    const card = XUI.getObject(STUDIO_GUIDE_CARD_ID) as any;
    const toggle = XUI.getObject(STUDIO_GUIDE_TOGGLE_ID) as any;
    const collapsed = card?.dom?.classList?.contains("xstudio-guide-collapsed") !== false;
    const next_collapsed = !collapsed;

    if (next_collapsed) {
      card?.addClass?.("xstudio-guide-collapsed");
    } else {
      card?.removeClass?.("xstudio-guide-collapsed");
    }

    toggle?.setText?.(next_collapsed ? "▾" : "▴");
    if (toggle?.dom instanceof HTMLElement) {
      toggle.dom.setAttribute("aria-expanded", String(!next_collapsed));
      toggle.dom.setAttribute("title", next_collapsed ? "Expand Guide" : "Collapse Guide");
    }
  }

  private async _set_project_memory_focus() {
    const input = XUI.getObject(STUDIO_GUIDE_FOCUS_INPUT_ID) as any;
    const focus = String(
      input?.getValue?.() ??
      input?.dom?.value ??
      _xd.get(PROJECT_MEMORY_FOCUS_DRAFT_XD_KEY) ??
      ""
    ).trim();

    if (!focus) {
      this._log("project memory focus patch skipped: empty focus");
      return;
    }

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv() || "default";

    this._set_studio_control_disabled(STUDIO_GUIDE_SET_FOCUS_ID, true);
    this._log("project memory focus patch requested", {
      _app_id: app_id,
      _env: env,
    });

    try {
      const result = await _x.execute({
        _module: "project-memory-client",
        _op: "patch",
        _params: {
          _app_id: app_id,
          _env: env,
          _patch: {
            _current_focus: focus,
          },
          _result_key: PROJECT_MEMORY_XD_KEY,
        },
      });

      if (is_obj(result) && result._ok === false) {
        this._error("project memory focus patch failed", {
          _app_id: app_id,
          _env: env,
          _error: result._error ?? result,
        });
        return;
      }

      this._project_memory_loaded_scope = this._project_memory_scope_key(app_id, env);
      this._render_project_memory_guide();
      this._log("project memory focus patched", {
        _app_id: app_id,
        _env: env,
      });
      await this._load_guide_recommendation("project-memory-focus-patched");
    } catch (err) {
      this._error("project memory focus patch failed", {
        _app_id: app_id,
        _env: env,
        _error: to_err(err),
      });
    } finally {
      this._set_studio_control_disabled(STUDIO_GUIDE_SET_FOCUS_ID, false);
    }
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

    _xem.on("xvm:connection-change", (payload: any) => {
      const evt = this._normalize_event_payload(payload);
      if (!is_obj(evt) || evt._connected !== true) return;
      if (evt._app_id !== this._client().getActiveAppId()) return;
      if (evt._env !== this._client().getActiveEnv()) return;
      void this._flush_pending_server_refreshes();
      void this._load_project_memory_for_current_app("xvm-connected");
    });

    _xem.on("xvm:view-rendered", (payload: any) => {
      const evt = this._normalize_event_payload(payload);
      if (!is_obj(evt)) return;
      if (evt._app_id !== this._client().getActiveAppId()) return;
      if (evt._env !== this._client().getActiveEnv()) return;
      this._cancel_object_picker();
      this._cancel_arrange_mode();
      this._apply_left_sidebar_width_to_dom();
      this._bind_left_sidebar_resize_divider();
      this._refresh_object_tree_for_current_view();
      void this._refresh_app_explorer();
      void this._ensure_conversation_for_current_context();
      void this._load_project_memory_for_current_app("view-rendered");
    });

    _xem.on("xvm:view-navigated", (payload: any) => {
      const evt = this._normalize_event_payload(payload);
      if (!is_obj(evt)) return;

      const view_id = typeof evt._view_id === "string" ? evt._view_id.trim() : "";
      const region = typeof evt._region === "string" ? evt._region.trim() : "";
      if (!view_id || view_id === STUDIO_VIEW_ID || region === STUDIO_REGION_ID) return;
      if (region && region !== this._resolve_app_view_region()) return;

      this._cancel_object_picker();
      this._cancel_arrange_mode();
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

    _xem.on("studio:object-picker-toggle", () => {
      this._toggle_object_picker();
    });

    _xem.on("studio:arrange-toggle", () => {
      this._toggle_arrange_mode();
    });

    _xem.on("studio:add-object", async () => {
      await this._open_add_object_palette();
    });

    _xem.on("studio:object-palette-open", async () => {
      await this._open_add_object_palette();
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

    _xem.on("studio:guide-toggle", () => {
      this._toggle_project_memory_guide();
    });

    _xem.on("studio:guide-open", () => {
      this._open_guide_portlet("project-plan-card");
    });

    _xem.on("studio:guide-set-focus", async () => {
      await this._set_project_memory_focus();
    });

    _xem.on("studio:guide-recommendation-do-it", () => {
      void this._start_guide_recommendation();
    });

    _xem.on("studio:guide-active-recommendation-retry", () => {
      void this._retry_guide_active_recommendation();
    });

    _xem.on("studio:guide-active-recommendation-cancel", () => {
      this._cancel_guide_active_recommendation();
    });

    _xem.on("project-memory:loaded", () => {
      this._render_project_memory_guide();
      this._render_conversation_messages();
      void this._load_guide_recommendation("project-memory-loaded-event");
    });

    _xem.on("project-memory:saved", () => {
      this._render_project_memory_guide();
      this._render_conversation_messages();
      void this._load_guide_recommendation("project-memory-saved-event");
    });

    _xem.on("project-memory:error", (payload: any) => {
      const evt = this._normalize_event_payload(payload);
      this._error("project memory event error", {
        _error: is_obj(evt) ? evt._error : evt,
      });
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

    _xem.on("studio:conversation-capability-guidance", async () => {
      await this._send_capability_guidance_request();
    });

    _xem.on("studio:capability-example", (payload: any) => {
      this._insert_capability_example_prompt(payload);
    });

    _xem.on("studio:planning-quick-start", async (payload: any) => {
      await this._handle_planning_quick_start(payload);
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

    _xem.on("studio:artifact-request-apply", (payload: any) => {
      void this._apply_conversation_artifact_request(payload);
    });

    _xem.on("studio:artifact-request-dismiss", (payload: any) => {
      void this._dismiss_conversation_artifact_request(payload);
    });

    _xem.on("studio:mutation-plan-view-details", (payload: any) => {
      this._show_mutation_plan_details(payload);
    });

    _xem.on("studio:project-plan-review-toggle", (payload: any) => {
      this._toggle_project_plan_review(payload);
    });

    _xem.on("studio:project-plan-action", (payload: any) => {
      this._insert_project_plan_action_prompt(payload);
    });

    _xem.on("studio:project-plan-confirm", (payload: any) => {
      void this._confirm_project_plan(payload);
    });

    _xem.on("studio:planning-question-toggle", (payload: any) => {
      this._toggle_planning_question_answer(payload);
    });

    _xem.on("studio:planning-question-send", async (payload: any) => {
      await this._send_planning_question_answer(payload);
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

    _xem.on("studio:selected-object:interaction-add-click", () => {
      this._add_selected_object_click_interaction();
    });

    _xem.on("studio:selected-object:interaction-remove-click", () => {
      this._remove_selected_object_click_interaction();
    });

    _xem.on("studio:selected-object:interaction-view-changed", () => {
      this._handle_selected_object_interaction_view_changed();
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
    this.register_shortcuts();
  }

  register_shortcuts() {
    this.unregister_shortcuts();
    if (typeof document === "undefined") return;

    this._shortcut_keydown_handler = (event: KeyboardEvent) => {
      const key = String(event.key ?? "").toLowerCase();

      if (key === "escape" && this._object_picker_active) {
        event.preventDefault();
        event.stopPropagation();
        this._cancel_object_picker();
        return;
      }

      if (key === "escape" && this._arrange_mode_active) {
        event.preventDefault();
        event.stopPropagation();
        if (this._arrange_drag_source || this._arrange_dragging || this._arrange_drop_preview) {
          this._clear_arrange_drag_state();
        } else {
          this._cancel_arrange_mode();
        }
        return;
      }

      if (key !== "c" || event.shiftKey !== true || (event.metaKey !== true && event.ctrlKey !== true)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this._toggle_object_picker();
    };
    document.addEventListener("keydown", this._shortcut_keydown_handler, true);
    this._shortcuts_registered = true;
    XStudioModule._shortcut_owner = this;
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
    this._cancel_object_picker();
    this._cancel_arrange_mode();
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
    this._cancel_object_picker();
    this._cancel_arrange_mode();
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

  private _left_sidebar_width_bounds() {
    let available_width = 0;

    if (typeof document !== "undefined") {
      const body = document.getElementById?.("xstudio-body");
      const body_rect_width = body?.getBoundingClientRect?.().width;
      if (typeof body_rect_width === "number" && Number.isFinite(body_rect_width) && body_rect_width > 0) {
        available_width = body_rect_width;
      }
    }

    if (available_width <= 0 && typeof window !== "undefined") {
      const inner_width = Number((window as any).innerWidth);
      if (Number.isFinite(inner_width) && inner_width > 0) {
        available_width = inner_width;
      }
    }

    if (available_width <= 0) available_width = 1280;

    let right_width = this._right_dock_collapsed ? 0 : STUDIO_RIGHT_SIDEBAR_WIDTH_FALLBACK;
    if (!this._right_dock_collapsed) {
      const right = XUI.getObject("xstudio-right-dock") as any;
      const right_rect_width = right?.dom?.getBoundingClientRect?.().width;
      if (typeof right_rect_width === "number" && Number.isFinite(right_rect_width) && right_rect_width > 0) {
        right_width = right_rect_width;
      }
    }

    const canvas_safe_max = available_width - right_width - STUDIO_CANVAS_MIN_WIDTH;
    const max_width = Math.max(
      STUDIO_LEFT_SIDEBAR_MIN_WIDTH,
      Math.min(STUDIO_LEFT_SIDEBAR_MAX_WIDTH_FALLBACK, Math.floor(canvas_safe_max)),
    );

    return {
      _min: STUDIO_LEFT_SIDEBAR_MIN_WIDTH,
      _max: max_width,
    };
  }

  private _normalize_left_sidebar_width(value: any, fallback = STUDIO_LEFT_SIDEBAR_DEFAULT_WIDTH) {
    const raw = typeof value === "string" ? value.trim().replace(/px$/i, "") : value;
    const numeric = Number(raw);
    const base = Number.isFinite(numeric) ? numeric : fallback;
    const bounds = this._left_sidebar_width_bounds();
    return Math.min(bounds._max, Math.max(bounds._min, Math.round(base)));
  }

  private _read_persisted_left_sidebar_width() {
    if (typeof window === "undefined") return STUDIO_LEFT_SIDEBAR_DEFAULT_WIDTH;

    try {
      const saved = window.localStorage?.getItem(STUDIO_LEFT_SIDEBAR_WIDTH_STORAGE_KEY);
      if (saved === null || saved === undefined || String(saved).trim() === "") {
        return STUDIO_LEFT_SIDEBAR_DEFAULT_WIDTH;
      }
      return this._normalize_left_sidebar_width(saved, STUDIO_LEFT_SIDEBAR_DEFAULT_WIDTH);
    } catch (err) {
      _xlog.debug("[xstudio] left sidebar width persistence read skipped", err);
      return STUDIO_LEFT_SIDEBAR_DEFAULT_WIDTH;
    }
  }

  private _persist_left_sidebar_width(width = this._left_sidebar_width) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage?.setItem(STUDIO_LEFT_SIDEBAR_WIDTH_STORAGE_KEY, String(width));
    } catch (err) {
      _xlog.debug("[xstudio] left sidebar width persistence write skipped", err);
    }
  }

  private _apply_left_sidebar_width_to_view_data(root: Record<string, any>) {
    root._style = {
      ...(is_obj(root._style) ? root._style : {}),
      "--xstudio-left-width": `${this._normalize_left_sidebar_width(this._left_sidebar_width)}px`,
    };
  }

  private _apply_left_sidebar_width_to_dom() {
    const shell = XUI.getObject(STUDIO_SHELL_ID) as any;
    const dom = shell?.dom;
    if (!(dom instanceof HTMLElement)) return;

    const width = this._normalize_left_sidebar_width(this._left_sidebar_width);
    this._left_sidebar_width = width;
    dom.style.setProperty("--xstudio-left-width", `${width}px`);

    const divider = XUI.getObject(STUDIO_LEFT_RESIZE_DIVIDER_ID) as any;
    const divider_dom = divider?.dom;
    if (divider_dom instanceof HTMLElement) {
      const bounds = this._left_sidebar_width_bounds();
      divider_dom.setAttribute("aria-valuemin", String(bounds._min));
      divider_dom.setAttribute("aria-valuemax", String(bounds._max));
      divider_dom.setAttribute("aria-valuenow", String(width));
      divider_dom.setAttribute("aria-disabled", String(this._left_dock_collapsed));
    }
  }

  private _set_left_sidebar_width(width: any, persist = false) {
    this._left_sidebar_width = this._normalize_left_sidebar_width(width, this._left_sidebar_width);
    this._apply_left_sidebar_width_to_dom();
    if (persist) this._persist_left_sidebar_width();
    return this._left_sidebar_width;
  }

  private _reset_left_sidebar_width() {
    return this._set_left_sidebar_width(STUDIO_LEFT_SIDEBAR_DEFAULT_WIDTH, true);
  }

  private _set_left_sidebar_resizing(active: boolean) {
    const shell = XUI.getObject(STUDIO_SHELL_ID) as any;
    if (active) {
      shell?.addClass?.("xstudio-left-resizing");
    } else {
      shell?.removeClass?.("xstudio-left-resizing");
    }

    if (typeof document !== "undefined" && document.body instanceof HTMLElement) {
      document.body.classList.toggle("xstudio-left-resizing", active);
    }
  }

  private _event_client_x(event: any) {
    const touch = event?.touches?.[0] ?? event?.changedTouches?.[0];
    const value = touch?.clientX ?? event?.clientX;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private _start_left_sidebar_resize(event: any) {
    if (this._left_dock_collapsed) return;
    if (event?.button !== undefined && event.button !== 0) return;

    const client_x = this._event_client_x(event);
    if (client_x === null) return;
    const pointer_id = Number(event?.pointerId);
    if (!Number.isFinite(pointer_id)) return;

    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      event?.currentTarget?.setPointerCapture?.(pointer_id);
    } catch (err) {
      _xlog.debug("[xstudio] left sidebar pointer capture skipped", err);
    }

    this._left_sidebar_resize_drag_state = {
      _start_x: client_x,
      _start_width: this._left_sidebar_width,
      _pointer_id: pointer_id,
    };
    this._set_left_sidebar_resizing(true);
  }

  private _move_left_sidebar_resize(event: any) {
    if (!this._left_sidebar_resize_drag_state) return;
    if (Number(event?.pointerId) !== this._left_sidebar_resize_drag_state._pointer_id) return;

    const client_x = this._event_client_x(event);
    if (client_x === null) return;

    event?.preventDefault?.();
    event?.stopPropagation?.();

    const delta = client_x - this._left_sidebar_resize_drag_state._start_x;
    this._set_left_sidebar_width(this._left_sidebar_resize_drag_state._start_width + delta, false);
  }

  private _finish_left_sidebar_resize(event?: any) {
    if (!this._left_sidebar_resize_drag_state) return;
    if (event && Number(event?.pointerId) !== this._left_sidebar_resize_drag_state._pointer_id) return;

    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      const target = event?.currentTarget;
      const pointer_id = this._left_sidebar_resize_drag_state._pointer_id;
      if (target?.hasPointerCapture?.(pointer_id) !== false) {
        target?.releasePointerCapture?.(pointer_id);
      }
    } catch (err) {
      _xlog.debug("[xstudio] left sidebar pointer capture release skipped", err);
    }

    this._left_sidebar_resize_drag_state = null;
    this._set_left_sidebar_resizing(false);
    this._persist_left_sidebar_width();
  }

  private _handle_left_sidebar_resize_keydown(event: KeyboardEvent) {
    if (this._left_dock_collapsed) return;

    const step = event.shiftKey ? 32 : 16;
    const bounds = this._left_sidebar_width_bounds();
    let next: number | null = null;

    if (event.key === "ArrowLeft") next = this._left_sidebar_width - step;
    if (event.key === "ArrowRight") next = this._left_sidebar_width + step;
    if (event.key === "Home") next = bounds._min;
    if (event.key === "End") next = bounds._max;
    if (event.key === "Enter") next = STUDIO_LEFT_SIDEBAR_DEFAULT_WIDTH;

    if (next === null) return;

    event.preventDefault();
    event.stopPropagation();
    this._set_left_sidebar_width(next, true);
  }

  private _bind_left_sidebar_resize_divider() {
    const divider = XUI.getObject(STUDIO_LEFT_RESIZE_DIVIDER_ID) as any;
    const dom = divider?.dom;
    if (!(dom instanceof HTMLElement)) return;

    if (this._left_sidebar_resize_bound && this._left_sidebar_resize_divider_dom === dom) {
      this._apply_left_sidebar_width_to_dom();
      return;
    }

    if (this._left_sidebar_resize_bound && this._left_sidebar_resize_divider_dom) {
      this._left_sidebar_resize_divider_dom.removeEventListener(
        "pointerdown",
        this._left_sidebar_pointer_down_handler as any,
      );
      this._left_sidebar_resize_divider_dom.removeEventListener(
        "pointermove",
        this._left_sidebar_move_handler as any,
      );
      this._left_sidebar_resize_divider_dom.removeEventListener(
        "pointerup",
        this._left_sidebar_up_handler as any,
      );
      this._left_sidebar_resize_divider_dom.removeEventListener(
        "pointercancel",
        this._left_sidebar_up_handler as any,
      );
      this._left_sidebar_resize_divider_dom.removeEventListener(
        "dblclick",
        this._left_sidebar_double_click_handler as any,
      );
      this._left_sidebar_resize_divider_dom.removeEventListener(
        "keydown",
        this._left_sidebar_keydown_handler as any,
      );
      window.removeEventListener?.("resize", this._left_sidebar_window_resize_handler as any);
      this._left_sidebar_resize_bound = false;
    }

    const down_handler = (event: any) => this._start_left_sidebar_resize(event);
    const double_click_handler = (event: any) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      this._reset_left_sidebar_width();
    };
    const keydown_handler = (event: KeyboardEvent) => this._handle_left_sidebar_resize_keydown(event);
    const window_resize_handler = () => this._apply_left_sidebar_width_to_dom();
    const move_handler = (event: any) => this._move_left_sidebar_resize(event);
    const up_handler = (event: any) => this._finish_left_sidebar_resize(event);

    this._left_sidebar_pointer_down_handler = down_handler;
    this._left_sidebar_double_click_handler = double_click_handler;
    this._left_sidebar_keydown_handler = keydown_handler;
    this._left_sidebar_window_resize_handler = window_resize_handler;
    this._left_sidebar_move_handler = move_handler;
    this._left_sidebar_up_handler = up_handler;

    dom.addEventListener("pointerdown", down_handler);
    dom.addEventListener("pointermove", move_handler);
    dom.addEventListener("pointerup", up_handler);
    dom.addEventListener("pointercancel", up_handler);
    dom.addEventListener("dblclick", double_click_handler);
    dom.addEventListener("keydown", keydown_handler);
    window.addEventListener?.("resize", window_resize_handler);

    this._left_sidebar_resize_bound = true;
    this._left_sidebar_resize_divider_dom = dom;
    this._apply_left_sidebar_width_to_dom();
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

  private _object_picker_shortcut_text() {
    const platform = typeof navigator !== "undefined"
      ? String(navigator.platform ?? "").toLowerCase()
      : "";
    const is_mac = platform.includes("mac") || platform.includes("iphone") || platform.includes("ipad");
    return is_mac || !platform ? "⌘⇧C" : "Ctrl+Shift+C";
  }

  private _object_picker_button_title() {
    return `Select object from canvas (${this._object_picker_shortcut_text()})`;
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
    button["aria-label"] = title;
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

  private _set_view_data_object_picker_button_state(root: Record<string, any>) {
    for (const object_id of STUDIO_OBJECT_PICKER_TOGGLE_IDS) {
      const button = this._find_view_data(root, object_id);
      if (!button) continue;

      const title = this._object_picker_button_title();
      button.title = title;
      button["aria-label"] = title;
      button["aria-pressed"] = String(this._object_picker_active);
      this._set_class_token_on_data(
        button,
        STUDIO_OBJECT_PICKER_TOGGLE_ACTIVE_CLASS,
        this._object_picker_active,
      );
    }
  }

  private _set_view_data_arrange_button_state(root: Record<string, any>) {
    for (const object_id of STUDIO_ARRANGE_TOGGLE_IDS) {
      const button = this._find_view_data(root, object_id);
      if (!button) continue;

      button.title = "Arrange objects";
      button["aria-label"] = "Arrange objects";
      button["aria-pressed"] = String(this._arrange_mode_active);
      this._set_class_token_on_data(
        button,
        STUDIO_ARRANGE_TOGGLE_ACTIVE_CLASS,
        this._arrange_mode_active,
      );
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
    this._set_view_data_object_picker_button_state(view);
    this._set_view_data_arrange_button_state(view);

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
    this._apply_left_sidebar_width_to_view_data(shell);

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

    this._append_project_memory_guide_to_shell(shell);
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
      button.dom.setAttribute("aria-label", title);
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

  private _apply_object_picker_button_state() {
    this._set_shell_class_enabled(STUDIO_OBJECT_PICKER_ACTIVE_CLASS, this._object_picker_active);
    const title = this._object_picker_button_title();

    for (const object_id of STUDIO_OBJECT_PICKER_TOGGLE_IDS) {
      this._set_object_class_token(
        object_id,
        STUDIO_OBJECT_PICKER_TOGGLE_ACTIVE_CLASS,
        this._object_picker_active,
      );
      this._set_object_attribute(object_id, "aria-pressed", String(this._object_picker_active));
      this._set_button_title(object_id, title);
    }
  }

  private _apply_arrange_button_state() {
    this._set_shell_class_enabled(STUDIO_ARRANGE_ACTIVE_CLASS, this._arrange_mode_active);
    if (typeof document !== "undefined") {
      document.body?.classList?.toggle?.(STUDIO_ARRANGE_ACTIVE_CLASS, this._arrange_mode_active);
    }

    for (const object_id of STUDIO_ARRANGE_TOGGLE_IDS) {
      this._set_object_class_token(
        object_id,
        STUDIO_ARRANGE_TOGGLE_ACTIVE_CLASS,
        this._arrange_mode_active,
      );
      this._set_object_attribute(object_id, "aria-pressed", String(this._arrange_mode_active));
      this._set_button_title(object_id, "Arrange objects");
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
    this._conversation_action_result = {};
    this._mutation_plan_collapsed = {};
    this._mutation_plan_execution_state = {};
    this._debug_log("conversation action transient state reset", {
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
      ...(is_obj(value._metadata) ? { _metadata: { ...value._metadata } } : {}),
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

  private _conversation_runtime_skills_context() {
    let runtime_skills_raw: unknown = {};
    try {
      const get_skills = (_x as any).getSkills;
      if (typeof get_skills === "function") {
        runtime_skills_raw = get_skills.call(_x);
      }
    } catch (err) {
      this._debug_log("runtime skill collection skipped", {
        _error: to_err(err),
      });
    }

    const snapshot = runtime_skill_compact_snapshot(runtime_skills_raw);
    if (this._debug_enabled()) {
      _xlog.debug("[xstudio] runtime component skills collected", snapshot._component_diagnostics);
    }
    return snapshot._runtime_skills;
  }

  private _conversation_runtime_context() {
    const active_view_id = this._resolve_studio_target_view_id();
    const selected_object = this._conversation_selected_object_context();
    const active_recommendation = this._active_guide_recommendation();
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
      ...(active_recommendation
        ? {
          _guide_active_recommendation: {
            _title: this._guide_task_title(active_recommendation),
            _reason: active_recommendation._reason,
            _type: active_recommendation._type,
            _action: active_recommendation._action,
          },
        }
        : {}),
      ...(Object.keys(available_artifacts).length > 0
        ? { _available_artifacts: available_artifacts }
        : {}),
      _runtime_skills: this._conversation_runtime_skills_context(),
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

  private _conversation_prompt_key(text: string) {
    return _xu.normalize_prompt_key(text) || text.trim().toLowerCase();
  }

  private _begin_conversation_analysis_request(text: string, message_id: string): XStudioConversationAnalysisRequest {
    const request = {
      _request_id: ++this._conversation_analysis_seq,
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      _message_id: message_id,
      _prompt_key: this._conversation_prompt_key(text),
    };
    this._active_conversation_analysis_request = request;
    return request;
  }

  private _conversation_analysis_request_is_current(request: XStudioConversationAnalysisRequest | null) {
    const active = this._active_conversation_analysis_request;
    return Boolean(
      request &&
      active &&
      active._request_id === request._request_id &&
      active._app_id === request._app_id &&
      active._env === request._env &&
      active._conversation_id === request._conversation_id &&
      active._message_id === request._message_id,
    );
  }

  private _finish_conversation_analysis_request(request: XStudioConversationAnalysisRequest | null) {
    if (this._conversation_analysis_request_is_current(request)) {
      this._active_conversation_analysis_request = null;
    }
  }

  private _conversation_message_is_analyze_result(message: XStudioConversationMessage) {
    return (
      (message._role === "tool" || message._role === "assistant") &&
      message._metadata?._source === "xvibe.analyze-message"
    );
  }

  private _conversation_message_prompt_key(message: XStudioConversationMessage) {
    const normalized_prompt =
      typeof message._metadata?._normalized_prompt === "string"
        ? message._metadata._normalized_prompt.trim()
        : "";
    if (normalized_prompt) return this._conversation_prompt_key(normalized_prompt);
    return "";
  }

  private _remember_conversation_analysis_timeout(request: XStudioConversationAnalysisRequest | null) {
    if (!request?._prompt_key) return;
    this._timed_out_conversation_analysis_prompt_keys.add(request._prompt_key);
    delete this._completed_conversation_analysis_prompt_keys[request._prompt_key];
  }

  private _remember_conversation_analysis_success(request: XStudioConversationAnalysisRequest | null) {
    if (!request?._prompt_key) return;
    if (!this._timed_out_conversation_analysis_prompt_keys.has(request._prompt_key)) return;
    this._completed_conversation_analysis_prompt_keys[request._prompt_key] = new Date().toISOString();
  }

  private _filter_stale_conversation_analysis_messages(messages: XStudioConversationMessage[]) {
    if (this._timed_out_conversation_analysis_prompt_keys.size === 0) return messages;

    const ignored = new Set(this._ignored_conversation_analysis_message_ids);
    for (const prompt_key of this._timed_out_conversation_analysis_prompt_keys) {
      const candidates = messages
        .map((message, index) => ({ message, index }))
        .filter(({ message }) =>
          this._conversation_message_is_analyze_result(message) &&
          this._conversation_message_prompt_key(message) === prompt_key &&
          typeof message._id === "string" &&
          !ignored.has(message._id),
        );
      if (candidates.length === 0) continue;

      const completed_at = this._completed_conversation_analysis_prompt_keys[prompt_key] || "";
      const completed_time = Date.parse(completed_at);
      if (!Number.isFinite(completed_time)) {
        for (const { message } of candidates) {
          ignored.add(message._id as string);
        }
        continue;
      }

      let keep_index = -1;
      let keep_time = -Infinity;
      for (const { message, index } of candidates) {
        const created_time = Date.parse(message._created_at);
        if (!Number.isFinite(created_time) || created_time > completed_time) continue;
        if (created_time >= keep_time) {
          keep_time = created_time;
          keep_index = index;
        }
      }

      for (const { message, index } of candidates) {
        if (index !== keep_index) {
          ignored.add(message._id as string);
        }
      }
    }

    this._ignored_conversation_analysis_message_ids = ignored;
    return messages.filter((message) => !message._id || !ignored.has(message._id));
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

    const result = await this._send_xvibe_command("analyze-message", params, {
      _timeout_ms: STUDIO_ANALYZE_MESSAGE_TIMEOUT_MS,
    });
    this._log("analyze-message completed", {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      ...(is_obj(result?._intent) ? { _intent: result._intent } : {}),
    });
    return result;
  }

  private _conversation_analyze_failed_message(err: any) {
    return this._is_timeout_error(err)
      ? STUDIO_ANALYZE_MESSAGE_TIMEOUT_TEXT
      : `Analyze message failed: ${to_err(err)}`;
  }

  private _conversation_analyze_failure_debug_intent(err: any, request: XStudioConversationAnalysisRequest | null) {
    const timeout = this._is_timeout_error(err);
    return {
      _message_type: "error",
      _execution_level: "none",
      _confidence: 0,
      _error: timeout ? STUDIO_ANALYZE_MESSAGE_TIMEOUT_TEXT : to_err(err),
      _details: {
        _operation: "xvibe.analyze-message",
        _request_id: request?._request_id,
        _app_id: request?._app_id,
        _env: request?._env,
        _conversation_id: request?._conversation_id,
        _message_id: request?._message_id,
        _timeout_ms: timeout ? STUDIO_ANALYZE_MESSAGE_TIMEOUT_MS : undefined,
        _raw_error: err,
      },
    };
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
    this._render_guide_active_recommendation();
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

    this._conversation_messages = this._filter_stale_conversation_analysis_messages(messages);
    if (!this._conversation_preserve_transient_load) {
      this._conversation_transient_messages = [];
    }
    this._reset_conversation_action_transient_state();
    this._planning_question_multi_answers = {};
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
    if (!this._server_ready()) {
      this._mark_pending_server_refresh("conversation");
      return;
    }

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
      this._conversation_transient_messages = [];
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
    this._conversation_transient_messages = [];
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

  private async _append_conversation_message(
    text: string,
    options: XStudioAppendConversationMessageOptions = {},
  ) {
    if (!this._can_edit()) return;
    this._render_pending_conversation_analysis(text);
    const preserve_transient_load = this._conversation_preserve_transient_load;
    this._conversation_preserve_transient_load = true;
    try {
      await this._ensure_conversation_for_current_context();
    } finally {
      this._conversation_preserve_transient_load = preserve_transient_load;
    }
    if (!this._conversation_app_id || !this._conversation_env || !this._conversation_id) {
      this._retain_active_guide_recommendation_after_failure(
        "conversation-context-missing",
      );
      return;
    }

    let append_succeeded = false;
    let analyze_succeeded = false;
    let analyze_result: any = null;
    let failed_message = "";
    let failed_debug_intent: Record<string, any> | null = null;
    let analysis_request: XStudioConversationAnalysisRequest | null = null;

    try {
      const append_result = await this._send_xvibe_command("append-message", {
        _app_id: this._conversation_app_id,
        _env: this._conversation_env,
        _conversation_id: this._conversation_id,
        _message: {
          _role: "user",
          _text: text,
        },
      });
      append_succeeded = true;
      this._log("conversation message appended", {
        _app_id: this._conversation_app_id,
        _env: this._conversation_env,
        _conversation_id: this._conversation_id,
        _role: "user",
      });

      const message_id = this._conversation_append_message_id(append_result);
      if (options._analyze === false) {
        return {
          _ok: true,
          _message_id: message_id,
          _append_result: append_result,
        };
      }

      analysis_request = this._begin_conversation_analysis_request(text, message_id);
      this._log("conversation analyze pending", {
        _app_id: this._conversation_app_id,
        _env: this._conversation_env,
        _conversation_id: this._conversation_id,
        ...(message_id ? { _message_id: message_id } : {}),
      });
      analyze_result = await this._analyze_conversation_message(
        text,
        message_id,
      );
      if (!this._conversation_analysis_request_is_current(analysis_request)) {
        this._log("conversation analyze result ignored", {
          _reason: "stale-request",
          _request_id: analysis_request._request_id,
          _conversation_id: analysis_request._conversation_id,
          _message_id: analysis_request._message_id,
        });
        return;
      }
      this._remember_conversation_analysis_success(analysis_request);
      this._log("conversation analyze completed", {
        _app_id: this._conversation_app_id,
        _env: this._conversation_env,
        _conversation_id: this._conversation_id,
      });
      analyze_succeeded = true;
    } catch (err) {
      if (analysis_request && !this._conversation_analysis_request_is_current(analysis_request)) {
        this._log("conversation analyze error ignored", {
          _reason: "stale-request",
          _request_id: analysis_request?._request_id,
          _conversation_id: analysis_request?._conversation_id,
          _message_id: analysis_request?._message_id,
          _error: to_err(err),
        });
        return;
      }
      if (this._is_timeout_error(err)) {
        this._remember_conversation_analysis_timeout(analysis_request);
      }
      failed_message = this._conversation_analyze_failed_message(err);
      failed_debug_intent = this._conversation_analyze_failure_debug_intent(err, analysis_request);
      this._write_studio_status(failed_message);
      this._error("conversation analyze failed", {
        _app_id: this._conversation_app_id,
        _env: this._conversation_env,
        _conversation_id: this._conversation_id,
        _error: to_err(err),
      });
    } finally {
      if (analysis_request && !this._conversation_analysis_request_is_current(analysis_request)) {
        return;
      }

      try {
        if (this._conversation_app_id && this._conversation_env) {
          try {
            await this._list_conversations(this._conversation_app_id, this._conversation_env);
            await this._load_conversation_messages();
          } catch (load_err) {
            if (!failed_message) {
              failed_message = `Load conversation failed: ${to_err(load_err)}`;
              this._write_studio_status(failed_message);
              this._error("conversation analyze failed", {
                _app_id: this._conversation_app_id,
                _env: this._conversation_env,
                _conversation_id: this._conversation_id,
                _error: to_err(load_err),
              });
            }
          }
        }

        if (failed_message) {
          this._render_failed_conversation_analysis(text, failed_message, append_succeeded, failed_debug_intent);
          this._retain_active_guide_recommendation_after_failure(
            "conversation-analyze-failed",
            failed_message,
          );
        } else if (
          analyze_succeeded &&
          !this._active_generation_id &&
          !this._conversation_analyze_requires_follow_up(analyze_result)
        ) {
          await this._complete_active_guide_recommendation("conversation-analyze-completed");
        }
      } finally {
        this._finish_conversation_analysis_request(analysis_request);
      }
    }
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
    const raw = action._id ?? action.id ?? action._action_id ?? action.action_id;
    if (raw === undefined || raw === null) return "";
    return String(raw).trim();
  }

  private _intent_action_optional_boolean(action: Record<string, any>, key: string) {
    const raw = action[`_${key}`] ?? action[key];
    return typeof raw === "boolean" ? raw : undefined;
  }

  private _first_present_value(source: Record<string, any>, keys: string[]) {
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
        return source[key];
      }
    }
    return undefined;
  }

  private _first_display_text(source: Record<string, any>, keys: string[]) {
    const value = this._first_present_value(source, keys);
    return typeof value === "string" && value.trim()
      ? value.trim()
      : value === undefined || value === null
        ? ""
        : String(value).trim();
  }

  private _recommendation_candidates(source: any): any[] {
    const unwrapped = is_obj(source) && "_result" in source ? source._result : source;
    if (Array.isArray(unwrapped)) return unwrapped.filter((item) => is_obj(item));
    if (!is_obj(unwrapped)) return [];

    const candidate_arrays = [
      unwrapped._recommendations,
      unwrapped.recommendations,
      unwrapped._candidates,
      unwrapped.candidates,
      unwrapped._options,
      unwrapped.options,
      unwrapped._crud_recommendations,
      unwrapped.crud_recommendations,
    ];
    for (const candidate_array of candidate_arrays) {
      if (Array.isArray(candidate_array)) {
        return candidate_array.filter((item) => is_obj(item));
      }
    }

    const single = unwrapped._recommendation ??
      unwrapped.recommendation ??
      unwrapped._next_recommendation ??
      unwrapped.next_recommendation ??
      unwrapped._guide_recommendation ??
      unwrapped.guide_recommendation;
    if (is_obj(single)) return [single];

    return is_obj(unwrapped) ? [unwrapped] : [];
  }

  private _recommendation_action_source(recommendation: Record<string, any>) {
    const direct = recommendation._action ?? recommendation.action;
    if (is_obj(direct)) return direct;
    if (
      recommendation._execution_payload !== undefined ||
      recommendation.execution_payload !== undefined ||
      recommendation._command !== undefined ||
      recommendation.command !== undefined ||
      recommendation._payload !== undefined ||
      recommendation.payload !== undefined ||
      recommendation._action_type !== undefined ||
      recommendation.action_type !== undefined
    ) {
      return recommendation;
    }
    return {};
  }

  private _recommendation_type_text(recommendation: Record<string, any>) {
    const action = this._recommendation_action_source(recommendation);
    return [
      this._first_display_text(recommendation, [
        "_recommendation_type",
        "recommendation_type",
        "_type",
        "type",
        "_capability",
        "capability",
        "_capability_type",
        "capability_type",
        "_artifact_type",
        "artifact_type",
      ]),
      this._first_display_text(action, [
        "_recommendation_type",
        "recommendation_type",
        "_type",
        "type",
        "_action_type",
        "action_type",
        "_capability",
        "capability",
      ]),
      this._first_display_text(recommendation, ["_title", "title"]),
      this._first_display_text(action, ["_title", "title", "_label", "label", "_prompt", "prompt"]),
    ].filter(Boolean).join(" ").toLowerCase();
  }

  private _is_crud_recommendation(recommendation: any) {
    if (!is_obj(recommendation)) return false;
    const type_text = this._recommendation_type_text(recommendation);
    return /\bcrud\b/.test(type_text) ||
      /\bcreate-read-update-delete\b/.test(type_text) ||
      type_text.includes("data screens actions");
  }

  private _recommendation_entity_name(recommendation: Record<string, any>) {
    const action = this._recommendation_action_source(recommendation);
    const direct = this._first_display_text(recommendation, [
      "_recommendation_entity_name",
      "recommendation_entity_name",
      "_entity_name",
      "entity_name",
      "_entity",
      "entity",
      "_data_name",
      "data_name",
      "_record_name",
      "record_name",
    ]) || this._first_display_text(action, [
      "_entity_name",
      "entity_name",
      "_entity",
      "entity",
      "_data_name",
      "data_name",
      "_record_name",
      "record_name",
    ]);
    if (direct) return direct;

    const params = is_obj(action._params ?? action.params) ? action._params ?? action.params : null;
    if (!is_obj(params)) return "";
    return this._first_display_text(params, [
      "_entity_name",
      "entity_name",
      "_entity",
      "entity",
      "_data_name",
      "data_name",
      "_record_name",
      "record_name",
    ]);
  }

  private _recommendation_artifact_label(value: any) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (!is_obj(value)) return "";

    const label = this._first_display_text(value, [
      "_label",
      "label",
      "_title",
      "title",
      "_name",
      "name",
      "_description",
      "description",
      "_id",
      "id",
    ]);
    const kind = this._first_display_text(value, [
      "_kind",
      "kind",
      "_type",
      "type",
      "_artifact_type",
      "artifact_type",
    ]);
    if (label && kind && !label.toLowerCase().includes(kind.toLowerCase())) return `${label} ${kind}`;
    return label || kind;
  }

  private _recommendation_expected_artifacts(recommendation: Record<string, any>) {
    const action = this._recommendation_action_source(recommendation);
    const source = this._first_present_value(recommendation, [
      "_recommendation_expected_artifacts",
      "recommendation_expected_artifacts",
      "_expected_created_artifacts",
      "expected_created_artifacts",
      "_expected_artifacts",
      "expected_artifacts",
      "_created_artifacts",
      "created_artifacts",
      "_creates",
      "creates",
      "_artifacts",
      "artifacts",
    ]) ?? this._first_present_value(action, [
      "_expected_created_artifacts",
      "expected_created_artifacts",
      "_expected_artifacts",
      "expected_artifacts",
      "_created_artifacts",
      "created_artifacts",
      "_creates",
      "creates",
      "_artifacts",
      "artifacts",
    ]) ?? this._first_present_value(
      is_obj(action._artifact_request) ? action._artifact_request : {},
      [
        "_expected_created_artifacts",
        "expected_created_artifacts",
        "_expected_artifacts",
        "expected_artifacts",
        "_created_artifacts",
        "created_artifacts",
        "_creates",
        "creates",
        "_artifacts",
        "artifacts",
      ],
    );

    if (Array.isArray(source)) {
      return source
        .map((item) => this._recommendation_artifact_label(item))
        .filter((item) => item.length > 0);
    }

    if (typeof source === "string" && source.trim()) {
      return source
        .split(/\r?\n|,/)
        .map((item) => item.replace(/^\s*[-*•]\s*/, "").trim())
        .filter((item) => item.length > 0);
    }

    return [];
  }

  private _recommendation_is_marked_recommended(recommendation: Record<string, any>, index: number) {
    const raw = recommendation._recommended ??
      recommendation.recommended ??
      recommendation._is_recommended ??
      recommendation.is_recommended ??
      recommendation._primary ??
      recommendation.primary;
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "string") {
      const normalized = raw.trim().toLowerCase();
      if (normalized === "true" || normalized === "recommended" || normalized === "primary") return true;
      if (normalized === "false") return false;
    }
    return index === 0;
  }

  private _recommendation_dependency_text(recommendation: Record<string, any>, index: number) {
    const dependency = this._first_display_text(recommendation, [
      "_recommendation_dependency",
      "recommendation_dependency",
      "_dependency",
      "dependency",
      "_dependency_text",
      "dependency_text",
      "_depends_on",
      "depends_on",
      "_after",
      "after",
      "_blocked_by",
      "blocked_by",
    ]);
    if (dependency) {
      if (
        dependency.startsWith("After ") ||
        dependency.startsWith("After:") ||
        dependency.startsWith("Order:") ||
        dependency.startsWith("Option ")
      ) {
        return dependency;
      }
      return `After: ${dependency}`;
    }

    const order = this._first_display_text(recommendation, [
      "_order",
      "order",
      "_sequence",
      "sequence",
      "_step",
      "step",
    ]);
    if (order) return `Order: ${order}`;

    return `Option ${index + 1}`;
  }

  private _normalize_crud_recommendation_action(
    recommendation: Record<string, any>,
    index: number,
    total: number,
    message: XStudioConversationMessage | null = null,
    message_index = 0,
  ): Record<string, any> {
    const raw_action = this._recommendation_action_source(recommendation);
    const action = { ...raw_action };
    const title = this._first_display_text(action, [
      "_button_label",
      "button_label",
      "_label",
      "label",
      "_title",
      "title",
      "_prompt",
      "prompt",
    ]) || this._first_display_text(recommendation, ["_title", "title"]) || "Build CRUD foundation";
    const description = this._first_display_text(recommendation, [
      "_explanation",
      "explanation",
      "_description",
      "description",
      "_reason",
      "reason",
    ]) || this._first_display_text(action, ["_description", "description", "_reason", "reason"]);
    const action_type = this._first_display_text(action, [
      "_action_type",
      "action_type",
      "_type",
      "type",
    ]) || "crud-recommendation";
    const action_id = this._intent_action_persisted_id(action);
    const recommended = this._recommendation_is_marked_recommended(recommendation, index);
    const badge = recommended
      ? "Recommended"
      : total > 1
        ? `Option ${index + 1}`
        : "Recommended";

    if (!is_obj(action._execution_payload) && is_obj(recommendation._execution_payload)) {
      action._execution_payload = recommendation._execution_payload;
    }
    if (!is_obj(action.execution_payload) && is_obj(recommendation.execution_payload)) {
      action.execution_payload = recommendation.execution_payload;
    }
    if (!is_obj(action._command) && is_obj(recommendation._command)) {
      action._command = recommendation._command;
    }
    if (!is_obj(action.command) && is_obj(recommendation.command)) {
      action.command = recommendation.command;
    }
    if (!is_obj(action._payload) && is_obj(recommendation._payload)) {
      action._payload = recommendation._payload;
    }
    if (!is_obj(action.payload) && is_obj(recommendation.payload)) {
      action.payload = recommendation.payload;
    }

    if (typeof action._executable !== "boolean" && typeof action.executable !== "boolean") {
      const recommendation_executable = this._intent_action_optional_boolean(recommendation, "executable");
      action._executable = typeof recommendation_executable === "boolean"
        ? recommendation_executable
        : true;
    }

    return {
      ...action,
      _id: message ? action_id : "",
      _title: title,
      _description: description,
      _action_type: action_type,
      _message_id: typeof message?._id === "string" && message._id.trim()
        ? message._id.trim()
        : message
          ? this._conversation_message_id(message, message_index)
          : "",
      _recommendation_kind: "crud",
      _recommendation_badge: badge,
      _recommendation_order: total > 1 ? `Option ${index + 1} of ${total}` : "",
      _recommendation_dependency: this._recommendation_dependency_text(recommendation, index),
      _recommendation_entity_name: this._recommendation_entity_name(recommendation),
      _recommendation_expected_artifacts: this._recommendation_expected_artifacts(recommendation),
      _recommendation_button_label: title,
      _recommendation_debug: {
        _recommendation: recommendation,
        _action: raw_action,
      },
      _recommended: recommended,
    };
  }

  private _missing_intent_action_persisted_id_error() {
    return "Cannot update conversation action: missing persisted action._id.";
  }

  private _intent_action_natural_title(edit_action: string) {
    switch (edit_action) {
      case "add-child":
      case "add-object":
        return "Add object";
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
      case "replace-object":
        return "Replace selected object";
      case "set-property":
        return "Update selected object";
      case "set-interaction":
        return "Set selected object interaction";
      default:
        return "";
    }
  }

  private _normalize_intent_action_type(value: string) {
    return value.trim().toLowerCase().replace(/_/g, "-");
  }

  private _is_fix_project_views_action_type(action_type: string) {
    return this._normalize_intent_action_type(action_type) === STUDIO_FIX_PROJECT_VIEWS_ACTION_TYPE;
  }

  private _is_fix_project_views_command(module_name: string, op: string) {
    return module_name === "xvibe" && this._normalize_intent_action_type(op) === STUDIO_FIX_PROJECT_VIEWS_ACTION_TYPE;
  }

  private _intent_action_readable_text(value: any) {
    if (value === undefined || value === null) return "";
    const text = String(value)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return "";
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  private _intent_action_display_text(value: any) {
    if (value === undefined || value === null) return "";
    return String(value)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private _intent_action_first_display_text(params: Record<string, any>, keys: string[]) {
    for (const key of keys) {
      const value = this._intent_action_display_text(params[key]);
      if (value) return value;
    }
    return "";
  }

  private _intent_action_first_readable_text(params: Record<string, any>, keys: string[]) {
    for (const key of keys) {
      const value = this._intent_action_readable_text(params[key]);
      if (value) return value;
    }
    return "";
  }

  private _intent_action_display_text_from_fields(source: Record<string, any>) {
    const keys = [
      "_title",
      "title",
      "_label",
      "label",
      "_summary",
      "summary",
      "_description",
      "description",
      "_prompt",
      "prompt",
      "_instruction",
      "instruction",
      "_user_prompt",
      "user_prompt",
    ];

    for (const key of keys) {
      const value = this._intent_action_readable_text(source[key]);
      if (value) return value.charAt(0).toUpperCase() + value.slice(1);
    }

    return "";
  }

  private _intent_action_object_title(value: any) {
    if (!is_obj(value)) return this._intent_action_readable_text(value);

    const raw_text = this._intent_action_readable_text(
      value._text ??
      value.text ??
      value._label ??
      value.label ??
      value._title ??
      value.title ??
      value._name ??
      value.name ??
      value._id ??
      value.id,
    );
    const text = raw_text.replace(/^new\s+/i, "").trim().toLowerCase();
    const type = this._intent_action_readable_text(value._type ?? value.type).toLowerCase();

    if (text && type && !text.toLowerCase().includes(type.toLowerCase())) return `${text} ${type}`;
    return text || type || "object";
  }

  private _intent_action_target_title(params: Record<string, any>) {
    let target_id = this._intent_action_readable_text(params._target_id ?? params.target_id);
    const target_type = this._intent_action_readable_text(params._target_type ?? params.target_type);
    const view_id = this._intent_action_readable_text(params._view_id ?? params.view_id);

    if (target_type === "view" && target_id.startsWith("view ")) {
      target_id = target_id.slice("view ".length).trim();
    }

    if (target_id && target_type && !target_id.includes(target_type)) return `${target_id} ${target_type}`;
    if (target_id) return target_id;
    if (view_id && !view_id.includes("view")) return `${view_id} view`;
    return view_id || target_type || "current view";
  }

  private _intent_action_target_display_title(params: Record<string, any>) {
    const explicit_title = this._intent_action_display_text(
      params._target_title ??
      params.target_title ??
      params._target_label ??
      params.target_label ??
      params._object_title ??
      params.object_title ??
      params._object_label ??
      params.object_label,
    );
    if (explicit_title) return explicit_title;
    return this._intent_action_target_title(params);
  }

  private _intent_action_style_property_title(params: Record<string, any>) {
    const property = this._intent_action_readable_text(
      params._style_property ??
      params.style_property ??
      params._style_key ??
      params.style_key ??
      params._property_name ??
      params.property_name ??
      params._property ??
      params.property,
    ).replace(/^style\s+/i, "");
    return property.toLowerCase();
  }

  private _intent_action_style_value_title(params: Record<string, any>) {
    const value =
      params._style_value ??
      params.style_value ??
      params._property_value ??
      params.property_value ??
      params._value ??
      params.value;
    if (value === undefined || value === null) return "";
    return String(value).trim();
  }

  private _intent_action_styles_source(params: Record<string, any>) {
    const source =
      params._styles ??
      params.styles ??
      params._style ??
      params.style ??
      params._style_updates ??
      params.style_updates ??
      params._updates ??
      params.updates;
    return source;
  }

  private _intent_action_style_entries(params: Record<string, any>) {
    const source = this._intent_action_styles_source(params);
    const entries: Array<{ _property: string; _value: string }> = [];

    if (Array.isArray(source)) {
      for (const item of source) {
        if (!is_obj(item)) continue;
        const property = this._intent_action_readable_text(
          item._property ??
          item.property ??
          item._property_name ??
          item.property_name ??
          item._style_property ??
          item.style_property ??
          item._key ??
          item.key,
        ).replace(/^style\s+/i, "").toLowerCase();
        const value = item._value ?? item.value ?? item._style_value ?? item.style_value;
        const value_text = value === undefined || value === null ? "" : String(value).trim();
        if (property && value_text) entries.push({ _property: property, _value: value_text });
      }
      return entries;
    }

    if (is_obj(source)) {
      for (const [key, value] of Object.entries(source)) {
        const property = this._intent_action_readable_text(key).replace(/^style\s+/i, "").toLowerCase();
        const value_text = value === undefined || value === null ? "" : String(value).trim();
        if (property && value_text) entries.push({ _property: property, _value: value_text });
      }
      return entries;
    }

    const property = this._intent_action_style_property_title(params);
    const value = this._intent_action_style_value_title(params);
    if (property && value) entries.push({ _property: property, _value: value });
    return entries;
  }

  private _intent_action_set_styles_title(params: Record<string, any>, target_display_title: string) {
    const entries = this._intent_action_style_entries(params);
    const style_value = (property: string) =>
      entries.find((entry) => entry._property === property)?._value ?? "";
    const font_size = style_value("font size");
    const font_weight = style_value("font weight");

    if (font_size && font_weight) {
      return `Set ${target_display_title} to ${font_size} ${font_weight} text`;
    }

    if (entries.length === 1) {
      const entry = entries[0];
      return `Set ${target_display_title} ${entry._property} to ${entry._value}`;
    }

    return `Update ${target_display_title} styles`;
  }

  private _intent_action_class_title(params: Record<string, any>) {
    return this._intent_action_readable_text(
      params._class_name ??
      params.class_name ??
      params._class ??
      params.class ??
      params._class_token ??
      params.class_token ??
      params._value ??
      params.value,
    ).replace(/^\./, "");
  }

  private _intent_action_move_destination_title(params: Record<string, any>) {
    return this._intent_action_first_display_text(params, [
      "_destination_title",
      "destination_title",
      "_destination_label",
      "destination_label",
      "_target_parent_title",
      "target_parent_title",
      "_target_parent_label",
      "target_parent_label",
      "_parent_title",
      "parent_title",
      "_parent_label",
      "parent_label",
      "_container_title",
      "container_title",
      "_container_label",
      "container_label",
    ]) || this._intent_action_first_readable_text(params, [
      "_destination_id",
      "destination_id",
      "_target_parent_id",
      "target_parent_id",
      "_parent_id",
      "parent_id",
      "_container_id",
      "container_id",
      "_to_parent_id",
      "to_parent_id",
    ]);
  }

  private _intent_action_move_anchor_title(params: Record<string, any>) {
    return this._intent_action_first_display_text(params, [
      "_anchor_title",
      "anchor_title",
      "_anchor_label",
      "anchor_label",
      "_sibling_title",
      "sibling_title",
      "_sibling_label",
      "sibling_label",
      "_before_title",
      "before_title",
      "_before_label",
      "before_label",
      "_after_title",
      "after_title",
      "_after_label",
      "after_label",
    ]) || this._intent_action_first_readable_text(params, [
      "_anchor_id",
      "anchor_id",
      "_sibling_id",
      "sibling_id",
      "_before_id",
      "before_id",
      "_after_id",
      "after_id",
      "_destination_sibling_id",
      "destination_sibling_id",
    ]);
  }

  private _intent_action_move_position(params: Record<string, any>) {
    return this._intent_action_first_readable_text(params, [
      "_move_position",
      "move_position",
      "_position",
      "position",
      "_placement",
      "placement",
      "_relation",
      "relation",
      "_insert",
      "insert",
    ]).toLowerCase();
  }

  private _intent_action_move_title(params: Record<string, any>, target_display_title: string) {
    const position = this._intent_action_move_position(params);
    const destination = this._intent_action_move_destination_title(params);
    const anchor = this._intent_action_move_anchor_title(params);
    const direction = this._intent_action_readable_text(params._move_direction ?? params.move_direction);

    if (position === "before" && anchor) return `Move ${target_display_title} before ${anchor}`;
    if (position === "after" && anchor) return `Move ${target_display_title} after ${anchor}`;
    if ((position === "into" || position === "inside" || position === "in") && destination) {
      return `Move ${target_display_title} into ${destination}`;
    }
    if ((position === "top" || position === "first" || position === "start") && destination) {
      return `Move ${target_display_title} to the top of ${destination}`;
    }
    if ((position === "bottom" || position === "last" || position === "end") && destination) {
      return `Move ${target_display_title} to the bottom of ${destination}`;
    }
    if (destination) return `Move ${target_display_title} into ${destination}`;
    if (direction) return `Move ${target_display_title} ${direction}`;
    return `Move ${target_display_title}`;
  }

  private _intent_action_apply_view_edit_title(params: Record<string, any>, edit_action: string) {
    const field_title = this._intent_action_display_text_from_fields(params);
    if (field_title) return field_title;

    const target_title = this._intent_action_target_title(params);
    const target_display_title = this._intent_action_target_display_title(params);
    const object_title = this._intent_action_object_title(
      params._child ??
      params.child ??
      params._object_value ??
      params.object_value ??
      params._object ??
      params.object,
    );

    switch (edit_action) {
      case "add-child":
      case "add-object":
        return `Add ${object_title} to ${target_title}`;
      case "replace-object":
        return `Replace ${target_title} with ${object_title}`;
      case "set-property": {
        const property = this._intent_action_property_title(params);
        if (property === "title" || property === "heading") return `Update ${property}`;
        return property ? `Update ${property} on ${target_title}` : `Update ${target_title}`;
      }
      case "set-style": {
        const property = this._intent_action_style_property_title(params);
        const value = this._intent_action_style_value_title(params);
        if (property && value) return `Set ${target_display_title} ${property} to ${value}`;
        if (property) return `Set ${property} on ${target_display_title}`;
        return `Set style on ${target_display_title}`;
      }
      case "set-styles":
        return this._intent_action_set_styles_title(params, target_display_title);
      case "remove-style": {
        const property = this._intent_action_style_property_title(params);
        return property
          ? `Remove ${property} from ${target_display_title}`
          : `Remove style from ${target_display_title}`;
      }
      case "add-class": {
        const class_title = this._intent_action_class_title(params);
        return class_title
          ? `Add ${class_title} class to ${target_display_title}`
          : `Add class to ${target_display_title}`;
      }
      case "remove-class": {
        const class_title = this._intent_action_class_title(params);
        return class_title
          ? `Remove ${class_title} class from ${target_display_title}`
          : `Remove class from ${target_display_title}`;
      }
      case "replace-text":
      case "update-text":
      case "set-text":
        return `Update ${this._intent_action_property_title(params) || "text"}`;
      case "set-interaction": {
        const trigger = this._intent_action_readable_text(params._trigger ?? params.trigger);
        return trigger ? `Set ${trigger} interaction on ${target_title}` : `Set interaction on ${target_title}`;
      }
      case "hide-object":
        return `Hide ${target_title}`;
      case "show-object":
        return `Show ${target_title}`;
      case "remove-object":
        return `Delete ${target_title}`;
      case "duplicate-object":
        return `Duplicate ${target_title}`;
      case "move-object": {
        return this._intent_action_move_title(params, target_display_title);
      }
      default:
        return "";
    }
  }

  private _intent_action_property_title(params: Record<string, any>) {
    const raw_property = this._intent_action_readable_text(
      params._property_name ??
      params.property_name ??
      params._property ??
      params.property ??
      params._field ??
      params.field,
    );
    const target_title = this._intent_action_target_title(params).toLowerCase();

    if (
      raw_property === "text" ||
      raw_property === "_text" ||
      raw_property === "label"
    ) {
      if (/\btitle\b/.test(target_title)) return "title";
      if (/\bheading\b/.test(target_title)) return "heading";
    }

    return raw_property.replace(/^_+/, "");
  }

  private _normalize_intent_action_execution_payload(payload: any) {
    if (!is_obj(payload)) return null;

    const module_name = typeof payload._module === "string"
      ? payload._module.trim()
      : typeof payload.module === "string"
        ? payload.module.trim()
        : "";
    const op = typeof payload._op === "string"
      ? payload._op.trim()
      : typeof payload.op === "string"
        ? payload.op.trim()
        : "";
    if (!module_name || !op) return null;

    const params = payload._params ?? payload.params;
    return {
      _module: module_name,
      _op: op,
      _params: is_obj(params) ? { ...params } : {},
    };
  }

  private _raw_intent_action_execution_payload(action: Record<string, any>) {
    const payloads = [
      action._execution_payload,
      action.execution_payload,
      action._command,
      action.command,
      action._payload,
      action.payload,
    ];

    return payloads.find((payload) => is_obj(payload)) ?? null;
  }

  private _intent_action_execution_payload(action: Record<string, any>) {
    const raw_payload = this._raw_intent_action_execution_payload(action);
    const normalized = this._normalize_intent_action_execution_payload(raw_payload);
    if (normalized) return normalized;

    const action_type = this._intent_action_text(action, "action_type");
    if (this._is_fix_project_views_action_type(action_type)) {
      return {
        _module: "xvibe",
        _op: STUDIO_FIX_PROJECT_VIEWS_ACTION_TYPE,
        _params: {},
      };
    }

    return null;
  }

  private _intent_action_execution_payload_error(action: Record<string, any>) {
    const action_type = this._intent_action_text(action, "action_type");
    if (this._is_fix_project_views_action_type(action_type)) return "";

    const raw_payload = this._raw_intent_action_execution_payload(action);
    if (!is_obj(raw_payload)) return "Action is missing execution payload";

    const module_name = typeof raw_payload._module === "string"
      ? raw_payload._module.trim()
      : typeof raw_payload.module === "string"
        ? raw_payload.module.trim()
        : "";
    const op = typeof raw_payload._op === "string"
      ? raw_payload._op.trim()
      : typeof raw_payload.op === "string"
        ? raw_payload.op.trim()
        : "";

    if (!module_name && !op) return "Action execution payload is missing _module and _op";
    if (!module_name) return "Action execution payload is missing _module";
    if (!op) return "Action execution payload is missing _op";
    return "";
  }

  private _intent_action_execution_params(action: Record<string, any>) {
    const direct_params = action._params ?? action.params;
    if (is_obj(direct_params)) return this._normalize_intent_action_execution_params(direct_params);

    const execution_payload = this._intent_action_execution_payload(action);
    if (is_obj(execution_payload?._params)) {
      return this._normalize_intent_action_execution_params(execution_payload._params);
    }

    const payloads = [
      action._execution_payload,
      action.execution_payload,
      action._execution,
      action.execution,
      action._payload,
      action.payload,
    ];

    for (const payload of payloads) {
      if (!is_obj(payload)) continue;
      const payload_params = payload._params ?? payload.params;
      if (is_obj(payload_params)) return this._normalize_intent_action_execution_params(payload_params);
      if (
        typeof payload._edit_action === "string" ||
        typeof payload.edit_action === "string" ||
        typeof payload._view_id === "string" ||
        typeof payload.view_id === "string" ||
        typeof payload._target_id === "string" ||
        typeof payload.target_id === "string"
      ) {
        return this._normalize_intent_action_execution_params(payload);
      }
    }

    return null;
  }

  private _normalize_intent_action_execution_params(params: Record<string, any>) {
    const normalized = { ...params };
    const string_aliases: [string, string][] = [
      ["edit_action", "_edit_action"],
      ["view_id", "_view_id"],
      ["target_id", "_target_id"],
      ["target_type", "_target_type"],
      ["move_direction", "_move_direction"],
      ["before_id", "_before_id"],
      ["after_id", "_after_id"],
    ];

    string_aliases.forEach(([source_key, target_key]) => {
      if (typeof normalized[target_key] === "string" && normalized[target_key].trim()) return;
      if (typeof normalized[source_key] !== "string") return;
      const value = normalized[source_key].trim();
      if (value) normalized[target_key] = value;
    });

    if (
      typeof normalized._requires_resolution !== "boolean" &&
      typeof normalized.requires_resolution === "boolean"
    ) {
      normalized._requires_resolution = normalized.requires_resolution;
    }

    return normalized;
  }

  private _normalize_conversation_intent_action(raw_action: any): Record<string, any> | null {
    if (typeof raw_action === "string") {
      const action_id = raw_action.trim();
      return action_id ? { _id: action_id } : null;
    }

    if (!is_obj(raw_action)) return null;

    const action = { ...raw_action };
    const action_id = this._intent_action_persisted_id(action);
    if (action_id) action._id = action_id;

    const action_type = this._intent_action_text(action, "action_type");
    if (action_type) action._action_type = action_type;

    const status = this._intent_action_text(action, "status");
    if (status) action._status = status;

    const executable = this._intent_action_optional_boolean(action, "executable");
    if (typeof executable === "boolean") action._executable = executable;

    const raw_execution_payload = this._raw_intent_action_execution_payload(action);
    const execution_payload = this._intent_action_execution_payload(action);
    action._has_execution_payload = is_obj(raw_execution_payload);
    action._execution_payload_error = this._intent_action_execution_payload_error(action);
    if (is_obj(execution_payload)) action._execution_payload = execution_payload;

    const execution_params = this._intent_action_execution_params(action);
    if (is_obj(execution_params)) action._params = execution_params;

    return action;
  }

  private _intent_action_display_title(raw_action: Record<string, any>, action_type: string, action_index: number) {
    const params = this._intent_action_execution_params(raw_action);
    const edit_action = is_obj(params) && typeof params._edit_action === "string"
      ? params._edit_action.trim()
      : "";
    const execution_payload = this._intent_action_execution_payload(raw_action);
    const is_apply_view_edit = action_type === "apply-view-edit" ||
      (
        is_obj(execution_payload) &&
        execution_payload._module === "xvibe" &&
        execution_payload._op === "apply-view-edit"
      );
    const is_fix_project_views =
      this._is_fix_project_views_action_type(action_type) ||
      (
        is_obj(execution_payload) &&
        this._is_fix_project_views_command(execution_payload._module, execution_payload._op)
      );
    const natural_title = this._intent_action_natural_title(edit_action);
    const raw_title = this._intent_action_text(raw_action, "title");

    if (is_fix_project_views) return "Fix project view IDs";
    const raw_title_normalized = raw_title.trim().toLowerCase();
    const raw_title_is_generic =
      raw_title_normalized === "update text" ||
      raw_title_normalized === "set style" ||
      raw_title_normalized === "set styles" ||
      raw_title_normalized === "remove style" ||
      raw_title_normalized === "update styles" ||
      raw_title_normalized === "add class" ||
      raw_title_normalized === "remove class";
    if (raw_title && raw_title !== action_type && raw_title !== edit_action && !raw_title_is_generic) return raw_title;
    if (is_apply_view_edit && is_obj(params)) {
      const apply_view_edit_title = this._intent_action_apply_view_edit_title(params, edit_action);
      if (apply_view_edit_title) return apply_view_edit_title;
    }
    if (natural_title) return natural_title;
    if (is_obj(params)) {
      const params_title = this._intent_action_display_text_from_fields(params);
      if (params_title) return params_title;
    }
    const field_title = this._intent_action_display_text_from_fields(raw_action);
    if (field_title && field_title !== action_type && field_title !== edit_action) return field_title;
    if (action_type && action_type !== "-" && action_type !== "apply-view-edit") return action_type;
    return `Action ${action_index + 1}`;
  }

  private _conversation_intent_actions(message: XStudioConversationMessage, message_index: number) {
    if (message._role !== "tool" || !is_obj(message._intent)) return [];

    const raw_actions = message._intent._actions ?? message._intent.actions;
    const action_sources: Array<{
      _raw: any;
      _source_index: number;
      _is_recommendation: boolean;
    }> = Array.isArray(raw_actions)
      ? raw_actions.map((raw_action, action_index) => ({
        _raw: raw_action,
        _source_index: action_index,
        _is_recommendation: this._is_crud_recommendation(raw_action),
      }))
      : [];
    const artifact_request = is_obj(message._intent._artifact_request ?? message._intent.artifact_request)
      ? message._intent._artifact_request ?? message._intent.artifact_request
      : null;
    const raw_recommendations = [
      ...this._recommendation_candidates(message._intent),
      ...this._recommendation_candidates(artifact_request),
    ]
      .filter((recommendation) => this._is_crud_recommendation(recommendation));
    raw_recommendations.forEach((recommendation, recommendation_index) => {
      action_sources.push({
        _raw: recommendation,
        _source_index: recommendation_index,
        _is_recommendation: true,
      });
    });
    if (action_sources.length === 0) return [];

    return action_sources
      .map((source, action_index): XStudioIntentActionView | null => {
        const normalized_action = source._is_recommendation
          ? this._normalize_conversation_intent_action(
            this._normalize_crud_recommendation_action(
              source._raw,
              source._source_index,
              raw_recommendations.length,
              message,
              message_index,
            ),
          )
          : this._normalize_conversation_intent_action(source._raw);
        if (!is_obj(normalized_action)) return null;

        const action_id = this._intent_action_persisted_id(normalized_action);
        const message_id = this._conversation_message_id(message, message_index);
        const action_key = this._conversation_action_key(
          message,
          message_index,
          normalized_action,
          action_index,
        );
        const action_type = this._intent_action_text(normalized_action, "action_type", "-");
        const action_execution_payload = this._intent_action_execution_payload(normalized_action);
        const normalized_action_type =
          this._is_fix_project_views_action_type(action_type) ||
          (
            is_obj(action_execution_payload) &&
            this._is_fix_project_views_command(action_execution_payload._module, action_execution_payload._op)
          )
          ? STUDIO_FIX_PROJECT_VIEWS_ACTION_TYPE
          : action_type;
        const title = this._intent_action_display_title(normalized_action, normalized_action_type, action_index);
        const source_status = this._intent_action_text(
          normalized_action,
          "status",
          STUDIO_INTENT_ACTION_STATUS_SUGGESTED,
        );
        const local_status = this._conversation_action_status[action_key] ?? source_status;
        const source_error =
          this._intent_action_text(normalized_action, "error") ||
          this._intent_action_text(normalized_action, "reason");
        const visible_source_error =
          normalized_action._executable === false || local_status === STUDIO_INTENT_ACTION_STATUS_FAILED
            ? source_error
            : "";

        return {
          _key: action_key,
          _render_key: action_key,
          _id: action_id,
          _message_id: message_id,
          _action_index: action_index,
          _title: title,
          _description: this._intent_action_text(normalized_action, "description"),
          _action_type: normalized_action_type,
          _confidence: this._intent_action_text(normalized_action, "confidence"),
          _status: local_status,
          ...(typeof normalized_action._executable === "boolean"
            ? { _executable: normalized_action._executable }
            : {}),
          _has_execution_payload: normalized_action._has_execution_payload === true,
          _execution_payload_error:
            this._intent_action_text(normalized_action, "execution_payload_error"),
          _execution_payload: is_obj(normalized_action._execution_payload)
            ? { ...normalized_action._execution_payload }
            : null,
          ...(typeof normalized_action._requires_approval === "boolean"
            ? { _requires_approval: normalized_action._requires_approval }
            : {}),
          _params: is_obj(normalized_action._params) ? { ...normalized_action._params } : null,
          _result:
            this._conversation_action_result[action_key] ??
            normalized_action._result ??
            normalized_action.result,
          _error:
            this._conversation_action_error[action_key] ||
            visible_source_error,
          ...(typeof normalized_action._recommendation_kind === "string"
            ? { _recommendation_kind: normalized_action._recommendation_kind }
            : {}),
          ...(typeof normalized_action._recommendation_badge === "string"
            ? { _recommendation_badge: normalized_action._recommendation_badge }
            : {}),
          ...(typeof normalized_action._recommendation_order === "string"
            ? { _recommendation_order: normalized_action._recommendation_order }
            : {}),
          ...(typeof normalized_action._recommendation_dependency === "string"
            ? { _recommendation_dependency: normalized_action._recommendation_dependency }
            : {}),
          ...(typeof normalized_action._recommendation_entity_name === "string"
            ? { _recommendation_entity_name: normalized_action._recommendation_entity_name }
            : {}),
          ...(Array.isArray(normalized_action._recommendation_expected_artifacts)
            ? {
              _recommendation_expected_artifacts:
                normalized_action._recommendation_expected_artifacts.filter((item: any) =>
                  typeof item === "string" && item.trim()
                ),
            }
            : {}),
          ...(typeof normalized_action._recommendation_button_label === "string"
            ? { _recommendation_button_label: normalized_action._recommendation_button_label }
            : {}),
          ...(normalized_action._recommendation_debug !== undefined
            ? { _recommendation_debug: normalized_action._recommendation_debug }
            : {}),
          ...(typeof normalized_action._recommended === "boolean"
            ? { _recommended: normalized_action._recommended }
            : {}),
        };
      })
      .filter((action): action is XStudioIntentActionView => action !== null);
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

  private _intent_action_missing_required_fields(action: XStudioIntentActionView) {
    const missing: string[] = [];

    if (action._executable === true) {
      if (!action._has_execution_payload) {
        missing.push("_execution_payload");
      } else if (!is_obj(action._execution_payload)) {
        if (action._execution_payload_error.includes("_module")) {
          missing.push("_execution_payload._module");
        }
        if (action._execution_payload_error.includes("_op")) {
          missing.push("_execution_payload._op");
        }
      }
      return missing;
    }

    if (!action._id.trim()) missing.push("_action_id");
    if (!action._action_type || action._action_type === "-") missing.push("_action_type");
    if (!is_obj(action._params)) missing.push("_params");

    if (action._action_type === "apply-view-edit") {
      if (!is_obj(action._params)) {
        return missing;
      }

      const edit_action = this._intent_action_edit_action(action);
      if (!edit_action) {
        missing.push("_params._edit_action");
        return missing;
      }

      if (
        edit_action === "move-object" &&
        action._params._requires_resolution === true
      ) {
        const direction = typeof action._params._move_direction === "string"
          ? action._params._move_direction.trim().toLowerCase()
          : "";
        if (direction !== "up" && direction !== "down") {
          missing.push("_params._move_direction");
        }
      }
    }

    return missing;
  }

  private _intent_action_card_execute_state(action: XStudioIntentActionView) {
    if (
      action._status !== STUDIO_INTENT_ACTION_STATUS_SUGGESTED &&
      action._status !== STUDIO_INTENT_ACTION_STATUS_FAILED
    ) {
      return {
        _can_execute: false,
        _disabled_reason: `status is ${action._status || "unknown"}`,
      };
    }

    if (is_obj(action._execution_payload)) {
      return {
        _can_execute: true,
        _disabled_reason: "",
      };
    }

    if (action._executable === false) {
      return {
        _can_execute: false,
        _disabled_reason: "action is not executable",
      };
    }

    if (action._executable === true) {
      if (!action._has_execution_payload) {
        return {
          _can_execute: false,
          _disabled_reason: "Action is missing execution payload",
        };
      }

      if (action._has_execution_payload && !is_obj(action._execution_payload)) {
        return {
          _can_execute: false,
          _disabled_reason: action._execution_payload_error ||
            "Action execution payload is invalid",
        };
      }

      return {
        _can_execute: true,
        _disabled_reason: "",
      };
    }

    if (!action._action_type || action._action_type === "-") {
      return {
        _can_execute: false,
        _disabled_reason: is_obj(action._params)
          ? "missing action type"
          : "Action is missing execution payload",
      };
    }

    if (action._action_type !== "apply-view-edit") {
      return {
        _can_execute: false,
        _disabled_reason: "unsupported action type",
      };
    }

    if (!action._id.trim()) {
      return {
        _can_execute: false,
        _disabled_reason: "missing persisted action id",
      };
    }

    if (!is_obj(action._params)) {
      return {
        _can_execute: false,
        _disabled_reason: "Action is missing execution payload",
      };
    }

    if (!this._intent_action_edit_action(action)) {
      return {
        _can_execute: false,
        _disabled_reason: "Action is missing execution payload",
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

    const guide_action = this._find_guide_recommendation_action(action_key);
    if (guide_action) return guide_action;

    return null;
  }

  private _find_guide_recommendation_action(action_key: string) {
    if (!action_key) return null;

    const active = this._active_guide_recommendation();
    const recommendations = active
      ? [active]
      : this._normalize_guide_recommendations(_xd.get(GUIDE_RECOMMENDATION_XD_KEY));
    const crud_recommendations = recommendations
      .filter((recommendation) => this._is_crud_recommendation(recommendation));

    for (let index = 0; index < crud_recommendations.length; index += 1) {
      const action = this._guide_crud_recommendation_action_view(
        crud_recommendations[index],
        index,
        crud_recommendations.length,
        active ? this._active_guide_recommendation_status() : "",
      );
      if (action?._key === action_key) return action;
    }

    return null;
  }

  private _set_conversation_action_status(
    action_key: string,
    status: XStudioIntentActionLocalStatus,
    error: any = "",
  ) {
    if (!action_key) return;

    this._conversation_action_status[action_key] = status;
    if (error) {
      this._conversation_action_error[action_key] = error;
    } else {
      delete this._conversation_action_error[action_key];
    }
    if (status !== STUDIO_INTENT_ACTION_STATUS_DONE) {
      delete this._conversation_action_result[action_key];
    }

    if (this._active_guide_recommendation()) {
      if (status === STUDIO_INTENT_ACTION_STATUS_FAILED) {
        _xd.set(GUIDE_ACTIVE_RECOMMENDATION_STATUS_XD_KEY, "failed", {
          source: "xstudio-guide",
        });
        this._render_guide_active_recommendation();
      } else if (status === STUDIO_INTENT_ACTION_STATUS_RUNNING) {
        const active = this._active_guide_recommendation();
        _xd.set(GUIDE_ACTIVE_RECOMMENDATION_STATUS_XD_KEY, this._is_starter_adaptation_recommendation(active)
          ? "adapting"
          : "running", {
          source: "xstudio-guide",
        });
        this._render_guide_active_recommendation();
      } else if (status === STUDIO_INTENT_ACTION_STATUS_DONE) {
        _xd.set(GUIDE_ACTIVE_RECOMMENDATION_STATUS_XD_KEY, "completed", {
          source: "xstudio-guide",
        });
        this._render_guide_active_recommendation();
      }
    }

    this._render_guide_recommendation();
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
      _action: {
        _id: action_id,
        _type: action._action_type || "module-op",
        _action_type: action._action_type || "module-op",
        _title: action._title,
        ...(action._description ? { _description: action._description } : {}),
        ...(is_obj(action._execution_payload)
          ? { _execution_payload: action._execution_payload }
          : {}),
        _requires_approval: action._requires_approval === true,
      },
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

  private _format_execution_payload_failure(
    command: Record<string, any>,
    result: any,
  ) {
    if (command._module === "xvibe" && command._op === "apply-view-edit") {
      return this._format_apply_view_edit_failure(result, command);
    }

    if (is_obj(result)) {
      const message = result._error ?? result.error ?? result._message ?? result.message;
      if (typeof message === "string" && message.trim()) return message.trim();
    }

    return "Action execution failed.";
  }

  private async _refresh_project_memory_after_apply(action: XStudioIntentActionView) {
    try {
      await this._refresh_guide_after_success("project-memory-after-apply", {
        _clear_active_recommendation: true,
      });
      this._log("project memory refreshed after apply", {
        _action_key: action._key,
        _action_id: action._id,
        _result_key: PROJECT_MEMORY_XD_KEY,
      });
    } catch (err) {
      this._error("project memory refresh after apply failed", {
        _action_key: action._key,
        _action_id: action._id,
        _error: to_err(err),
      });
    }
  }

  private async _persist_conversation_action_status_if_possible(
    action: XStudioIntentActionView,
    status: XStudioIntentActionLocalStatus,
    error = "",
    action_result?: any,
  ) {
    if (action_result !== undefined) {
      this._conversation_action_result[action._key] = action_result;
    }

    this._set_conversation_action_status(action._key, status, error);

    if (action._id.trim()) {
      return this._persist_conversation_action_status_and_reload(
        action,
        status,
        error,
        action_result,
      );
    }

    this._log("conversation action status persist skipped: missing persisted action id", {
      _action_key: action._key,
      _message_id: action._message_id,
      _action_index: action._action_index,
      _status: status,
    });
    return false;
  }

  private _merge_fix_project_views_params(params: Record<string, any>) {
    return {
      ...params,
      _app_id:
        typeof params._app_id === "string" && params._app_id.trim()
          ? params._app_id.trim()
          : this._client().getActiveAppId(),
      _env:
        typeof params._env === "string" && params._env.trim()
          ? params._env.trim()
          : this._client().getActiveEnv(),
      ...(this._conversation_id ? { _conversation_id: this._conversation_id } : {}),
    };
  }

  private _is_fix_project_views_success(result: any) {
    if (!is_obj(result)) return false;
    if (result._ok === false || result.ok === false) return false;
    if (result._error || result.error) return false;
    return true;
  }

  private async _refresh_after_fix_project_views(result: any) {
    const view_id = this._resolve_studio_target_view_id();
    if (
      view_id &&
      typeof this._xvm_client?.request_structured_view_edit_refresh === "function"
    ) {
      try {
        await this._xvm_client.request_structured_view_edit_refresh({
          _view_id: view_id,
          _action: STUDIO_FIX_PROJECT_VIEWS_ACTION_TYPE,
          _version: this._extract_apply_view_edit_version(result),
        });
      } catch (err) {
        this._error("fix project views current view refresh failed", {
          _view_id: view_id,
          _error: to_err(err),
        });
      }
    }

    await this._refresh_app_explorer();
    this._refresh_object_tree_for_current_view();
    await this._load_studio_current_view_json();
  }

  private async _refresh_after_conversation_executable_payload(
    action: XStudioIntentActionView,
    result: any,
  ) {
    const view_id = this._resolve_studio_target_view_id();
    if (view_id && typeof this._xvm_client?.render_view === "function") {
      try {
        await this._xvm_client.render_view(view_id);
      } catch (err) {
        this._error("intent action current view refresh failed", {
          _action_key: action._key,
          _view_id: view_id,
          _error: to_err(err),
        });
      }
    }

    this._refresh_object_tree_for_current_view();
    try {
      await this._refresh_app_explorer();
    } catch (err) {
      this._error("intent action app explorer refresh failed", {
        _action_key: action._key,
        _error: to_err(err),
      });
    }

    if (view_id) await this._load_studio_current_view_json();
    this._render_project_memory_guide();
    this._log("intent action refreshed studio artifacts", {
      _action_key: action._key,
      _action_id: action._id,
      _view_id: view_id,
      _result: result,
    });
  }

  private async _apply_conversation_execution_payload(action: XStudioIntentActionView) {
    const command = action._execution_payload;
    if (!is_obj(command)) {
      const message = action._execution_payload_error || "Action is missing execution payload";
      this._set_conversation_action_status(
        action._key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      await this._persist_conversation_action_status_if_possible(
        action,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("intent action execution payload failed", {
        _action_key: action._key,
        _action_id: action._id,
        _reason: message,
      });
      return;
    }

    const module_name = typeof command._module === "string" ? command._module.trim() : "";
    const op = typeof command._op === "string" ? command._op.trim() : "";
    let params = is_obj(command._params)
      ? (_xu.clone_json(command._params) as Record<string, any>)
      : {};
    if (this._conversation_id && typeof params._conversation_id !== "string") {
      params._conversation_id = this._conversation_id;
    }
    if (action._message_id && typeof params._message_id !== "string") {
      params._message_id = action._message_id;
    }
    if (action._id && typeof params._action_id !== "string") {
      params._action_id = action._id;
    }
    const is_fix_project_views = this._is_fix_project_views_command(module_name, op);
    if (is_fix_project_views) {
      params = this._merge_fix_project_views_params(params);
    }
    const is_primary_experience_composition =
      module_name === "xvibe" && op === "compose-primary-experience";
    const is_materialize_confirmed_plan =
      module_name === "xvibe" && op === "materialize-confirmed-plan";

    if (!module_name || !op) {
      const message = !module_name && !op
        ? "Action execution payload is missing _module and _op"
        : !module_name
          ? "Action execution payload is missing _module"
          : "Action execution payload is missing _op";
      this._set_conversation_action_status(
        action._key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      await this._persist_conversation_action_status_if_possible(
        action,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("intent action execution payload failed", {
        _action_key: action._key,
        _action_id: action._id,
        _module: module_name,
        _op: op,
        _reason: message,
      });
      return;
    }

    const structured_edit = {
      _view_id: typeof params._view_id === "string" ? params._view_id : "",
      _action: typeof params._edit_action === "string" ? params._edit_action : "",
      _target_id: typeof params._target_id === "string" ? params._target_id : "",
    };
    const should_track_structured_edit =
      module_name === "xvibe" &&
      op === "apply-view-edit" &&
      STUDIO_INTENT_APPLY_VIEW_EDIT_REFRESH_ACTIONS.has(structured_edit._action);

    if (is_materialize_confirmed_plan) {
      this._set_guide_materialization_state({
        ...(this._guide_materialization_state() ?? {}),
        _status: "running",
        ...(typeof params._resume_token === "string" && params._resume_token.trim()
          ? { _resume_token: params._resume_token.trim() }
          : {}),
        _conversation_message_id: action._message_id,
        _conversation_action_id: action._id,
        _conversation_action_key: action._key,
        _stages: this._guide_materialization_running_stages(),
      });
    }

    this._set_conversation_action_status(action._key, STUDIO_INTENT_ACTION_STATUS_RUNNING);
    await this._persist_conversation_action_status_if_possible(
      action,
      STUDIO_INTENT_ACTION_STATUS_RUNNING,
    );
    this._write_studio_status(`Executing ${action._title || op}...`);
    this._log("intent action execution payload requested", {
      _action_key: action._key,
      _action_id: action._id,
      _module: module_name,
      _op: op,
      _has_params: is_obj(command._params),
    });

    try {
      if (should_track_structured_edit) {
        this._xvm_client?.note_structured_view_edit?.(structured_edit);
      }

      const result = await this._send_command(module_name, op, params);
      const execution_succeeded =
        is_obj(result) &&
        (
          (
            result._ok === true &&
            !is_primary_experience_composition &&
            !is_materialize_confirmed_plan
          ) ||
          (
            is_fix_project_views &&
            this._is_fix_project_views_success(result)
          ) ||
          (
            module_name === "server-xvm" &&
            op === "patch-project-memory" &&
            XStudioModule._is_project_memory_apply_success(result)
          ) ||
          (
            is_primary_experience_composition &&
            result._ok !== false &&
            (
              result._status === "completed" ||
              result.status === "completed" ||
              result._success === true ||
              result.success === true
            ) &&
            !this._guide_primary_experience_zero_planned_changes(result)
          ) ||
          (
            is_materialize_confirmed_plan &&
            result._ok !== false &&
            !result._error &&
            !result.error &&
            (
              result._status === "completed" ||
              result.status === "completed" ||
              result._complete === true ||
              result.complete === true ||
              result._success === true ||
              result.success === true
            )
          )
        );

      if (!execution_succeeded) {
        if (should_track_structured_edit) {
          this._xvm_client?.clear_pending_structured_view_edit?.(structured_edit);
        }

        const message = this._format_execution_payload_failure(command, result);
        if (is_materialize_confirmed_plan) {
          this._set_guide_materialization_state(
            this._guide_materialization_result_state(
              result,
              "failed",
              params,
              action,
              this._guide_materialization_safe_error(result, message),
            ),
          );
        }
        this._set_conversation_action_status(
          action._key,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          message,
        );
        await this._persist_conversation_action_status_if_possible(
          action,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          message,
          result,
        );
        this._write_studio_status(message);
        this._error("intent action execution payload failed", {
          _action_key: action._key,
          _action_id: action._id,
          _module: module_name,
          _op: op,
          _structured_error: result,
        });
        return;
      }

      this._log("intent action execution payload succeeded", {
        _action_key: action._key,
        _action_id: action._id,
        _module: module_name,
        _op: op,
        _has_project_memory: XStudioModule._is_project_memory_apply_success(result),
      });

      if (is_materialize_confirmed_plan) {
        this._set_guide_materialization_state(
          this._guide_materialization_result_state(result, "completed", params, action),
        );
      }

      const new_target_id = params._edit_action === "duplicate-object"
        ? this._extract_new_target_id(result)
        : "";
      if (new_target_id) {
        this._selected_object_pending_select_id = new_target_id;
      }

      await this._persist_conversation_action_status_if_possible(
        action,
        STUDIO_INTENT_ACTION_STATUS_DONE,
        "",
        result,
      );
      if (module_name === "xvibe" && op === "apply-view-edit" && typeof params._edit_action === "string") {
        this._append_conversation_apply_result_message(params._edit_action);
      }
      this._write_studio_status(`✓ Applied${action._title ? `: ${action._title}` : ""}`);
      this._log("intent action execution payload completed", {
        _action_key: action._key,
        _action_id: action._id,
        _module: module_name,
        _op: op,
        _result: result,
      });
      if (is_primary_experience_composition || is_materialize_confirmed_plan) {
        try {
          await this._refresh_studio_runtime();
          await this._refresh_after_conversation_executable_payload(action, result);
          await this._refresh_guide_after_success(
            is_materialize_confirmed_plan
              ? "materialize-confirmed-plan-success"
              : "primary-experience-composition-success",
            {
            _clear_active_recommendation: false,
            _log_message: is_materialize_confirmed_plan
              ? "guide refreshed after materialize confirmed plan"
              : "guide refreshed after primary experience composition",
            _detail: {
              _action_key: action._key,
              _action_id: action._id,
            },
            },
          );
        } catch (err) {
          this._error(is_materialize_confirmed_plan
            ? "materialize confirmed plan refresh failed"
            : "primary experience guide refresh failed", {
            _action_key: action._key,
            _action_id: action._id,
            _error: to_err(err),
          });
        }
      } else {
        await this._refresh_project_memory_after_apply(action);
      }

      if (module_name === "xvibe" && op === "apply-view-edit") {
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
      } else if (is_fix_project_views) {
        await this._refresh_after_fix_project_views(result);
        this._write_studio_status("Project views fixed");
      } else if (is_materialize_confirmed_plan || is_primary_experience_composition) {
        this._write_studio_status(is_materialize_confirmed_plan ? "Build complete" : "Primary experience composed");
      } else {
        await this._refresh_after_conversation_executable_payload(action, result);
      }
    } catch (err) {
      if (should_track_structured_edit) {
        this._xvm_client?.clear_pending_structured_view_edit?.(structured_edit);
      }

      const message = this._format_execution_payload_failure(command, err);
      if (is_materialize_confirmed_plan) {
        this._set_guide_materialization_state(
          this._guide_materialization_result_state(
            err,
            "failed",
            params,
            action,
            this._guide_materialization_safe_error(err, message),
          ),
        );
      }
      this._set_conversation_action_status(
        action._key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      await this._persist_conversation_action_status_if_possible(
        action,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("intent action execution payload failed", {
        _action_key: action._key,
        _action_id: action._id,
        _module: module_name,
        _op: op,
        _error: to_err(err),
      });
    }
  }

  private async _apply_conversation_intent_action(payload?: any) {
    const payload_action = this._normalize_intent_action_event_payload(payload);
    if (!payload_action) return;

    const action = this._find_conversation_intent_action(payload_action._action_key);
    this._log("intent action execute requested", {
      ...payload_action,
      ...(action
        ? {
          _executable: action._executable,
          _has_execution_payload: action._has_execution_payload,
          _execution_payload_module: action._execution_payload?._module,
          _execution_payload_op: action._execution_payload?._op,
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

    const execute_state = this._intent_action_card_execute_state(action);
    if (!execute_state._can_execute) {
      const message = execute_state._disabled_reason || "Action is not executable.";
      this._set_conversation_action_status(
        action._key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      await this._persist_conversation_action_status_if_possible(
        action,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("intent action execute failed", {
        _action_key: action._key,
        _message_id: action._message_id,
        _action_id: action._id,
        _action_type: action._action_type,
        _reason: message,
      });
      return;
    }

    if (is_obj(action._execution_payload)) {
      await this._apply_conversation_execution_payload(action);
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
      this._write_studio_status(`✓ Applied${action._title ? `: ${action._title}` : ""}`);
      this._log("intent action execute completed", {
        _action_key: action._key,
        _action_type: action._action_type,
        _edit_action: params._edit_action,
        ...(new_target_id ? { _new_target_id: new_target_id } : {}),
        _result: result,
      });
      await this._refresh_project_memory_after_apply(action);

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

      const message = this._format_apply_view_edit_failure(err, { _params: params });
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

  private _conversation_artifact_request_key(message: XStudioConversationMessage, index: number) {
    const parts = [
      this._conversation_app_id || "no-app",
      this._conversation_env || "no-env",
      this._conversation_id || "no-conversation",
      this._conversation_message_id(message, index),
      "artifact-request",
    ].map((part) => this._conversation_action_key_part(part));

    return parts.join(":");
  }

  private _conversation_artifact_request(message: XStudioConversationMessage, index: number) {
    const request = create_xstudio_artifact_request_view(message as any, {
      _key: this._conversation_artifact_request_key(message, index),
      _message_id: this._conversation_message_id(message, index),
    });
    if (this._should_suppress_guide_owned_artifact_request(message, request)) {
      return null;
    }
    return request;
  }

  private _message_has_primary_experience_structured_action(message: XStudioConversationMessage) {
    const actions = is_obj(message._intent) && Array.isArray(message._intent._actions)
      ? message._intent._actions
      : [];
    return actions.some((action: any) => {
      if (!is_obj(action)) return false;
      const command = this._intent_action_execution_payload(action);
      return action._id === "compose-and-verify-primary-experience" ||
        action._role === "compose-and-verify-primary-experience" ||
        (
          is_obj(command) &&
          command._module === "xvibe" &&
          command._op === "compose-primary-experience"
        );
    });
  }

  private _should_suppress_guide_owned_artifact_request(
    message: XStudioConversationMessage,
    request: XStudioArtifactRequestView | null,
  ) {
    if (!request || request._artifact_type !== MUTATION_PLAN_ARTIFACT_TYPE) return false;
    if (!this._message_has_primary_experience_structured_action(message)) return false;
    return this._guide_primary_experience_zero_planned_changes(request._artifact_request);
  }

  private _normalize_artifact_request_event_payload(payload?: any) {
    return normalize_xstudio_artifact_request_event_payload(payload);
  }

  private _project_plan_action_prompt(payload?: any) {
    const evt = this._normalize_event_payload(payload);
    if (!is_obj(evt)) return "";

    const action = String(evt._action ?? evt.action ?? "").trim();
    const prompt = String(evt._prompt ?? evt.prompt ?? "");
    if (!prompt.trim()) return "";

    if (
      action !== "confirm" &&
      action !== "edit" &&
      action !== "ask-questions" &&
      action !== "suggestion" &&
      action !== "answer"
    ) {
      return "";
    }

    return prompt;
  }

  private _project_plan_action_value(payload?: any) {
    const evt = this._normalize_event_payload(payload);
    if (!is_obj(evt)) return null;

    const action = String(evt._action ?? evt.action ?? "").trim();
    const prompt = String(evt._prompt ?? evt.prompt ?? "");
    if (!action || !prompt.trim()) return null;

    return {
      _action: action,
      _prompt: prompt,
    };
  }

  private async _handle_planning_quick_start(payload?: any) {
    const evt = this._normalize_event_payload(payload);
    if (!is_obj(evt)) return;

    const prompt = typeof evt._prompt === "string" ? evt._prompt : "";
    if (!prompt.trim()) {
      this._log("planning quick start ignored: missing prompt", {
        _payload: evt,
      });
      return;
    }

    const should_send = evt._send === true;
    if (!should_send) {
      this._set_conversation_input_value(prompt);
      this._log("planning quick start prompt inserted", {
        _prompt: prompt,
      });
      return;
    }

    if (this._conversation_analyzing) {
      this._log("planning quick start ignored: conversation analyzing", {
        _prompt: prompt,
      });
      return;
    }

    this._set_conversation_input_value(prompt);
    this._log("planning quick start send requested", {
      _prompt: prompt,
    });
    await this._send_conversation_message(prompt);
  }

  private async _send_capability_guidance_request() {
    if (this._conversation_analyzing) {
      this._log("capability guidance ignored: conversation analyzing");
      return;
    }

    this._set_conversation_input_value(STUDIO_CAPABILITY_GUIDANCE_PROMPT);
    this._log("capability guidance send requested", {
      _prompt: STUDIO_CAPABILITY_GUIDANCE_PROMPT,
    });
    await this._send_conversation_message(STUDIO_CAPABILITY_GUIDANCE_PROMPT);
  }

  private _insert_capability_example_prompt(payload?: any) {
    const evt = this._normalize_event_payload(payload);
    const prompt = is_obj(evt) && typeof evt._prompt === "string"
      ? evt._prompt
      : "";
    if (!prompt.trim()) {
      this._log("capability example ignored: missing prompt", {
        _payload: evt,
      });
      return;
    }

    this._set_conversation_input_value(prompt);
    this._log("capability example prompt inserted", {
      _prompt: prompt,
    });
  }

  private _insert_project_plan_action_prompt(payload?: any) {
    const action = this._project_plan_action_value(payload);
    const prompt = this._project_plan_action_prompt(payload);
    if (!prompt || !action) {
      this._log("project plan action ignored: missing prompt", {
        _payload: this._normalize_event_payload(payload),
      });
      return;
    }

    this._set_conversation_input_value(prompt);
    if (action._action === "answer") {
      this._log("project plan answer send requested", {
        _prompt: prompt,
      });
      void this._send_conversation_message(prompt);
      return;
    }

    this._log("project plan action prompt inserted", {
      _prompt: prompt,
    });
  }

  private _planning_question_event(payload?: any) {
    const evt = this._normalize_event_payload(payload);
    if (!is_obj(evt)) return null;

    const question_key = typeof evt._question_key === "string" ? evt._question_key.trim() : "";
    if (!question_key) return null;

    return {
      _question_key: question_key,
      _chip_id: typeof evt._chip_id === "string" ? evt._chip_id.trim() : "",
      _value: typeof evt._value === "string" ? evt._value.trim() : "",
    };
  }

  private _toggle_planning_question_answer(payload?: any) {
    const evt = this._planning_question_event(payload);
    if (!evt || !evt._value) {
      this._log("planning question toggle ignored", {
        _payload: this._normalize_event_payload(payload),
      });
      return;
    }

    const selected = this._planning_question_multi_answers[evt._question_key] ?? [];
    const is_selected = selected.includes(evt._value);
    const next = is_selected
      ? selected.filter((value) => value !== evt._value)
      : [...selected, evt._value];
    this._planning_question_multi_answers[evt._question_key] = next;

    if (evt._chip_id) {
      this._set_object_class_token(
        evt._chip_id,
        "is-selected",
        !is_selected,
      );
      this._set_object_class_token(
        evt._chip_id,
        "xstudio-project-plan-suggestion-selected",
        !is_selected,
      );
      this._set_object_attribute(evt._chip_id, "aria-pressed", String(!is_selected));
    }

    this._log("planning question answer toggled", {
      _question_key: evt._question_key,
      _value: evt._value,
      _selected: next,
    });
  }

  private async _send_planning_question_answer(payload?: any) {
    const evt = this._planning_question_event(payload);
    if (!evt) return;

    if (this._conversation_analyzing) {
      this._log("planning question send ignored: conversation analyzing", {
        _question_key: evt._question_key,
      });
      return;
    }

    const selected = this._planning_question_multi_answers[evt._question_key] ?? [];
    const answer = selected
      .map((value) => value.trim())
      .filter(Boolean)
      .join(", ");
    if (!answer) {
      this._log("planning question send ignored: no selected answers", {
        _question_key: evt._question_key,
      });
      return;
    }

    delete this._planning_question_multi_answers[evt._question_key];
    this._set_conversation_input_value(answer);
    this._render_conversation_messages();
    this._log("planning question answer send requested", {
      _question_key: evt._question_key,
      _answer: answer,
    });
    await this._send_conversation_message(answer);
  }

  private _project_plan_missing_questions(result: any) {
    const parsed_result = result instanceof Error
      ? this._parse_error_object_string(result.message)
      : typeof result === "string"
        ? this._parse_error_object_string(result)
        : null;
    const source = parsed_result ?? result;
    const result_obj = is_obj(source?._result) ? source._result : source;
    const raw_questions = is_obj(result_obj)
      ? result_obj._missing_questions ??
        result_obj.missing_questions ??
        result_obj._questions ??
        result_obj.questions
      : null;
    if (!Array.isArray(raw_questions)) return [];

    return raw_questions
      .map((question: any) => {
        if (typeof question === "string") return question.trim();
        if (!is_obj(question)) return "";
        return String(
          question._title ??
          question.title ??
          question._text ??
          question.text ??
          question._question ??
          question.question ??
          question._prompt ??
          question.prompt ??
          "",
        ).trim();
      })
      .filter(Boolean);
  }

  private _format_project_plan_confirmation_failure(result: any) {
    const missing_questions = this._project_plan_missing_questions(result);
    if (missing_questions.length > 0) {
      return `Missing planning questions: ${missing_questions.join("; ")}`;
    }

    const detail = this._server_failure_detail(result);
    const source = is_obj(result?._error?._details)
      ? result._error._details
      : is_obj(result?._result?._error?._details)
        ? result._result._error._details
        : is_obj(result?._details)
          ? result._details
          : null;
    const blockers = Array.isArray(source?._blockers)
      ? source._blockers
      : [];
    const blocker_messages = blockers
      .map((blocker: any) => {
        if (typeof blocker === "string") return blocker.trim();
        if (!is_obj(blocker)) return "";
        return String(blocker._message ?? blocker.message ?? blocker._id ?? blocker.id ?? "").trim();
      })
      .filter(Boolean);
    if (detail._code === "E_PLANNING_INCOMPLETE" && blocker_messages.length > 0) {
      return `Plan is not ready: ${blocker_messages.join("; ")}`;
    }

    return this._format_server_failure(result, "Project plan confirmation failed.");
  }

  private _parse_error_object_string(value: string) {
    const trimmed = value.trim();
    if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return null;

    try {
      const parsed = JSON.parse(trimmed);
      return is_obj(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private _server_failure_detail(value: any): { _code: string; _message: string } {
    if (value instanceof Error) {
      const parsed = this._parse_error_object_string(value.message);
      if (parsed) return this._server_failure_detail(parsed);
      return { _code: "", _message: value.message || String(value) };
    }

    if (typeof value === "string") {
      const parsed = this._parse_error_object_string(value);
      if (parsed) return this._server_failure_detail(parsed);
      return { _code: "", _message: value.trim() };
    }

    if (!is_obj(value)) return { _code: "", _message: "" };

    const code = typeof value._code === "string" && value._code.trim()
      ? value._code.trim()
      : typeof value.code === "string" && value.code.trim()
        ? value.code.trim()
        : typeof value._error_code === "string" && value._error_code.trim()
          ? value._error_code.trim()
          : typeof value.error_code === "string" && value.error_code.trim()
            ? value.error_code.trim()
            : "";
    const message = typeof value._message === "string" && value._message.trim()
      ? value._message.trim()
      : typeof value.message === "string" && value.message.trim()
        ? value.message.trim()
        : typeof value._reason === "string" && value._reason.trim()
          ? value._reason.trim()
          : typeof value.reason === "string" && value.reason.trim()
            ? value.reason.trim()
            : "";

    if (code || message) return { _code: code, _message: message };

    const nested_candidates = [
      value._error,
      value.error,
      value._result,
      value.result,
      value._payload,
      value.payload,
    ].filter((candidate) => candidate !== value);
    for (const candidate of nested_candidates) {
      const detail = this._server_failure_detail(candidate);
      if (detail._message || detail._code) return detail;
    }

    return { _code: code, _message: message };
  }

  private _format_server_failure(result: any, fallback: string) {
    const detail = this._server_failure_detail(result);
    if (detail._code && detail._message) return `${detail._code}: ${detail._message}`;
    if (detail._message) return detail._message;
    if (detail._code) return detail._code;
    const artifact_message = this._format_artifact_request_failure(result);
    return artifact_message && artifact_message !== "Artifact request failed."
      ? artifact_message
      : fallback;
  }

  private _is_confirm_project_plan_not_ok(result: any) {
    if (result === undefined || result === null) return false;
    if (!is_obj(result)) return false;
    if (result._ok === false || result.ok === false) return true;
    if (result._status === "failed" || result.status === "failed") return true;
    if (result._success === false || result.success === false) return true;
    if (result._error || result.error) return true;
    return false;
  }

  private _project_plan_payload_from_artifact(artifact_request: Record<string, any> | null) {
    if (!is_obj(artifact_request)) return null;

    const candidates = [
      this._artifact_request_field(artifact_request, "project_plan"),
      this._artifact_request_field(artifact_request, "plan"),
      this._artifact_request_field(artifact_request, "updated_plan"),
      this._artifact_request_field(artifact_request, "plan_summary"),
      this._artifact_request_field(artifact_request, "payload"),
    ];

    return candidates.find((candidate): candidate is Record<string, any> => is_obj(candidate)) ??
      artifact_request;
  }

  private async _confirm_project_plan(payload?: any) {
    const request = this._normalize_artifact_request_event_payload(payload);
    if (!request) return;

    if (request._artifact_type !== PROJECT_PLAN_ARTIFACT_TYPE) {
      this._log("project plan confirm ignored: wrong artifact type", {
        _artifact_type: request._artifact_type,
        _message_id: request._message_id,
      });
      return;
    }

    if (this._conversation_action_status[request._request_key] === STUDIO_INTENT_ACTION_STATUS_RUNNING) {
      return;
    }

    if (!this._conversation_app_id || !this._conversation_env || !this._conversation_id) {
      const message = "No active conversation selected.";
      this._set_conversation_action_status(
        request._request_key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("project plan confirm failed", {
        _message_id: request._message_id,
        _error: message,
      });
      return;
    }

    this._set_conversation_action_status(
      request._request_key,
      STUDIO_INTENT_ACTION_STATUS_RUNNING,
    );
    this._write_studio_status("Confirming project plan...");
    this._log("project plan confirm requested", {
      _message_id: request._message_id,
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
    });
    this._render_conversation_messages();

    const project_plan = this._project_plan_payload_from_artifact(request._artifact_request);
    const params: Record<string, any> = {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      ...(request._message_id ? { _message_id: request._message_id } : {}),
      ...(project_plan ? { _project_plan: project_plan } : {}),
      ...(request._artifact_request ? { _artifact_request: request._artifact_request } : {}),
    };

    try {
      this._log("project plan confirm command", {
        _module: "xvibe",
        _op: "confirm-project-plan",
        _params: params,
      });
      const result = await this._send_xvibe_command("confirm-project-plan", params);
      if (this._is_confirm_project_plan_not_ok(result)) {
        const message = this._format_project_plan_confirmation_failure(result);
        this._set_conversation_action_status(
          request._request_key,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          message,
        );
        this._write_studio_status(message);
        this._error("project plan confirm failed", {
          _message_id: request._message_id,
          _result: result,
          _error: message,
        });
        await this._persist_conversation_artifact_status_and_reload(
          request,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          message,
          result,
        );
        return;
      }

      this._conversation_action_result[request._request_key] = "Plan confirmed.";
      this._set_conversation_action_status(
        request._request_key,
        STUDIO_INTENT_ACTION_STATUS_DONE,
      );
      this._planning_question_multi_answers = {};
      this._conversation_transient_messages = [];
      this._write_studio_status("✓ Plan confirmed. Guide is ready.");
      this._log("project plan confirmed", {
        _message_id: request._message_id,
        _app_id: this._conversation_app_id,
        _env: this._conversation_env,
        _result: result,
      });
      try {
        await this._persist_conversation_artifact_status_and_reload(
          request,
          STUDIO_INTENT_ACTION_STATUS_DONE,
          "",
          "Plan confirmed.",
        );
        await this._refresh_guide_after_success("project-plan-confirmed", {
          _clear_active_recommendation: true,
          _log_message: "guide refreshed after project plan confirmation",
          _detail: {
            _message_id: request._message_id,
            _artifact_type: request._artifact_type,
            _operation: request._operation,
          },
        });
        this._open_guide_portlet("project-plan-confirmed");
      } catch (refresh_err) {
        this._error("project plan confirm post-success refresh failed", {
          _message_id: request._message_id,
          _artifact_type: request._artifact_type,
          _operation: request._operation,
          _error: to_err(refresh_err),
        });
        this._open_guide_portlet("project-plan-confirmed-refresh-failed");
      }
      this._render_conversation_messages();
    } catch (err) {
      const message = this._format_server_failure(err, "Project plan confirmation failed.");
      this._set_conversation_action_status(
        request._request_key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("project plan confirm failed", {
        _message_id: request._message_id,
        _error: message,
        _raw_error: to_err(err),
      });
      await this._persist_conversation_artifact_status_and_reload(
        request,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
    }
  }

  private _format_artifact_request_failure(result: any) {
    const structured = this._artifact_request_error_payload(result);
    if (structured) {
      const code = typeof structured._code === "string" ? structured._code.trim() : "";
      const message = typeof structured._message === "string" ? structured._message.trim() : "";
      if (code && message) return `${code}: ${message}`;
      if (message) return message;
      if (code) return code;
    }

    const error =
      typeof result?._error === "string" && result._error.trim()
        ? result._error.trim()
        : typeof result?._error?._message === "string" && result._error._message.trim()
          ? result._error._message.trim()
        : typeof result?._result?._error === "string" && result._result._error.trim()
          ? result._result._error.trim()
          : typeof result?._result?._error?._message === "string" && result._result._error._message.trim()
            ? result._result._error._message.trim()
          : typeof result?._message === "string" && result._message.trim()
            ? result._message.trim()
            : "";

    return error || "Artifact request failed.";
  }

  private _artifact_request_error_payload(result: any): Record<string, any> | null {
    if (is_obj(result?._error)) return result._error;
    if (is_obj(result?.error)) return result.error;
    if (is_obj(result?._result?._error)) return result._result._error;
    if (is_obj(result?.result?.error)) return result.result.error;
    if (is_obj(result)) {
      const parsed = typeof result.message === "string"
        ? this._parse_error_object_string(result.message)
        : null;
      if (is_obj(parsed?._error)) return parsed._error;
      if (typeof parsed?._code === "string") return parsed;
    }
    if (result instanceof Error) {
      const parsed = this._parse_error_object_string(result.message);
      if (is_obj(parsed?._error)) return parsed._error;
      if (typeof parsed?._code === "string") return parsed;
    }
    return null;
  }

  private _artifact_request_field(source: Record<string, any>, key: string) {
    return source[`_${key}`] ?? source[key];
  }

  private _artifact_request_pick_fields(
    source: Record<string, any>,
    fields: string[],
  ) {
    const out: Record<string, any> = {};
    for (const field of fields) {
      const value = source[field];
      if (value !== undefined) out[field] = value;
    }
    return out;
  }

  private _normalized_artifact_apply_request(request: {
    _artifact_type: string;
    _artifact_request: Record<string, any> | null;
  }) {
    if (!is_obj(request._artifact_request)) return null;
    const source = request._artifact_request;
    const common_fields = ["_operation"];
    if (request._artifact_type === "entity") {
      return this._artifact_request_pick_fields(source, [
        ...common_fields,
        "_entity_name",
        "_entity_title",
        "_fields",
      ]);
    }
    if (request._artifact_type === "flow") {
      return this._artifact_request_pick_fields(source, [
        ...common_fields,
        "_action",
        "_flow_id",
        "_entity_name",
        "_fields",
        "_xdata_key",
        "_xdata_value",
      ]);
    }
    if (request._artifact_type === "form" || request._artifact_type === "table") {
      return this._artifact_request_pick_fields(source, [
        ...common_fields,
        "_view_id",
        "_entity_name",
        "_fields",
      ]);
    }
    if (request._artifact_type === "crud-evolution") {
      return this._artifact_request_pick_fields(source, [
        ...common_fields,
        "_entity_name",
        "_field_name",
        "_old_field",
        "_new_field",
      ]);
    }
    return { ...source };
  }

  private _prepare_execution_graph_params(request: {
    _artifact_request: Record<string, any> | null;
  }): XStudioIntentActionParamsResult {
    if (!is_obj(request._artifact_request)) {
      return {
        _ok: false,
        _error: "Execution graph request payload is missing.",
        _params: null,
      };
    }

    const graph_type = String(
      this._artifact_request_field(request._artifact_request, "graph_type") ?? "",
    ).trim();
    if (!graph_type) {
      return {
        _ok: false,
        _error: "Execution graph request is missing _graph_type.",
        _params: null,
      };
    }
    if (graph_type !== "crud") {
      return {
        _ok: false,
        _error: "Execution graph type is not supported.",
        _params: null,
      };
    }

    const entity_name = String(
      this._artifact_request_field(request._artifact_request, "entity_name") ?? "",
    ).trim();
    if (!entity_name) {
      return {
        _ok: false,
        _error: "Execution graph request is missing _entity_name.",
        _params: null,
      };
    }

    const params: Record<string, any> = {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _graph_type: graph_type,
      _entity_name: entity_name,
    };
    const fields = this._artifact_request_field(
      request._artifact_request,
      "fields",
    );
    if (Array.isArray(fields)) {
      params._fields = fields;
    }

    const execution_graph = this._artifact_request_field(
      request._artifact_request,
      "execution_graph",
    );
    if (is_obj(execution_graph)) {
      params._execution_graph = execution_graph;
    }

    return {
      _ok: true,
      _error: "",
      _params: params,
    };
  }

  private async _continue_conversation_execution_graph(
    request: {
      _request_key: string;
      _message_id: string;
      _artifact_type: string;
      _operation: string;
      _artifact_name: string;
      _artifact_request: Record<string, any> | null;
    },
  ) {
    if (!this._conversation_app_id || !this._conversation_env || !this._conversation_id) {
      const message = "No active conversation selected.";
      this._set_conversation_action_status(
        request._request_key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("execution graph execution failed", {
        _message_id: request._message_id,
        _error: message,
      });
      return;
    }

    const prepared = this._prepare_execution_graph_params(request);
    this._set_conversation_action_status(request._request_key, STUDIO_INTENT_ACTION_STATUS_RUNNING);
    this._write_studio_status("Executing execution graph...");
    this._log("execution graph continue requested", {
      _message_id: request._message_id,
      _artifact_type: request._artifact_type,
      _operation: request._operation,
      _artifact_name: request._artifact_name,
      ...(prepared._params
        ? {
          _app_id: prepared._params._app_id,
          _env: prepared._params._env,
          _graph_type: prepared._params._graph_type,
          _entity_name: prepared._params._entity_name,
        }
        : {}),
    });

    if (!prepared._ok || !prepared._params) {
      this._set_conversation_action_status(
        request._request_key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        prepared._error,
      );
      this._write_studio_status(prepared._error);
      this._error("execution graph execution failed", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
        _operation: request._operation,
        _artifact_name: request._artifact_name,
        _error: prepared._error,
      });
      await this._persist_conversation_artifact_status_and_reload(
        request,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        prepared._error,
      );
      return;
    }

    try {
      const result = await this._send_xvibe_command(
        "execute-execution-graph",
        prepared._params,
      );
      if (!is_obj(result) || result._ok !== true) {
        const message = this._format_artifact_request_failure(result);
        this._set_conversation_action_status(
          request._request_key,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          message,
        );
        this._write_studio_status(message);
        this._error("execution graph execution failed", {
          _message_id: request._message_id,
          _artifact_type: request._artifact_type,
          _operation: request._operation,
          _artifact_name: request._artifact_name,
          _result: result,
        });
        await this._persist_conversation_artifact_status_and_reload(
          request,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          message,
        );
        return;
      }

      this._conversation_action_result[request._request_key] = result;
      this._set_conversation_action_status(
        request._request_key,
        STUDIO_INTENT_ACTION_STATUS_DONE,
      );
      this._write_studio_status("Execution graph completed");
      this._log("execution graph execution completed", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
        _operation: request._operation,
        _artifact_name: request._artifact_name,
        _summary: result._summary,
      });
      await this._persist_conversation_artifact_status_and_reload(
        request,
        STUDIO_INTENT_ACTION_STATUS_DONE,
        "",
        result,
      );
      try {
        await this._refresh_app_explorer();
      } catch (refresh_err) {
        this._error("artifact request app explorer refresh failed", {
          _message_id: request._message_id,
          _artifact_type: request._artifact_type,
          _operation: request._operation,
          _artifact_name: request._artifact_name,
          _error: to_err(refresh_err),
        });
      }
      await this._refresh_guide_after_success("execution-graph-success", {
        _clear_active_recommendation: true,
        _log_message: "guide refreshed after execution graph success",
        _detail: {
          _message_id: request._message_id,
          _artifact_type: request._artifact_type,
          _operation: request._operation,
          _artifact_name: request._artifact_name,
        },
      });
    } catch (err) {
      const message = to_err(err) || "Execution graph failed.";
      this._set_conversation_action_status(
        request._request_key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("execution graph execution failed", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
        _operation: request._operation,
        _artifact_name: request._artifact_name,
        _error: to_err(err),
      });
      await this._persist_conversation_artifact_status_and_reload(
        request,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
    }
  }

  private _crud_field_suggestion_execution_graph_request(
    request: {
      _request_key: string;
      _message_id: string;
      _artifact_type: string;
      _operation: string;
      _artifact_name: string;
      _artifact_request: Record<string, any> | null;
    },
  ) {
    if (!is_obj(request._artifact_request)) return request;

    return {
      ...request,
      _artifact_request: {
        ...request._artifact_request,
        _operation: "plan",
        _graph_type: "crud",
      },
    };
  }

  private async _persist_conversation_artifact_status_and_reload(
    request: {
      _request_key: string;
      _message_id: string;
      _artifact_type: string;
      _operation: string;
      _artifact_name: string;
      _artifact_request: Record<string, any> | null;
    },
    status: XStudioIntentActionLocalStatus,
    error: any = "",
    artifact_result?: any,
  ) {
    if (!this._conversation_app_id || !this._conversation_env || !this._conversation_id) {
      const message = "No active conversation selected.";
      this._set_conversation_action_status(
        request._request_key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("artifact request status persist skipped", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
        _operation: request._operation,
        _name: request._artifact_name,
        _artifact_status: status,
        _error: message,
      });
      return false;
    }

    const params: Record<string, any> = {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      _message_id: request._message_id,
      _artifact_type: request._artifact_type,
      _artifact_request: request._artifact_request,
      _artifact_status: status,
    };

    if (error) params._artifact_error = error;
    if (artifact_result !== undefined) params._artifact_result = artifact_result;

    this._log("artifact request status persist requested", {
      _message_id: request._message_id,
      _artifact_type: request._artifact_type,
      _operation: request._operation,
      _name: request._artifact_name,
      _artifact_status: status,
      ...(error ? { _artifact_error: error } : {}),
      _has_result: artifact_result !== undefined,
    });

    try {
      const result = await this._send_xvibe_command("update-conversation-artifact", params);
      this._log("artifact request status persisted", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
        _operation: request._operation,
        _name: request._artifact_name,
        _artifact_status: status,
        _result: result,
      });
      await this._load_conversation_messages();
      return true;
    } catch (err) {
      this._error("artifact request status persist failed", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
        _operation: request._operation,
        _name: request._artifact_name,
        _artifact_status: status,
        _error: to_err(err),
      });
      return false;
    }
  }

  private _mutation_plan_field(source: Record<string, any>, key: string) {
    return source[`_${key}`] ?? source[key];
  }

  private _mutation_plan_step_array(value: any) {
    return Array.isArray(value) ? value : [];
  }

  private _mutation_plan_status_key(value: any) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");
  }

  private _mutation_plan_step_primitive(step: Record<string, any>) {
    const primitive = step._primitive ?? step.primitive;
    return is_obj(primitive) ? primitive : null;
  }

  private _mutation_plan_step_has_executable_primitive(step: Record<string, any>) {
    const primitive = this._mutation_plan_step_primitive(step);
    if (!primitive) return false;

    const module_name = String(primitive._module ?? primitive.module ?? "").trim();
    const op = String(primitive._op ?? primitive.op ?? "").trim();
    return module_name === "xvibe" && (
      op === "apply-view-edit" ||
      op === "apply-generated-operation"
    );
  }

  private _mutation_plan_step_blocks_apply(step: Record<string, any>) {
    const status = this._mutation_plan_status_key(step._status ?? step.status);
    const resolution_state = this._mutation_plan_status_key(
      step._resolution_state ??
      step.resolution_state ??
      step._resolution_status ??
      step.resolution_status ??
      step._generation_state ??
      step.generation_state ??
      step._fallback_state ??
      step.fallback_state,
    );

    if (
      resolution_state === "generation-required" ||
      resolution_state === "validation-failed" ||
      resolution_state === "genuinely-unsupported" ||
      resolution_state === "unsupported-after-generation-failure"
    ) {
      return true;
    }

    if (status === "unsupported") return true;
    return !this._mutation_plan_step_has_executable_primitive(step);
  }

  private _mutation_plan_has_unsupported_steps(plan: Record<string, any>) {
    const unsupported_value = this._mutation_plan_field(plan, "unsupported_steps") ??
      this._mutation_plan_field(plan, "unsupported_step_count");
    if (Array.isArray(unsupported_value) && unsupported_value.length > 0) return true;
    if (typeof unsupported_value === "number" && Number.isFinite(unsupported_value) && unsupported_value > 0) {
      return true;
    }
    if (typeof unsupported_value === "string" && unsupported_value.trim()) {
      const parsed = Number(unsupported_value.trim());
      if (Number.isFinite(parsed) && parsed > 0) return true;
    }

    const steps = this._mutation_plan_step_array(this._mutation_plan_field(plan, "steps"));
    return steps.some((step) => is_obj(step) && this._mutation_plan_step_blocks_apply(step));
  }

  private _mutation_plan_can_apply(plan: Record<string, any>) {
    const steps = this._mutation_plan_step_array(this._mutation_plan_field(plan, "steps"));
    return this._mutation_plan_field(plan, "can_apply") === true &&
      steps.length > 0 &&
      !this._mutation_plan_has_unsupported_steps(plan);
  }

  private _mutation_plan_execution_state_key(message_id: string) {
    const parts = [
      this._conversation_id || "no-conversation",
      message_id || "no-message",
    ].map((part) => this._conversation_action_key_part(part));

    return parts.join(":");
  }

  private _mutation_plan_execution_state_key_for_request(request: {
    _message_id: string;
  }) {
    return this._mutation_plan_execution_state_key(request._message_id);
  }

  private _mutation_plan_result_source(result: any) {
    if (!is_obj(result)) return null;
    const nested_result = result._result ?? result.result;
    return is_obj(nested_result) ? nested_result : result;
  }

  private _mutation_plan_result_view_id(result: any) {
    const source = this._mutation_plan_result_source(result);
    if (!source) return "";

    const refresh = is_obj(source._refresh ?? source.refresh)
      ? source._refresh ?? source.refresh
      : null;
    const app = is_obj(source._app ?? source.app)
      ? source._app ?? source.app
      : null;
    const app_meta = is_obj(app?._meta ?? app?.meta)
      ? app?._meta ?? app?.meta
      : null;
    const app_config = is_obj(app?._config ?? app?.config)
      ? app?._config ?? app?.config
      : null;
    const app_start = is_obj(app_config?._start ?? app_config?.start)
      ? app_config?._start ?? app_config?.start
      : null;

    const candidates = [
      refresh?._default_view_id,
      refresh?.default_view_id,
      refresh?._active_view_id,
      refresh?.active_view_id,
      refresh?._view_id,
      refresh?.view_id,
      source._default_view_id,
      source.default_view_id,
      source._active_view_id,
      source.active_view_id,
      source._view_id,
      source.view_id,
      app_meta?._entry_view_id,
      app_meta?.entry_view_id,
      app_start?._view_id,
      app_start?.view_id,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }

    return "";
  }

  private _mutation_plan_result_steps(result: any, plan: Record<string, any> | null, status: string) {
    const source = this._mutation_plan_result_source(result);
    const returned_steps =
      source?._steps ??
      source?.steps ??
      source?._step_results ??
      source?.step_results ??
      source?._results ??
      source?.results;

    if (Array.isArray(returned_steps) && returned_steps.length > 0) {
      return _xu.clone_json(returned_steps) as any[];
    }

    const plan_steps = plan ? this._mutation_plan_field(plan, "steps") : null;
    if (!Array.isArray(plan_steps)) return [];

    return plan_steps.flatMap((step) => {
      if (!is_obj(step)) return [step];
      return [{
        ...(_xu.clone_json(step) as Record<string, any>),
        _status: status === STUDIO_INTENT_ACTION_STATUS_DONE ? "done" : step._status ?? step.status ?? "planned",
      }];
    });
  }

  private _mutation_plan_result_completed_count(result: any, steps: any[]) {
    const source = this._mutation_plan_result_source(result);
    const explicit_count = typeof source?._completed_count === "number"
      ? source._completed_count
      : typeof source?.completed_count === "number"
        ? source.completed_count
        : null;
    if (explicit_count !== null) return explicit_count;

    const completed_steps = source?._completed_steps ?? source?.completed_steps;
    if (Array.isArray(completed_steps)) return completed_steps.length;

    return steps.filter((step) => {
      if (!is_obj(step)) return false;
      const status = String(step._status ?? step.status ?? "").trim().toLowerCase();
      return ["done", "completed", "applied", "success", "succeeded", "ok"].includes(status);
    }).length;
  }

  private _mutation_plan_result_failed_count(result: any, steps: any[]) {
    const source = this._mutation_plan_result_source(result);
    const explicit_count = typeof source?._failed_count === "number"
      ? source._failed_count
      : typeof source?.failed_count === "number"
        ? source.failed_count
        : null;
    if (explicit_count !== null) return explicit_count;

    const failed_steps = source?._failed_steps ?? source?.failed_steps;
    if (Array.isArray(failed_steps)) return failed_steps.length;
    if (source?._failed_step || source?.failed_step) return 1;

    return steps.filter((step) => {
      if (!is_obj(step)) return false;
      const status = String(step._status ?? step.status ?? "").trim().toLowerCase();
      return ["failed", "error"].includes(status);
    }).length;
  }

  private _mutation_plan_execution_state_from_result(
    result: any,
    plan: Record<string, any> | null,
    status: string,
    collapsed: boolean,
  ): XStudioMutationPlanExecutionState {
    const steps = this._mutation_plan_result_steps(result, plan, status);
    return {
      _status: status,
      _collapsed: collapsed,
      _completed_steps: this._mutation_plan_result_completed_count(result, steps),
      _failed_steps: this._mutation_plan_result_failed_count(result, steps),
      _steps: steps,
      _result: result,
    };
  }

  private _mutation_plan_execution_state_from_persisted_artifact(
    request: XStudioArtifactRequestView | null,
    collapsed_override?: boolean,
  ): XStudioMutationPlanExecutionState | null {
    if (!request || request._artifact_type !== MUTATION_PLAN_ARTIFACT_TYPE) return null;
    if (
      request._status !== STUDIO_INTENT_ACTION_STATUS_DONE &&
      request._status !== STUDIO_INTENT_ACTION_STATUS_FAILED
    ) {
      return null;
    }

    return this._mutation_plan_execution_state_from_result(
      request._result ?? {},
      is_obj(request._artifact_request) ? request._artifact_request : null,
      request._status,
      typeof collapsed_override === "boolean"
        ? collapsed_override
        : request._status === STUDIO_INTENT_ACTION_STATUS_DONE,
    );
  }

  private _set_mutation_plan_execution_state(
    request: {
      _message_id: string;
    },
    state: XStudioMutationPlanExecutionState,
  ) {
    const state_key = this._mutation_plan_execution_state_key_for_request(request);
    this._mutation_plan_execution_state[state_key] = state;
    this._log("mutation plan local state updated", {
      _conversation_id: this._conversation_id,
      _message_id: request._message_id,
      _status: state._status,
      _collapsed: state._collapsed,
      _completed_steps: state._completed_steps,
    });
  }

  private _is_apply_mutation_plan_failure(result: any) {
    if (!is_obj(result)) return false;
    if (result._ok === false || result.ok === false) return true;
    if (result._success === false || result.success === false) return true;
    if (result._status === "failed" || result.status === "failed") return true;
    if (result._error || result.error) return true;
    return false;
  }

  private async _refresh_after_apply_mutation_plan(result: any) {
    const view_id = this._mutation_plan_result_view_id(result) || this._resolve_studio_target_view_id();
    if (view_id && typeof this._xvm_client?.render_view === "function") {
      try {
        await this._xvm_client.render_view(view_id);
      } catch (err) {
        this._error("mutation plan active view refresh failed", {
          _view_id: view_id,
          _error: to_err(err),
        });
      }
    }

    this._refresh_object_tree_for_current_view();
    await this._refresh_app_explorer();
    await this._load_studio_current_view_json();
    try {
      await this._refresh_guide_after_success("mutation-plan-success", {
        _clear_active_recommendation: true,
        _log_message: "guide refreshed after mutation plan success",
        _detail: {
          _view_id: view_id,
        },
      });
    } catch (err) {
      this._error("mutation plan guide refresh failed", {
        _view_id: view_id,
        _error: to_err(err),
      });
    }
    this._log("mutation plan refreshed live app", {
      _view_id: view_id,
      _result: result,
    });
  }

  private async _apply_conversation_mutation_plan(request: {
    _request_key: string;
    _message_id: string;
    _artifact_type: string;
    _operation: string;
    _artifact_name: string;
    _artifact_request: Record<string, any> | null;
  }) {
    if (this._conversation_action_status[request._request_key] === STUDIO_INTENT_ACTION_STATUS_RUNNING) {
      return;
    }

    const plan = is_obj(request._artifact_request) ? request._artifact_request : null;
    if (!plan) {
      const message = "Change plan payload is missing.";
      delete this._mutation_plan_collapsed[request._request_key];
      delete this._mutation_plan_execution_state[
        this._mutation_plan_execution_state_key_for_request(request)
      ];
      this._set_conversation_action_status(request._request_key, STUDIO_INTENT_ACTION_STATUS_FAILED, message);
      this._write_studio_status(message);
      return;
    }

    if (!this._mutation_plan_can_apply(plan)) {
      this._log("mutation plan apply ignored: plan is not ready", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
      });
      return;
    }

    if (!this._conversation_app_id || !this._conversation_env || !this._conversation_id) {
      const message = "No active conversation selected.";
      delete this._mutation_plan_collapsed[request._request_key];
      delete this._mutation_plan_execution_state[
        this._mutation_plan_execution_state_key_for_request(request)
      ];
      this._set_conversation_action_status(request._request_key, STUDIO_INTENT_ACTION_STATUS_FAILED, message);
      this._write_studio_status(message);
      return;
    }

    delete this._mutation_plan_collapsed[request._request_key];
    this._set_mutation_plan_execution_state(
      request,
      this._mutation_plan_execution_state_from_result(
        { _ok: true, _result: {} },
        plan,
        STUDIO_INTENT_ACTION_STATUS_RUNNING,
        false,
      ),
    );
    this._set_conversation_action_status(request._request_key, STUDIO_INTENT_ACTION_STATUS_RUNNING);
    this._write_studio_status("Applying change plan...");
    this._log("mutation plan apply requested", {
      _message_id: request._message_id,
      _artifact_type: request._artifact_type,
      _operation: request._operation,
    });

    const params = {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
      _message_id: request._message_id,
      _plan: plan,
    };

    try {
      const result = await this._send_xvibe_command("apply-mutation-plan", params);
      if (this._is_apply_mutation_plan_failure(result)) {
        const message = this._format_server_failure(result, "Change plan failed.");
        delete this._mutation_plan_collapsed[request._request_key];
        this._set_mutation_plan_execution_state(
          request,
          this._mutation_plan_execution_state_from_result(
            result,
            plan,
            STUDIO_INTENT_ACTION_STATUS_FAILED,
            false,
          ),
        );
        this._set_conversation_action_status(request._request_key, STUDIO_INTENT_ACTION_STATUS_FAILED, message);
        this._conversation_action_result[request._request_key] = result;
        this._render_conversation_messages();
        this._write_studio_status(message);
        this._error("mutation plan apply failed", {
          _message_id: request._message_id,
          _result: result,
        });
        await this._persist_conversation_artifact_status_and_reload(
          request,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          message,
          result,
        );
        return;
      }

      this._conversation_action_result[request._request_key] = result;
      this._log("mutation plan apply completed", {
        _message_id: request._message_id,
        _result: result,
      });
      await this._refresh_after_apply_mutation_plan(result);
      this._set_mutation_plan_execution_state(
        request,
        this._mutation_plan_execution_state_from_result(
          result,
          plan,
          STUDIO_INTENT_ACTION_STATUS_DONE,
          true,
        ),
      );
      this._mutation_plan_collapsed[request._request_key] = true;
      this._set_conversation_action_status(request._request_key, STUDIO_INTENT_ACTION_STATUS_DONE);
      this._write_studio_status("✓ Change plan applied");
      await this._persist_conversation_artifact_status_and_reload(
        request,
        STUDIO_INTENT_ACTION_STATUS_DONE,
        "",
        result,
      );
    } catch (err) {
      const message = this._format_server_failure(err, "Change plan failed.");
      delete this._mutation_plan_collapsed[request._request_key];
      this._set_mutation_plan_execution_state(
        request,
        this._mutation_plan_execution_state_from_result(
          err,
          plan,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          false,
        ),
      );
      this._set_conversation_action_status(request._request_key, STUDIO_INTENT_ACTION_STATUS_FAILED, message);
      this._conversation_action_result[request._request_key] = err;
      this._render_conversation_messages();
      this._write_studio_status(message);
      this._error("mutation plan apply failed", {
        _message_id: request._message_id,
        _error: to_err(err),
      });
      await this._persist_conversation_artifact_status_and_reload(
        request,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
        is_obj(err) ? err : { _error: to_err(err) },
      );
    }
  }

  private async _apply_conversation_artifact_request(payload?: any) {
    const request = this._normalize_artifact_request_event_payload(payload);
    if (!request) return;

    if (this._conversation_action_status[request._request_key] === STUDIO_INTENT_ACTION_STATUS_RUNNING) {
      return;
    }

    if (request._artifact_type === EXECUTION_GRAPH_ARTIFACT_TYPE) {
      await this._continue_conversation_execution_graph(request);
      return;
    }

    if (request._artifact_type === CRUD_FIELD_SUGGESTION_ARTIFACT_TYPE) {
      await this._continue_conversation_execution_graph(
        this._crud_field_suggestion_execution_graph_request(request),
      );
      return;
    }

    if (request._artifact_type === PROJECT_PLAN_ARTIFACT_TYPE) {
      this._log("project plan apply ignored: actions are prompt-only in V1", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
        _operation: request._operation,
      });
      return;
    }

    if (request._artifact_type === MUTATION_PLAN_ARTIFACT_TYPE) {
      await this._apply_conversation_mutation_plan(request);
      return;
    }

    if (!this._conversation_app_id || !this._conversation_env || !this._conversation_id) {
      const message = "No active conversation selected.";
      this._set_conversation_action_status(
        request._request_key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("artifact request apply failed", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
        _operation: request._operation,
        _artifact_name: request._artifact_name,
        _error: message,
      });
      return;
    }

    const artifact_request = this._normalized_artifact_apply_request(request);
    if (!artifact_request) {
      const message = "Artifact request payload is missing.";
      this._set_conversation_action_status(
        request._request_key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        message,
      );
      this._write_studio_status(message);
      this._error("artifact request apply failed", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
        _operation: request._operation,
        _artifact_name: request._artifact_name,
        _error: message,
      });
      return;
    }

    this._set_conversation_action_status(request._request_key, STUDIO_INTENT_ACTION_STATUS_RUNNING);
    this._write_studio_status(`Applying ${request._artifact_type} artifact request...`);
    this._log("artifact request apply requested", {
      _message_id: request._message_id,
      _artifact_type: request._artifact_type,
      _operation: request._operation,
      _artifact_name: request._artifact_name,
    });

    const params = {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _artifact_type: request._artifact_type,
      _artifact_request: artifact_request,
      _conversation_id: this._conversation_id,
      _message_id: request._message_id,
    };

    try {
      const result = await this._send_xvibe_command("apply-artifact-request", params);
      if (!is_obj(result) || result._ok !== true) {
        const message = this._format_artifact_request_failure(result);
        const artifact_error = this._artifact_request_error_payload(result) ?? message;
        this._set_conversation_action_status(
          request._request_key,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          artifact_error,
        );
        this._write_studio_status(message);
        this._error("artifact request apply failed", {
          _message_id: request._message_id,
          _artifact_type: request._artifact_type,
          _operation: request._operation,
          _artifact_name: request._artifact_name,
          _result: result,
        });
        await this._persist_conversation_artifact_status_and_reload(
          request,
          STUDIO_INTENT_ACTION_STATUS_FAILED,
          artifact_error,
          result,
        );
        return;
      }

      const success = xstudio_artifact_request_success_message(request);
      this._conversation_action_result[request._request_key] = success;
      this._set_conversation_action_status(request._request_key, STUDIO_INTENT_ACTION_STATUS_DONE);
      this._write_studio_status(success);
      this._log("artifact request apply completed", {
        _artifact_type: request._artifact_type,
        _operation: request._operation,
        _name: request._artifact_name,
        _ok: true,
      });
      await this._persist_conversation_artifact_status_and_reload(
        request,
        STUDIO_INTENT_ACTION_STATUS_DONE,
        "",
        result,
      );
      try {
        await this._refresh_app_explorer();
      } catch (refresh_err) {
        this._error("artifact request app explorer refresh failed", {
          _message_id: request._message_id,
          _artifact_type: request._artifact_type,
          _operation: request._operation,
          _artifact_name: request._artifact_name,
          _error: to_err(refresh_err),
        });
      }
      await this._refresh_guide_after_success("artifact-request-success", {
        _clear_active_recommendation: true,
      });
    } catch (err) {
      const artifact_error = this._artifact_request_error_payload(err) ??
        (is_obj(err) ? err : "Artifact request failed.");
      const message = this._format_artifact_request_failure(err);
      this._set_conversation_action_status(
        request._request_key,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        artifact_error,
      );
      this._write_studio_status(message);
      this._error("artifact request apply failed", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
        _operation: request._operation,
        _artifact_name: request._artifact_name,
        _error: to_err(err),
      });
      await this._persist_conversation_artifact_status_and_reload(
        request,
        STUDIO_INTENT_ACTION_STATUS_FAILED,
        artifact_error,
        is_obj(err) ? err : { _error: artifact_error },
      );
    }
  }

  private _show_mutation_plan_details(payload?: any) {
    const request = this._normalize_artifact_request_event_payload(payload);
    if (!request || request._artifact_type !== MUTATION_PLAN_ARTIFACT_TYPE) return;

    const state_key = this._mutation_plan_execution_state_key_for_request(request);
    const state = this._mutation_plan_execution_state[state_key];
    if (state) {
      this._set_mutation_plan_execution_state(request, {
        ...state,
        _collapsed: false,
      });
    } else {
      this._mutation_plan_collapsed[request._request_key] = false;
    }
    this._log("mutation plan details expanded", {
      _message_id: request._message_id,
      _artifact_type: request._artifact_type,
      _operation: request._operation,
      _artifact_name: request._artifact_name,
    });
    this._render_conversation_messages();
  }

  private _toggle_project_plan_review(payload?: any) {
    const request = this._normalize_artifact_request_event_payload(payload);
    if (!request || request._artifact_type !== PROJECT_PLAN_ARTIFACT_TYPE) return;

    this._project_plan_expanded[request._request_key] =
      this._project_plan_expanded[request._request_key] !== true;
    this._log("project plan review toggled", {
      _message_id: request._message_id,
      _expanded: this._project_plan_expanded[request._request_key] === true,
    });
    this._render_conversation_messages();
  }

  private async _dismiss_conversation_artifact_request(payload?: any) {
    const request = this._normalize_artifact_request_event_payload(payload);
    if (!request) return;

    this._set_conversation_action_status(
      request._request_key,
      STUDIO_INTENT_ACTION_STATUS_DISMISSED,
    );

    if (request._artifact_type === MUTATION_PLAN_ARTIFACT_TYPE) {
      delete this._mutation_plan_collapsed[request._request_key];
      delete this._mutation_plan_execution_state[
        this._mutation_plan_execution_state_key_for_request(request)
      ];
      this._log("mutation plan dismissed locally", {
        _message_id: request._message_id,
        _artifact_type: request._artifact_type,
        _operation: request._operation,
        _artifact_name: request._artifact_name,
      });
      this._render_conversation_messages();
      return;
    }

    if (request._artifact_type === PROJECT_PLAN_ARTIFACT_TYPE) {
      delete this._project_plan_expanded[request._request_key];
    }

    this._log("artifact request dismissed", {
      _message_id: request._message_id,
      _artifact_type: request._artifact_type,
      _operation: request._operation,
      _artifact_name: request._artifact_name,
    });
    await this._persist_conversation_artifact_status_and_reload(
      request,
      STUDIO_INTENT_ACTION_STATUS_DISMISSED,
    );
  }

  private _conversation_intent_render_actions(message: XStudioConversationMessage, message_index: number) {
    return this._conversation_intent_actions(message, message_index)
      .filter((action) =>
        action._status !== STUDIO_INTENT_ACTION_STATUS_DISMISSED,
      )
      .map((action) => {
        const execute_state = this._intent_action_card_execute_state(action);
        const edit_action = this._intent_action_edit_action(action);
        const missing_required_fields = this._intent_action_missing_required_fields(action);
        this._log("intent action card state", {
          _action_id: action._id,
          _action_type: action._action_type,
          _status: action._status,
          _executable: execute_state._can_execute,
          _has_execution_payload: action._has_execution_payload,
          _missing_required_fields: missing_required_fields,
          _source_executable: action._executable,
          _requires_approval: action._requires_approval,
          _has_params: is_obj(action._params),
          _edit_action: edit_action,
          _disabled_reason: execute_state._disabled_reason,
        });

        return {
          ...action,
          _execute_state: execute_state,
        };
      });
  }

  private _project_memory_stage() {
    try {
      const app_id = this._client().getActiveAppId();
      const env = this._client().getActiveEnv() || "default";
      if (!app_id || this._project_memory_loaded_scope !== this._project_memory_scope_key(app_id, env)) {
        return "";
      }
    } catch {
      return "";
    }

    const memory = _xd.get(PROJECT_MEMORY_XD_KEY);
    const stage = is_obj(memory) ? memory._stage : "";
    return typeof stage === "string" ? stage.trim() : "";
  }

  private _conversation_message_is_meaningful(message: XStudioConversationMessage) {
    if (this._local_conversation_text(message._text)) return true;
    if (is_obj(message._intent)) return true;
    return message._pending_status === "pending" ||
      message._pending_status === "analyzing" ||
      message._pending_status === "failed";
  }

  private _should_render_planning_greeting(messages: XStudioConversationMessage[]) {
    if (this._project_memory_stage() !== STUDIO_PLANNING_STAGE) return false;
    return !messages.some((message) => this._conversation_message_is_meaningful(message));
  }

  private _planning_greeting_view(messages: XStudioConversationMessage[]) {
    if (!this._should_render_planning_greeting(messages)) return null;
    return {
      _quick_starts: STUDIO_PLANNING_GREETING_QUICK_STARTS,
    };
  }

  private _conversation_render_message(message: XStudioConversationMessage, index: number): XStudioConversationRenderMessage {
    const artifact_request = this._conversation_artifact_request(message, index);
    const mutation_plan_state_key = artifact_request?._artifact_type === MUTATION_PLAN_ARTIFACT_TYPE
      ? this._mutation_plan_execution_state_key(artifact_request._message_id)
      : "";
    const mutation_plan_execution_state = mutation_plan_state_key
      ? this._mutation_plan_execution_state[mutation_plan_state_key] ??
        this._mutation_plan_execution_state_from_persisted_artifact(
          artifact_request,
          artifact_request && this._mutation_plan_collapsed[artifact_request._key] === false
            ? false
            : undefined,
        )
      : null;
    const artifact_status = artifact_request
      ? (
        mutation_plan_execution_state?._status ??
        this._conversation_action_status[artifact_request._key] ??
        artifact_request._status
      ) || ""
      : "";
    const artifact_visible = artifact_request &&
      artifact_status !== STUDIO_INTENT_ACTION_STATUS_DISMISSED;
    const artifact_error = artifact_request
      ? this._conversation_action_error[artifact_request._key] || artifact_request._error || ""
      : "";
    const artifact_result = artifact_request
      ? mutation_plan_execution_state?._result ??
        this._conversation_action_result[artifact_request._key] ??
        artifact_request._result
      : undefined;
    const artifact_success = artifact_request
      ? (typeof artifact_result === "string"
        ? artifact_result
        : xstudio_artifact_request_success_message(artifact_request))
      : "";
    const visible_artifact_request = artifact_visible ? artifact_request : null;
    const render_actions = (
      visible_artifact_request?._artifact_type === PROJECT_PLAN_ARTIFACT_TYPE ||
      visible_artifact_request?._artifact_type === MUTATION_PLAN_ARTIFACT_TYPE
    )
      ? []
      : this._conversation_intent_render_actions(message, index);
    const planning_question_key = xstudio_project_plan_current_question_key(visible_artifact_request, index);
    const planning_question_selected_answers = planning_question_key &&
      this._planning_question_multi_answers[planning_question_key]
      ? {
        [planning_question_key]: this._planning_question_multi_answers[planning_question_key],
      }
      : {};
    const mutation_plan_collapsed = visible_artifact_request?._artifact_type === MUTATION_PLAN_ARTIFACT_TYPE
      ? mutation_plan_execution_state?._collapsed === true ||
        this._mutation_plan_collapsed[visible_artifact_request._key] === true
      : false;
    const project_plan_expanded = visible_artifact_request?._artifact_type === PROJECT_PLAN_ARTIFACT_TYPE
      ? this._project_plan_expanded[visible_artifact_request._key] === true
      : false;

    return {
      ...message,
      _actions: render_actions,
      _artifact_request: visible_artifact_request,
      _artifact_status: artifact_status,
      _artifact_error: artifact_error,
      _artifact_success: artifact_success,
      _artifact_result: artifact_result,
      _planning_question_selected_answers: planning_question_selected_answers,
      _project_plan_expanded: project_plan_expanded,
      _mutation_plan_collapsed: mutation_plan_collapsed,
      _mutation_plan_execution_state: mutation_plan_execution_state,
    };
  }

  private _scroll_conversation_to_bottom() {
    const list = XUI.getObject(STUDIO_CONVERSATION_MESSAGES_ID) as any;
    const dom = list?.dom;
    if (!(dom instanceof HTMLElement)) return;
    dom.scrollTop = dom.scrollHeight;
  }

  private _conversation_transient_created_at() {
    return new Date().toISOString();
  }

  private _render_pending_conversation_analysis(text: string) {
    const created_at = this._conversation_transient_created_at();
    this._conversation_transient_messages = [
      {
        _id: `pending-user-${created_at}`,
        _role: "user",
        _text: text,
        _created_at: created_at,
        _pending_status: "pending",
      },
      {
        _id: `pending-assistant-${created_at}`,
        _role: "assistant",
        _text: "Analyzing...",
        _created_at: created_at,
        _pending_status: "analyzing",
      },
    ];
    this._render_conversation_messages();
    this._log("conversation pending message rendered", {
      _app_id: this._conversation_app_id,
      _env: this._conversation_env,
      _conversation_id: this._conversation_id,
    });
  }

  private _render_failed_conversation_analysis(
    text: string,
    error: string,
    append_succeeded: boolean,
    debug_intent?: Record<string, any> | null,
  ) {
    const created_at = this._conversation_transient_created_at();
    this._conversation_transient_messages = [
      ...(!append_succeeded
        ? [
          {
            _id: `failed-user-${created_at}`,
            _role: "user" as const,
            _text: text,
            _created_at: created_at,
            _pending_status: "failed" as const,
            _error: error,
          },
        ]
        : []),
      {
        _id: `failed-assistant-${created_at}`,
        _role: "assistant",
        _text: error,
        _created_at: created_at,
        _pending_status: "failed",
        _error: error,
        ...(is_obj(debug_intent) ? { _intent: debug_intent } : {}),
      },
    ];
    this._render_conversation_messages();
  }

  private _render_conversation_messages() {
    const list = XUI.getObject(STUDIO_CONVERSATION_MESSAGES_ID) as any;
    if (!list) return;

    const messages = [
      ...this._conversation_messages,
      ...this._conversation_transient_messages,
    ];
    const render_messages = messages
      .map((message, index) => this._conversation_render_message({ ...message }, index));
    const active_planning_question_keys = new Set(
      render_messages
        .map((message, index) => xstudio_project_plan_current_question_key(message._artifact_request, index))
        .filter(Boolean),
    );
    for (const question_key of Object.keys(this._planning_question_multi_answers)) {
      if (!active_planning_question_keys.has(question_key)) {
        delete this._planning_question_multi_answers[question_key];
      }
    }
    const children = create_xstudio_conversation_message_list(render_messages, {
      _planning_greeting: this._planning_greeting_view(messages),
    });

    list.update?.({ _children: children });
    queueMicrotask(() => this._scroll_conversation_to_bottom());
  }

  private _set_conversation_send_enabled(enabled: boolean) {
    this._set_studio_control_disabled(
      STUDIO_CONVERSATION_SEND_BUTTON_ID,
      this._conversation_analyzing || !enabled,
    );
  }

  private _set_conversation_analyzing(analyzing: boolean) {
    this._conversation_analyzing = analyzing;
    this._set_studio_control_disabled(STUDIO_CONVERSATION_INPUT_ID, analyzing);
    this._set_conversation_send_enabled(this._local_conversation_text(this._read_conversation_input_value()).length > 0);
  }

  private _update_conversation_input_state(payload?: any) {
    if (this._conversation_analyzing) {
      this._set_conversation_send_enabled(false);
      return;
    }

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
    }

    if (input?.dom && "value" in input.dom) {
      input.dom.value = value;
      input.dom.dispatchEvent?.(new Event("input", { bubbles: true }));
      input.dom.focus?.();
    }

    _xd.set(STUDIO_CONVERSATION_INPUT_XD_KEY, value, { source: "xstudio-conversation" });
    this._update_conversation_input_state({ _value: value });
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
    this._apply_left_sidebar_width_to_dom();
    this._bind_left_sidebar_resize_divider();
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
    this._apply_object_picker_button_state();
  }

  private _toggle_left_dock() {
    this._left_dock_collapsed = !this._left_dock_collapsed;
    this._apply_dock_state();
  }

  private _toggle_right_dock() {
    this._right_dock_collapsed = !this._right_dock_collapsed;
    this._apply_dock_state();
  }

  private _object_picker_canvas() {
    const canvas = XUI.getObject(STUDIO_CANVAS_ID) as any;
    const dom = canvas?.dom ?? (typeof document !== "undefined" ? document.getElementById?.(STUDIO_CANVAS_ID) : null);
    return dom instanceof HTMLElement ? dom : null;
  }

  private _element_is_within(parent: HTMLElement, child: HTMLElement) {
    if (typeof parent.contains === "function") {
      return parent === child || parent.contains(child);
    }

    let current: HTMLElement | null = child;
    while (current) {
      if (current === parent) return true;
      current = current.parentElement;
    }
    return false;
  }

  private _event_target_element(target: EventTarget | null | undefined) {
    if (target instanceof HTMLElement) return target;
    const parent = (target as any)?.parentElement;
    return parent instanceof HTMLElement ? parent : null;
  }

  private _suppress_object_picker_canvas_event(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }

  private _find_object_tree_node_by_object_id(object_id: string) {
    const id = object_id.trim();
    if (!id) return null;

    const flat_nodes = this._flatten_object_tree_nodes(this._object_tree_nodes);
    return flat_nodes.find((node) =>
      node._meta &&
      (
        node._meta._json_id.trim() === id ||
        node._meta._id.trim() === id
      )
    ) ?? null;
  }

  private _object_tree_node_ancestor_keys(node: XStudioObjectTreeNode) {
    const flat_nodes = this._flatten_object_tree_nodes(this._object_tree_nodes);
    const by_key = new Map<string, XStudioObjectTreeNode>();
    for (const item of flat_nodes) by_key.set(item._node_key, item);

    const keys: string[] = [];
    let parent_key = node._parent_node_key;
    while (parent_key) {
      const parent = by_key.get(parent_key);
      if (!parent) break;
      keys.unshift(parent._node_key);
      parent_key = parent._parent_node_key;
    }

    return keys;
  }

  private _object_tree_results_dom() {
    const results = XUI.getObject(STUDIO_OBJECT_TREE_RESULTS_ID) as any;
    const dom = results?.dom ?? (typeof document !== "undefined" ? document.getElementById?.(STUDIO_OBJECT_TREE_RESULTS_ID) : null);
    return dom instanceof HTMLElement ? dom : null;
  }

  private _reveal_object_tree_node(
    node: XStudioObjectTreeNode,
    options: { _rerender?: boolean; _highlight?: boolean; _row_id?: string } = {},
  ) {
    if (!node?._meta) return "";

    const rerender = options._rerender !== false;
    if (rerender) {
      for (const key of this._object_tree_node_ancestor_keys(node)) {
        this._object_tree_expanded_node_keys.add(key);
      }
      this._render_cached_object_tree_nodes();
    }

    const target_id = node._meta._json_id.trim() || node._meta._id.trim();
    const fresh_node = target_id ? this._find_object_tree_node_by_object_id(target_id) ?? node : node;
    const row_id = options._row_id || fresh_node._key || node._key;
    const row = typeof document !== "undefined" && row_id ? document.getElementById(row_id) : null;
    if (row instanceof HTMLElement) {
      row.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      if (options._highlight !== false) {
        row.classList.remove(STUDIO_OBJECT_TREE_REVEAL_CLASS);
        void (row as any).offsetWidth;
        row.classList.add(STUDIO_OBJECT_TREE_REVEAL_CLASS);
      }
    }

    const results = this._object_tree_results_dom();
    if (results) {
      const next_scroll_left = Math.max(0, (fresh_node._depth * 14) - 24);
      if (results.scrollLeft < next_scroll_left) {
        results.scrollLeft = next_scroll_left;
      }
    }

    return row_id;
  }

  private _resolve_picker_dom_target(target: EventTarget | null | undefined): XStudioPickerResolvedObject | null {
    if (typeof document === "undefined") return null;
    if (document.body?.classList?.contains?.("xstudio-left-resizing")) return null;

    const canvas = this._object_picker_canvas();
    const start = this._event_target_element(target);
    if (!canvas || !start || !this._element_is_within(canvas, start)) return null;

    if (this._object_tree_nodes.length === 0) {
      this._refresh_object_tree_for_current_view();
    }

    const mounted_target = this._resolve_picker_mounted_dom_target(start, canvas);
    if (mounted_target) return mounted_target;

    let current: HTMLElement | null = start;
    while (current && current !== canvas) {
      const object_id = String(current.getAttribute?.("id") ?? current.id ?? "").trim();
      if (object_id && object_id !== STUDIO_CANVAS_ID) {
        const object = XUI.getObject(object_id) as any;
        const node = this._find_object_tree_node_by_object_id(object_id);
        if (object && node?._meta) {
          return {
            _id: node._meta._json_id.trim() || node._meta._id.trim() || object_id,
            _type: node._meta._type.trim() || String(object._type ?? "object"),
            _element: current,
            _object: object,
            _node: node,
          };
        }
      }
      current = current.parentElement;
    }

    return null;
  }

  private _resolve_picker_mounted_dom_target(start: HTMLElement, canvas: HTMLElement): XStudioPickerResolvedObject | null {
    const flat_nodes = this._flatten_object_tree_nodes(this._object_tree_nodes);
    let best: {
      _resolved: XStudioPickerResolvedObject;
      _depth: number;
      _area: number;
    } | null = null;

    for (const node of flat_nodes) {
      if (!node?._meta) continue;

      const object_id = node._meta._json_id.trim() || node._meta._id.trim();
      if (!object_id || object_id === STUDIO_CANVAS_ID) continue;

      const object = XUI.getObject(object_id) as any;
      const element = object?.dom;
      if (!(element instanceof HTMLElement)) continue;
      if (!this._element_is_within(canvas, element)) continue;
      if (!this._element_is_within(element, start)) continue;

      const rect = element.getBoundingClientRect();
      const area = Math.max(1, Math.round(rect.width) * Math.round(rect.height));
      const depth = node._depth;
      if (
        best &&
        (
          depth < best._depth ||
          (depth === best._depth && area >= best._area)
        )
      ) {
        continue;
      }

      best = {
        _depth: depth,
        _area: area,
        _resolved: {
          _id: object_id,
          _type: node._meta._type.trim() || String(object._type ?? "object"),
          _element: element,
          _object: object,
          _node: node,
        },
      };
    }

    return best?._resolved ?? null;
  }

  private _ensure_object_picker_overlay() {
    if (typeof document === "undefined") return null;

    if (!(this._object_picker_overlay_dom instanceof HTMLElement)) {
      const overlay = document.createElement("div");
      overlay.setAttribute("id", STUDIO_OBJECT_PICKER_OVERLAY_ID);
      overlay.setAttribute("class", "xstudio-object-picker-overlay");
      overlay.setAttribute("aria-hidden", "true");
      document.body?.appendChild?.(overlay);
      this._object_picker_overlay_dom = overlay;
    }

    if (!(this._object_picker_label_dom instanceof HTMLElement)) {
      const label = document.createElement("div");
      label.setAttribute("id", STUDIO_OBJECT_PICKER_LABEL_ID);
      label.setAttribute("class", "xstudio-object-picker-label");
      label.setAttribute("aria-hidden", "true");
      document.body?.appendChild?.(label);
      this._object_picker_label_dom = label;
    }

    return {
      _overlay: this._object_picker_overlay_dom,
      _label: this._object_picker_label_dom,
    };
  }

  private _show_object_picker_overlay(resolved: XStudioPickerResolvedObject) {
    const doms = this._ensure_object_picker_overlay();
    if (!doms) return;

    const rect = resolved._element.getBoundingClientRect();
    const left = Math.round(rect.left);
    const top = Math.round(rect.top);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    doms._overlay.style.setProperty("left", `${left}px`);
    doms._overlay.style.setProperty("top", `${top}px`);
    doms._overlay.style.setProperty("width", `${width}px`);
    doms._overlay.style.setProperty("height", `${height}px`);
    doms._overlay.style.setProperty("display", "block");

    doms._label.textContent = `${resolved._id} [${resolved._type}]`;
    doms._label.style.setProperty("left", `${left}px`);
    doms._label.style.setProperty("top", `${Math.max(4, top - 22)}px`);
    doms._label.style.setProperty("display", "block");
    this._object_picker_hover = resolved;
  }

  private _clear_object_picker_overlay() {
    this._object_picker_hover = null;
    this._object_picker_overlay_dom?.remove?.();
    this._object_picker_label_dom?.remove?.();
    this._object_picker_overlay_dom = null;
    this._object_picker_label_dom = null;
  }

  private _handle_object_picker_pointer_move(event: PointerEvent) {
    if (!this._object_picker_active) return;
    this._suppress_object_picker_canvas_event(event);
    const resolved = this._resolve_picker_dom_target(event.target);
    if (!resolved) {
      this._clear_object_picker_overlay();
      return;
    }
    this._show_object_picker_overlay(resolved);
  }

  private _handle_object_picker_canvas_click(event: MouseEvent) {
    if (!this._object_picker_active) return;
    this._suppress_object_picker_canvas_event(event);

    const resolved = this._resolve_picker_dom_target(event.target);
    if (!resolved?._node?._meta) {
      this._clear_object_picker_overlay();
      return;
    }

    const row_id = this._reveal_object_tree_node(resolved._node, {
      _rerender: true,
      _highlight: true,
    });
    const node = this._find_object_tree_node_by_object_id(resolved._id) ?? resolved._node;
    this._select_object_tree_node(node, row_id || node._key);
    this._set_object_picker_active(false);
  }

  private _unbind_object_picker_canvas() {
    const canvas = this._object_picker_canvas_dom;
    if (canvas) {
      if (this._object_picker_pointer_move_handler) {
        canvas.removeEventListener("pointermove", this._object_picker_pointer_move_handler, true);
      }
      if (this._object_picker_pointer_leave_handler) {
        canvas.removeEventListener("pointerleave", this._object_picker_pointer_leave_handler, true);
      }
      if (this._object_picker_pointer_down_handler) {
        canvas.removeEventListener("pointerdown", this._object_picker_pointer_down_handler, true);
      }
      if (this._object_picker_click_handler) {
        canvas.removeEventListener("click", this._object_picker_click_handler, true);
      }
    }

    this._object_picker_canvas_dom = null;
    this._object_picker_pointer_move_handler = null;
    this._object_picker_pointer_leave_handler = null;
    this._object_picker_pointer_down_handler = null;
    this._object_picker_click_handler = null;
  }

  private _bind_object_picker_canvas() {
    const canvas = this._object_picker_canvas();
    if (!canvas) return;
    if (this._object_picker_canvas_dom === canvas && this._object_picker_pointer_move_handler) return;

    this._unbind_object_picker_canvas();
    this._object_picker_canvas_dom = canvas;
    this._object_picker_pointer_move_handler = (event: PointerEvent) => this._handle_object_picker_pointer_move(event);
    this._object_picker_pointer_leave_handler = (event: PointerEvent) => {
      this._suppress_object_picker_canvas_event(event);
      this._clear_object_picker_overlay();
    };
    this._object_picker_pointer_down_handler = (event: PointerEvent) => {
      if (!this._object_picker_active) return;
      this._suppress_object_picker_canvas_event(event);
    };
    this._object_picker_click_handler = (event: MouseEvent) => this._handle_object_picker_canvas_click(event);

    canvas.addEventListener("pointermove", this._object_picker_pointer_move_handler, true);
    canvas.addEventListener("pointerleave", this._object_picker_pointer_leave_handler, true);
    canvas.addEventListener("pointerdown", this._object_picker_pointer_down_handler, true);
    canvas.addEventListener("click", this._object_picker_click_handler, true);
  }

  private _set_object_picker_active(active: boolean) {
    if (active === this._object_picker_active) {
      if (active) this._bind_object_picker_canvas();
      this._apply_object_picker_button_state();
      return;
    }

    this._object_picker_active = active;
    if (active) {
      this._cancel_arrange_mode();
      this._refresh_object_tree_for_current_view();
      this._bind_object_picker_canvas();
    } else {
      this._unbind_object_picker_canvas();
      this._clear_object_picker_overlay();
    }
    this._apply_object_picker_button_state();
  }

  private _toggle_object_picker() {
    this._set_object_picker_active(!this._object_picker_active);
  }

  private _cancel_object_picker() {
    this._set_object_picker_active(false);
  }

  private _apply_arrange_mode_state() {
    this._apply_arrange_button_state();
  }

  private _arrange_scope_key() {
    try {
      return {
        _app_id: this._client().getActiveAppId(),
        _env: this._client().getActiveEnv(),
      };
    } catch {
      return {
        _app_id: "",
        _env: "",
      };
    }
  }

  private _ensure_arrange_overlay() {
    if (typeof document === "undefined") return null;

    if (!(this._arrange_overlay_dom instanceof HTMLElement)) {
      const overlay = document.createElement("div");
      overlay.setAttribute("id", STUDIO_ARRANGE_OVERLAY_ID);
      overlay.setAttribute("class", "xstudio-arrange-overlay");
      overlay.setAttribute("aria-hidden", "true");
      document.body?.appendChild?.(overlay);
      this._arrange_overlay_dom = overlay;
    }

    if (!(this._arrange_label_dom instanceof HTMLElement)) {
      const label = document.createElement("div");
      label.setAttribute("id", STUDIO_ARRANGE_LABEL_ID);
      label.setAttribute("class", "xstudio-arrange-label");
      label.setAttribute("aria-hidden", "true");
      document.body?.appendChild?.(label);
      this._arrange_label_dom = label;
    }

    if (!(this._arrange_indicator_dom instanceof HTMLElement)) {
      const indicator = document.createElement("div");
      indicator.setAttribute("id", STUDIO_ARRANGE_INDICATOR_ID);
      indicator.setAttribute("class", "xstudio-arrange-indicator");
      indicator.setAttribute("aria-hidden", "true");
      document.body?.appendChild?.(indicator);
      this._arrange_indicator_dom = indicator;
    }

    return {
      _overlay: this._arrange_overlay_dom,
      _label: this._arrange_label_dom,
      _indicator: this._arrange_indicator_dom,
    };
  }

  private _clear_arrange_overlay() {
    this._arrange_hover = null;
    this._arrange_drop_preview = null;
    this._arrange_overlay_dom?.remove?.();
    this._arrange_label_dom?.remove?.();
    this._arrange_indicator_dom?.remove?.();
    this._arrange_overlay_dom = null;
    this._arrange_label_dom = null;
    this._arrange_indicator_dom = null;
  }

  private _show_arrange_hover_overlay(resolved: XStudioPickerResolvedObject) {
    const doms = this._ensure_arrange_overlay();
    if (!doms) return;

    const rect = resolved._element.getBoundingClientRect();
    const left = Math.round(rect.left);
    const top = Math.round(rect.top);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    doms._overlay.setAttribute("class", "xstudio-arrange-overlay xstudio-arrange-overlay-hover");
    doms._overlay.style.setProperty("left", `${left}px`);
    doms._overlay.style.setProperty("top", `${top}px`);
    doms._overlay.style.setProperty("width", `${width}px`);
    doms._overlay.style.setProperty("height", `${height}px`);
    doms._overlay.style.setProperty("display", "block");

    doms._label.textContent = `${resolved._id} [${resolved._type}]`;
    doms._label.setAttribute("class", "xstudio-arrange-label");
    doms._label.style.setProperty("left", `${left}px`);
    doms._label.style.setProperty("top", `${Math.max(4, top - 22)}px`);
    doms._label.style.setProperty("display", "block");

    doms._indicator.style.setProperty("display", "none");
    this._arrange_hover = resolved;
  }

  private _show_arrange_drop_preview(preview: XStudioArrangeDropPreview) {
    const doms = this._ensure_arrange_overlay();
    if (!doms) return;

    const rect = preview._target._element.getBoundingClientRect();
    const left = Math.round(rect.left);
    const top = Math.round(rect.top);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const valid = preview._validation._ok === true;
    const mode = preview._mode;

    doms._overlay.setAttribute(
      "class",
      [
        "xstudio-arrange-overlay",
        "xstudio-arrange-overlay-drop",
        valid ? "xstudio-arrange-overlay-valid" : "xstudio-arrange-overlay-invalid",
      ].join(" "),
    );
    doms._overlay.style.setProperty("left", `${left}px`);
    doms._overlay.style.setProperty("top", `${top}px`);
    doms._overlay.style.setProperty("width", `${width}px`);
    doms._overlay.style.setProperty("height", `${height}px`);
    doms._overlay.style.setProperty("display", "block");

    doms._label.textContent = preview._validation._ok
      ? `${mode} ${preview._target._id}`
      : preview._validation._message;
    doms._label.setAttribute(
      "class",
      `xstudio-arrange-label ${valid ? "xstudio-arrange-label-valid" : "xstudio-arrange-label-invalid"}`,
    );
    doms._label.style.setProperty("left", `${left}px`);
    doms._label.style.setProperty("top", `${Math.max(4, top - 22)}px`);
    doms._label.style.setProperty("display", "block");

    const line_height = 3;
    const indicator_top = mode === "before"
      ? top
      : mode === "after"
        ? top + height - line_height
        : top + Math.max(0, Math.round((height - line_height) / 2));
    doms._indicator.setAttribute(
      "class",
      [
        "xstudio-arrange-indicator",
        `xstudio-arrange-indicator-${mode}`,
        valid ? "xstudio-arrange-indicator-valid" : "xstudio-arrange-indicator-invalid",
      ].join(" "),
    );
    doms._indicator.style.setProperty("left", `${left}px`);
    doms._indicator.style.setProperty("top", `${indicator_top}px`);
    doms._indicator.style.setProperty("width", `${width}px`);
    doms._indicator.style.setProperty("height", `${line_height}px`);
    doms._indicator.style.setProperty("display", "block");

    this._arrange_drop_preview = preview;
  }

  private _stop_arrange_auto_scroll() {
    const frame = this._arrange_scroll_frame;
    this._arrange_scroll_frame = 0;
    if (frame && typeof window !== "undefined") {
      window.cancelAnimationFrame?.(frame);
    }
  }

  private _arrange_scroll_canvas_once() {
    const canvas = this._arrange_canvas_dom;
    if (!(canvas instanceof HTMLElement)) return;

    const rect = canvas.getBoundingClientRect();
    let dx = 0;
    let dy = 0;
    if (this._arrange_last_x <= rect.left + STUDIO_ARRANGE_SCROLL_EDGE_PX) dx = -STUDIO_ARRANGE_SCROLL_STEP_PX;
    if (this._arrange_last_x >= rect.right - STUDIO_ARRANGE_SCROLL_EDGE_PX) dx = STUDIO_ARRANGE_SCROLL_STEP_PX;
    if (this._arrange_last_y <= rect.top + STUDIO_ARRANGE_SCROLL_EDGE_PX) dy = -STUDIO_ARRANGE_SCROLL_STEP_PX;
    if (this._arrange_last_y >= rect.bottom - STUDIO_ARRANGE_SCROLL_EDGE_PX) dy = STUDIO_ARRANGE_SCROLL_STEP_PX;

    if (dx) canvas.scrollLeft = Math.max(0, canvas.scrollLeft + dx);
    if (dy) canvas.scrollTop = Math.max(0, canvas.scrollTop + dy);
  }

  private _schedule_arrange_auto_scroll() {
    if (!this._arrange_dragging || this._arrange_scroll_frame) return;
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      this._arrange_scroll_canvas_once();
      return;
    }

    this._arrange_scroll_frame = window.requestAnimationFrame(() => {
      this._arrange_scroll_frame = 0;
      if (!this._arrange_dragging) return;
      this._arrange_scroll_canvas_once();
      this._schedule_arrange_auto_scroll();
    });
  }

  private _clear_arrange_drag_state() {
    this._stop_arrange_auto_scroll();
    if (
      this._arrange_canvas_dom instanceof HTMLElement &&
      this._arrange_pointer_id >= 0 &&
      this._arrange_canvas_dom.hasPointerCapture?.(this._arrange_pointer_id)
    ) {
      this._arrange_canvas_dom.releasePointerCapture?.(this._arrange_pointer_id);
    }

    this._arrange_drag_source = null;
    this._arrange_hover = null;
    this._arrange_drop_preview = null;
    this._arrange_dragging = false;
    this._arrange_start_x = 0;
    this._arrange_start_y = 0;
    this._arrange_last_x = 0;
    this._arrange_last_y = 0;
    this._arrange_pointer_id = -1;
    this._arrange_drag_app_id = "";
    this._arrange_drag_env = "";
    this._clear_arrange_overlay();
  }

  private _unbind_arrange_mode_canvas() {
    const canvas = this._arrange_canvas_dom;
    if (canvas) {
      if (this._arrange_pointer_down_handler) {
        canvas.removeEventListener("pointerdown", this._arrange_pointer_down_handler, true);
      }
      if (this._arrange_pointer_move_handler) {
        canvas.removeEventListener("pointermove", this._arrange_pointer_move_handler, true);
      }
      if (this._arrange_pointer_up_handler) {
        canvas.removeEventListener("pointerup", this._arrange_pointer_up_handler, true);
      }
      if (this._arrange_pointer_cancel_handler) {
        canvas.removeEventListener("pointercancel", this._arrange_pointer_cancel_handler, true);
      }
      if (this._arrange_pointer_leave_handler) {
        canvas.removeEventListener("pointerleave", this._arrange_pointer_leave_handler, true);
      }
      if (this._arrange_click_handler) {
        canvas.removeEventListener("click", this._arrange_click_handler, true);
      }
      if (this._arrange_dblclick_handler) {
        canvas.removeEventListener("dblclick", this._arrange_dblclick_handler, true);
      }
      if (this._arrange_contextmenu_handler) {
        canvas.removeEventListener("contextmenu", this._arrange_contextmenu_handler, true);
      }
    }

    this._arrange_canvas_dom = null;
    this._arrange_pointer_down_handler = null;
    this._arrange_pointer_move_handler = null;
    this._arrange_pointer_up_handler = null;
    this._arrange_pointer_cancel_handler = null;
    this._arrange_pointer_leave_handler = null;
    this._arrange_click_handler = null;
    this._arrange_dblclick_handler = null;
    this._arrange_contextmenu_handler = null;
  }

  private _handle_arrange_pointer_down(event: PointerEvent) {
    if (!this._arrange_mode_active || this._arrange_committing) return;
    this._suppress_object_picker_canvas_event(event);
    if (typeof event.button === "number" && event.button !== 0) return;

    const pointer_id = Number(event.pointerId ?? -1);
    const source = this._resolve_arrange_drag_source(event.target);
    const scope = this._arrange_scope_key();
    this._arrange_drag_source = source;
    this._arrange_pointer_id = Number.isFinite(pointer_id) ? pointer_id : -1;
    this._arrange_start_x = Number(event.clientX ?? 0);
    this._arrange_start_y = Number(event.clientY ?? 0);
    this._arrange_last_x = this._arrange_start_x;
    this._arrange_last_y = this._arrange_start_y;
    this._arrange_dragging = false;
    this._arrange_drag_app_id = scope._app_id;
    this._arrange_drag_env = scope._env;

    if (source._ok && this._arrange_pointer_id >= 0) {
      this._arrange_canvas_dom?.setPointerCapture?.(this._arrange_pointer_id);
      this._show_arrange_hover_overlay(source._resolved);
    }
  }

  private _handle_arrange_pointer_move(event: PointerEvent) {
    if (!this._arrange_mode_active || this._arrange_committing) return;
    this._suppress_object_picker_canvas_event(event);

    this._arrange_last_x = Number(event.clientX ?? this._arrange_last_x);
    this._arrange_last_y = Number(event.clientY ?? this._arrange_last_y);

    if (!this._arrange_drag_source) {
      const hover = this._resolve_picker_dom_target(this._arrange_event_target(event));
      if (hover) {
        this._show_arrange_hover_overlay(hover);
      } else {
        this._clear_arrange_overlay();
      }
      return;
    }

    if (!this._arrange_drag_source._ok) return;

    if (!this._arrange_dragging) {
      const dx = this._arrange_last_x - this._arrange_start_x;
      const dy = this._arrange_last_y - this._arrange_start_y;
      if (Math.sqrt((dx * dx) + (dy * dy)) < STUDIO_ARRANGE_DRAG_THRESHOLD_PX) {
        return;
      }
      this._arrange_dragging = true;
      this._write_studio_status("Arranging object...");
    }

    const preview = this._resolve_arrange_drop_preview(event, this._arrange_drag_source._node);
    if (preview) {
      this._show_arrange_drop_preview(preview);
    } else {
      this._clear_arrange_overlay();
    }
    this._schedule_arrange_auto_scroll();
  }

  private _handle_arrange_pointer_up(event: PointerEvent) {
    if (!this._arrange_mode_active || this._arrange_committing) return;
    this._suppress_object_picker_canvas_event(event);
    void this._finish_arrange_drop(event);
  }

  private _handle_arrange_pointer_cancel(event: PointerEvent) {
    if (!this._arrange_mode_active) return;
    this._suppress_object_picker_canvas_event(event);
    this._clear_arrange_drag_state();
    this._write_studio_status("Arrange cancelled");
  }

  private _handle_arrange_suppressed_event(event: Event) {
    if (!this._arrange_mode_active) return;
    this._suppress_object_picker_canvas_event(event);
  }

  private _arrange_event_target(event: PointerEvent) {
    if (typeof document !== "undefined" && typeof document.elementFromPoint === "function") {
      const x = Number(event.clientX ?? NaN);
      const y = Number(event.clientY ?? NaN);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        const element = document.elementFromPoint(x, y);
        if (element instanceof HTMLElement) return element;
      }
    }
    return event.target;
  }

  private _resolve_arrange_drop_mode(event: PointerEvent, target: XStudioPickerResolvedObject): XStudioArrangeDropMode {
    const rect = target._element.getBoundingClientRect();
    const y = Number(event.clientY ?? rect.top + (rect.height / 2));
    const height = Math.max(1, rect.height);
    const relative_y = Math.max(0, Math.min(height, y - rect.top));
    if (relative_y <= height * 0.28) return "before";
    if (relative_y >= height * 0.72) return "after";
    return "inside";
  }

  private _resolve_arrange_drop_preview(
    event: PointerEvent,
    source_node: XStudioObjectTreeNode,
  ): XStudioArrangeDropPreview | null {
    const target = this._resolve_picker_dom_target(this._arrange_event_target(event));
    if (!target?._node?._meta) return null;

    const mode = this._resolve_arrange_drop_mode(event, target);
    const validation = this._validate_arrange_drop(source_node, target._node, mode);
    return {
      _target: target,
      _mode: mode,
      _validation: validation,
    };
  }

  private _arrange_active_scope_matches_drag() {
    const scope = this._arrange_scope_key();
    if (this._arrange_drag_app_id && scope._app_id && this._arrange_drag_app_id !== scope._app_id) return false;
    if (this._arrange_drag_env && scope._env && this._arrange_drag_env !== scope._env) return false;
    return true;
  }

  private _arrange_drop_is_noop(validation: Extract<XStudioArrangeDropValidation, { _ok: true }>) {
    const source_meta = validation._source_node._meta;
    if (!source_meta) return true;

    const source_parent_path = source_meta._parent_path.trim() || "$";
    const destination_parent_path = validation._parent_node._meta?._path.trim() || "$";
    if (source_parent_path !== destination_parent_path) return false;

    if (validation._mode === "before") {
      return source_meta._next_sibling_id.trim() === validation._target_id;
    }
    if (validation._mode === "after") {
      return source_meta._previous_sibling_id.trim() === validation._target_id;
    }

    return source_meta._next_sibling_id.trim() === "";
  }

  private _build_arrange_move_params(
    validation: Extract<XStudioArrangeDropValidation, { _ok: true }>,
  ): XStudioSelectedObjectApplyViewEditParams | null {
    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();
    if (!app_id || !env) return null;

    return {
      _app_id: app_id,
      _env: env,
      _view_id: validation._source_view_id,
      _edit_action: "move-object",
      _target_id: validation._source_id,
      _target_type: validation._source_node._meta?._type.trim() || validation._source_type || "object",
      _target_parent_id: validation._parent_id,
      _move_position: validation._mode,
      ...(validation._before_id ? { _before_id: validation._before_id } : {}),
      ...(validation._after_id ? { _after_id: validation._after_id } : {}),
    };
  }

  private async _commit_arrange_drop(validation: Extract<XStudioArrangeDropValidation, { _ok: true }>) {
    if (this._arrange_committing) return;
    if (!this._arrange_active_scope_matches_drag()) {
      this._write_studio_status("Arrange cancelled: app changed");
      return;
    }
    if (this._arrange_drop_is_noop(validation)) {
      this._write_studio_status("Arrange unchanged");
      return;
    }

    const params = this._build_arrange_move_params(validation);
    if (!params) {
      this._write_studio_status("Arrange failed: no active app");
      return;
    }
    const preserve_arrange_mode = this._arrange_mode_active === true;

    this._arrange_committing = true;
    this._write_studio_status("Moving arranged object...");
    this._log("arrange move request", {
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_parent_id: params._target_parent_id,
      _move_position: params._move_position,
      _before_id: params._before_id,
      _after_id: params._after_id,
    });

    try {
      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._write_studio_status(this._format_apply_view_edit_failure(result, { _params: params }));
        this._error("arrange move failed", {
          _structured_error: result,
        });
        return;
      }

      await this._request_object_tree_structured_edit_refresh(params, result);
      this._selected_object_pending_select_id = validation._source_id;
      for (const key of this._object_tree_node_ancestor_keys(validation._parent_node)) {
        this._object_tree_expanded_node_keys.add(key);
      }
      this._object_tree_expanded_node_keys.add(validation._parent_node._node_key);
      this._refresh_object_tree_for_current_view();
      this._reveal_moved_object_after_refresh(validation._source_id);
      this._write_studio_status("Moved arranged object");
    } catch (err) {
      const message = `Arrange move failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("arrange move failed", {
        _error: to_err(err),
      });
    } finally {
      this._arrange_committing = false;
      if (preserve_arrange_mode && !this._arrange_mode_active && this._arrange_active_scope_matches_drag()) {
        this._set_arrange_mode_active(true);
      }
    }
  }

  private async _finish_arrange_drop(event: PointerEvent) {
    const source = this._arrange_drag_source;
    const was_dragging = this._arrange_dragging;
    const preview = was_dragging && source?._ok
      ? this._resolve_arrange_drop_preview(event, source._node) ?? this._arrange_drop_preview
      : null;

    if (
      this._arrange_canvas_dom instanceof HTMLElement &&
      this._arrange_pointer_id >= 0 &&
      this._arrange_canvas_dom.hasPointerCapture?.(this._arrange_pointer_id)
    ) {
      this._arrange_canvas_dom.releasePointerCapture?.(this._arrange_pointer_id);
    }
    this._stop_arrange_auto_scroll();

    if (!was_dragging) {
      this._clear_arrange_drag_state();
      return;
    }

    if (!preview) {
      this._clear_arrange_drag_state();
      this._write_studio_status("Arrange target rejected");
      return;
    }

    this._show_arrange_drop_preview(preview);
    if (!preview._validation._ok) {
      const message = preview._validation._message || "Arrange target rejected";
      this._clear_arrange_drag_state();
      this._write_studio_status(message);
      return;
    }

    const validation = preview._validation;
    this._clear_arrange_drag_state();
    await this._commit_arrange_drop(validation);
  }

  private _find_object_tree_node_by_row_id(row_id: string) {
    const id = row_id.trim();
    if (!id) return null;
    return this._flatten_object_tree_nodes(this._object_tree_nodes)
      .find((node) => node._key === id) ?? null;
  }

  private _nearest_object_tree_row(target: EventTarget | null | undefined) {
    let current = target instanceof HTMLElement ? target : null;
    while (current) {
      if (current.getAttribute("data-xstudio-object-tree-row") === "true") return current;
      current = current.parentElement;
    }
    return null;
  }

  private _object_tree_event_target(event: PointerEvent) {
    if (typeof document !== "undefined" && typeof document.elementFromPoint === "function") {
      const x = Number(event.clientX ?? NaN);
      const y = Number(event.clientY ?? NaN);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        const element = document.elementFromPoint(x, y);
        if (element instanceof HTMLElement) return element;
      }
    }
    return event.target;
  }

  private _resolve_object_tree_row_target(target: EventTarget | null | undefined) {
    const row = this._nearest_object_tree_row(target);
    const row_id = row?.getAttribute("data-xstudio-object-tree-row-id")?.trim() || row?.id?.trim() || "";
    const node = row_id ? this._find_object_tree_node_by_row_id(row_id) : null;
    if (!row || !node?._meta) return null;

    const id = this._arrange_node_json_id(node);
    return {
      _id: id,
      _type: node._meta._type.trim() || "object",
      _element: row,
      _object: node._object,
      _node: node,
    } as XStudioPickerResolvedObject;
  }

  private _resolve_object_tree_drag_source(
    node: XStudioObjectTreeNode,
    row_id: string,
  ): XStudioArrangeSourceResolution {
    const row = typeof document !== "undefined" ? document.getElementById(row_id) : null;
    if (!(row instanceof HTMLElement) || !node._meta) {
      return this._arrange_source_invalid("no-source", "No tree drag source resolved");
    }

    if (!this._object_tree_node_can_drag(node)) {
      return this._arrange_source_invalid("not-draggable", "Object cannot be moved from the tree");
    }

    const id = this._arrange_node_json_id(node);
    if (!id) {
      return this._arrange_source_invalid("missing-source-id", "Tree drag source has no persisted object id");
    }

    if (!this._arrange_node_source_view_id(node)) {
      return this._arrange_source_invalid("missing-source-view", "Tree drag source has no source view");
    }

    return {
      _ok: true,
      _id: id,
      _type: node._meta._type.trim() || "object",
      _resolved: {
        _id: id,
        _type: node._meta._type.trim() || "object",
        _element: row,
        _object: node._object,
        _node: node,
      },
      _node: node,
    };
  }

  private _object_tree_active_scope_matches_drag() {
    const scope = this._arrange_scope_key();
    if (this._object_tree_drag_app_id && scope._app_id && this._object_tree_drag_app_id !== scope._app_id) return false;
    if (this._object_tree_drag_env && scope._env && this._object_tree_drag_env !== scope._env) return false;
    return true;
  }

  private _bind_object_tree_drag_document_handlers() {
    if (typeof document === "undefined") return;
    if (!this._object_tree_pointer_move_handler) {
      this._object_tree_pointer_move_handler = (event: PointerEvent) => this._handle_object_tree_pointer_move(event);
      document.addEventListener("pointermove", this._object_tree_pointer_move_handler, true);
    }
    if (!this._object_tree_pointer_up_handler) {
      this._object_tree_pointer_up_handler = (event: PointerEvent) => this._handle_object_tree_pointer_up(event);
      document.addEventListener("pointerup", this._object_tree_pointer_up_handler, true);
    }
    if (!this._object_tree_pointer_cancel_handler) {
      this._object_tree_pointer_cancel_handler = (event: PointerEvent) => this._handle_object_tree_pointer_cancel(event);
      document.addEventListener("pointercancel", this._object_tree_pointer_cancel_handler, true);
    }
    if (!this._object_tree_keydown_handler) {
      this._object_tree_keydown_handler = (event: KeyboardEvent) => this._handle_object_tree_drag_keydown(event);
      document.addEventListener("keydown", this._object_tree_keydown_handler, true);
    }
    if (!this._object_tree_click_suppress_handler) {
      this._object_tree_click_suppress_handler = (event: MouseEvent) => this._handle_object_tree_drag_click(event);
      document.addEventListener("click", this._object_tree_click_suppress_handler, true);
    }
  }

  private _unbind_object_tree_drag_document_handlers() {
    if (typeof document === "undefined") return;
    if (this._object_tree_pointer_move_handler) {
      document.removeEventListener("pointermove", this._object_tree_pointer_move_handler, true);
    }
    if (this._object_tree_pointer_up_handler) {
      document.removeEventListener("pointerup", this._object_tree_pointer_up_handler, true);
    }
    if (this._object_tree_pointer_cancel_handler) {
      document.removeEventListener("pointercancel", this._object_tree_pointer_cancel_handler, true);
    }
    if (this._object_tree_keydown_handler) {
      document.removeEventListener("keydown", this._object_tree_keydown_handler, true);
    }
    if (this._object_tree_click_suppress_handler && !this._object_tree_drag_suppress_click) {
      document.removeEventListener("click", this._object_tree_click_suppress_handler, true);
      this._object_tree_click_suppress_handler = null;
    }
    this._object_tree_pointer_move_handler = null;
    this._object_tree_pointer_up_handler = null;
    this._object_tree_pointer_cancel_handler = null;
    this._object_tree_keydown_handler = null;
  }

  private _stop_object_tree_auto_scroll() {
    const frame = this._object_tree_scroll_frame;
    this._object_tree_scroll_frame = 0;
    if (frame && typeof window !== "undefined") {
      window.cancelAnimationFrame?.(frame);
    }
  }

  private _stop_object_tree_auto_expand() {
    const timer = this._object_tree_expand_timer;
    this._object_tree_expand_timer = 0;
    this._object_tree_expand_node_key = "";
    if (timer && typeof window !== "undefined") {
      window.clearTimeout?.(timer);
    }
  }

  private _clear_object_tree_drop_preview() {
    if (this._object_tree_drop_row) {
      this._object_tree_drop_row.classList.remove(
        "xstudio-object-tree-row-drop-before",
        "xstudio-object-tree-row-drop-inside",
        "xstudio-object-tree-row-drop-after",
        "xstudio-object-tree-row-drop-invalid",
      );
      this._object_tree_drop_row.removeAttribute("data-xstudio-drop-position");
    }
    this._object_tree_drop_row = null;
    this._object_tree_drop_preview = null;
  }

  private _clear_object_tree_drag_state(status?: string) {
    const source_row = this._object_tree_drag_source_row;
    if (
      source_row instanceof HTMLElement &&
      this._object_tree_drag_pointer_id >= 0 &&
      source_row.hasPointerCapture?.(this._object_tree_drag_pointer_id)
    ) {
      source_row.releasePointerCapture?.(this._object_tree_drag_pointer_id);
    }

    this._stop_object_tree_auto_scroll();
    this._stop_object_tree_auto_expand();
    this._clear_object_tree_drop_preview();
    this._unbind_object_tree_drag_document_handlers();
    source_row?.classList.remove("xstudio-object-tree-row-drag-source");
    this._object_tree_drag_source = null;
    this._object_tree_dragging = false;
    this._object_tree_drag_start_kind = "row";
    this._object_tree_drag_start_x = 0;
    this._object_tree_drag_start_y = 0;
    this._object_tree_drag_last_x = 0;
    this._object_tree_drag_last_y = 0;
    this._object_tree_drag_pointer_id = -1;
    this._object_tree_drag_app_id = "";
    this._object_tree_drag_env = "";
    this._object_tree_drag_source_row = null;
    if (typeof document !== "undefined") {
      document.body?.classList?.remove?.("xstudio-object-tree-drag-active");
    }
    if (status) this._write_studio_status(status);
  }

  private _start_object_tree_drag(
    node: XStudioObjectTreeNode,
    row_id: string,
    event: PointerEvent | null,
    kind: XStudioObjectTreeDragKind,
  ) {
    if (this._object_tree_drag_committing) return;
    if (event && typeof event.button === "number" && event.button !== 0) return;

    const source = this._resolve_object_tree_drag_source(node, row_id);
    if (!source._ok) return;

    const scope = this._arrange_scope_key();
    const pointer_id = Number(event?.pointerId ?? -1);
    const start_x = Number(event?.clientX ?? 0);
    const start_y = Number(event?.clientY ?? 0);
    this._clear_object_tree_drag_state();
    this._object_tree_drag_source = source;
    this._object_tree_drag_start_kind = kind;
    this._object_tree_drag_start_x = start_x;
    this._object_tree_drag_start_y = start_y;
    this._object_tree_drag_last_x = start_x;
    this._object_tree_drag_last_y = start_y;
    this._object_tree_drag_pointer_id = Number.isFinite(pointer_id) ? pointer_id : -1;
    this._object_tree_drag_app_id = scope._app_id;
    this._object_tree_drag_env = scope._env;
    this._object_tree_drag_source_row = source._resolved._element;
    this._object_tree_drag_source_row.classList.add("xstudio-object-tree-row-drag-source");
    if (this._object_tree_drag_pointer_id >= 0) {
      this._object_tree_drag_source_row.setPointerCapture?.(this._object_tree_drag_pointer_id);
    }
    this._bind_object_tree_drag_document_handlers();
  }

  private _resolve_object_tree_drop_mode(event: PointerEvent, target: XStudioPickerResolvedObject): XStudioArrangeDropMode {
    return this._resolve_arrange_drop_mode(event, target);
  }

  private _resolve_object_tree_drop_preview(
    event: PointerEvent,
    source_node: XStudioObjectTreeNode,
  ): XStudioArrangeDropPreview | null {
    const target = this._resolve_object_tree_row_target(this._object_tree_event_target(event));
    if (!target?._node?._meta) return null;

    const mode = this._resolve_object_tree_drop_mode(event, target);
    const validation = this._validate_arrange_drop(source_node, target._node, mode);
    return {
      _target: target,
      _mode: mode,
      _validation: validation,
    };
  }

  private _show_object_tree_drop_preview(preview: XStudioArrangeDropPreview) {
    this._clear_object_tree_drop_preview();
    const row = preview._target._element;
    const valid = preview._validation._ok === true;
    row.classList.add(
      valid
        ? `xstudio-object-tree-row-drop-${preview._mode}`
        : "xstudio-object-tree-row-drop-invalid",
    );
    row.setAttribute("data-xstudio-drop-position", valid ? preview._mode : "invalid");
    this._object_tree_drop_row = row;
    this._object_tree_drop_preview = preview;
  }

  private _schedule_object_tree_auto_expand(preview: XStudioArrangeDropPreview | null) {
    if (!preview || !preview._validation._ok || preview._mode !== "inside") {
      this._stop_object_tree_auto_expand();
      return;
    }

    const node = preview._validation._target_node;
    if (node._children.length === 0) {
      this._stop_object_tree_auto_expand();
      return;
    }
    if (this._object_tree_expanded_node_keys.has(node._node_key)) {
      this._stop_object_tree_auto_expand();
      return;
    }
    if (this._object_tree_expand_node_key === node._node_key && this._object_tree_expand_timer) return;

    this._stop_object_tree_auto_expand();
    this._object_tree_expand_node_key = node._node_key;
    if (typeof window === "undefined" || typeof window.setTimeout !== "function") {
      this._object_tree_expanded_node_keys.add(node._node_key);
      this._object_tree_touched_expansion_node_keys.add(node._node_key);
      this._render_cached_object_tree_nodes();
      return;
    }

    this._object_tree_expand_timer = window.setTimeout(() => {
      this._object_tree_expand_timer = 0;
      this._object_tree_expand_node_key = "";
      if (!this._object_tree_dragging) return;
      this._object_tree_expanded_node_keys.add(node._node_key);
      this._object_tree_touched_expansion_node_keys.add(node._node_key);
      this._render_cached_object_tree_nodes();
    }, STUDIO_OBJECT_TREE_DRAG_EXPAND_DELAY_MS);
  }

  private _object_tree_scroll_once() {
    const results = this._object_tree_results_dom();
    if (!(results instanceof HTMLElement)) return;

    const rect = results.getBoundingClientRect();
    let dy = 0;
    if (this._object_tree_drag_last_y <= rect.top + STUDIO_ARRANGE_SCROLL_EDGE_PX) dy = -STUDIO_ARRANGE_SCROLL_STEP_PX;
    if (this._object_tree_drag_last_y >= rect.bottom - STUDIO_ARRANGE_SCROLL_EDGE_PX) dy = STUDIO_ARRANGE_SCROLL_STEP_PX;
    if (dy) results.scrollTop = Math.max(0, results.scrollTop + dy);
  }

  private _schedule_object_tree_auto_scroll() {
    if (!this._object_tree_dragging || this._object_tree_scroll_frame) return;
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      this._object_tree_scroll_once();
      return;
    }

    this._object_tree_scroll_frame = window.requestAnimationFrame(() => {
      this._object_tree_scroll_frame = 0;
      if (!this._object_tree_dragging) return;
      this._object_tree_scroll_once();
      this._schedule_object_tree_auto_scroll();
    });
  }

  private _handle_object_tree_pointer_move(event: PointerEvent) {
    const source = this._object_tree_drag_source;
    if (!source?._ok || this._object_tree_drag_committing) return;

    this._object_tree_drag_last_x = Number(event.clientX ?? this._object_tree_drag_last_x);
    this._object_tree_drag_last_y = Number(event.clientY ?? this._object_tree_drag_last_y);

    if (!this._object_tree_dragging) {
      const dx = this._object_tree_drag_last_x - this._object_tree_drag_start_x;
      const dy = this._object_tree_drag_last_y - this._object_tree_drag_start_y;
      const distance = Math.sqrt((dx * dx) + (dy * dy));
      if (this._object_tree_drag_start_kind !== "handle" && distance < STUDIO_ARRANGE_DRAG_THRESHOLD_PX) {
        return;
      }
      this._object_tree_dragging = true;
      this._object_tree_drag_suppress_click = true;
      if (typeof document !== "undefined") {
        document.body?.classList?.add?.("xstudio-object-tree-drag-active");
      }
      this._write_studio_status("Moving object from tree...");
    }

    event.preventDefault?.();
    event.stopPropagation?.();
    const preview = this._resolve_object_tree_drop_preview(event, source._node);
    if (preview) {
      this._show_object_tree_drop_preview(preview);
    } else {
      this._clear_object_tree_drop_preview();
    }
    this._schedule_object_tree_auto_expand(preview);
    this._schedule_object_tree_auto_scroll();
  }

  private _handle_object_tree_pointer_up(event: PointerEvent) {
    if (this._object_tree_drag_committing) return;
    if (this._object_tree_dragging) {
      event.preventDefault?.();
      event.stopPropagation?.();
    }
    void this._finish_object_tree_drop(event);
  }

  private _handle_object_tree_pointer_cancel(event: PointerEvent) {
    event.preventDefault?.();
    event.stopPropagation?.();
    this._object_tree_drag_suppress_click = true;
    this._clear_object_tree_drag_state("Tree move cancelled");
  }

  private _handle_object_tree_drag_keydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.preventDefault?.();
    event.stopPropagation?.();
    this._object_tree_drag_suppress_click = true;
    this._clear_object_tree_drag_state("Tree move cancelled");
  }

  private _handle_object_tree_drag_click(event: MouseEvent) {
    if (!this._object_tree_drag_suppress_click) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    this._clear_object_tree_click_suppression_handler();
  }

  private _clear_object_tree_click_suppression_handler() {
    this._object_tree_drag_suppress_click = false;
    if (typeof document !== "undefined" && this._object_tree_click_suppress_handler) {
      document.removeEventListener("click", this._object_tree_click_suppress_handler, true);
      this._object_tree_click_suppress_handler = null;
    }
  }

  private async _commit_object_tree_drop(validation: Extract<XStudioArrangeDropValidation, { _ok: true }>) {
    if (this._object_tree_drag_committing) return;
    if (!this._object_tree_active_scope_matches_drag()) {
      this._write_studio_status("Tree move cancelled: app changed");
      return;
    }
    if (this._arrange_drop_is_noop(validation)) {
      this._write_studio_status("Tree move unchanged");
      return;
    }

    const params = this._build_arrange_move_params(validation);
    if (!params) {
      this._write_studio_status("Tree move failed: no active app");
      return;
    }

    this._object_tree_drag_committing = true;
    this._write_studio_status("Moving object from tree...");
    this._log("object tree drag move request", {
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_parent_id: params._target_parent_id,
      _move_position: params._move_position,
      _before_id: params._before_id,
      _after_id: params._after_id,
    });

    try {
      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._write_studio_status(this._format_apply_view_edit_failure(result, { _params: params }));
        this._error("object tree drag move failed", {
          _structured_error: result,
        });
        return;
      }

      await this._request_object_tree_structured_edit_refresh(params, result);
      this._selected_object_pending_select_id = validation._source_id;
      for (const key of this._object_tree_node_ancestor_keys(validation._parent_node)) {
        this._object_tree_expanded_node_keys.add(key);
      }
      this._object_tree_expanded_node_keys.add(validation._parent_node._node_key);
      this._refresh_object_tree_for_current_view();
      this._reveal_moved_object_after_refresh(validation._source_id);
      this._write_studio_status("Moved object from tree");
    } catch (err) {
      const message = `Tree move failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("object tree drag move failed", {
        _error: to_err(err),
      });
    } finally {
      this._object_tree_drag_committing = false;
    }
  }

  private async _finish_object_tree_drop(event: PointerEvent) {
    const source = this._object_tree_drag_source;
    const was_dragging = this._object_tree_dragging;
    const preview = was_dragging && source?._ok
      ? this._resolve_object_tree_drop_preview(event, source._node) ?? this._object_tree_drop_preview
      : null;

    this._stop_object_tree_auto_scroll();
    this._stop_object_tree_auto_expand();

    if (!was_dragging) {
      this._object_tree_drag_suppress_click = false;
      this._clear_object_tree_drag_state();
      return;
    }

    this._object_tree_drag_suppress_click = true;
    if (!preview) {
      this._clear_object_tree_drag_state("Tree move target rejected");
      return;
    }

    this._show_object_tree_drop_preview(preview);
    if (!preview._validation._ok) {
      const message = preview._validation._message || "Tree move target rejected";
      this._clear_object_tree_drag_state(message);
      return;
    }

    const validation = preview._validation;
    this._clear_object_tree_drag_state();
    await this._commit_object_tree_drop(validation);
  }

  private _bind_arrange_mode_canvas() {
    const canvas = this._object_picker_canvas();
    if (!canvas) return;
    if (this._arrange_canvas_dom === canvas && this._arrange_pointer_down_handler) return;

    this._unbind_arrange_mode_canvas();
    this._arrange_canvas_dom = canvas;
    this._arrange_pointer_down_handler = (event: PointerEvent) => this._handle_arrange_pointer_down(event);
    this._arrange_pointer_move_handler = (event: PointerEvent) => this._handle_arrange_pointer_move(event);
    this._arrange_pointer_up_handler = (event: PointerEvent) => this._handle_arrange_pointer_up(event);
    this._arrange_pointer_cancel_handler = (event: PointerEvent) => this._handle_arrange_pointer_cancel(event);
    this._arrange_pointer_leave_handler = (event: PointerEvent) => this._handle_arrange_pointer_cancel(event);
    this._arrange_click_handler = (event: MouseEvent) => this._handle_arrange_suppressed_event(event);
    this._arrange_dblclick_handler = (event: MouseEvent) => this._handle_arrange_suppressed_event(event);
    this._arrange_contextmenu_handler = (event: MouseEvent) => this._handle_arrange_suppressed_event(event);

    canvas.addEventListener("pointerdown", this._arrange_pointer_down_handler, true);
    canvas.addEventListener("pointermove", this._arrange_pointer_move_handler, true);
    canvas.addEventListener("pointerup", this._arrange_pointer_up_handler, true);
    canvas.addEventListener("pointercancel", this._arrange_pointer_cancel_handler, true);
    canvas.addEventListener("pointerleave", this._arrange_pointer_leave_handler, true);
    canvas.addEventListener("click", this._arrange_click_handler, true);
    canvas.addEventListener("dblclick", this._arrange_dblclick_handler, true);
    canvas.addEventListener("contextmenu", this._arrange_contextmenu_handler, true);
  }

  private _set_arrange_mode_active(active: boolean) {
    if (active === this._arrange_mode_active) {
      if (active) this._bind_arrange_mode_canvas();
      this._apply_arrange_mode_state();
      return;
    }

    this._arrange_mode_active = active;
    if (active) {
      this._cancel_object_picker();
      this._refresh_object_tree_for_current_view();
      this._bind_arrange_mode_canvas();
    } else {
      this._clear_arrange_drag_state();
      this._unbind_arrange_mode_canvas();
    }
    this._apply_arrange_mode_state();
  }

  private _toggle_arrange_mode() {
    this._set_arrange_mode_active(!this._arrange_mode_active);
  }

  private _cancel_arrange_mode() {
    this._set_arrange_mode_active(false);
  }

  private _arrange_invalid(reason: string, message: string): XStudioArrangeDropValidation {
    return {
      _ok: false,
      _reason: reason,
      _message: message,
    };
  }

  private _arrange_source_invalid(reason: string, message: string): XStudioArrangeSourceResolution {
    return {
      _ok: false,
      _reason: reason,
      _message: message,
    };
  }

  private _arrange_node_json_id(node: XStudioObjectTreeNode | null | undefined) {
    return node?._meta?._json_id?.trim() || node?._meta?._id?.trim() || "";
  }

  private _arrange_node_source_view_id(node: XStudioObjectTreeNode | null | undefined) {
    return node?._meta?._source_view_id?.trim() || "";
  }

  private _arrange_node_path(node: XStudioObjectTreeNode | null | undefined) {
    return node?._meta?._path?.trim() || "";
  }

  private _resolve_arrange_drag_source(target: EventTarget | null | undefined): XStudioArrangeSourceResolution {
    const resolved = this._resolve_picker_dom_target(target);
    const node = resolved?._node ?? null;
    if (!resolved || !node?._meta) {
      return this._arrange_source_invalid("no-source", "No arrange source resolved");
    }

    const id = this._arrange_node_json_id(node);
    if (!id) {
      return this._arrange_source_invalid("missing-source-id", "Arrange source has no persisted object id");
    }

    if (!this._arrange_node_source_view_id(node)) {
      return this._arrange_source_invalid("missing-source-view", "Arrange source has no source view");
    }

    if (this._selected_object_is_root_view(node._meta)) {
      return this._arrange_source_invalid("root-source", "Root view cannot be arranged");
    }

    return {
      _ok: true,
      _id: id,
      _type: node._meta._type.trim() || resolved._type || "object",
      _resolved: resolved,
      _node: node,
    };
  }

  private _object_tree_node_is_arrange_descendant(
    source_node: XStudioObjectTreeNode,
    target_node: XStudioObjectTreeNode,
  ) {
    const source_view_id = this._arrange_node_source_view_id(source_node);
    const target_view_id = this._arrange_node_source_view_id(target_node);
    if (!source_view_id || source_view_id !== target_view_id) return false;

    const source_path = this._arrange_node_path(source_node);
    const target_path = this._arrange_node_path(target_node);
    if (!source_path || !target_path || source_path === "$") return false;
    return target_path.startsWith(`${source_path}._children[`);
  }

  private _arrange_parent_accepts_child(
    parent_node: XStudioObjectTreeNode,
    child_type: string,
  ) {
    const capability = this._object_tree_child_capability(parent_node);
    if (capability._design_children_disallowed) {
      return this._arrange_invalid("children-disallowed", "Destination rejects children");
    }
    if (!capability._allowed) {
      return this._arrange_invalid("children-not-allowed", "Destination does not accept children");
    }
    if (!this._skill_children_accepts_type(capability._skill, child_type)) {
      return this._arrange_invalid("rejected-child-type", "Destination rejects this object type");
    }
    return null;
  }

  private _resolve_arrange_relative_parent(target_node: XStudioObjectTreeNode) {
    const meta = target_node._meta;
    if (!meta) return null;
    if (this._selected_object_is_root_view(meta)) return null;
    return this._find_object_tree_node_by_path(meta._source_view_id, meta._parent_path || "$");
  }

  private _validate_arrange_drop(
    source_node: XStudioObjectTreeNode,
    target_node: XStudioObjectTreeNode,
    mode: XStudioArrangeDropMode,
  ): XStudioArrangeDropValidation {
    const source_id = this._arrange_node_json_id(source_node);
    const source_type = source_node._meta?._type?.trim().toLowerCase() || "";
    const source_view_id = this._arrange_node_source_view_id(source_node);
    const target_id = this._arrange_node_json_id(target_node);
    const target_view_id = this._arrange_node_source_view_id(target_node);

    if (!source_id) return this._arrange_invalid("missing-source-id", "Arrange source has no persisted object id");
    if (!target_id) return this._arrange_invalid("missing-target-id", "Drop target has no persisted object id");
    if (!source_type) return this._arrange_invalid("missing-source-type", "Arrange source has no object type");
    if (!source_view_id || !target_view_id) return this._arrange_invalid("missing-source-view", "Drop target has no source view");
    if (source_view_id !== target_view_id) {
      return this._arrange_invalid("source-view-mismatch", "Arrange source and drop target are in different source views");
    }
    if (this._selected_object_is_root_view(source_node._meta)) {
      return this._arrange_invalid("root-source", "Root view cannot be arranged");
    }
    if (source_id === target_id) {
      return this._arrange_invalid("same-target", "Drop target is the arrange source");
    }
    if (this._object_tree_node_is_arrange_descendant(source_node, target_node)) {
      return this._arrange_invalid("cycle", "Cannot move an object into its own descendants");
    }

    if (mode === "inside") {
      const parent_error = this._arrange_parent_accepts_child(target_node, source_type);
      if (parent_error) return parent_error;
      if (!this._object_tree_node_can_insert_inside(target_node, source_type)) {
        return this._arrange_invalid("insert-mode-not-allowed", "Drop target does not allow inside insertion");
      }
      return {
        _ok: true,
        _mode: mode,
        _source_id: source_id,
        _source_type: source_type,
        _target_id: target_id,
        _source_view_id: source_view_id,
        _source_node: source_node,
        _target_node: target_node,
        _parent_node: target_node,
        _parent_id: target_id,
        _before_id: "",
        _after_id: "",
      };
    }

    const parent_node = this._resolve_arrange_relative_parent(target_node);
    if (!parent_node) {
      return this._arrange_invalid("missing-parent", "Drop target has no valid parent for relative insertion");
    }

    const parent_error = this._arrange_parent_accepts_child(parent_node, source_type);
    if (parent_error) return parent_error;
    if (!this._object_tree_node_can_insert_relative(target_node, mode)) {
      return this._arrange_invalid("insert-mode-not-allowed", `Drop target does not allow ${mode} insertion`);
    }

    return {
      _ok: true,
      _mode: mode,
      _source_id: source_id,
      _source_type: source_type,
      _target_id: target_id,
      _source_view_id: source_view_id,
      _source_node: source_node,
      _target_node: target_node,
      _parent_node: parent_node,
      _parent_id: this._arrange_node_json_id(parent_node),
      _before_id: mode === "before" ? target_id : "",
      _after_id: mode === "after" ? target_id : "",
    };
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

  private _canonical_data_feature_id(value: any) {
    const normalized = _xu.normalize_id(String(value ?? "")) ?? "";
    return normalized.replace(/-/g, "_");
  }

  private _data_feature_valid_canonical_id(value: string) {
    return /^[a-z][a-z0-9_]*$/.test(value);
  }

  private _data_feature_draft_snapshot() {
    return JSON.stringify({
      _suggestion_prompt: this._data_feature_state._suggestion_prompt,
      _feature_name: this._data_feature_state._feature_name,
      _entity_id: this._data_feature_state._entity_id,
      _entity_id_touched: this._data_feature_state._entity_id_touched,
      _options: this._data_feature_state._options,
      _fields: this._data_feature_state._fields.map((field) => ({
        _name: field._name,
        _field_id: field._field_id,
        _type: field._type,
        _required: field._required,
        _default: field._default,
        _options: field._options,
        _field_id_touched: field._field_id_touched,
      })),
    });
  }

  private _data_feature_has_unsaved_changes() {
    if (!this._data_feature_state._open) return false;
    if (this._data_feature_state._status === "running") return false;
    return this._data_feature_draft_snapshot() !== this._data_feature_initial_snapshot;
  }

  private _confirm_data_feature_close_if_dirty() {
    if (!this._data_feature_has_unsaved_changes()) return true;
    if (typeof window === "undefined" || typeof window.confirm !== "function") return true;
    return window.confirm("Discard unsaved Data Feature changes?");
  }

  private _set_data_feature_control_value(object_id: string, value: string) {
    const control = XUI.getObject(object_id) as any;
    if (!control) return;
    const normalized = String(value ?? "");
    if (typeof control.setValue === "function") {
      control.setValue(normalized);
    }
    if (control.dom && "value" in control.dom) {
      control.dom.value = normalized;
    }
    control.value = normalized;
    control._value = normalized;
  }

  private _set_data_feature_control_disabled(object_id: string, disabled: boolean) {
    const control = XUI.getObject(object_id) as any;
    if (!control) return;
    control.disabled = disabled;
    if (control.dom && "disabled" in control.dom) {
      control.dom.disabled = disabled;
    }
    if (disabled) {
      control.dom?.setAttribute?.("disabled", "true");
    } else {
      control.dom?.removeAttribute?.("disabled");
    }
  }

  private _data_feature_current_scope_key() {
    const app_id = this._client().getActiveAppId() || "";
    const env = this._client().getActiveEnv() || "";
    return `${app_id}::${env}`;
  }

  private _data_feature_has_editable_draft() {
    return Boolean(
      this._data_feature_state._suggestion_prompt.trim() ||
      this._data_feature_state._feature_name.trim() ||
      this._data_feature_state._entity_id.trim() ||
      this._data_feature_normalized_fields().length > 0 ||
      this._data_feature_state._suggestion_status !== "idle" ||
      this._data_feature_state._suggestion_assumptions.length > 0 ||
      this._data_feature_state._suggestion_warnings.length > 0,
    );
  }

  private _data_feature_field_control_id(field: XStudioDataFeatureFieldDraft, name: string) {
    return `${STUDIO_APP_EXPLORER_DATA_FEATURE_FIELD_PREFIX}-${field._key}-${name}`;
  }

  private _data_feature_option_control_id(option_id: XStudioDataFeatureOptionId) {
    return `${STUDIO_APP_EXPLORER_DATA_FEATURE_OPTION_PREFIX}-${option_id}`;
  }

  private _read_data_feature_control_value(object_id: string, fallback: string) {
    const control = XUI.getObject(object_id) as any;
    if (!control) return fallback;
    if (typeof control.getValue === "function") {
      return String(control.getValue() ?? "");
    }
    if (control.dom && "value" in control.dom) {
      return String(control.dom.value ?? "");
    }
    if ("value" in control) return String(control.value ?? "");
    if ("_value" in control) return String(control._value ?? "");
    return fallback;
  }

  private _read_data_feature_control_checked(object_id: string, fallback: boolean) {
    const control = XUI.getObject(object_id) as any;
    if (!control) return fallback;
    if (control.dom && "checked" in control.dom) return control.dom.checked === true;
    if ("checked" in control) return control.checked === true;
    if ("_checked" in control) return control._checked === true;
    return fallback;
  }

  private _read_data_feature_field_type(object_id: string, fallback: XStudioDataFeatureFieldType) {
    const value = this._read_data_feature_control_value(object_id, fallback);
    return STUDIO_DATA_FEATURE_FIELD_TYPES.includes(value as XStudioDataFeatureFieldType)
      ? value as XStudioDataFeatureFieldType
      : fallback;
  }

  private _sync_data_feature_state_from_controls() {
    const state = this._data_feature_state;
    state._suggestion_prompt = this._read_data_feature_control_value(
      STUDIO_APP_EXPLORER_DATA_FEATURE_ASK_INPUT_ID,
      state._suggestion_prompt,
    );
    const previous_feature_name = state._feature_name;
    state._feature_name = this._read_data_feature_control_value(
      STUDIO_APP_EXPLORER_DATA_FEATURE_NAME_ID,
      state._feature_name,
    ).trimStart();
    const entity_id_from_control = this._read_data_feature_control_value(
      STUDIO_APP_EXPLORER_DATA_FEATURE_ENTITY_ID,
      state._entity_id,
    ).trimStart();
    state._entity_id = entity_id_from_control;
    if (state._entity_id && state._entity_id !== this._canonical_data_feature_id(state._feature_name)) {
      state._entity_id_touched = true;
    }
    if (!state._entity_id_touched && state._feature_name !== previous_feature_name) {
      state._entity_id = this._canonical_data_feature_id(state._feature_name);
      this._set_data_feature_control_value(STUDIO_APP_EXPLORER_DATA_FEATURE_ENTITY_ID, state._entity_id);
    }

    for (const field of state._fields) {
      const previous_name = field._name;
      field._name = this._read_data_feature_control_value(
        this._data_feature_field_control_id(field, "name"),
        field._name,
      ).trimStart();
      field._field_id = this._read_data_feature_control_value(
        this._data_feature_field_control_id(field, "id"),
        field._field_id,
      ).trimStart();
      if (field._field_id && field._field_id !== this._canonical_data_feature_id(field._name)) {
        field._field_id_touched = true;
      }
      if (!field._field_id_touched && field._name !== previous_name) {
        field._field_id = this._canonical_data_feature_id(field._name);
        this._set_data_feature_control_value(this._data_feature_field_control_id(field, "id"), field._field_id);
      }
      field._type = this._read_data_feature_field_type(
        this._data_feature_field_control_id(field, "type"),
        field._type,
      );
      field._required = this._read_data_feature_control_checked(
        this._data_feature_field_control_id(field, "required"),
        field._required,
      );
      field._default = this._read_data_feature_control_value(
        this._data_feature_field_control_id(field, "default"),
        field._default,
      ).trimStart();
      field._options = this._read_data_feature_control_value(
        this._data_feature_field_control_id(field, "options"),
        field._options,
      ).trimStart();
    }

    for (const option_id of STUDIO_DATA_FEATURE_OPTION_IDS) {
      state._options[option_id] = this._read_data_feature_control_checked(
        this._data_feature_option_control_id(option_id),
        state._options[option_id] === true,
      );
    }
  }

  private _clear_data_feature_error_for_input() {
    if (!this._data_feature_state._error) return;
    this._data_feature_state._error = "";
    this._set_data_feature_error_label("");
  }

  private _data_feature_new_field() {
    this._data_feature_field_seq += 1;
    return create_data_feature_field(`field-${this._data_feature_field_seq}`);
  }

  private _data_feature_artifact_ids(entity_id = this._data_feature_state._entity_id) {
    const id = entity_id.trim();
    return {
      _entity_id: id,
      _list_view_id: id ? `${id}-list` : "",
      _create_form_view_id: id ? `create-${id}` : "",
      _create_flow_id: id ? `create-${id}` : "",
      _update_flow_id: id ? `update-${id}` : "",
      _delete_flow_id: id ? `delete-${id}` : "",
    };
  }

  private _data_feature_existing_artifact_ids(type: XStudioAppExplorerArtifactType) {
    const category =
      type === "view" ? "views" :
        type === "flow" ? "flows" :
          type === "entity" ? "entities" :
            "modules";
    return new Set(
      (this._app_explorer_artifacts[category] ?? [])
        .map((artifact) => artifact._id.trim())
        .filter(Boolean),
    );
  }

  private _data_feature_duplicate_artifacts(entity_id = this._data_feature_state._entity_id) {
    const artifacts = this._data_feature_artifact_ids(entity_id);
    const options = this._data_feature_state._options;
    const views = this._data_feature_existing_artifact_ids("view");
    const flows = this._data_feature_existing_artifact_ids("flow");
    const entities = this._data_feature_existing_artifact_ids("entity");
    const duplicates: string[] = [];

    if (options.entity && artifacts._entity_id && entities.has(artifacts._entity_id)) {
      duplicates.push(`Entity '${artifacts._entity_id}' already exists.`);
    }
    if (options.list_view && artifacts._list_view_id && views.has(artifacts._list_view_id)) {
      duplicates.push(`View '${artifacts._list_view_id}' already exists.`);
    }
    if (options.create_form && artifacts._create_form_view_id && views.has(artifacts._create_form_view_id)) {
      duplicates.push(`View '${artifacts._create_form_view_id}' already exists.`);
    }
    if (options.create_flow && artifacts._create_flow_id && flows.has(artifacts._create_flow_id)) {
      duplicates.push(`Flow '${artifacts._create_flow_id}' already exists.`);
    }
    if (options.update_flow && artifacts._update_flow_id && flows.has(artifacts._update_flow_id)) {
      duplicates.push(`Flow '${artifacts._update_flow_id}' already exists.`);
    }
    if (options.delete_flow && artifacts._delete_flow_id && flows.has(artifacts._delete_flow_id)) {
      duplicates.push(`Flow '${artifacts._delete_flow_id}' already exists.`);
    }

    return duplicates;
  }

  private _data_feature_options_from_text(value: string) {
    const seen = new Set<string>();
    return String(value ?? "")
      .split(",")
      .map((option) => option.trim())
      .filter((option) => {
        if (!option || seen.has(option)) return false;
        seen.add(option);
        return true;
      });
  }

  private _data_feature_default_from_text(field: XStudioDataFeatureFieldDraft) {
    const value = field._default.trim();
    if (!value) return undefined;
    if (field._type === "Number") {
      const number_value = Number(value);
      return Number.isFinite(number_value) ? number_value : value;
    }
    if (field._type === "Boolean") {
      const normalized = value.toLowerCase();
      if (["true", "yes", "1", "on"].includes(normalized)) return true;
      if (["false", "no", "0", "off"].includes(normalized)) return false;
    }
    return value;
  }

  private _data_feature_field_request(field: {
    _name: string;
    _field_id: string;
    _type: XStudioDataFeatureFieldType;
    _required: boolean;
    _default?: unknown;
    _options?: unknown[];
  }) {
    return {
      _name: field._field_id,
      _label: field._name,
      _field_id: field._field_id,
      _type: field._type,
      _required: field._required,
      ...(field._default !== undefined ? { _default: field._default } : {}),
      ...(Array.isArray(field._options) && field._options.length > 0 ? { _options: field._options } : {}),
    };
  }

  private _data_feature_normalized_fields() {
    return this._data_feature_state._fields
      .map((field) => {
        const options = this._data_feature_options_from_text(field._options);
        const default_value = this._data_feature_default_from_text(field);
        return {
          _name: field._name.trim(),
          _field_id: field._field_id.trim(),
          _type: field._type,
          _required: field._required === true,
          ...(default_value !== undefined ? { _default: default_value } : {}),
          ...(options.length > 0 ? { _options: options } : {}),
        };
      })
      .filter((field) => field._name || field._field_id);
  }

  private _validate_data_feature(show_errors: boolean) {
    this._sync_data_feature_state_from_controls();
    const state = this._data_feature_state;
    const feature_name = state._feature_name.trim();
    const entity_id = state._entity_id.trim();
    const fields = this._data_feature_normalized_fields();
    const field_ids = new Set<string>();
    let error = "";

    if (!feature_name) {
      error = "Feature name is required.";
    } else if (!entity_id) {
      error = "Canonical entity ID is required.";
    } else if (!this._data_feature_valid_canonical_id(entity_id)) {
      error = "Entity ID must start with a lowercase letter and use lowercase letters, numbers, or underscores.";
    } else if (fields.length === 0) {
      error = "Add at least one field.";
    }

    if (!error) {
      for (const field of fields) {
        if (!field._name) {
          error = "Every field needs a field name.";
          break;
        }
        if (!field._field_id) {
          error = "Every field needs a canonical field ID.";
          break;
        }
        if (!this._data_feature_valid_canonical_id(field._field_id)) {
          error = `Field ID '${field._field_id}' is not valid.`;
          break;
        }
        if (field_ids.has(field._field_id)) {
          error = `Field ID '${field._field_id}' is duplicated.`;
          break;
        }
        field_ids.add(field._field_id);
      }
    }

    if (!error) {
      const invalid_option = STUDIO_DATA_FEATURE_OPTION_IDS.find((option_id) =>
        typeof state._options[option_id] !== "boolean"
      );
      if (invalid_option) {
        error = "Generation options are invalid.";
      } else if (state._options.entity !== true) {
        error = "Entity generation option is required.";
      }
    }

    if (!error) {
      const duplicates = this._data_feature_duplicate_artifacts(entity_id);
      if (duplicates.length > 0) error = duplicates.join(" ");
    }

    if (show_errors) {
      this._data_feature_state._error = error;
      this._set_data_feature_error_label(error);
    }

    return {
      _ok: !error && Boolean(feature_name) && Boolean(entity_id) && fields.length > 0,
      _error: error,
      _feature_name: feature_name,
      _entity_id: entity_id,
      _fields: fields,
    };
  }

  private _data_feature_progress_status(step_id: XStudioDataFeatureProgressStepId) {
    return this._data_feature_state._progress[step_id] ?? "pending";
  }

  private _data_feature_controls_disabled() {
    return this._data_feature_state._status === "running" ||
      this._data_feature_state._suggestion_status === "loading";
  }

  private _data_feature_suggest_disabled() {
    return this._data_feature_state._status === "running" ||
      this._data_feature_state._suggestion_status === "loading";
  }

  private _set_data_feature_error_label(message: string) {
    const error = XUI.getObject(STUDIO_APP_EXPLORER_DATA_FEATURE_ERROR_ID) as any;
    if (!error) return;
    error.setText?.(message);
    error._text = message;
    if (message) {
      error.addClass?.("xstudio-add-view-error-visible");
    } else {
      error.removeClass?.("xstudio-add-view-error-visible");
    }
  }

  private _data_feature_preview_children() {
    return this._data_feature_preview().map((section) => ({
      _type: "view",
      class: "xstudio-data-feature-preview-section",
      _children: [
        {
          _type: "label",
          class: "xstudio-data-feature-section-title",
          _text: section._label,
        },
        ...(section._items.length > 0
          ? section._items.map((item) => ({
            _type: "label",
            class: "xstudio-data-feature-preview-item",
            _text: `- ${item}`,
          }))
          : [{
            _type: "label",
            class: "xstudio-data-feature-preview-empty",
            _text: "-",
          }]),
      ],
    }));
  }

  private _update_data_feature_preview() {
    const preview = XUI.getObject(STUDIO_APP_EXPLORER_DATA_FEATURE_PREVIEW_ID) as any;
    preview?.update?.({ _children: this._data_feature_preview_children() });
  }

  private _update_data_feature_progress() {
    const progress = XUI.getObject(STUDIO_APP_EXPLORER_DATA_FEATURE_PROGRESS_ID) as any;
    progress?.update?.({
      class: [
        "xstudio-data-feature-progress",
        this._data_feature_state._status !== "idle" ? "" : "xstudio-data-feature-progress-hidden",
      ].filter(Boolean).join(" "),
      _children: STUDIO_DATA_FEATURE_PROGRESS_STEPS.map((step) => ({
        _type: "label",
        class: [
          "xstudio-data-feature-progress-step",
          `xstudio-data-feature-progress-${this._data_feature_progress_status(step._id)}`,
        ].join(" "),
        _text: step._label,
      })),
    });
  }

  private _update_data_feature_dirty_marker() {
    this._set_object_class_token(
      "xstudio-data-feature-dirty",
      "xstudio-data-feature-dirty-visible",
      this._data_feature_has_unsaved_changes(),
    );
  }

  private _sync_data_feature_after_draft_change() {
    this._clear_data_feature_error_for_input();
    this._update_data_feature_preview();
    this._update_data_feature_dirty_marker();
  }

  private _data_feature_draft_empty() {
    return !this._data_feature_state._feature_name.trim() &&
      !this._data_feature_state._entity_id.trim() &&
      this._data_feature_normalized_fields().length === 0;
  }

  private _data_feature_existing_draft_payload() {
    return {
      _feature_name: this._data_feature_state._feature_name.trim(),
      _entity_id: this._data_feature_state._entity_id.trim(),
      _fields: this._data_feature_normalized_fields().map((field) => this._data_feature_field_request(field)),
    };
  }

  private _data_feature_suggestion_string_list(value: unknown) {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value
      .map((item) => String(item ?? "").trim())
      .filter((item) => {
        if (!item || seen.has(item)) return false;
        seen.add(item);
        return true;
      });
  }

  private _data_feature_suggestion_field_type(value: unknown): XStudioDataFeatureFieldType {
    const normalized = String(value ?? "").trim();
    return STUDIO_DATA_FEATURE_FIELD_TYPES.includes(normalized as XStudioDataFeatureFieldType)
      ? normalized as XStudioDataFeatureFieldType
      : "String";
  }

  private _data_feature_suggestion_default_text(value: unknown) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private _data_feature_suggestion_generation_options(value: unknown) {
    const source = is_obj(value) ? value : {};
    const options: Partial<Record<XStudioDataFeatureOptionId, boolean>> = {};
    for (const option_id of STUDIO_DATA_FEATURE_OPTION_IDS) {
      const underscored = `_${option_id}`;
      const raw = source[underscored] ?? source[option_id];
      if (typeof raw === "boolean") options[option_id] = raw;
    }
    return options;
  }

  private _data_feature_debug_details(value: any) {
    if (value === undefined || value === null) return "";
    if (value instanceof Error) return value.message;
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private _data_feature_error_text(value: any): string {
    if (value instanceof Error) return this._data_feature_error_text(value.message);
    if (typeof value === "string") {
      const trimmed = value.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
          const parsed = JSON.parse(trimmed);
          const nested = this._data_feature_error_text(parsed);
          if (nested) return nested;
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }
    if (!is_obj(value)) return String(value ?? "");
    const candidates = [
      value._message,
      value.message,
      value._code,
      value.code,
      value._reason,
      value.reason,
      value._error,
      value.error,
      value._result,
      value.result,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
      if (is_obj(candidate)) {
        const nested = this._data_feature_error_text(candidate);
        if (nested) return nested;
      }
    }
    return "";
  }

  private _data_feature_provider_auth_error(value: any) {
    const text = `${this._data_feature_error_text(value)} ${this._data_feature_debug_details(value)}`.toLowerCase();
    return text.includes("e_xai_api_key_invalid") ||
      text.includes("invalid api key") ||
      text.includes("could not authenticate") ||
      text.includes("authentication") ||
      text.includes("unauthorized");
  }

  private _data_feature_suggestion_failure(value: any, fallback = "Data Feature suggestion failed.") {
    return {
      _message: this._data_feature_provider_auth_error(value)
        ? STUDIO_DATA_FEATURE_PROVIDER_AUTH_MESSAGE
        : (this._data_feature_error_text(value) || fallback),
      _debug_details: this._data_feature_debug_details(value),
    };
  }

  private _normalize_data_feature_suggestion_result(result: any) {
    const root = is_obj(result?._result) ? result._result : result;
    if (is_obj(root) && root._ok === false) {
      const failure = this._data_feature_suggestion_failure(root, "Data Feature suggestion failed.");
      return {
        _ok: false,
        _error: failure._message,
        _debug_details: failure._debug_details,
        _draft: null,
      };
    }

    const draft = is_obj(root?._draft)
      ? root._draft
      : is_obj(root?._result?._draft)
        ? root._result._draft
        : null;
    if (!draft) {
      return {
        _ok: false,
        _error: "Suggest feature returned no editable draft.",
        _debug_details: this._data_feature_debug_details(result),
        _draft: null,
      };
    }

    const fields = Array.isArray(draft._fields) ? draft._fields : [];
    const normalized_fields = fields
      .map((field: any): XStudioDataFeatureSuggestedField | null => {
        if (!is_obj(field)) return null;
        const field_id = this._canonical_data_feature_id(field._field_id ?? field._id ?? field._name);
        const name = String(field._name ?? field._label ?? field_id).trim();
        if (!field_id || !name) return null;
        return {
          _name: name,
          _field_id: field_id,
          _type: this._data_feature_suggestion_field_type(field._type),
          _required: field._required === true,
          ...(Object.prototype.hasOwnProperty.call(field, "_default") ? { _default: field._default } : {}),
          ...(Array.isArray(field._options) ? { _options: field._options } : {}),
        };
      })
      .filter((field: XStudioDataFeatureSuggestedField | null): field is XStudioDataFeatureSuggestedField => field !== null);

    const feature_name = String(draft._feature_name ?? "").trim();
    const entity_id = this._canonical_data_feature_id(draft._entity_id ?? feature_name);
    if (!feature_name || !entity_id || normalized_fields.length === 0) {
      return {
        _ok: false,
        _error: "Suggest feature returned an incomplete draft.",
        _debug_details: this._data_feature_debug_details(result),
        _draft: null,
      };
    }

    return {
      _ok: true,
      _error: "",
      _debug_details: "",
      _draft: {
        _feature_name: feature_name,
        _entity_id: entity_id,
        _fields: normalized_fields,
        _generation_options: this._data_feature_suggestion_generation_options(draft._generation_options),
        _assumptions: this._data_feature_suggestion_string_list(draft._assumptions),
        _warnings: this._data_feature_suggestion_string_list(draft._warnings),
      } as XStudioDataFeatureSuggestedDraft,
    };
  }

  private _data_feature_draft_field_from_suggestion(
    field: XStudioDataFeatureSuggestedField,
    key: string,
  ): XStudioDataFeatureFieldDraft {
    return {
      ...create_data_feature_field(key),
      _name: field._name,
      _field_id: field._field_id,
      _type: field._type,
      _required: field._required === true,
      _default: this._data_feature_suggestion_default_text(field._default),
      _options: Array.isArray(field._options)
        ? field._options.map((option) => String(option ?? "").trim()).filter(Boolean).join(", ")
        : "",
      _field_id_touched: true,
    };
  }

  private _apply_data_feature_suggestion_draft(
    draft: XStudioDataFeatureSuggestedDraft,
    mode: "replace" | "merge",
  ) {
    if (mode === "merge") {
      this._sync_data_feature_state_from_controls();
    }
    const warnings = [...draft._warnings];
    if (mode === "replace") {
      this._data_feature_field_seq = 0;
      this._data_feature_state._feature_name = draft._feature_name;
      this._data_feature_state._entity_id = draft._entity_id;
      this._data_feature_state._entity_id_touched = true;
      this._data_feature_state._fields = draft._fields.map((field) => {
        this._data_feature_field_seq += 1;
        return this._data_feature_draft_field_from_suggestion(field, `field-${this._data_feature_field_seq}`);
      });
      this._data_feature_state._options = {
        ...this._data_feature_state._options,
        ...draft._generation_options,
      };
    } else {
      this._data_feature_state._fields = this._data_feature_state._fields
        .filter((field) => field._name.trim() || field._field_id.trim());
      if (!this._data_feature_state._feature_name.trim()) {
        this._data_feature_state._feature_name = draft._feature_name;
      } else if (this._data_feature_state._feature_name.trim() !== draft._feature_name) {
        warnings.push(`Existing feature name '${this._data_feature_state._feature_name.trim()}' was preserved.`);
      }
      if (!this._data_feature_state._entity_id.trim()) {
        this._data_feature_state._entity_id = draft._entity_id;
        this._data_feature_state._entity_id_touched = true;
      } else if (this._data_feature_state._entity_id.trim() !== draft._entity_id) {
        warnings.push(`Existing entity ID '${this._data_feature_state._entity_id.trim()}' was preserved.`);
      }

      const existing_ids = new Set(
        this._data_feature_state._fields
          .map((field) => field._field_id.trim())
          .filter(Boolean),
      );
      for (const field of draft._fields) {
        if (existing_ids.has(field._field_id)) {
          warnings.push(`Existing field ${field._field_id} was preserved.`);
          continue;
        }
        this._data_feature_field_seq += 1;
        this._data_feature_state._fields.push(
          this._data_feature_draft_field_from_suggestion(field, `field-${this._data_feature_field_seq}`),
        );
        existing_ids.add(field._field_id);
      }
      warnings.push("Existing generation options were preserved.");
    }

    if (this._data_feature_state._fields.length === 0) {
      this._data_feature_state._fields.push(this._data_feature_new_field());
    }
    this._data_feature_state._suggestion_status = "idle";
    this._data_feature_state._suggestion_error = "";
    this._data_feature_state._suggestion_debug_details = "";
    this._data_feature_state._suggestion_pending_draft = null;
    this._data_feature_state._suggestion_assumptions = [...draft._assumptions];
    this._data_feature_state._suggestion_warnings = warnings;
    this._data_feature_state._error = "";
    this._render_data_feature_drawer();
  }

  private _cancel_data_feature_suggestion_review() {
    this._sync_data_feature_state_from_controls();
    this._data_feature_state._suggestion_status = "idle";
    this._data_feature_state._suggestion_error = "";
    this._data_feature_state._suggestion_debug_details = "";
    this._data_feature_state._suggestion_pending_draft = null;
    this._render_data_feature_drawer();
  }

  private async _retry_data_feature_suggestion() {
    if (this._data_feature_state._status === "running") return;
    this._sync_data_feature_state_from_controls();
    await this._suggest_data_feature_from_prompt();
  }

  private async _suggest_data_feature_from_prompt() {
    if (this._data_feature_controls_disabled()) return;
    this._sync_data_feature_state_from_controls();
    const prompt = this._data_feature_state._suggestion_prompt.trim();
    if (!prompt) {
      this._data_feature_state._suggestion_status = "failed";
      this._data_feature_state._suggestion_error = "Describe the Data Feature first.";
      this._render_data_feature_drawer();
      return;
    }
    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();
    if (!app_id) {
      this._data_feature_state._suggestion_status = "failed";
      this._data_feature_state._suggestion_error = "No active app selected.";
      this._render_data_feature_drawer();
      return;
    }
    if (!env) {
      this._data_feature_state._suggestion_status = "failed";
      this._data_feature_state._suggestion_error = "No active environment selected.";
      this._render_data_feature_drawer();
      return;
    }

    const captured_draft_empty = this._data_feature_draft_empty();
    const captured_existing_draft = this._data_feature_existing_draft_payload();
    this._data_feature_state._suggestion_status = "loading";
    this._data_feature_state._suggestion_error = "";
    this._data_feature_state._suggestion_debug_details = "";
    this._data_feature_state._suggestion_pending_draft = null;
    this._render_data_feature_drawer();

    try {
      const result = await this._send_xvibe_command("suggest-data-feature", {
        _app_id: app_id,
        _env: env,
        _prompt: prompt,
        _existing_draft: captured_existing_draft,
      });
      const normalized = this._normalize_data_feature_suggestion_result(result);
      if (!normalized._ok || !normalized._draft) {
        this._data_feature_state._suggestion_status = "failed";
        this._data_feature_state._suggestion_error = normalized._error;
        this._data_feature_state._suggestion_debug_details = normalized._debug_details;
        this._render_data_feature_drawer();
        return;
      }

      if (captured_draft_empty) {
        this._apply_data_feature_suggestion_draft(normalized._draft, "replace");
        return;
      }

      this._data_feature_state._suggestion_status = "review";
      this._data_feature_state._suggestion_error = "";
      this._data_feature_state._suggestion_debug_details = "";
      this._data_feature_state._suggestion_pending_draft = normalized._draft;
      this._data_feature_state._suggestion_assumptions = [...normalized._draft._assumptions];
      this._data_feature_state._suggestion_warnings = [...normalized._draft._warnings];
      this._render_data_feature_drawer();
    } catch (err) {
      const failure = this._data_feature_suggestion_failure(err, "Suggest feature failed.");
      this._data_feature_state._suggestion_status = "failed";
      this._data_feature_state._suggestion_error = failure._message;
      this._data_feature_state._suggestion_debug_details = failure._debug_details;
      this._render_data_feature_drawer();
    }
  }

  private _data_feature_field_row(field: XStudioDataFeatureFieldDraft, index: number) {
    const disabled = this._data_feature_controls_disabled();
    return {
      _type: "view",
      _id: `${STUDIO_APP_EXPLORER_DATA_FEATURE_FIELD_PREFIX}-${field._key}`,
      class: "xstudio-data-feature-field-row",
      _children: [
        {
          _type: "text",
          _id: this._data_feature_field_control_id(field, "name"),
          class: "xstudio-data-feature-input",
          placeholder: "Field name",
          value: field._name,
          _value: field._name,
          autocomplete: "off",
          spellcheck: "false",
          ...(disabled ? { disabled: true } : {}),
          _on: {
            input: (event?: any) => {
              field._name = String(event?.target?.value ?? "").trimStart();
              if (!field._field_id_touched) {
                field._field_id = this._canonical_data_feature_id(field._name);
                this._set_data_feature_control_value(
                  this._data_feature_field_control_id(field, "id"),
                  field._field_id,
                );
              }
              this._sync_data_feature_after_draft_change();
            },
          },
        },
        {
          _type: "text",
          _id: this._data_feature_field_control_id(field, "id"),
          class: "xstudio-data-feature-input",
          placeholder: "field_id",
          value: field._field_id,
          _value: field._field_id,
          autocomplete: "off",
          spellcheck: "false",
          ...(disabled ? { disabled: true } : {}),
          _on: {
            input: (event?: any) => {
              field._field_id = String(event?.target?.value ?? "").trimStart();
              field._field_id_touched = true;
              this._sync_data_feature_after_draft_change();
            },
          },
        },
        {
          _type: "select",
          _id: this._data_feature_field_control_id(field, "type"),
          class: "xstudio-data-feature-input xstudio-data-feature-type",
          value: field._type,
          _value: field._type,
          ...(disabled ? { disabled: true } : {}),
          _options: STUDIO_DATA_FEATURE_FIELD_TYPES.map((type) => ({
            value: type,
            label: type,
            ...(type === field._type ? { selected: true } : {}),
          })),
          _on: {
            change: (event?: any) => {
              const next = String(event?.target?.value ?? "");
              field._type = STUDIO_DATA_FEATURE_FIELD_TYPES.includes(next as XStudioDataFeatureFieldType)
                ? next as XStudioDataFeatureFieldType
                : "String";
              this._sync_data_feature_after_draft_change();
            },
          },
        },
        {
          _type: "label",
          class: "xstudio-data-feature-required-cell",
          _children: [
            {
              _type: "input",
              _id: this._data_feature_field_control_id(field, "required"),
              type: "checkbox",
              class: "xstudio-selected-object-editor-input-checkbox",
              checked: field._required,
              ...(disabled ? { disabled: true } : {}),
              _on: {
                change: (event?: any) => {
                  field._required = event?.target?.checked === true;
                  this._sync_data_feature_after_draft_change();
                },
              },
            },
            {
              _type: "span",
              class: "xstudio-data-feature-required-label",
              _text: "Required",
            },
          ],
        },
        {
          _type: "text",
          _id: this._data_feature_field_control_id(field, "default"),
          class: "xstudio-data-feature-input",
          placeholder: "Default",
          value: field._default,
          _value: field._default,
          autocomplete: "off",
          spellcheck: "false",
          ...(disabled ? { disabled: true } : {}),
          _on: {
            input: (event?: any) => {
              field._default = String(event?.target?.value ?? "").trimStart();
              this._sync_data_feature_after_draft_change();
            },
          },
        },
        {
          _type: "text",
          _id: this._data_feature_field_control_id(field, "options"),
          class: "xstudio-data-feature-input",
          placeholder: "low, medium, high",
          value: field._options,
          _value: field._options,
          autocomplete: "off",
          spellcheck: "false",
          ...(disabled ? { disabled: true } : {}),
          _on: {
            input: (event?: any) => {
              field._options = String(event?.target?.value ?? "").trimStart();
              this._sync_data_feature_after_draft_change();
            },
          },
        },
        {
          _type: "view",
          class: "xstudio-data-feature-field-actions",
          _children: [
            {
              _type: "button",
              type: "button",
              class: "xstudio-data-feature-icon-button",
              title: "Move field up",
              "aria-label": "Move field up",
              _text: "↑",
              ...(disabled || index === 0 ? { disabled: true } : {}),
              _on: {
                click: (event?: Event) => {
                  event?.preventDefault?.();
                  event?.stopPropagation?.();
                  this._move_data_feature_field(field._key, -1);
                },
              },
            },
            {
              _type: "button",
              type: "button",
              class: "xstudio-data-feature-icon-button",
              title: "Move field down",
              "aria-label": "Move field down",
              _text: "↓",
              ...(disabled || index >= this._data_feature_state._fields.length - 1 ? { disabled: true } : {}),
              _on: {
                click: (event?: Event) => {
                  event?.preventDefault?.();
                  event?.stopPropagation?.();
                  this._move_data_feature_field(field._key, 1);
                },
              },
            },
            {
              _type: "button",
              type: "button",
              class: "xstudio-data-feature-icon-button xstudio-data-feature-remove",
              title: "Remove field",
              "aria-label": "Remove field",
              _text: "×",
              ...(disabled ? { disabled: true } : {}),
              _on: {
                click: (event?: Event) => {
                  event?.preventDefault?.();
                  event?.stopPropagation?.();
                  this._remove_data_feature_field(field._key);
                },
              },
            },
          ],
        },
      ],
    };
  }

  private _data_feature_preview() {
    const artifacts = this._data_feature_artifact_ids();
    const options = this._data_feature_state._options;
    return [
      {
        _label: "Entity:",
        _items: options.entity && artifacts._entity_id ? [artifacts._entity_id] : [],
      },
      {
        _label: "Views:",
        _items: [
          options.list_view ? artifacts._list_view_id : "",
          options.create_form ? artifacts._create_form_view_id : "",
        ].filter(Boolean),
      },
      {
        _label: "Flows:",
        _items: [
          options.create_flow ? artifacts._create_flow_id : "",
          options.update_flow ? artifacts._update_flow_id : "",
          options.delete_flow ? artifacts._delete_flow_id : "",
        ].filter(Boolean),
      },
    ];
  }

  private _data_feature_preview_view() {
    return {
      _type: "view",
      _id: STUDIO_APP_EXPLORER_DATA_FEATURE_PREVIEW_ID,
      class: "xstudio-data-feature-preview",
      _children: this._data_feature_preview_children(),
    };
  }

  private _data_feature_progress_view() {
    const visible = this._data_feature_state._status !== "idle";
    return {
      _type: "view",
      _id: STUDIO_APP_EXPLORER_DATA_FEATURE_PROGRESS_ID,
      class: [
        "xstudio-data-feature-progress",
        visible ? "" : "xstudio-data-feature-progress-hidden",
      ].filter(Boolean).join(" "),
      _children: STUDIO_DATA_FEATURE_PROGRESS_STEPS.map((step) => ({
        _type: "label",
        class: [
          "xstudio-data-feature-progress-step",
          `xstudio-data-feature-progress-${this._data_feature_progress_status(step._id)}`,
        ].join(" "),
        _text: step._label,
      })),
    };
  }

  private _data_feature_options_view() {
    const disabled = this._data_feature_state._status === "running" ||
      this._data_feature_state._suggestion_status === "loading";
    return {
      _type: "view",
      class: "xstudio-data-feature-options",
      _children: STUDIO_DATA_FEATURE_OPTION_IDS.map((option_id) => ({
        _type: "label",
        class: "xstudio-data-feature-option",
        _children: [
          {
            _type: "input",
            _id: this._data_feature_option_control_id(option_id),
            type: "checkbox",
            class: "xstudio-selected-object-editor-input-checkbox",
            checked: this._data_feature_state._options[option_id] === true,
            ...(disabled ? { disabled: true } : {}),
            _on: {
              change: (event?: any) => {
                this._data_feature_state._options[option_id] = event?.target?.checked === true;
                this._sync_data_feature_after_draft_change();
              },
            },
          },
          {
            _type: "span",
            class: "xstudio-data-feature-option-label",
            _text: STUDIO_DATA_FEATURE_OPTION_LABELS[option_id],
          },
        ],
      })),
    };
  }

  private _render_data_feature_drawer() {
    const panel = XUI.getObject(STUDIO_APP_EXPLORER_DATA_FEATURE_DRAWER_ID) as any;
    const body = XUI.getObject(STUDIO_APP_EXPLORER_DATA_FEATURE_BODY_ID) as any;
    if (!panel || !body) return;

    const state = this._data_feature_state;
    const running = state._status === "running";
    const disabled = this._data_feature_controls_disabled();
    const suggestion_loading = state._suggestion_status === "loading";
    const suggestion_review = state._suggestion_status === "review" && state._suggestion_pending_draft !== null;
    const suggest_disabled = this._data_feature_suggest_disabled();
    const create_disabled = running || suggestion_loading || suggestion_review;
    const suggestion_status_text =
      state._suggestion_error ||
      (suggestion_loading ? "Requesting structured draft..." : "");
    const suggestion_debug_details =
      state._suggestion_debug_details;
    const ask_messages = [
      ...state._suggestion_assumptions.map((message) => ({ _kind: "assumption", _text: message })),
      ...state._suggestion_warnings.map((message) => ({ _kind: "warning", _text: message })),
    ];
    panel._visible = state._open;
    this._set_portlet_visible(STUDIO_APP_EXPLORER_DATA_FEATURE_DRAWER_ID, state._open);

    body.update?.({
      _children: [
        {
          _type: "view",
          class: "xstudio-data-feature-workspace-header",
          _children: [
            {
              _type: "view",
              class: "xstudio-data-feature-title-block",
              _children: [
                {
                  _type: "label",
                  _id: "xstudio-data-feature-title",
                  class: "xstudio-data-feature-title",
                  _text: "Data Feature",
                },
                {
                  _type: "label",
                  _id: "xstudio-data-feature-dirty",
                  class: [
                    "xstudio-data-feature-dirty",
                    this._data_feature_has_unsaved_changes() ? "xstudio-data-feature-dirty-visible" : "",
                  ].filter(Boolean).join(" "),
                  _text: "Unsaved changes",
                },
              ],
            },
            {
              _id: STUDIO_APP_EXPLORER_DATA_FEATURE_CANCEL_ID,
              _type: "button",
              type: "button",
              class: "xstudio-object-palette-close xstudio-data-feature-close",
              title: "Close",
              "aria-label": "Close Data Feature",
              _text: "×",
              ...(running ? { disabled: true } : {}),
              _on: {
                click: (event?: Event) => {
                  event?.preventDefault?.();
                  event?.stopPropagation?.();
                  this._close_data_feature_drawer();
                },
              },
            },
          ],
        },
        {
          _type: "view",
          class: "xstudio-data-feature-scroll",
          _children: [
            {
              _type: "view",
              class: "xstudio-data-feature-top-grid",
              _children: [
                {
                  _type: "label",
                  class: "xstudio-data-feature-field",
                  _children: [
                    {
                      _type: "span",
                      class: "xstudio-add-view-label",
                      _text: "Feature name",
                    },
                    {
                      _id: STUDIO_APP_EXPLORER_DATA_FEATURE_NAME_ID,
                      _type: "text",
                      class: "xstudio-add-view-input xstudio-data-feature-large-input",
                      value: state._feature_name,
                      _value: state._feature_name,
                      autocomplete: "off",
                      spellcheck: "false",
                      placeholder: "Shopping Item",
                      ...(disabled ? { disabled: true } : {}),
                      _on: {
                        input: (event?: any) => {
                          state._feature_name = String(event?.target?.value ?? "").trimStart();
                          if (!state._entity_id_touched) {
                            state._entity_id = this._canonical_data_feature_id(state._feature_name);
                            this._set_data_feature_control_value(
                              STUDIO_APP_EXPLORER_DATA_FEATURE_ENTITY_ID,
                              state._entity_id,
                            );
                          }
                          this._sync_data_feature_after_draft_change();
                        },
                      },
                    },
                  ],
                },
                {
                  _type: "label",
                  class: "xstudio-data-feature-field",
                  _children: [
                    {
                      _type: "span",
                      class: "xstudio-add-view-label",
                      _text: "Canonical entity ID",
                    },
                    {
                      _id: STUDIO_APP_EXPLORER_DATA_FEATURE_ENTITY_ID,
                      _type: "text",
                      class: "xstudio-add-view-input xstudio-data-feature-large-input",
                      value: state._entity_id,
                      _value: state._entity_id,
                      autocomplete: "off",
                      spellcheck: "false",
                      placeholder: "shopping_item",
                      ...(disabled ? { disabled: true } : {}),
                      _on: {
                        input: (event?: any) => {
                          state._entity_id = String(event?.target?.value ?? "").trimStart();
                          state._entity_id_touched = true;
                          this._sync_data_feature_after_draft_change();
                        },
                      },
                    },
                  ],
                },
              ],
            },
            {
              _type: "view",
              class: "xstudio-data-feature-card xstudio-data-feature-ask",
              _children: [
                {
                  _type: "label",
                  class: "xstudio-data-feature-section-title",
                  _text: "Ask Xpell",
                },
                {
                  _type: "textarea",
                  _id: STUDIO_APP_EXPLORER_DATA_FEATURE_ASK_INPUT_ID,
                  class: "xstudio-data-feature-ask-input",
                  placeholder: "Describe the data feature, for example: Shopping items with name, quantity, priority and purchased status.",
                  value: state._suggestion_prompt,
                  _value: state._suggestion_prompt,
                  autocomplete: "off",
                  spellcheck: "true",
                  ...(running ? { disabled: true } : {}),
                  _on: {
                    input: (event?: any) => {
                      state._suggestion_prompt = String(event?.target?.value ?? "");
                      if (state._suggestion_error) {
                        state._suggestion_error = "";
                        state._suggestion_debug_details = "";
                      }
                      this._update_data_feature_dirty_marker();
                    },
                  },
                },
                {
                  _id: STUDIO_APP_EXPLORER_DATA_FEATURE_ASK_BUTTON_ID,
                  _type: "button",
                  type: "button",
                  class: "xstudio-selected-object-editor-button xstudio-data-feature-ask-button",
                  _text: suggestion_loading ? "Suggesting..." : "Suggest feature",
                  ...(suggest_disabled ? { disabled: true } : {}),
                  _on: {
                    click: (event?: Event) => {
                      event?.preventDefault?.();
                      event?.stopPropagation?.();
                      void this._suggest_data_feature_from_prompt();
                    },
                  },
                },
                {
                  _id: STUDIO_APP_EXPLORER_DATA_FEATURE_ASK_STATUS_ID,
                  _type: "label",
                  class: [
                    "xstudio-data-feature-ask-status",
                    state._suggestion_status === "failed" ? "xstudio-data-feature-ask-status-error" : "",
                    suggestion_loading ? "xstudio-data-feature-ask-status-loading" : "",
                  ].filter(Boolean).join(" "),
                  "aria-live": "polite",
                  _text: suggestion_status_text,
                },
                {
                  _id: "xstudio-data-feature-ask-retry",
                  _type: "button",
                  type: "button",
                  class: [
                    "xstudio-selected-object-editor-button",
                    "xstudio-data-feature-retry-button",
                    state._suggestion_status === "failed" ? "" : "xstudio-data-feature-retry-hidden",
                  ].filter(Boolean).join(" "),
                  _text: "Retry suggestion",
                  ...(running || suggestion_loading ? { disabled: true } : {}),
                  _on: {
                    click: (event?: Event) => {
                      event?.preventDefault?.();
                      event?.stopPropagation?.();
                      void this._retry_data_feature_suggestion();
                    },
                  },
                },
                {
                  _id: "xstudio-data-feature-ask-debug",
                  _type: "xhtml",
                  _html_tag: "details",
                  class: [
                    "xstudio-data-feature-ask-debug",
                    suggestion_debug_details ? "" : "xstudio-data-feature-ask-debug-hidden",
                  ].filter(Boolean).join(" "),
                  _children: [
                    {
                      _type: "xhtml",
                      _html_tag: "summary",
                      class: "xstudio-data-feature-ask-debug-summary",
                      _text: "Debug",
                    },
                    {
                      _type: "label",
                      class: "xstudio-data-feature-ask-debug-payload debug-payload",
                      _text: suggestion_debug_details,
                    },
                  ],
                },
                {
                  _id: STUDIO_APP_EXPLORER_DATA_FEATURE_ASK_MESSAGES_ID,
                  _type: "view",
                  class: [
                    "xstudio-data-feature-ask-messages",
                    ask_messages.length > 0 ? "" : "xstudio-data-feature-ask-messages-empty",
                  ].filter(Boolean).join(" "),
                  _children: ask_messages.map((message) => ({
                    _type: "label",
                    class: [
                      "xstudio-data-feature-ask-message",
                      `xstudio-data-feature-ask-message-${message._kind}`,
                    ].join(" "),
                    _text: message._text,
                  })),
                },
                {
                  _id: STUDIO_APP_EXPLORER_DATA_FEATURE_REVIEW_ID,
                  _type: "view",
                  class: [
                    "xstudio-data-feature-review",
                    suggestion_review ? "" : "xstudio-data-feature-review-hidden",
                  ].filter(Boolean).join(" "),
                  _children: [
                    {
                      _type: "label",
                      class: "xstudio-data-feature-review-title",
                      _text: "Review suggested draft",
                    },
                    {
                      _type: "view",
                      class: "xstudio-data-feature-review-actions",
                      _children: [
                        {
                          _id: STUDIO_APP_EXPLORER_DATA_FEATURE_REPLACE_ID,
                          _type: "button",
                          type: "button",
                          class: "xstudio-selected-object-editor-button",
                          _text: "Replace draft",
                          _on: {
                            click: (event?: Event) => {
                              event?.preventDefault?.();
                              event?.stopPropagation?.();
                              if (state._suggestion_pending_draft) {
                                this._apply_data_feature_suggestion_draft(state._suggestion_pending_draft, "replace");
                              }
                            },
                          },
                        },
                        {
                          _id: STUDIO_APP_EXPLORER_DATA_FEATURE_MERGE_ID,
                          _type: "button",
                          type: "button",
                          class: "xstudio-selected-object-editor-button",
                          _text: "Merge suggested fields",
                          _on: {
                            click: (event?: Event) => {
                              event?.preventDefault?.();
                              event?.stopPropagation?.();
                              if (state._suggestion_pending_draft) {
                                this._apply_data_feature_suggestion_draft(state._suggestion_pending_draft, "merge");
                              }
                            },
                          },
                        },
                        {
                          _id: STUDIO_APP_EXPLORER_DATA_FEATURE_CANCEL_SUGGESTION_ID,
                          _type: "button",
                          type: "button",
                          class: "xstudio-selected-object-editor-button",
                          _text: "Cancel",
                          _on: {
                            click: (event?: Event) => {
                              event?.preventDefault?.();
                              event?.stopPropagation?.();
                              this._cancel_data_feature_suggestion_review();
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              _type: "view",
              class: "xstudio-data-feature-card",
              _children: [
                {
                  _type: "label",
                  class: "xstudio-data-feature-section-title",
                  _text: "Fields",
                },
                {
                  _type: "view",
                  class: "xstudio-data-feature-field-list",
                  _children: [
                    {
                      _type: "view",
                  class: "xstudio-data-feature-field-head",
                      _children: ["Field name", "Canonical field ID", "Type", "Required", "Default", "Options", ""].map((text) => ({
                        _type: "label",
                        _text: text,
                      })),
                    },
                    ...state._fields.map((field, index) => this._data_feature_field_row(field, index)),
                  ],
                },
                {
                  _type: "button",
                  type: "button",
                  class: "xstudio-selected-object-editor-button xstudio-data-feature-add-field",
                  _text: "+ Add field",
                  ...(running ? { disabled: true } : {}),
                  _on: {
                    click: (event?: Event) => {
                      event?.preventDefault?.();
                      event?.stopPropagation?.();
                      this._add_data_feature_field();
                    },
                  },
                },
              ],
            },
            {
              _type: "view",
              class: "xstudio-data-feature-card",
              _children: [
                {
                  _type: "label",
                  class: "xstudio-data-feature-section-title",
                  _text: "Generation options",
                },
                this._data_feature_options_view(),
              ],
            },
            {
              _type: "view",
              class: "xstudio-data-feature-card",
              _children: [
                {
                  _type: "label",
                  class: "xstudio-data-feature-section-title",
                  _text: "Preview",
                },
                this._data_feature_preview_view(),
              ],
            },
            this._data_feature_progress_view(),
            {
              _id: STUDIO_APP_EXPLORER_DATA_FEATURE_ERROR_ID,
              _type: "label",
              class: [
                "xstudio-add-view-error",
                state._error ? "xstudio-add-view-error-visible" : "",
              ].filter(Boolean).join(" "),
              "aria-live": "polite",
              _text: state._error,
            },
          ],
        },
        {
          _type: "view",
          class: "xstudio-data-feature-footer",
          _children: [
            {
              _type: "button",
              type: "button",
              class: "xstudio-selected-object-editor-button xstudio-data-feature-cancel-button",
              _text: "Cancel",
              ...(running ? { disabled: true } : {}),
              _on: {
                click: (event?: Event) => {
                  event?.preventDefault?.();
                  event?.stopPropagation?.();
                  this._close_data_feature_drawer();
                },
              },
            },
            {
              _type: "button",
              _id: STUDIO_APP_EXPLORER_DATA_FEATURE_CREATE_ID,
              type: "button",
              class: "xstudio-selected-object-editor-button xstudio-add-view-create xstudio-data-feature-create",
              _text: running ? "Creating..." : "Create feature",
              ...(create_disabled ? { disabled: true } : {}),
              _on: {
                click: (event?: Event) => {
                  event?.preventDefault?.();
                  event?.stopPropagation?.();
                  void this._create_data_feature_from_drawer();
                },
              },
            },
          ],
        },
      ],
    });
  }

  private _open_add_menu() {
    this._data_feature_state._add_menu_open = true;
    this._render_cached_app_explorer();
  }

  private _close_add_menu() {
    if (!this._data_feature_state._add_menu_open) return;
    this._data_feature_state._add_menu_open = false;
    this._render_cached_app_explorer();
  }

  private _toggle_add_menu() {
    this._data_feature_state._add_menu_open = !this._data_feature_state._add_menu_open;
    this._render_cached_app_explorer();
  }

  private _data_feature_workspace_portlet_ids() {
    return (STUDIO_PORTLET_IDS as XStudioPortletId[]).filter((portlet_id) => portlet_id !== "selected");
  }

  private _open_data_feature_drawer() {
    if (!this._data_feature_state._open) {
      this._data_feature_previous_portlet_visibility = { ...this._portlet_visibility };
    }
    const scope_key = this._data_feature_current_scope_key();
    const needs_new_draft = this._data_feature_scope_key !== scope_key || !this._data_feature_has_editable_draft();
    if (needs_new_draft) {
      this._data_feature_field_seq = 1;
      this._data_feature_state = {
        ...empty_data_feature_state(),
        _open: true,
        _add_menu_open: false,
      };
      this._data_feature_scope_key = scope_key;
      this._data_feature_initial_snapshot = this._data_feature_draft_snapshot();
    } else {
      this._data_feature_state._open = true;
      this._data_feature_state._add_menu_open = false;
      this._data_feature_scope_key = scope_key;
    }
    for (const portlet_id of this._data_feature_workspace_portlet_ids()) {
      this._portlet_visibility[portlet_id] = portlet_id === "data_feature";
    }
    this._right_dock_collapsed = false;
    this._apply_dock_state();
    this._render_cached_app_explorer();
    this._render_data_feature_drawer();
  }

  private _close_data_feature_drawer(options: { _force?: boolean } = {}) {
    if (this._data_feature_state._status === "running") return;
    this._sync_data_feature_state_from_controls();
    if (!options._force && !this._confirm_data_feature_close_if_dirty()) return;
    this._data_feature_state._open = false;
    this._data_feature_state._error = "";
    if (this._data_feature_previous_portlet_visibility) {
      this._portlet_visibility = {
        ...this._data_feature_previous_portlet_visibility,
        data_feature: false,
      };
    } else {
      this._portlet_visibility.data_feature = false;
    }
    this._data_feature_previous_portlet_visibility = null;
    this._apply_dock_state();
    this._render_cached_app_explorer();
    this._render_data_feature_drawer();
  }

  private _add_data_feature_field() {
    if (this._data_feature_state._status === "running") return;
    this._sync_data_feature_state_from_controls();
    const active_id = typeof document !== "undefined"
      ? (document.activeElement as HTMLElement | null)?.id ?? ""
      : "";
    this._data_feature_state._fields.push(this._data_feature_new_field());
    this._data_feature_state._error = "";
    this._render_data_feature_drawer();
    if (active_id) {
      queueMicrotask(() => {
        const control = XUI.getObject(active_id) as any;
        control?.dom?.focus?.();
      });
    }
  }

  private _remove_data_feature_field(key: string) {
    if (this._data_feature_state._status === "running") return;
    this._sync_data_feature_state_from_controls();
    this._data_feature_state._fields = this._data_feature_state._fields.filter((field) => field._key !== key);
    if (this._data_feature_state._fields.length === 0) {
      this._data_feature_state._fields.push(this._data_feature_new_field());
    }
    this._data_feature_state._error = "";
    this._render_data_feature_drawer();
  }

  private _move_data_feature_field(key: string, delta: -1 | 1) {
    if (this._data_feature_state._status === "running") return;
    this._sync_data_feature_state_from_controls();
    const fields = this._data_feature_state._fields;
    const index = fields.findIndex((field) => field._key === key);
    const next_index = index + delta;
    if (index < 0 || next_index < 0 || next_index >= fields.length) return;
    const [field] = fields.splice(index, 1);
    fields.splice(next_index, 0, field);
    this._render_data_feature_drawer();
  }

  private _data_feature_execution_params(prepared: {
    _feature_name: string;
    _entity_id: string;
    _fields: {
      _name: string;
      _field_id: string;
      _type: XStudioDataFeatureFieldType;
      _required: boolean;
      _default?: unknown;
      _options?: unknown[];
    }[];
  }) {
    const fields = prepared._fields.map((field) => this._data_feature_field_request(field));
    return {
      _app_id: this._client().getActiveAppId(),
      _env: this._client().getActiveEnv(),
      _graph_type: "crud",
      _entity_name: prepared._entity_id,
      _feature_name: prepared._feature_name,
      _fields: fields,
      _canonical_request: {
        _type: "data-feature",
        _feature_name: prepared._feature_name,
        _entity_id: prepared._entity_id,
        _fields: fields,
        _generation_options: { ...this._data_feature_state._options },
      },
      _generation_options: { ...this._data_feature_state._options },
    };
  }

  private _mark_data_feature_progress_running() {
    this._data_feature_state._status = "running";
    this._data_feature_state._error = "";
    this._data_feature_state._progress = {
      entity: "running",
      actions: "pending",
      form: "pending",
      list: "pending",
    };
    this._render_data_feature_drawer();
  }

  private _flatten_execution_graph_node_results(value: any, out: Record<string, any>[] = []) {
    if (!is_obj(value)) return out;
    if (Array.isArray(value._nodes)) {
      value._nodes.forEach((node: any) => this._flatten_execution_graph_node_results(node, out));
      return out;
    }
    out.push(value);
    if (Array.isArray(value._children)) {
      value._children.forEach((node: any) => this._flatten_execution_graph_node_results(node, out));
    }
    return out;
  }

  private _apply_data_feature_progress_from_result(result: any) {
    const root = is_obj(result?._result) ? result._result : result;
    const nodes = this._flatten_execution_graph_node_results(root);
    const has_failed = nodes.some((node) => node._status === "failed");
    const created_or_existing = (artifact_type: string) => nodes.some((node) =>
      node._artifact_type === artifact_type &&
      (node._status === "created" || node._status === "existing" || node._status === "skipped")
    );

    this._data_feature_state._progress = {
      entity: has_failed ? "failed" : created_or_existing("entity") ? "done" : "done",
      actions: has_failed ? "failed" : "done",
      form: has_failed ? "failed" : created_or_existing("form") || created_or_existing("view") ? "done" : "done",
      list: has_failed ? "failed" : created_or_existing("table") || created_or_existing("view") ? "done" : "done",
    };
  }

  private _format_data_feature_execution_failure(result: any): string {
    if (is_obj(result?._failed_node)) {
      const node = result._failed_node;
      const artifact = [node._artifact_type, node._artifact_id].filter(Boolean).join(" ");
      const message = to_err(node._error ?? node._reason ?? result._error ?? "Execution graph failed.");
      return artifact ? `${artifact}: ${message}` : message;
    }
    if (is_obj(result?._result?._failed_node)) {
      return this._format_data_feature_execution_failure(result._result);
    }
    return to_err(result) || "Data feature creation failed.";
  }

  private _data_feature_result_ok(result: any) {
    const root = is_obj(result?._result) ? result._result : result;
    if (is_obj(result) && result._ok === false) return false;
    if (is_obj(root) && root._ok === false) return false;
    if (is_obj(root) && root._failed_node) return false;
    const nodes = this._flatten_execution_graph_node_results(root);
    return !nodes.some((node) => node._status === "failed");
  }

  private _mark_recent_data_feature_artifacts(entity_id: string) {
    const artifacts = this._data_feature_artifact_ids(entity_id);
    const options = this._data_feature_state._options;
    const keys = [
      options.entity ? this._app_explorer_artifact_key("entity", artifacts._entity_id) : "",
      options.list_view ? this._app_explorer_artifact_key("view", artifacts._list_view_id) : "",
      options.create_form ? this._app_explorer_artifact_key("view", artifacts._create_form_view_id) : "",
      options.create_flow ? this._app_explorer_artifact_key("flow", artifacts._create_flow_id) : "",
      options.update_flow ? this._app_explorer_artifact_key("flow", artifacts._update_flow_id) : "",
      options.delete_flow ? this._app_explorer_artifact_key("flow", artifacts._delete_flow_id) : "",
    ].filter(Boolean);
    this._app_explorer_recent_artifact_keys = new Set(keys);
  }

  private async _select_generated_data_feature_list_view(entity_id: string) {
    const list_view_id = this._data_feature_artifact_ids(entity_id)._list_view_id;
    if (!list_view_id) return;
    const artifact =
      this._normalize_app_explorer_artifact({ _id: list_view_id }, "view") ??
      {
        _id: list_view_id,
        _title: list_view_id,
        _type: "view" as const,
        _raw: { _id: list_view_id },
      };
    this._app_explorer_selected_key = this._app_explorer_artifact_key("view", list_view_id);
    await this._open_app_explorer_view(artifact);
  }

  private async _create_data_feature_from_drawer() {
    if (this._data_feature_state._status === "running") return;
    this._sync_data_feature_state_from_controls();
    if (this._data_feature_state._suggestion_status === "loading" || this._data_feature_state._suggestion_status === "review") {
      this._data_feature_state._error = "Review or cancel the suggested draft before creating.";
      this._set_data_feature_error_label(this._data_feature_state._error);
      return;
    }

    const prepared = this._validate_data_feature(true);
    if (!prepared._ok) return;

    const app_id = this._client().getActiveAppId();
    const env = this._client().getActiveEnv();
    if (!app_id) {
      this._data_feature_state._error = "No active app selected.";
      this._set_data_feature_error_label(this._data_feature_state._error);
      return;
    }
    if (!env) {
      this._data_feature_state._error = "No active environment selected.";
      this._set_data_feature_error_label(this._data_feature_state._error);
      return;
    }

    const params = this._data_feature_execution_params(prepared);
    this._mark_data_feature_progress_running();
    this._write_studio_status(`Creating ${prepared._feature_name} data feature...`);
    this._log("data feature create requested", {
      _app_id: app_id,
      _env: env,
      _entity_name: prepared._entity_id,
      _fields: params._fields,
    });

    try {
      const result = await this._send_xvibe_command("execute-execution-graph", params);
      this._apply_data_feature_progress_from_result(result);
      if (!this._data_feature_result_ok(result)) {
        const message = this._format_data_feature_execution_failure(result);
        this._data_feature_state._status = "failed";
        this._data_feature_state._error = message;
        this._render_data_feature_drawer();
        this._write_studio_status(message);
        this._error("data feature create failed", {
          _app_id: app_id,
          _env: env,
          _entity_name: prepared._entity_id,
          _result: result,
        });
        return;
      }

      this._data_feature_state._status = "completed";
      this._data_feature_state._error = "";
      this._app_explorer_section_open.app = true;
      this._app_explorer_section_open.views = true;
      this._app_explorer_section_open.flows = true;
      this._app_explorer_section_open.entities = true;
      this._mark_recent_data_feature_artifacts(prepared._entity_id);
      await this._refresh_app_explorer();
      await this._select_generated_data_feature_list_view(prepared._entity_id);
      this._write_studio_status(`${prepared._feature_name} data feature created`);
      this._close_data_feature_drawer({ _force: true });
      this._log("data feature create completed", {
        _app_id: app_id,
        _env: env,
        _entity_name: prepared._entity_id,
      });
    } catch (err) {
      const message = `Data feature creation failed: ${to_err(err)}`;
      this._data_feature_state._status = "failed";
      this._data_feature_state._progress = {
        entity: this._data_feature_state._progress.entity === "running" ? "failed" : this._data_feature_state._progress.entity,
        actions: "failed",
        form: "failed",
        list: "failed",
      };
      this._data_feature_state._error = message;
      this._render_data_feature_drawer();
      this._write_studio_status(message);
      this._error("data feature create failed", {
        _app_id: app_id,
        _env: env,
        _entity_name: prepared._entity_id,
        _error: to_err(err),
      });
    }
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
      void this._load_project_memory_for_current_app("studio-open", {
        _force: true,
      });
      void this._load_guide_recommendation("studio-open");
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

  private _apply_app_explorer_selection_to_dom() {
    if (typeof document === "undefined") return;

    const rows = Array.from(
      document.querySelectorAll<HTMLElement>("[data-xstudio-artifact-key]"),
    );

    for (const row of rows) {
      const selected = row.dataset.xstudioArtifactKey === this._app_explorer_selected_key;
      row.classList.toggle("xstudio-app-explorer-row-selected", selected);
      row.setAttribute("aria-selected", String(selected));
      if (selected) {
        row.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
  }

  private _select_app_explorer_artifact(artifact: XStudioAppExplorerArtifact) {
    this._app_explorer_selected_key = this._app_explorer_artifact_key(artifact._type, artifact._id);
    this._apply_app_explorer_selection_to_dom();
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

  private _app_explorer_add_menu_view() {
    const open = this._data_feature_state._add_menu_open;
    const item = (
      id: string,
      label: string,
      title: string,
      handler?: (event?: Event) => void,
    ) => ({
      _type: "button",
      _id: `xstudio-app-explorer-add-menu-${id}`,
      type: "button",
      class: "xstudio-app-explorer-add-menu-item",
      title,
      _text: label,
      ...(handler ? {} : { disabled: true }),
      ...(handler
        ? {
          _on: {
            click: (event?: Event) => {
              event?.preventDefault?.();
              event?.stopPropagation?.();
              handler(event);
            },
          },
        }
        : {}),
    });

    return {
      _type: "view",
      _id: STUDIO_APP_EXPLORER_ADD_MENU_ID,
      class: [
        "xstudio-app-explorer-add-menu",
        open ? "xstudio-app-explorer-add-menu-open" : "",
      ].filter(Boolean).join(" "),
      "aria-hidden": String(!open),
      _visible: open,
      _children: [
        item("data-feature", "Data feature", "Add Data feature", () => {
          this._open_data_feature_drawer();
        }),
        item("view", "View", "Add View", () => {
          this._close_add_menu();
          this._open_add_view_dialog();
        }),
        item("flow", "Flow", "Add Flow"),
        item("entity", "Entity", "Add Entity"),
        item("module", "Module", "Add Module"),
      ],
    };
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

    if (section_id === "app") {
      children.push({
        _type: "view",
        class: "xstudio-app-explorer-add-menu-wrap",
        _children: [
          {
            _type: "button",
            _id: STUDIO_APP_EXPLORER_ADD_BUTTON_ID,
            type: "button",
            class: "xstudio-explorer-section-action xstudio-app-explorer-add-button",
            title: "Add",
            "aria-haspopup": "menu",
            "aria-expanded": String(this._data_feature_state._add_menu_open),
            _text: "+ Add",
            _on: {
              click: (event?: Event) => {
                event?.preventDefault?.();
                event?.stopPropagation?.();
                this._toggle_add_menu();
              },
            },
          },
          this._app_explorer_add_menu_view(),
        ],
      });
    }

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
    const recent = this._app_explorer_recent_artifact_keys.has(key);
    const secondary = artifact._title && artifact._title !== artifact._id ? artifact._title : "";

    return {
      _type: "view",
      _id: row_id,
      class: [
        "xstudio-object-tree-row",
        "xstudio-app-explorer-row",
        selected ? "xstudio-app-explorer-row-selected" : "",
        current ? "xstudio-app-explorer-row-current" : "",
        recent ? "xstudio-app-explorer-row-new" : "",
      ].filter(Boolean).join(" "),
      title: artifact._title || artifact._id,
      "data-xstudio-artifact-key": key,
      "data-xstudio-artifact-type": artifact._type,
      "data-xstudio-artifact-id": artifact._id,
      "aria-selected": String(selected),
      _style: {
        "--xstudio-tree-indent": `${depth * 14}px`,
      },
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
    this._apply_app_explorer_selection_to_dom();
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
      this._set_selected_object_inspector_controls(
        this._selected_object_inspector_draft,
        this._selected_object !== null,
      );
      return false;
    }

    if (!this._server_ready()) {
      this._mark_pending_server_refresh("app-explorer");
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
    this._set_selected_object_inspector_controls(
      this._selected_object_inspector_draft,
      this._selected_object !== null,
    );
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
        title: node._label,
        _text: node._label_primary || node._label,
      },
    ];

    if (node._label_secondary) {
      children.push({
        _type: "span",
        class: "xstudio-object-tree-label-secondary",
        title: node._label,
        _text: node._label_secondary,
      });
    }

    if (node._label_type) {
      children.push({
        _type: "span",
        class: "xstudio-object-tree-type-tag",
        title: node._label,
        _text: `[${node._label_type}]`,
      });
    }

    if (!this._object_tree_node_is_visible(node)) {
      children.push({
        _type: "span",
        class: "xstudio-object-tree-hidden-tag",
        title: `${node._label} is hidden`,
        _text: "Hidden",
      });
    }

    return children;
  }

  private _object_tree_content_width(nodes: XStudioObjectTreeNode[]) {
    const flat_nodes = this._flatten_object_tree_nodes(nodes);
    let width = 0;

    for (const node of flat_nodes) {
      const label = [
        node._label_primary || node._label,
        node._label_secondary,
        node._label_type ? `[${node._label_type}]` : "",
      ].filter(Boolean).join(" ");
      const label_width = Math.min(720, Math.max(160, label.length * 7));
      const indent_width = node._depth * 14;
      width = Math.max(width, indent_width + 24 + label_width + 16);
    }

    return Math.ceil(width);
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

  private _object_tree_node_can_drag(node: XStudioObjectTreeNode) {
    const meta = node._meta;
    if (!meta) return false;
    if (!meta._json_id.trim()) return false;
    if (!meta._source_view_id.trim()) return false;
    if (meta._is_xvm_ref_child) return false;
    if (this._selected_object_is_root_view(meta)) return false;

    let active_view_id = "";
    try {
      active_view_id = this._resolve_object_tree_view_id().trim();
    } catch {
      active_view_id = "";
    }
    return Boolean(active_view_id && meta._source_view_id.trim() === active_view_id);
  }

  private _object_tree_node_display_name(node: XStudioObjectTreeNode) {
    return node._label_primary.trim() || node._label.trim() || node._meta?._json_id.trim() || "object";
  }

  private _object_tree_drag_handle(node: XStudioObjectTreeNode, row_id: string, draggable: boolean) {
    const label = draggable
      ? `Move ${this._object_tree_node_display_name(node)}`
      : "Object cannot be moved";

    return {
      _type: "button",
      _id: `${row_id}-drag-handle`,
      type: "button",
      class: [
        "xstudio-object-tree-drag-handle",
        draggable ? "" : "xstudio-object-tree-drag-handle-disabled",
      ].filter(Boolean).join(" "),
      title: label,
      "aria-label": label,
      ...(draggable ? {} : { disabled: true, "aria-disabled": "true" }),
      _text: "⋮⋮",
      ...(draggable
        ? {
          _on: {
            pointerdown: (event?: PointerEvent) => {
              event?.preventDefault?.();
              event?.stopPropagation?.();
              this._start_object_tree_drag(node, row_id, event ?? null, "handle");
            },
            click: (event?: Event) => {
              event?.preventDefault?.();
              event?.stopPropagation?.();
            },
          },
        }
        : {}),
    };
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

  private _normalize_design_type_list(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
      .map(item => typeof item === "string" ? item.trim().toLowerCase() : "")
      .filter(Boolean);
  }

  private _normalize_design_insert_modes(
    skill: XpellSkill | null,
    fallback_modes: XStudioAddObjectInsertMode[] = [],
  ) {
    const raw_modes = skill?._design?._children?._insert_modes;
    const modes = this._normalize_design_type_list(raw_modes)
      .filter((mode): mode is XStudioAddObjectInsertMode =>
        mode === "inside" || mode === "before" || mode === "after",
      );
    return modes.length > 0 ? modes : fallback_modes;
  }

  private _normalize_palette_child_type(child: Record<string, any>, skill: XpellSkill) {
    const child_type = typeof child._type === "string" && child._type.trim()
      ? child._type.trim()
      : typeof skill._id === "string" && skill._id.trim()
        ? skill._id.trim()
        : "";
    return child_type.toLowerCase();
  }

  private _skill_children_accepts_type(skill: XpellSkill | null, child_type: string) {
    const accepted_types = this._normalize_design_type_list(skill?._design?._children?._accepted_types);
    if (accepted_types.length === 0) return true;

    const normalized_child_type = child_type.trim().toLowerCase();
    if (!normalized_child_type) return false;

    return accepted_types.includes("*") ||
      accepted_types.includes("xuiobject") ||
      accepted_types.includes(normalized_child_type);
  }

  private _object_tree_node_can_insert_inside(
    node: XStudioObjectTreeNode,
    child_type: string,
  ) {
    const capability = this._object_tree_child_capability(node);
    if (capability._design_children_disallowed) return false;
    if (!capability._allowed) return false;
    if (!this._skill_children_accepts_type(capability._skill, child_type)) return false;

    const fallback_modes: XStudioAddObjectInsertMode[] = capability._allowed ? ["inside"] : [];
    const modes = this._normalize_design_insert_modes(capability._skill, fallback_modes);
    return modes.includes("inside");
  }

  private _object_tree_node_can_insert_relative(
    node: XStudioObjectTreeNode,
    mode: "before" | "after",
  ) {
    if (!node._meta?._json_id.trim()) return false;
    if (this._selected_object_is_root_view(node._meta)) return false;

    const skill = node._meta._type.trim()
      ? this._resolve_selected_object_skill(node._meta._type)
      : null;
    const modes = this._normalize_design_insert_modes(skill, ["before", "after"]);
    return modes.includes(mode);
  }

  private _find_object_tree_node_by_path(source_view_id: string, path: string) {
    const normalized_source_view_id = source_view_id.trim();
    const normalized_path = path.trim() || "$";
    if (!normalized_source_view_id) return null;

    const flat_nodes = this._flatten_object_tree_nodes(this._object_tree_nodes);
    return flat_nodes.find((node) =>
      node._meta?._source_view_id.trim() === normalized_source_view_id &&
      node._meta?._path.trim() === normalized_path
    ) ?? null;
  }

  private _find_object_tree_node_by_selected_object(selected: XStudioSelectedObject) {
    const by_path = this._find_object_tree_node_by_path(
      selected._source_view_id,
      selected._path,
    );
    if (by_path) return by_path;

    const selected_id = selected._json_id.trim() || selected._id.trim();
    if (!selected_id) return null;

    const flat_nodes = this._flatten_object_tree_nodes(this._object_tree_nodes);
    return flat_nodes.find((node) =>
      node._meta?._source_view_id.trim() === selected._source_view_id.trim() &&
      (node._meta?._json_id.trim() || node._meta?._id.trim()) === selected_id &&
      node._meta?._type.trim() === selected._type.trim()
    ) ?? null;
  }

  private _active_view_root_insert_target(view_id: string) {
    const view = this._get_cached_view(view_id);
    if (!is_obj(view)) return null;

    const root_id = typeof view._id === "string" && view._id.trim()
      ? view._id.trim()
      : view_id.trim();
    if (!root_id) return null;

    const existing_root = this._find_object_tree_node_by_path(view_id, "$");
    if (existing_root) return existing_root;

    return {
      _key: "",
      _node_key: this._object_tree_node_key(view_id, "$", "$", "view", root_id),
      _parent_node_key: "",
      _label: root_id,
      _label_primary: root_id,
      _label_secondary: "",
      _label_type: typeof view._type === "string" && view._type.trim() ? view._type.trim() : "view",
      _search_text: "",
      _meta: {
        _id: root_id,
        _json_id: root_id,
        _type: typeof view._type === "string" && view._type.trim() ? view._type.trim() : "view",
        _text: typeof view._text === "string" ? view._text : "",
        _source_view_id: view_id,
        _path: "$",
        _parent_path: "$",
        _previous_sibling_id: "",
        _next_sibling_id: "",
        _is_xvm_ref_child: false,
        _json_metadata: this._safe_selected_json_metadata(view),
      },
      _object: view,
      _depth: 0,
      _children: [],
    } as XStudioObjectTreeNode;
  }

  private _resolve_add_object_root_append_params(
    child: Record<string, any>,
    child_type: string,
    app_id: string,
    env: string,
  ): XStudioAddObjectInsertionResolution {
    const view_id = this._app_explorer_current_view_id().trim();
    const root_node = this._active_view_root_insert_target(view_id);
    const root_meta = root_node?._meta;
    const target_id = root_meta?._json_id.trim() || root_meta?._id.trim() || "";

    if (!view_id || !root_node || !root_meta || !target_id) {
      return {
        _ok: false,
        _reason: "missing_root_target",
        _message: "No target view selected",
      };
    }

    if (!this._object_tree_node_can_insert_inside(root_node, child_type)) {
      return {
        _ok: false,
        _reason: "root_rejects_child_type",
        _message: "Active view cannot accept this object",
      };
    }

    return {
      _ok: true,
      _mode: "inside",
      _selected_id: "",
      _target_id: target_id,
      _params: {
        _app_id: app_id,
        _env: env,
        _view_id: view_id,
        _edit_action: "add-child",
        _target_id: target_id,
        _target_type: root_meta._type.trim() || "view",
        _child: child,
      },
    };
  }

  private _resolve_add_object_relative_params(
    selected: XStudioSelectedObject,
    child: Record<string, any>,
    child_type: string,
    app_id: string,
    env: string,
  ): XStudioAddObjectInsertionResolution {
    const selected_node = this._find_object_tree_node_by_selected_object(selected);
    const selected_meta = selected_node?._meta;
    const selected_id = selected_meta?._json_id.trim() || selected_meta?._id.trim() || "";
    const source_view_id = selected_meta?._source_view_id.trim() || selected._source_view_id.trim();

    if (!selected_node || !selected_meta || !selected_id || !source_view_id) {
      return {
        _ok: false,
        _reason: "missing_selected_target",
        _message: "Selected object cannot be used as an insertion target",
      };
    }

    if (this._object_tree_node_can_insert_inside(selected_node, child_type)) {
      return {
        _ok: true,
        _mode: "inside",
        _selected_id: selected_id,
        _target_id: selected_id,
        _params: {
          _app_id: app_id,
          _env: env,
          _view_id: source_view_id,
          _edit_action: "add-child",
          _target_id: selected_id,
          _target_type: selected_meta._type.trim() || "object",
          _child: child,
        },
      };
    }

    const parent_node = this._find_object_tree_node_by_path(
      source_view_id,
      selected_meta._parent_path.trim() || "$",
    );
    const parent_meta = parent_node?._meta;
    const parent_id = parent_meta?._json_id.trim() || parent_meta?._id.trim() || "";

    if (!parent_node || !parent_meta || !parent_id) {
      return {
        _ok: false,
        _reason: "missing_parent_target",
        _message: "Selected object parent cannot be used as an insertion target",
      };
    }

    if (!this._object_tree_node_can_insert_inside(parent_node, child_type)) {
      return {
        _ok: false,
        _reason: "parent_rejects_child_type",
        _message: "Selected object parent cannot accept this object",
      };
    }

    for (const mode of ["after", "before"] as const) {
      if (!this._object_tree_node_can_insert_relative(selected_node, mode)) continue;

      return {
        _ok: true,
        _mode: mode,
        _selected_id: selected_id,
        _target_id: parent_id,
        _params: {
          _app_id: app_id,
          _env: env,
          _view_id: source_view_id,
          _edit_action: "add-child",
          _target_id: parent_id,
          _target_type: parent_meta._type.trim() || "object",
          _child: child,
          ...(mode === "after"
            ? { _after_id: selected_id }
            : { _before_id: selected_id }),
        },
      };
    }

    return {
      _ok: false,
      _reason: "relative_insert_mode_rejected",
      _message: "Selected object does not allow this insertion position",
    };
  }

  private _resolve_add_object_insertion_params(
    selected_skill: XpellSkill,
    child: Record<string, any>,
    app_id: string,
    env: string,
    selected: XStudioSelectedObject | null = this._selected_object,
  ): XStudioAddObjectInsertionResolution {
    const child_type = this._normalize_palette_child_type(child, selected_skill);

    if (!selected) {
      return this._resolve_add_object_root_append_params(child, child_type, app_id, env);
    }

    return this._resolve_add_object_relative_params(
      selected,
      child,
      child_type,
      app_id,
      env,
    );
  }

  private _reveal_add_object_insertion_selection(
    resolution: XStudioAddObjectInsertionResolution,
  ) {
    if (!resolution._ok) return;

    const selected = this._selected_object;
    if (!selected) return;

    const selected_node = this._find_object_tree_node_by_selected_object(selected);
    if (selected_node?._node_key) {
      this._object_tree_expanded_node_keys.add(selected_node._node_key);
    }

    const parent_node = this._find_object_tree_node_by_path(
      selected._source_view_id,
      selected._parent_path.trim() || "$",
    );
    if (parent_node?._node_key) {
      this._object_tree_expanded_node_keys.add(parent_node._node_key);
    }
  }

  private _default_object_from_palette_skill(selected_skill: XpellSkill) {
    const default_object = selected_skill._design?._palette?._default_object;
    if (!is_obj(default_object)) {
      return {
        _ok: false,
        _child: null,
        _reason: "missing_default_object",
        _message: "Selected object has no default palette object",
      };
    }

    const child = _xu.clone_json(default_object) as Record<string, any>;
    if (!is_obj(child)) {
      return {
        _ok: false,
        _child: null,
        _reason: "invalid_default_object",
        _message: "Selected object default is invalid",
      };
    }

    return {
      _ok: true,
      _child: child,
      _reason: "",
      _message: "",
    };
  }

  private async _open_add_object_palette() {
    this._log("add object palette opened", {
      _selected: this._selected_object_persisted_metadata(this._selected_object),
    });

    const selected_skill = await showObjectPalette();
    if (!selected_skill) {
      this._log("add object palette cancelled", {
        _selected: this._selected_object_persisted_metadata(this._selected_object),
      });
      return false;
    }

    return this._apply_add_object_from_palette_skill(selected_skill);
  }

  private async _apply_add_object_from_palette_skill(selected_skill: XpellSkill) {
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

    this._refresh_object_tree_for_current_view();

    const default_result = this._default_object_from_palette_skill(selected_skill);
    if (!default_result._ok || !default_result._child) {
      this._write_studio_status(default_result._message);
      this._error("add object failed", {
        _reason: default_result._reason,
        _skill_id: selected_skill._id,
      });
      return false;
    }

    const child = default_result._child;
    const resolution = this._resolve_add_object_insertion_params(
      selected_skill,
      child,
      app_id,
      env,
    );

    if (!resolution._ok) {
      this._write_studio_status(resolution._message);
      this._error("add object failed", {
        _reason: resolution._reason,
        _skill_id: selected_skill._id,
        _child_type: child._type,
        _selected: this._selected_object_persisted_metadata(this._selected_object),
      });
      return false;
    }

    const params = resolution._params;
    this._write_studio_status("Adding object...");
    this._log("add object requested", {
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_type: params._target_type,
      _insert_mode: resolution._mode,
      _before_id: params._before_id,
      _after_id: params._after_id,
      _skill_id: selected_skill._id,
      _skill_type: selected_skill._type,
      _child_type: child._type,
      _child_id: typeof child._id === "string" ? child._id : "",
      _selected: this._selected_object_persisted_metadata(this._selected_object),
    });

    try {
      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._write_studio_status(this._format_apply_view_edit_failure(result));
        this._error("add object failed", {
          _structured_error: result,
        });
        return false;
      }

      await this._request_object_tree_structured_edit_refresh(params, result);
      this._reveal_add_object_insertion_selection(resolution);
      this._refresh_object_tree_for_current_view();
      this._write_studio_status("Added object");
      this._log("add object completed", {
        _insert_mode: resolution._mode,
        _new_target_id: this._extract_new_target_id(result),
        _result: result,
      });
      return true;
    } catch (err) {
      const message = `Add object failed: ${to_err(err)}`;
      this._write_studio_status(message);
      this._error("add object failed", {
        _error: to_err(err),
      });
      return false;
    }
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
      this._debug_log("object tree child capability resolved", {
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

    const resolution = this._resolve_add_object_insertion_params(
      selected_skill,
      child,
      app_id,
      env,
      meta,
    );
    if (!resolution._ok) {
      this._write_studio_status(resolution._message);
      this._error("object tree add child failed", {
        _reason: resolution._reason,
        _source_view_id: source_view_id,
        _target_id: target_id,
        _target_type: target_type,
        _skill_id: selected_skill._id,
        _child_type: child._type,
      });
      return false;
    }

    const params = resolution._params;

    this._write_studio_status("Adding child object...");
    this._log("object tree add child requested", {
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _target_type: params._target_type,
      _insert_mode: resolution._mode,
      _before_id: params._before_id,
      _after_id: params._after_id,
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

  private _reveal_moved_object_after_refresh(target_id: string) {
    const node = this._find_object_tree_node_by_object_id(target_id);
    if (node?._meta) {
      this._reveal_object_tree_node(node, {
        _rerender: false,
        _highlight: true,
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
      this._selected_object_pending_select_id = target_id;
      this._refresh_object_tree_for_current_view();
      this._reveal_moved_object_after_refresh(target_id);
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
    const content_width = this._object_tree_content_width(nodes);

    this._debug_log("object tree render", {
      _filtered_nodes: filtered_count,
      _search: search,
      _render_target: renderTarget._id ?? renderTarget.dom?.id ?? "",
    });

    if (nodes.length === 0) {
      renderTarget.update?.({
        _style: {
          "--xstudio-object-tree-content-width": "100%",
        },
        _children: [
          {
            _type: "label",
            _id: `xstudio-object-tree-empty-${seq}`,
            class: "xstudio-dock-placeholder",
            _text: search_active ? "No matching objects." : "No objects found.",
          },
        ],
      });
      this._debug_log("object tree rendered", {
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
      const can_add_child = node._meta ? this._object_tree_node_can_add_child(node) : false;
      const can_drag = node._meta ? this._object_tree_node_can_drag(node) : false;

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
          can_drag ? "xstudio-object-tree-row-draggable" : "xstudio-object-tree-row-not-draggable",
          node._meta._is_xvm_ref_child ? "xstudio-object-tree-row-ref" : "",
          this._object_tree_node_is_visible(node) ? "" : "xstudio-object-tree-row-hidden",
          can_add_child ? "xstudio-object-tree-row-actions-wide" : "",
          selected ? STUDIO_SELECTED_OBJECT_ROW_CLASS : "",
        ].filter(Boolean).join(" "),
        title: node._label,
        "data-xstudio-object-tree-row": "true",
        "data-xstudio-object-tree-row-id": row_id,
        _style: {
          "--xstudio-tree-indent": `${node._depth * 14}px`,
        },
        _children: [
          this._object_tree_chevron_button(node, row_id, expanded, search_active),
          this._object_tree_drag_handle(node, row_id, can_drag),
          {
            _type: "button",
            _id: `${row_id}-label`,
            type: "button",
            class: "xstudio-object-tree-label",
            title: node._label,
            _children: this._object_tree_label_children(node),
            _on: {
              pointerdown: (event?: PointerEvent) => {
                if (!event || !can_drag) return;
                this._start_object_tree_drag(node, row_id, event, "row");
              },
              click: (event?: Event) => {
                event?.preventDefault?.();
                event?.stopPropagation?.();
                if (this._object_tree_drag_suppress_click) {
                  this._clear_object_tree_click_suppression_handler();
                  return;
                }
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
    renderTarget.update?.({
      _style: {
        "--xstudio-object-tree-content-width": `${content_width}px`,
      },
      _children: children,
    });
    this._debug_log("object tree rendered", {
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
      if (key === "_on") {
        return;
      }

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

  private _selected_object_skill_supports_interactions(skill: XpellSkill | null) {
    if (!skill) return false;

    if (is_obj(skill._fields) && Object.prototype.hasOwnProperty.call(skill._fields, "_on")) {
      return true;
    }

    const fields = skill._design?._inspector?._fields;
    return Array.isArray(fields) &&
      fields.some(field => is_obj(field) && field._key === "_on");
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
      : this._selected_object_skill_supports_interactions(skill)
        ? [
          "properties",
          "interactions",
          "raw_json",
          "danger",
        ] as XStudioSelectedObjectInspectorSectionId[]
        : [...STUDIO_SELECTED_OBJECT_FALLBACK_INSPECTOR_SECTIONS];

    this._debug_log("inspector sections resolved", {
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

  private _read_xvm_navigate_target(handler: unknown) {
    if (!is_obj(handler)) {
      return {
        _view_id: "",
        _uses_legacy_view_id: false,
      };
    }

    const module_name = typeof handler._module === "string" ? handler._module.trim() : "";
    const op = typeof handler._op === "string" ? handler._op.trim() : "";
    if (module_name !== "xvm" || op !== "navigate") {
      return {
        _view_id: "",
        _uses_legacy_view_id: false,
      };
    }

    const params = is_obj(handler._params) ? handler._params : {};
    const to =
      typeof params._to === "string" && params._to.trim()
        ? params._to.trim()
        : "";
    const legacy_view_id =
      typeof params._view_id === "string" && params._view_id.trim()
        ? params._view_id.trim()
        : "";

    return {
      _view_id: to || legacy_view_id,
      _uses_legacy_view_id: !to && Boolean(legacy_view_id),
    };
  }

  private _safe_interaction_json(value: unknown) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  }

  private _resolve_selected_object_click_interaction(
    obj: Record<string, any> | null,
  ): XStudioSelectedObjectClickInteractionDraft {
    if (!obj || !is_obj(obj._on) || !Object.prototype.hasOwnProperty.call(obj._on, "click")) {
      const draft = empty_selected_object_click_interaction_draft();
      this._log("interaction loaded", {
        _trigger: "click",
        _kind: draft._kind,
        _view_id: "",
      });
      return draft;
    }

    const click_handler = obj._on.click;
    const navigate_target = this._read_xvm_navigate_target(click_handler);
    const draft: XStudioSelectedObjectClickInteractionDraft = navigate_target._view_id
      ? {
        _kind: "navigate",
        _view_id: navigate_target._view_id,
        _custom_json: "",
        _uses_legacy_view_id: navigate_target._uses_legacy_view_id,
      }
      : {
        _kind: "custom",
        _view_id: "",
        _custom_json: this._safe_interaction_json(click_handler),
        _uses_legacy_view_id: false,
      };

    this._log("interaction loaded", {
      _trigger: "click",
      _kind: draft._kind,
      _view_id: draft._view_id,
    });

    return draft;
  }

  private _selected_object_interaction_view_artifacts() {
    return this._app_explorer_artifacts.views ?? [];
  }

  private _selected_object_interaction_view_options(selected_view_id: string) {
    const selected = selected_view_id.trim();
    const views = this._selected_object_interaction_view_artifacts();

    return [
      {
        label: views.length > 0 ? "Select view" : "No views",
        value: "",
        disabled: true,
        selected: selected.length === 0,
      },
      ...views.map(view => ({
        label: view._title && view._title !== view._id
          ? `${view._id} - ${view._title}`
          : view._id,
        value: view._id,
        selected: view._id === selected,
      })),
    ];
  }

  private _xvm_navigate_click_handler(view_id: string) {
    const target = view_id.trim();
    return {
      _module: "xvm",
      _op: "navigate",
      _params: {
        _to: target,
      },
    };
  }

  private _selected_object_click_interaction_changed() {
    if (this._selected_object_click_interaction_original._kind === "custom") return false;
    if (this._selected_object_click_interaction_draft._kind === "custom") return false;
    if (
      this._selected_object_click_interaction_original._kind === "navigate" &&
      this._selected_object_click_interaction_original._uses_legacy_view_id === true
    ) {
      return true;
    }

    return (
      this._selected_object_click_interaction_original._kind !==
        this._selected_object_click_interaction_draft._kind ||
      this._selected_object_click_interaction_original._view_id.trim() !==
        this._selected_object_click_interaction_draft._view_id.trim()
    );
  }

  private _selected_object_interaction_actions() {
    return {
      _type: "view",
      class: "xstudio-selected-object-interaction-actions",
      _children: [
        {
          _id: STUDIO_SELECTED_OBJECT_INTERACTION_SAVE_ID,
          _type: "button",
          type: "button",
          class: "xstudio-selected-object-editor-button xstudio-selected-object-save-button",
          _text: "Save",
          disabled: true,
          _on: {
            click: {
              _module: "xem",
              _op: "fire",
              _params: {
                event: "studio:selected-object:save-fields",
              },
            },
          },
        },
        {
          _id: STUDIO_SELECTED_OBJECT_INTERACTION_CANCEL_ID,
          _type: "button",
          type: "button",
          class: "xstudio-selected-object-editor-button xstudio-selected-object-cancel-button",
          _text: "Cancel",
          disabled: true,
          _on: {
            click: {
              _module: "xem",
              _op: "fire",
              _params: {
                event: "studio:selected-object:cancel-fields",
              },
            },
          },
        },
      ],
    };
  }

  private _render_selected_object_interactions(has_selected_object: boolean) {
    const body = XUI.getObject(STUDIO_SELECTED_OBJECT_INTERACTIONS_BODY_ID) as any;
    if (!body) return;

    const draft = this._selected_object_click_interaction_draft;
    const views = this._selected_object_interaction_view_artifacts();
    const children: Record<string, any>[] = [];

    if (!has_selected_object) {
      children.push({
        _type: "label",
        class: "xstudio-selected-object-editor-empty",
        _text: "Select an object",
      });
    } else if (draft._kind === "custom") {
      children.push(
        {
          _type: "view",
          class: "xstudio-selected-object-interaction-summary",
          _children: [
            {
              _type: "label",
              class: "xstudio-selected-object-section-title",
              _text: "Custom interaction",
            },
            {
              _type: "textarea",
              class: "xstudio-selected-object-editor-input xstudio-selected-object-editor-input-json xstudio-selected-object-interaction-custom-json",
              readonly: true,
              disabled: true,
              _text: draft._custom_json,
            },
          ],
        },
      );
    } else if (draft._kind === "navigate") {
      children.push(
        {
          _type: "view",
          class: "xstudio-selected-object-interaction-grid",
          _children: [
            {
              _type: "label",
              class: "xstudio-selected-object-editor-label",
              _text: "Trigger",
            },
            {
              _type: "label",
              class: "xstudio-selected-object-interaction-value",
              _text: "Click",
            },
            {
              _type: "label",
              class: "xstudio-selected-object-editor-label",
              _text: "Action",
            },
            {
              _type: "label",
              class: "xstudio-selected-object-interaction-value",
              _text: "Navigate",
            },
            {
              _type: "label",
              class: "xstudio-selected-object-editor-label",
              _text: "View",
            },
            {
              _id: STUDIO_SELECTED_OBJECT_INTERACTION_VIEW_SELECT_ID,
              _type: "select",
              class: "xstudio-selected-object-editor-input xstudio-selected-object-editor-input-select xstudio-selected-object-interaction-view-select",
              _options: this._selected_object_interaction_view_options(draft._view_id),
              disabled: views.length === 0,
              _on: {
                change: {
                  _module: "xem",
                  _op: "fire",
                  _params: {
                    event: "studio:selected-object:interaction-view-changed",
                  },
                },
              },
            },
          ],
        },
        {
          _id: STUDIO_SELECTED_OBJECT_INTERACTION_REMOVE_CLICK_ID,
          _type: "button",
          type: "button",
          class: "xstudio-selected-object-editor-button xstudio-selected-object-interaction-remove-button",
          _text: "Remove Click Interaction",
          _on: {
            click: {
              _module: "xem",
              _op: "fire",
              _params: {
                event: "studio:selected-object:interaction-remove-click",
              },
            },
          },
        },
        this._selected_object_interaction_actions(),
      );
    } else {
      children.push(
        {
          _type: "label",
          class: "xstudio-selected-object-editor-empty",
          _text: "No interactions",
        },
        {
          _id: STUDIO_SELECTED_OBJECT_INTERACTION_ADD_CLICK_ID,
          _type: "button",
          type: "button",
          class: "xstudio-selected-object-editor-button xstudio-selected-object-interaction-add-button",
          _text: views.length > 0 ? "Add Click Navigate" : "No views available",
          disabled: views.length === 0,
          _on: {
            click: {
              _module: "xem",
              _op: "fire",
              _params: {
                event: "studio:selected-object:interaction-add-click",
              },
            },
          },
        },
        this._selected_object_interaction_actions(),
      );
    }

    body.update?.({ _children: children });

    if (draft._kind === "navigate") {
      this._set_studio_control_value(STUDIO_SELECTED_OBJECT_INTERACTION_VIEW_SELECT_ID, draft._view_id);
    }

    this._set_selected_object_interaction_controls(has_selected_object);
  }

  private _set_selected_object_interaction_controls(has_selected_object: boolean) {
    const has_views = this._selected_object_interaction_view_artifacts().length > 0;
    const draft = this._selected_object_click_interaction_draft;

    this._set_studio_control_disabled(
      STUDIO_SELECTED_OBJECT_INTERACTION_ADD_CLICK_ID,
      !has_selected_object || !has_views || draft._kind !== "none",
    );
    this._set_studio_control_disabled(
      STUDIO_SELECTED_OBJECT_INTERACTION_REMOVE_CLICK_ID,
      !has_selected_object || draft._kind !== "navigate",
    );
    this._set_studio_control_disabled(
      STUDIO_SELECTED_OBJECT_INTERACTION_VIEW_SELECT_ID,
      !has_selected_object || !has_views || draft._kind !== "navigate",
    );
  }

  private _mark_selected_object_interaction_changed(
    action: "add" | "remove" | "view",
  ) {
    this._log("interaction changed", {
      _trigger: "click",
      _action: action,
      _kind: this._selected_object_click_interaction_draft._kind,
      _view_id: this._selected_object_click_interaction_draft._view_id,
    });
    this._set_selected_object_inspector_controls(
      this._selected_object_inspector_draft,
      this._selected_object !== null,
    );
  }

  private _add_selected_object_click_interaction() {
    if (!this._selected_object) {
      this._write_studio_status("Select an object first");
      return;
    }

    const first_view = this._selected_object_interaction_view_artifacts()[0]?._id ?? "";
    if (!first_view) {
      this._write_studio_status("No views available");
      return;
    }

    this._selected_object_click_interaction_draft = {
      _kind: "navigate",
      _view_id: first_view,
      _custom_json: "",
      _uses_legacy_view_id: false,
    };
    this._mark_selected_object_interaction_changed("add");
  }

  private _remove_selected_object_click_interaction() {
    if (this._selected_object_click_interaction_draft._kind !== "navigate") return;

    this._log("interaction remove requested", {
      _trigger: "click",
      _kind: this._selected_object_click_interaction_draft._kind,
      _view_id: this._selected_object_click_interaction_draft._view_id,
    });
    this._selected_object_click_interaction_draft = empty_selected_object_click_interaction_draft();
    this._mark_selected_object_interaction_changed("remove");
  }

  private _handle_selected_object_interaction_view_changed() {
    if (this._selected_object_click_interaction_draft._kind !== "navigate") return;

    const view_id = this._read_studio_control_value(STUDIO_SELECTED_OBJECT_INTERACTION_VIEW_SELECT_ID).trim();
    this._selected_object_click_interaction_draft = {
      ...this._selected_object_click_interaction_draft,
      _view_id: view_id,
      _uses_legacy_view_id: false,
    };
    this._mark_selected_object_interaction_changed("view");
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
    this._render_selected_object_interactions(
      has_selected_object &&
      this._selected_object_inspector_section_supported("interactions"),
    );

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
      (
        (
          this._selected_object_inspector_section_supported("properties") &&
          this._selected_object_inspector_fields.some(field => field._readonly !== true)
        ) ||
        (
          this._selected_object_inspector_section_supported("interactions") &&
          this._selected_object_click_interaction_changed()
        )
      );

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

  private _selected_object_sibling_context_from_metadata(
    selected: XStudioSelectedObject,
  ): XStudioSelectedObjectSiblingContext | null {
    const path = selected._path.trim();
    if (path === "$") {
      return {
        _is_root: true,
        _previous_sibling_id: "",
        _next_sibling_id: "",
      };
    }

    const indices = this._parse_children_path_indices(path);
    if (!indices || indices.length === 0) return null;

    return {
      _is_root: false,
      _previous_sibling_id: String(selected._previous_sibling_id ?? "").trim(),
      _next_sibling_id: String(selected._next_sibling_id ?? "").trim(),
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
    if (!is_obj(view)) {
      return this._selected_object_sibling_context_from_metadata(selected);
    }

    return this._find_selected_object_sibling_context_by_path(view, selected) ??
      this._selected_object_sibling_context_from_metadata(selected);
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
    this._selected_object_click_interaction_original =
      this._resolve_selected_object_click_interaction(obj);
    this._selected_object_click_interaction_draft = {
      ...this._selected_object_click_interaction_original,
    };
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
    this._selected_object_click_interaction_original = empty_selected_object_click_interaction_draft();
    this._selected_object_click_interaction_draft = empty_selected_object_click_interaction_draft();
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

    // this._log("inspector field changed", {
    //   _field: key,
    //   _input: input,
    // });
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

  private _apply_view_edit_failure_reason(value: any): string {
    if (value instanceof Error) {
      const parsed = this._parse_error_object_string(value.message);
      return parsed ? this._apply_view_edit_failure_reason(parsed) : "";
    }
    if (typeof value === "string") {
      const parsed = this._parse_error_object_string(value);
      return parsed ? this._apply_view_edit_failure_reason(parsed) : "";
    }
    if (!is_obj(value)) return "";

    const direct_reason =
      typeof value._reason === "string" && value._reason.trim()
        ? value._reason.trim()
        : typeof value.reason === "string" && value.reason.trim()
          ? value.reason.trim()
          : "";
    if (direct_reason) return direct_reason;

    const nested_candidates = [
      value._details,
      value.details,
      value._error,
      value.error,
      value._result,
      value.result,
      value._payload,
      value.payload,
    ].filter((candidate) => candidate !== value);
    for (const candidate of nested_candidates) {
      const reason = this._apply_view_edit_failure_reason(candidate);
      if (reason) return reason;
    }

    return "";
  }

  private _apply_view_edit_move_resolution_context(command?: Record<string, any>) {
    const params = is_obj(command?._params) ? command._params : command;
    if (!is_obj(params)) return "";
    if (params._edit_action !== "move-object" && params.edit_action !== "move-object") return "";

    const source = this._intent_action_target_display_title(params);
    const destination =
      this._intent_action_move_destination_title(params) ||
      this._intent_action_move_anchor_title(params);
    if (source && destination) return `source ${source}, destination ${destination}`;
    if (source) return `source ${source}`;
    if (destination) return `destination ${destination}`;
    return "";
  }

  private _format_apply_view_edit_failure(result: any, command?: Record<string, any>) {
    const server_message = this._format_server_failure(result, "");
    const resolution_reason =
      this._apply_view_edit_failure_reason(result) ||
      this._apply_view_edit_move_resolution_context(command);
    if (server_message) {
      if (resolution_reason && !server_message.includes(resolution_reason)) {
        return `Apply failed: ${server_message} (${resolution_reason})`;
      }
      return `Apply failed: ${server_message}`;
    }

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

  private _build_selected_object_interaction_edit_params(
    selected: XStudioSelectedObject,
    app_id: string,
    env: string,
  ) {
    if (!this._selected_object_inspector_section_supported("interactions")) {
      return {
        _ok: true,
        _changed: false,
        _error: "",
        _params: null,
      };
    }

    if (this._selected_object_click_interaction_original._kind === "custom") {
      return {
        _ok: true,
        _changed: false,
        _error: "",
        _params: null,
      };
    }

    if (this._selected_object_click_interaction_draft._kind === "custom") {
      return {
        _ok: true,
        _changed: false,
        _error: "",
        _params: null,
      };
    }

    if (!this._selected_object_click_interaction_changed()) {
      return {
        _ok: true,
        _changed: false,
        _error: "",
        _params: null,
      };
    }

    if (
      this._selected_object_click_interaction_draft._kind === "navigate" &&
      !this._selected_object_click_interaction_draft._view_id.trim()
    ) {
      return {
        _ok: false,
        _changed: true,
        _error: "Select a destination view",
        _params: null,
      };
    }

    const view_id = selected._source_view_id.trim();
    const id = selected._json_id.trim();
    const type = selected._type.trim() || "object";

    return {
      _ok: true,
      _changed: true,
      _error: "",
      _params: {
        _app_id: app_id,
        _env: env,
        _view_id: view_id,
        _edit_action: "set-interaction",
        _target_id: id,
        _target_type: type,
        _interaction_scope: "_on",
        _trigger: "click",
        _handler: this._selected_object_click_interaction_draft._kind === "navigate"
          ? this._xvm_navigate_click_handler(this._selected_object_click_interaction_draft._view_id)
          : null,
      } as XStudioSelectedObjectApplyViewEditParams,
    };
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
    const is_interaction_edit = params._edit_action === "set-interaction";
    this._log("selected object inspector apply request", {
      _field: field,
      _source_view_id: params._view_id,
      _target_id: params._target_id,
      _edit_action: params._edit_action,
      _path: selected._path,
      _parent_path: selected._parent_path,
    });

    if (is_interaction_edit) {
      this._log("interaction set-interaction requested", {
        _source_view_id: params._view_id,
        _target_id: params._target_id,
        _target_type: params._target_type,
        _interaction_scope: params._interaction_scope,
        _trigger: params._trigger,
        _handler_removed: params._handler === null,
        ...(is_obj(params._handler)
          ? {
            _handler_module: params._handler._module,
            _handler_op: params._handler._op,
          }
          : {}),
      });
    }

    try {
      const result = await this._send_xvibe_command("apply-view-edit", params);
      if (!is_obj(result) || result._ok !== true) {
        this._write_studio_status(this._format_apply_view_edit_failure(result));
        this._error("selected object inspector apply failed", {
          _field: field,
          _structured_error: result,
        });
        if (is_interaction_edit) {
          this._error("interaction save failed", {
            _target_id: params._target_id,
            _trigger: params._trigger,
            _structured_error: result,
          });
        }
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
      if (is_interaction_edit) {
        this._error("interaction save failed", {
          _target_id: params._target_id,
          _trigger: params._trigger,
          _error: to_err(err),
        });
      }
      return false;
    }
  }

  private _apply_saved_selected_object_interaction_to_local_data(
    params: XStudioSelectedObjectApplyViewEditParams,
  ) {
    if (!this._selected_object_data || params._edit_action !== "set-interaction") return;

    const scope = params._interaction_scope === "_once" ? "_once" : "_on";
    const trigger = typeof params._trigger === "string" ? params._trigger.trim() : "";
    if (!trigger) return;

    const current_scope = is_obj(this._selected_object_data[scope])
      ? this._selected_object_data[scope] as Record<string, any>
      : {};

    if (params._handler === null) {
      if (is_obj(this._selected_object_data[scope])) {
        delete current_scope[trigger];
        if (Object.keys(current_scope).length === 0) {
          delete this._selected_object_data[scope];
        }
      }
      return;
    }

    if (!is_obj(params._handler)) return;

    current_scope[trigger] = _xu.clone_json(params._handler);
    this._selected_object_data[scope] = current_scope;
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
      _interaction?: boolean;
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

    const interaction_edit = this._build_selected_object_interaction_edit_params(
      this._selected_object,
      app_id,
      env,
    );

    if (!interaction_edit._ok) {
      this._selected_object_apply_error(interaction_edit._error, "fields");
      return;
    }

    if (interaction_edit._changed && interaction_edit._params) {
      edits.push({
        _field: "_on.click",
        _params: interaction_edit._params,
        _interaction: true,
      });
    }

    if (edits.length === 0) {
      this._write_studio_status("No selected object changes to save");
      return;
    }

    this._write_studio_status(
      edits.length === 1
        ? "Saving selected object edit..."
        : `Saving ${edits.length} selected object edits...`,
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
        } else if (edit._interaction) {
          this._apply_saved_selected_object_interaction_to_local_data(edit._params);
        }
      }
      this._selected_object_json = this._safe_selected_json_preview(this._selected_object_data);
    }

    this._selected_object_inspector_draft = next_draft;
    this._selected_object_click_interaction_original = {
      ...this._selected_object_click_interaction_draft,
    };
    this._write_selected_object_inspector_draft(
      this._selected_object_inspector_draft,
      "xstudio-selected-object-inspector",
    );
    this._set_selected_object_inspector_controls(this._selected_object_inspector_draft, true);

    if (edits.some(edit => edit._interaction)) {
      this._log("interaction saved", {
        _trigger: "click",
        _kind: this._selected_object_click_interaction_draft._kind,
        _view_id: this._selected_object_click_interaction_draft._view_id,
      });
    }

    this._write_studio_status(
      edits.length === 1
        ? "Saved selected object edit"
        : `Saved ${edits.length} selected object edits`,
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
    this._selected_object_click_interaction_draft = {
      ...this._selected_object_click_interaction_original,
    };
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

      await this._request_object_tree_structured_edit_refresh(params, result);
      this._selected_object_pending_select_id = target_id;
      this._refresh_object_tree_for_current_view();
      this._reveal_moved_object_after_refresh(target_id);
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
    this._reveal_object_tree_node(node, {
      _rerender: false,
      _highlight: true,
      _row_id: row_id,
    });
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
    this._debug_log("object tree cache", { _total_nodes: flat_nodes.length });

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

  private _debug_enabled() {
    if (typeof window === "undefined") return false;
    const global_debug = (window as any).__XSTUDIO_DEBUG === true;
    let stored_debug = false;
    try {
      stored_debug = window.localStorage?.getItem("xstudio:debug") === "true";
    } catch {
      stored_debug = false;
    }
    return global_debug || stored_debug;
  }

  private _debug_log(...args: any[]) {
    if (!this._debug_enabled()) return;
    _xlog.debug(LOG, ...args);
  }

  private _error(...args: any[]) {
    _xlog.error(LOG, ...args);
  }

  private _vibe_log(...args: any[]) {
    _xlog.log(VIBE_LOG, ...args);
  }

  private async _send_command(
    _module: string,
    _op: string,
    _params: Record<string, any>,
    options: XStudioSendCommandOptions = {},
  ) {
    const req_id = ++this._cmd_seq;
    this._debug_log(`-> ${_module}.${_op}`, {
      _req_id: req_id,
      _params,
      ...(typeof options._timeout_ms === "number" ? { _timeout_ms: options._timeout_ms } : {}),
    });
    if ((_module === "server-xvm" || _module === "xvibe" || _module === "planning") && !this._server_ready()) {
      throw { _code: "E_XSTUDIO_SERVER_NOT_READY", _module, _op };
    }
    try {
      const raw = await this._client().sendXcmd({ _module, _op, _params }, options._timeout_ms);
      this._debug_log(`<- ${_module}.${_op} raw`, { _req_id: req_id, _raw: raw });
      const result = to_result(raw);
      this._debug_log(`<- ${_module}.${_op} result`, { _req_id: req_id, _result: result });
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

  private _send_planning_command(_op: string, _params: Record<string, any>) {
    return this._send_command("planning", _op, _params);
  }

  private _send_xvibe_command(
    _op: string,
    _params: Record<string, any>,
    options: XStudioSendCommandOptions = {},
  ) {
    return this._send_command("xvibe", _op, _params, options);
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
      this._retain_active_guide_recommendation_after_failure(
        "generation-request-failed",
        err,
      );
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
    void this._complete_active_guide_recommendation("generation-update-completed");
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
    this._retain_active_guide_recommendation_after_failure(
      "generation-failed",
      error_payload,
    );
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
      void this._complete_active_guide_recommendation("generation-stage-completed");
      return;
    }

    if (next_state === "failed") {
      this.clear_active_generation();
      this._set_generation_state("failed", status, evt_payload);
      this._retain_active_guide_recommendation_after_failure(
        "generation-stage-failed",
        evt_payload,
      );
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
    void this._complete_active_guide_recommendation("generation-completed");
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
      this._cancel_object_picker();
      this._cancel_arrange_mode();
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

  private async _send_conversation_message(
    raw_value?: any,
    options: XStudioAppendConversationMessageOptions = {},
  ) {
    const text = this._local_conversation_text(
      raw_value === undefined ? this._read_conversation_input_value() : raw_value,
    );
    this._set_conversation_send_enabled(text.length > 0);
    if (!text || this._conversation_analyzing) return;

    this._set_conversation_input_value("");
    this._set_conversation_analyzing(true);
    try {
      return await this._append_conversation_message(text, options);
    } finally {
      this._set_conversation_analyzing(false);
    }
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
