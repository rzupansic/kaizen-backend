import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildApp } from "./app.js";
import { createToken } from "./utils/jwt.js";
import { createWorkout, getWorkoutById } from "./services/workoutService.js";
import { createWeight } from "./services/weightService.js";
import { pool } from "./db.js";

describe("Health endpoint", () => {
    it("returns a healthy response", async () => {
        const app = buildApp();

        const response = await app.inject({
            method: "GET",
            url: "/api/health",
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            status: "ok",
            message: "Kaizen API is running",
        });
    });
});

describe("Workout authorization", () => {
    it("rejects unauthenticated requests", async () => {
        const app = buildApp();

        const response = await app.inject({
            method: "GET",
            url: "/api/workouts",
        });

        expect(response.statusCode).toBe(401);
        expect(response.json()).toEqual({
            status: "error",
            message: "Authorization header required",
        });
    });
});

describe("Ownership Tests", () => {
    let ownerId: number;
    let otherUserId: number;

    beforeEach(async () => {
        const ownerResult = await pool.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id`,
            [`test-owner-${Date.now()}@example.com`, "test-password"]
        );

        ownerId = ownerResult.rows[0].id;

        const otherUserResult = await pool.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id`,
            [`test-other-${Date.now()}@example.com`, "test-password"]
        );

        otherUserId = otherUserResult.rows[0].id;
    });


    afterEach(async () => {
        await pool.query(
            `DELETE FROM users WHERE id = $1`,
            [ownerId]
        );
        await pool.query(
            `DELETE FROM users WHERE id = $1`,
            [otherUserId]
        );
    });

    it("rejects requests for other users' workouts", async () => {
        const app = buildApp();

        const workout = await createWorkout(1, "Test Workout", "2026-01-01", "Test notes", [{ exerciseId: 1, sets: [{ reps: 10, weight: 100 }] }]);
        
        const otherUserToken = await createToken(otherUserId);
        const response = await app.inject({
            method: "GET",
            url: `/api/workouts/${workout.id}`,
            headers: {
                Authorization: `Bearer ${otherUserToken}`,
            },
        });
        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({
            status: "error",
            message: "Workout not found",
        });
    });

    it("allows users to access their own workouts", async () => {
        const app = buildApp();
    
        const workout = await createWorkout(
            ownerId,
            "Owner Test Workout",
            "2026-01-01",
            "Test notes",
            [
                {
                    exerciseId: 1,
                    sets: [
                        {
                            reps: 10,
                            weight: 100,
                        },
                    ],
                },
            ]
        );
    
        const ownerToken = await createToken(ownerId);
    
        const response = await app.inject({
            method: "GET",
            url: `/api/workouts/${workout.id}`,
            headers: {
                Authorization: `Bearer ${ownerToken}`,
            },
        });
    
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            status: "ok",
            workout: {
                id: workout.id,
                name: "Owner Test Workout",
                date: "2026-01-01T05:00:00.000Z",
                notes: "Test notes",
                exercises: [
                    {
                        exerciseId: 1,
                        exerciseName: "Bench Press",
                        muscleGroup: "Chest",
                        sets: [
                            {
                                setNumber: 1,
                                weight: 100,
                                reps: 10,
                            },
                        ],
                    },
                ],
            },
        });
    });
    it("allows users to update their own workouts", async () => {
        const app = buildApp();

        const workout = await createWorkout(ownerId, "Test Workout", "2026-01-01", "Test notes", [{ exerciseId: 1, sets: [{ reps: 10, weight: 100 }] }]);

        const userToken = await createToken(ownerId);
        const response = await app.inject({
            method: "PATCH",
            url: `/api/workouts/${workout.id}`,
            headers: {
                Authorization: `Bearer ${userToken}`,
            },
            body: {
                name: "Updated Test Workout",
                date: "2026-01-02",
                notes: "Updated test notes",
            },
        });
        
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            status: "ok",
            message: "Workout updated successfully",
            updatedWorkout: {
                created_at: expect.any(String),
                date: "2026-01-02T05:00:00.000Z",
                id: workout.id,
                name: "Updated Test Workout",
                notes: "Updated test notes",
                user_id: ownerId,
            },
        });
    });
    it("rejects other users from updating a workout", async () => {
        const app = buildApp();
    
        const workout = await createWorkout(
            ownerId,
            "Protected Workout",
            "2026-01-01",
            "Original notes",
            [
                {
                    exerciseId: 1,
                    sets: [
                        {
                            reps: 10,
                            weight: 100,
                        },
                    ],
                },
            ]
        );
    
        const otherUserToken = await createToken(otherUserId);
    
        const response = await app.inject({
            method: "PATCH",
            url: `/api/workouts/${workout.id}`,
            headers: {
                Authorization: `Bearer ${otherUserToken}`,
            },
            body: {
                name: "Hacked Workout",
                notes: "Unauthorized update",
            },
        });
    
        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({
            status: "error",
            message: "Workout not found",
        });
    });
    it("allows users to delete their own workouts", async () => {
        const app = buildApp();
    
        const workout = await createWorkout(
            ownerId,
            "Delete Test Workout",
            "2026-01-01",
            "Delete me",
            [
                {
                    exerciseId: 1,
                    sets: [
                        {
                            reps: 10,
                            weight: 100,
                        },
                    ],
                },
            ]
        );
    
        const ownerToken = await createToken(ownerId);
    
        const response = await app.inject({
            method: "DELETE",
            url: `/api/workouts/${workout.id}`,
            headers: {
                Authorization: `Bearer ${ownerToken}`,
            },
        });
    
        expect(response.statusCode).toBe(200);
    
        expect(response.json()).toEqual({
            status: "ok",
            message: "Workout deleted successfully",
            deletedWorkout: {
                id: workout.id,
                user_id: workout.user_id,
                name: workout.name,
                date: workout.date.toISOString(),
                created_at: workout.created_at.toISOString(),
                notes: workout.notes,
            },
        });
    });
    it("rejects other users from deleting a workout", async () => {
        const app = buildApp();
    
        const workout = await createWorkout(
            ownerId,
            "Protected Delete Workout",
            "2026-01-01",
            "Do not delete",
            [
                {
                    exerciseId: 1,
                    sets: [
                        {
                            reps: 10,
                            weight: 100,
                        },
                    ],
                },
            ]
        );
    
        const otherUserToken = await createToken(otherUserId);
    
        const response = await app.inject({
            method: "DELETE",
            url: `/api/workouts/${workout.id}`,
            headers: {
                Authorization: `Bearer ${otherUserToken}`,
            },
        });
    
        expect(response.statusCode).toBe(404);
    
        expect(response.json()).toEqual({
            status: "error",
            message: "Workout not found",
        });
    });
});

