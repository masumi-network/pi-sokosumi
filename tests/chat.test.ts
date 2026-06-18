// @ts-nocheck
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import {
  createPiAgentChatRouteHandler,
  normalizePiAgentChatRequest,
  startPiAgentChatServer
} from "../src/chat/createPiAgentChatServer.js";

test("normalizes chat requests with agent validation, identity metadata, and redaction", () => {
  const request = normalizePiAgentChatRequest({
    defaultAgentId: "nori",
    supportedAgentIds: ["nori"],
    supportedSurfaces: ["chat"],
    headers: {
      "x-user-id": "user-1",
      "x-organization-id": "org-1"
    },
    body: {
      message: "Explain Sokosumi coworker setup.",
      authorization: "secret",
      metadata: {
        source: "test"
      }
    }
  });

  assert.equal(request.agentId, "nori");
  assert.equal(request.surface, "chat");
  assert.equal(request.userId, "user-1");
  assert.equal(request.organizationId, "org-1");
  assert.equal(request.message, "Explain Sokosumi coworker setup.");
  assert.equal(request.metadata.source, "test");
  assert.equal(request.metadata.sourcePayload.authorization, "[redacted]");
});

test("rejects unsupported chat surfaces", () => {
  assert.throws(
    () => normalizePiAgentChatRequest({
      defaultAgentId: "nori",
      supportedAgentIds: ["nori"],
      supportedSurfaces: ["chat"],
      body: {
        surface: "email",
        message: "Hello"
      }
    }),
    /Unsupported chat surface/
  );
});

test("route handler handles only the configured chat path", async () => {
  const handledRequests = [];
  const chatRoute = createPiAgentChatRouteHandler({
    defaultAgentId: "nori",
    supportedAgentIds: ["nori"],
    authorize: ({ req }) => {
      assert.equal(req.headers.authorization, "Bearer test");
    },
    handleChat: async ({ request }) => {
      handledRequests.push(request);
      return {
        agentId: request.agentId,
        reply: request.message.toUpperCase()
      };
    }
  });

  const server = startTestServer(chatRoute);
  await once(server, "listening");
  const { port } = server.address();

  try {
    const missing = await fetch(`http://127.0.0.1:${port}/other`, {
      method: "POST",
      body: "{}"
    });
    assert.equal(missing.status, 404);

    const response = await fetch(`http://127.0.0.1:${port}/v1/chat`, {
      method: "POST",
      headers: {
        authorization: "Bearer test",
        "content-type": "application/json",
        "x-user-id": "user-2"
      },
      body: JSON.stringify({ message: "hello" })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      agentId: "nori",
      reply: "HELLO"
    });
    assert.equal(handledRequests.length, 1);
    assert.equal(handledRequests[0].userId, "user-2");
  } finally {
    server.close();
  }
});

test("standalone chat server exposes optional health and chat routes", async () => {
  const server = startPiAgentChatServer({
    port: 0,
    defaultAgentId: "xavi",
    supportedAgentIds: ["xavi"],
    healthResponse: () => ({ status: "ok", agent: "xavi" }),
    handleChat: async ({ request }) => ({
      agentId: request.agentId,
      reply: `Received: ${request.message}`
    })
  });
  await once(server, "listening");
  const { port } = server.address();

  try {
    const health = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok", agent: "xavi" });

    const chat = await fetch(`http://127.0.0.1:${port}/v1/chat`, {
      method: "POST",
      body: JSON.stringify({ text: "cut the trailer" })
    });
    assert.equal(chat.status, 200);
    assert.deepEqual(await chat.json(), {
      agentId: "xavi",
      reply: "Received: cut the trailer"
    });
  } finally {
    server.close();
  }
});

function startTestServer(chatRoute) {
  return createServer(async (req, res) => {
    if (await chatRoute(req, res)) return;
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "Not found" }));
  }).listen(0, "127.0.0.1");
}
