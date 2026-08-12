import { _xlog, XUtils as _xu } from "@xpell/core";

import { is_obj } from "../XStudioTypes";

export type XStudioArtifactRequestStatus = "dismissed" | "running" | "done" | "failed";

export type XStudioArtifactRequestDetail = {
  _label: string;
  _value: string;
};

export type XStudioArtifactRequestView = {
  _key: string;
  _message_id: string;
  _title: string;
  _operation: string;
  _artifact_type: string;
  _artifact_name: string;
  _status: XStudioArtifactRequestStatus | "";
  _error: any;
  _result?: any;
  _details: XStudioArtifactRequestDetail[];
  _artifact_request: Record<string, any>;
};

export type XStudioArtifactRequestEventPayload = {
  _request_key: string;
  _message_id: string;
  _artifact_type: string;
  _operation: string;
  _artifact_name: string;
  _details: XStudioArtifactRequestDetail[];
  _artifact_request: Record<string, any> | null;
};

export type XStudioMutationPlanExecutionState = {
  _status: string;
  _collapsed: boolean;
  _completed_steps: number;
  _failed_steps: number;
  _steps: any[];
  _result?: any;
};

const ARTIFACT_REQUEST_STATUS_SUGGESTED = "suggested";
const ARTIFACT_REQUEST_STATUS_DISMISSED = "dismissed";
const ARTIFACT_REQUEST_STATUS_RUNNING = "running";
const ARTIFACT_REQUEST_STATUS_DONE = "done";
const ARTIFACT_REQUEST_STATUS_FAILED = "failed";
export const CRUD_FIELD_SUGGESTION_ARTIFACT_TYPE = "crud-field-suggestion";
export const EXECUTION_GRAPH_ARTIFACT_TYPE = "execution-graph";
export const PROJECT_PLAN_ARTIFACT_TYPE = "project-plan";
export const CAPABILITY_GUIDANCE_ARTIFACT_TYPE = "capability-guidance";
export const MUTATION_PLAN_ARTIFACT_TYPE = "mutation-plan";

const PROJECT_PLAN_EDIT_PROMPT = "I want to change the plan: ";
const PROJECT_PLAN_ASK_QUESTIONS_PROMPT = "Ask me the missing planning questions one by one.";

function artifact_request_intent_value(intent: Record<string, any>, key: string) {
  return intent[`_${key}`] ?? intent[key];
}

export function xstudio_artifact_request_article(artifact_type: string) {
  return /^[aeiou]/i.test(artifact_type) ? "an" : "a";
}

function artifact_request_title(operation: string, artifact_type: string) {
  const normalized_operation = operation.trim();
  const normalized_type = artifact_type.trim();
  if (!normalized_operation || !normalized_type) return "Artifact Request";
  return `${normalized_operation.charAt(0).toUpperCase()}${normalized_operation.slice(1)} ${normalized_type}`;
}

function artifact_request_string_value(value: any) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function artifact_request_error_source(error: any, result: any) {
  if (is_obj(error)) return error;
  if (is_obj(result?._error)) return result._error;
  if (is_obj(result?.error)) return result.error;
  if (is_obj(result?._result?._error)) return result._result._error;
  if (is_obj(result?.result?.error)) return result.result.error;
  return null;
}

function artifact_request_error_message(error: any, result: any) {
  const source = artifact_request_error_source(error, result);
  const message = source
    ? artifact_request_string_value(
      source._message ??
      source.message ??
      source._safe_message ??
      source.safe_message ??
      source._reason ??
      source.reason,
    )
    : artifact_request_string_value(error);
  if (message) return message;

  return artifact_request_string_value(
    result?._message ??
    result?.message ??
    result?._error ??
    result?.error,
  ) || "Artifact request failed.";
}

function artifact_request_error_field(error: any, result: any, key: string) {
  const source = artifact_request_error_source(error, result);
  if (!source) return "";
  return artifact_request_string_value(source[`_${key}`] ?? source[key]);
}

function artifact_request_error_recoverable(error: any, result: any) {
  const source = artifact_request_error_source(error, result);
  if (!source) return "";
  const value = source._recoverable ?? source.recoverable;
  if (typeof value === "boolean") return value ? "Recoverable" : "Not recoverable";
  return "";
}

function artifact_request_redacted_debug_value(value: any): any {
  if (Array.isArray(value)) return value.map((item) => artifact_request_redacted_debug_value(item));
  if (!is_obj(value)) return value;

  const out: Record<string, any> = {};
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.replace(/^_+/, "").toLowerCase();
    if (
      normalized.includes("path") ||
      normalized.includes("reasoning") ||
      normalized.includes("chain_of_thought") ||
      normalized.includes("hidden")
    ) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = artifact_request_redacted_debug_value(child);
  }
  return out;
}

function artifact_request_debug_json(value: any) {
  if (value === undefined || value === null || value === "") return "";
  return _xu.safe_compact_inline_json(artifact_request_redacted_debug_value(value), 8000) || "";
}

function artifact_request_error_debug_card(
  request: XStudioArtifactRequestView,
  error: any,
  result: any,
  message_index: number,
) {
  const source = artifact_request_error_source(error, result);
  const debug = source && is_obj(source._debug ?? source.debug)
    ? source._debug ?? source.debug
    : null;
  const payload = {
    ...(source ? { _developer_detail: source._details ?? source.details ?? null } : {}),
    _normalized_artifact_request: request._artifact_request,
    ...(debug ? { _server_debug: debug } : {}),
  };
  const text = artifact_request_debug_json(payload);
  if (!text) return null;

  return {
    _type: "xhtml",
    _html_tag: "details",
    _id: `xstudio-artifact-request-debug-${message_index}`,
    class: "xstudio-artifact-request-debug",
    _children: [
      {
        _type: "xhtml",
        _html_tag: "summary",
        class: "xstudio-artifact-request-debug-summary",
        _text: "Debug",
      },
      {
        _type: "label",
        class: "xstudio-artifact-request-debug-payload",
        _text: text,
      },
    ],
  };
}

function artifact_request_value(request: Record<string, any>, key: string) {
  return artifact_request_string_value(request[`_${key}`] ?? request[key]);
}

function artifact_request_detail_label(key: string) {
  const normalized = key
    .replace(/^_+/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  const without_suffix = normalized.replace(/\s+(id|name)$/i, "").trim() || normalized;
  return without_suffix
    .split(/\s+/)
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : "")
    .filter(Boolean)
    .join(" ");
}

function artifact_request_detail_rows(request: Record<string, any>) {
  return Object.entries(request).flatMap(([key, value]) => {
    const normalized_key = key.replace(/^_+/, "");
    if (!normalized_key || normalized_key === "operation") return [];
    const string_value = artifact_request_string_value(value);
    if (!string_value) return [];
    return [{
      _label: artifact_request_detail_label(key),
      _value: string_value,
    }];
  });
}

function artifact_request_primary_name(artifact_type: string, request: Record<string, any>) {
  const normalized_type = artifact_type.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const candidates = [
    `${normalized_type}_id`,
    `${normalized_type}_name`,
    "id",
    "name",
  ];
  for (const key of candidates) {
    const value = artifact_request_value(request, key);
    if (value) return value;
  }

  for (const [key, value] of Object.entries(request)) {
    if (!/(?:^|_)(id|name)$/.test(key.replace(/^_+/, ""))) continue;
    const string_value = artifact_request_string_value(value);
    if (string_value) return string_value;
  }

  return "";
}

function normalized_artifact_type(value: any) {
  return String(value ?? "").trim().toLowerCase();
}

function is_project_plan_artifact(artifact_type: string, request: any) {
  if (normalized_artifact_type(artifact_type) === PROJECT_PLAN_ARTIFACT_TYPE) return true;
  if (!is_obj(request)) return false;

  const request_type = normalized_artifact_type(
    request._type ??
    request.type ??
    request._artifact_type ??
    request.artifact_type ??
    request._message_type ??
    request.message_type,
  );

  if (
    request_type === PROJECT_PLAN_ARTIFACT_TYPE ||
    request_type === "planning-session" ||
    request_type === "planning_session"
  ) {
    return true;
  }

  return is_obj(request._current_question ?? request.current_question) ||
    is_obj(request._planning_session ?? request.planning_session) ||
    is_obj(request._project_plan ?? request.project_plan);
}

function is_capability_guidance_artifact(artifact_type: string, request: any) {
  if (normalized_artifact_type(artifact_type) === CAPABILITY_GUIDANCE_ARTIFACT_TYPE) return true;
  if (!is_obj(request)) return false;

  const request_type = normalized_artifact_type(
    request._type ??
    request.type ??
    request._artifact_type ??
    request.artifact_type,
  );

  return request_type === CAPABILITY_GUIDANCE_ARTIFACT_TYPE ||
    Array.isArray(request._categories ?? request.categories);
}

function is_mutation_plan_artifact(artifact_type: string, request: any) {
  if (normalized_artifact_type(artifact_type) === MUTATION_PLAN_ARTIFACT_TYPE) return true;
  if (!is_obj(request)) return false;

  const request_type = normalized_artifact_type(
    request._type ??
    request.type ??
    request._artifact_type ??
    request.artifact_type,
  );

  return request_type === MUTATION_PLAN_ARTIFACT_TYPE;
}

export function xstudio_artifact_request_status_value(value: any): XStudioArtifactRequestStatus | "" {
  const status = typeof value === "string" ? value.trim() : "";
  if (
    status === ARTIFACT_REQUEST_STATUS_DISMISSED ||
    status === ARTIFACT_REQUEST_STATUS_RUNNING ||
    status === ARTIFACT_REQUEST_STATUS_DONE ||
    status === ARTIFACT_REQUEST_STATUS_FAILED
  ) {
    return status;
  }
  return "";
}

export function xstudio_artifact_request_render_status(value: any) {
  return xstudio_artifact_request_status_value(value) || ARTIFACT_REQUEST_STATUS_SUGGESTED;
}

function artifact_request_persisted_status(
  message: Record<string, any>,
  intent: Record<string, any>,
  request: Record<string, any>,
) {
  return xstudio_artifact_request_status_value(
    message._artifact_status ??
    message.artifact_status ??
    intent._artifact_status ??
    intent.artifact_status ??
    request._artifact_status ??
    request.artifact_status,
  );
}

function artifact_request_persisted_error(
  message: Record<string, any>,
  intent: Record<string, any>,
  request: Record<string, any>,
) {
  return (
    message._artifact_error ??
    message.artifact_error ??
    intent._artifact_error ??
    intent.artifact_error ??
    request._artifact_error ??
    request.artifact_error ??
    ""
  );
}

function artifact_request_persisted_result(
  message: Record<string, any>,
  intent: Record<string, any>,
  request: Record<string, any>,
) {
  return (
    message._artifact_result ??
    message.artifact_result ??
    intent._artifact_result ??
    intent.artifact_result ??
    request._artifact_result ??
    request.artifact_result
  );
}

export function create_xstudio_artifact_request_view(
  message: Record<string, any>,
  options: {
    _key: string;
    _message_id: string;
  },
) {
  const intent = is_obj(message._intent) ? message._intent : null;
  const message_type = intent
    ? String(artifact_request_intent_value(intent, "message_type") ?? "").trim()
    : "";
  const execution_level = intent
    ? String(artifact_request_intent_value(intent, "execution_level") ?? "").trim()
    : "";
  const raw_artifact_type = intent
    ? String(artifact_request_intent_value(intent, "artifact_type") ?? "").trim()
    : "";
  const request = intent
    ? intent._artifact_request ??
      intent.artifact_request ??
      intent._planning_session ??
      intent.planning_session ??
      intent._project_plan ??
      intent.project_plan ??
      intent._capability_guidance ??
      intent.capability_guidance ??
      intent._mutation_plan ??
      intent.mutation_plan
    : null;
  const has_project_plan_response = intent
    ? is_obj(intent._planning_session ?? intent.planning_session ?? intent._project_plan ?? intent.project_plan)
    : false;
  const artifact_type = has_project_plan_response || is_project_plan_artifact(raw_artifact_type, request)
    ? PROJECT_PLAN_ARTIFACT_TYPE
    : is_capability_guidance_artifact(raw_artifact_type, request)
      ? CAPABILITY_GUIDANCE_ARTIFACT_TYPE
      : is_mutation_plan_artifact(raw_artifact_type, request)
        ? MUTATION_PLAN_ARTIFACT_TYPE
    : raw_artifact_type;
  const is_project_plan = artifact_type === PROJECT_PLAN_ARTIFACT_TYPE;
  const is_capability_guidance = artifact_type === CAPABILITY_GUIDANCE_ARTIFACT_TYPE;
  const is_mutation_plan = artifact_type === MUTATION_PLAN_ARTIFACT_TYPE;
  const is_terminal_execution_graph =
    artifact_type === EXECUTION_GRAPH_ARTIFACT_TYPE &&
    is_obj(request) &&
    String(request._status ?? request.status ?? "").trim() === "foundation-exists";

  // _xlog.log("[xstudio]", "artifact card render check", {
  //   _message_id: options._message_id,
  //   _message_type: message_type,
  //   _artifact_type: artifact_type,
  //   _has_artifact_request: is_obj(request),
  // });

  if (!intent) return null;

  if (
    !is_project_plan &&
    (
      !is_capability_guidance &&
      !is_mutation_plan &&
      !is_terminal_execution_graph &&
      (
        (message_type !== "generate" && message_type !== "plan") ||
        execution_level !== "artifact"
      )
    )
  ) {
    return null;
  }

  if (
    !is_obj(request)
  ) {
    return null;
  }

  const raw_operation = String(request._operation ?? request.operation ?? "").trim();
  const operation = artifact_type === PROJECT_PLAN_ARTIFACT_TYPE
    ? raw_operation || "plan"
    : artifact_type === EXECUTION_GRAPH_ARTIFACT_TYPE
      ? raw_operation || "plan"
      : artifact_type === CAPABILITY_GUIDANCE_ARTIFACT_TYPE
        ? raw_operation || "guide"
        : artifact_type === MUTATION_PLAN_ARTIFACT_TYPE
          ? raw_operation || "preview"
        : raw_operation;
  if (!artifact_type || !operation) return null;

  return {
    _key: options._key,
    _message_id: options._message_id,
    _title: artifact_request_title(operation, artifact_type),
    _operation: operation,
    _artifact_type: artifact_type,
    _artifact_name: artifact_request_primary_name(artifact_type, request),
    _status: artifact_request_persisted_status(message, intent, request),
    _error: artifact_request_persisted_error(message, intent, request),
    _result: artifact_request_persisted_result(message, intent, request),
    _details: artifact_request_detail_rows(request),
    _artifact_request: { ...request },
  } satisfies XStudioArtifactRequestView;
}

export function normalize_xstudio_artifact_request_event_payload(payload?: any) {
  if (!is_obj(payload)) return null;
  const request_key = typeof payload._request_key === "string" ? payload._request_key.trim() : "";
  if (!request_key) return null;

  return {
    _request_key: request_key,
    _message_id: typeof payload._message_id === "string" ? payload._message_id.trim() : "",
    _artifact_type: typeof payload._artifact_type === "string" ? payload._artifact_type.trim() : "",
    _operation: typeof payload._operation === "string" ? payload._operation.trim() : "",
    _artifact_name: typeof payload._artifact_name === "string" ? payload._artifact_name.trim() : "",
    _details: Array.isArray(payload._details)
      ? payload._details.flatMap((detail: any) => {
        if (!is_obj(detail)) return [];
        const label = typeof detail._label === "string" ? detail._label.trim() : "";
        const value = artifact_request_string_value(detail._value);
        return label && value ? [{ _label: label, _value: value }] : [];
      })
      : [],
    _artifact_request: is_obj(payload._artifact_request) ? { ...payload._artifact_request } : null,
  } satisfies XStudioArtifactRequestEventPayload;
}

export function xstudio_artifact_request_event_payload(request: XStudioArtifactRequestView) {
  return {
    _request_key: request._key,
    _message_id: request._message_id,
    _artifact_type: request._artifact_type,
    _operation: request._operation,
    _artifact_name: request._artifact_name,
    _details: request._details,
    _artifact_request: request._artifact_request,
  } satisfies XStudioArtifactRequestEventPayload;
}

export function xstudio_artifact_request_success_message(request: {
  _artifact_type: string;
  _operation: string;
  _artifact_name?: string;
}) {
  if (
    request._operation === "create" &&
    request._artifact_type &&
    request._artifact_name
  ) {
    return `Created ${request._artifact_type}: ${request._artifact_name}`;
  }

  return "Artifact request applied";
}

function crud_field_suggestion_field_name(value: any) {
  const raw =
    typeof value === "string"
      ? value
      : is_obj(value)
        ? value._name ?? value.name ?? value._field ?? value.field
        : "";
  return artifact_request_string_value(raw);
}

function crud_field_suggestion_fields(request: XStudioArtifactRequestView) {
  const raw_fields =
    request._artifact_request._fields ??
    request._artifact_request.fields;
  if (!Array.isArray(raw_fields)) return [];

  return raw_fields
    .map((field) => crud_field_suggestion_field_name(field))
    .filter(Boolean);
}

function crud_field_suggestion_entity_title(request: XStudioArtifactRequestView) {
  const entity_name = artifact_request_string_value(
    request._artifact_request._entity_name ??
    request._artifact_request.entity_name ??
    request._artifact_name,
  );
  if (!entity_name) return "Entity";

  return entity_name
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : "")
    .filter(Boolean)
    .join(" ");
}

function crud_field_suggestion_execution_graph_request(
  request: XStudioArtifactRequestView,
) {
  return {
    ...request,
    _title: `CRUD for ${crud_field_suggestion_entity_title(request)}`,
    _operation: "plan",
    _artifact_type: EXECUTION_GRAPH_ARTIFACT_TYPE,
    _artifact_request: {
      ...request._artifact_request,
      _operation: "plan",
      _graph_type: "crud",
      _entity_name:
        request._artifact_request._entity_name ??
        request._artifact_request.entity_name ??
        request._artifact_name,
    },
  } satisfies XStudioArtifactRequestView;
}

function execution_graph_string_value(value: any) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function execution_graph_number_value(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function execution_graph_count_value(source: Record<string, any>, key: string) {
  return execution_graph_number_value(source[`_${key}`] ?? source[key]) ?? 0;
}

function execution_graph_field(source: Record<string, any>, key: string) {
  return source[`_${key}`] ?? source[key];
}

function execution_graph_title_case(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : "")
    .filter(Boolean)
    .join(" ");
}

function execution_graph_list_label(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function execution_graph_status(request: XStudioArtifactRequestView) {
  return execution_graph_string_value(
    execution_graph_field(request._artifact_request, "status"),
  ).toLowerCase();
}

function execution_graph_existing_entity_titles(request: XStudioArtifactRequestView) {
  const raw = execution_graph_field(request._artifact_request, "existing_entities");
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => artifact_request_string_value(item))
    .filter(Boolean)
    .map(execution_graph_title_case);
}

function execution_graph_foundation_exists_message(request: XStudioArtifactRequestView) {
  const entities = execution_graph_existing_entity_titles(request);
  if (entities.length === 0) {
    return artifact_request_string_value(
      execution_graph_field(request._artifact_request, "message"),
    ) || "The confirmed plan does not require a new CRUD foundation.";
  }

  const subject = execution_graph_list_label(entities);
  return entities.length === 1
    ? `${subject} already has its core data, screens, and CRUD actions.`
    : `${subject} already have their core data, screens, and CRUD actions.`;
}

