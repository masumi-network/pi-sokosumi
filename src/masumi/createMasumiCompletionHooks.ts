import {
  SOKOSUMI_TASK_EVENT_STATUS,
  normalizeSokosumiTaskStatus,
  type SokosumiTaskEvent,
  type SokosumiTaskEventInput,
  type SokosumiTaskSnapshot
} from "../client/types.js";
import type {
  SokosumiAfterTaskEventCreatedInput,
  SokosumiBeforeTaskEventCreatedInput
} from "../poller/createSokosumiTaskPoller.js";
import type { Awaitable, SokosumiLogger } from "../sharedTypes.js";
import { isRecord } from "../sharedTypes.js";
import {
  canonicalJson,
  createSokosumiMasumiPaymentPayload,
  normalizeMasumiCostCents,
  normalizeMasumiRawUnits,
  sha256Hex,
  type MasumiAmountInput,
  type MasumiCreatePaymentInput,
  type SokosumiMasumiPaymentPayloadInput,
  type SokosumiMasumiPaymentPayload
} from "./masumiPaymentClient.js";
import type {
  MasumiPaymentStore,
  MasumiPendingPaymentRecord
} from "./masumiPaymentStore.js";

export type MasumiCompletionCostDetails = {
  costCents?: MasumiAmountInput;
  credits?: MasumiAmountInput;
  totalCredits?: MasumiAmountInput;
  amountRawUnits?: MasumiAmountInput;
  rawAmount?: MasumiAmountInput;
};

export type MasumiCompletionCostResult =
  | MasumiAmountInput
  | MasumiCompletionCostDetails
  | false
  | null
  | undefined
  | "";

export type MasumiCompletionTaskEvent<TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput> =
  TTaskEvent & {
    masumiPayment: SokosumiMasumiPaymentPayload;
  };

export type MasumiCompletionBeforeHookResult<
  TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput
> = TTaskEvent | MasumiCompletionTaskEvent<TTaskEvent>;

export type MasumiCompletionPaymentClient<
  TResult extends SokosumiMasumiPaymentPayloadInput = SokosumiMasumiPaymentPayloadInput
> = {
  createPayment(input: MasumiCreatePaymentInput): Awaitable<TResult>;
};

export type MasumiCompletionHooksOptions<
  TEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>,
  TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput,
  TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord,
  TPaymentResult extends SokosumiMasumiPaymentPayloadInput = SokosumiMasumiPaymentPayloadInput
> = {
  enabled?: boolean;
  masumiClient?: MasumiCompletionPaymentClient<TPaymentResult>;
  store?: Pick<MasumiPaymentStore<TRecord>, "recordPendingMasumiPayment">;
  calculateCostCents?: (
    input: SokosumiBeforeTaskEventCreatedInput<TEvent, TTask, TTaskEvent>
  ) => Awaitable<MasumiCompletionCostResult>;
  createPaymentMetadata?: (
    input: SokosumiBeforeTaskEventCreatedInput<TEvent, TTask, TTaskEvent> & {
      costCents: bigint;
      amountRawUnits: bigint | null;
    }
  ) => Awaitable<string | Record<string, unknown>>;
  logger?: SokosumiLogger;
};

export type MasumiCompletionHooks<
  TEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>,
  TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput,
  TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord
> = {
  beforeTaskEventCreated(
    input: SokosumiBeforeTaskEventCreatedInput<TEvent, TTask, TTaskEvent>
  ): Promise<MasumiCompletionBeforeHookResult<TTaskEvent>>;
  afterTaskEventCreated(
    input: SokosumiAfterTaskEventCreatedInput<
      TEvent,
      TTask,
      MasumiCompletionBeforeHookResult<TTaskEvent>,
      TCreatedTaskEvent
    >
  ): Promise<TRecord | undefined>;
};

export function createMasumiCompletionHooks<
  TEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TTask extends SokosumiTaskSnapshot<TEvent> = SokosumiTaskSnapshot<TEvent>,
  TTaskEvent extends SokosumiTaskEventInput = SokosumiTaskEventInput,
  TCreatedTaskEvent extends SokosumiTaskEvent = SokosumiTaskEvent,
  TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord,
  TPaymentResult extends SokosumiMasumiPaymentPayloadInput = SokosumiMasumiPaymentPayloadInput
>({
  enabled = true,
  masumiClient,
  store,
  calculateCostCents,
  createPaymentMetadata,
  logger = console
}: MasumiCompletionHooksOptions<
  TEvent,
  TTask,
  TTaskEvent,
  TCreatedTaskEvent,
  TRecord,
  TPaymentResult
> = {}): MasumiCompletionHooks<
  TEvent,
  TTask,
  TTaskEvent,
  TCreatedTaskEvent,
  TRecord
