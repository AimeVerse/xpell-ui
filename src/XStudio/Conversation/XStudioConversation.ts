import { XUtils as _xu } from "@xpell/core";

import { is_obj } from "../XStudioTypes";
import {
  CAPABILITY_GUIDANCE_ARTIFACT_TYPE,
  create_xstudio_artifact_request_card,
  MUTATION_PLAN_ARTIFACT_TYPE,
  PROJECT_PLAN_ARTIFACT_TYPE,
  xstudio_artifact_request_article,
  xstudio_artifact_request_success_message,
  type XStudioArtifactRequestView,
  type XStudioMutationPlanExecutionState,
} from "./XStudioArtifactCards";

export type XStudioConversationMessage = {
  _role: "user" | "assistant" | "system" | "tool";
  _text: string;
  _created_at: string;
  _id?: string;
  _intent?: Record<string, any>;
  _metadata?: Record<string, any>;
  _pending_status?: "pending" | "analyzing" | "failed";
  _error?: string;
};

export type XStudioIntentActionView = {
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
  _executable?: boolean;
  _has_execution_payload: boolean;
  _execution_payload_error: string;
  _execution_payload: Record<string, any> | null;
  _requires_approval?: boolean;
  _params: Record<string, any> | null;
  _result?: any;
  _error: string;
  _recommendation_kind?: string;
  _recommendation_badge?: string;
  _recommendation_order?: string;
  _recommendation_dependency?: string;
  _recommendation_entity_name?: string;
  _recommendation_expected_artifacts?: string[];
  _recommendation_button_label?: string;
  _recommendation_debug?: any;
  _recommended?: boolean;
};

export type XStudioIntentActionExecuteState = {
  _can_execute: boolean;
  _disabled_reason: string;
};

export type XStudioIntentActionRenderView = XStudioIntentActionView & {
  _execute_state: XStudioIntentActionExecuteState;
};

export type XStudioConversationRenderMessage = XStudioConversationMessage & {
  _actions: XStudioIntentActionRenderView[];
  _artifact_request?: XStudioArtifactRequestView | null;
  _artifact_status?: string;
  _artifact_error?: any;
  _artifact_success?: string;
  _artifact_result?: any;
  _planning_question_selected_answers?: Record<string, string[]>;
  _project_plan_expanded?: boolean;
  _mutation_plan_collapsed?: boolean;
  _mutation_plan_execution_state?: XStudioMutationPlanExecutionState | null;
};

export type XStudioPlanningGreetingQuickStart = {
  _id: string;
  _label: string;
  _prompt: string;
  _send: boolean;
};

export type XStudioPlanningGreetingView = {
  _quick_starts: XStudioPlanningGreetingQuickStart[];
};

const CONVERSATION_ACTION_STATUS_RUNNING = "running";
const CONVERSATION_ACTION_STATUS_DONE = "done";
const CONVERSATION_ACTION_STATUS_FAILED = "failed";

function conversation_intent_value(intent: Record<string, any>, key: string) {
  return intent[`_${key}`] ?? intent[key];
}

function conversation_project_plan_request(intent: Record<string, any>) {
  return intent._artifact_request ??
    intent.artifact_request ??
    intent._planning_session ??
    intent.planning_session ??
    intent._project_plan ??
    intent.project_plan;
}

function conversation_is_xvibe_planning_message(message: XStudioConversationRenderMessage) {
  if (message._artifact_request?._artifact_type === PROJECT_PLAN_ARTIFACT_TYPE) return true;
  if (!is_obj(message._intent)) return false;

  const intent = message._intent;
  const artifact_type = String(conversation_intent_value(intent, "artifact_type") ?? "").trim();
  const request = conversation_project_plan_request(intent);
  const request_type = is_obj(request)
    ? String(request._type ?? request.type ?? request._artifact_type ?? request.artifact_type ?? "").trim()
    : "";

  return artifact_type === PROJECT_PLAN_ARTIFACT_TYPE ||
    request_type === PROJECT_PLAN_ARTIFACT_TYPE ||
    request_type === "planning-session" ||
    request_type === "planning_session" ||
    is_obj(intent._planning_session ?? intent.planning_session ?? intent._project_plan ?? intent.project_plan) ||
    (is_obj(request) && is_obj(request._current_question ?? request.current_question));
}

