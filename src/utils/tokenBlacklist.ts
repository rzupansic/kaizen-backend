import { createHash } from "crypto";

const revokedTokens = new Map<string, number>();

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

function pruneExpiredTokens() {
    const now = Math.floor(Date.now() / 1000);

    for (const [tokenHash, expiresAt] of revokedTokens) {
        if (expiresAt <= now) {
            revokedTokens.delete(tokenHash);
        }
    }
}

export function blacklistToken(token: string, expiresAtEpochSeconds: number) {
    pruneExpiredTokens();
    revokedTokens.set(hashToken(token), expiresAtEpochSeconds);
}

export function isTokenBlacklisted(token: string) {
    pruneExpiredTokens();
    return revokedTokens.has(hashToken(token));
}
