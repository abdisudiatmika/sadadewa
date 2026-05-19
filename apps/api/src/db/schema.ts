import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// Enums
// ============================================================

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "superadmin",
  "staff",
  "bendahara_pemasukan",
  "bendahara_pengeluaran",
  "teacher",
  "student",
]);

export const studentStatusEnum = pgEnum("student_status", [
  "active",
  "inactive",
  "suspended",
  "graduated",
]);

export const feeCategoryEnum = pgEnum("fee_category", [
  "recurring",
  "one_time",
]);

export const feeFrequencyEnum = pgEnum("fee_frequency", [
  "monthly",
  "yearly",
  "once",
]);

export const feeStatusEnum = pgEnum("fee_status", ["active", "inactive"]);

export const billingStatusEnum = pgEnum("billing_status", [
  "paid",
  "overdue",
  "unpaid",
  "not_billed",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "transfer",
  "qris",
]);

export const discountTypeEnum = pgEnum("discount_type", [
  "percentage",
  "fixed",
]);

export const reminderChannelEnum = pgEnum("reminder_channel", [
  "whatsapp",
  "email",
  "sms",
]);

// ============================================================
// Better Auth Tables (managed by better-auth, defined here
// so Drizzle is aware of them for relations & migrations)
// ============================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("staff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// Application Tables
// ============================================================

// ---- Academic Years ----

export const academicYears = pgTable("academic_years", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---- Grades ----

export const grades = pgTable("grades", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 20 }).notNull(),
  level: integer("level").notNull(),
});

// ---- Classes ----

export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  gradeId: uuid("grade_id")
    .notNull()
    .references(() => grades.id, { onDelete: "cascade" }),
  academicYearId: uuid("academic_year_id")
    .notNull()
    .references(() => academicYears.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  homeroomTeacher: varchar("homeroom_teacher", { length: 100 }),
  homeroomTeacherId: text("homeroom_teacher_id").references(() => user.id, {
    onDelete: "set null",
  }),
});

