import { pool } from "../db.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export async function getWorkouts(userId: number) {
    const result = await pool.query(`
        SELECT
            w.id,
            w.name,
            w.date,
            w.notes,
            w.created_at
        FROM workouts w
        WHERE w.user_id = $1
        ORDER BY w.date DESC;
    `, [userId]);
    return result.rows;
}

export async function getWorkoutById(id: number, userId: number) {
    const result = await pool.query(`
        SELECT
            w.id AS workout_id,
            w.name AS workout_name,
            w.date,
            w.notes,
            e.id AS exercise_id,
            e.name AS exercise_name,
            e.muscle_group,
            we.exercise_order,

            s.set_number,
            s.weight,
            s.reps

        FROM workouts w

        JOIN workout_exercises we
            ON w.id = we.workout_id

        JOIN exercises e
            ON we.exercise_id = e.id

        JOIN sets s
            ON we.id = s.workout_exercise_id

        WHERE w.id = $1
        AND w.user_id = $2

        ORDER BY
            we.exercise_order,
            s.set_number;
    `, [id, userId]);

    if (result.rows.length === 0) {
        throw new NotFoundError("Workout not found");
    }

    const workout = result.rows[0];
    const exercises: { exerciseId: number, exerciseName: string, muscleGroup: string, sets: { setNumber: number, weight: number, reps: number }[] }[] = [];

    for (const row of result.rows) {
        const existingExercise = exercises.find(
            exercise => exercise.exerciseId === row.exercise_id
        );

        if (!existingExercise) {
            exercises.push({
                exerciseId: row.exercise_id,
                exerciseName: row.exercise_name,
                muscleGroup: row.muscle_group,
                sets: [
                    {
                        setNumber: row.set_number,
                        weight: Number(row.weight),
                        reps: row.reps,
                    }
                ],
            });
        } else {
            existingExercise.sets.push({
                setNumber: row.set_number,
                weight: Number(row.weight),
                reps: row.reps,
            });
        }
    }
    return {
        id: workout.workout_id,
        name: workout.workout_name,
        date: workout.date,
        notes: workout.notes,
        exercises,
    };
}

export async function deleteWorkout(id: number, userId: number) {
    const result = await pool.query(`
        DELETE FROM workouts
        WHERE id = $1 AND user_id = $2
        RETURNING *;
    `, [id, userId]);

    if (result.rowCount === 0) {
        throw new NotFoundError("Workout not found");
    }

    return result.rows[0];
}

export async function createWorkout(userId: number, name: string, date: string, notes: string | undefined, exercises: { exerciseId: number, sets: { reps: number, weight: number }[] }[]) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const exerciseIds = exercises.map(exercise => exercise.exerciseId);
        const exerciseResult = await client.query(`
            SELECT id FROM exercises
            WHERE id = ANY($1)
        `, [exerciseIds]);
        if (exerciseResult.rowCount !== exerciseIds.length) {
            throw new NotFoundError("One or more exercises not found");
        }
        

        const workoutResult = await client.query(`
            INSERT INTO workouts (user_id, name, date, notes)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `, [userId, name, date, notes]);
        const workout = workoutResult.rows[0];
        const workoutId = workout.id;

        for (const [exerciseIndex, exercise] of exercises.entries()) {
            const exerciseResult = await client.query(`
                INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order)
                VALUES ($1, $2, $3)
                RETURNING *;
            `, [workoutId, exercise.exerciseId, exerciseIndex + 1]);
            const workoutExerciseId = exerciseResult.rows[0].id;

            for (const [setIndex, set] of exercise.sets.entries()) {
                await client.query(`
                    INSERT INTO sets (workout_exercise_id, reps, weight, set_number)
                    VALUES ($1, $2, $3, $4)
                `, [workoutExerciseId, set.reps, set.weight, setIndex + 1]);
            }
        }

        await client.query("COMMIT");
        return workout;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

export async function updateWorkout(id: number, userId: number, name?: string, date?: string, notes?: string) {
    const updateValues = [];
    const updateQuery = [];
    if (name !== undefined) {
        updateValues.push(name);
        updateQuery.push("name = $" + updateValues.length);
    }
    if (date !== undefined) {
        updateValues.push(date);
        updateQuery.push("date = $" + updateValues.length);
    }
    if (notes !== undefined) {
        updateValues.push(notes);
        updateQuery.push("notes = $" + updateValues.length);
    }
    if (updateQuery.length === 0) {
        throw new Error("No fields to update");
    }
    const result = await pool.query(`
        UPDATE workouts
        SET ${updateQuery.join(", ")}
        WHERE id = $${updateValues.length + 1} AND user_id = $${updateValues.length + 2}
        RETURNING *;
    `, [...updateValues, id, userId]);
    if (result.rowCount === 0) {
        throw new NotFoundError("Workout not found");
    }
    return result.rows[0];
}
