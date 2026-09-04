const mongoose = require("mongoose");

async function connectDatabase(uri) {
    await mongoose.connect(uri);
    console.log("Connected to Database");
}

async function disconnectDatabase() {
    await mongoose.disconnect();
    console.log("Disconnected from Database");
}

module.exports = { connectDatabase, disconnectDatabase };
