import sokosumiExtension, {
  type PiExtensionAPI,
  type PiToolDefinition,
  type SokosumiExtension,
  type SokosumiExtensionConfig
} from "@masumi-network/pi-sokosumi";
import extensionEntry from "@masumi-network/pi-sokosumi/extension";
import {
  SokosumiRequestError,
  createHttpSokosumiClient,
  type HttpSokosumiClientOptions,
  type SokosumiFetch,
  type SokosumiHttpClient
} from "@masumi-network/pi-sokosumi/client";
import {
  SOKOSUMI_CANCELED_TASK_EVENT_STATUSES,
  SOKOSUMI_COWORKER_PROGRESS_STATUSES,
  SOKOSUMI_EVENT_ORIGINS,
  SOKOSUMI_TASK_EVENT_DECISION_STATUSES,
  SOKOSUMI_TASK_EVENT_STATUS_DECISION_PROMPT,
  SOKOSUMI_TASK_EVENT_STATUS,
  SOKOSUMI_TASK_EVENT_STATUSES,
  SOKOSUMI_TERMINAL_TASK_EVENT_STATUSES,
  isSokosumiCanceledTaskEventStatus,
  isSokosumiCoworkerProgressStatus,
  isSokosumiTaskEventDecisionStatus,
  isSokosumiTaskEventStatus,
  isSokosumiTerminalTaskEventStatus,
  normalizeSokosumiTaskStatus,
  type CommentOnTaskInput,
  type CreateCoworkerUsageInput,
  type CreateTaskInput,
  type ListSokosumiCoworkerEventsInput,
  type SokosumiClient,
  type SokosumiCoworker,
  type SokosumiCoworkerEventPage,
  type SokosumiCoworkerUsage,
  type SokosumiEventOrigin,
  type SokosumiPagination,
  type SokosumiTask,
  type SokosumiTaskComment,
  type SokosumiTaskEvent,
  type SokosumiTaskEventInput,
  type SokosumiTaskEventStatus,
  type SokosumiTaskSnapshot,
  type SokosumiTaskStatus,
  type SokosumiUser,
  type UpdateTaskInput
} from "@masumi-network/pi-sokosumi/types";
import {
  extractSokosumiIdentityMetadata,
  resolveSokosumiIdentity,
  type ResolveSokosumiIdentityOptions,
  type SokosumiIdentity
} from "@masumi-network/pi-sokosumi/identity";
import {
  SOKOSUMI_COMMENT_ON_TASK_TOOL_DESCRIPTION,
  SOKOSUMI_COMMENT_ON_TASK_TOOL_LABEL,
  SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME,
  SOKOSUMI_COMMENT_ON_TASK_TOOL_PARAMETERS,
  commentOnSokosumiTask,
  createJsonToolResult,
  createSokosumiCommentOnTaskTool,
  registerSokosumiCoworkerTools,
  registerSokosumiTools,
  type SokosumiCommentOnTaskInput,
  type SokosumiCreateTaskEventToolInput
} from "@masumi-network/pi-sokosumi/tools";
import {
  PiAgentChatRequestError,
  createPiAgentChatRouteHandler,
  normalizePiAgentChatRequest,
  readPiAgentChatJson,
  sendPiAgentChatJson,
  startPiAgentChatServer,
  type NormalizePiAgentChatRequestInput,
  type PiAgentChatRequest,
  type PiAgentChatRouteOptions,
  type PiAgentChatServerOptions
} from "@masumi-network/pi-sokosumi/chat";
import {
  createSokosumiTaskPoller,
  type SokosumiAfterTaskEventCreatedInput,
  type SokosumiBeforeTaskEventCreatedInput,
  type SokosumiTaskPoller,
  type SokosumiTaskPollerClient,
  type SokosumiTaskPollerOptions
} from "@masumi-network/pi-sokosumi/poller";
import {
  createRunningTaskEvent,
  createSokosumiTaskCompletionHandler,
  getSokosumiEventText,
  getSokosumiTaskPrimaryText,
  startSokosumiAgentWorker,
  type SokosumiAgentWorkerOptions,
  type SokosumiTaskContext,
  type SokosumiTaskTrace
} from "@masumi-network/pi-sokosumi/worker";
import {
  MASUMI_CENT_RAW_UNITS,
  MASUMI_DEFAULT_PAY_BY_MS,
  MASUMI_DEFAULT_SUBMIT_RESULT_MS,
  MASUMI_ESCROW_STATES,
  MASUMI_NETWORKS,
  MASUMI_PAYMENT_SUBMIT_STATUSES,
  MASUMI_USDM_UNITS,
  MasumiPaymentError,
  canonicalJson,
  createMasumiCompletionHooks,
  createMasumiPaymentClient,
  createMasumiPaymentPoller,
  createMemoryMasumiPaymentStore,
  createSokosumiMasumiPaymentPayload,
  creditsToMasumiCostCents,
  creditsToMasumiRawUnits,
  isReadyForSubmitResult,
  masumiCentsToRawUnits,
  normalizeMasumiApiUrl,
  normalizeMasumiCostCents,
  normalizeMasumiNetwork,
  normalizeMasumiRawUnits,
  normalizePendingPayment,
  sha256Hex,
  usdToMasumiCostCents,
  type MasumiCompletionHooksOptions,
  type MasumiNetwork,
  type MasumiPayment,
  type MasumiPaymentClientOptions,
  type MasumiPaymentPollerOptions,
  type MasumiPaymentStore,
  type MasumiPendingPaymentRecord,
  type RecordPendingMasumiPaymentInput
} from "@masumi-network/pi-sokosumi/masumi";
import {
  createMockSokosumiClient,
  type MockSokosumiClient
} from "@masumi-network/pi-sokosumi/mock-client";
import type { IncomingMessage, ServerResponse } from "node:http";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type Expect<Value extends true> = Value;

