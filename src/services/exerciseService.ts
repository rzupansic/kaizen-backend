import { pool } from "../db.js";

export async function getExercises(muscleGroup?: string) {
    if (!muscleGroup) {
        const result = await pool.query(`
            SELECT
                id,
                name,
                muscle_group,
                description,
                created_at
            FROM exercises
            ORDER BY name ASC;
        `);

        return result.rows;
    }

    const result = await pool.query(`
        SELECT
            id,
            name,
            muscle_group,
            description,
            created_at
        FROM exercises
        WHERE muscle_group = $1
        ORDER BY name ASC;
    `, [muscleGroup]);

    return result.rows;
}