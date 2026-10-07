import { FastifyRequest, FastifyReply } from "fastify";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";
import { verifyToken } from "../utils/jwt.js";
import { isTokenBlacklisted } from "../utils/tokenBlacklist.js";

export async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const token = readToken(request, reply);
    if (!token) {
        return;
    }

    if (isTokenBlacklisted(token)) {
        reply.code(401).send({
            status: "error",
            message: "Unauthorized",
        });
        return;
    }

    try {
        const { userId } = await verifyToken(token);
        request.user = {
            id: userId,
        };
    } catch {
        reply.code(401).send({
            status: "error",
            message: "Unauthorized",
        });
    }
}

function readToken(request: FastifyRequest, reply: FastifyReply) {
    const cookieToken = request.cookies?.[AUTH_COOKIE_NAME];
    if (cookieToken) {
        return cookieToken;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader) {
        reply.code(401).send({
            status: "error",
            message: "Authorization header required",
        });
        return;
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        reply.code(401).send({
            status: "error",
            message: "Invalid authorization header",
        });
        return;
    }

    return token;
}