const pi: PiExtensionAPI = {
  registerTool<TParams extends Record<string, unknown>, TDetails>(
    _tool: PiToolDefinition<TParams, TDetails>
  ) {},
  on() {}
};
const rootExtension: SokosumiExtension = sokosumiExtension;
rootExtension(pi);
extensionEntry(pi);
const extensionConfig: SokosumiExtensionConfig = {
  extensionMode: "api",
  apiUrl: "https://sokosumi.example.test",
  coworkerApiKey: "key",
  pollerEnabled: true,
  pollIntervalMs: 1000,
  pollLimit: 20,
  pollMaxPages: 5,
  readyStatuses: ["READY"],
  skipExistingProgress: true,
  pollerMode: "complete",
  claimEnabled: true,
  claimStatus: "RUNNING",
  completeStatus: "COMPLETED",
  failStatus: "FAILED",
  origin: "SOKOSUMI",
  claimComment: "Claimed",
  completeComment: "Done",
  failComment: "Failed"
};
void extensionConfig;

declare const sokosumiFetch: SokosumiFetch;
const httpOptions: HttpSokosumiClientOptions = {
  apiUrl: "https://sokosumi.example.test/",
  apiKey: "key",
  fetchImpl: sokosumiFetch,
  timeoutMs: 5000
};
const httpClient: SokosumiHttpClient = createHttpSokosumiClient(httpOptions);
void httpClient.getCurrentCoworker();
void httpClient.listCoworkerEvents({ limit: 50, cursor: "next" });
void httpClient.getTask("task-1");
void httpClient.updateTask({
  taskId: "task-1",
  title: "Updated",
  description: "Description",
  status: "in_progress",
  metadata: { source: "type-test" },
  applicationField: true
});
void httpClient.getUser("user-1", { organizationId: "org-1", organizationSlug: "org" });
void httpClient.createTaskEvent("task-1", {
  status: "COMPLETED",
  origin: "SOKOSUMI",
  comment: "Done",
  credits: 2.5,
  metadata: { source: "type-test" },
  masumiPayment: { id: "payment-1" }
});
void httpClient.createCoworkerUsage({
  userId: "user-1",
  organizationId: null,
  idempotencyKey: "usage-1",
  credits: 2.5,
  referenceId: "task-1"
});
void httpClient.createCoworkerUsage({
  sokosumiUserId: "user-1",
  organization_id: "org-1",
  idempotency_key: "usage-legacy-1",
  credits: 1,
  reference_id: "task-1"
});
const requestError: SokosumiRequestError = new SokosumiRequestError("bad response", {
  code: "invalid_response",
  payload: null
});
void requestError;