function conversation_is_xvibe_artifact_message(message: XStudioConversationRenderMessage) {
  if (conversation_is_xvibe_planning_message(message)) return true;
  const artifact_type = message._artifact_request?._artifact_type ??
    (is_obj(message._intent)
      ? String(conversation_intent_value(message._intent, "artifact_type") ?? "").trim()
      : "");

  return artifact_type === "execution-graph" ||
    artifact_type === CAPABILITY_GUIDANCE_ARTIFACT_TYPE ||
    artifact_type === MUTATION_PLAN_ARTIFACT_TYPE;
}

function conversation_intent_summary(message: XStudioConversationMessage) {
  if (message._pending_status === "analyzing" && !message._text) return "Analyzing...";
  if (message._pending_status === "failed" && !message._text) return message._error || "Message failed.";
  if (!is_obj(message._intent)) return message._text;
  if (message._text) return message._text;

  const intent = message._intent;
  const message_type = String(conversation_intent_value(intent, "message_type") ?? "").trim();
  const execution_level = String(conversation_intent_value(intent, "execution_level") ?? "").trim();
  const artifact_type = String(conversation_intent_value(intent, "artifact_type") ?? "").trim();
  const request = conversation_project_plan_request(intent) ??
    intent._capability_guidance ??
    intent.capability_guidance ??
    intent._mutation_plan ??
    intent.mutation_plan;
  const request_type = is_obj(request)
    ? String(request._type ?? request.type ?? "").trim()
    : "";
  const has_project_plan_response = is_obj(
    intent._planning_session ??
    intent.planning_session ??
    intent._project_plan ??
    intent.project_plan,
  );
  const has_planning_question = is_obj(request)
    ? is_obj(request._current_question ?? request.current_question)
    : false;
  const operation = is_obj(request)
    ? String(request._operation ?? request.operation ?? "").trim()
    : "";
  if (
    (
      artifact_type === PROJECT_PLAN_ARTIFACT_TYPE ||
      request_type === PROJECT_PLAN_ARTIFACT_TYPE ||
      request_type === "planning-session" ||
      request_type === "planning_session" ||
      has_project_plan_response ||
      has_planning_question
    ) &&
    (message_type === "plan" || message_type === "generate") &&
    execution_level === "artifact"
  ) {
    return has_planning_question ? "I have a planning question." : "I drafted a project plan.";
  }

  if (
    artifact_type === CAPABILITY_GUIDANCE_ARTIFACT_TYPE ||
    request_type === CAPABILITY_GUIDANCE_ARTIFACT_TYPE
  ) {
    return "Here are the supported Visual Xpell capabilities.";
  }

  if (
    artifact_type === MUTATION_PLAN_ARTIFACT_TYPE ||
    request_type === MUTATION_PLAN_ARTIFACT_TYPE
  ) {
    const title = is_obj(request)
      ? String(request._title ?? request.title ?? "").trim()
      : "";
    const estimated = is_obj(request)
      ? Number(request._estimated_mutations ?? request.estimated_mutations ?? request._mutation_count ?? request.mutation_count)
      : NaN;
    const count = Number.isFinite(estimated) && estimated > 0
      ? `${estimated} planned change${estimated === 1 ? "" : "s"}`
      : "";
    return [
      `Mutation plan created${title ? `: ${title}` : ""}`,
      count,
    ].filter(Boolean).join("\n");
  }

  if (
    artifact_type === "execution-graph" &&
    is_obj(request) &&
    String(request._status ?? request.status ?? "").trim() === "foundation-exists"
  ) {
    const existing = Array.isArray(request._existing_entities)
      ? request._existing_entities
      : [];
    return existing.length > 0
      ? "CRUD foundation already exists."
      : "No additional CRUD foundation is required.";
  }

  if (
    message_type === "generate" &&
    execution_level === "artifact" &&
    artifact_type &&
    operation === "create"
  ) {
    return `I can create ${xstudio_artifact_request_article(artifact_type)} ${artifact_type}.`;
  }

  return "Intent analyzed.";
}

