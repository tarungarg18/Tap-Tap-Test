const mongoose = require("mongoose");

const LOCAL_FALLBACK_URI = "mongodb://127.0.0.1:27017/tap_tap";

function resolveMongoUri() {
    const raw = process.env.MONGODB_URI;
    return raw && String(raw).trim() ? String(raw).trim() : "";
}

async function connectMongo() {
    const envUri = resolveMongoUri();
    const mongoUri = envUri || LOCAL_FALLBACK_URI;

    if (!envUri && process.env.NODE_ENV === "production") {
        throw new Error("MongoDB connection string missing: set MONGODB_URI in env");
    }

    await mongoose.connect(mongoUri, { autoIndex: true });
    return mongoose.connection;
}

module.exports = {
    connectMongo
};
