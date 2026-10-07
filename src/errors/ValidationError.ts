import { z } from "zod";
import { AppError } from "./AppError.js";

export class ValidationError extends AppError {
    issues: {
        path: PropertyKey[];
        message: string;
    }[];

    constructor(error: z.ZodError) {
        super("Validation failed", 400);

        this.issues = error.issues.map(issue => ({
            path: issue.path,
            message: issue.message,
        }));
    }
}