import { db } from "../lib/api/provider";
import type {
  ClientDetail,
  ClientRow,
  ContractRow,
  SupplierDetail,
  SupplierRow,
} from "../lib/types/business";

type ClientBase = Omit<ClientRow, "projectIds" | "contractIds">;
type SupplierBase = Omit<SupplierRow, "projectIds">;
type ContractBase = Omit<ContractRow, "projectIds" | "clientIds">;

export async function fetchClients(): Promise<ClientRow[]> {
  const rows = (await db.aggregate(
    `SELECT id, name, contact, phone, email FROM clients ORDER BY name ASC`,
  )) as unknown as ClientBase[];

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      projectIds: await db.getLinked("client_projects", "client_id", row.id),
      contractIds: await db.getLinked("client_contracts", "client_id", row.id),
    })),
  );
}

export async function fetchSuppliers(): Promise<SupplierRow[]> {
  const rows = (await db.aggregate(
    `SELECT id, name, category, contact, phone FROM suppliers ORDER BY name ASC`,
  )) as unknown as SupplierBase[];

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      projectIds: await db.getLinked("supplier_projects", "supplier_id", row.id),
    })),
  );
}

export async function fetchContracts(): Promise<ContractRow[]> {
  const rows = (await db.aggregate(`
    SELECT id,
           name,
           amount,
           status,
           sign_date as "signDate",
           due_date as "dueDate"
    FROM contracts
    ORDER BY sign_date DESC
  `)) as unknown as ContractBase[];

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      projectIds: await db.getLinked("project_contracts", "contract_id", row.id),
      clientIds: await db.getLinked("client_contracts", "contract_id", row.id),
    })),
  );
}

export async function fetchClientDetail(clientId: string): Promise<ClientDetail> {
  const clients = await fetchClients();
  const client = clients.find((row) => row.id === clientId);
  if (!client) throw new Error("未找到客户");

  const contractIds = await db.getLinked("client_contracts", "client_id", clientId);
  let relatedContracts: ClientDetail["relatedContracts"] = [];
  if (contractIds.length > 0) {
    const ph = contractIds.map(() => "?").join(", ");
    relatedContracts = (await db.aggregate(
      `SELECT id, name, amount FROM contracts WHERE id IN (${ph})`,
      contractIds,
    )) as unknown as ClientDetail["relatedContracts"];
  }

  const projectIds = await db.getLinked("client_projects", "client_id", clientId);
  let relatedProjects: ClientDetail["relatedProjects"] = [];
  if (projectIds.length > 0) {
    const ph = projectIds.map(() => "?").join(", ");
    relatedProjects = (await db.aggregate(
      `SELECT id, name, status FROM projects WHERE id IN (${ph})`,
      projectIds,
    )) as unknown as ClientDetail["relatedProjects"];
  }

  return { client, relatedContracts, relatedProjects };
}

export async function fetchSupplierDetail(supplierId: string): Promise<SupplierDetail> {
  const suppliers = await fetchSuppliers();
  const supplier = suppliers.find((row) => row.id === supplierId);
  if (!supplier) throw new Error("未找到供应商");

  const projectIds = await db.getLinked("supplier_projects", "supplier_id", supplierId);
  let relatedProjects: SupplierDetail["relatedProjects"] = [];
  if (projectIds.length > 0) {
    const ph = projectIds.map(() => "?").join(", ");
    relatedProjects = (await db.aggregate(
      `SELECT id, name, status FROM projects WHERE id IN (${ph})`,
      projectIds,
    )) as unknown as SupplierDetail["relatedProjects"];
  }

  const ledgerIds = await db.getLinked("ledger_suppliers", "supplier_id", supplierId);
  let relatedExpenses: SupplierDetail["relatedExpenses"] = [];
  if (ledgerIds.length > 0) {
    const ph = ledgerIds.map(() => "?").join(", ");
    relatedExpenses = (await db.aggregate(
      `SELECT
         id,
         title,
         amount_local as "amount",
         expense_date as "date"
       FROM ledger_expenses
       WHERE id IN (${ph})
       ORDER BY expense_date DESC`,
      ledgerIds,
    )) as unknown as SupplierDetail["relatedExpenses"];
  }

  return { supplier, relatedProjects, relatedExpenses };
}
