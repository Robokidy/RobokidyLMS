const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Mongoose will keep trying to reconnect.");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected");
  });

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000
  });
  console.log("MongoDB connected");
};

module.exports = connectDB;
