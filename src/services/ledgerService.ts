import { db } from "../lib/api/provider";
import type { LedgerExpense, NewLedgerExpenseInput } from "../lib/types/ledger";

type LedgerBase = Omit<LedgerExpense, "projectIds" | "supplierIds">;

export async function fetchLedgerExpenses(): Promise<LedgerExpense[]> {
  const rows = (await db.aggregate(`
    SELECT
      id,
      title,
      expense_date as "expenseDate",
      period_start as "periodStart",
      period_end as "periodEnd",
      amount_original as "amountOriginal",
      amount_local as "amountLocal",
      cost_category as "costCategory",
      cost_detail as "costDetail",
      cost_nature as "costNature",
      cost_ownership as "costOwnership",
      cost_bearer as "costBearer",
      approval_status as "approvalStatus",
      input_mode as "inputMode",
      payment_method as "paymentMethod",
      invoice_type as "invoiceType",
      note
    FROM ledger_expenses
    ORDER BY expense_date DESC
  `)) as unknown as LedgerBase[];

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      projectIds: await db.getLinked("ledger_projects", "ledger_id", row.id),
      supplierIds: await db.getLinked("ledger_suppliers", "ledger_id", row.id),
    })),
  );
}

export async function createLedgerExpense(input: NewLedgerExpenseInput): Promise<void> {
  const ledgerId = await db.insert("ledger_expenses", {
    title: input.title,
    expense_date: input.expenseDate,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    amount_original: input.amount,
    amount_local: input.amount,
    cost_category: input.costCategory,
    cost_detail: input.costDetail,
    cost_nature: input.costNature,
    cost_ownership: input.costOwnership,
    cost_bearer: input.costBearer,
    approval_status: input.approvalStatus,
    input_mode: input.inputMode,
    payment_method: input.paymentMethod,
    invoice_type: input.invoiceType,
    note: input.note,
  });

  if (input.selectedProjectId) {
    await db.link("ledger_projects", ledgerId, input.selectedProjectId);
  }
  if (input.selectedSupplierId) {
    await db.link("ledger_suppliers", ledgerId, input.selectedSupplierId);
  }
}
