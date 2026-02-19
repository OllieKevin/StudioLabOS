import { useEffect, useMemo, useState } from "react";
import type { ContractRow } from "../lib/types/business";
import { fetchContracts } from "../services/businessService";

export default function ContractsPage() {
  const [items, setItems] = useState<ContractRow[]>([]);
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    setError("");
    try {
      const rows = await fetchContracts();
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "合约库加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return items;
    return items.filter((row) => row.name.toLowerCase().includes(key) || (row.status ?? "").toLowerCase().includes(key));
  }, [items, keyword]);

  const totalAmount = filtered.reduce((sum, row) => sum + row.amount, 0);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>商务合约</h2>
          <p className="muted">报价回写结果、合同金额、状态和到期日汇总。</p>
        </div>
        <button onClick={() => void refresh()} disabled={isLoading}>{isLoading ? "刷新中..." : "刷新合约"}</button>
      </div>

      <div className="filters one-line">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索合约名称 / 状态" />
      </div>

      <div className="summary-grid three-col">
        <div className="summary-card"><span>合约数</span><strong>{filtered.length}</strong></div>
        <div className="summary-card"><span>总金额</span><strong>¥{totalAmount.toFixed(2)}</strong></div>
        <div className="summary-card"><span>最近签订</span><strong>{filtered[0]?.signDate ? new Date(filtered[0].signDate).toLocaleDateString() : "-"}</strong></div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>合约名称</th>
            <th>状态</th>
            <th>签订日期</th>
            <th>回款/有效期</th>
            <th>金额</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.status ?? "未设置"}</td>
              <td>{row.signDate ? new Date(row.signDate).toLocaleDateString() : "-"}</td>
              <td>{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "-"}</td>
              <td>¥{row.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
