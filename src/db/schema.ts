import {
    pgTable,
    serial,
    text,
    integer,
    numeric,
    timestamp,
    date,
    unique,
    check,
    index,
    foreignKey,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

export const users = pgTable(
    "users",
    {
        id: serial("id").primaryKey(),

        email: text("email").notNull(),

        passwordHash: text("password_hash").notNull(),

        createdAt: timestamp("created_at", { mode: "string" })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        unique("users_email_key").on(table.email),
    ]
);

export const workouts = pgTable(
    "workouts",
    {
        id: serial("id").primaryKey(),

        userId: integer("user_id").notNull(),

        name: text("name").notNull(),

        date: date("date").notNull(),

        notes: text("notes"),

        createdAt: timestamp("created_at", { mode: "string" })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("idx_workouts_user_date").on(
            table.userId,
            table.date.desc()
        ),

        foreignKey({
            columns: [table.userId],
            foreignColumns: [users.id],
            name: "fk_workouts_user",
        }).onDelete("cascade"),
    ]
);

export const exercises = pgTable("exercises", {
    id: serial("id").primaryKey(),

    name: text("name").notNull(),

    muscleGroup: text("muscle_group").notNull(),

    description: text("description"),

    createdAt: timestamp("created_at").default(
        sql`CURRENT_TIMESTAMP`
    ),
});

export const workoutExercises = pgTable(
    "workout_exercises",
    {
        id: serial("id").primaryKey(),

        workoutId: integer("workout_id").notNull(),

        exerciseId: integer("exercise_id").notNull(),

        exerciseOrder: integer("exercise_order").notNull(),
    },
    (table) => [
        unique("workout_exercises_order_unique").on(
            table.workoutId,
            table.exerciseOrder
        ),

        foreignKey({
            columns: [table.workoutId],
            foreignColumns: [workouts.id],
            name: "fk_workout_exercises_workout",
        }).onDelete("cascade"),

        foreignKey({
            columns: [table.exerciseId],
            foreignColumns: [exercises.id],
            name: "fk_workout_exercises_exercise",
        }),
    ]
);

export const sets = pgTable(
    "sets",
    {
        id: serial("id").primaryKey(),

        workoutExerciseId: integer("workout_exercise_id").notNull(),

        setNumber: integer("set_number").notNull(),

        weight: numeric("weight").notNull(),

        reps: integer("reps").notNull(),
    },
    (table) => [
        unique("sets_workout_exercise_set_unique").on(
            table.workoutExerciseId,
            table.setNumber
        ),

        check(
            "sets_reps_positive",
            sql`${table.reps} > 0`
        ),

        check(
            "sets_weight_nonnegative",
            sql`${table.weight} >= 0`
        ),

        check(
            "sets_set_number_positive",
            sql`${table.setNumber} > 0`
        ),

        foreignKey({
            columns: [table.workoutExerciseId],
            foreignColumns: [workoutExercises.id],
            name: "fk_sets_workout_exercise",
        }).onDelete("cascade"),
    ]
);

export const weights = pgTable("weights", {
    id: serial("id").primaryKey(),

    userId: integer("user_id").notNull(),

    weight: numeric("weight").notNull(),

    date: date("date").notNull(),

},
(table) => [
    unique("weights_user_date_unique").on(table.userId, table.date),

    foreignKey({
        columns: [table.userId],
        foreignColumns: [users.id],
        name: "fk_weights_user",
    }).onDelete("cascade"),
]);