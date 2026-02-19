import { useEffect, useState } from "react";
import type { SupplierDetail, SupplierRow } from "../lib/types/business";
import { fetchSupplierDetail, fetchSuppliers } from "../services/businessService";

export default function SuppliersPage() {
  const [items, setItems] = useState<SupplierRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<SupplierDetail>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    setError("");
    try {
      const rows = await fetchSuppliers();
      setItems(rows);
      const currentId = selectedId || rows[0]?.id || "";
      setSelectedId(currentId);
      if (currentId) {
        const d = await fetchSupplierDetail(currentId);
        setDetail(d);
      } else {
        setDetail(undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "供应商库加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  const selectSupplier = async (id: string) => {
    setSelectedId(id);
    setIsLoading(true);
    setError("");
    try {
      const d = await fetchSupplierDetail(id);
      setDetail(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "供应商详情加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>供应商管理</h2>
          <p className="muted">管理合作供应商、项目历史和费用记录。</p>
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
              onClick={() => void selectSupplier(item.id)}
            >
              <div>
                <div className="row-title">{item.name}</div>
                <div className="muted small">{item.category ?? "未分类"}</div>
              </div>
              <div className="row-right">
                <span className="muted small">{item.contact ?? "-"}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="detail-panel">
          {!detail ? (
            <div className="empty">请选择一个供应商</div>
          ) : (
            <>
              <h3>{detail.supplier.name}</h3>
              <div className="detail-grid">
                <div><span className="muted small">分类</span><div>{detail.supplier.category ?? "-"}</div></div>
                <div><span className="muted small">联系人</span><div>{detail.supplier.contact ?? "-"}</div></div>
                <div><span className="muted small">电话</span><div>{detail.supplier.phone ?? "-"}</div></div>
                <div><span className="muted small">关联项目</span><div>{detail.relatedProjects.length}</div></div>
              </div>

              <h4>合作项目</h4>
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

              <h4>关联费用</h4>
              <table className="table">
                <thead><tr><th>费用名称</th><th>日期</th><th>金额</th></tr></thead>
                <tbody>
                  {detail.relatedExpenses.map((row) => (
                    <tr key={row.id}>
                      <td>{row.title}</td>
                      <td>{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td>
                      <td>¥{row.amount.toFixed(2)}</td>
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
