import readline from "readline/promises";
import { GoogleGenAI } from "@google/genai";
import 'dotenv/config'
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const chatHistory = [];
const tools = [];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const mcpClient = new Client({
    name: "example-client",
    version: "1.0.0"
});

mcpClient.connect(new SSEClientTransport(new URL("http://localhost:3000/sse"))).
    then(async () => {
        console.log("Connected to MCP server");

        const listedTools = (await mcpClient.listTools()).tools.map((tool) => {
            return {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: tool.inputSchema.type,
                    properties: tool.inputSchema.properties,
                    required: tool.inputSchema.required
                }
            }
        });
        tools.push(...listedTools);

        console.log("Available Tools:", tools);

        chatLoop();
    })

async function chatLoop(toolCall) {

    if (toolCall) {
        chatHistory.push({
            role: "model",
            parts: [
                {
                    text: `calling Tool ${toolCall.name}`,
                    type: "text"
                }
            ]
        });

        const toolResult = await mcpClient.callTool({
            name: toolCall.name,
            arguments: toolCall.args
        });

        chatHistory.push({
            role: "user",
            parts: [
                {
                    text: `Tool Result : ${toolResult.content[0]?.text || 'No result text available.'}`,
                    type: "text"
                }
            ]
        });

        console.log(`Tool "${toolCall.name}" result: ${toolResult.content[0]?.text || 'No result text available.'}`);
    }

    const question = await rl.question("You: ");

    chatHistory.push({
        role: "user",
        parts: [
            {
                text: question,
                type: "text"
            }
        ]
    });

    const config = {};
    if (tools.length > 0) {
        config.tools = [{ functionDeclarations: tools }];
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: chatHistory,
        ...(Object.keys(config).length > 0 && { config })
    });

    const functionCall = response.candidates[0].content.parts[0].functionCall;
    const responseTest = response.candidates[0].content.parts[0].text;

    if (functionCall) {
        return chatLoop(functionCall)
    };

    chatHistory.push({
        role: "model",
        parts: [
            {
                text: responseTest,
                type: "text"
            }
        ]
    });

    console.log(`AI: ${responseTest}`);

    chatLoop();
}
