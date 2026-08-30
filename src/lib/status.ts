export type LedgerStatus = "paid" | "pending" | "partial" | "overdue" | "waived";

export const STATUS_LABEL: Record<LedgerStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  partial: "Partially Paid",
  overdue: "Overdue",
  waived: "Waived",
};

/**
 * Mirrors the spec's status rules: Paid when payments cover total_due;
 * otherwise Pending/Overdue by the 10th-of-month due day, or Partial when
 * something has been paid but not enough. A waiver adjustment that fully
 * offsets the balance takes priority — that's a deliberate owner decision,
 * not a payment.
 */
export function computeLedgerStatus(args: {
  totalDue: number;
  paidTotal: number;
  hasWaiver: boolean;
  dueDate: Date;
  today?: Date;
}): { status: LedgerStatus; balance: number; isOverdueBalance: boolean } {
  const { totalDue, paidTotal, hasWaiver, dueDate } = args;
  const today = args.today ?? new Date();
  const balance = Math.round((totalDue - paidTotal) * 100) / 100;
  const pastDue = today > dueDate;

  if (balance <= 0) {
    if (hasWaiver) return { status: "waived", balance, isOverdueBalance: false };
    return { status: "paid", balance: 0, isOverdueBalance: false };
  }

  if (paidTotal > 0) {
    return { status: "partial", balance, isOverdueBalance: pastDue };
  }

  return { status: pastDue ? "overdue" : "pending", balance, isOverdueBalance: pastDue };
}

export function dueDateFor(year: number, month: number, rentDueDay: number): Date {
  return new Date(year, month - 1, rentDueDay, 23, 59, 59);
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
