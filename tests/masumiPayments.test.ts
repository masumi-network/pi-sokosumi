// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalJson,
  createMasumiCompletionHooks,
  createMasumiPaymentClient,
  createMasumiPaymentPoller,
  createMemoryMasumiPaymentStore,
  creditsToMasumiRawUnits,
  sha256Hex
} from "../src/masumi/index.js";

test("Masumi payment client creates dynamic cent-denominated payments", async () => {
  const requests: any[] = [];
  const client = createMasumiPaymentClient({
    apiUrl: "https://masumi.example.test/admin",
    apiToken: "payment-token",
    agentIdentifier: "agent1",
    network: "Preprod",
    now: () => new Date("2026-06-04T10:00:00.000Z"),
    async fetchImpl(url: string, options: any) {
      requests.push({
        url,
        options,
        body: JSON.parse(options.body)
      });
      return jsonResponse({
        status: "success",
        data: {
          id: "payment-1",
          blockchainIdentifier: "blockchain-1",
          payByTime: "2026-06-05T02:00:00.000Z",
          submitResultTime: "2026-06-05T03:00:00.000Z",
          unlockTime: "2026-06-05T09:00:00.000Z",
          externalDisputeUnlockTime: "2026-06-05T15:00:00.000Z",
          RequestedFunds: [
            {
              amount: "30000",
              unit: "16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d"
            }
          ],
          PaymentSource: {
            network: "Preprod",
            smartContractAddress: "addr_test_contract",
            policyId: "policy"
          },
          SmartContractWallet: {
            walletVkey: "seller-vkey"
          }
        }
      });
    }
  });

  const payment = await client.createPayment({
    taskId: "task-1",
    costCents: 3,
    metadata: {
      reason: "unit-test"
    }
  });

  assert.equal(requests[0].url, "https://masumi.example.test/api/v1/payment");
  assert.equal(requests[0].options.headers.token, "payment-token");
  assert.equal(requests[0].body.agentIdentifier, "agent1");
  assert.equal(requests[0].body.network, "Preprod");
  assert.equal(requests[0].body.inputHash, sha256Hex("task-1"));
  assert.equal(requests[0].body.payByTime, "2026-06-05T02:00:00.000Z");
  assert.equal(requests[0].body.submitResultTime, "2026-06-05T03:00:00.000Z");
  assert.equal(requests[0].body.identifierFromPurchaser.length, 16);
  assert.deepEqual(requests[0].body.RequestedFunds, [
    {
      amount: "30000",
      unit: "16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d"
    }
  ]);
  assert.equal(JSON.parse(requests[0].body.metadata).credits, 3);
  assert.equal(JSON.parse(requests[0].body.metadata).reason, "unit-test");
  assert.equal(payment.requestBody.RequestedFunds[0].amount, "30000");
});

test("Masumi raw unit conversion follows the charged Sokosumi credits", async () => {
  assert.equal(creditsToMasumiRawUnits(1).toString(), "10000");
  assert.equal(creditsToMasumiRawUnits(0.13).toString(), "1300");
  assert.equal(creditsToMasumiRawUnits(2.08).toString(), "20800");
  assert.equal(creditsToMasumiRawUnits("1.23456").toString(), "12346");

  const requests: any[] = [];
  const client = createMasumiPaymentClient({
    apiUrl: "https://masumi.example.test/api/v1",
    apiToken: "payment-token",
    agentIdentifier: "agent1",
    network: "Mainnet",
    async fetchImpl(url: string, options: any) {
      requests.push({
        url,
        body: JSON.parse(options.body)
      });
      return jsonResponse({
        status: "success",
        data: {
          id: "payment-credits",
          blockchainIdentifier: "blockchain-credits",
          RequestedFunds: [{ amount: "20800", unit: "unit" }],
          PaymentSource: { network: "Mainnet" }
        }
      });
    }
  });

  const payment = await client.createPayment({
    taskId: "task-credits",
    credits: 2.08
  });

  assert.equal(requests[0].body.RequestedFunds[0].amount, "20800");
  assert.equal(JSON.parse(requests[0].body.metadata).credits, 2.08);
  assert.equal(JSON.parse(requests[0].body.metadata).amountRawUnits, "20800");
  assert.equal(payment.amountRawUnits, "20800");
});