const eventStatus: SokosumiTaskEventStatus = SOKOSUMI_TASK_EVENT_STATUS.READY;
const eventOrigin: SokosumiEventOrigin = SOKOSUMI_EVENT_ORIGINS[0];
const acceptsEventStatus = (value: SokosumiTaskEventStatus) => value;
const acceptsEventOrigin = (value: SokosumiEventOrigin) => value;
void acceptsEventStatus(eventStatus);
void acceptsEventOrigin(eventOrigin);
const eventInput: SokosumiTaskEventInput = { status: eventStatus, origin: eventOrigin };
const eventRecord: SokosumiTaskEvent = { id: "event-1", taskId: "task-1", status: "READY" };
const taskRecord: SokosumiTaskSnapshot = { id: "task-1", status: "READY", events: [eventRecord] };
void eventInput;
void taskRecord;
void SOKOSUMI_CANCELED_TASK_EVENT_STATUSES;
void SOKOSUMI_COWORKER_PROGRESS_STATUSES;
void SOKOSUMI_TASK_EVENT_DECISION_STATUSES;
void SOKOSUMI_TASK_EVENT_STATUS_DECISION_PROMPT;
void SOKOSUMI_TASK_EVENT_STATUSES;
void SOKOSUMI_TERMINAL_TASK_EVENT_STATUSES;
void isSokosumiCanceledTaskEventStatus("CANCELED");
void isSokosumiCoworkerProgressStatus("RUNNING");
void isSokosumiTaskEventDecisionStatus("COMPLETED");
void isSokosumiTaskEventStatus("READY");
void isSokosumiTerminalTaskEventStatus("DONE");
void normalizeSokosumiTaskStatus("in progress");
const domainTypes: {
  client?: SokosumiClient;
  task?: SokosumiTask;
  comment?: SokosumiTaskComment;
  create?: CreateTaskInput;
  update?: UpdateTaskInput;
  commentInput?: CommentOnTaskInput;
  usage?: CreateCoworkerUsageInput;
  list?: ListSokosumiCoworkerEventsInput;
  page?: SokosumiCoworkerEventPage;
  pagination?: SokosumiPagination;
  coworker?: SokosumiCoworker;
  user?: SokosumiUser;
  usageResult?: SokosumiCoworkerUsage;
  status?: SokosumiTaskStatus;
} = {};
void domainTypes;
// @ts-expect-error creation statuses exclude legacy response-only aliases
const invalidEventInput: SokosumiTaskEventInput = { status: "DONE" };
void invalidEventInput;

const identityOptions: ResolveSokosumiIdentityOptions = {
  headers: { "x-delegation-user-id": "user-1" }
};
const identity: SokosumiIdentity | null = resolveSokosumiIdentity(
  { metadata: { organizationId: "org-1" } },
  identityOptions
);
const identityMetadata = extractSokosumiIdentityMetadata({}, identityOptions.headers);
void identity;
void identityMetadata;

