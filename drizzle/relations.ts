import { relations } from "drizzle-orm/relations";
import { workoutExercises, sets, users, workouts, exercises } from "./schema";

export const setsRelations = relations(sets, ({one}) => ({
	workoutExercise: one(workoutExercises, {
		fields: [sets.workoutExerciseId],
		references: [workoutExercises.id]
	}),
}));

export const workoutExercisesRelations = relations(workoutExercises, ({one, many}) => ({
	sets: many(sets),
	workout: one(workouts, {
		fields: [workoutExercises.workoutId],
		references: [workouts.id]
	}),
	exercise: one(exercises, {
		fields: [workoutExercises.exerciseId],
		references: [exercises.id]
	}),
}));

export const workoutsRelations = relations(workouts, ({one, many}) => ({
	user: one(users, {
		fields: [workouts.userId],
		references: [users.id]
	}),
	workoutExercises: many(workoutExercises),
}));

export const usersRelations = relations(users, ({many}) => ({
	workouts: many(workouts),
}));

export const exercisesRelations = relations(exercises, ({many}) => ({
	workoutExercises: many(workoutExercises),
}));