CREATE TYPE "public"."payment_proof_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."billing_status" ADD VALUE 'partially_paid' BEFORE 'overdue';--> statement-breakpoint
CREATE TABLE "payment_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_name" varchar(150) NOT NULL,
	"class_name" varchar(50) NOT NULL,
	"account_owner" varchar(150) NOT NULL,
	"amount" integer NOT NULL,
	"file_url" text NOT NULL,
	"status" "payment_proof_status" DEFAULT 'pending' NOT NULL,
	"verified_by" text,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_items" ADD COLUMN "paid_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;