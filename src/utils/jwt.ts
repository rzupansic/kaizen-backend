import { jwtVerify, SignJWT } from "jose";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function createToken(userId: number) {
    return await new SignJWT({
        sub: userId.toString(),
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secret);
}

export async function verifyToken(token: string) {
    const { payload } = await jwtVerify(token, secret);

    if (!payload.sub || payload.exp === undefined) {
        throw new Error("Unauthorized");
    }

    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
        throw new Error("Unauthorized");
    }

    return {
        userId,
        expiresAt: payload.exp,
    };
}
