// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalJson,
  createMasumiCompletionHooks,
  createMasumiPaymentClient,
  createMasumiPaymentPoller,
  createMemoryMasumiPaymentStore,
  createSokosumiMasumiPaymentPayload,
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
        data: masumiPaymentResponse({
          id: "payment-1",
          blockchainIdentifier: "blockchain-1",
          agentIdentifier: null,
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
            id: "source-1",
            network: "Preprod",
            paymentSourceType: "Web3CardanoV1",
            smartContractAddress: "addr_test_contract",
            policyId: "policy"
          },
          SmartContractWallet: {
            id: "wallet-1",
            walletVkey: "seller-vkey",
            walletAddress: "addr_test_seller"
          }
        })
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
  assert.equal(payment.agentIdentifier, null);
  assert.equal(payment.inputHash, null);
  assert.equal(payment.NextAction.requestedAction, "WaitingForExternalAction");
});

test("Masumi payment client sends Web3CardanoV2 payment source selection", async () => {
  const requests: any[] = [];
  const client = createMasumiPaymentClient({
    apiUrl: "https://masumi.example.test/api/v1",
    apiToken: "payment-token",
    agentIdentifier: "agent-v2",
    network: "Preprod",
    paymentSourceType: "Web3CardanoV2",
    supportedPaymentSourceIndex: 0,
    async fetchImpl(url: string, options: any) {
      requests.push({
        url,
        body: JSON.parse(options.body)
      });
      return jsonResponse({
        status: "success",
        data: masumiPaymentResponse({
          id: "payment-v2",
          blockchainIdentifier: "blockchain-v2",
          agentIdentifier: "agent-v2",
          PaymentSource: {
            id: "source-v2",
            network: "Preprod",
            paymentSourceType: "Web3CardanoV2",
            smartContractAddress: "addr_test_v2_contract",
            policyId: "policy-v2"
          }
        })
      });
    }
  });

  const payment = await client.createPayment({
    taskId: "task-v2",
    costCents: 1
  });

  assert.equal(requests[0].body.paymentSourceType, "Web3CardanoV2");
  assert.equal(requests[0].body.supportedPaymentSourceIndex, 0);
  assert.equal(payment.requestBody.paymentSourceType, "Web3CardanoV2");
  assert.equal(payment.requestBody.supportedPaymentSourceIndex, 0);
});

test("Masumi payment client lists the configured Web3CardanoV2 source", async () => {
  const requests: string[] = [];
  const client = createMasumiPaymentClient({
    apiUrl: "https://masumi.example.test/api/v1",
    apiToken: "payment-token",
    agentIdentifier: "agent-v2-list",
    network: "Preprod",
    paymentSourceType: "Web3CardanoV2",
    supportedPaymentSourceIndex: 0,
    async fetchImpl(url: string) {
      requests.push(url);
      return jsonResponse({
        status: "success",
        data: {
          Payments: [masumiPaymentResponse({
            id: "payment-v2-list",
            blockchainIdentifier: "blockchain-v2-list",
            agentIdentifier: "agent-v2-list",
            PaymentSource: {
              id: "source-v2-list",
              network: "Preprod",
              paymentSourceType: "Web3CardanoV2",
              smartContractAddress: "addr_test_v2_list_contract",
              policyId: "policy-v2-list"
            }
          })]
        }
      });
    }
  });

  await client.listPayments({ limit: 100 });

  const requestUrl = new URL(requests[0]);
  assert.equal(requestUrl.searchParams.get("filterPaymentSourceType"), "Web3CardanoV2");
});

test("Masumi payment client validates Cardano payment source selection", async () => {
  const baseOptions = {
    apiUrl: "https://masumi.example.test/api/v1",
    apiToken: "payment-token",
    agentIdentifier: "agent-source-validation"
  };

  assert.throws(
    () => createMasumiPaymentClient({
      ...baseOptions,
      paymentSourceType: "Web3CardanoV2"
    }),
    /Web3CardanoV2 payments require supportedPaymentSourceIndex/
  );
  assert.throws(
    () => createMasumiPaymentClient({
      ...baseOptions,
      paymentSourceType: "Web3CardanoV1",
      supportedPaymentSourceIndex: 0
    }),
    /Web3CardanoV1 payments must not set supportedPaymentSourceIndex/
  );
  assert.throws(
    () => createMasumiPaymentClient({
      ...baseOptions,
      supportedPaymentSourceIndex: 25
    }),
    /supportedPaymentSourceIndex must be an integer between 0 and 24/
  );
});