const commentInput: SokosumiCommentOnTaskInput = { taskId: "task-1", comment: "Working" };
void SOKOSUMI_COMMENT_ON_TASK_TOOL_DESCRIPTION;
void SOKOSUMI_COMMENT_ON_TASK_TOOL_LABEL;
void SOKOSUMI_COMMENT_ON_TASK_TOOL_NAME;
void SOKOSUMI_COMMENT_ON_TASK_TOOL_PARAMETERS;
const commentTool = createSokosumiCommentOnTaskTool(httpClient);
void commentTool.execute("call-1", commentInput);
void commentOnSokosumiTask(httpClient, commentInput);
void createJsonToolResult({ ok: true });
const taskEventToolInput: SokosumiCreateTaskEventToolInput = {
  taskId: "task-1",
  status: "RUNNING",
  origin: "SOKOSUMI",
  comment: "Working",
  credits: 1
};
void taskEventToolInput;
const invalidTaskEventToolInput: SokosumiCreateTaskEventToolInput = {
  taskId: "task-1",
  status: "RUNNING",
  // @ts-expect-error coworker-created tool events cannot claim USER origin
  origin: "USER"
};
void invalidTaskEventToolInput;
registerSokosumiCoworkerTools(pi, httpClient);

const mockClient: MockSokosumiClient = createMockSokosumiClient();
registerSokosumiTools(pi, mockClient);
void mockClient.createTask({
  title: "Mock",
  description: "Task",
  status: "draft",
  metadata: { source: "type-test" }
});
void mockClient.updateTask({
  taskId: "task-1",
  title: "Updated",
  description: "Task",
  status: "done",
  metadata: { result: true }
});
void mockClient.commentOnTask({ taskId: "task-1", body: "Comment" });
void mockClient.getTask("task-1");

const normalizeChatInput: NormalizePiAgentChatRequestInput = {
  body: { message: "Hello" },
  headers: { "x-user-id": "user-1" },
  agentId: "nori",
  surface: "chat",
  defaultAgentId: "nori",
  defaultSurface: "chat",
  supportedAgentIds: ["nori"],
  supportedSurfaces: { nori: ["chat"] },
  metadata: { source: "type-test" }
};
const chatRequest: PiAgentChatRequest = normalizePiAgentChatRequest(normalizeChatInput);
type CustomChatRequest = PiAgentChatRequest & { correlationId: string };
type CustomChatResult = { ok: true; correlationId: string };
const chatRouteOptions: PiAgentChatRouteOptions<CustomChatRequest, CustomChatResult> = {
  path: "/chat",
  maxBodyBytes: 1024,
  defaultAgentId: "nori",
  defaultSurface: "chat",
  supportedAgentIds: ["nori"],
  supportedSurfaces: ["chat"],
  authorize: async ({ req, res, headers }) => { void req; void res; void headers; },
  rateLimit: ({ req, res, headers }) => { void req; void res; void headers; },
  normalizeRequest: ({ body, headers, req }) => {
    void req;
    return { ...normalizePiAgentChatRequest({ body, headers }), correlationId: "correlation-1" };
  },
  handleChat: ({ request, body, headers, req }) => {
    void body;
    void headers;
    void req;
    return { ok: true, correlationId: request.correlationId };
  },
  onError: ({ error, req, res, body }) => { void error; void req; void res; void body; }
};
const chatRoute = createPiAgentChatRouteHandler(chatRouteOptions);
const chatServerOptions: PiAgentChatServerOptions<CustomChatRequest, CustomChatResult> = {
  ...chatRouteOptions,
  port: 0,
  host: "127.0.0.1",
  healthPath: "/healthz",
  healthResponse: () => ({ status: "ok" }),
  logger: console
};
const chatServer = startPiAgentChatServer(chatServerOptions);
declare const req: IncomingMessage;
declare const res: ServerResponse;
void chatRoute(req, res);
void readPiAgentChatJson(req, 1024);
sendPiAgentChatJson(res, 200, { ok: true });
const chatError = new PiAgentChatRequestError("invalid", 422);
void chatRequest;
void chatServer;
void chatError;

