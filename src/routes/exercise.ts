import { FastifyInstance } from "fastify";
import { getExercises } from "../services/exerciseService.js";
import { z } from "zod";

const getExercisesSchema = z.object({
    muscleGroup: z.string().optional(),
});

export async function exerciseRoutes(app: FastifyInstance) {
    app.get("/", async (request, reply) => {

        const result = getExercisesSchema.safeParse(request.query);

        if (!result.success) {
            reply.code(400).send({
                status: "error",
                message: "Invalid request body",
            });
            return;
        }

        const exercises = await getExercises(result.data.muscleGroup);

        return {
            status: "ok",
            message: "Exercises fetched successfully",
            exercises,
        };
    });
}