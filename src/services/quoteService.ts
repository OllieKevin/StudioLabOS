import { db } from "../lib/api/provider";
import type { QuoteDraft, QuoteOption } from "../lib/types/quote";
import { quoteSubtotal, quoteTax } from "../lib/types/quote";

export async function loadQuoteOptions(): Promise<{ clients: QuoteOption[]; projects: QuoteOption[] }> {
  const [clients, projects] = await Promise.all([
    db.aggregate(`SELECT id, name FROM clients ORDER BY name ASC`),
    db.aggregate(`SELECT id, name FROM projects ORDER BY name ASC`),
  ]);

  return {
    clients: clients as unknown as QuoteOption[],
    projects: projects as unknown as QuoteOption[],
  };
}

export async function suggestQuoteNumber(prefix = "MX"): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await db.aggregate(
    `SELECT name FROM contracts WHERE name LIKE ?`,
    [`%${prefix}-${year}-%`],
  );

  const pattern = new RegExp(`${prefix}-${year}-(\\d{4,})$`);
  let max = 0;
  for (const row of rows) {
    const match = String(row.name ?? "").match(pattern);
    if (match?.[1]) {
      const n = Number(match[1]);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }

  return `${prefix}-${year}-${String(max + 1).padStart(4, "0")}`;
}

export async function suggestQuoteVersion(projectId?: string): Promise<string> {
  if (!projectId) return "V1";

  const rows = await db.aggregate(
    `SELECT c.id
     FROM contracts c
     JOIN project_contracts pc ON pc.contract_id = c.id
     WHERE pc.project_id = ?`,
    [projectId],
  );

  return `V${rows.length + 1}`;
}

export async function createQuoteRecord(draft: QuoteDraft): Promise<void> {
  const subtotal = quoteSubtotal(draft);
  const tax = quoteTax(draft);
  const total = subtotal + tax;

  const contractId = await db.insert("contracts", {
    name: draft.title || `报价 ${draft.quoteNumber}`,
    amount: total,
    status: "报价中",
    sign_date: draft.issueDate,
    due_date: draft.dueDate,
  });

  for (const item of draft.lineItems) {
    await db.insert("quote_line_items", {
      quote_id: contractId,
      item_name: item.itemName,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
    });
  }

  if (draft.selectedClientId) {
    await db.link("client_contracts", draft.selectedClientId, contractId);
  }
  if (draft.selectedProjectId) {
    await db.link("project_contracts", draft.selectedProjectId, contractId);
  }
}
