import { FastifyInstance } from "fastify";
import { comparePassword, hashPassword, getUserById, loginUser, registerUser } from "../services/authService.js";
import { z } from "zod";
import { AUTH_COOKIE_NAME, authCookieOptions } from "../utils/authCookie.js";
import { createToken, verifyToken } from "../utils/jwt.js";
import { blacklistToken } from "../utils/tokenBlacklist.js";
import { authenticate } from "../hooks/auth.js";

const registerUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

const loginUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export async function authRoutes(app: FastifyInstance) {
    app.post("/register", async (request, reply) => {
        const result = registerUserSchema.safeParse(request.body);
    
        if (!result.success) {
            reply.code(400).send({
                status: "error",
                message: "Invalid request body",
            });
            return;
        }
    
        try {
            const user = await registerUser(
            result.data.email,
            result.data.password
        );
        reply.code(201).send({
            status: "ok",
                message: "User registered successfully",
                user,
            });
            return;
        } catch (error) {
            if (error instanceof Error && error.message === "Email already exists") {
                reply.code(409).send({
                    status: "error",
                    message: "Email already exists",
                });
                return;
            }
            throw error;
        }
    });

    app.post("/login", async (request, reply) => {
        const result = loginUserSchema.safeParse(request.body);
        if (!result.success) {
            reply.code(400).send({
                status: "error",
                message: "Invalid request body",
            });
            return;
        }
        try {
            const user = await loginUser(result.data.email, result.data.password);
            const token = await createToken(user.id);
            reply.setCookie(AUTH_COOKIE_NAME, token, authCookieOptions);
            return {
                status: "ok",
                message: "User logged in successfully",
                user,
                token,
            };
        } catch (error) {
            if (error instanceof Error && error.message === "Invalid credentials") {
                reply.code(401).send({
                    status: "error",
                    message: "Invalid credentials",
                });
                return;
            }
            throw error;
        }
    });

    app.get("/me", { preHandler: authenticate }, async (request, reply) => {
        const user = await getUserById(request.user.id);
        if (!user) {
            reply.code(401).send({
                status: "error",
                message: "Unauthorized",
            });
            return;
        }
        return {
            status: "ok",
            user,
        };
    });

    app.post("/logout", async (request, reply) => {
        const token = request.cookies[AUTH_COOKIE_NAME];

        if (token) {
            try {
                const { expiresAt } = await verifyToken(token);
                blacklistToken(token, expiresAt);
            } catch {
                // Clear the cookie even when the token is already invalid.
                reply.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
            }
        }

        reply.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
        return {
            status: "ok",
            message: "Logged out",
        };
    });
}