describe("Workout validation", () => {

    let ownerId: number;
    let otherUserId: number;

    beforeEach(async () => {
        const ownerResult = await pool.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id`,
            [`test-owner-${Date.now()}@example.com`, "test-password"]
        );
        ownerId = ownerResult.rows[0].id;

        const otherUserResult = await pool.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id`,
            [`test-other-${Date.now()}@example.com`, "test-password"]
        );
        otherUserId = otherUserResult.rows[0].id;
    });

    afterEach(async () => {
        await pool.query(
            `DELETE FROM users WHERE id = $1`,
            [ownerId]
        );
        await pool.query(
            `DELETE FROM users WHERE id = $1`,
            [otherUserId]
        );
    });

    it("rejects a workout with a nonexistent exercise", async () => {
        const app = buildApp();

        const token = await createToken(ownerId);

        const response = await app.inject({
            method: "POST",
            url: "/api/workouts",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            payload: {
                name: "Invalid Exercise Test",
                date: "2026-01-01",
                notes: "Should fail",
                exercises: [
                    {
                        exerciseId: 99999,
                        sets: [
                            {
                                reps: 10,
                                weight: 100,
                            },
                        ],
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({
            status: "error",
            message: "One or more exercises not found",
        });
    });
    it("rejects duplicate exercises in a workout", async () => {
        const app = buildApp();
    
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "POST",
            url: "/api/workouts",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            payload: {
                name: "Duplicate Exercise Test",
                date: "2026-01-01",
                notes: "Should fail",
                exercises: [
                    {
                        exerciseId: 1,
                        sets: [
                            {
                                reps: 10,
                                weight: 100,
                            },
                        ],
                    },
                    {
                        exerciseId: 1,
                        sets: [
                            {
                                reps: 8,
                                weight: 100,
                            },
                        ],
                    },
                ],
            },
        });
    
        const body = response.json();

        expect(response.statusCode).toBe(400);
        expect(body.status).toBe("error");
        expect(body.message).toBe("Validation failed");
        expect(body.errors).toHaveLength(1);
        expect(body.errors[0].path).toEqual(["exercises"]);
        expect(body.errors[0].message).toBe(
            "An exercise cannot be added more than once to a workout"
        );
    });
    it("rejects sets with zero reps", async () => {
        const app = buildApp();
    
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "POST",
            url: "/api/workouts",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            payload: {
                name: "Invalid Reps Test",
                date: "2026-01-01",
                exercises: [
                    {
                        exerciseId: 1,
                        sets: [
                            {
                                reps: 0,
                                weight: 100,
                            },
                        ],
                    },
                ],
            },
        });
    
        const body = response.json();

        expect(response.statusCode).toBe(400);
        expect(body.status).toBe("error");
        expect(body.message).toBe("Validation failed");
        expect(body.errors).toHaveLength(1);
        expect(body.errors[0].path).toEqual([
            "exercises",
            0,
            "sets",
            0,
            "reps",
        ]);
        expect(body.errors[0].message).toBe(
            "Too small: expected number to be >0"
        );
    });
    it("rejects sets with negative weight", async () => {
        const app = buildApp();
    
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "POST",
            url: "/api/workouts",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            payload: {
                name: "Invalid Weight Test",
                date: "2026-01-01",
                exercises: [
                    {
                        exerciseId: 1,
                        sets: [
                            {
                                reps: 10,
                                weight: -5,
                            },
                        ],
                    },
                ],
            },
        });
    
        const body = response.json();

        expect(response.statusCode).toBe(400);
        expect(body.status).toBe("error");
        expect(body.message).toBe("Validation failed");
        expect(body.errors).toHaveLength(1);
        expect(body.errors[0].path).toEqual([
            "exercises",
            0,
            "sets",
            0,
            "weight",
        ]);
        expect(body.errors[0].message).toBe(
            "Too small: expected number to be >=0"
        );
    });
    it("does not create a workout when an exercise does not exist", async () => {
        const app = buildApp();
    
        await expect(
            createWorkout(
                1,
                "Transaction Test",
                "2026-01-01",
                "Should rollback",
                [
                    {
                        exerciseId: 1,
                        sets: [
                            {
                                reps: 10,
                                weight: 100,
                            },
                        ],
                    },
                    {
                        exerciseId: 99999,
                        sets: [
                            {
                                reps: 10,
                                weight: 100,
                            },
                        ],
                    },
                ]
            )
        ).rejects.toThrow("One or more exercises not found");

        const result = await pool.query(
            `SELECT id FROM workouts WHERE user_id = $1 AND name = $2`,
            [1, "Transaction Test"]
        );

        expect(result.rows.length).toBe(0);

    });
    it("rejects an invalid workout ID", async () => {
        const app = buildApp();
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "GET",
            url: "/api/workouts/abc",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    
        expect(response.statusCode).toBe(400);
    
        const body = response.json();
    
        expect(body.status).toBe("error");
        expect(body.message).toBe("Validation failed");
        expect(body.errors).toHaveLength(1);
        expect(body.errors[0].path).toEqual(["id"]);
    });
    it("rejects an invalid workout ID when deleting", async () => {
        const app = buildApp();
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "DELETE",
            url: "/api/workouts/abc",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    
        expect(response.statusCode).toBe(400);
    
        const body = response.json();
    
        expect(body.status).toBe("error");
        expect(body.message).toBe("Validation failed");
        expect(body.errors).toHaveLength(1);
        expect(body.errors[0].path).toEqual(["id"]);
    });
});