// ---- Students ----

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  studentCode: varchar("student_code", { length: 20 }).notNull().unique(),
  nisn: varchar("nisn", { length: 20 }).notNull().unique(),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  guardianName: varchar("guardian_name", { length: 150 }),
  guardianPhone: varchar("guardian_phone", { length: 20 }),
  guardianEmail: varchar("guardian_email", { length: 150 }),
  status: studentStatusEnum("status").notNull().default("active"),
  enrolledAt: date("enrolled_at"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---- Student Classes (Riwayat Kelas) ----

export const studentClasses = pgTable("student_classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "cascade" }),
  academicYearId: uuid("academic_year_id")
    .notNull()
    .references(() => academicYears.id, { onDelete: "cascade" }),
  status: studentStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---- Fee Templates ----

export const feeTemplates = pgTable("fee_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  category: feeCategoryEnum("category").notNull(),
  frequency: feeFrequencyEnum("frequency").notNull(),
  amount: integer("amount").notNull(),
  targetDescription: varchar("target_description", { length: 150 }),
  targetGradeId: uuid("target_grade_id").references(() => grades.id, {
    onDelete: "set null",
  }),
  academicYearId: uuid("academic_year_id")
    .notNull()
    .references(() => academicYears.id, { onDelete: "cascade" }),
  status: feeStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---- Billing Items ----

export const billingItems = pgTable("billing_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  feeTemplateId: uuid("fee_template_id")
    .notNull()
    .references(() => feeTemplates.id, { onDelete: "cascade" }),
  academicYearId: uuid("academic_year_id")
    .notNull()
    .references(() => academicYears.id, { onDelete: "cascade" }),
  billingMonth: integer("billing_month"),
  billingYear: integer("billing_year").notNull(),
  amount: integer("amount").notNull(),
  status: billingStatusEnum("status").notNull().default("unpaid"),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---- Transactions ----

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionCode: varchar("transaction_code", { length: 30 })
    .notNull()
    .unique(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  cashierId: text("cashier_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  subtotal: integer("subtotal").notNull(),
  discountCode: varchar("discount_code", { length: 50 }),
  discountAmount: integer("discount_amount").notNull().default(0),
  lateFee: integer("late_fee").notNull().default(0),
  total: integer("total").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---- Transaction Items ----

export const transactionItems = pgTable("transaction_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  billingItemId: uuid("billing_item_id")
    .notNull()
    .references(() => billingItems.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
});

// ---- Discount Codes ----

export const discountCodes = pgTable("discount_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  type: discountTypeEnum("type").notNull(),
  value: integer("value").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  validFrom: date("valid_from"),
  validUntil: date("valid_until"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---- Reminders ----

export const reminders = pgTable("reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  sentBy: text("sent_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  channel: reminderChannelEnum("channel").notNull(),
  message: text("message"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// ---- System Settings ----

export const systemSettings = pgTable(
  "system_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 100 }).notNull(),
    value: jsonb("value"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("system_settings_user_key_idx").on(table.userId, table.key)]
);

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  amount: integer("amount").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull().defaultNow(),
  recordedBy: text("recorded_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================
// Relations
// ============================================================

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  students: many(students),
  transactions: many(transactions),
  reminders: many(reminders),
  settings: many(systemSettings),
  expenses: many(expenses),
  managedClass: one(classes, {
    fields: [user.id],
    references: [classes.homeroomTeacherId],
  }),
}));

export const expenseRelations = relations(expenses, ({ one }) => ({
  user: one(user, { fields: [expenses.recordedBy], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const academicYearRelations = relations(academicYears, ({ many }) => ({
  classes: many(classes),
  feeTemplates: many(feeTemplates),
  billingItems: many(billingItems),
  studentClasses: many(studentClasses),
}));

export const gradeRelations = relations(grades, ({ many }) => ({
  classes: many(classes),
  feeTemplates: many(feeTemplates),
}));

export const classRelations = relations(classes, ({ one, many }) => ({
  grade: one(grades, { fields: [classes.gradeId], references: [grades.id] }),
  academicYear: one(academicYears, {
    fields: [classes.academicYearId],
    references: [academicYears.id],
  }),
  homeroomTeacher: one(user, {
    fields: [classes.homeroomTeacherId],
    references: [user.id],
  }),
  studentClasses: many(studentClasses),
}));

export const studentRelations = relations(students, ({ one, many }) => ({
  user: one(user, { fields: [students.userId], references: [user.id] }),
  studentClasses: many(studentClasses),
  billingItems: many(billingItems),
  transactions: many(transactions),
  reminders: many(reminders),
}));

export const studentClassRelations = relations(studentClasses, ({ one }) => ({
  student: one(students, {
    fields: [studentClasses.studentId],
    references: [students.id],
  }),
  class: one(classes, {
    fields: [studentClasses.classId],
    references: [classes.id],
  }),
  academicYear: one(academicYears, {
    fields: [studentClasses.academicYearId],
    references: [academicYears.id],
  }),
}));

export const feeTemplateRelations = relations(
  feeTemplates,
  ({ one, many }) => ({
    targetGrade: one(grades, {
      fields: [feeTemplates.targetGradeId],
      references: [grades.id],
    }),
    academicYear: one(academicYears, {
      fields: [feeTemplates.academicYearId],
      references: [academicYears.id],
    }),
    billingItems: many(billingItems),
  })
);

export const billingItemRelations = relations(
  billingItems,
  ({ one, many }) => ({
    student: one(students, {
      fields: [billingItems.studentId],
      references: [students.id],
    }),
    feeTemplate: one(feeTemplates, {
      fields: [billingItems.feeTemplateId],
      references: [feeTemplates.id],
    }),
    academicYear: one(academicYears, {
      fields: [billingItems.academicYearId],
      references: [academicYears.id],
    }),
    transactionItems: many(transactionItems),
  })
);

export const transactionRelations = relations(
  transactions,
  ({ one, many }) => ({
    student: one(students, {
      fields: [transactions.studentId],
      references: [students.id],
    }),
    cashier: one(user, {
      fields: [transactions.cashierId],
      references: [user.id],
    }),
    items: many(transactionItems),
  })
);

export const transactionItemRelations = relations(
  transactionItems,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionItems.transactionId],
      references: [transactions.id],
    }),
    billingItem: one(billingItems, {
      fields: [transactionItems.billingItemId],
      references: [billingItems.id],
    }),
  })
);

export const reminderRelations = relations(reminders, ({ one }) => ({
  student: one(students, {
    fields: [reminders.studentId],
    references: [students.id],
  }),
  sender: one(user, {
    fields: [reminders.sentBy],
    references: [user.id],
  }),
}));

export const systemSettingRelations = relations(systemSettings, ({ one }) => ({
  user: one(user, {
    fields: [systemSettings.userId],
    references: [user.id],
  }),
}));