const pollerClient: SokosumiTaskPollerClient = httpClient;
const pollerOptions: SokosumiTaskPollerOptions = {
  client: pollerClient,
  intervalMs: 1000,
  limit: 20,
  maxPages: 5,
  logger: console,
  shouldProcessEvent: (event, task) => Boolean(event.id && task.id),
  hasTaskProgress: (task, event) => Boolean(task.events?.some((item) => item.id === event.id)),
  createReopenedEvent: ({ event, task }) => ({ status: "READY", origin: "SOKOSUMI", comment: `${event.id}:${task.id}` }),
  createRunningEvent: ({ event, task }) => ({ status: "RUNNING", origin: "SOKOSUMI", comment: `${event.id}:${task.id}` }),
  createCanceledEvent: ({ event, task }) => ({ status: "CANCELED", origin: "SOKOSUMI", comment: `${event.id}:${task.id}` }),
  createCompletedEvent: ({ event, task }) => ({ status: "COMPLETED", origin: "SOKOSUMI", comment: `${event.id}:${task.id}` }),
  createFailedEvent: ({ event, task, error }) => ({ status: "FAILED", origin: "SOKOSUMI", comment: `${event.id}:${task.id}:${String(error)}` }),
  createStaleInputRequiredEvent: ({ event, task, inputRequiredEvent, now }) => ({
    status: "COMPLETED",
    origin: "SOKOSUMI",
    comment: `${event.id}:${task.id}:${inputRequiredEvent.id}:${now.toISOString()}`
  }),
  inputRequiredTimeoutMs: 5000,
  now: () => new Date(),
  beforeTaskEventCreated: (input: SokosumiBeforeTaskEventCreatedInput) => ({
    ...input.taskEvent,
    metadata: { transformed: true }
  }),
  afterTaskEventCreated: (input: SokosumiAfterTaskEventCreatedInput) => {
    void input.createdTaskEvent;
  }
};
const poller: SokosumiTaskPoller = createSokosumiTaskPoller(pollerOptions);
poller.start();
poller.stop();
void poller.tick();

type ApplicationTaskContext = SokosumiTaskContext & {
  applicationTaskId: string;
};
type ApplicationHandlerResult = SokosumiTaskEventInput & {
  handlerResult: { provider: "application"; value: number };
};
const workerOptions: SokosumiAgentWorkerOptions<ApplicationTaskContext, ApplicationHandlerResult> = {
  enabled: true,
  apiUrl: "https://sokosumi.example.test",
  apiKey: "key",
  intervalMs: 1000,
  limit: 20,
  maxPages: 5,
  logger: console,
  runningComment: "Running",
  canceledComment: "Canceled",
  bootstrapComment: "Bootstrapped",
  inputRequiredTimeoutMs: 5000,
  createTrace: () => ({
    step: async (_name, _metadata, _options) => {},
    updateContext: (_context) => {}
  }),
  resolveTaskContext: ({ task, event, client, trace, identity }) => {
    void task;
    void event;
    void client;
    void trace;
    void identity;
    return {
      applicationTaskId: "application-task-1",
      traceContext: { source: "type-test" },
      traceStep: { name: "resolved", metadata: { ok: true }, options: { flush: true } },
      taskPatch: { title: "Patched" }
    };
  },
  createTaskHandler: ({ task, event, client, trace, identity, taskContext }) => {
    void task;
    void event;
    void client;
    void trace;
    void identity;
    return {
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: taskContext.applicationTaskId,
      handlerResult: { provider: "application", value: 1 }
    };
  },
  createStaleInputRequiredEvent: ({ inputRequiredEvent, client }) => {
    void client;
    return { status: "COMPLETED", origin: "SOKOSUMI", comment: inputRequiredEvent.id };
  },
  beforeTaskEventCreated: ({ taskEvent, client }) => { void client; return taskEvent; },
  afterTaskEventCreated: ({ createdTaskEvent, client }) => { void createdTaskEvent; void client; }
};
const workerRuntime = startSokosumiAgentWorker(workerOptions);
void workerRuntime?.client;
// @ts-expect-error custom task contexts require a resolver that constructs them
const invalidWorkerOptions: SokosumiAgentWorkerOptions<ApplicationTaskContext, ApplicationHandlerResult> = {
  enabled: true,
  createTaskHandler: () => ({
    status: "COMPLETED",
    origin: "SOKOSUMI",
    handlerResult: { provider: "application", value: 1 }
  })
};
void invalidWorkerOptions;
const completionHandler = createSokosumiTaskCompletionHandler({
  client: httpClient,
  resolveTaskContext: () => ({ applicationTaskId: "application-task-1" }),
  createTaskHandler: ({ taskContext }) => ({
    status: "COMPLETED",
    origin: "SOKOSUMI",
    handlerResult: { provider: "application", value: taskContext.applicationTaskId.length }
  }) satisfies ApplicationHandlerResult
});
void completionHandler({ event: eventRecord, task: taskRecord });
const trace: SokosumiTaskTrace = { step: () => {} };
void trace;
void createRunningTaskEvent(null);
void getSokosumiEventText(eventRecord);
void getSokosumiTaskPrimaryText(taskRecord);

