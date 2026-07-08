import express from "express";
import http from "http";
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";
import {securityMiddleware} from "./arcjet.js";

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";

// Middleware
app.use(express.json());

// Root route
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Sportz Live API is running",
    });
});

app.use(securityMiddleware());

// Routes
app.use("/matches", matchRouter);

// Attach WebSocket server
const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

// Start server
server.on("error", (error) => {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
});

server.listen(PORT, HOST, () => {
    const baseUrl =
        HOST === "0.0.0.0"
            ? `http://localhost:${PORT}`
            : `http://${HOST}:${PORT}`;

    console.log(`🚀 Server running on ${baseUrl}`);
    console.log(`🔌 WebSocket server running on ${baseUrl.replace("http", "ws")}/ws`);
});