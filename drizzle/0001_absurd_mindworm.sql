ALTER TABLE "sets" DROP CONSTRAINT "sets_reps_positive";--> statement-breakpoint
ALTER TABLE "sets" DROP CONSTRAINT "sets_weight_nonnegative";--> statement-breakpoint
ALTER TABLE "sets" DROP CONSTRAINT "sets_set_number_positive";--> statement-breakpoint
DROP INDEX "idx_workouts_user_date";--> statement-breakpoint
CREATE INDEX "idx_workouts_user_date" ON "workouts" USING btree ("user_id","date" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_reps_positive" CHECK ("sets"."reps" > 0);--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_weight_nonnegative" CHECK ("sets"."weight" >= 0);--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_set_number_positive" CHECK ("sets"."set_number" > 0);