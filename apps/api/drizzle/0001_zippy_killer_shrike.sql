ALTER TYPE "public"."user_role" ADD VALUE 'superadmin' BEFORE 'staff';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'bendahara_pemasukan' BEFORE 'student';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'bendahara_pengeluaran' BEFORE 'student';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'teacher' BEFORE 'student';--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text,
	"date" timestamp DEFAULT now() NOT NULL,
	"recorded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"status" "student_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "students" DROP CONSTRAINT "students_class_id_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "homeroom_teacher_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_homeroom_teacher_id_user_id_fk" FOREIGN KEY ("homeroom_teacher_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN "class_id";