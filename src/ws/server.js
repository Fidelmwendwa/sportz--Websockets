import { WebSocketServer, WebSocket } from "ws";

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
    const message = JSON.stringify(payload);

    for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

export function attachWebSocketServer(server, wsArcjet = null) {
    const wss = new WebSocketServer({
        server,
        path: "/ws",
        maxPayload: 1024 * 1024,
    });

    function heartbeat() {
        this.isAlive = true;
    }

    wss.on("connection", async (socket, req) => {
        // Arcjet protection (optional)
        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1008;
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

        socket.on("pong", heartbeat);

        sendJson(socket, {
            type: "welcome",
        });

        socket.on("close", () => {
            console.log("Client disconnected");
        });

        socket.on("error", (err) => {
            console.error(err);
        });
    });

    // Heartbeat
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

        broadcast(wss, {
            type: "match_created",
            data: match,
        });
    }

    return {
        broadcastMatchCreated,
    };
}