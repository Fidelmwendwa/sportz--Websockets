import { WebSocketServer, WebSocket } from "ws";

const matchSubscribers = new Map();

function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }

    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);

    if (!subscribers) return;

    subscribers.delete(socket);

    if (subscribers.size === 0) {
        matchSubscribers.delete(matchId);
    }
}

function cleanupSubscriptions(socket) {
    for (const matchId of socket.subscriptions) {
        unsubscribe(matchId, socket);
    }
}

function broadcastToMatchId(matchId, payload) {
    const subscribers = matchSubscribers.get(matchId);

    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify(payload);

    for (const client of subscribers) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss, payload) {
    const message = JSON.stringify(payload);

    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

function handleMessage(socket, data) {
    let message;

    try {
        message = JSON.parse(data.toString());
    } catch {
        sendJson(socket, {
            type: "error",
            message: "Invalid JSON",
        });
        return;
    }

    if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
        subscribe(message.matchId, socket);

        socket.subscriptions.add(message.matchId);

        sendJson(socket, {
            type: "subscribed",
            matchId: message.matchId,
        });

        return;
    }

    if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
        unsubscribe(message.matchId, socket);

        socket.subscriptions.delete(message.matchId);

        sendJson(socket, {
            type: "unsubscribed",
            matchId: message.matchId,
        });

        return;
    }
}

export function attachWebSocketServer(server,wsArcjet) {
    const wss = new WebSocketServer({
        server,
        path: "/ws",
        maxPayload: 1024 * 1024,
    });

    function heartbeat() {
        this.isAlive = true;
    }

    wss.on("connection", async (socket, req) => {
        // Arcjet protection
        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit()
                        ? 1013
                        : 1008;

                    const reason = decision.reason.isRateLimit()
                        ? "Rate limit exceeded"
                        : "Access denied";

                    socket.close(code, reason);
                    return;
                }
            } catch (e) {
                console.error("WS connection error:", e);
                socket.close(1011, "Server security error");
                return;
            }
        }

        console.log("Client connected");

        socket.isAlive = true;

        socket.subscriptions = new Set();

        socket.on("pong", heartbeat);

        sendJson(socket, {
            type: "welcome",
        });

        socket.on("message", (data) => {
            handleMessage(socket, data);
        });

        socket.on("close", () => {
            cleanupSubscriptions(socket);
            console.log("Client disconnected");
        });

        socket.on("error", (err) => {
            console.error(err);
            socket.terminate();
        });
    });

    // Heartbeat every 30 seconds
    const interval = setInterval(() => {
        for (const socket of wss.clients) {
            if (socket.isAlive === false) {
                console.log("Removing dead client...");
                socket.terminate();
                continue;
            }

            socket.isAlive = false;
            socket.ping();
        }
    }, 30000);

    wss.on("close", () => {
        clearInterval(interval);
    });

    function broadcastMatchCreated(match) {
        console.log("Broadcasting match:", match);

        broadcastToAll(wss, {
            type: "match_created",
            data: match,
        });
    }

    function broadcastCommentary(matchId, comments) {
        broadcastToMatchId(matchId, {
            type: "commentary",
            data: comments,
        });
    }

    return {
        broadcastMatchCreated,
        broadcastCommentary,
    };
}