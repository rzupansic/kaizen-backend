import bcrypt from "bcrypt";
import { pool } from "../db.js";


export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hashedPassword: string) {
    return await bcrypt.compare(password, hashedPassword);
}

export async function registerUser(email: string, password: string) {
    const hashedPassword = await hashPassword(password);
    try {
    const result = await pool.query(`
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING id, email, created_at
    `, [email, hashedPassword]);

    return result.rows[0];

    } catch (error) {
    if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
    ) {
        throw new Error("Email already exists");
    }

    throw error;
}
}

export async function loginUser(email: string, password: string) {
    const user = await pool.query(`
        SELECT id, email, password_hash
        FROM users
        WHERE email = $1
    `, [email]);

    if (user.rows.length === 0) {
        throw new Error("Invalid credentials");
    }

    const isPasswordValid = await comparePassword(
        password,
        user.rows[0].password_hash
    );

    if (!isPasswordValid) {
        throw new Error("Invalid credentials");
    }

    return {
        id: user.rows[0].id,
        email: user.rows[0].email,
    };
}