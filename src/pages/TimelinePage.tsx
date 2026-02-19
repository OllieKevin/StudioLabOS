import { useEffect, useState } from "react";
import { fetchProjects } from "../services/projectService";
import { fetchTimelineByProject, timelineToCsv } from "../services/timelineService";
import type { ProjectRow } from "../lib/types/project";
import type { TimelineDocument } from "../lib/types/timeline";

export default function TimelinePage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [doc, setDoc] = useState<TimelineDocument>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    void refreshTimeline();
  }, [selectedProjectId]);

  const bootstrap = async () => {
    setIsLoading(true);
    setError("");
    try {
      const projectRows = await fetchProjects();
      setProjects(projectRows);
      const firstId = projectRows[0]?.id;
      if (firstId) {
        setSelectedProjectId(firstId);
      } else {
        setDoc(undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "时间节点加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTimeline = async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    setError("");
    try {
      const timeline = await fetchTimelineByProject(selectedProjectId);
      setDoc(timeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : "时间节点加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  const exportCsv = () => {
    if (!doc) return;
    const csv = timelineToCsv(doc);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.projectName}-timeline.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>时间节点表</h2>
          <p className="muted">按项目拉取任务周期，导出客户可读时间表。</p>
        </div>
        <div className="actions">
          <button onClick={() => void refreshTimeline()} disabled={isLoading || !selectedProjectId}>
            {isLoading ? "加载中..." : "刷新"}
          </button>
          <button onClick={exportCsv} disabled={!doc?.rows.length}>导出 CSV</button>
          <button onClick={() => exportPdf(doc)} disabled={!doc?.rows.length}>导出 PDF</button>
        </div>
      </div>

      <div className="filters">
        <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </div>

      <div className="detail-panel">
        {!doc ? (
          <div className="empty">没有可展示的时间节点</div>
        ) : (
          <>
            <h3>{doc.projectName}</h3>
            <p className="muted">共 {doc.rows.length} 条任务节点</p>
            <table className="table">
              <thead>
                <tr>
                  <th>任务</th>
                  <th>状态</th>
                  <th>负责人</th>
                  <th>开始</th>
                  <th>结束</th>
                  <th>里程碑</th>
                </tr>
              </thead>
              <tbody>
                {doc.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.taskName}</td>
                    <td>{row.status}</td>
                    <td>{row.owner ?? "-"}</td>
                    <td>{row.startDate ? new Date(row.startDate).toLocaleDateString() : "-"}</td>
                    <td>{row.endDate ? new Date(row.endDate).toLocaleDateString() : "-"}</td>
                    <td>{row.milestone ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {doc.warnings.length > 0 ? (
              <ul>
                {doc.warnings.map((warn) => (
                  <li key={warn} className="error">{warn}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

function exportPdf(doc?: TimelineDocument): void {
  if (!doc) return;

  const rows = doc.rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.taskName)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${escapeHtml(row.owner ?? "-")}</td>
        <td>${escapeHtml(formatDate(row.startDate))}</td>
        <td>${escapeHtml(formatDate(row.endDate))}</td>
        <td>${escapeHtml(row.milestone ?? "-")}</td>
      </tr>
    `)
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(doc.projectName)} Timeline</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 28px; color: #111827; }
    h1 { margin: 0 0 6px; }
    p { margin: 0 0 16px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
    thead tr { background: #2a2a2e; color: #fff; }
  </style>
</head>
<body>
  <h1>${escapeHtml(doc.projectName)} 时间节点表</h1>
  <p>共 ${doc.rows.length} 条任务节点</p>
  <table>
    <thead>
      <tr>
        <th>任务</th><th>状态</th><th>负责人</th><th>开始</th><th>结束</th><th>里程碑</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>
`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => iframe.remove(), 1500);
  };
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