function conversation_debug_value(value: any) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return _xu.safe_compact_inline_json(value, 4000) || String(value);
}

function conversation_debug_json(value: any) {
  if (value === undefined || value === null || value === "") return "-";
  try {
    return _xu.compact_json(value, 6000);
  } catch {
    return _xu.safe_compact_inline_json(value, 6000) || String(value);
  }
}

function conversation_raw_action_params(intent: Record<string, any>) {
  const raw_actions = intent._actions ?? intent.actions;
  if (!Array.isArray(raw_actions)) return null;

  const params = raw_actions
    .map((raw_action) => is_obj(raw_action) && is_obj(raw_action._params) ? raw_action._params : null)
    .filter((raw_params): raw_params is Record<string, any> => raw_params !== null);

  if (params.length === 0) return null;
  return params.length === 1 ? params[0] : params;
}

function conversation_debug_row(label: string, value: any, block = false) {
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
        _text: block ? conversation_debug_json(value) : conversation_debug_value(value),
      },
    ],
  };
}

function conversation_intent_debug_view(message: XStudioConversationMessage, index: number) {
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
          conversation_debug_row("processor", conversation_intent_value(intent, "processor")),
          conversation_debug_row("processor_chain", conversation_intent_value(intent, "processor_chain")),
          conversation_debug_row("message_type", conversation_intent_value(intent, "message_type")),
          conversation_debug_row("execution_level", conversation_intent_value(intent, "execution_level")),
          conversation_debug_row("confidence", conversation_intent_value(intent, "confidence")),
          conversation_debug_row("raw intent", intent, true),
          conversation_debug_row("raw action params", conversation_raw_action_params(intent), true),
        ],
      },
    ],
  };
}

function intent_action_event_payload(action: XStudioIntentActionView) {
  return {
    _action_key: action._key,
    _action_id: action._id,
    _action_title: action._title,
    _action_type: action._action_type,
  };
}

function conversation_crud_recommendation_debug_card(
  action: XStudioIntentActionRenderView,
  id_suffix: string,
) {
  const debug = action._recommendation_debug;
  if (debug === undefined || debug === null || debug === "") return null;

  return {
    _type: "xhtml",
    _html_tag: "details",
    _id: `xstudio-crud-recommendation-debug-${id_suffix}`,
    class: "xstudio-crud-recommendation-debug",
    _children: [
      {
        _type: "xhtml",
        _html_tag: "summary",
        class: "xstudio-crud-recommendation-debug-summary",
        _text: "Debug",
      },
      {
        _type: "label",
        class: "xstudio-crud-recommendation-debug-payload debug-payload",
        _text: conversation_debug_json(debug),
      },
    ],
  };
}

function conversation_crud_recommendation_artifact_label(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";

  return normalized
    .replace(/\bentity schema\b/gi, "Data")
    .replace(/\bentities\b/gi, "Data")
    .replace(/\bentity\b/gi, "Data")
    .replace(/\bviews\b/gi, "Screens")
    .replace(/\bview\b/gi, "Screen")
    .replace(/\bflows\b/gi, "Actions")
    .replace(/\bflow\b/gi, "Action")
    .replace(/\bsemantic operation\b/gi, "Action")
    .replace(/\bartifact request\b/gi, "build request");
}

