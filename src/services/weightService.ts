import { pool } from "../db.js";
import { NotFoundError } from "../errors/NotFoundError.js";

function mapWeight(row: {
    id: number;
    user_id: number;
    weight: string | number;
    created_at: string;
}) {
    return {
        ...row,
        weight: Number(row.weight),
    };
}

export async function getWeights(userId: number) {
    const result = await pool.query(`
        SELECT * FROM weights WHERE user_id = $1;
    `, [userId]);
    return result.rows.map(mapWeight);
}

export async function getWeightById(userId: number, id: number) {
    const result = await pool.query(`
        SELECT * FROM weights WHERE id = $1 AND user_id = $2;
    `, [id, userId]);
    if (result.rowCount === 0) {
        throw new NotFoundError("Weight not found");
    }
    return mapWeight(result.rows[0]);
}

export async function createWeight(userId: number, weight: number) {
    const result = await pool.query(`
        INSERT INTO weights (user_id, weight) VALUES ($1, $2) RETURNING *;
    `, [userId, weight]);
    return mapWeight(result.rows[0]);
}

export async function deleteWeight(userId: number, id: number) {
    const result = await pool.query(`
        DELETE FROM weights WHERE id = $1 AND user_id = $2 RETURNING *;
    `, [id, userId]);
    if (result.rowCount === 0) {
        throw new NotFoundError("Weight not found");
    }
    return mapWeight(result.rows[0]);
}

export async function updateWeight(userId: number, id: number, weight: number | undefined) {
    let query = `
        UPDATE weights SET
    `;
    if (weight !== undefined) {
        query += ` weight = $1`;
    }
    query += ` WHERE id = $2 AND user_id = $3 RETURNING *`;
    const result = await pool.query(query, [weight, id, userId]);
    if (result.rowCount === 0) {
        throw new NotFoundError("Weight not found");
    }
    return mapWeight(result.rows[0]);
}