describe("Weight validation", () => {
    let ownerId: number;
    let otherUserId: number;

    beforeEach(async () => {
        const ownerResult = await pool.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id`,
            [`test-owner-${Date.now()}@example.com`, "test-password"]
        );
        ownerId = ownerResult.rows[0].id;

        const otherUserResult = await pool.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id`,
            [`test-other-${Date.now()}@example.com`, "test-password"]
        );
        otherUserId = otherUserResult.rows[0].id;
    });
    afterEach(async () => {
        await pool.query(
            `DELETE FROM users WHERE id = $1`,
            [ownerId]
        );
        await pool.query(
            `DELETE FROM users WHERE id = $1`,
            [otherUserId]
        );
    });
    it("rejects an invalid weight ID", async () => {
        const app = buildApp();
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "GET",
            url: "/api/weights/abc",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    });
    it("rejects an invalid weight ID when deleting", async () => {
        const app = buildApp();
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "DELETE",
            url: "/api/weights/abc",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    });
    it("rejects an invalid weight ID when updating", async () => {
        const app = buildApp();
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "PUT",
            url: "/api/weights/abc",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    });
    it("rejects a weight with a negative value", async () => {
        const app = buildApp();
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "POST",
            url: "/api/weights",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            payload: {
                weight: -1,
            },
        });
        const body = response.json();

        expect(response.statusCode).toBe(400);
        expect(body.status).toBe("error");
        expect(body.message).toBe("Validation failed");
        expect(body.errors).toHaveLength(1);
        expect(body.errors[0].path).toEqual(["weight"]);
        expect(body.errors[0].message).toBe(
            "Too small: expected number to be >=0"
        );
    });
    it("rejects an invalid weight ID", async () => {
        const app = buildApp();
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "GET",
            url: "/api/weights/abc",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    });
    it("rejects an invalid weight ID when deleting", async () => {
        const app = buildApp();
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "DELETE",
            url: "/api/weights/abc",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    });

    it("rejects when owner tries to access other user's weights", async () => {
        const app = buildApp();
        const otherUserWeight = await createWeight(otherUserId, 180);
        const token = await createToken(ownerId);
    
        const response = await app.inject({
            method: "GET",
            url: `/api/weights/${otherUserWeight.id}`,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({
            status: "error",
            message: "Weight not found",
        });
    });
    it("allows owner to access their own weights", async () => {
        const app = buildApp();
        const token = await createToken(ownerId);
        const response = await app.inject({
            method: "GET",
            url: "/api/weights",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            status: "ok",
            message: "Weights fetched successfully",
            weights: [],
        });
    });
    it("allows owner to create a weight", async () => {
        const app = buildApp();
        const token = await createToken(ownerId);
        const response = await app.inject({
            method: "POST",
            url: "/api/weights",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            payload: {
                weight: 100,
            },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({
            status: "ok",
            message: "Weight created successfully",
            weight: {
                id: expect.any(Number),
                user_id: ownerId,
                weight: 100,
                created_at: expect.any(String),
            },
        });
    });
});

describe("HttpOnly auth cookie", () => {
    it("sets the login cookie and rejects it after logout", async () => {
        const app = buildApp();
        const email = `cookie-${Date.now()}@example.com`;
        const password = "password123";

        const registerResponse = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: { email, password },
        });
        expect(registerResponse.statusCode).toBe(201);
        const userId = registerResponse.json().user.id;

        try {
            const loginResponse = await app.inject({
                method: "POST",
                url: "/api/auth/login",
                payload: { email, password },
            });

            expect(loginResponse.statusCode).toBe(200);
            const setCookie = String(loginResponse.headers["set-cookie"]);
            expect(setCookie).toContain("token=");
            expect(setCookie).toContain("HttpOnly");
            expect(setCookie).toContain("Secure");
            expect(setCookie).toContain("SameSite=Strict");

            const sessionPair = setCookie.split(";")[0];

            const authedResponse = await app.inject({
                method: "GET",
                url: "/api/workouts",
                headers: { cookie: sessionPair },
            });
            expect(authedResponse.statusCode).toBe(200);

            const logoutResponse = await app.inject({
                method: "POST",
                url: "/api/auth/logout",
                headers: { cookie: sessionPair },
            });
            expect(logoutResponse.statusCode).toBe(200);

            const afterLogout = await app.inject({
                method: "GET",
                url: "/api/workouts",
                headers: { cookie: sessionPair },
            });
            expect(afterLogout.statusCode).toBe(401);
        } finally {
            await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
        }
    });
});