test("Masumi per-payment source override does not leak the configured V2 index into V1", async () => {
  const requests: any[] = [];
  const client = createMasumiPaymentClient({
    apiUrl: "https://masumi.example.test/api/v1",
    apiToken: "payment-token",
    agentIdentifier: "agent-source-override",
    paymentSourceType: "Web3CardanoV2",
    supportedPaymentSourceIndex: 0,
    async fetchImpl(_url: string, options: any) {
      requests.push(JSON.parse(options.body));
      return jsonResponse({
        status: "success",
        data: masumiPaymentResponse({
          id: "payment-v1-override",
          blockchainIdentifier: "blockchain-v1-override"
        })
      });
    }
  });

  await client.createPayment({
    taskId: "task-v1-override",
    costCents: 1,
    paymentSourceType: "Web3CardanoV1"
  });

  assert.equal(requests[0].paymentSourceType, "Web3CardanoV1");
  assert.equal(requests[0].supportedPaymentSourceIndex, undefined);
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
        data: masumiPaymentResponse({
          id: "payment-credits",
          blockchainIdentifier: "blockchain-credits",
          RequestedFunds: [{ amount: "20800", unit: "unit" }],
          PaymentSource: {
            id: "source-mainnet",
            network: "Mainnet",
            paymentSourceType: "Web3CardanoV1",
            smartContractAddress: "addr_mainnet_contract",
            policyId: null
          }
        })
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

test("Masumi payment client rejects incomplete external payment objects", async () => {
  const client = createMasumiPaymentClient({
    apiUrl: "https://masumi.example.test/api/v1",
    apiToken: "payment-token",
    agentIdentifier: "agent1",
    async fetchImpl() {
      return jsonResponse({ status: "success", data: {} });
    }
  });

  await assert.rejects(
    () => client.createPayment({ taskId: "task-invalid", costCents: 1 }),
    (error) => error?.code === "invalid_response" && /\.id must be a string/.test(error.message)
  );
});

test("Masumi payment client preserves structured HTTP failures through the shared transport", async () => {
  const client = createMasumiPaymentClient({
    apiUrl: "https://masumi.example.test/api/v1",
    apiToken: "payment-token",
    agentIdentifier: "agent1",
    async fetchImpl() {
      return jsonResponse({ error: "temporarily unavailable" }, 503);
    }
  });

  await assert.rejects(
    () => client.listPayments(),
    (error) =>
      error?.name === "MasumiPaymentError" &&
      error?.code === "http_error" &&
      error?.statusCode === 503 &&
      error?.payload?.error === "temporarily unavailable"
  );
});

test("Masumi submit-result narrows the payment response", async () => {
  const client = createMasumiPaymentClient({
    apiUrl: "https://masumi.example.test/api/v1",
    apiToken: "payment-token",
    agentIdentifier: "agent1",
    async fetchImpl() {
      return jsonResponse({
        status: "success",
        data: masumiPaymentResponse({
          id: "payment-submitted",
          blockchainIdentifier: "blockchain-submitted",
          resultHash: "b".repeat(64)
        })
      });
    }
  });

  const result = await client.submitResult({
    blockchainIdentifier: "blockchain-submitted",
    submitResultHash: "b".repeat(64)
  });

  assert.equal(result.id, "payment-submitted");
  assert.equal(result.resultHash, "b".repeat(64));
  assert.equal(result.PaymentSource.network, "Preprod");
});

test("Masumi submit-result rejects incomplete external payment objects", async () => {
  const client = createMasumiPaymentClient({
    apiUrl: "https://masumi.example.test/api/v1",
    apiToken: "payment-token",
    agentIdentifier: "agent1",
    async fetchImpl() {
      return jsonResponse({ status: "success", data: {} });
    }
  });

  await assert.rejects(
    () => client.submitResult({
      blockchainIdentifier: "blockchain-invalid",
      submitResultHash: "c".repeat(64)
    }),
    (error) => error?.code === "invalid_response" && /\.id must be a string/.test(error.message)
  );
});

test("Sokosumi payment payload adapter rejects incomplete Masumi data", () => {
  assert.throws(
    () => createSokosumiMasumiPaymentPayload({}),
    (error) => error?.code === "invalid_response" && /payload\.blockchainIdentifier must be a non-empty string/.test(error.message)
  );
});

test("Sokosumi payment payload adapter preserves the optional Masumi database id", () => {
  const payment = createSokosumiMasumiPaymentPayload({
    blockchainIdentifier: "blockchain-without-id",
    agentIdentifier: "agent-without-id",
    sellerVkey: "seller-vkey",
    payByTime: "2026-06-05T02:00:00.000Z",
    submitResultTime: "2026-06-05T03:00:00.000Z",
    unlockTime: "2026-06-05T09:00:00.000Z",
    externalDisputeUnlockTime: "2026-06-05T15:00:00.000Z",
    inputHash: "abc123",
    identifierFromPurchaser: "0011223344556677",
    Amounts: [{ amount: "30000", unit: "unit" }]
  });

  assert.equal("id" in payment, false);
});

test("Masumi completion hooks attach payment data and persist exact payload hash after Sokosumi accepts it", async () => {
  const store = createMemoryMasumiPaymentStore();
  const hooks = createMasumiCompletionHooks({
    masumiClient: {
      async createPayment(input: any) {
        assert.equal(input.taskId, "task-hook");
        assert.equal(input.costCents.toString(), "3");
        return {
          ...masumiPaymentResponse({
            id: "payment-hook",
            blockchainIdentifier: "blockchain-hook",
            agentIdentifier: "agent-hook",
            payByTime: "2026-06-05T02:00:00.000Z",
            submitResultTime: "2026-06-05T03:00:00.000Z",
            unlockTime: "2026-06-05T09:00:00.000Z",
            externalDisputeUnlockTime: "2026-06-05T15:00:00.000Z",
            RequestedFunds: [{ amount: "30000", unit: "unit" }],
            PaymentSource: {
              id: "source-hook",
              network: "Preprod",
              paymentSourceType: "Web3CardanoV1",
              smartContractAddress: "addr",
              policyId: "policy"
            },
            SmartContractWallet: {
              id: "wallet-hook",
              walletVkey: "seller-vkey",
              walletAddress: "addr_test_seller"
            }
          }),
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
      credits: 3,
      metadata: {
        composedBy: "pi-agent"
      }
    }
  });
  assert.equal(taskEvent.masumiPayment.id, "payment-hook");
  assert.equal(taskEvent.masumiPayment.sellerVkey, "seller-vkey");
  assert.equal("credits" in taskEvent, false);

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

test("disabled and unconfigured Masumi completion hooks preserve existing task events", async () => {
  const taskEvent = {
    status: "COMPLETED",
    origin: "SOKOSUMI",
    masumiPayment: { legacy: true }
  };
  const input = {
    taskId: "task-noop",
    task: { id: "task-noop" },
    event: { id: "event-noop", taskId: "task-noop" },
    taskEvent
  };

  assert.equal(
    await createMasumiCompletionHooks({ enabled: false }).beforeTaskEventCreated(input),
    taskEvent
  );
  assert.equal(
    await createMasumiCompletionHooks().beforeTaskEventCreated(input),
    taskEvent
  );
});

test("configured Masumi completion hooks reject an invalid pre-attached payment", async () => {
  await assert.rejects(
    () => createMasumiCompletionHooks({
      masumiClient: { createPayment: async () => { throw new Error("should not create"); } }
    }).beforeTaskEventCreated({
      taskId: "task-invalid-payment",
      taskEvent: {
        status: "COMPLETED",
        masumiPayment: { legacy: true }
      }
    }),
    (error) => error?.code === "invalid_response" && /payload\.blockchainIdentifier must be a non-empty string/.test(error.message)
  );
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
                requestedAction: "SubmitResultRequested",
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
                errorType: "Unknown",
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

function masumiPaymentResponse(overrides = {}) {
  return {
    id: "payment-default",
    createdAt: "2026-06-04T10:00:00.000Z",
    updatedAt: "2026-06-04T10:00:00.000Z",
    blockchainIdentifier: "blockchain-default",
    agentIdentifier: null,
    agentName: null,
    pricingType: "Fixed",
    lastCheckedAt: null,
    payByTime: null,
    submitResultTime: "2026-06-05T03:00:00.000Z",
    unlockTime: "2026-06-05T09:00:00.000Z",
    collateralReturnLovelace: null,
    buyerReturnAddress: null,
    sellerReturnAddress: null,
    externalDisputeUnlockTime: "2026-06-05T15:00:00.000Z",
    requestedById: "api-key-1",
    resultHash: null,
    nextActionLastChangedAt: "2026-06-04T10:00:00.000Z",
    onChainStateOrResultLastChangedAt: "2026-06-04T10:00:00.000Z",
    nextActionOrOnChainStateOrResultLastChangedAt: "2026-06-04T10:00:00.000Z",
    inputHash: null,
    totalBuyerCardanoFees: 0,
    totalSellerCardanoFees: 0,
    cooldownTime: 0,
    cooldownTimeOtherParty: 0,
    onChainState: null,
    NextAction: {
      requestedAction: "WaitingForExternalAction",
      errorType: null,
      errorNote: null,
      resultHash: null
    },
    ActionHistory: null,
    CurrentTransaction: null,
    TransactionHistory: null,
    RequestedFunds: [{ amount: "10000", unit: "unit" }],
    WithdrawnForSeller: [],
    WithdrawnForBuyer: [],
    PaymentSource: {
      id: "source-default",
      network: "Preprod",
      paymentSourceType: "Web3CardanoV1",
      smartContractAddress: "addr_test_contract",
      policyId: null
    },
    BuyerWallet: null,
    SmartContractWallet: null,
    metadata: null,
    ...overrides
  };
}
