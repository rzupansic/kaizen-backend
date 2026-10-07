ALTER TABLE "weights" ADD COLUMN "date" date;
UPDATE "weights" SET "date" = "created_at"::date;
ALTER TABLE "weights" ALTER COLUMN "date" SET NOT NULL;
ALTER TABLE "weights" DROP COLUMN "created_at";
ALTER TABLE "weights" ADD CONSTRAINT "weights_user_date_unique" UNIQUE("user_id", "date");