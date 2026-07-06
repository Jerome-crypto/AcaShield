import app from "./app";
import { env } from "./config/env";

const server = app.listen(env.port, () => {
  console.log(`=========================================`);
  console.log(` AcaShield Server started on port ${env.port}`);
  console.log(` Environment: ${env.nodeEnv}`);
  console.log(` Client URL: ${env.clientUrl}`);
  console.log(`=========================================`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: any) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err);
  process.exit(1);
});