> {
  return {
    async beforeTaskEventCreated(input) {
      const taskEvent = input.taskEvent;
      if (!enabled || !masumiClient) return taskEvent;
      if (!isCompletedTaskEvent(taskEvent) || taskEvent.masumiPayment) return taskEvent;

      const costResult = calculateCostCents
        ? await calculateCostCents(input)
        : { costCents: taskEvent.credits || metadataCredits(taskEvent.metadata) || 1 };
      const costCents = resolveCostCents(costResult);
      if (!costCents) return taskEvent;
      const amountRawUnits = resolveAmountRawUnits(costResult);

      const taskId = normalizeRequiredText(input.taskId || input.task?.id || input.event?.taskId, "taskId");
      const metadata = createPaymentMetadata
        ? await createPaymentMetadata({ ...input, costCents, amountRawUnits })
        : createDefaultPaymentMetadata({ ...input, costCents });
      const payment = await masumiClient.createPayment({
        taskId,
        costCents,
        ...(amountRawUnits ? { amountRawUnits } : {}),
        metadata
      });
      const masumiPayment = createSokosumiMasumiPaymentPayload(payment);

      log(logger, "masumi_payment_created_for_completion", {
        taskId,
        triggerEventId: input.event?.id || "",
        paymentId: masumiPayment.id,
        blockchainIdentifier: masumiPayment.blockchainIdentifier,
        costCents: costCents.toString(),
        amountRawUnits: amountRawUnits?.toString() || ""
      });

      return {
        ...taskEvent,
        masumiPayment
      };
    },

    async afterTaskEventCreated(input) {
      const taskEvent = input.taskEvent;
      const payment = taskEvent.masumiPayment;
      if (!enabled || !payment) return undefined;
      assertSokosumiMasumiPaymentPayload(payment);
      const masumiPayment = payment;
      if (!store?.recordPendingMasumiPayment) {
        log(logger, "masumi_pending_payment_store_unavailable", {
          taskId: input.taskId || input.task?.id || input.event?.taskId || "",
          blockchainIdentifier: masumiPayment.blockchainIdentifier || ""
        }, "error");
        return undefined;
      }

      const resultHash = sha256Hex(canonicalJson(taskEvent));
      const record = await store.recordPendingMasumiPayment({
        taskId: input.taskId || input.task?.id || input.event?.taskId || "",
        triggerEventId: input.event?.id || "",
        taskEventId: input.createdTaskEvent?.id || "",
        paymentId: masumiPayment.id,
        blockchainIdentifier: masumiPayment.blockchainIdentifier,
        agentIdentifier: masumiPayment.agentIdentifier,
        network: masumiPayment.PaymentSource?.network,
        resultHash,
        submitStatus: "pending",
        masumiPayment,
        completionPayload: taskEvent,
        metadata: {
          createdTaskEventId: input.createdTaskEvent?.id || "",
          triggerEventId: input.event?.id || ""
        }
      });

      log(logger, "masumi_pending_payment_recorded", {
        taskId: record.taskId,
        triggerEventId: record.triggerEventId,
        paymentId: record.paymentId,
        blockchainIdentifier: record.blockchainIdentifier,
        resultHash
      });
      return record;
    }
  };
}

function isCompletedTaskEvent(taskEvent: SokosumiTaskEventInput): boolean {
  return normalizeSokosumiTaskStatus(taskEvent.status) === SOKOSUMI_TASK_EVENT_STATUS.COMPLETED;
}

function resolveCostCents(value: unknown): bigint | null {
  const raw = isRecord(value)
    ? value.costCents ?? value.credits ?? value.totalCredits
    : value;
  if (raw === false || raw === null || raw === undefined || raw === "") return null;
  if (!isMasumiAmountInput(raw)) return null;
  return normalizeMasumiCostCents(raw);
}

function resolveAmountRawUnits(value: unknown): bigint | null {
  if (!isRecord(value)) return null;
  const raw = value.amountRawUnits ?? value.rawAmount;
  if (raw === false || raw === null || raw === undefined || raw === "") return null;
  if (!isMasumiAmountInput(raw)) return null;
  return normalizeMasumiRawUnits(raw);
}

function createDefaultPaymentMetadata({
  taskId,
  task,
  event,
  taskEvent,
  costCents
}: SokosumiBeforeTaskEventCreatedInput & { costCents: bigint }): Record<string, unknown> {
  return {
    taskId: taskId || task?.id || event?.taskId || "",
    triggerEventId: event?.id || "",
    credits: Number(costCents),
    taskEventStatus: taskEvent?.status || ""
  };
}

function metadataCredits(value: unknown): unknown {
  return isRecord(value) ? value.credits : undefined;
}

function assertSokosumiMasumiPaymentPayload(
  payment: unknown
): asserts payment is SokosumiMasumiPaymentPayload {
  if (
    !isRecord(payment) ||
    typeof payment.id !== "string" ||
    typeof payment.blockchainIdentifier !== "string" ||
    typeof payment.agentIdentifier !== "string" ||
    !Array.isArray(payment.Amounts) ||
    !isRecord(payment.PaymentSource)
  ) {
    throw new Error("Masumi completion task event contains an invalid masumiPayment payload.");
  }
}

function isMasumiAmountInput(value: unknown): value is MasumiAmountInput {
  return typeof value === "number" || typeof value === "string" || typeof value === "bigint";
}

function normalizeRequiredText(value: unknown, label: string): string {
  const text = String(value || "").trim();
  if (!text) throw new Error(`Masumi completion payment requires ${label}.`);
  return text;
}

function log(
  logger: SokosumiLogger,
  event: string,
  details: Record<string, unknown> = {},
  level: "log" | "warn" | "error" = "log"
): void {
  const target = typeof logger?.[level] === "function" ? logger[level] : logger?.log;
  if (!target) return;
  target.call(logger, JSON.stringify({ event, ...details }));
}
