export const MAIN_TABLES = [
  "projects",
  "tasks",
  "meetings",
  "clients",
  "suppliers",
  "contracts",
  "ledger_expenses",
  "subscriptions",
  "digital_assets",
  "quote_line_items",
  "business_targets",
] as const;

export const JUNCTION_TABLES = [
  "client_projects",
  "client_contracts",
  "project_contracts",
  "ledger_projects",
  "ledger_suppliers",
  "supplier_projects",
  "asset_ledger_links",
] as const;

export const ALL_TABLES = [...MAIN_TABLES, ...JUNCTION_TABLES] as const;

export type TableName = (typeof ALL_TABLES)[number];

const ALLOWED_OPS = new Set(["=", "!=", ">", "<", ">=", "<=", "LIKE", "IN"]);

export function validateTable(table: string): asserts table is TableName {
  if (!ALL_TABLES.includes(table as TableName)) {
    throw new Error(`不允许操作的表: ${table}`);
  }
}

export function validateColumn(column: string): void {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
    throw new Error(`非法列名: ${column}`);
  }
}

export function validateOperator(op: string): void {
  if (!ALLOWED_OPS.has(op)) {
    throw new Error(`非法操作符: ${op}`);
  }
}
