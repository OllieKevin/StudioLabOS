import { useEffect, useMemo, useState } from "react";
import type { DashboardSnapshot } from "../lib/types/dashboard";
import { fetchDashboardSnapshot } from "../services/dashboardService";

const emptySnapshot: DashboardSnapshot = {
  kpi: {
    incomeMonth: 0,
    expenseMonth: 0,
    profitMonth: 0,
    activeProjects: 0,
    activeSubscriptions: 0,
    dueIn7Days: 0
  },
  trend: [],
  categories: [],
  milestones: [],
  projects: [],
  warnings: []
};

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchDashboardSnapshot();
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "仪表盘加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  const trendMax = useMemo(
    () => Math.max(1, ...snapshot.trend.map((item) => Math.max(item.income, item.expense, Math.abs(item.profit)))),
    [snapshot.trend]
  );

  const categoryMax = useMemo(
    () => Math.max(1, ...snapshot.categories.map((item) => item.amount)),
    [snapshot.categories]
  );

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>经营仪表盘</h2>
          <p className="muted">整合项目、合约、总账、订阅、任务、会议的经营概览。</p>
        </div>
        <button onClick={() => void refresh()} disabled={isLoading}>{isLoading ? "刷新中..." : "刷新数据"}</button>
      </div>

      <div className="summary-grid">
        <div className="summary-card hero">
          <span>本月收入</span>
          <strong>¥{snapshot.kpi.incomeMonth.toFixed(2)}</strong>
          <small className="muted">来自商务合约库</small>
        </div>
        <div className="summary-card"><span>本月支出</span><strong>¥{snapshot.kpi.expenseMonth.toFixed(2)}</strong></div>
        <div className="summary-card"><span>本月利润</span><strong className={snapshot.kpi.profitMonth >= 0 ? "ok-text" : "error-text"}>¥{snapshot.kpi.profitMonth.toFixed(2)}</strong></div>
        <div className="summary-card"><span>7天内节点</span><strong>{snapshot.kpi.dueIn7Days}</strong></div>
      </div>

      <div className="dashboard-grid">
        <div className="detail-panel">
          <h3>近6个月收支趋势</h3>
          <div className="trend-rows">
            {snapshot.trend.map((row) => (
              <div key={row.key} className="trend-row">
                <span className="muted small">{row.label}</span>
                <div className="trend-stack">
                  <div className="trend-segment income" style={{ width: `${(row.income / trendMax) * 100}%` }} title={`收入 ¥${row.income.toFixed(2)}`} />
                  <div className="trend-segment expense" style={{ width: `${(row.expense / trendMax) * 100}%` }} title={`支出 ¥${row.expense.toFixed(2)}`} />
                </div>
                <span className={`small ${row.profit >= 0 ? "ok-text" : "error-text"}`}>¥{row.profit.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-panel">
          <h3>成本结构分布</h3>
          <div className="form-grid">
            {snapshot.categories.map((item) => (
              <div className="area-row" key={item.category}>
                <div>{item.category}</div>
                <div className="area-meter">
                  <div className="area-meter-fill" style={{ width: `${(item.amount / categoryMax) * 100}%` }} />
                </div>
                <div className="small">¥{item.amount.toFixed(0)}</div>
              </div>
            ))}
            {snapshot.categories.length === 0 ? <p className="muted">暂无成本分类数据</p> : null}
          </div>
        </div>

        <div className="detail-panel">
          <h3>项目看板</h3>
          <div className="form-grid">
            <div className="mini-kpis">
              <span>活跃项目：{snapshot.kpi.activeProjects}</span>
              <span>活跃订阅：{snapshot.kpi.activeSubscriptions}</span>
            </div>
            {snapshot.projects.map((item) => (
              <div key={item.id} className="list-row compact">
                <div>
                  <div className="row-title">{item.name}</div>
                  <div className="muted small">{item.status}</div>
                </div>
                <div className="muted small">{item.periodEnd ? new Date(item.periodEnd).toLocaleDateString() : "-"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-panel dark">
          <h3>即将到期提醒</h3>
          {snapshot.milestones.length === 0 ? <p className="muted">未来暂无关键节点</p> : null}
          <div className="form-grid">
            {snapshot.milestones.map((item) => (
              <div key={item.id} className="milestone-row">
                <div>
                  <strong>{item.title}</strong>
                  <div className="small muted">{item.projectName ?? "未关联项目"} · {item.type}</div>
                </div>
                <div className="small">{item.date ? new Date(item.date).toLocaleDateString() : "-"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {snapshot.warnings.length > 0 ? (
        <ul>
          {snapshot.warnings.map((warning) => (
            <li key={warning} className="error">{warning}</li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
