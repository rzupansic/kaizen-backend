export const AUTH_COOKIE_NAME = "token";

export const authCookieOptions = {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "strict" as const,
    maxAge: 60 * 60 * 24 * 7,
};
