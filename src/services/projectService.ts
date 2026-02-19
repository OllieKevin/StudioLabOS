import { db } from "../lib/api/provider";
import type {
  ContractRow,
  ProjectExpenseRow,
  ProjectFullView,
  ProjectMeetingRow,
  ProjectRow,
  ProjectSupplierRow,
  ProjectTaskRow,
} from "../lib/types/project";

type ProjectBase = Omit<ProjectRow, "clientIds" | "contractIds">;

export async function fetchProjects(): Promise<ProjectRow[]> {
  const rows = (await db.aggregate(`
    SELECT
      id,
      name,
      status,
      period_start as "periodStart",
      period_end as "periodEnd"
    FROM projects
    ORDER BY period_start DESC
  `)) as unknown as ProjectBase[];

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      clientIds: await db.getLinked("client_projects", "project_id", row.id),
      contractIds: await db.getLinked("project_contracts", "project_id", row.id),
    })),
  );
}

export async function fetchProjectFullView(
  projectId: string,
  knownProject?: ProjectRow,
): Promise<ProjectFullView> {
  const warnings: string[] = [];
  const project = knownProject ?? (await fetchProjects()).find((item) => item.id === projectId);
  if (!project) throw new Error("未找到项目");

  const contractIds = await db.getLinked("project_contracts", "project_id", projectId);
  let contracts: ContractRow[] = [];
  if (contractIds.length > 0) {
    const ph = contractIds.map(() => "?").join(", ");
    const raw = (await db.aggregate(
      `SELECT id, name, amount FROM contracts WHERE id IN (${ph})`,
      contractIds,
    )) as unknown as Omit<ContractRow, "projectIds" | "clientIds">[];

    contracts = raw.map((row) => ({
      ...row,
      projectIds: [projectId],
      clientIds: [],
    }));
  }

  const expenses = (await db.aggregate(
    `SELECT
       le.id,
       le.title,
       le.amount_local as "amount",
       le.expense_date as "expenseDate",
       le.cost_category as "category"
     FROM ledger_expenses le
     JOIN ledger_projects lp ON lp.ledger_id = le.id
     WHERE lp.project_id = ?
     ORDER BY le.expense_date DESC`,
    [projectId],
  )) as unknown as ProjectExpenseRow[];

  const tasks = (await db.aggregate(
    `SELECT
       id,
       name,
       status as "progress",
       start_date as "startDate",
       end_date as "endDate"
     FROM tasks
     WHERE project_id = ?
     ORDER BY start_date ASC`,
    [projectId],
  )) as unknown as ProjectTaskRow[];

  const meetings = (await db.aggregate(
    `SELECT
       id,
       title,
       meeting_date as "meetingDate"
     FROM meetings
     WHERE project_id = ?
     ORDER BY meeting_date DESC`,
    [projectId],
  )) as unknown as ProjectMeetingRow[];

  const supplierIds = await db.getLinked("supplier_projects", "project_id", projectId);
  let suppliers: ProjectSupplierRow[] = [];
  if (supplierIds.length > 0) {
    const ph = supplierIds.map(() => "?").join(", ");
    suppliers = (await db.aggregate(
      `SELECT id, name, category FROM suppliers WHERE id IN (${ph})`,
      supplierIds,
    )) as unknown as ProjectSupplierRow[];
  }

  return { project, contracts, expenses, tasks, meetings, suppliers, warnings };
}
