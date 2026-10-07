import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getWeights, getWeightById, createWeight, deleteWeight, updateWeight } from "../services/weightService.js";
import { authenticate } from "../hooks/auth.js";
import { ValidationError } from "../errors/ValidationError.js";

const paramsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

const createWeightSchema = z.object({
    weight: z.number().min(0),
});

const updateWeightSchema = z.object({
    weight: z.number().min(0).optional(),
}).refine(
    data => data.weight !== undefined,
    {
        message: "At least one field is required",
    }
);

export async function weightRoutes(app: FastifyInstance) {
    app.get("/", { preHandler: authenticate }, async (request) => {
        const weights = await getWeights(request.user.id);
        return {
            status: "ok",
            message: "Weights fetched successfully",
            weights,
        };
    });

    app.get("/:id", { preHandler: authenticate }, async (request) => {
        const paramsResult = paramsSchema.safeParse(request.params);
        if (!paramsResult.success) {
            throw new ValidationError(paramsResult.error);
        }
        const weight = await getWeightById(request.user.id, paramsResult.data.id);
        return {
            status: "ok",
            weight,
        };
    });

    app.post("/", { preHandler: authenticate }, async (request) => {
        const result = createWeightSchema.safeParse(request.body);
        if (!result.success) {
            throw new ValidationError(result.error);
        }
        const weight = await createWeight(request.user.id, result.data.weight);
        return {
            status: "ok",
            message: "Weight created successfully",
            weight,
        };
    });

    app.delete("/:id", { preHandler: authenticate }, async (request) => {
        const paramsResult = paramsSchema.safeParse(request.params);
        if (!paramsResult.success) {
            throw new ValidationError(paramsResult.error);
        }
        const deletedWeight = await deleteWeight(request.user.id, paramsResult.data.id);
        return {
            status: "ok",
            message: "Weight deleted successfully",
            deletedWeight,
        };
    });

    app.put("/:id", { preHandler: authenticate }, async (request) => {
        const paramsResult = paramsSchema.safeParse(request.params);
        if (!paramsResult.success) {
            throw new ValidationError(paramsResult.error);
        }
        const result = updateWeightSchema.safeParse(request.body);
        if (!result.success) {
            throw new ValidationError(result.error);
        }
        const updateResult = await updateWeight(request.user.id, paramsResult.data.id, result.data.weight);
        return {
            status: "ok",
            message: "Weight updated successfully",
            updatedWeight: updateResult,
        };
    });
}
