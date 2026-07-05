import { XUtils as _xu } from "@xpell/core";

import { is_obj } from "../XStudioTypes";
import {
  create_xstudio_artifact_request_card,
  xstudio_artifact_request_article,
  xstudio_artifact_request_success_message,
  type XStudioArtifactRequestView,
} from "./XStudioArtifactCards";

export type XStudioConversationMessage = {
  _role: "user" | "assistant" | "system" | "tool";
  _text: string;
  _created_at: string;
  _id?: string;
  _intent?: Record<string, any>;
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
  _requires_approval?: boolean;
  _params: Record<string, any> | null;
  _error: string;
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
  _artifact_error?: string;
  _artifact_success?: string;
  _artifact_result?: any;
};

const CONVERSATION_ACTION_STATUS_RUNNING = "running";
const CONVERSATION_ACTION_STATUS_DONE = "done";
const CONVERSATION_ACTION_STATUS_FAILED = "failed";

function conversation_intent_value(intent: Record<string, any>, key: string) {
  return intent[`_${key}`] ?? intent[key];
}

function conversation_intent_summary(message: XStudioConversationMessage) {
  if (!is_obj(message._intent)) return message._text;
  if (message._text) return message._text;

  const intent = message._intent;
  const message_type = String(conversation_intent_value(intent, "message_type") ?? "").trim();
  const execution_level = String(conversation_intent_value(intent, "execution_level") ?? "").trim();
  const artifact_type = String(conversation_intent_value(intent, "artifact_type") ?? "").trim();
  const request = intent._artifact_request ?? intent.artifact_request;
  const operation = is_obj(request)
    ? String(request._operation ?? request.operation ?? "").trim()
    : "";
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

function conversation_intent_action_card(
  action: XStudioIntentActionRenderView,
  message_index: number,
  action_index: number,
) {
  const is_running = action._status === CONVERSATION_ACTION_STATUS_RUNNING;
  const is_done = action._status === CONVERSATION_ACTION_STATUS_DONE;
  const is_failed = action._status === CONVERSATION_ACTION_STATUS_FAILED;
  const execute_state = action._execute_state;
  const is_apply_disabled = !execute_state._can_execute;
  const status_class = _xu.normalize_id(action._status) ?? "unknown";
  const action_payload = intent_action_event_payload(action);
  const apply_text = is_running ? "Running" : is_done ? "✓ Applied" : is_failed ? "Retry" : "Apply";
  const apply_title = is_running
    ? "Action is running"
    : is_done
      ? "Action completed"
      : is_failed
        ? execute_state._disabled_reason || "Retry action"
        : execute_state._disabled_reason || "Execute approved action";

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

function conversation_message_view(message: XStudioConversationRenderMessage, index: number) {
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
  const artifact_request_view = conversation_artifact_card(message, index);
  const actions_view = conversation_intent_actions_view(message._actions, index);
  const debug_view = conversation_intent_debug_view(message, index);

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
            _text: format_conversation_time(message._created_at),
          },
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

export function create_xstudio_conversation_message_list(messages: XStudioConversationRenderMessage[]) {
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
