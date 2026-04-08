const crypto = require("crypto");

const LudoGame = require("../../game/ludo/game");
const { readLevelConfig } = require("../services/game-service");

const DEFAULT_LEVEL = "level1.json";
const DEFAULT_TURN_DURATION_SECONDS = 20;
const MAX_TURN_DURATION_SECONDS = 90;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

const COLOR_SEATS = [
    { colorKey: "red", displayName: "Red", color: "#df4f4f", startIndex: 0 },
    { colorKey: "green", displayName: "Green", color: "#2f9d5a", startIndex: 13 },
    { colorKey: "yellow", displayName: "Yellow", color: "#d9ae1a", startIndex: 26 },
    { colorKey: "blue", displayName: "Blue", color: "#3d78d8", startIndex: 39 }
];

function createRoomId() {
    return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function normalizeRoomId(value) {
    return String(value || "").trim().toUpperCase();
}

function clampPlayerCount(raw) {
    const num = Number(raw);
    if (!Number.isInteger(num)) return MAX_PLAYERS;
    if (num < MIN_PLAYERS) return MIN_PLAYERS;
    if (num > MAX_PLAYERS) return MAX_PLAYERS;
    return num;
}

function findColor(colorKey) {
    const key = String(colorKey || "").toLowerCase();
    return COLOR_SEATS.find((item) => item.colorKey === key) || null;
}

class LudoRoomService {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
        this.socketToRoom = new Map();
    }

    createRoom(socket, payload = {}) {
        const roomId = createRoomId();
        const levelFile = String(payload.levelFile || DEFAULT_LEVEL);
        const playerCount = clampPlayerCount(payload.playerCount);

        const seats = Array.from({ length: playerCount }, (_unused, seatIndex) => ({
            seatIndex,
            userId: null,
            username: "",
            socketId: null,
            connected: false,
            colorKey: null,
            color: null,
            displayName: null,
            startIndex: null
        }));

        const room = {
            roomId,
            levelFile,
            playerCount,
            createdBy: socket.user.userId,
            status: "waiting",
            seats,
            game: null,
            turnDurationMs: DEFAULT_TURN_DURATION_SECONDS * 1000,
            turnDeadlineTs: null,
            turnTimer: null,
            lastAction: null,
            lastActionId: 0,
            updatedAt: Date.now()
        };

        this.rooms.set(roomId, room);

        this.joinRoom(socket, { roomId, colorKey: payload.colorKey, suppressAckError: true });
        this.emitRoomState(room);

        return {
            ok: true,
            roomId,
            status: room.status,
            playerCount: room.playerCount
        };
    }

    joinRoom(socket, payload = {}) {
        const roomId = normalizeRoomId(payload.roomId);
        if (!roomId) {
            return { ok: false, error: "Room ID is required." };
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            return { ok: false, error: "Room not found." };
        }

        const currentRoomId = this.socketToRoom.get(socket.id);
        if (currentRoomId && currentRoomId !== roomId) {
            this.leaveRoom(socket, { silent: true });
        }

        const desiredColor = payload.colorKey ? findColor(payload.colorKey) : null;
        if (payload.colorKey && !desiredColor) {
            return { ok: false, error: "Invalid color selection." };
        }

        const existingSeat = room.seats.find((seat) => seat.userId === socket.user.userId);
        let assignedSeat = existingSeat;

        if (!assignedSeat) {
            if (this.occupiedSeats(room).length >= room.playerCount) {
                return { ok: false, error: `Room is full (${room.playerCount} players).` };
            }
            assignedSeat = room.seats.find((seat) => !seat.userId);
            if (!assignedSeat) {
                return { ok: false, error: "Room is full." };
            }
        }

        const takenColors = new Set(room.seats.filter((seat) => seat.userId && seat.colorKey).map((seat) => seat.colorKey));
        const colorToUse = desiredColor && !takenColors.has(desiredColor.colorKey)
            ? desiredColor
            : COLOR_SEATS.find((opt) => !takenColors.has(opt.colorKey));

        if (!colorToUse) {
            return { ok: false, error: "All colors are taken." };
        }

        assignedSeat.userId = socket.user.userId;
        assignedSeat.username = socket.user.username;
        assignedSeat.socketId = socket.id;
        assignedSeat.connected = true;
        assignedSeat.colorKey = colorToUse.colorKey;
        assignedSeat.color = colorToUse.color;
        assignedSeat.displayName = colorToUse.displayName;
        assignedSeat.startIndex = colorToUse.startIndex;

        socket.join(this.roomChannel(roomId));
        this.socketToRoom.set(socket.id, roomId);

        const occupied = this.occupiedSeats(room).length;

        // waiting for host to start
        room.updatedAt = Date.now();
        this.emitRoomState(room);

        return {
            ok: true,
            roomId,
            status: room.status,
            playerCount: room.playerCount
        };
    }

    leaveRoom(socket, options = {}) {
        const roomId = this.socketToRoom.get(socket.id);
        if (!roomId) {
            return { ok: true };
        }

        const room = this.rooms.get(roomId);
        this.socketToRoom.delete(socket.id);
        socket.leave(this.roomChannel(roomId));

        if (!room) {
            return { ok: true };
        }

        const seat = room.seats.find((item) => item.socketId === socket.id);
        if (seat) {
            seat.userId = null;
            seat.username = "";
            seat.socketId = null;
            seat.connected = false;
            seat.colorKey = null;
            seat.color = null;
            seat.displayName = null;
            seat.startIndex = null;
        }

        if (room.status === "playing") {
            this.clearTurnTimer(room);
            room.status = "waiting";
            room.game = null;
            room.turnDeadlineTs = null;
            room.lastActionId += 1;
            room.lastAction = {
                type: "PLAYER_LEFT",
                message: "A player left. Room reset and waiting for players."
            };
        }

        room.updatedAt = Date.now();

        if (this.occupiedSeats(room).length === 0) {
            this.clearTurnTimer(room);
            this.rooms.delete(roomId);
            return { ok: true };
        }

        if (!options.silent) {
            this.emitRoomState(room);
        }

        return { ok: true };
    }

    handleDisconnect(socket) {
        this.leaveRoom(socket, { silent: false });
    }

    roll(socket) {
        const room = this.getActionRoomForSocket(socket);
        if (!room.ok) return room;

        const actionRoom = room.room;
        const turnCheck = this.validateTurnOwner(actionRoom, socket);
        if (!turnCheck.ok) return turnCheck;

        const before = actionRoom.game.getState();
        const action = actionRoom.game.handleInput("roll");

        return this.afterAction(actionRoom, action, before.currentPlayerId);
    }

    startRoom(socket) {
        const roomId = this.socketToRoom.get(socket.id);
        if (!roomId) return { ok: false, error: "Join a room first." };
        const room = this.rooms.get(roomId);
        if (!room) return { ok: false, error: "Room not found." };
        if (room.createdBy !== socket.user.userId) return { ok: false, error: "Only host can start." };
        if (room.status !== "waiting") return { ok: false, error: "Game already started." };
        if (this.occupiedSeats(room).length !== room.playerCount || !this.allSeatsColored(room)) {
            return { ok: false, error: "Need all players seated with colors." };
        }
        this.startGame(room);
        return { ok: true, roomId: room.roomId, status: room.status };
    }

    move(socket, payload = {}) {
        const room = this.getActionRoomForSocket(socket);
        if (!room.ok) return room;

        const actionRoom = room.room;
        const turnCheck = this.validateTurnOwner(actionRoom, socket);
        if (!turnCheck.ok) return turnCheck;

        const tokenNumber = Number(payload.tokenNumber);
        if (!Number.isInteger(tokenNumber) || tokenNumber < 1 || tokenNumber > 4) {
            return { ok: false, error: "Invalid token number." };
        }

        const before = actionRoom.game.getState();
        const action = actionRoom.game.handleInput(`move p${tokenNumber}`);

        return this.afterAction(actionRoom, action, before.currentPlayerId);
    }

    afterAction(room, action, previousPlayerId) {
        if (!action || typeof action !== "object") {
            return { ok: false, error: "Invalid game action." };
        }

        if (action.type === "INVALID") {
            return { ok: false, error: action.message || "Invalid action." };
        }

        room.lastActionId += 1;
        room.lastAction = { ...action };
        room.updatedAt = Date.now();

        if (room.game.gameOver) {
            room.status = "finished";
            room.turnDeadlineTs = null;
            this.clearTurnTimer(room);
        } else {
            const currentState = room.game.getState();
            const turnChanged = currentState.currentPlayerId !== previousPlayerId;

            if (turnChanged || !room.turnDeadlineTs) {
                this.resetTurnTimer(room);
            }
        }

        this.emitRoomState(room);

        return {
            ok: true,
            roomId: room.roomId,
            actionType: action.type
        };
    }

    startGame(room) {
        const occupied = this.occupiedSeats(room);
        if (occupied.length !== room.playerCount) {
            return;
        }

        const missingColor = occupied.some((seat) => !seat.colorKey || !findColor(seat.colorKey));
        if (missingColor) {
            return;
        }

        let config;
        try {
            config = readLevelConfig("ludo", room.levelFile || DEFAULT_LEVEL);
        } catch {
            config = readLevelConfig("ludo", DEFAULT_LEVEL);
        }

        const gameplay = {
            ...(config.gameplay || {}),
            tokensPerPlayer: 4,
            players: occupied.map((seat) => {
                const color = findColor(seat.colorKey);
                return {
                    id: seat.colorKey,
                    name: seat.username || seat.displayName || seat.colorKey,
                    color: color?.color || seat.color || "#888",
                    startIndex: color?.startIndex ?? 0
                };
            })
        };

        const turnSecondsRaw = Number(config?.gameplay?.turnDurationSeconds);
        const turnSeconds = Number.isFinite(turnSecondsRaw) && turnSecondsRaw >= 8
            ? Math.min(turnSecondsRaw, MAX_TURN_DURATION_SECONDS)
            : DEFAULT_TURN_DURATION_SECONDS;

        room.turnDurationMs = turnSeconds * 1000;

        const preparedConfig = {
            ...config,
            level: config.level || room.levelFile || DEFAULT_LEVEL,
            game: {
                ...(config.game || {}),
                title: `${config?.game?.title || "Ludo"} Room ${room.roomId}`
            },
            gameplay
        };

        room.game = new LudoGame(preparedConfig);
        room.game.init();
        room.status = "playing";
        room.lastActionId += 1;
        room.lastAction = {
            type: "START",
            message: "Room is ready. Match started."
        };

        this.resetTurnTimer(room);
        this.emitRoomState(room);
    }

    resetTurnTimer(room) {
        this.clearTurnTimer(room);

        if (room.status !== "playing" || !room.game || room.game.gameOver) {
            room.turnDeadlineTs = null;
            return;
        }

        room.turnDeadlineTs = Date.now() + room.turnDurationMs;
        room.turnTimer = setTimeout(() => {
            this.expireTurn(room.roomId);
        }, room.turnDurationMs + 25);
    }

    expireTurn(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.status !== "playing" || !room.game) {
            return;
        }

        const action = room.game.expireTurn();
        room.lastActionId += 1;
        room.lastAction = {
            ...action,
            timeout: true
        };
        room.updatedAt = Date.now();

        if (room.game.gameOver) {
            room.status = "finished";
            room.turnDeadlineTs = null;
            this.clearTurnTimer(room);
        } else {
            this.resetTurnTimer(room);
        }

        this.emitRoomState(room);
    }

    clearTurnTimer(room) {
        if (room.turnTimer) {
            clearTimeout(room.turnTimer);
            room.turnTimer = null;
        }
    }

    getActionRoomForSocket(socket) {
        const roomId = this.socketToRoom.get(socket.id);
        if (!roomId) {
            return { ok: false, error: "Join a room first." };
        }

        const room = this.rooms.get(roomId);
        if (!room) {
            return { ok: false, error: "Room not found." };
        }

        if (room.status !== "playing" || !room.game) {
            return { ok: false, error: "Game has not started yet." };
        }

        return { ok: true, room };
    }

    validateTurnOwner(room, socket) {
        const seat = room.seats.find((item) => item.userId === socket.user.userId);
        if (!seat) {
            return { ok: false, error: "You are not seated in this room." };
        }

        const gameState = room.game.getState();
        const expectedColor = gameState.currentPlayerId;

        if (seat.colorKey !== expectedColor) {
            return { ok: false, error: `It is ${gameState.currentPlayerName || "another player"} turn.` };
        }

        return { ok: true };
    }

    occupiedSeats(room) {
        return room.seats.filter((seat) => Boolean(seat.userId));
    }

    allSeatsColored(room) {
        return room.seats.every((seat) => seat.userId && seat.colorKey);
    }

    availableColors(room) {
        const used = new Set(room.seats.filter((seat) => seat.colorKey).map((seat) => seat.colorKey));
        return COLOR_SEATS.filter((color) => !used.has(color.colorKey));
    }

    roomChannel(roomId) {
        return `ludo:${roomId}`;
    }

    emitRoomState(room) {
        const state = {
            roomId: room.roomId,
            status: room.status,
            levelFile: room.levelFile,
            hostUserId: room.createdBy,
            playerCount: room.playerCount,
            turnDurationMs: room.turnDurationMs,
            turnDeadlineTs: room.turnDeadlineTs,
            seats: room.seats.map((seat) => ({
                seatIndex: seat.seatIndex,
                colorKey: seat.colorKey,
                color: seat.color,
                displayName: seat.displayName,
                userId: seat.userId,
                username: seat.username,
                connected: seat.connected,
                occupied: Boolean(seat.userId)
            })),
            availableColors: this.availableColors(room),
            gameState: room.game ? room.game.getState() : null,
            lastAction: room.lastAction,
            lastActionId: room.lastActionId,
            updatedAt: room.updatedAt
        };

        this.io.to(this.roomChannel(room.roomId)).emit("ludo:roomState", state);
    }
}

module.exports = {
    LudoRoomService
};
