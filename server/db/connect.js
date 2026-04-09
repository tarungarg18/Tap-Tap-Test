const mongoose = require("mongoose");

const URI_KEYS = ["MONGODB_URI", "MONGO_URI", "MONGO_URL", "DATABASE_URL"];
const LOCAL_FALLBACK_URI = "mongodb://127.0.0.1:27017/tap_tap";

function resolveMongoUri() {
    for (const key of URI_KEYS) {
        const value = process.env[key];
        if (value && String(value).trim()) {
            return String(value).trim();
        }
    }
    return "";
}

function maskCredentials(uri) {
    if (!uri) return "";
    return uri.replace(/\/\/([^:@]+):([^@]+)@/, "//***:***@");
}

async function connectMongo() {
    const envUri = resolveMongoUri();
    const mongoUri = envUri || LOCAL_FALLBACK_URI;

    if (!envUri && process.env.NODE_ENV === "production") {
        throw new Error("MongoDB connection string missing: set MONGODB_URI (or MONGO_URI/DATABASE_URL) in env");
    }

    try {
        await mongoose.connect(mongoUri, { autoIndex: true });
        console.log(`MongoDB connected at ${maskCredentials(mongoUri)}`);
        return mongoose.connection;
    } catch (err) {
        console.error(`MongoDB connection failed for ${maskCredentials(mongoUri)}: ${err.message}`);
        throw err;
    }
}

module.exports = {
    connectMongo
};
