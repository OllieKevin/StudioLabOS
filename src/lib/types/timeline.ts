export interface TimelineRow {
  id: string;
  taskName: string;
  status: string;
  owner?: string;
  startDate?: string;
  endDate?: string;
  milestone?: string;
}

export interface TimelineDocument {
  projectId: string;
  projectName: string;
  rows: TimelineRow[];
  warnings: string[];
}
