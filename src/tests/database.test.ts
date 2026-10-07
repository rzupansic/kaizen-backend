import { describe, it, expect } from "vitest";
import { buildApp } from "../app.js";
import { createWorkout } from "../services/workoutService.js";
import { createToken } from "../utils/jwt.js";
import { pool } from "../db.js";


it("deleting a workout also deletes its exercises and sets", async () => {
    const app = buildApp();

    const workout = await createWorkout(
        1,
        "Cascade Test Workout",
        "2026-01-01",
        "Testing cascade",
        [
            {
                exerciseId: 1,
                sets: [
                    { reps: 10, weight: 100 },
                    { reps: 8, weight: 105 },
                ],
            },
            {
                exerciseId: 2,
                sets: [
                    { reps: 10, weight: 50 },
                ],
            },
        ]
    );

    const workoutExerciseResult = await pool.query(
        `
        SELECT id
        FROM workout_exercises
        WHERE workout_id = $1
        `,
        [workout.id]
    );

    expect(workoutExerciseResult.rows).toHaveLength(2);

    const workoutExerciseIds = workoutExerciseResult.rows.map(
        row => row.id
    );

    const setsBeforeDelete = await pool.query(
        `
        SELECT id
        FROM sets
        WHERE workout_exercise_id = ANY($1)
        `,
        [workoutExerciseIds]
    );

    expect(setsBeforeDelete.rows).toHaveLength(3);

    const token = await createToken(1);

    const response = await app.inject({
        method: "DELETE",
        url: `/api/workouts/${workout.id}`,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    expect(response.statusCode).toBe(200);

    const workoutAfterDelete = await pool.query(
        `
        SELECT id
        FROM workouts
        WHERE id = $1
        `,
        [workout.id]
    );

    const workoutExercisesAfterDelete = await pool.query(
        `
        SELECT id
        FROM workout_exercises
        WHERE workout_id = $1
        `,
        [workout.id]
    );

    const setsAfterDelete = await pool.query(
        `
        SELECT id
        FROM sets
        WHERE workout_exercise_id = ANY($1)
        `,
        [workoutExerciseIds]
    );

    expect(workoutAfterDelete.rows).toHaveLength(0);
    expect(workoutExercisesAfterDelete.rows).toHaveLength(0);
    expect(setsAfterDelete.rows).toHaveLength(0);
});
it("does not allow deleting an exercise that is used by a workout", async () => {
    const app = buildApp();

    const workout = await createWorkout(
        1,
        "Exercise FK Test",
        "2026-01-01",
        "Testing exercise foreign key",
        [
            {
                exerciseId: 1,
                sets: [
                    { reps: 10, weight: 100 },
                ],
            },
        ]
    );

    await expect(
        pool.query(
            `
            DELETE FROM exercises
            WHERE id = $1
            `,
            [1]
        )
    ).rejects.toThrow();

    const exerciseResult = await pool.query(
        `
        SELECT id
        FROM exercises
        WHERE id = $1
        `,
        [1]
    );

    expect(exerciseResult.rows).toHaveLength(1);

    await pool.query(
        `
        DELETE FROM workouts
        WHERE id = $1
        `,
        [workout.id]
    );
});