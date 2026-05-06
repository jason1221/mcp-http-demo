import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();

app.use(express.json());

const transports = new Map();

function createServer() {

  const server = new McpServer({
    name: "demo-http-mcp",
    version: "1.0.0"
  });

  server.tool(
    "hello",
    "say hello",
    {
      name: z.string().optional()
    },
    async ({ name }) => {

      return {
        content: [
          {
            type: "text",
            text: `hello ${name ?? "world"}`
          }
        ]
      };
    }
  );

  return server;
}

app.post("/mcp", async (req, res) => {

  const sessionId = req.headers["mcp-session-id"];

  let transport;

  if (sessionId && transports.has(sessionId)) {

    transport = transports.get(sessionId);

  } else {

    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport);
      }
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
      }
    };

    const server = createServer();

    await server.connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});

app.get("/", (req, res) => {
  res.send("mcp http demo running");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`running on ${port}`);
});