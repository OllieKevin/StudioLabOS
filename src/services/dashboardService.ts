import { db } from "../lib/sqlite/provider";
import type {
  DashboardCategoryPoint,
  DashboardMilestone,
  DashboardProjectBrief,
  DashboardSnapshot,
  DashboardTrendPoint,
} from "../lib/types/dashboard";

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [kpi, trend, categories, milestones, projects] = await Promise.all([
    fetchKpi(),
    fetchMonthlyTrend(),
    fetchCategoryDistribution(),
    fetchMilestones(),
    fetchProjectBriefs(),
  ]);

  const dueIn7Days = milestones.filter((item) => {
    if (!item.date) return false;
    const diff = dayDiff(new Date(), new Date(item.date));
    return diff >= 0 && diff <= 7;
  }).length;

  return {
    kpi: { ...kpi, dueIn7Days },
    trend,
    categories,
    milestones: milestones.slice(0, 6),
    projects: projects.slice(0, 6),
    warnings: [],
  };
}

async function fetchKpi() {
  const rows = await db.aggregate(`
    SELECT
      COALESCE((SELECT SUM(amount) FROM contracts
        WHERE strftime('%Y-%m', sign_date) = strftime('%Y-%m', 'now')), 0) as "incomeMonth",
      COALESCE((SELECT SUM(amount_local) FROM ledger_expenses
        WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')), 0) as "expenseMonth",
      (SELECT COUNT(*) FROM projects
        WHERE LOWER(status) NOT LIKE '%完成%'
          AND LOWER(status) NOT LIKE '%取消%'
          AND LOWER(status) NOT LIKE '%done%'
          AND LOWER(status) NOT LIKE '%closed%') as "activeProjects",
      (SELECT COUNT(*) FROM subscriptions WHERE status = '服役中') as "activeSubscriptions"
  `);

  const row = rows[0] ?? {};
  const incomeMonth = Number(row.incomeMonth ?? 0);
  const expenseMonth = Number(row.expenseMonth ?? 0);

  return {
    incomeMonth,
    expenseMonth,
    profitMonth: incomeMonth - expenseMonth,
    activeProjects: Number(row.activeProjects ?? 0),
    activeSubscriptions: Number(row.activeSubscriptions ?? 0),
    dueIn7Days: 0,
  };
}

async function fetchMonthlyTrend(): Promise<DashboardTrendPoint[]> {
  const income = await db.aggregate(`
    SELECT strftime('%Y-%m', sign_date) as month, SUM(amount) as total
    FROM contracts
    WHERE sign_date >= date('now', '-5 months', 'start of month')
    GROUP BY month
    ORDER BY month
  `);

  const expense = await db.aggregate(`
    SELECT strftime('%Y-%m', expense_date) as month, SUM(amount_local) as total
    FROM ledger_expenses
    WHERE expense_date >= date('now', '-5 months', 'start of month')
    GROUP BY month
    ORDER BY month
  `);

  const incomeMap = new Map(income.map((r) => [String(r.month), Number(r.total ?? 0)]));
  const expenseMap = new Map(expense.map((r) => [String(r.month), Number(r.total ?? 0)]));

  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return months.map((key) => {
    const inc = incomeMap.get(key) ?? 0;
    const exp = expenseMap.get(key) ?? 0;
    return { key, label: key.slice(5), income: inc, expense: exp, profit: inc - exp };
  });
}

async function fetchCategoryDistribution(): Promise<DashboardCategoryPoint[]> {
  const rows = await db.aggregate(`
    SELECT COALESCE(cost_category, '未分类') as category, SUM(amount_local) as amount
    FROM ledger_expenses
    WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')
    GROUP BY category
    ORDER BY amount DESC
    LIMIT 6
  `);

  return rows.map((r) => ({
    category: String(r.category),
    amount: Number(r.amount ?? 0),
  }));
}

async function fetchMilestones(): Promise<DashboardMilestone[]> {
  const tasks = await db.aggregate(`
    SELECT
      t.id,
      t.name as title,
      COALESCE(t.end_date, t.start_date) as date,
      p.name as "projectName"
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.end_date IS NOT NULL OR t.start_date IS NOT NULL
    ORDER BY date ASC
  `);

  const meetings = await db.aggregate(`
    SELECT
      m.id,
      m.title,
      m.meeting_date as date,
      p.name as "projectName"
    FROM meetings m
    LEFT JOIN projects p ON m.project_id = p.id
    WHERE m.meeting_date IS NOT NULL
    ORDER BY date ASC
  `);

  const items: DashboardMilestone[] = [
    ...tasks.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      date: r.date as string | undefined,
      type: "任务" as const,
      projectName: r.projectName as string | undefined,
    })),
    ...meetings.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      date: r.date as string | undefined,
      type: "会议" as const,
      projectName: r.projectName as string | undefined,
    })),
  ];

  return items.sort((a, b) => ((a.date ?? "9999") > (b.date ?? "9999") ? 1 : -1));
}

async function fetchProjectBriefs(): Promise<DashboardProjectBrief[]> {
  const rows = await db.aggregate(`
    SELECT id, name, status, period_end as "periodEnd"
    FROM projects
    ORDER BY updated_at DESC
    LIMIT 6
  `);

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    status: String(r.status ?? ""),
    periodEnd: r.periodEnd as string | undefined,
  }));
}

function dayDiff(a: Date, b: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const t1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const t2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((t2 - t1) / oneDay);
}
