const http = require("http");

const { createApp } = require("./app");
const { connectMongo } = require("./db/connect");

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectMongo();

        const app = createApp();
        const httpServer = http.createServer(app);

        httpServer.listen(PORT, () => {
            console.log(`Tap-Tap web server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err.message);
        process.exit(1);
    }
}

startServer();
