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
  _error: string;
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

const ARTIFACT_REQUEST_STATUS_SUGGESTED = "suggested";
const ARTIFACT_REQUEST_STATUS_DISMISSED = "dismissed";
const ARTIFACT_REQUEST_STATUS_RUNNING = "running";
const ARTIFACT_REQUEST_STATUS_DONE = "done";
const ARTIFACT_REQUEST_STATUS_FAILED = "failed";
export const EXECUTION_GRAPH_ARTIFACT_TYPE = "execution-graph";

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
  return artifact_request_string_value(
    message._artifact_error ??
    message.artifact_error ??
    intent._artifact_error ??
    intent.artifact_error ??
    request._artifact_error ??
    request.artifact_error,
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
  const artifact_type = intent
    ? String(artifact_request_intent_value(intent, "artifact_type") ?? "").trim()
    : "";
  const request = intent ? intent._artifact_request ?? intent.artifact_request : null;

  _xlog.log("[xstudio]", "artifact card render check", {
    _message_id: options._message_id,
    _message_type: message_type,
    _artifact_type: artifact_type,
    _has_artifact_request: is_obj(request),
  });

  if (!intent) return null;

  if (
    (message_type !== "generate" && message_type !== "plan") ||
    execution_level !== "artifact" ||
    !is_obj(request)
  ) {
    return null;
  }

  const raw_operation = String(request._operation ?? request.operation ?? "").trim();
  const operation = artifact_type === EXECUTION_GRAPH_ARTIFACT_TYPE
    ? raw_operation || "plan"
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
  },
) {
  const status = xstudio_artifact_request_render_status(options._status ?? request._status);
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

export function create_xstudio_artifact_request_card(
  request: XStudioArtifactRequestView,
  options: {
    _message_index: number;
    _status?: string;
    _error?: string;
    _success?: string;
    _result?: any;
  },
) {
  if (request._artifact_type === EXECUTION_GRAPH_ARTIFACT_TYPE) {
    return create_execution_graph_card(request, options);
  }

  const status = xstudio_artifact_request_render_status(options._status ?? request._status);
  const is_running = status === ARTIFACT_REQUEST_STATUS_RUNNING;
  const is_done = status === ARTIFACT_REQUEST_STATUS_DONE;
  const is_failed = status === ARTIFACT_REQUEST_STATUS_FAILED;
  const status_class = _xu.normalize_id(status) ?? "suggested";
  const error = options._error || request._error || "";
  const success = options._success || xstudio_artifact_request_success_message(request);
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