function create_execution_graph_foundation_exists_card(
  request: XStudioArtifactRequestView,
  options: {
    _message_index: number;
  },
) {
  const has_existing_entities = execution_graph_existing_entity_titles(request).length > 0;
  const title = has_existing_entities
    ? "CRUD foundation already exists"
    : "No additional CRUD foundation is required";

  return {
    _type: "view",
    _id: `xstudio-execution-graph-foundation-exists-${options._message_index}`,
    class: "xstudio-artifact-request-card xstudio-execution-graph-card xstudio-execution-graph-foundation-exists-card xstudio-artifact-request-card-done",
    _children: [
      {
        _type: "view",
        class: "xstudio-artifact-request-content xstudio-execution-graph-content xstudio-execution-graph-foundation-exists-content",
        _children: [
          {
            _type: "label",
            class: "xstudio-artifact-request-label xstudio-execution-graph-label",
            _text: "CRUD",
          },
          {
            _type: "label",
            class: "xstudio-artifact-request-title xstudio-execution-graph-title",
            _text: title,
          },
          {
            _type: "label",
            class: "xstudio-execution-graph-summary",
            _text: execution_graph_foundation_exists_message(request),
          },
          ...(has_existing_entities
            ? [
              {
                _type: "label",
                class: "xstudio-artifact-request-detail xstudio-execution-graph-foundation-exists-detail",
                _text: "No additional CRUD foundation is required.",
              },
            ]
            : []),
        ],
      },
    ],
  };
}

function execution_graph_title(request: XStudioArtifactRequestView) {
  const graph_type = execution_graph_string_value(
    execution_graph_field(request._artifact_request, "graph_type"),
  );
  const entity_name = execution_graph_string_value(
    execution_graph_field(request._artifact_request, "entity_name"),
  );
  const normalized_graph_type = graph_type.toLowerCase() === "crud"
    ? "CRUD"
    : graph_type
      ? `${graph_type.charAt(0).toUpperCase()}${graph_type.slice(1)}`
      : "";

  if (normalized_graph_type && entity_name) return `${normalized_graph_type} for ${entity_name}`;
  if (normalized_graph_type) return normalized_graph_type;
  if (entity_name) return entity_name;
  return request._title || "Execution Plan";
}

function execution_graph_summary_counts(summary: any, nodes: Record<string, any>[]) {
  const summary_obj = is_obj(summary) ? summary : {};
  const existing_count = execution_graph_number_value(
    summary_obj._existing_count ??
    summary_obj.existing_count ??
    summary_obj._existing ??
    summary_obj.existing,
  );
  const missing_count = execution_graph_number_value(
    summary_obj._missing_count ??
    summary_obj.missing_count ??
    summary_obj._missing ??
    summary_obj.missing,
  );

  if (existing_count !== null && missing_count !== null) {
    return `${existing_count} existing, ${missing_count} missing`;
  }

  let explicit_existing = 0;
  let explicit_missing = 0;
  for (const node of nodes) {
    const exists = execution_graph_node_exists(node);
    if (exists === true) explicit_existing += 1;
    if (exists === false) explicit_missing += 1;
  }

  if (explicit_existing > 0 || explicit_missing > 0) {
    return `${explicit_existing} existing, ${explicit_missing} missing`;
  }

  return typeof summary === "string" ? summary.trim() : "";
}

function execution_graph_node_exists(node: Record<string, any>) {
  const exists = node._exists ?? node.exists ?? node._existing ?? node.existing;
  if (typeof exists === "boolean") return exists;

  const missing = node._missing ?? node.missing;
  if (typeof missing === "boolean") return !missing;

  const status = execution_graph_string_value(node._status ?? node.status).toLowerCase();
  if (["existing", "exists", "present", "available", "ready", "done"].includes(status)) return true;
  if (["missing", "planned", "pending", "create", "new"].includes(status)) return false;

  return null;
}

function execution_graph_node_type(node: Record<string, any>) {
  return execution_graph_string_value(
    node._artifact_type ??
    node.artifact_type ??
    node._node_type ??
    node.node_type ??
    node._type ??
    node.type,
  );
}

function execution_graph_capitalized_label(value: string) {
  return value
    .replace(/^_+/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : "")
    .filter(Boolean)
    .join(" ");
}

function execution_graph_strip_duplicate_prefix(value: string, type: string) {
  let next = value.trim();
  const normalized_type = type.trim().toLowerCase();
  if (!normalized_type) return next;

  while (next.toLowerCase().startsWith(`${normalized_type}:`)) {
    next = next.slice(normalized_type.length + 1).trim();
  }

  return next;
}

function execution_graph_node_name(node: Record<string, any>, type: string) {
  const name = execution_graph_string_value(
    node._artifact_id ??
    node.artifact_id ??
    node._artifact_name ??
    node.artifact_name ??
    node._name ??
    node.name ??
    node._id ??
    node.id,
  );

  return execution_graph_strip_duplicate_prefix(name, type);
}

function execution_graph_node_display(node: Record<string, any>) {
  const type = execution_graph_node_type(node);
  const type_label = execution_graph_capitalized_label(type) || "Node";
  const name = execution_graph_node_name(node, type);

  return {
    _type_label: type_label,
    _name: name || type_label,
  };
}

function execution_graph_child_nodes(node: Record<string, any>) {
  const children = node._children ?? node.children;
  if (!Array.isArray(children)) return [];

  return children.filter((child): child is Record<string, any> => is_obj(child));
}

function execution_graph_nodes(request: XStudioArtifactRequestView) {
  const graph = execution_graph_field(request._artifact_request, "execution_graph");
  if (!is_obj(graph)) return [];

  const nodes = graph._nodes ?? graph.nodes;
  if (!Array.isArray(nodes)) return [];

  return nodes.filter((node): node is Record<string, any> => is_obj(node));
}

function execution_graph_flat_nodes(nodes: Record<string, any>[]) {
  return nodes.flatMap((node): Record<string, any>[] => [
    node,
    ...execution_graph_flat_nodes(execution_graph_child_nodes(node)),
  ]);
}

function execution_graph_node_rows(
  nodes: Record<string, any>[],
  options: {
    _message_index: number;
    _depth?: number;
    _path?: string;
  },
): Record<string, any>[] {
  const depth = options._depth ?? 0;
  const prefix = options._path ?? "";

  return nodes.flatMap((node, node_index) => {
    const exists = execution_graph_node_exists(node);
    const display = execution_graph_node_display(node);
    const node_path = prefix ? `${prefix}-${node_index}` : `${node_index}`;
    const children = execution_graph_child_nodes(node);
    const row = {
      _type: "view",
      _id: `xstudio-execution-graph-node-${options._message_index}-${node_path}`,
      class: `xstudio-execution-graph-node${exists === true ? " xstudio-execution-graph-node-existing" : " xstudio-execution-graph-node-missing"}`,
      _style: {
        "--xstudio-execution-graph-depth": depth,
      },
      _children: [
        {
          _type: "label",
          class: "xstudio-execution-graph-node-icon",
          _text: exists === true ? "✓" : "○",
        },
        {
          _type: "label",
          class: "xstudio-execution-graph-node-type",
          _text: display._type_label,
        },
        {
          _type: "label",
          class: "xstudio-execution-graph-node-name",
          _text: display._name,
        },
      ],
    };

    return [
      row,
      ...execution_graph_node_rows(children, {
        _message_index: options._message_index,
        _depth: depth + 1,
        _path: node_path,
      }),
    ];
  });
}

function execution_graph_result_summary(result: any) {
  const result_obj = is_obj(result)
    ? result
    : is_obj(result?._result)
      ? result._result
      : {};
  const summary = is_obj(result_obj._summary)
    ? result_obj._summary
    : is_obj(result_obj.summary)
      ? result_obj.summary
      : {};

  return {
    _existing: execution_graph_count_value(summary, "existing"),
    _created: execution_graph_count_value(summary, "created"),
    _skipped: execution_graph_count_value(summary, "skipped"),
    _failed: execution_graph_count_value(summary, "failed"),
  };
}

function execution_graph_result_rows(result: any) {
  const summary = execution_graph_result_summary(result);
  return [
    { _label: "Existing", _value: summary._existing },
    { _label: "Created", _value: summary._created },
    { _label: "Skipped", _value: summary._skipped },
    { _label: "Failed", _value: summary._failed },
  ];
}

function create_execution_graph_card(
  request: XStudioArtifactRequestView,
  options: {
    _message_index: number;
    _status?: string;
    _error?: string;
    _result?: any;
    _mutation_plan_collapsed?: boolean;
  },
) {
  const status = xstudio_artifact_request_render_status(options._status ?? request._status);
  if (execution_graph_status(request) === "foundation-exists") {
    return create_execution_graph_foundation_exists_card(request, options);
  }

  const is_running = status === ARTIFACT_REQUEST_STATUS_RUNNING;
  const is_done = status === ARTIFACT_REQUEST_STATUS_DONE;
  const is_failed = status === ARTIFACT_REQUEST_STATUS_FAILED;
  const status_class = _xu.normalize_id(status) ?? "suggested";
  const payload = xstudio_artifact_request_event_payload(request);
  const graph = execution_graph_field(request._artifact_request, "execution_graph");
  const summary = is_obj(graph) ? graph._summary ?? graph.summary : "";
  const nodes = execution_graph_nodes(request);
  const flat_nodes = execution_graph_flat_nodes(nodes);
  const summary_text = execution_graph_summary_counts(summary, flat_nodes);
  const error = options._error || request._error || "";
  const result = options._result ?? request._result;
  const card_id = `xstudio-execution-graph-${options._message_index}-${status_class}`;

  _xlog.log("[xstudio]", "execution graph rendered", {
    _message_id: request._message_id,
    _artifact_type: request._artifact_type,
    _operation: request._operation,
    _node_count: flat_nodes.length,
  });

  if (is_done) {
    return {
      _type: "view",
      _id: card_id,
      class: `xstudio-artifact-request-card xstudio-execution-graph-card xstudio-artifact-request-card-${status_class} xstudio-artifact-request-card-compact xstudio-execution-graph-card-compact`,
      _children: [
        {
          _type: "label",
          class: "xstudio-artifact-request-success xstudio-execution-graph-success",
          _text: "✓ Execution graph completed",
        },
        {
          _type: "view",
          class: "xstudio-execution-graph-result",
          _children: execution_graph_result_rows(result).map((row) => ({
            _type: "label",
            class: "xstudio-execution-graph-result-row",
            _text: `${row._label}: ${row._value}`,
          })),
        },
      ],
    };
  }

  return {
    _type: "view",
    _id: card_id,
    class: `xstudio-artifact-request-card xstudio-execution-graph-card xstudio-artifact-request-card-${status_class}`,
    _children: [
      {
        _type: "view",
        class: "xstudio-artifact-request-content xstudio-execution-graph-content",
        _children: [
          {
            _type: "label",
            class: "xstudio-artifact-request-label xstudio-execution-graph-label",
            _text: "Execution Plan",
          },
          {
            _type: "label",
            class: "xstudio-artifact-request-title xstudio-execution-graph-title",
            _text: execution_graph_title(request),
          },
          ...(summary_text
            ? [
              {
                _type: "label",
                class: "xstudio-execution-graph-summary",
                _text: summary_text,
              },
            ]
            : []),
          ...(nodes.length > 0
            ? [
              {
                _type: "label",
                class: "xstudio-artifact-request-details-label xstudio-execution-graph-nodes-label",
                _text: "Nodes:",
              },
            ]
            : []),
          ...execution_graph_node_rows(nodes, {
            _message_index: options._message_index,
          }),
          ...(error
            ? [
              {
                _type: "label",
                class: "xstudio-artifact-request-error",
                _text: error,
              },
            ]
            : []),
        ],
      },
      {
        _type: "view",
        class: "xstudio-artifact-request-buttons xstudio-execution-graph-buttons",
        _children: [
          {
            _type: "button",
            _id: `xstudio-execution-graph-continue-${options._message_index}`,
            type: "button",
            class: "xstudio-intent-action-button xstudio-intent-action-apply",
            _text: is_running ? "Running" : is_failed ? "Retry" : "Continue",
            title: is_running ? "Execution graph is running" : is_failed ? "Retry execution graph" : "Continue execution graph",
            ...(is_running ? { disabled: true } : {}),
            _on: {
              click: {
                _module: "xem",
                _op: "fire",
                _params: {
                  event: "studio:artifact-request-apply",
                  data: payload,
                },
              },
            },
          },
          ...(!is_running
            ? [
              {
                _type: "button",
                _id: `xstudio-execution-graph-dismiss-${options._message_index}`,
                type: "button",
                class: "xstudio-intent-action-button xstudio-intent-action-dismiss",
                _text: "Dismiss",
                title: "Dismiss execution plan",
                _on: {
                  click: {
                    _module: "xem",
                    _op: "fire",
                    _params: {
                      event: "studio:artifact-request-dismiss",
                      data: payload,
                    },
                  },
                },
              },
            ]
            : []),
        ],
      },
    ],
  };
}

function create_crud_field_suggestion_card(
  request: XStudioArtifactRequestView,
  options: {
    _message_index: number;
    _status?: string;
    _error?: string;
    _success?: string;
    _result?: any;
  },
) {
  const status = xstudio_artifact_request_render_status(options._status ?? request._status);
  const is_running = status === ARTIFACT_REQUEST_STATUS_RUNNING;
  const is_done = status === ARTIFACT_REQUEST_STATUS_DONE;
  const is_failed = status === ARTIFACT_REQUEST_STATUS_FAILED;

  if (is_done) {
    return create_execution_graph_card(
      crud_field_suggestion_execution_graph_request(request),
      options,
    );
  }

  const status_class = _xu.normalize_id(status) ?? "suggested";
  const error = options._error || request._error || "";
  const payload = xstudio_artifact_request_event_payload(request);
  const entity_title = crud_field_suggestion_entity_title(request);
  const fields = crud_field_suggestion_fields(request);

  return {
    _type: "view",
    _id: `xstudio-crud-field-suggestion-${options._message_index}-${status_class}`,
    class: `xstudio-artifact-request-card xstudio-crud-field-suggestion-card xstudio-artifact-request-card-${status_class}`,
    _children: [
      {
        _type: "view",
        class: "xstudio-artifact-request-content xstudio-crud-field-suggestion-content",
        _children: [
          {
            _type: "label",
            class: "xstudio-artifact-request-label xstudio-crud-field-suggestion-label",
            _text: "Suggested fields",
          },
          {
            _type: "label",
            class: "xstudio-artifact-request-title xstudio-crud-field-suggestion-title",
            _text: `Suggested fields for ${entity_title}`,
          },
          ...fields.map((field, field_index) => ({
            _type: "label",
            _id: `xstudio-crud-field-suggestion-field-${options._message_index}-${field_index}`,
            class: "xstudio-artifact-request-detail xstudio-crud-field-suggestion-field",
            _text: `• ${field}`,
          })),
          ...(error
            ? [
              {
                _type: "label",
                class: "xstudio-artifact-request-error",
                _text: error,
              },
            ]
            : []),
        ],
      },
      {
        _type: "view",
        class: "xstudio-artifact-request-buttons xstudio-crud-field-suggestion-buttons",
        _children: [
          {
            _type: "button",
            _id: `xstudio-crud-field-suggestion-apply-${options._message_index}`,
            type: "button",
            class: "xstudio-intent-action-button xstudio-intent-action-apply",
            _text: is_running ? "Running" : is_failed ? "Retry" : "Apply",
            title: is_running ? "CRUD generation is running" : "Generate CRUD with these fields",
            ...(is_running ? { disabled: true } : {}),
            _on: {
              click: {
                _module: "xem",
                _op: "fire",
                _params: {
                  event: "studio:artifact-request-apply",
                  data: payload,
                },
              },
            },
          },
          ...(!is_running
            ? [
              {
                _type: "button",
                _id: `xstudio-crud-field-suggestion-dismiss-${options._message_index}`,
                type: "button",
                class: "xstudio-intent-action-button xstudio-intent-action-dismiss",
                _text: "Dismiss",
                title: "Dismiss field suggestion",
                _on: {
                  click: {
                    _module: "xem",
                    _op: "fire",
                    _params: {
                      event: "studio:artifact-request-dismiss",
                      data: payload,
                    },
                  },
                },
              },
            ]
            : []),
        ],
      },
    ],
  };
}

function project_plan_field(source: Record<string, any>, key: string) {
  return source[`_${key}`] ?? source[key];
}

function project_plan_source(request: XStudioArtifactRequestView) {
  const session = project_plan_field(request._artifact_request, "planning_session");
  const session_obj = is_obj(session) ? session : null;
  const candidates = [
    project_plan_field(request._artifact_request, "planning"),
    project_plan_field(request._artifact_request, "project_plan"),
    project_plan_field(request._artifact_request, "plan"),
    project_plan_field(request._artifact_request, "updated_plan"),
    project_plan_field(request._artifact_request, "plan_summary"),
    project_plan_field(request._artifact_request, "payload"),
    ...(session_obj
      ? [
        project_plan_field(session_obj, "planning"),
        project_plan_field(session_obj, "project_plan"),
        project_plan_field(session_obj, "plan"),
        project_plan_field(session_obj, "updated_plan"),
        project_plan_field(session_obj, "plan_summary"),
        project_plan_field(session_obj, "payload"),
      ]
      : []),
  ];
  return candidates.find((candidate): candidate is Record<string, any> => is_obj(candidate)) ??
    request._artifact_request;
}

function project_plan_session_source(request: XStudioArtifactRequestView) {
  const session = project_plan_field(request._artifact_request, "planning_session");
  return is_obj(session) ? session : request._artifact_request;
}

function project_plan_first_string(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = artifact_request_string_value(project_plan_field(source, key));
    if (value) return value;
  }
  return "";
}

function project_plan_title(
  request: XStudioArtifactRequestView,
  source: Record<string, any>,
  summary: Record<string, any>,
) {
  return project_plan_first_string(summary, ["title", "name", "project_title", "project_name", "app_title", "app_name"]) ||
    project_plan_first_string(source, ["title", "name", "project_title", "project_name", "app_title", "app_name"]) ||
    artifact_request_string_value(request._artifact_name) ||
    project_plan_first_string(summary, ["goal"]) ||
    project_plan_first_string(source, ["goal", "project_goal", "user_goal"]) ||
    "Untitled project";
}

function project_plan_description(
  source: Record<string, any>,
  summary: Record<string, any>,
  title: string,
) {
  const description = project_plan_first_string(source, ["summary", "description", "overview"]) ||
    project_plan_first_string(summary, ["summary", "description", "overview"]) ||
    project_plan_first_string(summary, ["goal"]) ||
    project_plan_first_string(source, ["goal", "project_goal", "user_goal"]);
  return description && description !== title ? description : "";
}

function project_plan_first_array(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = project_plan_field(source, key);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function project_plan_bool(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = project_plan_field(source, key);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["complete", "completed", "done", "true"].includes(normalized)) return true;
      if (["incomplete", "pending", "open", "false"].includes(normalized)) return false;
    }
  }
  return false;
}

function project_plan_result_source(request: XStudioArtifactRequestView, result: any) {
  const candidates = [
    is_obj(result?._error) ? result._error._details : null,
    is_obj(result?.error) ? result.error.details ?? result.error._details : null,
    is_obj(request._result?._error) ? request._result._error._details : null,
    is_obj(request._result?.error) ? request._result.error.details ?? request._result.error._details : null,
    is_obj(result) ? result._result : null,
    is_obj(result) ? result._error : null,
    result,
    is_obj(request._result) ? request._result._result : null,
    is_obj(request._result) ? request._result._error : null,
    request._result,
  ];
  return candidates.find((candidate): candidate is Record<string, any> =>
    is_obj(candidate) &&
    (
      is_obj(candidate._summary) ||
      Array.isArray(candidate._blockers) ||
      Array.isArray(candidate._warnings) ||
      Array.isArray(candidate._unresolved_required_decisions) ||
      Array.isArray(candidate._unresolved_optional_decisions) ||
      is_obj(candidate._planning) ||
      is_obj(candidate._project_plan)
    )
  ) ?? candidates.find((candidate): candidate is Record<string, any> => is_obj(candidate)) ?? null;
}

function project_plan_readiness_source(
  request: XStudioArtifactRequestView,
  source: Record<string, any>,
  result: any,
) {
  const result_source = project_plan_result_source(request, result);
  const candidates = [
    is_obj(result?._error?._details) ? result._error._details : null,
    is_obj(request._result?._error?._details) ? request._result._error._details : null,
    result_source ? project_plan_field(result_source, "readiness") : null,
    result_source ? project_plan_field(result_source, "confirmation_readiness") : null,
    result_source,
    project_plan_field(source, "confirmation_readiness"),
    project_plan_field(source, "readiness"),
    project_plan_field(source, "confirmation"),
  ];

  return candidates.find((candidate): candidate is Record<string, any> =>
    is_obj(candidate) &&
    (
      candidate._type === "xvibe-initial-planning-confirmation-readiness" ||
      typeof candidate._ready === "boolean" ||
      Array.isArray(candidate._blockers) ||
      Array.isArray(candidate._warnings) ||
      is_obj(candidate._summary)
    )
  ) ?? null;
}