export function create_xstudio_crud_recommendation_card(
  action: XStudioIntentActionRenderView,
  options: {
    _id_suffix: string;
    _surface?: "conversation" | "guide";
  },
) {
  const is_running = action._status === CONVERSATION_ACTION_STATUS_RUNNING;
  const is_done = action._status === CONVERSATION_ACTION_STATUS_DONE;
  const is_failed = action._status === CONVERSATION_ACTION_STATUS_FAILED;
  const execute_state = action._execute_state;
  const is_disabled = is_running || is_done || !execute_state._can_execute;
  const action_payload = intent_action_event_payload(action);
  const status_class = _xu.normalize_id(action._status) ?? "suggested";
  const artifacts = Array.isArray(action._recommendation_expected_artifacts)
    ? action._recommendation_expected_artifacts
      .map((item) => conversation_crud_recommendation_artifact_label(item))
      .filter((item) => item.length > 0)
    : [];
  const badge = action._recommendation_badge ||
    (action._recommended === true ? "Recommended" : action._recommendation_order || "Option");
  const button_label = action._recommendation_button_label ||
    action._title ||
    "Build CRUD foundation";
  const button_text = is_running
    ? "Building..."
    : is_done
      ? "Completed"
      : is_failed
        ? `Retry ${button_label}`
        : button_label;
  const disabled_reason =
    !is_running && !is_done && !execute_state._can_execute
      ? execute_state._disabled_reason || action._execution_payload_error || "Missing executable payload."
      : "";
  const missing_payload =
    !is_running &&
    !is_done &&
    !execute_state._can_execute &&
    !action._has_execution_payload;
  const debug_card = conversation_crud_recommendation_debug_card(action, options._id_suffix);

  return {
    _type: "view",
    _id: `xstudio-crud-recommendation-${options._id_suffix}`,
    class: [
      "xstudio-crud-recommendation-card",
      `xstudio-crud-recommendation-card-${status_class}`,
      options._surface === "guide" ? "xstudio-crud-recommendation-card-guide" : "",
    ].filter(Boolean).join(" "),
    _children: [
      {
        _type: "view",
        class: "xstudio-crud-recommendation-heading",
        _children: [
          {
            _type: "label",
            class: [
              "xstudio-crud-recommendation-badge",
              action._recommended === true ? "xstudio-crud-recommendation-badge-recommended" : "",
            ].filter(Boolean).join(" "),
            _text: badge,
          },
          ...(action._recommendation_order && action._recommendation_order !== badge
            ? [
              {
                _type: "label",
                class: "xstudio-crud-recommendation-order",
                _text: action._recommendation_order,
              },
            ]
            : []),
        ],
      },
      {
        _type: "label",
        class: "xstudio-crud-recommendation-title",
        _text: action._title || "Build CRUD foundation",
      },
      ...(action._description
        ? [
          {
            _type: "label",
            class: "xstudio-crud-recommendation-explanation",
            _text: action._description,
          },
        ]
        : []),
      ...(action._recommendation_entity_name
        ? [
          {
            _type: "label",
            class: "xstudio-crud-recommendation-entity",
            _text: `Data: ${action._recommendation_entity_name}`,
          },
        ]
        : []),
      ...(action._recommendation_dependency
        ? [
          {
            _type: "label",
            class: "xstudio-crud-recommendation-dependency",
            _text: action._recommendation_dependency,
          },
        ]
        : []),
      {
        _type: "view",
        class: "xstudio-crud-recommendation-artifacts",
        _children: [
          {
            _type: "label",
            class: "xstudio-crud-recommendation-artifacts-title",
            _text: "Creates",
          },
          ...(artifacts.length > 0
            ? artifacts.map((artifact, artifact_index) => ({
              _type: "label",
              _id: `xstudio-crud-recommendation-artifact-${options._id_suffix}-${artifact_index}`,
              class: "xstudio-crud-recommendation-artifact",
              _text: artifact,
            }))
            : [
              {
                _type: "label",
                class: "xstudio-crud-recommendation-artifact xstudio-crud-recommendation-artifact-empty",
                _text: "Expected created items were not provided.",
              },
            ]),
        ],
      },
      ...(disabled_reason
        ? [
          {
            _type: "view",
            class: [
              "xstudio-crud-recommendation-disabled",
              missing_payload ? "xstudio-crud-recommendation-missing-payload" : "",
            ].filter(Boolean).join(" "),
            _children: [
              {
                _type: "label",
                class: "xstudio-crud-recommendation-disabled-label",
                _text: missing_payload ? "Missing executable payload" : "Unavailable",
              },
              {
                _type: "label",
                class: "xstudio-crud-recommendation-disabled-reason",
                _text: disabled_reason,
              },
            ],
          },
        ]
        : []),
      {
        _type: "view",
        class: "xstudio-crud-recommendation-actions",
        _children: [
          {
            _type: "button",
            _id: `xstudio-crud-recommendation-apply-${options._id_suffix}`,
            type: "button",
            class: [
              "xstudio-intent-action-button",
              "xstudio-intent-action-apply",
              "xstudio-crud-recommendation-apply",
              is_done ? "xstudio-intent-action-applied" : "",
            ].filter(Boolean).join(" "),
            _text: button_text,
            title: is_running
              ? "CRUD build is running"
              : is_done
                ? "CRUD build completed"
                : disabled_reason || button_label,
            ...(is_disabled ? { disabled: true } : {}),
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
        ],
      },
      ...(debug_card ? [debug_card] : []),
    ],
  };
}

function intent_action_result_source(result: any) {
  if (!is_obj(result)) return null;
  if (is_obj(result._result)) return result._result;
  if (is_obj(result.result)) return result.result;
  if (is_obj(result._report)) return result._report;
  if (is_obj(result.report)) return result.report;
  return result;
}

function intent_action_number(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function intent_action_fix_project_views_report(action: XStudioIntentActionRenderView) {
  if (action._action_type !== "fix-project-views") return null;
  const source = intent_action_result_source(action._result);
  if (!source) return null;

  const rows = [
    {
      _label: "Views scanned",
      _value: intent_action_number(source, ["_views_scanned", "views_scanned", "_view_count", "view_count"]),
    },
    {
      _label: "IDs added",
      _value: intent_action_number(source, ["_ids_added", "ids_added", "_added_ids", "added_ids"]),
    },
    {
      _label: "Collisions fixed",
      _value: intent_action_number(source, ["_collisions_fixed", "collisions_fixed", "_fixed_collisions", "fixed_collisions"]),
    },
  ];

  return {
    _type: "view",
    class: "xstudio-intent-action-report xstudio-intent-action-fix-project-views-report",
    _children: rows.map((row) => ({
      _type: "label",
      class: "xstudio-intent-action-report-row",
      _text: `${row._label}: ${row._value}`,
    })),
  };
}

function conversation_intent_action_card(
  action: XStudioIntentActionRenderView,
  message_index: number,
  action_index: number,
) {
  if (action._recommendation_kind === "crud") {
    return create_xstudio_crud_recommendation_card(action, {
      _id_suffix: `${message_index}-${action_index}`,
      _surface: "conversation",
    });
  }

  const is_running = action._status === CONVERSATION_ACTION_STATUS_RUNNING;
  const is_done = action._status === CONVERSATION_ACTION_STATUS_DONE;
  const is_failed = action._status === CONVERSATION_ACTION_STATUS_FAILED;
  const execute_state = action._execute_state;
  const is_apply_disabled = !execute_state._can_execute;
  const status_class = _xu.normalize_id(action._status) ?? "unknown";
  const action_payload = intent_action_event_payload(action);
  const apply_text = is_running ? "Running" : is_done ? "✓ Applied" : is_failed ? "Retry" : "Apply";
  const disabled_reason = action._executable === false && is_apply_disabled && !is_running && !is_done
    ? execute_state._disabled_reason
    : "";
  const apply_title = is_running
    ? "Action is running"
    : is_done
      ? "Action completed"
      : is_failed
        ? execute_state._disabled_reason || "Retry action"
        : execute_state._disabled_reason || "Execute approved action";
  const result_report = is_done ? intent_action_fix_project_views_report(action) : null;

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
        ...(result_report ? [result_report] : []),
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
          ...(disabled_reason
            ? [
              {
                _type: "label",
                class: "xstudio-intent-action-disabled-reason",
                _text: disabled_reason,
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

function conversation_intent_actions_view(actions: XStudioIntentActionRenderView[], message_index: number) {
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
        conversation_intent_action_card(action, message_index, action_index),
      ),
    ],
  };
}

function conversation_artifact_card(message: XStudioConversationRenderMessage, message_index: number) {
  if (!message._artifact_request) return null;

  return create_xstudio_artifact_request_card(message._artifact_request, {
    _message_index: message_index,
    _status: message._artifact_status || "",
    _error: message._artifact_error || "",
    _success: message._artifact_success ||
      xstudio_artifact_request_success_message(message._artifact_request),
    _result: message._artifact_result,
    _planning_question_selected_answers: message._planning_question_selected_answers,
    _project_plan_expanded: message._project_plan_expanded,
    _mutation_plan_collapsed: message._mutation_plan_collapsed,
    _mutation_plan_execution_state: message._mutation_plan_execution_state,
  });
}

function format_conversation_time(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function conversation_pending_label(message: XStudioConversationRenderMessage) {
  if (message._pending_status === "pending") return "Pending";
  if (message._pending_status === "analyzing") return "Analyzing";
  if (message._pending_status === "failed") return "Failed";
  return "";
}

function conversation_pending_view(message: XStudioConversationRenderMessage) {
  const label = conversation_pending_label(message);
  if (!label) return null;

  return {
    _type: "view",
    class: `xstudio-conversation-pending xstudio-conversation-pending-${message._pending_status}`,
    _children: [
      ...(message._pending_status === "analyzing"
        ? [
          {
            _type: "view",
            class: "xstudio-conversation-spinner",
            "aria-hidden": "true",
          },
        ]
        : []),
      {
        _type: "label",
        class: "xstudio-conversation-pending-label",
        _text: label,
      },
    ],
  };
}

function conversation_message_view(message: XStudioConversationRenderMessage, index: number) {
  const role =
    message._role === "assistant" ||
      message._role === "system" ||
      message._role === "tool"
      ? message._role
      : "user";
  const label =
    conversation_is_xvibe_artifact_message(message)
      ? "XVibe"
      : role === "user"
      ? "You"
      : role === "assistant"
        ? "Assistant"
        : role === "system"
          ? "System"
          : "Tool";
  const artifact_request_view = conversation_artifact_card(message, index);
  const actions_view = conversation_intent_actions_view(message._actions, index);
  const debug_view = conversation_intent_debug_view(message, index);
  const pending_view = conversation_pending_view(message);

  return {
    _type: "view",
    _id: `xstudio-conversation-message-${index}`,
    class: `xstudio-conversation-message xstudio-conversation-message-${role}${message._pending_status ? ` xstudio-conversation-message-${message._pending_status}` : ""}`,
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
            _text: format_conversation_time(message._created_at),
          },
          ...(pending_view ? [pending_view] : []),
        ],
      },
      {
        _type: "label",
        class: "xstudio-conversation-bubble",
        _text: conversation_intent_summary(message),
      },
      ...(artifact_request_view ? [artifact_request_view] : []),
      ...(debug_view ? [debug_view] : []),
      ...(actions_view ? [actions_view] : []),
    ],
  };
}

