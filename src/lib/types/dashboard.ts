export interface DashboardKpi {
  incomeMonth: number;
  expenseMonth: number;
  profitMonth: number;
  activeProjects: number;
  activeSubscriptions: number;
  dueIn7Days: number;
}

export interface DashboardTrendPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
  profit: number;
}

export interface DashboardCategoryPoint {
  category: string;
  amount: number;
}

export interface DashboardMilestone {
  id: string;
  title: string;
  date?: string;
  type: "任务" | "会议";
  projectName?: string;
}

export interface DashboardProjectBrief {
  id: string;
  name: string;
  status: string;
  periodEnd?: string;
}

export interface DashboardSnapshot {
  kpi: DashboardKpi;
  trend: DashboardTrendPoint[];
  categories: DashboardCategoryPoint[];
  milestones: DashboardMilestone[];
  projects: DashboardProjectBrief[];
  warnings: string[];
}