declare const masumiFetch: NonNullable<MasumiPaymentClientOptions["fetchImpl"]>;
const masumiOptions: MasumiPaymentClientOptions = {
  apiUrl: "https://masumi.example.test/admin",
  apiToken: "token",
  agentIdentifier: "agent-1",
  network: "Preprod",
  paymentUnit: "unit",
  fetchImpl: masumiFetch,
  timeoutMs: 5000,
  now: () => new Date()
};
const masumiClient = createMasumiPaymentClient(masumiOptions);
void masumiClient.createPayment({
  taskId: "task-1",
  costCents: 3n,
  credits: "2.5",
  totalCostUsd: 0.03,
  totalCost: "0.03",
  amountRawUnits: 30000n,
  rawAmount: "30000",
  payByTime: new Date(),
  submitResultTime: Date.now(),
  RequestedFunds: [{ amount: 30000n, unit: "unit" }],
  requestedFunds: [{ amount: "30000", unit: "unit" }],
  agentIdentifier: "agent-override",
  network: "Mainnet",
  inputHash: "abc123",
  metadata: { source: "type-test" },
  identifierFromPurchaser: "0011223344556677"
});
void masumiClient.listPayments({
  network: "Preprod",
  limit: 100,
  cursorId: "cursor",
  filterSmartContractAddress: "address",
  includeHistory: true
});
void masumiClient.submitResult({
  network: "Mainnet",
  blockchainIdentifier: "blockchain-1",
  submitResultHash: "abc123",
  resultHash: "abc123"
});
// @ts-expect-error submit-result requires one supported hash property
void masumiClient.submitResult({ blockchainIdentifier: "blockchain-1" });
const network: MasumiNetwork = normalizeMasumiNetwork("preproduction");
type _NetworkLiteral = Expect<Equal<typeof network, MasumiNetwork>>;
const paymentError = new MasumiPaymentError("bad response", { code: "http_error", statusCode: 500 });
void paymentError;
void MASUMI_NETWORKS;
void MASUMI_ESCROW_STATES;
void MASUMI_CENT_RAW_UNITS;
void MASUMI_PAYMENT_SUBMIT_STATUSES;
void MASUMI_DEFAULT_PAY_BY_MS;
void MASUMI_DEFAULT_SUBMIT_RESULT_MS;
void MASUMI_USDM_UNITS;
void normalizeMasumiApiUrl("https://masumi.example.test/admin");
void normalizeMasumiCostCents(3n);
void normalizeMasumiRawUnits("30000");
void creditsToMasumiCostCents(3);
void creditsToMasumiRawUnits("2.08");
void masumiCentsToRawUnits(3);
void usdToMasumiCostCents("0.03");
void sha256Hex(canonicalJson({ result: true }));
// @ts-expect-error unsupported network names are rejected by option contracts
createMasumiPaymentClient({ agentIdentifier: "agent", network: "Testnet" });

