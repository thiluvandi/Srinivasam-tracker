import { createAdminClient } from "@/lib/supabase/admin";
import { computeLedgerStatus, dueDateFor, type LedgerStatus } from "@/lib/status";

export type LedgerPaymentRow = {
  id: string;
  amount: number;
  transactionDate: string | null;
  paymentMethod: string | null;
  status: string;
  source: string;
};

export type LedgerAdjustmentRow = {
  id: string;
  amount: number;
  type: string;
  reason: string;
  createdAt: string;
};

export type LedgerDetail = {
  id: string;
  year: number;
  month: number;
  unitName: string;
  tenantId: string;
  tenantName: string;
  baseRent: number;
  waterCharge: number;
  adjustmentsTotal: number;
  totalDue: number;
  paidTotal: number;
  balance: number;
  status: LedgerStatus;
  isOverdueBalance: boolean;
  rentDueDay: number;
  payments: LedgerPaymentRow[];
  adjustments: LedgerAdjustmentRow[];
};

export async function getLedgerDetail(ledgerId: string): Promise<LedgerDetail | null> {
  const supabase = createAdminClient();

  const { data: ledger, error: ledgerError } = await supabase
    .from("monthly_ledgers")
    .select("id, year, month, base_rent, water_charge, adjustments_total, total_due, rent_due_day, tenancy_id, units(name)")
    .eq("id", ledgerId)
    .maybeSingle();
  if (ledgerError) throw ledgerError;
  if (!ledger) return null;

  // None of these three depend on each other — only on the ledger row above.
  const [{ data: tenancy }, { data: paymentRows }, { data: adjustmentRows }] = await Promise.all([
    supabase.from("tenancies").select("tenant_id, tenants(name)").eq("id", ledger.tenancy_id).single(),
    supabase
      .from("payments")
      .select("id, amount, transaction_date, payment_method, status, source")
      .eq("monthly_ledger_id", ledgerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("adjustments")
      .select("id, amount, type, reason, created_at")
      .eq("monthly_ledger_id", ledgerId)
      .order("created_at", { ascending: false }),
  ]);

  const paidTotal = (paymentRows ?? [])
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const hasWaiver = (adjustmentRows ?? []).some((a) => a.type === "waiver");

  const { status, balance, isOverdueBalance } = computeLedgerStatus({
    totalDue: Number(ledger.total_due),
    paidTotal,
    hasWaiver,
    dueDate: dueDateFor(ledger.year, ledger.month, ledger.rent_due_day),
  });

  const units = ledger.units as { name: string } | { name: string }[];
  const unitName = Array.isArray(units) ? units[0]?.name : units?.name;
  const tenants = tenancy?.tenants as { name: string } | { name: string }[] | undefined;
  const tenantName = Array.isArray(tenants) ? tenants[0]?.name : tenants?.name;

  return {
    id: ledger.id,
    year: ledger.year,
    month: ledger.month,
    unitName,
    tenantId: tenancy?.tenant_id,
    tenantName: tenantName ?? "",
    baseRent: Number(ledger.base_rent),
    waterCharge: Number(ledger.water_charge),
    adjustmentsTotal: Number(ledger.adjustments_total),
    totalDue: Number(ledger.total_due),
    paidTotal,
    balance,
    status,
    isOverdueBalance,
    rentDueDay: ledger.rent_due_day,
    payments: (paymentRows ?? []).map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      transactionDate: p.transaction_date,
      paymentMethod: p.payment_method,
      status: p.status,
      source: p.source,
    })),
    adjustments: (adjustmentRows ?? []).map((a) => ({
      id: a.id,
      amount: Number(a.amount),
      type: a.type,
      reason: a.reason,
      createdAt: a.created_at,
    })),
  };
}
