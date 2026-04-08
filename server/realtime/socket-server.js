const { Server } = require("socket.io");

const { parseAuthToken } = require("../services/auth-service");
const { LudoRoomService } = require("./ludo-room-service");

function replyAck(ack, payload) {
    if (typeof ack === "function") {
        ack(payload);
    }
}

function attachSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: true,
            credentials: true
        }
    });

    const roomService = new LudoRoomService(io);

    io.use((socket, next) => {
        try {
            const token = socket.handshake?.auth?.token || socket.handshake?.query?.token;
            if (!token) {
                return next(new Error("Unauthorized"));
            }

            const payload = parseAuthToken(token);
            socket.user = {
                userId: String(payload.sub),
                username: payload.username,
                email: payload.email
            };

            return next();
        } catch {
            return next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket) => {
        socket.emit("ludo:connected", {
            ok: true,
            userId: socket.user.userId,
            username: socket.user.username
        });

        socket.on("ludo:createRoom", (payload, ack) => {
            try {
                const response = roomService.createRoom(socket, payload || {});
                replyAck(ack, response);
            } catch (err) {
                replyAck(ack, { ok: false, error: err.message || "Failed to create room." });
            }
        });

        socket.on("ludo:joinRoom", (payload, ack) => {
            try {
                const response = roomService.joinRoom(socket, payload || {});
                replyAck(ack, response);
            } catch (err) {
                replyAck(ack, { ok: false, error: err.message || "Failed to join room." });
            }
        });

        socket.on("ludo:leaveRoom", (_payload, ack) => {
            try {
                const response = roomService.leaveRoom(socket, { silent: false });
                replyAck(ack, response);
            } catch (err) {
                replyAck(ack, { ok: false, error: err.message || "Failed to leave room." });
            }
        });

        socket.on("ludo:roll", (_payload, ack) => {
            try {
                const response = roomService.roll(socket);
                if (!response.ok) {
                    socket.emit("ludo:error", { message: response.error || "Roll failed." });
                }
                replyAck(ack, response);
            } catch (err) {
                const fail = { ok: false, error: err.message || "Roll failed." };
                socket.emit("ludo:error", { message: fail.error });
                replyAck(ack, fail);
            }
        });

        socket.on("ludo:start", (_payload, ack) => {
            try {
                const response = roomService.startRoom(socket);
                replyAck(ack, response);
            } catch (err) {
                replyAck(ack, { ok: false, error: err.message || "Failed to start" });
            }
        });

        socket.on("ludo:move", (payload, ack) => {
            try {
                const response = roomService.move(socket, payload || {});
                if (!response.ok) {
                    socket.emit("ludo:error", { message: response.error || "Move failed." });
                }
                replyAck(ack, response);
            } catch (err) {
                const fail = { ok: false, error: err.message || "Move failed." };
                socket.emit("ludo:error", { message: fail.error });
                replyAck(ack, fail);
            }
        });

        socket.on("disconnect", () => {
            roomService.handleDisconnect(socket);
        });
    });

    return io;
}

module.exports = {
    attachSocketServer
};