function project_plan_summary_source(
  request: XStudioArtifactRequestView,
  source: Record<string, any>,
  result: any,
) {
  const readiness = project_plan_readiness_source(request, source, result);
  const result_source = project_plan_result_source(request, result);
  const candidates = [
    readiness ? project_plan_field(readiness, "summary") : null,
    result_source ? project_plan_field(result_source, "summary") : null,
    source,
  ];
  return candidates.find((candidate): candidate is Record<string, any> => is_obj(candidate)) ?? source;
}

function project_plan_current_question(request: XStudioArtifactRequestView) {
  const session = project_plan_session_source(request);
  const candidates = [
    project_plan_field(session, "current_question"),
    project_plan_field(session, "question"),
    project_plan_field(request._artifact_request, "current_question"),
    project_plan_field(request._artifact_request, "question"),
  ];
  return candidates.find((candidate): candidate is Record<string, any> => is_obj(candidate)) ?? null;
}

function project_plan_question_title(question: Record<string, any>) {
  return artifact_request_string_value(
    question._title ??
    question.title ??
    question._label ??
    question.label ??
    question._name ??
    question.name,
  ) || project_plan_semantic_label_for_key(artifact_request_string_value(
    question._semantic_key ??
    question.semantic_key ??
    question._key ??
    question.key ??
    question._id ??
    question.id,
  )) || "Decision";
}

function project_plan_question_text(question: Record<string, any>) {
  return artifact_request_string_value(
    question._text ??
    question.text ??
    question._question ??
    question.question ??
    question._prompt ??
    question.prompt ??
    question._description ??
    question.description,
  );
}

function project_plan_suggestion_text(value: any) {
  if (!is_obj(value)) return artifact_request_string_value(value);

  return artifact_request_string_value(
    value._label ??
    value.label ??
    value._answer ??
    value.answer ??
    value._text ??
    value.text ??
    value._title ??
    value.title ??
    value._value ??
    value.value ??
    value._id ??
    value.id,
  );
}

function project_plan_question_suggestions(question: Record<string, any>) {
  const raw = question._suggestions ??
    question.suggestions ??
    question._options ??
    question.options ??
    question._answers ??
    question.answers;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => project_plan_suggestion_text(item))
    .filter(Boolean);
}

function project_plan_question_type(question: Record<string, any>) {
  const raw_type = artifact_request_string_value(
    question._type ??
    question.type ??
    question._question_type ??
    question.question_type,
  ).toLowerCase();

  if (raw_type === "single" || raw_type === "multi" || raw_type === "text") return raw_type;
  if (raw_type === "single_choice" || raw_type === "boolean" || raw_type === "confirmation") return "single";
  if (raw_type === "multiple_choice") return "multi";
  if (raw_type === "short_text" || raw_type === "long_text" || raw_type === "number") return "text";
  return "text";
}

function project_plan_number_value(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function project_plan_first_number(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = project_plan_number_value(project_plan_field(source, key));
    if (value !== null) return value;
  }
  return null;
}

function project_plan_progress(
  request: XStudioArtifactRequestView,
  source: Record<string, any>,
  question: Record<string, any> | null,
) {
  const session = project_plan_session_source(request);
  const progress_candidates = [
    project_plan_field(session, "progress"),
    question ? project_plan_field(question, "progress") : null,
    project_plan_field(request._artifact_request, "progress"),
    project_plan_field(source, "progress"),
  ];
  const progress_text = progress_candidates
    .map((candidate) => artifact_request_string_value(candidate))
    .find((candidate) => /^\d+\s*\/\s*\d+$/.test(candidate));
  if (progress_text) return progress_text.replace(/\s*\/\s*/, " / ");

  const progress_obj = progress_candidates.find((candidate): candidate is Record<string, any> => is_obj(candidate)) ?? null;
  const current_one_based =
    (progress_obj ? project_plan_first_number(progress_obj, ["current", "question", "step", "current_question"]) : null) ??
    project_plan_first_number(session, ["current_question_number", "question_number", "current_step", "step_number"]) ??
    (question ? project_plan_first_number(question, ["number", "position", "step_number"]) : null) ??
    project_plan_first_number(request._artifact_request, ["current_question_number", "question_number", "current_step", "step_number"]) ??
    project_plan_first_number(source, ["current_question_number", "question_number", "current_step", "step_number"]);
  const current_index =
    (progress_obj ? project_plan_first_number(progress_obj, ["current_index", "question_index", "index"]) : null) ??
    project_plan_first_number(session, ["current_question_index", "question_index", "current_index", "index"]) ??
    (question ? project_plan_first_number(question, ["question_index", "index"]) : null) ??
    project_plan_first_number(request._artifact_request, ["current_question_index", "question_index", "current_index", "index"]) ??
    project_plan_first_number(source, ["current_question_index", "question_index", "current_index", "index"]);
  const total =
    (progress_obj ? project_plan_first_number(progress_obj, ["total", "total_questions", "question_count", "total_steps"]) : null) ??
    project_plan_first_number(session, ["total_questions", "question_count", "total", "total_steps"]) ??
    project_plan_first_number(request._artifact_request, ["total_questions", "question_count", "total", "total_steps"]) ??
    project_plan_first_number(source, ["total_questions", "question_count", "total", "total_steps"]);
  const current = current_one_based ?? (current_index !== null ? current_index + 1 : null);

  if (current === null || total === null || current < 1 || total < 1) return "";
  return `${Math.min(current, total)} / ${total}`;
}

function project_plan_is_complete(request: XStudioArtifactRequestView, source: Record<string, any>) {
  const session = project_plan_session_source(request);
  const status = artifact_request_string_value(
    project_plan_field(source, "planning_status") ?? project_plan_field(source, "status"),
  ).toLowerCase();
  return project_plan_bool(session, ["complete", "completed", "is_complete", "planning_complete"]) ||
    project_plan_bool(request._artifact_request, ["complete", "completed", "is_complete", "planning_complete"]) ||
    project_plan_bool(source, ["complete", "completed", "is_complete", "planning_complete"]) ||
    ["complete", "ready-for-confirmation", "ready_for_confirmation", "ready-to-confirm", "confirmed"].includes(status);
}

function project_plan_display_label(value: any) {
  const direct = artifact_request_string_value(value);
  if (direct) return direct;

  if (!is_obj(value)) return "";
  const candidate = artifact_request_string_value(
    value._label ??
    value.label ??
    value._title ??
    value.title ??
    value._name ??
    value.name ??
    value._id ??
    value.id,
  );
  if (candidate) return candidate;

  return _xu.safe_compact_inline_json(value, 180) || "";
}

function project_plan_title_case(value: string) {
  return value
    .replace(/^_+/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : "")
    .filter(Boolean)
    .join(" ");
}

function project_plan_sentence_label(value: string) {
  const title = project_plan_title_case(value);
  if (!title) return "";
  return `${title.charAt(0).toUpperCase()}${title.slice(1).toLowerCase()}`;
}

function project_plan_option_label(question: Record<string, any> | null | undefined, raw_value: any) {
  const raw = artifact_request_string_value(raw_value);
  if (!question || !raw) return "";
  const options = question._options ?? question.options ?? question._suggestions ?? question.suggestions ?? [];
  if (!Array.isArray(options)) return "";

  for (const option of options) {
    if (!is_obj(option)) continue;
    const option_id = artifact_request_string_value(
      option._id ?? option.id ?? option._value ?? option.value ?? option._answer ?? option.answer,
    );
    if (option_id !== raw) continue;
    return artifact_request_string_value(
      option._label ?? option.label ?? option._title ?? option.title ?? option._text ?? option.text,
    ) || project_plan_sentence_label(raw);
  }

  return "";
}

function project_plan_value_text(value: any, question?: Record<string, any> | null) {
  if (Array.isArray(value)) {
    return value
      .map((item) => project_plan_option_label(question, item) || project_plan_display_label(item))
      .filter(Boolean)
      .join(", ");
  }
  return project_plan_option_label(question, value) || project_plan_display_label(value);
}

