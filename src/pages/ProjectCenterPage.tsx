import { useEffect, useMemo, useState } from "react";
import { useProjectStore } from "../stores/useProjectStore";

export default function ProjectCenterPage() {
  const store = useProjectStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    void store.loadProjects();
  }, []);

  const totalCost = useMemo(
    () => store.detail?.expenses.reduce((sum, item) => sum + item.amount, 0) ?? 0,
    [store.detail]
  );

  const openDetail = (id: string) => {
    setDrawerOpen(true);
    void store.selectProject(id);
  };

  return (
    <section className="panel overlay-host compact-ui">
      <div className="panel-header">
        <div>
          <h2>项目中心</h2>
          <p className="muted">单项目 360°：项目、合约、成本、任务、会议。</p>
        </div>
        <button onClick={() => void store.loadProjects()} disabled={store.isLoading}>
          {store.isLoading ? "刷新中..." : "刷新项目"}
        </button>
      </div>

      <div className="project-center-layout">
        <div className="list-panel">
          {store.projects.map((project) => (
            <button
              className={`list-row ${store.selectedId === project.id ? "active" : ""}`}
              key={project.id}
              onClick={() => openDetail(project.id)}
              type="button"
            >
              <div>
                <div className="row-title">{project.name}</div>
                <div className="muted small">{project.status}</div>
                <div className="muted small">
                  {project.periodStart ? new Date(project.periodStart).toLocaleDateString() : "-"} - {project.periodEnd ? new Date(project.periodEnd).toLocaleDateString() : "-"}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {drawerOpen ? (
        <div className="inspector-overlay" onClick={() => setDrawerOpen(false)}>
          <aside className="inspector-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="inspector-header">
              <div>
                <h3>项目详情</h3>
                <p className="muted small">项目 360° 视图</p>
              </div>
              <button className="inspector-close" onClick={() => setDrawerOpen(false)}>关闭</button>
            </div>

            <div className="inspector-body">
              {!store.detail ? (
                <div className="empty">请选择一个项目</div>
              ) : (
                <>
                  <h3>{store.detail.project.name}</h3>
                  <p className="muted">状态：{store.detail.project.status}</p>

                  <div className="detail-grid">
                    <div>
                      <div className="muted small">合约数</div>
                      <div>{store.detail.contracts.length}</div>
                    </div>
                    <div>
                      <div className="muted small">项目成本</div>
                      <div>¥{totalCost.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="muted small">任务数</div>
                      <div>{store.detail.tasks.length}</div>
                    </div>
                    <div>
                      <div className="muted small">会议数</div>
                      <div>{store.detail.meetings.length}</div>
                    </div>
                    <div>
                      <div className="muted small">供应商</div>
                      <div>{store.detail.suppliers.length}</div>
                    </div>
                  </div>

                  <h4>关联合约</h4>
                  <ul>
                    {store.detail.contracts.map((row) => (
                      <li key={row.id}>{row.name} · ¥{row.totalAmount.toFixed(2)}</li>
                    ))}
                  </ul>

                  <h4>项目费用</h4>
                  <ul>
                    {store.detail.expenses.map((row) => (
                      <li key={row.id}>{row.title} · ¥{row.amount.toFixed(2)}</li>
                    ))}
                  </ul>

                  <h4>任务节点</h4>
                  <table className="table">
                    <thead><tr><th>任务</th><th>进度</th><th>开始</th><th>结束</th></tr></thead>
                    <tbody>
                      {store.detail.tasks.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{row.progress}</td>
                          <td>{row.startDate ? new Date(row.startDate).toLocaleDateString() : "-"}</td>
                          <td>{row.endDate ? new Date(row.endDate).toLocaleDateString() : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h4>会议记录</h4>
                  <table className="table">
                    <thead><tr><th>会议主题</th><th>日期</th></tr></thead>
                    <tbody>
                      {store.detail.meetings.map((row) => (
                        <tr key={row.id}>
                          <td>{row.title}</td>
                          <td>{row.meetingDate ? new Date(row.meetingDate).toLocaleDateString() : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h4>关联供应商</h4>
                  <table className="table">
                    <thead><tr><th>供应商</th><th>类别</th></tr></thead>
                    <tbody>
                      {store.detail.suppliers.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{row.category ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!!store.detail.warnings.length && (
                    <>
                      <h4>部分加载警告</h4>
                      <ul>
                        {store.detail.warnings.map((warn) => (
                          <li key={warn} className="error">{warn}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {store.error ? <p className="error">{store.error}</p> : null}
    </section>
  );
}
