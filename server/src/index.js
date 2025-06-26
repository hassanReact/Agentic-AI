import express from "express"
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { z } from 'zod'
import { createPost } from "./tools/mcp.tool.js";

const server = new McpServer({
    name: "example-server",
    version: "1.0.0"
});

const app = express();

server.tool(
    "addTwoNumber",
    "Add Given two Numbers",
    {
        a: z.number(),
        b: z.number()
    },
    async (arg) => {
        const { a, b } = arg;
        return {
            content: [
                {
                    type: "text",
                    text: `The sum of ${a} and ${b} is ${a + b}`
                }
            ]
        }
    }
);

server.tool(
    "createPost", "Create a Post on X", {
    status: z.string()
}, async (arg) => {
    const { status } = arg;
    return createPost(status)
}
)

const transports = {};

app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport('/message', res);
    transports[transport.sessionId] = transport;
    res.on("close", () => {
        delete transports[transport.sessionId];
    });
    await server.connect(transport);
});

app.post("/message", async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports[sessionId];
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(400).send('No transport found for SessionId')
    }
})

app.listen(3000, () => {
    console.log("App is Listen on Port 3000");
})