const paymentPayload = createSokosumiMasumiPaymentPayload({
  id: "payment-1",
  blockchainIdentifier: "blockchain-1",
  agentIdentifier: "agent-1",
  RequestedFunds: [{ amount: "30000", unit: "unit" }],
  PaymentSource: { network: "Preprod" }
});
void paymentPayload;
const memoryStore = createMemoryMasumiPaymentStore();
const storePort: MasumiPaymentStore = memoryStore;
const pendingInput: RecordPendingMasumiPaymentInput = {
  taskId: "task-1",
  blockchainIdentifier: "blockchain-1",
  resultHash: "abc123",
  network: "Preprod",
  masumiPayment: paymentPayload,
  completionPayload: { status: "COMPLETED" },
  metadata: { source: "type-test" },
  submitResponse: { id: "response-1" },
  submitStatus: "pending",
  triggerEventId: "event-1",
  taskEventId: "event-2",
  paymentId: "payment-1",
  agentIdentifier: "agent-1",
  errorType: "",
  errorNote: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  submittedAt: "",
  droppedAt: ""
};
const pendingRecord: MasumiPendingPaymentRecord = normalizePendingPayment(pendingInput);
void storePort.recordPendingMasumiPayment(pendingInput);
void storePort.listPendingMasumiPayments({ limit: 20 });
void storePort.markMasumiSubmitted({ blockchainIdentifier: "blockchain-1", response: { ok: true } });
void storePort.markMasumiDropped({ blockchainIdentifier: "blockchain-1", errorType: "expired", errorNote: "late" });
void pendingRecord;
// @ts-expect-error taskId and resultHash are required store inputs
normalizePendingPayment({ blockchainIdentifier: "blockchain-1" });
// @ts-expect-error blockchain identity must be direct or present in masumiPayment
normalizePendingPayment({ taskId: "task-1", resultHash: "abc123" });

const completionHookOptions: MasumiCompletionHooksOptions = {
  enabled: true,
  masumiClient,
  store: memoryStore,
  calculateCostCents: ({ task, event, taskEvent, taskId }) => {
    void task;
    void event;
    void taskEvent;
    void taskId;
    return { costCents: 3n, credits: 3, totalCredits: 3, amountRawUnits: 30000n, rawAmount: "30000" };
  },
  createPaymentMetadata: ({ task, event, taskEvent, taskId, costCents, amountRawUnits }) => ({
    taskId,
    task: task.id,
    event: event.id,
    status: taskEvent.status,
    costCents: costCents.toString(),
    amountRawUnits: amountRawUnits?.toString()
  }),
  logger: console
};
const completionHooks = createMasumiCompletionHooks(completionHookOptions);
const paymentPollerOptions: MasumiPaymentPollerOptions = {
  enabled: true,
  client: masumiClient,
  store: memoryStore,
  intervalMs: 1000,
  limit: 20,
  logger: console
};
const paymentPoller = createMasumiPaymentPoller(paymentPollerOptions);
paymentPoller.start();
paymentPoller.stop();
void paymentPoller.tick();
const disabledPaymentPollerOptions: MasumiPaymentPollerOptions = { enabled: false, logger: console };
void createMasumiPaymentPoller(disabledPaymentPollerOptions);
const payment: MasumiPayment = {
  blockchainIdentifier: "blockchain-1",
  onChainState: "FundsLocked",
  NextAction: { requestedAction: "SubmitResultRequested", errorType: null }
};
void isReadyForSubmitResult(payment);

void createSokosumiTaskPoller({
  client: httpClient,
  createCompletedEvent: () => ({ status: "COMPLETED", origin: "SOKOSUMI", comment: "Done" }),
  beforeTaskEventCreated: completionHooks.beforeTaskEventCreated,
  afterTaskEventCreated: completionHooks.afterTaskEventCreated
});

// @ts-expect-error pollers require a client
createSokosumiTaskPoller({ intervalMs: 1000 });
// @ts-expect-error enabled payment pollers require both client and store ports
createMasumiPaymentPoller({ enabled: true, intervalMs: 1000 });
// @ts-expect-error chat routes require a handler
createPiAgentChatRouteHandler({ path: "/chat" });
// @ts-expect-error custom chat request types require a normalizer
const invalidCustomChatOptions: PiAgentChatRouteOptions<CustomChatRequest, CustomChatResult> = {
  handleChat: ({ request }) => ({ ok: true, correlationId: request.correlationId })
};
void invalidCustomChatOptions;
