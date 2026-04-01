const mongoose = require("mongoose");

async function connectMongo() {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tap_tap";

    await mongoose.connect(mongoUri, {
        autoIndex: true
    });

    return mongoose.connection;
}

module.exports = {
    connectMongo
};
