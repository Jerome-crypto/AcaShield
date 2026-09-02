"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const server = app_1.default.listen(env_1.env.port, () => {
    console.log(`=========================================`);
    console.log(` AcaShield Server started on port ${env_1.env.port}`);
    console.log(` Environment: ${env_1.env.nodeEnv}`);
    console.log(` Client URL: ${env_1.env.clientUrl}`);
    console.log(`=========================================`);
});
// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION! Shutting down...");
    console.error(err);
    server.close(() => {
        process.exit(1);
    });
});
// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION! Shutting down...");
    console.error(err);
    process.exit(1);
});
