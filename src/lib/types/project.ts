export interface ProjectRow {
  id: string;
  name: string;
  status: string;
  periodStart?: string;
  periodEnd?: string;
  clientIds: string[];
  contractIds: string[];
}

export interface ContractRow {
  id: string;
  name: string;
  totalAmount: number;
  projectIds: string[];
  clientIds: string[];
}

export interface ProjectExpenseRow {
  id: string;
  title: string;
  amount: number;
  expenseDate?: string;
  category?: string;
}

export interface ProjectTaskRow {
  id: string;
  name: string;
  progress: string;
  startDate?: string;
  endDate?: string;
}

export interface ProjectMeetingRow {
  id: string;
  title: string;
  meetingDate?: string;
}

export interface ProjectSupplierRow {
  id: string;
  name: string;
  category?: string;
}

export interface ProjectFullView {
  project: ProjectRow;
  contracts: ContractRow[];
  expenses: ProjectExpenseRow[];
  tasks: ProjectTaskRow[];
  meetings: ProjectMeetingRow[];
  suppliers: ProjectSupplierRow[];
  warnings: string[];
}
