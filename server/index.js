const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const http = require("http");

const envRoot = path.join(__dirname, "..");
const envPath = path.join(envRoot, ".env");

// Load .env only if the file exists; Render/Vercel inject env vars directly
if (fs.existsSync(envPath)) {
    const envResult = dotenv.config({ path: envPath });
    if (envResult.error) {
        console.warn(`Tap-Tap: could not read .env at ${envPath}: ${envResult.error.message}`);
    }
} else if (process.env.NODE_ENV !== "production") {
    console.info(`Tap-Tap: no .env file at ${envPath}, relying on process.env`);
}

const { createApp } = require("./app");
const { connectMongo } = require("./db/connect");
const { attachSocketServer } = require("./realtime/socket-server");

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectMongo();

        const app = createApp();
        const httpServer = http.createServer(app);
        attachSocketServer(httpServer);

        httpServer.listen(PORT, () => {
            console.log(`Tap-Tap web server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err.message);
        process.exit(1);
    }
}

startServer();