function project_plan_array_from_fields(source: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = project_plan_field(source, key);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function project_plan_proposed_array(
  source: Record<string, any>,
  summary: Record<string, any>,
  section: "entities" | "views" | "flows" | "capabilities" | "milestones",
) {
  if (section === "entities") {
    return project_plan_array_from_fields(summary, ["proposed_entities", "entities"]).length > 0
      ? project_plan_array_from_fields(summary, ["proposed_entities", "entities"])
      : project_plan_array_from_fields(source, ["proposed_entities", "entities"]);
  }
  if (section === "views") {
    return project_plan_array_from_fields(summary, ["proposed_views", "views"]).length > 0
      ? project_plan_array_from_fields(summary, ["proposed_views", "views"])
      : project_plan_array_from_fields(source, ["proposed_views", "views"]);
  }
  if (section === "flows") {
    return project_plan_array_from_fields(summary, ["proposed_flows", "flows"]).length > 0
      ? project_plan_array_from_fields(summary, ["proposed_flows", "flows"])
      : project_plan_array_from_fields(source, ["proposed_flows", "flows"]);
  }
  if (section === "capabilities") {
    return project_plan_array_from_fields(summary, ["capabilities"]).length > 0
      ? project_plan_array_from_fields(summary, ["capabilities"])
      : project_plan_array_from_fields(source, ["capabilities"]);
  }
  return project_plan_array_from_fields(summary, ["milestones"]).length > 0
    ? project_plan_array_from_fields(summary, ["milestones"])
    : project_plan_array_from_fields(source, ["milestones", "plan_milestones"]);
}

function project_plan_proposed_from_compat(
  source: Record<string, any>,
  section: "entities" | "views" | "flows",
) {
  const proposed = project_plan_field(source, "proposed");
  if (!is_obj(proposed)) return [];
  if (section === "entities") return project_plan_array_from_fields(proposed, ["entities"]);
  if (section === "views") return project_plan_array_from_fields(proposed, ["views"]);
  return project_plan_array_from_fields(proposed, ["flows"]);
}

function project_plan_section_items(
  source: Record<string, any>,
  summary: Record<string, any>,
  section: "entities" | "views" | "flows" | "capabilities" | "milestones",
) {
  const semantic = project_plan_proposed_array(source, summary, section);
  if (semantic.length > 0) return semantic;
  if (section === "entities" || section === "views" || section === "flows") {
    return project_plan_proposed_from_compat(source, section);
  }
  return [];
}

function project_plan_question_by_id(source: Record<string, any>) {
  const questions = project_plan_first_array(source, ["questions", "missing_questions", "planning_questions"]);
  const map = new Map<string, Record<string, any>>();
  for (const question of questions) {
    if (!is_obj(question)) continue;
    const ids = [
      artifact_request_string_value(question._id ?? question.id),
      artifact_request_string_value(question._key ?? question.key),
      artifact_request_string_value(question._semantic_key ?? question.semantic_key),
      artifact_request_string_value(question._name ?? question.name),
    ].filter(Boolean);
    for (const id of ids) map.set(id, question);
  }
  return map;
}

function project_plan_semantic_label_for_key(key: string) {
  const normalized = (_xu.normalize_id(key) ?? "").replace(/-/g, "_");
  const labels: Record<string, string> = {
    primary_user: "Primary user",
    core_concept: "Core records",
    core_entities: "Core entities",
    list_structure: "List structure",
    sync_behavior: "Synchronization",
  };
  return labels[normalized] ?? project_plan_sentence_label(key);
}

function project_plan_question_label(question: Record<string, any> | null | undefined) {
  if (!question) return "";
  return artifact_request_string_value(
    question._label ??
    question.label ??
    question._title ??
    question.title ??
    question._name ??
    question.name,
  );
}

function project_plan_semantic_row_label(
  item: any,
  questions: Map<string, Record<string, any>>,
) {
  const id = artifact_request_string_value(is_obj(item) ? item._id ?? item.id ?? item._question_id ?? item.question_id : item);
  const semantic_key = artifact_request_string_value(is_obj(item) ? item._semantic_key ?? item.semantic_key ?? item._key ?? item.key : "");
  const question = questions.get(id) ?? questions.get(semantic_key);
  return artifact_request_string_value(is_obj(item) ? item._label ?? item.label : "") ||
    project_plan_question_label(question) ||
    project_plan_semantic_label_for_key(semantic_key || id);
}

function project_plan_source_label(value: any) {
  const raw = artifact_request_string_value(value);
  const normalized = (_xu.normalize_id(raw) ?? "").replace(/-/g, "_");
  if (!normalized) return "";
  const labels: Record<string, string> = {
    initial_vision_fact_extraction: "From your description",
    fact_extraction: "From your description",
    from_description: "From your description",
    user_answer: "Confirmed by you",
    planning_answer_application: "Confirmed by you",
    confirmed_by_user: "Confirmed by you",
    visual_xpell: "Suggested by Visual Xpell",
    suggested_by_visual_xpell: "Suggested by Visual Xpell",
    default: "Suggested by Visual Xpell",
    inferred: "Suggested by Visual Xpell",
  };
  return labels[normalized] ?? project_plan_sentence_label(raw);
}

function project_plan_decision_from_answer(
  question_id: string,
  answer: any,
  source: Record<string, any>,
) {
  const questions = project_plan_question_by_id(source);
  const question = questions.get(question_id);
  const answer_obj = is_obj(answer) ? answer : null;
  const value = answer_obj ? answer_obj._value ?? answer_obj.value ?? answer_obj._answer ?? answer_obj.answer : answer;
  const state = artifact_request_string_value(
    answer_obj?._state ??
    answer_obj?.state ??
    answer_obj?._answer_state ??
    question?._answer_state,
  ) || "confirmed";

  return {
    _id: question_id,
    _label: project_plan_semantic_row_label({
      _id: question_id,
      _semantic_key: question?._semantic_key ?? question?.semantic_key,
    }, questions),
    _value: value,
    _state: state,
    _source: artifact_request_string_value(answer_obj?._source ?? answer_obj?.source),
    _affected_plan_sections: Array.isArray(question?._affected_plan_sections)
      ? question!._affected_plan_sections
      : [],
  };
}

function project_plan_decision_rows(
  source: Record<string, any>,
  readiness: Record<string, any> | null,
  summary: Record<string, any>,
  keys: string[],
) {
  for (const key of keys) {
    const value = readiness ? project_plan_field(readiness, key) : undefined;
    if (Array.isArray(value)) return value;
    const summary_value = project_plan_field(summary, key);
    if (Array.isArray(summary_value)) return summary_value;
  }

  const answers = project_plan_field(source, "answers");
  if (!is_obj(answers)) return [];
  return Object.entries(answers).map(([question_id, answer]) =>
    project_plan_decision_from_answer(question_id, answer, source)
  );
}

function project_plan_normalized_decision_rows(
  rows: any[],
  source: Record<string, any>,
) {
  const questions = project_plan_question_by_id(source);
  return rows
    .filter((row) => is_obj(row))
    .map((row) => {
      const id = artifact_request_string_value(row._id ?? row.id ?? row._question_id ?? row.question_id);
      const semantic_key = artifact_request_string_value(row._semantic_key ?? row.semantic_key ?? row._key ?? row.key);
      return {
        ...row,
        _id: id || semantic_key || project_plan_display_label(row),
        _label: project_plan_semantic_row_label(row, questions),
      };
    });
}

function project_plan_row_identity(item: any) {
  if (!is_obj(item)) return project_plan_display_label(item);
  return artifact_request_string_value(item._id ?? item.id ?? item._question_id ?? item.question_id ?? item._semantic_key ?? item.semantic_key) ||
    artifact_request_string_value(item._label ?? item.label) ||
    project_plan_display_label(item);
}

function project_plan_unique_rows(rows: any[], exclude_ids: Set<string> = new Set()) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = project_plan_row_identity(row);
    if (!id || exclude_ids.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function project_plan_assumption_rows(
  source: Record<string, any>,
  readiness: Record<string, any> | null,
  summary: Record<string, any>,
) {
  const direct = project_plan_decision_rows(source, readiness, summary, ["inferred_assumptions"]);
  if (direct.length > 0) return direct;
  return project_plan_first_array(source, ["assumptions"]).map((assumption) => {
    if (!is_obj(assumption)) return assumption;
    return {
      _id: assumption._id ?? assumption.id ?? project_plan_display_label(assumption),
      _label: assumption._label ?? assumption.label ?? assumption._title ?? assumption.title ?? assumption._id,
      _value: assumption._value ?? assumption.value ?? assumption._text ?? assumption.text ?? assumption._summary ?? assumption.summary,
      _state: assumption._state ?? assumption.state ?? "inferred",
      _source: assumption._source ?? assumption.source,
      _affected_plan_sections: assumption._affected_plan_sections ?? [],
    };
  });
}

function project_plan_fact_rows(
  source: Record<string, any>,
  summary: Record<string, any>,
  readiness: Record<string, any> | null,
) {
  const direct = [
    ...project_plan_array_from_fields(summary, ["understood", "understood_facts", "known_facts", "explicit_facts", "facts"]),
    ...project_plan_array_from_fields(readiness ?? {}, ["understood", "understood_facts", "known_facts", "explicit_facts", "facts"]),
    ...project_plan_array_from_fields(source, ["understood", "understood_facts", "known_facts", "explicit_facts", "facts"]),
  ];
  const rows: any[] = direct.flatMap((fact) => {
    if (typeof fact === "string") {
      return [{
        _id: fact,
        _label: project_plan_semantic_label_for_key(fact),
        _value: project_plan_sentence_label(fact),
        _source: "initial_vision_fact_extraction",
      }];
    }
    if (!is_obj(fact)) return [];
    return [{
      _id: fact._id ?? fact.id ?? fact._semantic_key ?? fact.semantic_key ?? fact._key ?? fact.key ?? project_plan_display_label(fact),
      _semantic_key: fact._semantic_key ?? fact.semantic_key ?? fact._key ?? fact.key,
      _label: fact._label ?? fact.label ?? fact._title ?? fact.title,
      _value: fact._value ?? fact.value ?? fact._answer ?? fact.answer ?? fact._text ?? fact.text ?? fact._summary ?? fact.summary,
      _source: fact._source ?? fact.source ?? "initial_vision_fact_extraction",
    }];
  });

  for (const key of ["primary_user", "core_concept", "core_entities"]) {
    const value = project_plan_field(summary, key) ?? project_plan_field(source, key);
    const text = project_plan_value_text(value);
    if (!text) continue;
    rows.push({
      _id: key,
      _semantic_key: key,
      _label: project_plan_semantic_label_for_key(key),
      _value: text,
      _source: "initial_vision_fact_extraction",
    });
  }

  const questions = project_plan_question_by_id(source);
  return project_plan_unique_rows(rows).map((row) => ({
    ...row,
    _label: project_plan_semantic_row_label(row, questions),
  }));
}

function project_plan_status_rows(value: any[], fallback_section: string) {
  return value.flatMap((item) => {
    if (typeof item === "string") {
      return [{
        _id: item,
        _message: project_plan_title_case(item),
        _section: fallback_section,
      }];
    }
    if (!is_obj(item)) return [];
    return [{
      _id: artifact_request_string_value(item._id ?? item.id) || project_plan_display_label(item),
      _message: artifact_request_string_value(item._message ?? item.message ?? item._reason ?? item.reason) ||
        project_plan_display_label(item),
      _section: artifact_request_string_value(item._section ?? item.section) || fallback_section,
      _question_id: artifact_request_string_value(item._question_id ?? item.question_id),
    }];
  });
}

function project_plan_warning_rows(
  source: Record<string, any>,
  readiness: Record<string, any> | null,
  summary: Record<string, any>,
) {
  const rows = [
    ...project_plan_status_rows(project_plan_array_from_fields(readiness ?? {}, ["warnings"]), "warnings"),
    ...project_plan_status_rows(project_plan_array_from_fields(summary, ["warnings"]), "warnings"),
    ...project_plan_status_rows(project_plan_first_array(source, ["warnings"]), "warnings"),
  ];
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row._id || row._message;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function project_plan_unresolved_optional_rows(
  source: Record<string, any>,
  readiness: Record<string, any> | null,
) {
  const direct = project_plan_array_from_fields(readiness ?? {}, ["unresolved_optional_decisions"]);
  const questions = project_plan_question_by_id(source);
  const fallback = direct.length > 0
    ? direct
    : project_plan_first_array(source, ["questions", "missing_questions", "planning_questions"])
      .filter((question) => is_obj(question) && question._required === false && !question._answer)
      .map((question) => is_obj(question) ? question._id : "");

  return fallback
    .map((item) => {
      const id = artifact_request_string_value(item);
      const question = id ? questions.get(id) : null;
      const label = question
        ? artifact_request_string_value(question._label ?? question.label) || project_plan_question_title(question)
        : project_plan_semantic_label_for_key(id);
      return id || label
        ? {
          _id: id || label,
          _message: `Optional decision unresolved: ${label || id}`,
          _section: "questions",
          _question_id: id,
        }
        : null;
    })
    .filter((row): row is any => row !== null);
}

function project_plan_blocker_rows(
  request: XStudioArtifactRequestView,
  source: Record<string, any>,
  readiness: Record<string, any> | null,
  summary: Record<string, any>,
  question: Record<string, any> | null,
) {
  const direct_rows = project_plan_unique_rows([
    ...project_plan_status_rows(project_plan_array_from_fields(readiness ?? {}, ["blockers"]), "questions"),
    ...project_plan_status_rows(project_plan_array_from_fields(summary, ["blockers"]), "questions"),
  ]);
  if (direct_rows.length > 0) return direct_rows;

  const unresolved = [
    ...project_plan_first_array(source, ["unanswered_required_question_ids", "unanswered"]),
    ...project_plan_array_from_fields(readiness ?? {}, ["unresolved_required_decisions"]),
  ];
  const questions = project_plan_question_by_id(source);
  const rows = unresolved.flatMap((item) => {
    const id = artifact_request_string_value(item);
    const label = questions.get(id)
      ? project_plan_question_title(questions.get(id)!)
      : project_plan_semantic_label_for_key(id);
    return id || label
      ? [{
        _id: id || label,
        _message: label || id,
        _section: "questions",
        _question_id: id,
      }]
      : [];
  });

  if (rows.length === 0 && question && request._status !== ARTIFACT_REQUEST_STATUS_DONE) {
    rows.push({
      _id: artifact_request_string_value(question._id ?? question.id) || "current_question",
      _message: `Answer required: ${project_plan_question_title(question)}`,
      _section: "questions",
      _question_id: artifact_request_string_value(question._id ?? question.id),
    });
  }

  return rows;
}

function project_plan_ready_state(input: {
  _request: XStudioArtifactRequestView;
  _source: Record<string, any>;
  _readiness: Record<string, any> | null;
  _summary: Record<string, any>;
  _question: Record<string, any> | null;
  _is_complete: boolean;
  _is_malformed: boolean;
}) {
  if (input._request._status === ARTIFACT_REQUEST_STATUS_DONE) return true;
  if (input._is_malformed) return false;
  const ready = input._readiness ? project_plan_field(input._readiness, "ready") : undefined;
  if (typeof ready === "boolean") return ready;
  if (typeof input._source._ready === "boolean") return input._source._ready;
  if (typeof input._summary._ready === "boolean") return input._summary._ready;
  if (input._question) return false;
  const blockers = project_plan_blocker_rows(
    input._request,
    input._source,
    input._readiness,
    input._summary,
    input._question,
  );
  if (blockers.length > 0) return false;
  return input._is_complete;
}

function project_plan_has_semantic_review(source: Record<string, any>, summary: Record<string, any>) {
  const has_identity = Boolean(
    project_plan_first_string(summary, ["goal"]) ||
    project_plan_first_string(source, ["goal", "project_goal", "user_goal"]) ||
    project_plan_first_string(source, ["summary", "description", "overview"]),
  );
  const has_sections = ["entities", "views", "flows", "capabilities", "milestones"].some((section) =>
    project_plan_section_items(source, summary, section as any).length > 0
  );
  return has_identity || has_sections;
}

function project_plan_item_title(item: any) {
  if (!is_obj(item)) return artifact_request_string_value(item);

  const title = artifact_request_string_value(
    item._title ??
    item.title ??
    item._name ??
    item.name ??
    item._id ??
    item.id ??
    item._question ??
    item.question ??
    item._label ??
    item.label,
  );
  if (title) return title;

  return _xu.safe_compact_inline_json(item, 220) || "";
}

function project_plan_item_detail(item: any) {
  if (!is_obj(item)) return "";

  const direct = artifact_request_string_value(
    item._summary ??
    item.summary ??
    item._description ??
    item.description ??
    item._reason ??
    item.reason,
  );
  if (direct) return direct;

  const fields = item._fields ?? item.fields;
  if (Array.isArray(fields) && fields.length > 0) {
    const labels = fields
      .map((field) => project_plan_item_title(field))
      .filter(Boolean);
    if (labels.length > 0) return `Fields: ${labels.join(", ")}`;
  }

  return "";
}

function project_plan_item_row(
  item: any,
  options: {
    _message_index: number;
    _section_id: string;
    _item_index: number;
  },
): Record<string, any> | null {
  const title = project_plan_item_title(item);
  const detail = project_plan_item_detail(item);
  const text = detail ? `${title}: ${detail}` : title;
  if (!text) return null;

  return {
    _type: "label",
    _id: `xstudio-project-plan-${options._message_index}-${options._section_id}-${options._item_index}`,
    class: "xstudio-artifact-request-detail xstudio-project-plan-item",
    _text: `• ${text}`,
  };
}

function project_plan_section(
  options: {
    _message_index: number;
    _section_id: string;
    _title: string;
    _items: any[];
  },
) {
  const rows = options._items
    .map((item, item_index) => project_plan_item_row(item, {
      _message_index: options._message_index,
      _section_id: options._section_id,
      _item_index: item_index,
    }))
    .filter((row): row is any => row !== null);

  return {
    _type: "view",
    _id: `xstudio-project-plan-section-${options._message_index}-${options._section_id}`,
    class: "xstudio-project-plan-section",
    _children: [
      {
        _type: "label",
        class: "xstudio-artifact-request-details-label xstudio-project-plan-section-title",
        _text: options._title,
      },
      ...(rows.length > 0
        ? rows
        : [
          {
            _type: "label",
            class: "xstudio-artifact-request-detail xstudio-project-plan-empty",
            _text: "None yet.",
          },
        ]),
    ],
  };
}

function project_plan_state_badge(kind: string, label: string) {
  return {
    _type: "label",
    class: `xstudio-project-plan-badge xstudio-project-plan-badge-${kind}`,
    _text: label,
    "aria-label": label,
  };
}

function project_plan_artifact_count(
  source: Record<string, any>,
  summary: Record<string, any>,
  section: "entities" | "views" | "flows" | "milestones",
) {
  return project_plan_section_items(source, summary, section).length;
}

function project_plan_count_label(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function project_plan_metric_summary(source: Record<string, any>, summary: Record<string, any>) {
  const entity_count = project_plan_artifact_count(source, summary, "entities");
  const view_count = project_plan_artifact_count(source, summary, "views");
  const action_count = project_plan_artifact_count(source, summary, "flows");
  return [
    project_plan_count_label(entity_count, "entity", "entities"),
    project_plan_count_label(view_count, "view", "views"),
    project_plan_count_label(action_count, "action", "actions"),
  ].join(" · ");
}

function project_plan_remaining_decisions_label(count: number) {
  return project_plan_count_label(count, "decision", "decisions") + " remaining";
}

function project_plan_blocker_is_required_decision(blocker: any) {
  const id = artifact_request_string_value(is_obj(blocker) ? blocker._id ?? blocker.id : blocker);
  const message = artifact_request_string_value(is_obj(blocker) ? blocker._message ?? blocker.message : blocker);
  const section = artifact_request_string_value(is_obj(blocker) ? blocker._section ?? blocker.section : "");
  const question_id = artifact_request_string_value(is_obj(blocker) ? blocker._question_id ?? blocker.question_id : "");
  const normalized = `${id} ${message} ${section}`.toLowerCase();
  if (question_id) return true;
  if (section === "questions" && normalized.includes("required")) return true;
  return normalized.includes("required_decision_unresolved") ||
    normalized.includes("unresolved_required") ||
    normalized.includes("answer required");
}

function project_plan_required_decision_count(blockers: any[]) {
  return blockers.filter((blocker) => project_plan_blocker_is_required_decision(blocker)).length;
}

function project_plan_has_genuine_blocker(input: {
  _status: string;
  _error: any;
  _result: any;
  _malformed: boolean;
  _blockers: any[];
}) {
  if (input._malformed) return true;
  if (input._blockers.some((blocker) => !project_plan_blocker_is_required_decision(blocker))) return true;

  const source = artifact_request_error_source(input._error, input._result);
  const recoverable = source?._recoverable ?? source?.recoverable;
  if (recoverable === false) return true;

  const code = artifact_request_string_value(source?._code ?? source?.code).toLowerCase();
  const planning_incomplete = code === "e_planning_incomplete" ||
    code === "planning_incomplete" ||
    code === "project_plan_incomplete";
  if (planning_incomplete) return false;

  const has_required_decisions = project_plan_required_decision_count(input._blockers) > 0;
  if (input._status === ARTIFACT_REQUEST_STATUS_FAILED) {
    return !has_required_decisions || Boolean(source);
  }

  return false;
}

function project_plan_overview_panel(options: {
  _message_index: number;
  _title: string;
  _description: string;
  _metrics: string;
  _remaining_decision_count: number;
}) {
  return {
    _type: "view",
    _id: `xstudio-project-plan-overview-${options._message_index}`,
    class: "xstudio-project-plan-overview",
    _children: [
      {
        _type: "label",
        class: "xstudio-artifact-request-title xstudio-project-plan-title",
        _text: options._title || "Untitled project",
      },
      ...(options._description
        ? [
          {
            _type: "label",
            class: "xstudio-project-plan-description",
            _text: options._description,
          },
        ]
        : []),
      {
        _type: "view",
        class: "xstudio-project-plan-meta-row",
        _children: [
          {
            _type: "label",
            class: "xstudio-project-plan-metrics",
            _text: options._metrics,
          },
          ...(options._remaining_decision_count > 0
            ? [
              {
                _type: "label",
                class: "xstudio-project-plan-remaining-decisions",
                _text: project_plan_remaining_decisions_label(options._remaining_decision_count),
              },
            ]
            : []),
        ],
      },
    ],
  };
}

function project_plan_readiness_label(input: {
  _malformed: boolean;
  _is_ready: boolean;
  _is_done: boolean;
  _blocker_count: number;
  _has_active_question: boolean;
  _has_genuine_blocker: boolean;
}) {
  if (input._is_done) return { _kind: "confirmed", _label: "Confirmed" };
  if (input._malformed || input._has_genuine_blocker) {
    return { _kind: "blocked", _label: "Blocked" };
  }
  if (input._is_ready) return { _kind: "confirmed", _label: "Ready to review" };
  if (input._blocker_count > 0 || input._has_active_question) {
    return { _kind: "inferred", _label: "Planning" };
  }
  return { _kind: "inferred", _label: "Planning" };
}

function project_plan_review_toggle_button(
  request: XStudioArtifactRequestView,
  options: {
    _message_index: number;
    _expanded: boolean;
  },
) {
  return {
    _type: "button",
    _id: `xstudio-project-plan-review-toggle-${options._message_index}`,
    type: "button",
    class: "xstudio-intent-action-button xstudio-intent-action-dismiss xstudio-project-plan-review-toggle",
    _text: options._expanded ? "Hide details" : "Show details",
    title: options._expanded ? "Hide plan details" : "Show plan details",
    _on: {
      click: {
        _module: "xem",
        _op: "fire",
        _params: {
          event: "studio:project-plan-review-toggle",
          data: xstudio_artifact_request_event_payload(request),
        },
      },
    },
  };
}

function project_plan_open_guide_button(options: {
  _message_index: number;
}) {
  return {
    _type: "button",
    _id: `xstudio-project-plan-open-guide-${options._message_index}`,
    type: "button",
    class: "xstudio-intent-action-button xstudio-intent-action-apply xstudio-project-plan-open-guide",
    _text: "Open guide",
    title: "Open build guide",
    _on: {
      click: {
        _module: "xem",
        _op: "fire",
        _params: {
          event: "studio:guide-open",
          data: {
            _source: "project-plan-card",
            _message_index: options._message_index,
          },
        },
      },
    },
  };
}

function project_plan_compact_review(
  request: XStudioArtifactRequestView,
  options: {
    _message_index: number;
    _is_done: boolean;
    _is_ready: boolean;
    _blockers: any[];
    _has_active_question: boolean;
    _has_genuine_blocker: boolean;
    _malformed: boolean;
  },
) {
  const readiness = project_plan_readiness_label({
    _malformed: options._malformed,
    _is_ready: options._is_ready,
    _is_done: options._is_done,
    _blocker_count: options._blockers.length,
    _has_active_question: options._has_active_question,
    _has_genuine_blocker: options._has_genuine_blocker,
  });
  return {
    _type: "view",
    _id: `xstudio-project-plan-compact-${options._message_index}`,
    class: "xstudio-project-plan-compact-review",
    _children: [
      {
        _type: "view",
        class: "xstudio-project-plan-compact-header",
        _children: [
          project_plan_state_badge(readiness._kind, readiness._label),
          project_plan_review_toggle_button(request, {
            _message_index: options._message_index,
            _expanded: false,
          }),
        ],
      },
    ],
  };
}

function project_plan_fact(label: string, value: string) {
  return {
    _type: "view",
    class: "xstudio-project-plan-fact",
    _children: [
      {
        _type: "label",
        class: "xstudio-project-plan-fact-label",
        _text: label,
      },
      {
        _type: "label",
        class: "xstudio-project-plan-fact-value",
        _text: value || "Not specified",
      },
    ],
  };
}

function project_plan_review_item(
  item: any,
  options: {
    _message_index: number;
    _section_id: string;
    _item_index: number;
  },
) {
  const title = project_plan_item_title(item);
  const detail = project_plan_item_detail(item);
  const text = title || detail;
  if (!text) return null;
  return {
    _type: "view",
    _id: `xstudio-project-plan-review-${options._message_index}-${options._section_id}-${options._item_index}`,
    class: "xstudio-project-plan-review-item",
    _children: [
      {
        _type: "label",
        class: "xstudio-project-plan-review-item-title",
        _text: title || detail,
      },
      ...(detail && detail !== title
        ? [
          {
            _type: "label",
            class: "xstudio-project-plan-review-item-detail",
            _text: detail,
          },
        ]
        : []),
    ],
  };
}

function project_plan_review_section(
  options: {
    _message_index: number;
    _section_id: string;
    _title: string;
    _items: any[];
    _empty_text?: string;
    _omit_when_empty?: boolean;
    _collapsed?: boolean;
  },
) {
  const rows = options._items
    .map((item, item_index) => project_plan_review_item(item, {
      _message_index: options._message_index,
      _section_id: options._section_id,
      _item_index: item_index,
    }))
    .filter((row): row is any => row !== null);
  if (rows.length === 0 && options._omit_when_empty) return null;

  const content = [
    ...(rows.length > 0
      ? rows
      : [
        {
          _type: "label",
          class: "xstudio-project-plan-empty",
          _text: options._empty_text || "Nothing to review yet.",
        },
      ]),
  ];
  if (options._collapsed) {
    return {
      _type: "xhtml",
      _html_tag: "details",
      _id: `xstudio-project-plan-review-section-${options._message_index}-${options._section_id}`,
      class: "xstudio-project-plan-review-section xstudio-project-plan-review-section-collapsed",
      _children: [
        {
          _type: "xhtml",
          _html_tag: "summary",
          class: "xstudio-project-plan-review-section-header",
          _children: [
            {
              _type: "label",
              class: "xstudio-project-plan-review-section-title",
              _text: options._title,
            },
            project_plan_state_badge("count", String(rows.length)),
          ],
        },
        ...content,
      ],
    };
  }

  return {
    _type: "view",
    _id: `xstudio-project-plan-review-section-${options._message_index}-${options._section_id}`,
    class: "xstudio-project-plan-review-section",
    _children: [
      {
        _type: "view",
        class: "xstudio-project-plan-review-section-header",
        _children: [
          {
            _type: "label",
            class: "xstudio-project-plan-review-section-title",
            _text: options._title,
          },
          project_plan_state_badge("count", String(rows.length)),
        ],
      },
      ...content,
    ],
  };
}

function project_plan_decision_state_kind(state: string) {
  const normalized = state.trim().toLowerCase();
  if (normalized === "default") return "default";
  if (normalized === "inferred" || normalized === "unknown") return "inferred";
  return "confirmed";
}

function project_plan_decision_row(
  decision: any,
  options: {
    _message_index: number;
    _section_id: string;
    _item_index: number;
    _source: Record<string, any>;
  },
) {
  if (!is_obj(decision)) return null;
  const questions = project_plan_question_by_id(options._source);
  const question_id = artifact_request_string_value(decision._question_id ?? decision.question_id ?? decision._id ?? decision.id);
  const semantic_key = artifact_request_string_value(decision._semantic_key ?? decision.semantic_key ?? decision._key ?? decision.key);
  const question = questions.get(question_id) ?? questions.get(semantic_key);
  const label = project_plan_semantic_row_label(decision, questions) || "Decision";
  const state = artifact_request_string_value(decision._state ?? decision.state) || "confirmed";
  const value = project_plan_value_text(decision._value ?? decision.value ?? decision._answer ?? decision.answer, question);
  const source = project_plan_source_label(decision._source ?? decision.source);
  const affected = Array.isArray(decision._affected_plan_sections)
    ? decision._affected_plan_sections.map((item: any) => project_plan_display_label(item)).filter(Boolean)
    : [];
  const effect = affected.length > 0
    ? `${label}: ${value || state} affects ${affected.join(", ")}.`
    : "";

  return {
    _type: "view",
    _id: `xstudio-project-plan-decision-${options._message_index}-${options._section_id}-${options._item_index}`,
    class: "xstudio-project-plan-decision-row",
    _children: [
      {
        _type: "view",
        class: "xstudio-project-plan-decision-main",
        _children: [
          {
            _type: "label",
            class: "xstudio-project-plan-decision-label",
            _text: label,
          },
          project_plan_state_badge(project_plan_decision_state_kind(state), project_plan_title_case(state)),
        ],
      },
      ...(value
        ? [
          {
            _type: "label",
            class: "xstudio-project-plan-decision-value",
            _text: value,
          },
        ]
        : []),
      ...(source
        ? [
          {
            _type: "label",
            class: "xstudio-project-plan-decision-source",
            _text: source,
          },
        ]
        : []),
      ...(effect
        ? [
          {
            _type: "label",
            class: "xstudio-project-plan-decision-effect",
            _text: effect,
          },
        ]
        : []),
    ],
  };
}

function project_plan_decision_section(
  options: {
    _message_index: number;
    _section_id: string;
    _title: string;
    _kind: string;
    _items: any[];
    _source: Record<string, any>;
    _collapsed?: boolean;
  },
) {
  const rows = options._items
    .map((item, item_index) => project_plan_decision_row(item, {
      _message_index: options._message_index,
      _section_id: options._section_id,
      _item_index: item_index,
      _source: options._source,
    }))
    .filter((row): row is any => row !== null);
  if (rows.length === 0) return null;

  if (options._collapsed) {
    return {
      _type: "xhtml",
      _html_tag: "details",
      _id: `xstudio-project-plan-decision-section-${options._message_index}-${options._section_id}`,
      class: `xstudio-project-plan-decision-section xstudio-project-plan-decision-section-${options._kind} xstudio-project-plan-decision-section-collapsed`,
      _children: [
        {
          _type: "xhtml",
          _html_tag: "summary",
          class: "xstudio-project-plan-review-section-header",
          _children: [
            {
              _type: "label",
              class: "xstudio-project-plan-review-section-title",
              _text: options._title,
            },
            project_plan_state_badge(options._kind, String(rows.length)),
          ],
        },
        ...rows,
      ],
    };
  }

  return {
    _type: "view",
    _id: `xstudio-project-plan-decision-section-${options._message_index}-${options._section_id}`,
    class: `xstudio-project-plan-decision-section xstudio-project-plan-decision-section-${options._kind}`,
    _children: [
      {
        _type: "view",
        class: "xstudio-project-plan-review-section-header",
        _children: [
          {
            _type: "label",
            class: "xstudio-project-plan-review-section-title",
            _text: options._title,
          },
          project_plan_state_badge(options._kind, String(rows.length)),
        ],
      },
      ...rows,
    ],
  };
}

function project_plan_status_section(
  options: {
    _message_index: number;
    _section_id: string;
    _title: string;
    _kind: "warning" | "blocked" | "optional" | "planning";
    _items: any[];
    _collapsed?: boolean;
  },
) {
  if (options._items.length === 0) return null;
  const rows = options._kind === "planning"
    ? [
      {
        _type: "label",
        _id: `xstudio-project-plan-status-${options._message_index}-${options._section_id}-count`,
        class: "xstudio-project-plan-status-row",
        _text: project_plan_remaining_decisions_label(options._items.length),
      },
    ]
    : options._items.map((item, item_index) => ({
      _type: "label",
      _id: `xstudio-project-plan-status-${options._message_index}-${options._section_id}-${item_index}`,
      class: "xstudio-project-plan-status-row",
      _text: is_obj(item)
        ? artifact_request_string_value(item._message ?? item.message) || project_plan_display_label(item)
        : project_plan_display_label(item),
    }));
  if (options._collapsed) {
    return {
      _type: "xhtml",
      _html_tag: "details",
      _id: `xstudio-project-plan-status-section-${options._message_index}-${options._section_id}`,
      class: `xstudio-project-plan-status-section xstudio-project-plan-status-section-${options._kind} xstudio-project-plan-status-section-collapsed`,
      role: options._kind === "blocked" ? "alert" : "status",
      _children: [
        {
          _type: "xhtml",
          _html_tag: "summary",
          class: "xstudio-project-plan-review-section-header",
          _children: [
            {
              _type: "label",
              class: "xstudio-project-plan-review-section-title",
              _text: options._title,
            },
            project_plan_state_badge(options._kind, String(options._items.length)),
          ],
        },
        ...rows,
      ],
    };
  }

  return {
    _type: "view",
    _id: `xstudio-project-plan-status-section-${options._message_index}-${options._section_id}`,
    class: `xstudio-project-plan-status-section xstudio-project-plan-status-section-${options._kind}`,
    role: options._kind === "blocked" ? "alert" : "status",
    _children: [
      {
        _type: "view",
        class: "xstudio-project-plan-review-section-header",
        _children: [
          {
            _type: "label",
            class: "xstudio-project-plan-review-section-title",
            _text: options._title,
          },
          project_plan_state_badge(options._kind, String(options._items.length)),
        ],
      },
      ...rows,
    ],
  };
}

function project_plan_effects_section(
  options: {
    _message_index: number;
    _effects: any[];
    _source: Record<string, any>;
  },
) {
  const questions = project_plan_question_by_id(options._source);
  const rows = options._effects.flatMap((effect, effect_index) => {
    if (!is_obj(effect)) return [];
    const decision = artifact_request_string_value(effect._decision_id ?? effect.decision_id) ||
      artifact_request_string_value(effect._question_id ?? effect.question_id);
    const question = questions.get(artifact_request_string_value(effect._question_id ?? effect.question_id)) ??
      questions.get(decision);
    const value = project_plan_value_text(effect._value ?? effect.value, question);
    const affected = Array.isArray(effect._affected_plan_sections)
      ? effect._affected_plan_sections.map((item: any) => project_plan_display_label(item)).filter(Boolean)
      : [];
    if (!decision || affected.length === 0) return [];
    const label = project_plan_semantic_row_label({
      _id: decision,
      _question_id: artifact_request_string_value(effect._question_id ?? effect.question_id),
    }, questions);
    return [{
      _type: "label",
      _id: `xstudio-project-plan-effect-${options._message_index}-${effect_index}`,
      class: "xstudio-project-plan-effect-row",
      _text: `${label || project_plan_semantic_label_for_key(decision)}${value ? `: ${value}` : ""} affects ${affected.join(", ")}.`,
    }];
  });
  if (rows.length === 0) return null;

  return {
    _type: "view",
    _id: `xstudio-project-plan-effects-${options._message_index}`,
    class: "xstudio-project-plan-effects",
    _children: [
      {
        _type: "label",
        class: "xstudio-project-plan-review-section-title",
        _text: "Decision Effects",
      },
      ...rows,
    ],
  };
}

function project_plan_debug_section(
  options: {
    _message_index: number;
    _source: Record<string, any>;
    _result: any;
  },
) {
  const payload = _xu.safe_compact_inline_json({
    _plan: options._source,
    ...(options._result !== undefined ? { _result: options._result } : {}),
  }, 8000);
  if (!payload) return null;

  return {
    _type: "xhtml",
    _html_tag: "details",
    _id: `xstudio-project-plan-debug-${options._message_index}`,
    class: "xstudio-project-plan-debug",
    _children: [
      {
        _type: "xhtml",
        _html_tag: "summary",
        class: "xstudio-project-plan-debug-summary",
        _text: "Debug",
      },
      {
        _type: "label",
        class: "xstudio-project-plan-debug-payload",
        _text: payload,
      },
    ],
  };
}

function project_plan_review(
  options: {
    _request: XStudioArtifactRequestView;
    _message_index: number;
    _source: Record<string, any>;
    _summary_source: Record<string, any>;
    _readiness: Record<string, any> | null;
    _result: any;
    _goal: string;
    _summary: string;
    _is_complete: boolean;
    _is_done: boolean;
    _is_ready: boolean;
    _blockers: any[];
    _warnings: any[];
    _optional: any[];
    _malformed: boolean;
    _has_genuine_blocker: boolean;
    _has_active_question: boolean;
    _compact?: boolean;
    _hide_status_badge?: boolean;
  },
) {
  const understood = project_plan_fact_rows(options._source, options._summary_source, options._readiness);
  const decisions = project_plan_normalized_decision_rows(project_plan_decision_rows(
    options._source,
    options._readiness,
    options._summary_source,
    ["confirmed_decisions"],
  ), options._source);
  const decision_ids = new Set(decisions.map((item) => project_plan_row_identity(item)).filter(Boolean));
  const assumptions = project_plan_unique_rows(
    project_plan_normalized_decision_rows(
      project_plan_assumption_rows(options._source, options._readiness, options._summary_source),
      options._source,
    ),
    decision_ids,
  );
  const effects = project_plan_array_from_fields(options._readiness ?? options._source, ["decision_effects"]);
  const status = project_plan_readiness_label({
    _malformed: options._malformed,
    _is_ready: options._is_ready,
    _is_done: options._is_done,
    _blocker_count: options._blockers.length,
    _has_active_question: options._has_active_question,
    _has_genuine_blocker: options._has_genuine_blocker,
  });
  const status_label = status._label;
  const status_kind = status._kind;
  const debug = project_plan_debug_section({
    _message_index: options._message_index,
    _source: options._source,
    _result: options._result,
  });
  const decision_sections = [
    project_plan_decision_section({
      _message_index: options._message_index,
      _section_id: "confirmed",
      _title: "Confirmed decisions",
      _kind: "confirmed",
      _items: decisions,
      _source: options._source,
      _collapsed: true,
    }),
    project_plan_decision_section({
      _message_index: options._message_index,
      _section_id: "assumptions",
      _title: "Assumptions",
      _kind: "inferred",
      _items: assumptions,
      _source: options._source,
      _collapsed: true,
    }),
  ].filter((section): section is any => section !== null);
  const effects_section = project_plan_effects_section({
    _message_index: options._message_index,
    _effects: effects,
    _source: options._source,
  });
  const proposed_sections = [
    project_plan_review_section({
      _message_index: options._message_index,
      _section_id: "entities",
      _title: "Entities",
      _items: project_plan_section_items(options._source, options._summary_source, "entities"),
      _omit_when_empty: true,
    }),
    project_plan_review_section({
      _message_index: options._message_index,
      _section_id: "views",
      _title: "Views",
      _items: project_plan_section_items(options._source, options._summary_source, "views"),
      _omit_when_empty: true,
    }),
    project_plan_review_section({
      _message_index: options._message_index,
      _section_id: "flows",
      _title: "Flows",
      _items: project_plan_section_items(options._source, options._summary_source, "flows"),
      _omit_when_empty: true,
    }),
    project_plan_review_section({
      _message_index: options._message_index,
      _section_id: "capabilities",
      _title: "Capabilities",
      _items: project_plan_section_items(options._source, options._summary_source, "capabilities"),
      _empty_text: "No additional capabilities are needed yet.",
      _omit_when_empty: true,
    }),
    project_plan_review_section({
      _message_index: options._message_index,
      _section_id: "milestones",
      _title: "Milestones",
      _items: project_plan_section_items(options._source, options._summary_source, "milestones"),
      _omit_when_empty: true,
    }),
  ].filter((section): section is any => section !== null);

  return {
    _type: "view",
    _id: `xstudio-project-plan-review-${options._message_index}`,
    class: `xstudio-project-plan-review${options._compact ? " xstudio-project-plan-review-compact" : ""}`,
    role: "region",
    "aria-label": "Project plan review",
    _children: [
      {
        _type: "view",
        class: "xstudio-project-plan-review-heading",
        _children: [
          {
            _type: "label",
            class: "xstudio-project-plan-review-kicker",
            _text: "Plan review",
          },
          ...(options._hide_status_badge ? [] : [project_plan_state_badge(status_kind, status_label)]),
          project_plan_review_toggle_button(options._request, {
            _message_index: options._message_index,
            _expanded: true,
          }),
        ],
      },
      {
        _type: "view",
        class: "xstudio-project-plan-review-identity",
        _children: [
          project_plan_fact("Goal", options._goal),
          project_plan_fact("Summary", options._summary),
        ],
      },
      ...(options._malformed
        ? [
          {
            _type: "label",
            class: "xstudio-project-plan-malformed",
            _text: "The server response could not be displayed as a complete planning review.",
          },
        ]
        : []),
      {
        _type: "view",
        class: "xstudio-project-plan-review-grid",
        _children: proposed_sections,
      },
      ...(understood.length > 0
        ? [
          project_plan_decision_section({
            _message_index: options._message_index,
            _section_id: "understood",
            _title: "Understood",
            _kind: "confirmed",
            _items: understood,
            _source: options._source,
            _collapsed: true,
          }),
        ].filter((section): section is any => section !== null)
        : []),
      ...(decision_sections.length > 0
        ? [
          {
            _type: "view",
            class: "xstudio-project-plan-decision-grid",
            _children: decision_sections,
          },
        ]
        : []),
      ...(effects_section ? [effects_section] : []),
      ...[
        project_plan_status_section({
          _message_index: options._message_index,
          _section_id: "blockers",
          _title: options._has_genuine_blocker ? "Blocked" : "Remaining required decisions",
          _kind: options._has_genuine_blocker ? "blocked" : "planning",
          _items: options._blockers,
        }),
        project_plan_status_section({
          _message_index: options._message_index,
          _section_id: "optional",
          _title: "Optional decisions",
          _kind: "optional",
          _items: options._optional,
        }),
        project_plan_status_section({
          _message_index: options._message_index,
          _section_id: "warnings",
          _title: "Warnings",
          _kind: "warning",
          _items: options._warnings,
          _collapsed: true,
        }),
      ].filter((section): section is any => section !== null),
      ...(debug ? [debug] : []),
    ],
  };
}

function project_plan_question_panel(
  options: {
    _message_index: number;
    _question: Record<string, any>;
    _question_text: string;
    _question_type: string;
    _question_key: string;
    _progress: string;
    _suggestions: string[];
    _selected_answers: string[];
  },
) {
  const recommendation = project_plan_value_text(
    options._question._recommended_value ??
    options._question.recommended_value ??
    options._question._recommendation ??
    options._question.recommendation,
    options._question,
  );
  const recommendation_reason = artifact_request_string_value(
    options._question._recommendation_reason ??
    options._question.recommendation_reason ??
    options._question._reason ??
    options._question.reason,
  );
  const required = options._question._required === false ? "Optional" : "Required";
  return {
    _type: "view",
    _id: `xstudio-project-plan-current-question-${options._message_index}`,
    class: "xstudio-project-plan-current-question",
    role: "group",
    "aria-label": "Next decision",
    _children: [
      {
        _type: "view",
        class: "xstudio-project-plan-question-meta",
        _children: [
          {
            _type: "label",
            class: "xstudio-project-plan-question-group",
            _text: "Next decision",
          },
          {
            _type: "label",
            class: "xstudio-project-plan-question-group",
            _text: required,
          },
          ...(options._progress
            ? [
              {
                _type: "label",
                class: "xstudio-project-plan-progress",
                _text: options._progress,
              },
            ]
            : []),
        ],
      },
      {
        _type: "label",
        class: "xstudio-artifact-request-title xstudio-project-plan-question-title",
        _text: project_plan_question_title(options._question),
      },
      {
        _type: "label",
        class: "xstudio-project-plan-question-text",
        _text: options._question_text,
      },
      ...(recommendation
        ? [
          {
            _type: "label",
            class: "xstudio-project-plan-recommendation",
            _text: `Recommendation: ${recommendation}`,
          },
        ]
        : []),
      ...(recommendation_reason
        ? [
          {
            _type: "label",
            class: "xstudio-project-plan-recommendation-reason",
            _text: recommendation_reason,
          },
        ]
        : []),
      ...(options._question_type === "text"
        ? [
          {
            _type: "label",
            class: "xstudio-project-plan-answer-helper",
            _text: "Type your answer, or click a suggestion to insert it.",
          },
        ]
        : []),
      ...(options._suggestions.length > 0
        ? [
          {
            _type: "view",
            class: `xstudio-project-plan-suggestions xstudio-project-plan-suggestions-${options._question_type}`,
            _children: options._suggestions.map((suggestion, suggestion_index) =>
              project_plan_suggestion_chip({
                _message_index: options._message_index,
                _question_key: options._question_key,
                _question_type: options._question_type,
                _suggestion_index: suggestion_index,
                _text: suggestion,
                _selected: options._selected_answers.includes(suggestion),
              }),
            ),
          },
        ]
        : []),
      ...(options._question_type === "multi"
        ? [
          {
            _type: "view",
            class: "xstudio-artifact-request-buttons xstudio-project-plan-question-buttons",
            _children: [
              project_plan_multi_send_button({
                _message_index: options._message_index,
                _question_key: options._question_key,
              }),
            ],
          },
        ]
        : []),
    ],
  };
}

function project_plan_action_payload(action: string, prompt: string) {
  return {
    _action: action,
    _prompt: prompt,
  };
}

function project_plan_question_key(message_index: number, question: Record<string, any>) {
  const raw_key = artifact_request_string_value(
    question._id ??
    question.id ??
    question._key ??
    question.key ??
    question._name ??
    question.name ??
    project_plan_question_title(question),
  );
  const normalized = _xu.normalize_id(raw_key) ?? "question";
  return `xstudio-project-plan-question-${message_index}-${normalized}`;
}

export function xstudio_project_plan_current_question_key(
  request: XStudioArtifactRequestView | null | undefined,
  message_index: number,
) {
  if (!request || request._artifact_type !== PROJECT_PLAN_ARTIFACT_TYPE) return "";
  if (request._status === ARTIFACT_REQUEST_STATUS_DONE) return "";
  const source = project_plan_source(request);
  if (project_plan_is_complete(request, source)) return "";
  const question = project_plan_current_question(request);
  const question_text = question ? project_plan_question_text(question) : "";
  return question && question_text ? project_plan_question_key(message_index, question) : "";
}

function project_plan_suggestion_chip(options: {
  _message_index: number;
  _question_key: string;
  _question_type: string;
  _suggestion_index: number;
  _text: string;
  _selected?: boolean;
}) {
  const is_multi = options._question_type === "multi";
  const is_selected = is_multi && options._selected === true;
  const action = options._question_type === "single"
    ? "answer"
    : "suggestion";
  const event = is_multi
    ? "studio:planning-question-toggle"
    : "studio:project-plan-action";
  const data = is_multi
    ? {
      _question_key: options._question_key,
      _chip_id: `xstudio-project-plan-suggestion-${options._message_index}-${options._suggestion_index}`,
      _value: options._text,
    }
    : project_plan_action_payload(action, options._text);

  return {
    _type: "button",
    _id: `xstudio-project-plan-suggestion-${options._message_index}-${options._suggestion_index}`,
    type: "button",
    class: `xstudio-project-plan-suggestion xstudio-project-plan-suggestion-${options._question_type}${is_selected ? " is-selected xstudio-project-plan-suggestion-selected" : ""}`,
    ...(is_multi ? { "aria-pressed": String(is_selected) } : {}),
    _text: options._text,
    title: options._question_type === "single"
      ? "Send answer"
      : is_multi
        ? "Select answer"
        : "Insert suggestion",
    _on: {
      click: {
        _module: "xem",
        _op: "fire",
        _params: {
          event,
          data,
        },
      },
    },
  };
}

function project_plan_multi_send_button(options: {
  _message_index: number;
  _question_key: string;
}) {
  return {
    _type: "button",
    _id: `xstudio-project-plan-send-answer-${options._message_index}`,
    type: "button",
    class: "xstudio-intent-action-button xstudio-intent-action-apply xstudio-project-plan-send-answer",
    _text: "Send Answer",
    title: "Send selected answers",
    _on: {
      click: {
        _module: "xem",
        _op: "fire",
        _params: {
          event: "studio:planning-question-send",
          data: {
            _question_key: options._question_key,
          },
        },
      },
    },
  };
}

function project_plan_action_button(
  options: {
    _message_index: number;
    _action: string;
    _text: string;
    _prompt: string;
    _primary?: boolean;
  },
) {
  return {
    _type: "button",
    _id: `xstudio-project-plan-${options._action}-${options._message_index}`,
    type: "button",
    class: `xstudio-intent-action-button ${options._primary ? "xstudio-intent-action-apply" : "xstudio-intent-action-dismiss"}`,
    _text: options._text,
    title: `${options._text} prompt`,
    _on: {
      click: {
        _module: "xem",
        _op: "fire",
        _params: {
          event: "studio:project-plan-action",
          data: project_plan_action_payload(options._action, options._prompt),
        },
      },
    },
  };
}

function project_plan_confirm_button(
  request: XStudioArtifactRequestView,
  options: {
    _message_index: number;
    _running?: boolean;
    _confirmed?: boolean;
    _disabled?: boolean;
    _disabled_reason?: string;
  },
) {
  const disabled = options._running === true || options._confirmed === true || options._disabled === true;
  const disabled_reason = options._disabled_reason || "Project plan is not ready for confirmation.";
  return {
    _type: "button",
    _id: `xstudio-project-plan-confirm-${options._message_index}`,
    type: "button",
    class: "xstudio-intent-action-button xstudio-intent-action-apply",
    _text: options._running ? "Confirming" : options._confirmed ? "Confirmed" : "Confirm Plan",
    title: options._running
      ? "Confirming project plan"
      : options._confirmed
        ? "Plan confirmed"
        : disabled
          ? disabled_reason
          : "Confirm project plan",
    "aria-label": options._running
      ? "Confirming project plan"
      : options._confirmed
        ? "Project plan confirmed"
        : disabled
          ? `Confirm plan unavailable. ${disabled_reason}`
          : "Confirm project plan",
    ...(disabled ? { disabled: true, "aria-disabled": "true" } : {}),
    ...(!disabled ? {
      _on: {
        click: {
          _module: "xem",
          _op: "fire",
          _params: {
            event: "studio:project-plan-confirm",
            data: xstudio_artifact_request_event_payload(request),
          },
        },
      },
    } : {}),
  };
}

function capability_guidance_field(source: Record<string, any>, key: string) {
  return source[`_${key}`] ?? source[key];
}

function capability_guidance_text(value: any) {
  return artifact_request_string_value(value);
}

function capability_guidance_title(value: string) {
  const text = value.trim();
  if (!text) return "";
  return text
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : "")
    .filter(Boolean)
    .join(" ");
}

function capability_guidance_array(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (is_obj(value)) return Object.values(value);
  return [];
}

function capability_guidance_categories(request: XStudioArtifactRequestView) {
  const raw_categories =
    capability_guidance_field(request._artifact_request, "categories") ??
    capability_guidance_field(request._artifact_request, "sections");

  return capability_guidance_array(raw_categories)
    .filter((category): category is Record<string, any> => is_obj(category))
    .map((category, category_index) => {
      const title =
        capability_guidance_text(
          category._title ??
          category.title ??
          category._name ??
          category.name ??
          category._label ??
          category.label,
        ) ||
        capability_guidance_title(
          capability_guidance_text(category._id ?? category.id),
        ) ||
        `Category ${category_index + 1}`;
      const capabilities = capability_guidance_array(
        category._capabilities ??
        category.capabilities ??
        category._items ??
        category.items,
      ).filter((capability): capability is Record<string, any> => is_obj(capability));

      return {
        _title: title,
        _capabilities: capabilities,
      };
    })
    .filter((category) => category._capabilities.length > 0);
}

function capability_guidance_examples(capability: Record<string, any>) {
  const raw_examples =
    capability._tested_prompt_examples ??
    capability.tested_prompt_examples ??
    capability._tested_prompts ??
    capability.tested_prompts ??
    capability._prompt_examples ??
    capability.prompt_examples ??
    capability._examples ??
    capability.examples ??
    capability._prompts ??
    capability.prompts;

  return capability_guidance_array(raw_examples)
    .map((example) => {
      if (typeof example === "string") return example.trim();
      if (!is_obj(example)) return "";
      return capability_guidance_text(
        example._prompt ??
        example.prompt ??
        example._text ??
        example.text ??
        example._example ??
        example.example,
      );
    })
    .filter(Boolean);
}

function capability_guidance_manual_steps(capability: Record<string, any>) {
  const raw_steps =
    capability._manual_steps ??
    capability.manual_steps ??
    capability._steps ??
    capability.steps ??
    capability._manual ??
    capability.manual;

  return capability_guidance_array(raw_steps)
    .map((step) => {
      if (typeof step === "string") return step.trim();
      if (!is_obj(step)) return "";
      const title = capability_guidance_text(step._title ?? step.title);
      const text = capability_guidance_text(
        step._text ??
        step.text ??
        step._description ??
        step.description ??
        step._step ??
        step.step,
      );
      return title && text ? `${title}: ${text}` : title || text;
    })
    .filter(Boolean);
}

function capability_guidance_mode_badge(capability: Record<string, any>) {
  const mode = capability_guidance_text(
    capability._mode ??
    capability.mode ??
    capability._execution_mode ??
    capability.execution_mode,
  ).toLowerCase();

  if (mode.includes("deterministic")) return "⚡ Deterministic";
  if (mode.includes("ai")) return "✨ AI-assisted";
  return mode ? capability_guidance_title(mode) : "";
}

function capability_guidance_support_status(capability: Record<string, any>) {
  return capability_guidance_text(
    capability._support_status ??
    capability.support_status ??
    capability._status ??
    capability.status,
  );
}

function capability_guidance_example_button(
  example: string,
  options: {
    _message_index: number;
    _category_index: number;
    _capability_index: number;
    _example_index: number;
  },
) {
  return {
    _type: "button",
    _id: `xstudio-capability-example-${options._message_index}-${options._category_index}-${options._capability_index}-${options._example_index}`,
    type: "button",
    class: "xstudio-capability-example",
    _text: example,
    title: "Insert prompt example",
    _on: {
      click: {
        _module: "xem",
        _op: "fire",
        _params: {
          event: "studio:capability-example",
          data: {
            _prompt: example,
          },
        },
      },
    },
  };
}

function capability_guidance_capability_card(
  capability: Record<string, any>,
  options: {
    _message_index: number;
    _category_index: number;
    _capability_index: number;
  },
) {
  const title = capability_guidance_text(
    capability._title ??
    capability.title ??
    capability._name ??
    capability.name,
  ) || `Capability ${options._capability_index + 1}`;
  const description = capability_guidance_text(
    capability._description ??
    capability.description ??
    capability._summary ??
    capability.summary,
  );
  const mode_badge = capability_guidance_mode_badge(capability);
  const support_status = capability_guidance_support_status(capability);
  const examples = capability_guidance_examples(capability);
  const manual_steps = capability_guidance_manual_steps(capability);

  return {
    _type: "view",
    _id: `xstudio-capability-${options._message_index}-${options._category_index}-${options._capability_index}`,
    class: "xstudio-capability",
    _children: [
      {
        _type: "view",
        class: "xstudio-capability-heading",
        _children: [
          {
            _type: "label",
            class: "xstudio-capability-title",
            _text: title,
          },
          ...(mode_badge
            ? [
              {
                _type: "label",
                class: "xstudio-capability-mode",
                _text: mode_badge,
              },
            ]
            : []),
          ...(support_status
            ? [
              {
                _type: "label",
                class: "xstudio-capability-status",
                _text: support_status,
              },
            ]
            : []),
        ],
      },
      ...(description
        ? [
          {
            _type: "label",
            class: "xstudio-capability-description",
            _text: description,
          },
        ]
        : []),
      ...(examples.length > 0
        ? [
          {
            _type: "view",
            class: "xstudio-capability-examples",
            _children: examples.map((example, example_index) =>
              capability_guidance_example_button(example, {
                ...options,
                _example_index: example_index,
              }),
            ),
          },
        ]
        : []),
      ...(manual_steps.length > 0
        ? [
          {
            _type: "xhtml",
            _html_tag: "details",
            class: "xstudio-capability-manual",
            _children: [
              {
                _type: "xhtml",
                _html_tag: "summary",
                class: "xstudio-capability-manual-summary",
                _text: "Manual steps",
              },
              {
                _type: "view",
                class: "xstudio-capability-manual-steps",
                _children: manual_steps.map((step, step_index) => ({
                  _type: "label",
                  class: "xstudio-capability-manual-step",
                  _text: `${step_index + 1}. ${step}`,
                })),
              },
            ],
          },
        ]
        : []),
    ],
  };
}

function create_capability_guidance_card(
  request: XStudioArtifactRequestView,
  options: {
    _message_index: number;
    _status?: string;
    _error?: string;
  },
) {
  const status = xstudio_artifact_request_render_status(options._status ?? request._status);
  const status_class = _xu.normalize_id(status) ?? "suggested";
  const error = options._error || request._error || "";
  const categories = capability_guidance_categories(request);
  const title = capability_guidance_text(
    request._artifact_request._title ??
    request._artifact_request.title,
  ) || "What can I do with Visual Xpell?";
  const description = capability_guidance_text(
    request._artifact_request._description ??
    request._artifact_request.description ??
    request._artifact_request._summary ??
    request._artifact_request.summary,
  );

  return {
    _type: "view",
    _id: `xstudio-capability-guidance-${options._message_index}-${status_class}`,
    class: `xstudio-artifact-request-card xstudio-capability-guidance-card xstudio-artifact-request-card-${status_class}`,
    _children: [
      {
        _type: "view",
        class: "xstudio-artifact-request-content xstudio-capability-guidance-content",
        _children: [
          {
            _type: "label",
            class: "xstudio-artifact-request-label xstudio-capability-guidance-label",
            _text: "Capability Guidance",
          },
          {
            _type: "label",
            class: "xstudio-artifact-request-title xstudio-capability-guidance-title",
            _text: title,
          },
          ...(description
            ? [
              {
                _type: "label",
                class: "xstudio-capability-guidance-description",
                _text: description,
              },
            ]
            : []),
          ...categories.map((category, category_index) => ({
            _type: "view",
            _id: `xstudio-capability-category-${options._message_index}-${category_index}`,
            class: "xstudio-capability-category",
            _children: [
              {
                _type: "label",
                class: "xstudio-capability-category-title",
                _text: category._title,
              },
              {
                _type: "view",
                class: "xstudio-capability-list",
                _children: category._capabilities.map((capability, capability_index) =>
                  capability_guidance_capability_card(capability, {
                    _message_index: options._message_index,
                    _category_index: category_index,
                    _capability_index: capability_index,
                  }),
                ),
              },
            ],
          })),
          ...(categories.length === 0
            ? [
              {
                _type: "label",
                class: "xstudio-capability-empty",
                _text: "No capabilities returned.",
              },
            ]
            : []),
          ...(error
            ? [
              {
                _type: "label",
                class: "xstudio-artifact-request-error",
                _text: error,
              },
            ]
            : []),
        ],
      },
    ],
  };
}

function mutation_plan_field(source: Record<string, any>, key: string) {
  return source[`_${key}`] ?? source[key];
}

function mutation_plan_text(value: any) {
  return artifact_request_string_value(value);
}

function mutation_plan_number(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

type MutationPlanStepView = {
  _id: string;
  _title: string;
  _display_title: string;
  _status: string;
  _reason: string;
  _validation_reason: string;
  _has_primitive: boolean;
  _primitive: Record<string, any> | null;
  _resolution_state: string;
  _operation_kind: string;
  _operation_summary: string;
  _affected_artifacts: string[];
  _detail: string;
};

type MutationPlanExecutionView = {
  _status_by_step_id: Record<string, string>;
  _completed_count: number;
  _failed_step_id: string;
  _has_result: boolean;
};

function mutation_plan_status_key(value: any) {
  return mutation_plan_text(value)
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .trim();
}

function mutation_plan_primitive_value(step: Record<string, any>) {
  const primitive = step._primitive ?? step.primitive;
  return is_obj(primitive) ? primitive : null;
}

function mutation_plan_generated_operation(primitive: Record<string, any> | null) {
  if (!primitive) return null;
  const op = mutation_plan_text(primitive._op ?? primitive.op);
  if (op !== "apply-generated-operation") return null;
  const params = is_obj(primitive._params ?? primitive.params)
    ? primitive._params ?? primitive.params
    : null;
  const operation = params?._operation ?? params?.operation;
  return is_obj(operation) ? operation : null;
}

function mutation_plan_normalized_resolution_state(
  step: Record<string, any>,
  primitive: Record<string, any> | null,
  generated_operation: Record<string, any> | null,
) {
  if (generated_operation) return "generated";

  const explicit = mutation_plan_status_key(
    step._resolution_state ??
    step.resolution_state ??
    step._resolution_status ??
    step.resolution_status ??
    step._generation_state ??
    step.generation_state ??
    step._fallback_state ??
    step.fallback_state,
  );
  if (explicit === "generated" || explicit === "ai-generated") return "generated";
  if (explicit.includes("validation") && explicit.includes("failed")) return "validation-failed";
  if (explicit.includes("generation") && (
    explicit.includes("required") ||
    explicit.includes("pending") ||
    explicit.includes("running")
  )) {
    return "generation-required";
  }
  if (
    explicit.includes("genuinely-unsupported") ||
    explicit.includes("unsupported-after") ||
    explicit.includes("generation-failed")
  ) {
    return "genuinely-unsupported";
  }

  if (primitive) return "deterministic";

  const status = mutation_plan_status_key(step._status ?? step.status);
  const reason = mutation_plan_status_key(step._reason ?? step.reason);
  if (status.includes("generation") && (status.includes("required") || status.includes("pending"))) {
    return "generation-required";
  }
  if (status === "unsupported" && reason === "no-supported-primitive-mapping") {
    return "generation-required";
  }
  if (status === "unsupported") return explicit || "unsupported";
  return explicit || status || "planned";
}

function mutation_plan_pretty_action(value: any) {
  const text = mutation_plan_text(value).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function mutation_plan_params(primitive: Record<string, any> | null) {
  return is_obj(primitive?._params ?? primitive?.params)
    ? primitive?._params ?? primitive?.params
    : {};
}

function mutation_plan_target_label(params: Record<string, any>, fallback = "") {
  return mutation_plan_text(
    params._target_label ??
    params.target_label ??
    params._object_label ??
    params.object_label ??
    params._label ??
    params.label ??
    params._target_title ??
    params.target_title ??
    params._object_title ??
    params.object_title ??
    fallback,
  );
}

function mutation_plan_target_id(params: Record<string, any>) {
  return mutation_plan_text(
    params._target_id ??
    params.target_id ??
    params._object_id ??
    params.object_id ??
    params._id ??
    params.id,
  );
}

function mutation_plan_visibility_action(value: any) {
  const action = mutation_plan_status_key(value);
  if (["hide-object", "hide", "set-hidden", "set-object-hidden"].includes(action)) return "hide";
  if (["show-object", "show", "set-visible", "set-object-visible"].includes(action)) return "show";
  return "";
}

function mutation_plan_visibility_operation_summary(
  primitive: Record<string, any> | null,
  fallback_title = "",
) {
  if (!primitive) return "";
  const op = mutation_plan_text(primitive._op ?? primitive.op);
  if (op !== "apply-view-edit") return "";

  const params = mutation_plan_params(primitive);
  const visibility_action = mutation_plan_visibility_action(params._edit_action ?? params.edit_action);
  if (!visibility_action) return "";

  const label = mutation_plan_target_label(params, mutation_plan_target_id(params) || fallback_title);
  const action_label = visibility_action === "hide" ? "Hide" : "Show";
  return label ? `${action_label} ${label}` : `${action_label} object`;
}

function mutation_plan_generated_target_view_id(operation: Record<string, any> | null) {
  if (!operation) return "";
  const target = is_obj(operation._target ?? operation.target)
    ? operation._target ?? operation.target
    : null;
  return mutation_plan_text(
    target?._view_id ??
    target?.view_id ??
    operation._view_id ??
    operation.view_id,
  );
}

function mutation_plan_operation_summary(
  primitive: Record<string, any> | null,
  generated_operation: Record<string, any> | null,
) {
  if (generated_operation) {
    const explicit = mutation_plan_text(
      generated_operation._summary ??
      generated_operation.summary ??
      generated_operation._description ??
      generated_operation.description,
    );
    if (explicit) return explicit;

    const kind = mutation_plan_text(generated_operation._kind ?? generated_operation.kind);
    const view_id = mutation_plan_generated_target_view_id(generated_operation);
    if (kind === "view.create") return `Create view${view_id ? ` ${view_id}` : ""}`;
    if (kind === "view.replace") return `Replace view${view_id ? ` ${view_id}` : ""}`;
    return mutation_plan_pretty_action(kind) || "Apply generated artifact operation";
  }

  if (!primitive) return "";
  const visibility_summary = mutation_plan_visibility_operation_summary(primitive);
  if (visibility_summary) return visibility_summary;

  const params = mutation_plan_params(primitive);
  const op = mutation_plan_text(primitive._op ?? primitive.op);
  if (op === "apply-view-edit") {
    const edit_action = mutation_plan_pretty_action(params._edit_action ?? params.edit_action);
    const view_id = mutation_plan_text(params._view_id ?? params.view_id);
    return `${edit_action || "Edit"} view${view_id ? ` ${view_id}` : ""}`;
  }

  return mutation_plan_pretty_action(op) || "Apply deterministic operation";
}

function mutation_plan_affected_artifacts(
  primitive: Record<string, any> | null,
  generated_operation: Record<string, any> | null,
) {
  const artifacts: string[] = [];
  const view_id = generated_operation
    ? mutation_plan_generated_target_view_id(generated_operation)
    : mutation_plan_text(
      (is_obj(primitive?._params ?? primitive?.params) ? primitive?._params ?? primitive?.params : {})?._view_id ??
      (is_obj(primitive?._params ?? primitive?.params) ? primitive?._params ?? primitive?.params : {})?.view_id,
    );
  if (view_id) artifacts.push(`View: ${view_id}`);

  const params = mutation_plan_params(primitive);
  const target_id = mutation_plan_target_id(params);
  if (target_id) artifacts.push(`Target: ${target_id}`);

  return artifacts;
}

function mutation_plan_step_operation_kind(
  primitive: Record<string, any> | null,
  generated_operation: Record<string, any> | null,
  resolution_state: string,
) {
  if (generated_operation || resolution_state === "generated") return "ai-generated";
  if (primitive || resolution_state === "deterministic") return "deterministic";
  if (resolution_state === "generation-required") return "generation-required";
  if (resolution_state === "validation-failed") return "validation-failed";
  if (resolution_state === "genuinely-unsupported") return "genuinely-unsupported";
  if (resolution_state === "unsupported") return "unsupported";
  return "planned";
}

function mutation_plan_validation_reason(step: Record<string, any>) {
  const validation_error = is_obj(step._validation_error ?? step.validation_error)
    ? step._validation_error ?? step.validation_error
    : null;
  return mutation_plan_status_key(
    step._validation_reason ??
    step.validation_reason ??
    validation_error?._reason ??
    validation_error?.reason,
  );
}

function mutation_plan_validation_reason_label(reason: string) {
  if (reason === "target-view-not-found") return "Target view was not found.";
  if (reason === "object-not-found" || reason === "target-object-not-found" || reason === "target-not-found") return "Object was not found.";
  if (reason === "stale-view" || reason === "view-stale" || reason === "stale-view-version") return "View changed. Refresh and try again.";
  if (reason === "apply-failed" || reason === "mutation-apply-failed") return "Apply failed.";
  if (reason === "generated-view-id-mismatch") return "Generated view ID did not match the target view.";
  if (reason === "invalid-artifact-envelope") return "Generated output was not a complete view artifact.";
  if (reason === "unsupported-xui-type") return "Generated view contains unsupported XUI elements.";
  if (reason === "generated-view-validation-failed") return "Generated view failed XUI validation.";
  if (reason === "duplicate-artifact") return "Generated operation would duplicate an existing artifact.";
  return "Generated view failed validation.";
}

function mutation_plan_step_detail(operation_kind: string, validation_reason = "") {
  if (operation_kind === "generation-required") return "XVibe is generating a safe operation.";
  if (operation_kind === "validation-failed") return mutation_plan_validation_reason_label(validation_reason);
  if (operation_kind === "genuinely-unsupported") return "No safe operation is available after generation.";
  if (operation_kind === "unsupported") return "No safe operation is available yet.";
  return "";
}

function mutation_plan_steps_from_value(raw_steps: any) {
  if (!Array.isArray(raw_steps)) return [];

  return raw_steps
    .flatMap((step, step_index): MutationPlanStepView[] => {
      if (typeof step === "string") {
        const title = step.trim();
        return title
          ? [{
            _id: `step-${step_index + 1}`,
            _title: title,
            _display_title: title,
            _status: "planned",
            _reason: "",
            _validation_reason: "",
            _has_primitive: false,
            _primitive: null,
            _resolution_state: "planned",
            _operation_kind: "planned",
            _operation_summary: "",
            _affected_artifacts: [],
            _detail: "",
          }]
          : [];
      }
      if (!is_obj(step)) return [];

      const title = mutation_plan_text(
        step._title ??
        step.title ??
        step._summary ??
        step.summary ??
        step._description ??
        step.description,
      );
      if (!title) return [];

      const primitive = mutation_plan_primitive_value(step);
      const generated_operation = mutation_plan_generated_operation(primitive);
      const resolution_state = mutation_plan_normalized_resolution_state(step, primitive, generated_operation);
      const operation_kind = mutation_plan_step_operation_kind(primitive, generated_operation, resolution_state);
      const validation_reason = mutation_plan_validation_reason(step);
      const visibility_title = mutation_plan_visibility_operation_summary(primitive, title);

      return [{
        _id: mutation_plan_text(step._id ?? step.id) || `step-${step_index + 1}`,
        _title: title,
        _display_title: visibility_title || title,
        _status: mutation_plan_text(step._status ?? step.status) || "planned",
        _reason: mutation_plan_text(step._reason ?? step.reason),
        _validation_reason: validation_reason,
        _has_primitive: primitive !== null,
        _primitive: primitive,
        _resolution_state: resolution_state,
        _operation_kind: operation_kind,
        _operation_summary: mutation_plan_operation_summary(primitive, generated_operation),
        _affected_artifacts: mutation_plan_affected_artifacts(primitive, generated_operation),
        _detail: mutation_plan_step_detail(operation_kind, validation_reason),
      }];
    });
}

function mutation_plan_steps(request: XStudioArtifactRequestView) {
  return mutation_plan_steps_from_value(
    mutation_plan_field(request._artifact_request, "steps"),
  );
}

function mutation_plan_estimated_count(request: XStudioArtifactRequestView, steps: any[]) {
  return mutation_plan_number(
    mutation_plan_field(request._artifact_request, "estimated_mutations") ??
    mutation_plan_field(request._artifact_request, "mutation_count") ??
    mutation_plan_field(request._artifact_request, "count"),
  ) ?? steps.length;
}

function mutation_plan_array_count(value: any) {
  if (Array.isArray(value)) return value.length;
  return mutation_plan_number(value);
}

function mutation_plan_has_compiled_status(request: XStudioArtifactRequestView) {
  return typeof mutation_plan_field(request._artifact_request, "can_apply") === "boolean" ||
    mutation_plan_field(request._artifact_request, "executable_steps") !== undefined ||
    mutation_plan_field(request._artifact_request, "unsupported_steps") !== undefined;
}

function mutation_plan_executable_count(request: XStudioArtifactRequestView, steps: any[]) {
  const explicit = mutation_plan_array_count(
    mutation_plan_field(request._artifact_request, "executable_steps") ??
    mutation_plan_field(request._artifact_request, "executable_step_count"),
  );
  if (explicit !== null) return explicit;
  return steps.filter((step) => mutation_plan_step_is_executable(step)).length;
}

function mutation_plan_unsupported_count(request: XStudioArtifactRequestView, steps: any[]) {
  const explicit = mutation_plan_array_count(
    mutation_plan_field(request._artifact_request, "unsupported_steps") ??
    mutation_plan_field(request._artifact_request, "unsupported_step_count"),
  );
  if (explicit !== null) return explicit;
  return steps.filter((step) =>
    step._operation_kind === "unsupported" ||
    step._operation_kind === "genuinely-unsupported"
  ).length;
}

function mutation_plan_can_apply(request: XStudioArtifactRequestView) {
  return mutation_plan_field(request._artifact_request, "can_apply") === true;
}

function mutation_plan_debug_section(
  request: XStudioArtifactRequestView,
  message_index: number,
) {
  const raw_steps =
    mutation_plan_field(request._artifact_request, "steps");
  if (!Array.isArray(raw_steps)) return null;

  const validation_failures = raw_steps
    .filter((step) =>
      is_obj(step) &&
      (
        mutation_plan_status_key(step._resolution_state ?? step.resolution_state) === "validation-failed" ||
        is_obj(step._validation_error ?? step.validation_error)
      )
    )
    .map((step) => {
      const validation_error =
        is_obj(step._validation_error ?? step.validation_error)
          ? step._validation_error ?? step.validation_error
          : {};
      return {
        _step_id: mutation_plan_text(step._id ?? step.id),
        _title: mutation_plan_text(step._title ?? step.title),
        _resolution_state: mutation_plan_text(step._resolution_state ?? step.resolution_state),
        _reason: mutation_plan_text(step._reason ?? step.reason),
        _validation_reason: mutation_plan_text(step._validation_reason ?? step.validation_reason ?? validation_error._reason),
        _validation_error: validation_error,
      };
    });

  if (validation_failures.length === 0) return null;

  const payload = {
    _validation_failures: validation_failures,
    _counts: {
      _estimated_mutations: mutation_plan_field(request._artifact_request, "estimated_mutations"),
      _executable_steps: mutation_plan_field(request._artifact_request, "executable_steps"),
      _unsupported_steps: mutation_plan_field(request._artifact_request, "unsupported_steps"),
      _validation_failed_steps: mutation_plan_field(request._artifact_request, "validation_failed_steps"),
      _can_apply: mutation_plan_field(request._artifact_request, "can_apply"),
    },
  };
  const text = _xu.safe_compact_inline_json(payload, 12000) || "";
  if (!text) return null;

  return {
    _type: "xhtml",
    _html_tag: "details",
    _id: `xstudio-mutation-plan-debug-${message_index}`,
    class: "xstudio-artifact-request-debug xstudio-mutation-plan-debug",
    _children: [
      {
        _type: "xhtml",
        _html_tag: "summary",
        class: "xstudio-artifact-request-debug-summary",
        _text: "Debug",
      },
      {
        _type: "label",
        class: "xstudio-artifact-request-debug-payload xstudio-mutation-plan-debug-payload",
        _text: text,
      },
    ],
  };
}

function mutation_plan_step_is_executable(step: MutationPlanStepView) {
  return step._has_primitive &&
    (
      step._operation_kind === "deterministic" ||
      step._operation_kind === "ai-generated"
    ) &&
    step._status.trim().toLowerCase() !== "unsupported";
}

function mutation_plan_result_source(result: any) {
  if (!is_obj(result)) return null;
  if (is_obj(result._result)) return result._result;
  if (is_obj(result.result)) return result.result;
  return result;
}

function mutation_plan_step_id(value: any) {
  if (typeof value === "string") return value.trim();
  if (!is_obj(value)) return "";
  return mutation_plan_text(value._id ?? value.id ?? value._step_id ?? value.step_id);
}

function mutation_plan_result_status(value: any) {
  const status = mutation_plan_text(
    is_obj(value)
      ? value._status ?? value.status ?? value._result_status ?? value.result_status
      : value,
  ).toLowerCase();
  if (["done", "completed", "applied", "success", "succeeded", "ok"].includes(status)) return "done";
  if (["failed", "error"].includes(status)) return "failed";
  if (["not-run", "not run", "not_run", "skipped"].includes(status)) return "not-run";
  if (["running", "applying"].includes(status)) return "running";
  return status;
}

function mutation_plan_mark_step_ids(
  out: Record<string, string>,
  values: any,
  status: string,
) {
  if (Array.isArray(values)) {
    for (const value of values) {
      const id = mutation_plan_step_id(value);
      if (id) out[id] = status;
    }
    return;
  }

  const id = mutation_plan_step_id(values);
  if (id) out[id] = status;
}

function mutation_plan_execution_view(result: any): MutationPlanExecutionView {
  const source = mutation_plan_result_source(result);
  const status_by_step_id: Record<string, string> = {};
  if (!source) {
    return {
      _status_by_step_id: status_by_step_id,
      _completed_count: 0,
      _failed_step_id: "",
      _has_result: false,
    };
  }

  const step_results =
    source._steps ??
    source.steps ??
    source._step_results ??
    source.step_results ??
    source._results ??
    source.results;
  if (Array.isArray(step_results)) {
    for (const step of step_results) {
      const id = mutation_plan_step_id(step);
      const status = mutation_plan_result_status(step);
      if (id && status) status_by_step_id[id] = status;
    }
  }

  mutation_plan_mark_step_ids(status_by_step_id, source._completed_steps ?? source.completed_steps, "done");
  mutation_plan_mark_step_ids(status_by_step_id, source._done_steps ?? source.done_steps, "done");
  mutation_plan_mark_step_ids(status_by_step_id, source._applied_steps ?? source.applied_steps, "done");
  mutation_plan_mark_step_ids(status_by_step_id, source._not_run_steps ?? source.not_run_steps, "not-run");
  mutation_plan_mark_step_ids(status_by_step_id, source._skipped_steps ?? source.skipped_steps, "not-run");
  mutation_plan_mark_step_ids(status_by_step_id, source._failed_step ?? source.failed_step, "failed");

  const completed_count =
    mutation_plan_number(source._completed_count ?? source.completed_count) ??
    Object.values(status_by_step_id).filter((status) => status === "done").length;

  return {
    _status_by_step_id: status_by_step_id,
    _completed_count: completed_count,
    _failed_step_id: mutation_plan_step_id(source._failed_step ?? source.failed_step),
    _has_result: true,
  };
}

function mutation_plan_step_status(step: {
  _status: string;
  _reason?: string;
  _has_primitive?: boolean;
  _operation_kind?: string;
}, execution_status = "") {
  if (execution_status) return execution_status;
  const status_key = mutation_plan_status_key(step._status);
  if (status_key === "already-hidden") return "Already hidden";
  if (status_key === "already-visible") return "Already visible";
  if (status_key === "already-applied" || status_key === "already-done" || status_key === "no-op" || status_key === "noop") return "Already done";
  if (step._operation_kind === "generation-required") return "Generating missing changes";
  if (step._operation_kind === "ai-generated") return "AI-generated";
  if (step._operation_kind === "deterministic") return "Deterministic";
  if (step._operation_kind === "validation-failed") return "Validation failed";
  if (step._operation_kind === "genuinely-unsupported") return "Unsupported after generation failure";
  if (step._operation_kind === "unsupported") return "Unsupported";
  if (step._status === "unsupported") return "Unsupported";
  if (step._has_primitive) return "Deterministic";
  return step._status || "planned";
}

function mutation_plan_step_status_label(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "running" || normalized === "applying") return "Running";
  if (normalized === "done" || normalized === "completed") return "Done";
  if (normalized === "failed") return "Failed";
  if (normalized === "not-run" || normalized === "not run" || normalized === "not_run") return "Not run";
  if (normalized === "already hidden" || normalized === "already-hidden") return "Already hidden";
  if (normalized === "already visible" || normalized === "already-visible") return "Already visible";
  if (normalized === "already done" || normalized === "already-done" || normalized === "already applied" || normalized === "already-applied") return "Already done";
  if (normalized === "generating missing changes") return "Generating missing changes";
  if (normalized === "ai-generated" || normalized === "ai generated") return "AI-generated";
  if (normalized === "deterministic") return "Deterministic";
  if (normalized === "validation failed" || normalized === "validation-failed") return "Validation failed";
  if (normalized === "unsupported after generation failure") return "Unsupported after generation failure";
  if (normalized === "unsupported") return "Unsupported";
  if (normalized === "planned") return "Planned";
  return status || "Planned";
}

function create_mutation_plan_card(
  request: XStudioArtifactRequestView,
  options: {
    _message_index: number;
    _status?: string;
    _error?: string;
    _result?: any;
    _mutation_plan_collapsed?: boolean;
    _mutation_plan_execution_state?: XStudioMutationPlanExecutionState | null;
  },
) {
  const local_state = is_obj(options._mutation_plan_execution_state)
    ? options._mutation_plan_execution_state
    : null;
  const status = xstudio_artifact_request_render_status(
    local_state?._status ?? options._status ?? request._status,
  );
  const is_running = status === ARTIFACT_REQUEST_STATUS_RUNNING;
  const is_done = status === ARTIFACT_REQUEST_STATUS_DONE;
  const is_failed = status === ARTIFACT_REQUEST_STATUS_FAILED;
  const status_class = _xu.normalize_id(status) ?? "suggested";
  const error = options._error || request._error || "";
  const collapsed = local_state
    ? local_state._collapsed === true
    : options._mutation_plan_collapsed === true;
  const execution_result = local_state
    ? (local_state._result ?? local_state)
    : (options._result ?? request._result);
  const execution = mutation_plan_execution_view(execution_result);
  const payload = xstudio_artifact_request_event_payload(request);
  const title = mutation_plan_text(
    mutation_plan_field(request._artifact_request, "title"),
  ) || "Application changes";
  const goal = mutation_plan_text(
    mutation_plan_field(request._artifact_request, "goal"),
  );
  const summary = mutation_plan_text(
    mutation_plan_field(request._artifact_request, "summary"),
  );
  const plan_status = mutation_plan_text(
    mutation_plan_field(request._artifact_request, "status"),
  ) || "planned";
  const local_steps = local_state && Array.isArray(local_state._steps)
    ? mutation_plan_steps_from_value(local_state._steps)
    : [];
  const steps = local_steps.length > 0 ? local_steps : mutation_plan_steps(request);
  const plan_steps = mutation_plan_steps(request);
  const readiness_steps = plan_steps.length > 0 ? plan_steps : steps;
  const estimated_count = mutation_plan_estimated_count(request, steps);
  const has_compiled_status = local_state ? false : mutation_plan_has_compiled_status(request);
  const deterministic_count = readiness_steps.filter((step) => step._operation_kind === "deterministic").length;
  const generated_count = readiness_steps.filter((step) => step._operation_kind === "ai-generated").length;
  const generation_required_count = readiness_steps.filter((step) => step._operation_kind === "generation-required").length;
  const validation_failed_count = readiness_steps.filter((step) => step._operation_kind === "validation-failed").length;
  const unsupported_after_generation_count = readiness_steps.filter((step) =>
    step._operation_kind === "genuinely-unsupported" ||
    step._operation_kind === "unsupported"
  ).length;
  const executable_count = mutation_plan_executable_count(request, readiness_steps);
  const unsupported_count = mutation_plan_unsupported_count(request, readiness_steps);
  const required_count = readiness_steps.length || estimated_count;
  const all_required_executable =
    required_count > 0 &&
    executable_count >= required_count &&
    generation_required_count === 0 &&
    validation_failed_count === 0 &&
    unsupported_after_generation_count === 0;
  const base_can_apply = mutation_plan_can_apply(request) && all_required_executable;
  const generation_pending = generation_required_count > 0 && !local_state && !is_done && !is_failed;
  const apply_running = is_running && !generation_pending;
  const can_apply = base_can_apply && !apply_running && !is_done;
  const local_completed_count = mutation_plan_number(local_state?._completed_steps);
  const completed_count = is_done
    ? local_completed_count ?? (execution._completed_count || steps.length)
    : execution._completed_count;
  const plan_state = generation_pending
    ? "Generating missing changes"
    : apply_running
    ? "Applying…"
    : is_done
      ? "Applied"
      : is_failed
        ? "Stopped on failure"
        : has_compiled_status
    ? can_apply
      ? "Ready to apply"
      : "Not ready"
    : plan_status;
  const helper_text = generation_pending
    ? `Generating ${generation_required_count} missing change${generation_required_count === 1 ? "" : "s"} with XVibe…`
    : is_done
    ? "✓ Change plan applied"
    : is_failed
      ? "Stopped after the failed step. Later changes were not run."
      : has_compiled_status
    ? base_can_apply
      ? "All planned changes are ready to apply."
      : validation_failed_count > 0
        ? "Generated changes must pass validation before Apply Plan can run."
        : unsupported_after_generation_count > 0
          ? "Some planned changes are unsupported after generation."
          : "Some planned changes are not executable yet."
    : "Plan execution is coming next.";
  const debug_section =
    mutation_plan_debug_section(request, options._message_index);

  _xlog.log("[xstudio]", "mutation plan card state resolved", {
    _message_id: request._message_id,
    _source: local_state ? "local-execution" : "artifact",
    _status: status,
    _collapsed: collapsed,
  });

  if (is_done && collapsed) {
    return {
      _type: "view",
      _id: `xstudio-mutation-plan-${options._message_index}-${status_class}-collapsed`,
      class: "xstudio-artifact-request-card xstudio-mutation-plan-card xstudio-mutation-plan-card-compact xstudio-artifact-request-card-done",
      _children: [
        {
          _type: "view",
          class: "xstudio-artifact-request-content xstudio-mutation-plan-compact-content",
          _children: [
            {
              _type: "label",
              class: "xstudio-artifact-request-title xstudio-mutation-plan-compact-title",
              _text: "✓ Change plan applied",
            },
            {
              _type: "label",
              class: "xstudio-mutation-plan-compact-count",
              _text: `${completed_count} / ${estimated_count} changes completed`,
            },
            {
              _type: "label",
              class: "xstudio-mutation-plan-compact-name",
              _text: title,
            },
          ],
        },
        {
          _type: "view",
          class: "xstudio-artifact-request-buttons xstudio-mutation-plan-buttons",
          _children: [
            {
              _type: "button",
              _id: `xstudio-mutation-plan-view-details-${options._message_index}`,
              type: "button",
              class: "xstudio-intent-action-button xstudio-intent-action-apply",
              _text: "View details",
              title: "Show change plan details",
              _on: {
                click: {
                  _module: "xem",
                  _op: "fire",
                  _params: {
                    event: "studio:mutation-plan-view-details",
                    data: payload,
                  },
                },
              },
            },
            {
              _type: "button",
              _id: `xstudio-mutation-plan-dismiss-${options._message_index}`,
              type: "button",
              class: "xstudio-intent-action-button xstudio-intent-action-dismiss",
              _text: "Dismiss",
              title: "Dismiss change plan summary",
              _on: {
                click: {
                  _module: "xem",
                  _op: "fire",
                  _params: {
                    event: "studio:artifact-request-dismiss",
                    data: payload,
                  },
                },
              },
            },
          ],
        },
      ],
    };
  }

  return {
    _type: "view",
    _id: `xstudio-mutation-plan-${options._message_index}-${status_class}`,
    class: `xstudio-artifact-request-card xstudio-mutation-plan-card xstudio-artifact-request-card-${status_class}${has_compiled_status ? base_can_apply ? " xstudio-mutation-plan-ready" : " xstudio-mutation-plan-blocked" : ""}`,
    _children: [
      {
        _type: "view",
        class: "xstudio-artifact-request-content xstudio-mutation-plan-content",
        _children: [
          {
            _type: "view",
            class: "xstudio-mutation-plan-heading",
            _children: [
              {
                _type: "label",
                class: "xstudio-artifact-request-label xstudio-mutation-plan-label",
                _text: "Change Plan",
              },
              {
                _type: "label",
                class: "xstudio-mutation-plan-count",
                _text: `${estimated_count} planned change${estimated_count === 1 ? "" : "s"}`,
              },
              ...(has_compiled_status
                ? [
                  ...(deterministic_count > 0
                    ? [
                      {
                        _type: "label",
                        class: "xstudio-mutation-plan-count xstudio-mutation-plan-count-deterministic",
                        _text: `${deterministic_count} deterministic`,
                      },
                    ]
                    : []),
                  ...(generated_count > 0
                    ? [
                      {
                        _type: "label",
                        class: "xstudio-mutation-plan-count xstudio-mutation-plan-count-generated",
                        _text: `${generated_count} AI-generated`,
                      },
                    ]
                    : []),
                  {
                    _type: "label",
                    class: "xstudio-mutation-plan-count xstudio-mutation-plan-count-ready",
                    _text: `${executable_count} executable`,
                  },
                  ...(generation_required_count > 0
                    ? [
                      {
                        _type: "label",
                        class: "xstudio-mutation-plan-count xstudio-mutation-plan-count-generating",
                        _text: `Generating ${generation_required_count}`,
                      },
                    ]
                    : []),
                  ...(validation_failed_count > 0
                    ? [
                      {
                        _type: "label",
                        class: "xstudio-mutation-plan-count xstudio-mutation-plan-count-blocked",
                        _text: `${validation_failed_count} validation failed`,
                      },
                    ]
                    : []),
                  ...(unsupported_count > 0 && generation_required_count === 0
                    ? [
                      {
                        _type: "label",
                        class: "xstudio-mutation-plan-count xstudio-mutation-plan-count-blocked",
                        _text: `${unsupported_count} unsupported`,
                      },
                    ]
                    : []),
                ]
                : []),
              ...(is_done || is_failed
                ? [
                  {
                    _type: "label",
                    class: "xstudio-mutation-plan-count xstudio-mutation-plan-count-complete",
                    _text: `${completed_count} completed`,
                  },
                ]
                : []),
              {
                _type: "label",
                class: "xstudio-mutation-plan-status",
                _text: plan_state,
              },
            ],
          },
          {
            _type: "label",
            class: "xstudio-artifact-request-title xstudio-mutation-plan-title",
            _text: title,
          },
          ...(goal
            ? [
              {
                _type: "label",
                class: "xstudio-mutation-plan-goal",
                _text: `Goal: ${goal}`,
              },
            ]
            : []),
          ...(summary
            ? [
              {
                _type: "label",
                class: "xstudio-mutation-plan-summary",
                _text: summary,
              },
            ]
            : []),
          {
            _type: "view",
            class: "xstudio-mutation-plan-steps",
            _children: steps.length > 0
              ? steps.map((step, step_index) => {
                let execution_status = execution._status_by_step_id[step._id] || "";
                if (apply_running && !execution_status && mutation_plan_step_is_executable(step)) {
                  const has_running_step = Object.values(execution._status_by_step_id).some((value) =>
                    value === "running",
                  );
                  const first_pending_step = steps.find((candidate) =>
                    mutation_plan_step_is_executable(candidate) &&
                    !execution._status_by_step_id[candidate._id],
                  );
                  if (!has_running_step && first_pending_step?._id === step._id) {
                    execution_status = "running";
                  }
                }
                if (is_done && !execution_status && mutation_plan_step_is_executable(step)) {
                  execution_status = "done";
                }
                if (is_failed && !execution_status && mutation_plan_step_is_executable(step)) {
                  execution_status = execution._failed_step_id ? "not-run" : "";
                }
                const raw_step_status = mutation_plan_step_status(step, execution_status);
                const step_status = mutation_plan_step_status_label(raw_step_status);
                const unsupported = step_status === "Unsupported";
                const generated = step_status === "AI-generated";
                const deterministic = step_status === "Deterministic";
                const generating = step_status === "Generating missing changes";
                const validation_failed = step_status === "Validation failed";
                const unsupported_after_generation = step_status === "Unsupported after generation failure";
                const failed = step_status === "Failed";
                const done = step_status === "Done";
                const running = step_status === "Running";
                const not_run = step_status === "Not run";
                return {
                  _type: "view",
                  _id: `xstudio-mutation-plan-step-${options._message_index}-${step._id}`,
                  class: `xstudio-mutation-plan-step${mutation_plan_step_is_executable(step) ? " xstudio-mutation-plan-step-ready" : ""}${generated ? " xstudio-mutation-plan-step-generated" : ""}${deterministic ? " xstudio-mutation-plan-step-deterministic" : ""}${generating ? " xstudio-mutation-plan-step-generating" : ""}${unsupported || unsupported_after_generation ? " xstudio-mutation-plan-step-unsupported" : ""}${validation_failed || failed ? " xstudio-mutation-plan-step-failed" : ""}${done ? " xstudio-mutation-plan-step-done" : ""}${running ? " xstudio-mutation-plan-step-running" : ""}${not_run ? " xstudio-mutation-plan-step-not-run" : ""}`,
                  _children: [
                    {
                      _type: "label",
                      class: "xstudio-mutation-plan-step-number",
                      _text: String(step_index + 1),
                    },
                    {
                      _type: "view",
                      class: "xstudio-mutation-plan-step-body",
                      _children: [
                        {
                          _type: "label",
                          class: "xstudio-mutation-plan-step-title",
                          _text: step._display_title || step._title,
                        },
                        {
                          _type: "label",
                          class: "xstudio-mutation-plan-step-status",
                          _text: step_status,
                        },
                        ...(step._operation_summary
                          ? [
                            {
                              _type: "label",
                              class: "xstudio-mutation-plan-step-operation",
                              _text: step._operation_summary,
                            },
                          ]
                          : []),
                        ...(step._affected_artifacts.length > 0
                          ? [
                            {
                              _type: "label",
                              class: "xstudio-mutation-plan-step-artifacts",
                              _text: step._affected_artifacts.join(" · "),
                            },
                          ]
                          : []),
                        ...(step._detail
                          ? [
                            {
                              _type: "label",
                              class: "xstudio-mutation-plan-step-reason",
                              _text: step._detail,
                            },
                          ]
                          : []),
                      ],
                    },
                  ],
                };
              })
              : [
                {
                  _type: "label",
                  class: "xstudio-mutation-plan-empty",
                  _text: "No planned steps returned.",
                },
              ],
          },
          {
            _type: "label",
            class: "xstudio-mutation-plan-helper",
            _text: helper_text,
          },
          ...(error
            ? [
              {
                _type: "label",
                class: "xstudio-artifact-request-error",
                _text: error,
              },
            ]
            : []),
          ...(debug_section ? [debug_section] : []),
        ],
      },
      {
        _type: "view",
        class: "xstudio-artifact-request-buttons xstudio-mutation-plan-buttons",
        _children: is_done
          ? [
            {
              _type: "button",
              _id: `xstudio-mutation-plan-dismiss-${options._message_index}`,
              type: "button",
              class: "xstudio-intent-action-button xstudio-intent-action-dismiss",
              _text: "Dismiss",
              title: "Dismiss change plan details",
              _on: {
                click: {
                  _module: "xem",
                  _op: "fire",
                  _params: {
                    event: "studio:artifact-request-dismiss",
                    data: payload,
                  },
                },
              },
            },
          ]
          : [
          {
            _type: "button",
            _id: `xstudio-mutation-plan-apply-${options._message_index}`,
            type: "button",
            class: `xstudio-intent-action-button xstudio-intent-action-apply${can_apply ? "" : " xstudio-mutation-plan-placeholder"}`,
            _text: is_failed ? "Retry" : apply_running ? "Applying" : is_done ? "Applied" : "Apply Plan",
            title: is_failed ? "Retry change plan" : apply_running ? "Change plan is applying" : generation_pending ? "XVibe is generating missing changes" : is_done ? "Change plan applied" : "Apply change plan",
            ...(can_apply
              ? {
                _on: {
                  click: {
                    _module: "xem",
                    _op: "fire",
                    _params: {
                      event: "studio:artifact-request-apply",
                      data: payload,
                    },
                  },
                },
              }
              : { disabled: true }),
          },
          {
            _type: "button",
            _id: `xstudio-mutation-plan-edit-${options._message_index}`,
            type: "button",
            class: "xstudio-intent-action-button xstudio-intent-action-dismiss xstudio-mutation-plan-placeholder",
            _text: "Edit Plan",
            title: "Plan editing is coming next",
            disabled: true,
          },
          {
            _type: "button",
            _id: `xstudio-mutation-plan-cancel-${options._message_index}`,
            type: "button",
            class: `xstudio-intent-action-button xstudio-intent-action-dismiss${apply_running || is_done || is_failed ? " xstudio-mutation-plan-placeholder" : ""}`,
            _text: "Cancel",
            title: "Dismiss mutation plan preview",
            ...(apply_running || is_done || is_failed ? { disabled: true } : {}),
            ...(!apply_running && !is_done && !is_failed ? {
            _on: {
              click: {
                _module: "xem",
                _op: "fire",
                _params: {
                  event: "studio:artifact-request-dismiss",
                  data: payload,
                },
              },
            },
            } : {}),
          },
        ],
      },
    ],
  };
}

function create_project_plan_card(
  request: XStudioArtifactRequestView,
  options: {
    _message_index: number;
    _status?: string;
    _error?: any;
    _result?: any;
    _planning_question_selected_answers?: Record<string, string[]>;
    _project_plan_expanded?: boolean;
  },
) {
  const status = xstudio_artifact_request_render_status(options._status ?? request._status);
  const status_class = _xu.normalize_id(status) ?? "suggested";
  const is_running = status === ARTIFACT_REQUEST_STATUS_RUNNING;
  const is_done = status === ARTIFACT_REQUEST_STATUS_DONE;
  const error = options._error || request._error || "";
  const result = options._result ?? request._result;
  const source = project_plan_source(request);
  const readiness = project_plan_readiness_source(request, source, result);
  const summary_source = project_plan_summary_source(request, source, result);
  const question = project_plan_current_question(request);
  const question_text = question ? project_plan_question_text(question) : "";
  const is_complete = project_plan_is_complete(request, source);
  const has_active_question = Boolean(question && question_text && !is_done && !is_complete);
  const suggestions = question ? project_plan_question_suggestions(question) : [];
  const question_type = question ? project_plan_question_type(question) : "";
  const question_key = question ? project_plan_question_key(options._message_index, question) : "";
  const selected_answers = question_key
    ? options._planning_question_selected_answers?.[question_key] ?? []
    : [];
  const progress = project_plan_progress(request, source, question);
  const goal = project_plan_first_string(summary_source, ["goal"]) ||
    project_plan_first_string(source, ["goal", "project_goal", "user_goal"]) ||
    "Not specified.";
  const fallback_summary = project_plan_first_string(source, ["summary", "description", "overview"]) ||
    "No summary provided.";
  const title = project_plan_title(request, source, summary_source);
  const description = project_plan_description(source, summary_source, title) || fallback_summary;
  const metrics = project_plan_metric_summary(source, summary_source);
  const malformed = !project_plan_has_semantic_review(source, summary_source);
  const blockers = project_plan_blocker_rows(request, source, readiness, summary_source, question);
  const remaining_decision_count = project_plan_required_decision_count(blockers);
  const has_genuine_blocker = project_plan_has_genuine_blocker({
    _status: status,
    _error: error,
    _result: result,
    _malformed: malformed,
    _blockers: blockers,
  });
  const warnings = project_plan_warning_rows(source, readiness, summary_source);
  const optional = project_plan_unresolved_optional_rows(source, readiness);
  const is_ready = project_plan_ready_state({
    _request: request,
    _source: source,
    _readiness: readiness,
    _summary: summary_source,
    _question: has_active_question ? question : null,
    _is_complete: is_complete,
    _is_malformed: malformed,
  });
  const project_plan_expanded = options._project_plan_expanded === true;
  const review = project_plan_expanded
    ? project_plan_review({
      _request: request,
      _message_index: options._message_index,
      _source: source,
      _summary_source: summary_source,
      _readiness: readiness,
      _result: result,
      _goal: goal,
      _summary: description,
      _is_complete: is_complete,
      _is_done: is_done,
      _is_ready: is_ready,
      _blockers: blockers,
      _warnings: warnings,
      _optional: optional,
      _malformed: malformed,
      _has_genuine_blocker: has_genuine_blocker,
      _has_active_question: has_active_question,
      _compact: has_active_question,
      _hide_status_badge: is_done,
    })
    : is_done
      ? null
      : project_plan_compact_review(request, {
      _message_index: options._message_index,
      _is_done: is_done,
      _is_ready: is_ready,
      _blockers: blockers,
      _has_active_question: has_active_question,
      _has_genuine_blocker: has_genuine_blocker,
      _malformed: malformed,
      });
  const confirm_disabled_reason = malformed
    ? "Plan review is unavailable because the server response is malformed."
    : has_active_question
      ? "Answer the current planning question first."
      : remaining_decision_count > 0
        ? project_plan_remaining_decisions_label(remaining_decision_count)
        : has_genuine_blocker
          ? "Resolve the blocked planning issue before confirming."
        : !is_ready
          ? "Server readiness is not complete yet."
          : "";
  const display_status_class = status === ARTIFACT_REQUEST_STATUS_FAILED && !has_genuine_blocker
    ? ARTIFACT_REQUEST_STATUS_SUGGESTED
    : status_class;
  const plan_state_class = has_genuine_blocker || malformed
    ? "xstudio-project-plan-card-blocked"
    : is_ready
      ? "xstudio-project-plan-card-ready"
      : "xstudio-project-plan-card-planning";

  return {
    _type: "view",
    _id: `xstudio-project-plan-${options._message_index}-${display_status_class}`,
    class: `xstudio-artifact-request-card xstudio-project-plan-card xstudio-artifact-request-card-${display_status_class}${has_active_question ? " xstudio-project-plan-card-question" : ""}${is_complete ? " xstudio-project-plan-card-complete" : ""} ${plan_state_class}`,
    _children: [
      {
        _type: "view",
        class: "xstudio-artifact-request-content xstudio-project-plan-content",
        _children: [
          {
            _type: "label",
            class: "xstudio-artifact-request-label xstudio-project-plan-label",
            _text: "Project Plan",
          },
          project_plan_overview_panel({
            _message_index: options._message_index,
            _title: title,
            _description: description,
            _metrics: metrics,
            _remaining_decision_count: remaining_decision_count,
          }),
          ...(is_running
            ? [
              {
                _type: "label",
                class: "xstudio-project-plan-state-note",
                role: "status",
                _text: "Confirmation is in progress.",
              },
            ]
            : []),
          ...(is_done
            ? [
              {
                _type: "label",
                class: "xstudio-artifact-request-success xstudio-project-plan-success",
                _text: "✓ Plan confirmed",
              },
              {
                _type: "label",
                class: "xstudio-project-plan-state-note xstudio-project-plan-guide-ready-note",
                _text: "Your build guide is ready.",
              },
            ]
            : []),
          ...(has_active_question && question
            ? [
              review,
              project_plan_question_panel({
                _message_index: options._message_index,
                _question: question,
                _question_text: question_text,
                _question_type: question_type,
                _question_key: question_key,
                _progress: progress,
                _suggestions: suggestions,
                _selected_answers: selected_answers,
              }),
            ]
            : [
              ...(is_complete && !is_done
                ? [
                  {
                    _type: "label",
                    class: "xstudio-project-plan-complete-label",
                    _text: "Planning complete",
                  },
                ]
                : []),
              ...(review ? [review] : []),
            ]),
          ...(error
            ? [
              {
                _type: "label",
                class: has_genuine_blocker ? "xstudio-artifact-request-error" : "xstudio-project-plan-state-note",
                _text: error,
              },
            ]
            : []),
        ],
      },
      ...(has_active_question
        ? []
        : [
          {
            _type: "view",
            class: "xstudio-artifact-request-buttons xstudio-project-plan-buttons",
            _children: is_done
              ? [
                ...(!project_plan_expanded ? [
                  project_plan_review_toggle_button(request, {
                    _message_index: options._message_index,
                    _expanded: false,
                  }),
                ] : []),
                project_plan_open_guide_button({
                  _message_index: options._message_index,
                }),
              ]
              : [
              project_plan_confirm_button(request, {
                _message_index: options._message_index,
                _running: is_running,
                _confirmed: is_done,
                _disabled: !is_ready,
                _disabled_reason: confirm_disabled_reason,
              }),
              ...(!is_ready && confirm_disabled_reason
                ? [
                  {
                    _type: "label",
                    _id: `xstudio-project-plan-confirm-disabled-reason-${options._message_index}`,
                    class: "xstudio-project-plan-confirm-disabled-reason",
                    _text: confirm_disabled_reason,
                  },
                ]
                : []),
              ...(!is_complete
                ? [
                  project_plan_action_button({
                    _message_index: options._message_index,
                    _action: "edit",
                    _text: "Edit Plan",
                    _prompt: PROJECT_PLAN_EDIT_PROMPT,
                  }),
                  project_plan_action_button({
                    _message_index: options._message_index,
                    _action: "ask-questions",
                    _text: "Ask Questions",
                    _prompt: PROJECT_PLAN_ASK_QUESTIONS_PROMPT,
                  }),
                ]
                : []),
              ],
          },
        ]),
    ],
  };
}

export function create_xstudio_artifact_request_card(
  request: XStudioArtifactRequestView,
  options: {
    _message_index: number;
    _status?: string;
    _error?: any;
    _success?: string;
    _result?: any;
    _planning_question_selected_answers?: Record<string, string[]>;
    _project_plan_expanded?: boolean;
    _mutation_plan_collapsed?: boolean;
    _mutation_plan_execution_state?: XStudioMutationPlanExecutionState | null;
  },
) {
  if (request._artifact_type === PROJECT_PLAN_ARTIFACT_TYPE) {
    return create_project_plan_card(request, options);
  }

  if (request._artifact_type === EXECUTION_GRAPH_ARTIFACT_TYPE) {
    return create_execution_graph_card(request, options);
  }

  if (request._artifact_type === CRUD_FIELD_SUGGESTION_ARTIFACT_TYPE) {
    return create_crud_field_suggestion_card(request, options);
  }

  if (request._artifact_type === CAPABILITY_GUIDANCE_ARTIFACT_TYPE) {
    return create_capability_guidance_card(request, options);
  }

  if (request._artifact_type === MUTATION_PLAN_ARTIFACT_TYPE) {
    return create_mutation_plan_card(request, options);
  }

  const status = xstudio_artifact_request_render_status(options._status ?? request._status);
  const is_running = status === ARTIFACT_REQUEST_STATUS_RUNNING;
  const is_done = status === ARTIFACT_REQUEST_STATUS_DONE;
  const is_failed = status === ARTIFACT_REQUEST_STATUS_FAILED;
  const status_class = _xu.normalize_id(status) ?? "suggested";
  const error = options._error || request._error || "";
  const success = options._success || xstudio_artifact_request_success_message(request);
  const result = options._result ?? request._result;
  const error_message = error ? artifact_request_error_message(error, result) : "";
  const error_code = error ? artifact_request_error_field(error, result, "code") : "";
  const error_stage = error ? artifact_request_error_field(error, result, "stage") : "";
  const error_recoverable = error ? artifact_request_error_recoverable(error, result) : "";
  const error_debug = error
    ? artifact_request_error_debug_card(request, error, result, options._message_index)
    : null;
  const payload = xstudio_artifact_request_event_payload(request);
  const card_id = `xstudio-artifact-request-${options._message_index}-${status_class}`;

  if (is_done) {
    return {
      _type: "view",
      _id: card_id,
      class: `xstudio-artifact-request-card xstudio-artifact-request-card-${status_class} xstudio-artifact-request-card-compact`,
      _children: [
        {
          _type: "label",
          class: "xstudio-artifact-request-success",
          _text: `✓ ${success}`,
        },
      ],
    };
  }

  return {
    _type: "view",
    _id: card_id,
    class: `xstudio-artifact-request-card xstudio-artifact-request-card-${status_class}`,
    _children: [
      {
        _type: "view",
        class: "xstudio-artifact-request-content",
        _children: [
          {
            _type: "label",
            class: "xstudio-artifact-request-label",
            _text: "Artifact Request",
          },
          {
            _type: "label",
            class: "xstudio-artifact-request-title",
            _text: request._title,
          },
          ...(request._details.length > 0
            ? [
              {
                _type: "label",
                class: "xstudio-artifact-request-details-label",
                _text: "Details:",
              },
            ]
            : []),
          ...request._details.map((detail, detail_index) => ({
            _type: "label",
            _id: `xstudio-artifact-request-detail-${options._message_index}-${detail_index}`,
            class: "xstudio-artifact-request-detail",
            _text: `• ${detail._label}: ${detail._value}`,
          })),
          ...(error_message
            ? [
              {
                _type: "label",
                class: "xstudio-artifact-request-error",
                _text: error_message,
              },
              ...(error_code || error_stage || error_recoverable
                ? [
                  {
                    _type: "view",
                    class: "xstudio-artifact-request-error-meta",
                    _children: [
                      ...(error_code
                        ? [
                          {
                            _type: "label",
                            class: "xstudio-artifact-request-error-code",
                            _text: error_code,
                          },
                        ]
                        : []),
                      ...(error_stage
                        ? [
                          {
                            _type: "label",
                            class: "xstudio-artifact-request-error-stage",
                            _text: `Stage: ${error_stage}`,
                          },
                        ]
                        : []),
                      ...(error_recoverable
                        ? [
                          {
                            _type: "label",
                            class: "xstudio-artifact-request-error-recoverable",
                            _text: error_recoverable,
                          },
                        ]
                        : []),
                    ],
                  },
                ]
                : []),
              ...(error_debug ? [error_debug] : []),
            ]
            : []),
        ],
      },
      {
        _type: "view",
        class: "xstudio-artifact-request-buttons",
        _children: [
          {
            _type: "button",
            _id: `xstudio-artifact-request-apply-${options._message_index}`,
            type: "button",
            class: "xstudio-intent-action-button xstudio-intent-action-apply",
            _text: is_running ? "Running" : is_failed ? "Retry" : "Apply",
            title: is_running ? "Artifact request is running" : "Apply artifact request",
            ...(is_running ? { disabled: true } : {}),
            ...(!is_running ? { _on: {
              click: {
                _module: "xem",
                _op: "fire",
                _params: {
                  event: "studio:artifact-request-apply",
                  data: payload,
                },
              },
            } } : {}),
          },
          ...(!is_running
            ? [
              {
                _type: "button",
                _id: `xstudio-artifact-request-dismiss-${options._message_index}`,
                type: "button",
                class: "xstudio-intent-action-button xstudio-intent-action-dismiss",
                _text: "Dismiss",
                title: "Dismiss artifact request",
                _on: {
                  click: {
                    _module: "xem",
                    _op: "fire",
                    _params: {
                      event: "studio:artifact-request-dismiss",
                      data: payload,
                    },
                  },
                },
              },
            ]
            : []),
        ],
      },
    ],
  };
}
