ALTER TYPE "public"."payment_method" ADD VALUE 'transfer_bri' BEFORE 'qris';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'transfer_bukopin' BEFORE 'qris';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'transfer_other' BEFORE 'qris';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'balance';--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"income_code" varchar(30) NOT NULL,
	"amount" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"source" varchar(150) NOT NULL,
	"description" text,
	"payment_method" "payment_method" DEFAULT 'cash' NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"recorded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "incomes_income_code_unique" UNIQUE("income_code")
);
--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD COLUMN "destination_bank" varchar(50);--> statement-breakpoint
ALTER TABLE "payment_proofs" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;