import { pgTable, foreignKey, unique, check, serial, integer, numeric, text, timestamp, index, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const sets = pgTable("sets", {
	id: serial().primaryKey().notNull(),
	workoutExerciseId: integer("workout_exercise_id").notNull(),
	setNumber: integer("set_number").notNull(),
	weight: numeric().notNull(),
	reps: integer().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.workoutExerciseId],
			foreignColumns: [workoutExercises.id],
			name: "fk_sets_workout_exercise"
		}).onDelete("cascade"),
	unique("sets_workout_exercise_set_unique").on(table.workoutExerciseId, table.setNumber),
	check("sets_reps_positive", sql`reps > 0`),
	check("sets_weight_nonnegative", sql`weight >= (0)::numeric`),
	check("sets_set_number_positive", sql`set_number > 0`),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_key").on(table.email),
]);

export const workouts = pgTable("workouts", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	name: text().notNull(),
	date: date().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_workouts_user_date").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.date.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fk_workouts_user"
		}).onDelete("cascade"),
]);

export const workoutExercises = pgTable("workout_exercises", {
	id: serial().primaryKey().notNull(),
	workoutId: integer("workout_id").notNull(),
	exerciseId: integer("exercise_id").notNull(),
	exerciseOrder: integer("exercise_order").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.workoutId],
			foreignColumns: [workouts.id],
			name: "fk_workout_exercises_workout"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.exerciseId],
			foreignColumns: [exercises.id],
			name: "fk_workout_exercises_exercise"
		}),
	unique("workout_exercises_order_unique").on(table.workoutId, table.exerciseOrder),
]);

export const exercises = pgTable("exercises", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	muscleGroup: text("muscle_group").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});
