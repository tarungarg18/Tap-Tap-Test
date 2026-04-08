const express = require("express");
const path = require("path");

const gamesApiRouter = require("./routes/games-api");
const authApiRouter = require("./routes/auth-api");
const mailApiRouter = require("./routes/mail-api");
const dashboardApiRouter = require("./routes/dashboard-api");
const { getFrontendIndexPath } = require("./services/game-service");

function createApp() {
    const app = express();
    const rootDir = path.resolve(__dirname, "..");
    const webDir = path.join(rootDir, "web");

    app.use(express.json({ limit: "1mb" }));

    app.use("/engine", express.static(path.join(rootDir, "engine")));
    app.use("/game", express.static(path.join(rootDir, "game")));
    app.use("/web", express.static(webDir));

    function sendWebPage(pageFile) {
        return (req, res) => {
            res.sendFile(path.join(webDir, pageFile));
        };
    }

    app.get("/", sendWebPage("home.html"));
    app.get("/home", sendWebPage("home.html"));
    app.get("/login", sendWebPage("login.html"));
    app.get("/signup", sendWebPage("signup.html"));
    app.get("/dashboard", sendWebPage("dashboard.html"));
    app.get("/game-info/:gameName", sendWebPage("game-info.html"));

    app.get("/games/:gameName", (req, res, next) => {
        try {
            const indexPath = getFrontendIndexPath(req.params.gameName);
            res.sendFile(indexPath);
        } catch (err) {
            next(err);
        }
    });

    app.use("/api/auth", authApiRouter);
    app.use("/api/mail", mailApiRouter);
    app.use("/api/dashboard", dashboardApiRouter);
    app.use("/api/games", gamesApiRouter);

    app.use((err, req, res, next) => {
        const status = err?.status || 500;
        const message = err?.message || "Internal server error";
        res.status(status).json({ error: message });
    });

    return app;
}

module.exports = {
    createApp
};
