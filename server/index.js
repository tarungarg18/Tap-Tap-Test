const path = require("path");

const envRoot = path.join(__dirname, "..");
const dotenv = require("dotenv");

const envResult = dotenv.config({ path: path.join(envRoot, ".env") });

if (envResult.error) {
    console.warn(`Tap-Tap: could not read .env at ${path.join(envRoot, ".env")}: ${envResult.error.message}`);
}

const http = require("http");

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
