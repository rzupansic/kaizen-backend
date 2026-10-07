import { buildApp } from "./app.js";

const app = buildApp();

const start = async () => {
  try {
    await app.listen({
      port: 3001,
      host: "0.0.0.0",
    });

    console.log("Kaizen API running on http://localhost:3001");
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();