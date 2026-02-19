import { useEffect, useMemo, useState } from "react";
import type { DigitalAssetDetail, DigitalAssetRow } from "../lib/types/asset";
import { fetchAssetDetail, fetchAssets, filterAssets } from "../services/assetService";

export default function DigitalAssetsPage() {
  const [items, setItems] = useState<DigitalAssetRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<DigitalAssetDetail>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [areaFilter, setAreaFilter] = useState("全部");

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    setIsLoading(true);
    setError("");
    try {
      const rows = await fetchAssets();
      setItems(rows);
      const nextId = selectedId || rows[0]?.id || "";
      setSelectedId(nextId);
      if (nextId) {
        const d = await fetchAssetDetail(nextId);
        setDetail(d);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "数字资产加载失败");
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => filterAssets(items, keyword, statusFilter, areaFilter), [items, keyword, statusFilter, areaFilter]);
  const selected = useMemo(() => filtered.find((item) => item.id === selectedId) ?? items.find((item) => item.id === selectedId), [filtered, items, selectedId]);

  useEffect(() => {
    if (!selected && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [selected, filtered]);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
  }, [selectedId]);

  const loadDetail = async (id: string) => {
    try {
      const d = await fetchAssetDetail(id);
      setDetail(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "资产详情加载失败");
    }
  };

  const statusOptions = useMemo(() => ["全部", ...Array.from(new Set(items.map((item) => item.status)))], [items]);
  const areaOptions = useMemo(() => ["全部", ...Array.from(new Set(items.map((item) => item.serviceArea).filter(Boolean) as string[]))], [items]);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>数字资产管理</h2>
          <p className="muted">从资产库读取软件资产状态，并关联查看财务记录。</p>
        </div>
        <button onClick={() => void refresh()} disabled={isLoading}>{isLoading ? "刷新中..." : "刷新资产"}</button>
      </div>

      <div className="filters">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索工具名称 / 描述" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
          {areaOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="summary-grid three-col">
        <div className="summary-card"><span>资产总数</span><strong>{filtered.length}</strong></div>
        <div className="summary-card"><span>服役中</span><strong>{filtered.filter((item) => item.status === "服役中").length}</strong></div>
        <div className="summary-card"><span>关联财务记录</span><strong>{filtered.reduce((sum, item) => sum + item.ledgerRelationIds.length, 0)}</strong></div>
      </div>

      <div className="split-layout">
        <div className="list-panel">
          {filtered.map((item) => (
            <button key={item.id} type="button" className={`list-row ${selectedId === item.id ? "active" : ""}`} onClick={() => setSelectedId(item.id)}>
              <div>
                <div className="row-title">{item.name}</div>
                <div className="muted small">{item.serviceVersion ?? "未设置"} · {item.serviceArea ?? "未设置"}</div>
              </div>
              <div className="row-right">
                <span className={`status status-${item.status === "服役中" ? "active" : item.status === "暂停使用" ? "paused" : "done"}`}>{item.status}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="detail-panel">
          {!selected || !detail ? (
            <div className="empty">请选择一个资产</div>
          ) : (
            <>
              <h3>{detail.asset.name}</h3>
              <p className="muted">{detail.asset.serviceVersion ?? "-"} · {detail.asset.serviceArea ?? "-"}</p>

              <div className="detail-grid">
                <div><span className="muted small">状态</span><div>{detail.asset.status}</div></div>
                <div><span className="muted small">软件版本</span><div>{detail.asset.softwareVersion ?? "-"}</div></div>
                <div><span className="muted small">开始使用</span><div>{detail.asset.startDate ? new Date(detail.asset.startDate).toLocaleDateString() : "-"}</div></div>
                <div><span className="muted small">财务记录</span><div>{detail.relatedLedger.length}</div></div>
              </div>

              <h4>描述</h4>
              <p>{detail.asset.description || "-"}</p>

              <h4>下载链接</h4>
              {detail.asset.downloadUrl ? (
                <a href={detail.asset.downloadUrl} target="_blank" rel="noreferrer">{detail.asset.downloadUrl}</a>
              ) : (
                <p>-</p>
              )}

              <h4>关联财务总账</h4>
              <table className="table">
                <thead><tr><th>费用名称</th><th>类别</th><th>日期</th><th>金额</th></tr></thead>
                <tbody>
                  {detail.relatedLedger.map((row) => (
                    <tr key={row.id}>
                      <td>{row.title}</td>
                      <td>{row.costCategory ?? "-"}</td>
                      <td>{row.expenseDate ? new Date(row.expenseDate).toLocaleDateString() : "-"}</td>
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