function planning_greeting_quick_start_chip(
  quick_start: XStudioPlanningGreetingQuickStart,
  index: number,
) {
  return {
    _type: "button",
    _id: `xstudio-planning-greeting-chip-${quick_start._id || index}`,
    type: "button",
    class: "xstudio-planning-greeting-chip",
    _text: quick_start._label,
    title: quick_start._send ? `Start planning: ${quick_start._label}` : "Insert custom app prompt",
    _on: {
      click: {
        _module: "xem",
        _op: "fire",
        _params: {
          event: "studio:planning-quick-start",
          data: {
            _prompt: quick_start._prompt,
            _send: quick_start._send,
          },
        },
      },
    },
  };
}

function planning_greeting_view(greeting: XStudioPlanningGreetingView) {
  return {
    _id: "xstudio-planning-greeting",
    _type: "view",
    class: "xstudio-planning-greeting",
    _children: [
      {
        _type: "label",
        class: "xstudio-planning-greeting-title",
        _text: "Let’s plan this project before building.",
      },
      {
        _type: "view",
        class: "xstudio-planning-greeting-chips",
        _children: greeting._quick_starts.map((quick_start, index) =>
          planning_greeting_quick_start_chip(quick_start, index),
        ),
      },
    ],
  };
}

export function create_xstudio_conversation_message_list(
  messages: XStudioConversationRenderMessage[],
  options: {
    _planning_greeting?: XStudioPlanningGreetingView | null;
  } = {},
) {
  if (messages.length === 0 && options._planning_greeting) {
    return [planning_greeting_view(options._planning_greeting)];
  }

  return messages.length > 0
    ? messages.map((message, index) => conversation_message_view(message, index))
    : [
      {
        _id: "xstudio-conversation-empty",
        _type: "label",
        class: "xstudio-conversation-empty",
        _text: "No messages yet.",
      },
    ];
}
