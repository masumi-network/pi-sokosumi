// @ts-nocheck
import { SOKOSUMI_TASK_EVENT_STATUS, normalizeSokosumiTaskStatus } from "../client/types.js";
import { canonicalJson, createSokosumiMasumiPaymentPayload, normalizeMasumiCostCents, normalizeMasumiRawUnits, sha256Hex } from "./masumiPaymentClient.js";
export function createMasumiCompletionHooks({ enabled = true, masumiClient, store, calculateCostCents, createPaymentMetadata, logger = console } = {}) {
    return {
        async beforeTaskEventCreated(input = {}) {
            const taskEvent = input.taskEvent || {};
            if (!enabled || !masumiClient)
                return taskEvent;
            if (!isCompletedTaskEvent(taskEvent) || taskEvent.masumiPayment)
                return taskEvent;
            const costResult = calculateCostCents
                ? await calculateCostCents(input)
                : { costCents: taskEvent.credits || taskEvent.metadata?.credits || 1 };
            const costCents = resolveCostCents(costResult);
            if (!costCents)
                return taskEvent;
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
                amountRawUnits: amountRawUnits?.toString?.() || ""
            });
            return {
                ...taskEvent,
                masumiPayment
            };
        },
        async afterTaskEventCreated(input = {}) {
            const taskEvent = input.taskEvent || {};
            const masumiPayment = taskEvent.masumiPayment;
            if (!enabled || !masumiPayment)
                return undefined;
            if (!store?.recordPendingMasumiPayment) {
                log(logger, "masumi_pending_payment_store_unavailable", {
                    taskId: input.taskId || input.task?.id || input.event?.taskId || "",
                    blockchainIdentifier: masumiPayment.blockchainIdentifier || ""
                }, "error");
                return undefined;
            }
            const resultHash = sha256Hex(canonicalJson(taskEvent));
            const record = await store.recordPendingMasumiPayment({
                taskId: input.taskId || input.task?.id || input.event?.taskId,
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
function isCompletedTaskEvent(taskEvent = {}) {
    return normalizeSokosumiTaskStatus(taskEvent.status) === SOKOSUMI_TASK_EVENT_STATUS.COMPLETED;
}
function resolveCostCents(value) {
    const raw = value && typeof value === "object" && !Array.isArray(value)
        ? value.costCents ?? value.credits ?? value.totalCredits
        : value;
    if (raw === false || raw === null || raw === undefined || raw === "")
        return null;
    return normalizeMasumiCostCents(raw);
}
function resolveAmountRawUnits(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    const raw = value.amountRawUnits ?? value.rawAmount;
    if (raw === false || raw === null || raw === undefined || raw === "")
        return null;
    return normalizeMasumiRawUnits(raw);
}
function createDefaultPaymentMetadata({ taskId, task, event, taskEvent, costCents } = {}) {
    return {
        taskId: taskId || task?.id || event?.taskId || "",
        triggerEventId: event?.id || "",
        credits: Number(costCents),
        taskEventStatus: taskEvent?.status || ""
    };
}
function normalizeRequiredText(value, label) {
    const text = String(value || "").trim();
    if (!text)
        throw new Error(`Masumi completion payment requires ${label}.`);
    return text;
}
function log(logger, event, details = {}, level = "log") {
    const target = typeof logger?.[level] === "function" ? logger[level] : logger?.log;
    if (!target)
        return;
    target.call(logger, JSON.stringify({ event, ...details }));
}
//# sourceMappingURL=createMasumiCompletionHooks.js.map