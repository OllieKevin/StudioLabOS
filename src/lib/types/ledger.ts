export type CostInputMode = "一次性计入" | "按月摊销" | "折旧";

export interface LedgerExpense {
  id: string;
  title: string;
  expenseDate?: string;
  periodStart?: string;
  periodEnd?: string;
  amountOriginal: number;
  amountLocal: number;
  costCategory?: string;
  costDetail?: string;
  costNature?: string;
  costOwnership?: string;
  costBearer?: string;
  approvalStatus?: string;
  inputMode?: CostInputMode;
  paymentMethod?: string;
  invoiceType?: string;
  projectIds: string[];
  supplierIds: string[];
  note?: string;
}

export interface NewLedgerExpenseInput {
  title: string;
  expenseDate: string;
  amount: number;
  costCategory: string;
  costDetail: string;
  costNature: string;
  costOwnership: string;
  costBearer: string;
  approvalStatus: string;
  inputMode: CostInputMode;
  periodStart?: string;
  periodEnd?: string;
  paymentMethod?: string;
  invoiceType?: string;
  note?: string;
  selectedProjectId?: string;
  selectedSupplierId?: string;
}
