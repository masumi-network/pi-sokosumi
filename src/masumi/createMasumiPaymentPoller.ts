import type { SokosumiLogger } from "../sharedTypes.js";
import { getErrorMessage } from "../sharedTypes.js";
import type {
  MasumiListPaymentsInput,
  MasumiNetwork,
  MasumiOnChainState,
  MasumiPaymentAction,
  MasumiPaymentErrorType,
  MasumiPaymentSourceType,
  MasumiSubmitResultInput,
  MasumiSubmitResultResponse
} from "./masumiPaymentClient.js";
import type {
  ListPendingMasumiPaymentsInput,
  MarkMasumiDroppedInput,
  MarkMasumiSubmittedInput,
  MasumiPendingPaymentRecord
} from "./masumiPaymentStore.js";

export type MasumiPaymentPollerPayment = Record<string, unknown> & {
  blockchainIdentifier: string;
  NextAction?: Record<string, unknown> & {
    requestedAction?: MasumiPaymentAction | null;
    errorType?: MasumiPaymentErrorType | null;
    errorNote?: string | null;
    resultHash?: string | null;
  };
  onChainState?: MasumiOnChainState | null;
  PaymentSource?: Record<string, unknown> & {
    network?: MasumiNetwork;
    paymentSourceType?: MasumiPaymentSourceType;
  };
};

export type MasumiPaymentPollerListPage = Record<string, unknown> & {
  Payments?: MasumiPaymentPollerPayment[];
};

export type MasumiPaymentPollerListResult = MasumiPaymentPollerListPage | MasumiPaymentPollerPayment[];

export type MasumiPaymentPollerClient = {
  listPayments(input?: MasumiListPaymentsInput): Promise<MasumiPaymentPollerListResult>;
  submitResult(input: MasumiSubmitResultInput): Promise<MasumiSubmitResultResponse>;
};

export type MasumiPaymentPollerStore<
  TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord
> = {
  listPendingMasumiPayments(input?: ListPendingMasumiPaymentsInput): Promise<TRecord[]>;
  markMasumiSubmitted(input: MarkMasumiSubmittedInput): Promise<TRecord>;
  markMasumiDropped(input: MarkMasumiDroppedInput): Promise<TRecord>;
};

export type EnabledMasumiPaymentPollerOptions<
  TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord
> = {
  enabled?: true;
  client: MasumiPaymentPollerClient;
  store: MasumiPaymentPollerStore<TRecord>;
  intervalMs?: number;
  limit?: number;
  logger?: SokosumiLogger;
};

export type DisabledMasumiPaymentPollerOptions<
  TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord
> = {
  enabled: false;
  client?: MasumiPaymentPollerClient;
  store?: MasumiPaymentPollerStore<TRecord>;
  intervalMs?: number;
  limit?: number;
  logger?: SokosumiLogger;
};

export type MasumiPaymentPollerOptions<
  TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord
> = EnabledMasumiPaymentPollerOptions<TRecord> | DisabledMasumiPaymentPollerOptions<TRecord>;

export type MasumiPaymentPoller = {
  start(): void;
  stop(): void;
  tick(): Promise<void>;
};

type RuntimeMasumiPaymentPollerOptions<
  TRecord extends MasumiPendingPaymentRecord
> = {
  enabled?: boolean;
  client?: MasumiPaymentPollerClient;
  store?: MasumiPaymentPollerStore<TRecord>;
  intervalMs?: number;
  limit?: number;
  logger?: SokosumiLogger;
};

