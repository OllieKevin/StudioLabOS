import { db } from "../lib/api/provider";
import type { TimelineDocument, TimelineRow } from "../lib/types/timeline";

export async function fetchTimelineByProject(projectId: string): Promise<TimelineDocument> {
  const projectRows = await db.aggregate(
    `SELECT id, name FROM projects WHERE id = ? LIMIT 1`,
    [projectId],
  );
  const project = projectRows[0] as { id: string; name: string } | undefined;
  if (!project) throw new Error("未找到项目");

  const rows = (await db.aggregate(
    `SELECT
       id,
       name as "taskName",
       COALESCE(status, '') as "status",
       owner,
       start_date as "startDate",
       end_date as "endDate",
       milestone
     FROM tasks
     WHERE project_id = ?
     ORDER BY start_date ASC`,
    [projectId],
  )) as unknown as TimelineRow[];

  return {
    projectId,
    projectName: project.name,
    rows,
    warnings: [],
  };
}

export function timelineToCsv(doc: TimelineDocument): string {
  const header = ["任务", "状态", "负责人", "开始", "结束", "里程碑"];
  const body = doc.rows.map((row) => [
    row.taskName,
    row.status,
    row.owner ?? "",
    row.startDate ?? "",
    row.endDate ?? "",
    row.milestone ?? "",
  ]);

  return [header, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}
