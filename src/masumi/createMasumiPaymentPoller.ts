// @ts-nocheck

export function createMasumiPaymentPoller({
  enabled = true,
  client,
  store,
  intervalMs = 15 * 60 * 1000,
  limit = 20,
  logger = console
} = {}) {
  let running = false;
  let timer;

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

  async function tick() {
    if (!enabled || running) return;
    running = true;

    try {
      await processPendingPayments();
    } catch (error) {
      log(logger, "masumi_payment_poller_error", { message: error.message }, "error");
    } finally {
      running = false;
    }
  }

  async function processPendingPayments() {
    const pending = await store.listPendingMasumiPayments({ limit });
    if (!pending.length) return;

    for (const record of pending) {
      try {
        await processPendingPayment(record);
      } catch (error) {
        log(logger, "masumi_payment_record_error", {
          taskId: record.taskId,
          blockchainIdentifier: record.blockchainIdentifier,
          message: error.message
        }, "error");
      }
    }
  }

  async function processPendingPayment(record) {
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
      await store.markMasumiDropped({
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

    const response = await client.submitResult({
      blockchainIdentifier: record.blockchainIdentifier,
      submitResultHash: record.resultHash,
      network: record.network || payment.PaymentSource?.network
    });
    await store.markMasumiSubmitted({
      blockchainIdentifier: record.blockchainIdentifier,
      response
    });
    log(logger, "masumi_payment_result_submitted", {
      taskId: record.taskId,
      blockchainIdentifier: record.blockchainIdentifier,
      resultHash: record.resultHash
    });
  }

  async function findPayment(record) {
    const result = await client.listPayments({
      limit: 100,
      network: record.network
    });
    const payments = Array.isArray(result?.Payments) ? result.Payments : Array.isArray(result) ? result : [];
    return payments.find((payment) => payment?.blockchainIdentifier === record.blockchainIdentifier);
  }
}

export function isReadyForSubmitResult(payment = {}) {
  return payment?.NextAction?.requestedAction === "SubmitResultRequested" || payment?.onChainState === "FundsLocked";
}

function log(logger, event, details = {}, level = "log") {
  const target = typeof logger?.[level] === "function" ? logger[level] : logger?.log;
  if (!target) return;
  target.call(logger, JSON.stringify({ event, ...details }));
}