test("Masumi completion hooks attach payment data and persist exact payload hash after Sokosumi accepts it", async () => {
  const store = createMemoryMasumiPaymentStore();
  const hooks = createMasumiCompletionHooks({
    masumiClient: {
      async createPayment(input: any) {
        assert.equal(input.taskId, "task-hook");
        assert.equal(input.costCents.toString(), "3");
        return {
          id: "payment-hook",
          blockchainIdentifier: "blockchain-hook",
          payByTime: "2026-06-05T02:00:00.000Z",
          submitResultTime: "2026-06-05T03:00:00.000Z",
          unlockTime: "2026-06-05T09:00:00.000Z",
          externalDisputeUnlockTime: "2026-06-05T15:00:00.000Z",
          RequestedFunds: [{ amount: "30000", unit: "unit" }],
          PaymentSource: { network: "Preprod", smartContractAddress: "addr", policyId: "policy" },
          SmartContractWallet: { walletVkey: "seller-vkey" },
          requestBody: {
            agentIdentifier: "agent-hook",
            inputHash: "abc123",
            identifierFromPurchaser: "0011223344556677",
            payByTime: "2026-06-05T02:00:00.000Z",
            submitResultTime: "2026-06-05T03:00:00.000Z",
            network: "Preprod"
          }
        };
      }
    },
    store,
    calculateCostCents: () => 3,
    logger: { log() {}, error() {} }
  });

  const taskEvent = await hooks.beforeTaskEventCreated({
    taskId: "task-hook",
    task: { id: "task-hook" },
    event: { id: "event-hook", taskId: "task-hook" },
    taskEvent: {
      status: "COMPLETED",
      origin: "SOKOSUMI",
      comment: "Done.",
      metadata: {
        composedBy: "pi-agent"
      }
    }
  });
  assert.equal(taskEvent.masumiPayment.id, "payment-hook");
  assert.equal(taskEvent.masumiPayment.sellerVkey, "seller-vkey");

  await hooks.afterTaskEventCreated({
    taskId: "task-hook",
    event: { id: "event-hook", taskId: "task-hook" },
    taskEvent,
    createdTaskEvent: { id: "created-hook" }
  });

  const pending = await store.listPendingMasumiPayments();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].taskId, "task-hook");
  assert.equal(pending[0].blockchainIdentifier, "blockchain-hook");
  assert.equal(pending[0].resultHash, sha256Hex(canonicalJson(taskEvent)));
  assert.deepEqual(pending[0].completionPayload, taskEvent);
});

test("Masumi payment poller submits results when funds are locked", async () => {
  const store = createMemoryMasumiPaymentStore();
  await store.recordPendingMasumiPayment({
    taskId: "task-submit",
    blockchainIdentifier: "blockchain-submit",
    resultHash: sha256Hex("result"),
    network: "Preprod",
    masumiPayment: {
      id: "payment-submit",
      blockchainIdentifier: "blockchain-submit"
    },
    completionPayload: {
      status: "COMPLETED"
    }
  });

  const submitted: any[] = [];
  const poller = createMasumiPaymentPoller({
    client: {
      async listPayments() {
        return {
          Payments: [
            {
              blockchainIdentifier: "blockchain-submit",
              onChainState: "FundsLocked",
              NextAction: {
                requestedAction: "FundsLocked",
                errorType: null
              },
              PaymentSource: {
                network: "Preprod"
              }
            }
          ]
        };
      },
      async submitResult(input: any) {
        submitted.push(input);
        return { id: "submit-result" };
      }
    },
    store,
    logger: { log() {}, warn() {}, error() {} }
  });

  await poller.tick();

  assert.deepEqual(submitted, [
    {
      blockchainIdentifier: "blockchain-submit",
      submitResultHash: sha256Hex("result"),
      network: "Preprod"
    }
  ]);
  assert.equal((await store.listPendingMasumiPayments()).length, 0);
});

test("Masumi payment poller drops errored payments", async () => {
  const store = createMemoryMasumiPaymentStore();
  await store.recordPendingMasumiPayment({
    taskId: "task-drop",
    blockchainIdentifier: "blockchain-drop",
    resultHash: sha256Hex("result"),
    network: "Preprod",
    masumiPayment: {
      id: "payment-drop",
      blockchainIdentifier: "blockchain-drop"
    },
    completionPayload: {
      status: "COMPLETED"
    }
  });

  const poller = createMasumiPaymentPoller({
    client: {
      async listPayments() {
        return {
          Payments: [
            {
              blockchainIdentifier: "blockchain-drop",
              NextAction: {
                requestedAction: "SubmitResultRequested",
                errorType: "PaymentExpired",
                errorNote: "payByTime passed"
              }
            }
          ]
        };
      },
      async submitResult() {
        throw new Error("should not submit");
      }
    },
    store,
    logger: { log() {}, warn() {}, error() {} }
  });

  await poller.tick();

  assert.equal((await store.listPendingMasumiPayments()).length, 0);
});

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(payload);
    }
  };
}