export function createMasumiPaymentPoller<TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord>(
  options: MasumiPaymentPollerOptions<TRecord>
): MasumiPaymentPoller;
export function createMasumiPaymentPoller<TRecord extends MasumiPendingPaymentRecord = MasumiPendingPaymentRecord>({
  enabled = true,
  client,
  store,
  intervalMs = 15 * 60 * 1000,
  limit = 20,
  logger = console
}: RuntimeMasumiPaymentPollerOptions<TRecord> = {}): MasumiPaymentPoller {
  let running = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    start() {
      if (!enabled) {
        log(logger, "masumi_payment_poller_disabled");
        return;
      }
      if (!client || !store?.listPendingMasumiPayments) {
        log(logger, "masumi_payment_poller_unavailable", {
          clientConfigured: Boolean(client),
          storeConfigured: Boolean(store?.listPendingMasumiPayments)
        }, "error");
        return;
      }
      log(logger, "masumi_payment_poller_started", { intervalMs });
      void tick();
      timer = setInterval(() => void tick(), intervalMs);
    },

    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },

    async tick() {
      await tick();
    }
  };

  async function tick(): Promise<void> {
    if (!enabled || running) return;
    running = true;

    try {
      await processPendingPayments();
    } catch (error) {
      log(logger, "masumi_payment_poller_error", { message: getErrorMessage(error) }, "error");
    } finally {
      running = false;
    }
  }

  async function processPendingPayments(): Promise<void> {
    const pending = await store!.listPendingMasumiPayments({ limit });
    if (!pending.length) return;

    for (const record of pending) {
      try {
        await processPendingPayment(record);
      } catch (error) {
        log(logger, "masumi_payment_record_error", {
          taskId: record.taskId,
          blockchainIdentifier: record.blockchainIdentifier,
          message: getErrorMessage(error)
        }, "error");
      }
    }
  }

  async function processPendingPayment(record: TRecord): Promise<void> {
    const payment = await findPayment(record);
    if (!payment) {
      log(logger, "masumi_payment_not_found", {
        taskId: record.taskId,
        blockchainIdentifier: record.blockchainIdentifier
      }, "warn");
      return;
    }

    const nextAction = payment.NextAction || {};
    if (nextAction.errorType) {
      await store!.markMasumiDropped({
        blockchainIdentifier: record.blockchainIdentifier,
        errorType: nextAction.errorType,
        errorNote: nextAction.errorNote || ""
      });
      log(logger, "masumi_payment_dropped", {
        taskId: record.taskId,
        blockchainIdentifier: record.blockchainIdentifier,
        errorType: nextAction.errorType,
        errorNote: nextAction.errorNote || ""
      }, "error");
      return;
    }

    if (!isReadyForSubmitResult(payment)) {
      log(logger, "masumi_payment_waiting", {
        taskId: record.taskId,
        blockchainIdentifier: record.blockchainIdentifier,
        requestedAction: nextAction.requestedAction || "",
        onChainState: payment.onChainState || ""
      });
      return;
    }

    const response = await client!.submitResult({
      blockchainIdentifier: record.blockchainIdentifier,
      submitResultHash: record.resultHash,
      network: record.network || payment.PaymentSource?.network
    });
    await store!.markMasumiSubmitted({
      blockchainIdentifier: record.blockchainIdentifier,
      response
    });
    log(logger, "masumi_payment_result_submitted", {
      taskId: record.taskId,
      blockchainIdentifier: record.blockchainIdentifier,
      resultHash: record.resultHash
    });
  }

  async function findPayment(record: TRecord): Promise<MasumiPaymentPollerPayment | undefined> {
    const paymentSourceType = paymentSourceTypeFromRecord(record);
    const result = await client!.listPayments({
      limit: 100,
      network: record.network || undefined,
      ...(paymentSourceType ? { filterPaymentSourceType: paymentSourceType } : {})
    });
    const payments = Array.isArray(result) ? result : Array.isArray(result.Payments) ? result.Payments : [];
    return payments.find((payment) => payment.blockchainIdentifier === record.blockchainIdentifier);
  }
}

function paymentSourceTypeFromRecord(record: MasumiPendingPaymentRecord): MasumiPaymentSourceType | undefined {
  if (record.paymentSourceType === "Web3CardanoV1" || record.paymentSourceType === "Web3CardanoV2") {
    return record.paymentSourceType;
  }
  const paymentSource = record.masumiPayment.PaymentSource;
  if (!paymentSource || typeof paymentSource !== "object" || Array.isArray(paymentSource)) return undefined;
  const paymentSourceType = (paymentSource as Record<string, unknown>).paymentSourceType;
  return paymentSourceType === "Web3CardanoV1" || paymentSourceType === "Web3CardanoV2"
    ? paymentSourceType
    : undefined;
}

export function isReadyForSubmitResult(payment: MasumiPaymentPollerPayment): boolean {
  return payment.NextAction?.requestedAction === "SubmitResultRequested" || payment.onChainState === "FundsLocked";
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
