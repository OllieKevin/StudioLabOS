import { useEffect, useState } from "react";
import type { ClientDetail, ClientRow } from "../lib/types/business";
import { fetchClientDetail, fetchClients } from "../services/businessService";

export default function ClientsPage() {
  const [items, setItems] = useState<ClientRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<ClientDetail>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    setError("");
    try {
      const rows = await fetchClients();
      setItems(rows);
      const currentId = selectedId || rows[0]?.id || "";
      setSelectedId(currentId);
      if (currentId) {
        const d = await fetchClientDetail(currentId);
        setDetail(d);
      } else {
        setDetail(undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "客户库加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  const selectClient = async (id: string) => {
    setSelectedId(id);
    setIsLoading(true);
    setError("");
    try {
      const d = await fetchClientDetail(id);
      setDetail(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "客户详情加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>客户管理</h2>
          <p className="muted">查看客户档案及关联项目/合约。</p>
        </div>
        <button onClick={() => void refresh()} disabled={isLoading}>{isLoading ? "加载中..." : "刷新"}</button>
      </div>

      <div className="split-layout">
        <div className="list-panel">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`list-row ${selectedId === item.id ? "active" : ""}`}
              onClick={() => void selectClient(item.id)}
            >
              <div>
                <div className="row-title">{item.name}</div>
                <div className="muted small">{item.contact ?? "未设置联系人"}</div>
              </div>
              <div className="row-right">
                <span className="muted small">项目 {item.projectIds.length}</span>
                <span className="muted small">合约 {item.contractIds.length}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="detail-panel">
          {!detail ? (
            <div className="empty">请选择一个客户</div>
          ) : (
            <>
              <h3>{detail.client.name}</h3>
              <div className="detail-grid">
                <div><span className="muted small">联系人</span><div>{detail.client.contact ?? "-"}</div></div>
                <div><span className="muted small">电话</span><div>{detail.client.phone ?? "-"}</div></div>
                <div><span className="muted small">邮箱</span><div>{detail.client.email ?? "-"}</div></div>
                <div><span className="muted small">合约数</span><div>{detail.relatedContracts.length}</div></div>
              </div>

              <h4>关联合约</h4>
              <table className="table">
                <thead><tr><th>合约</th><th>金额</th></tr></thead>
                <tbody>
                  {detail.relatedContracts.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>¥{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4>关联项目</h4>
              <table className="table">
                <thead><tr><th>项目</th><th>状态</th></tr></thead>
                <tbody>
                  {detail.relatedProjects.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
