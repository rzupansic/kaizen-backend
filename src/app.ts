import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { workoutRoutes } from "./routes/workouts.js";
import { authRoutes } from "./routes/auth.js";
import { exerciseRoutes } from "./routes/exercise.js";
import { AppError } from "./errors/AppError.js";
import { ValidationError } from "./errors/ValidationError.js";
import { weightRoutes } from "./routes/weight.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(cookie);

  app.register(cors, {
    origin: process.env.FRONTEND_ORIGIN ?? true,
    credentials: true,
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ValidationError) {
        reply.code(400).send({
            status: "error",
            message: "Validation failed",
            errors: error.issues,
        });
        return;
    }

    if (error instanceof AppError) {
        reply.code(error.statusCode).send({
            status: "error",
            message: error.message,
        });
        return;
    }

    request.log.error(error);

    reply.code(500).send({
        status: "error",
        message: "Internal server error",
    });
});

  app.get("/api/health", async () => {
    return {
      status: "ok",
      message: "Kaizen API is running",
    };
  });

  app.get("/api/hello", async (request) => {
    const { name, favoriteExercise } =
      request.query as {
        name?: string;
        favoriteExercise?: string;
      };

    return {
      status: "ok",
      message: `Hello ${name ?? "there"}`,
      favoriteExercise: favoriteExercise ?? "No favorite exercise",
    };
  });

  app.get("/api/db-test", async () => {
    return {
      status: "ok",
    };
  });

  app.register(workoutRoutes, {
    prefix: "/api/workouts",
  });

  app.register(exerciseRoutes, {
    prefix: "/api/exercises",
  });

  app.register(authRoutes, {
    prefix: "/api/auth",
  });
  app.register(weightRoutes, {
    prefix: "/api/weights",
  });

  return app;
}