#!/usr/bin/env node

/**
 * Minimal HTTP deployment surface.
 *
 * Provides:
 * - GET /health for deployment probes
 * - GET /events as a lightweight SSE heartbeat stream
 * - /mcp for MCP Streamable HTTP clients
 *
 * This intentionally uses Node's built-in http module to avoid adding Express.
 */

import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

process.env.GERMAN_LAW_MCP_NO_STDIO = "1";

const { server } = await import("./index.js");

const transports = new Map<string, StreamableHTTPServerTransport>();

const PORT = Number(process.env.PORT ?? process.env.GERMAN_LAW_MCP_HTTP_PORT ?? 3001);
const HOST = process.env.HOST ?? process.env.GERMAN_LAW_MCP_HTTP_HOST ?? "127.0.0.1";

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `${HOST}:${PORT}`}`);

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        status: "ok",
        name: "german-law-mcp",
        transport: "http",
        mcpEndpoint: "/mcp",
        sseHeartbeatEndpoint: "/events",
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/events") {
      startHeartbeatSse(req, res);
      return;
    }

    if (url.pathname === "/mcp") {
      await handleMcpRequest(req, res);
      return;
    }

    sendJson(res, 404, { error: "not_found", endpoints: ["/health", "/events", "/mcp"] });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: "internal_error", message });
  }
}).listen(PORT, HOST, () => {
  console.error(`german-law-mcp HTTP server listening on http://${HOST}:${PORT}`);
});

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const sessionHeader = req.headers["mcp-session-id"];
  const sessionId = Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader;
  let transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        if (transport) {
          transports.set(id, transport);
        }
      },
    });
    transport.onclose = () => {
      for (const [id, existing] of transports.entries()) {
        if (existing === transport) {
          transports.delete(id);
        }
      }
    };
    await server.connect(transport);
  }

  const body = req.method === "POST" ? await readJsonBody(req) : undefined;
  await transport.handleRequest(req, res, body);
}

function startHeartbeatSse(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const writeHeartbeat = () => {
    res.write(`event: heartbeat\n`);
    res.write(`data: ${JSON.stringify({ status: "ok", timestamp: new Date().toISOString() })}\n\n`);
  };

  writeHeartbeat();
  const interval = setInterval(writeHeartbeat, 15_000);
  req.on("close", () => clearInterval(interval));
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : undefined;
}
