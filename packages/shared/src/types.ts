// ============================================================
// Shared type definitions for the EduPay Pro monorepo.
// Used by both @edupay/api and @edupay/dashboard.
// ============================================================

// ---- Enums ----

export type UserRole = "admin" | "staff" | "student";

export type StudentStatus = "active" | "inactive" | "suspended" | "graduated";

export type FeeCategory = "recurring" | "one_time";

export type FeeFrequency = "monthly" | "yearly" | "once";

export type FeeStatus = "active" | "inactive";

export type BillingStatus = "paid" | "overdue" | "unpaid" | "not_billed";

export type PaymentMethod = "cash" | "transfer" | "qris";

export type DiscountType = "percentage" | "fixed";

export type ReminderChannel = "whatsapp" | "email" | "sms";

// ---- API Response Wrapper ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

// ---- Dashboard Stats ----

export interface DashboardStats {
  totalActiveStudents: number;
  totalArrears: number;
  unpaidThisMonth: number;
  monthlyRevenue: number;
}

export interface RevenueDataPoint {
  month: string;
  year: number;
  amount: number;
}

export interface ArrearsEntry {
  studentId: string;
  studentName: string;
  grade: string;
  nis: string;
  totalArrears: number;
}

// ---- Checkout ----

export interface CheckoutRequest {
  studentId: string;
  billingItemIds: string[];
  discountCode?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CheckoutResult {
  transactionId: string;
  transactionCode: string;
  subtotal: number;
  discountAmount: number;
  lateFee: number;
  total: number;
  itemCount: number;
  paidAt: string;
}

// ---- Report Filters ----

export interface ReportFilters {
  academicYearId?: string;
  gradeId?: string;
  classId?: string;
  feeCategory?: FeeCategory;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportSummary {
  totalRevenue: number;
  collectionRate: number;
  totalOutstanding: number;
  revenueChangePercent: number;
  outstandingChangePercent: number;
}

export interface RevenueByComponent {
  category: string;
  amount: number;
  percentage: number;
}

export interface DelinquencyEntry {
  studentId: string;
  studentName: string;
  className: string;
  monthsOverdue: number;
  totalArrears: number;
  initials: string;
}
