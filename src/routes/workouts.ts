import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getWorkouts, createWorkout, getWorkoutById, deleteWorkout, updateWorkout } from "../services/workoutService.js";
import { authenticate } from "../hooks/auth.js";
import { error } from "node:console";
import { ValidationError } from "../errors/ValidationError.js";


const paramsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

const setSchema = z.object({
    reps: z.number().int().positive(),
    weight: z.number().nonnegative(),
});

const workoutExerciseSchema = z.object({
    exerciseId: z.number().int().positive(),
    sets: z.array(setSchema).min(1),
});

const createWorkoutSchema = z.object({
    name: z.string().min(1),
    date: z.iso.date(),
    notes: z.string().optional(),
    exercises: z.array(workoutExerciseSchema).min(1),
}).refine(
    (workout) => {
        const ids = workout.exercises.map(exercise => exercise.exerciseId);
        return new Set(ids).size === ids.length;
    },
    {
        message: "An exercise cannot be added more than once to a workout",
        path: ["exercises"],
    }
);

const updateWorkoutSchema = z.object({
    name: z.string().min(1).optional(),
    date: z.iso.date().optional(),
    notes: z.string().optional(),
}).refine(
    data => data.name !== undefined || data.date !== undefined || data.notes !== undefined, 
    {
        message: "At least one field is required",
    }
);

export async function workoutRoutes(app: FastifyInstance) {
    app.get("/", { preHandler: authenticate }, async (request, reply) => {
        const result = await getWorkouts(request.user.id);
        return {
            status: "ok",
            message: "Workouts fetched successfully",
            workouts: result,
        };
    });
      app.post("/", { preHandler: authenticate }, async (request, reply) => {
        const result = createWorkoutSchema.safeParse(request.body);
        if (!result.success) {
            throw new ValidationError(result.error);
        }
        const createResult = await createWorkout(
            request.user.id,
            result.data.name,
            result.data.date,
            result.data.notes,
            result.data.exercises
        );
        return {
            status: "ok",
            message: "Workout created successfully",
            workout: createResult,
        };
      });
      app.get("/:id", { preHandler: authenticate }, async (request, reply) => {
        const paramsResult = paramsSchema.safeParse(request.params);
        if (!paramsResult.success) {
            throw new ValidationError(paramsResult.error);
        }
        const { id } = paramsResult.data;
        const userId = request.user.id;
        const result = await getWorkoutById(id, userId);
        return {
            status: "ok",
            workout: result,
        };
    });
      app.delete("/:id", { preHandler: authenticate }, async (request, reply) => {
        const paramsResult = paramsSchema.safeParse(request.params);
        if (!paramsResult.success) {
            throw new ValidationError(paramsResult.error);
        }
        const { id } = paramsResult.data;
        const userId = request.user.id;
        const result = await deleteWorkout(id, userId);
        return {
            status: "ok",
            message: "Workout deleted successfully",
            deletedWorkout: result,
        };
    });
      app.patch("/:id", { preHandler: authenticate }, async (request, reply) => {
        const paramsResult = paramsSchema.safeParse(request.params);
        if (!paramsResult.success) {
            throw new ValidationError(paramsResult.error);
        }
        const { id } = paramsResult.data;
        const userId = request.user.id;
        const result = updateWorkoutSchema.safeParse(request.body);
        if (!result.success) {
            throw new ValidationError(result.error);
        }
        const updateResult = await updateWorkout(id, userId, result.data.name, result.data.date, result.data.notes);
        return {
            status: "ok",
            message: "Workout updated successfully",
            updatedWorkout: updateResult,
        };
    });
}