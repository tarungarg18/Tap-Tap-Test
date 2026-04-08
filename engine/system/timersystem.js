class TimerSystem {
    constructor(config) {
        this.reset(config);
    }

    reset(config) {
        const limitSeconds = Number(config?.timer?.limit);
        this.timeLimit = Number.isFinite(limitSeconds) && limitSeconds > 0 ? limitSeconds : 60;
        this.remainingMs = this.timeLimit * 1000;
    }

    update(deltaMs) {
        if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
        this.remainingMs = Math.max(0, this.remainingMs - deltaMs);
    }

    isExpired() {
        return this.remainingMs <= 0;
    }

    getTime() {
        return Math.ceil(this.remainingMs / 1000);
    }
}

if (typeof window !== "undefined") {
    window.TimerSystem = TimerSystem;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = TimerSystem;
}

