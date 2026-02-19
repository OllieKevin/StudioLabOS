import { useEffect, useMemo, useState } from "react";
import type { CostInputMode, LedgerExpense, NewLedgerExpenseInput } from "../lib/types/ledger";
import { fetchProjects } from "../services/projectService";
import { fetchSuppliers } from "../services/businessService";
import { createLedgerExpense, fetchLedgerExpenses } from "../services/ledgerService";
import type { ProjectRow } from "../lib/types/project";
import type { SupplierRow } from "../lib/types/business";

const inputModes: CostInputMode[] = ["一次性计入", "按月摊销", "折旧"];

const defaultDraft = (): NewLedgerExpenseInput => ({
  title: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  amount: 0,
  costCategory: "办公运营成本",
  costDetail: "",
  costNature: "固定成本",
  costOwnership: "运营间接成本",
  costBearer: "子公司自有",
  approvalStatus: "草稿",
  inputMode: "一次性计入",
  paymentMethod: "银行转账",
  invoiceType: "电子发票",
  note: "",
  periodStart: "",
  periodEnd: "",
  selectedProjectId: "",
  selectedSupplierId: ""
});

export default function LedgerPage() {
  const [items, setItems] = useState<LedgerExpense[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("全部");
  const [approvalFilter, setApprovalFilter] = useState("全部");
  const [draft, setDraft] = useState<NewLedgerExpenseInput>(defaultDraft);

  useEffect(() => {
    void bootstrap();
  }, []);

  const bootstrap = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [ledgerRows, projectRows, supplierRows] = await Promise.allSettled([
        fetchLedgerExpenses(),
        fetchProjects(),
        fetchSuppliers()
      ]);

      if (ledgerRows.status === "fulfilled") {
        setItems(ledgerRows.value);
        setSelectedId((prev) => prev || ledgerRows.value[0]?.id || "");
      } else {
        setError(ledgerRows.reason instanceof Error ? ledgerRows.reason.message : "财务总账加载失败");
      }

      if (projectRows.status === "fulfilled") {
        setProjects(projectRows.value);
      }
      if (supplierRows.status === "fulfilled") {
        setSuppliers(supplierRows.value);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return items
      .filter((item) => (categoryFilter === "全部" ? true : item.costCategory === categoryFilter))
      .filter((item) => (approvalFilter === "全部" ? true : (item.approvalStatus ?? "未设置") === approvalFilter))
      .filter((item) => {
        if (!key) return true;
        return item.title.toLowerCase().includes(key) || (item.note ?? "").toLowerCase().includes(key);
      });
  }, [items, keyword, categoryFilter, approvalFilter]);

  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) ?? items.find((item) => item.id === selectedId),
    [filtered, items, selectedId]
  );

  useEffect(() => {
    if (!selected && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [selected, filtered]);

  const categories = useMemo(() => ["全部", ...Array.from(new Set(items.map((x) => x.costCategory || "未分类")))], [items]);
  const approvals = useMemo(() => ["全部", ...Array.from(new Set(items.map((x) => x.approvalStatus || "未设置")))], [items]);

  const monthKey = monthToken(new Date());
  const monthTotal = filtered
    .filter((item) => monthToken(parseDate(item.expenseDate)) === monthKey)
    .reduce((sum, item) => sum + item.amountLocal, 0);
  const yearlyTotal = filtered.reduce((sum, item) => sum + item.amountLocal, 0);
  const pendingCount = filtered.filter((item) => {
    const status = item.approvalStatus ?? "";
    return status.includes("草稿") || status.includes("审批");
  }).length;

  const handleCreate = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      await createLedgerExpense({
        ...draft,
        selectedProjectId: draft.selectedProjectId || undefined,
        selectedSupplierId: draft.selectedSupplierId || undefined,
        periodStart: draft.periodStart || undefined,
        periodEnd: draft.periodEnd || undefined
      });
      setShowCreate(false);
      setDraft(defaultDraft());
      setSuccess("费用已写入财务总账");
      await bootstrap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "费用创建失败");
    } finally {
      setIsSaving(false);
    }
  };

  const amortized = previewAmount(draft);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>财务总账</h2>
          <p className="muted">费用录入、分类筛选、摊销预估、审批状态追踪。</p>
        </div>
        <div className="actions">
          <button onClick={() => void bootstrap()} disabled={isLoading}>{isLoading ? "刷新中..." : "刷新总账"}</button>
          <button onClick={() => setShowCreate(true)}>新增费用</button>
        </div>
      </div>

      <div className="filters">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索费用名称/备注" />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)}>
          {approvals.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <div className="summary-grid">
        <div className="summary-card"><span>当月支出</span><strong>¥{monthTotal.toFixed(2)}</strong></div>
        <div className="summary-card"><span>筛选合计</span><strong>¥{yearlyTotal.toFixed(2)}</strong></div>
        <div className="summary-card"><span>审批待处理</span><strong>{pendingCount}</strong></div>
        <div className="summary-card"><span>记录数</span><strong>{filtered.length}</strong></div>
      </div>

      <div className="split-layout">
        <div className="list-panel">
          {filtered.map((item) => (
            <button key={item.id} type="button" className={`list-row ${selectedId === item.id ? "active" : ""}`} onClick={() => setSelectedId(item.id)}>
              <div>
                <div className="row-title">{item.title}</div>
                <div className="muted small">{item.costCategory ?? "未分类"} · {item.costDetail ?? "未设置"}</div>
                <div className="muted small">{item.expenseDate ? new Date(item.expenseDate).toLocaleDateString() : "-"}</div>
              </div>
              <div className="row-right">
                <strong>¥{item.amountLocal.toFixed(2)}</strong>
                <span className="muted small">{item.approvalStatus ?? "未设置"}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="detail-panel">
          {!selected ? (
            <div className="empty">请选择一条费用记录</div>
          ) : (
            <>
              <h3>{selected.title}</h3>
              <p className="muted">{selected.costCategory ?? "未分类"} · {selected.costDetail ?? "未设置"}</p>
              <div className="detail-grid">
                <div><span className="muted small">费用日期</span><div>{selected.expenseDate ? new Date(selected.expenseDate).toLocaleDateString() : "-"}</div></div>
                <div><span className="muted small">归属期</span><div>{selected.periodStart ? `${selected.periodStart} ~ ${selected.periodEnd ?? selected.periodStart}` : "-"}</div></div>
                <div><span className="muted small">原始金额</span><div>¥{selected.amountOriginal.toFixed(2)}</div></div>
                <div><span className="muted small">计入金额</span><div>¥{selected.amountLocal.toFixed(2)}</div></div>
                <div><span className="muted small">成本性质</span><div>{selected.costNature ?? "-"}</div></div>
                <div><span className="muted small">成本归属</span><div>{selected.costOwnership ?? "-"}</div></div>
                <div><span className="muted small">承担主体</span><div>{selected.costBearer ?? "-"}</div></div>
                <div><span className="muted small">审批状态</span><div>{selected.approvalStatus ?? "-"}</div></div>
                <div><span className="muted small">支付方式</span><div>{selected.paymentMethod ?? "-"}</div></div>
                <div><span className="muted small">发票类型</span><div>{selected.invoiceType ?? "-"}</div></div>
              </div>
              <h4>备注</h4>
              <p>{selected.note || "-"}</p>
            </>
          )}
        </div>
      </div>

      {showCreate ? (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>新增费用</h3>
            <div className="form-grid two-col">
              <label>费用名称<input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} /></label>
              <label>金额<input type="number" value={draft.amount} onChange={(e) => setDraft((p) => ({ ...p, amount: Number(e.target.value || 0) }))} /></label>
              <label>费用日期<input type="date" value={draft.expenseDate} onChange={(e) => setDraft((p) => ({ ...p, expenseDate: e.target.value }))} /></label>
              <label>成本计入方式
                <select value={draft.inputMode} onChange={(e) => setDraft((p) => ({ ...p, inputMode: e.target.value as CostInputMode }))}>
                  {inputModes.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>成本大类<input value={draft.costCategory} onChange={(e) => setDraft((p) => ({ ...p, costCategory: e.target.value }))} /></label>
              <label>成本明细<input value={draft.costDetail} onChange={(e) => setDraft((p) => ({ ...p, costDetail: e.target.value }))} /></label>
              <label>成本性质<input value={draft.costNature} onChange={(e) => setDraft((p) => ({ ...p, costNature: e.target.value }))} /></label>
              <label>成本归属<input value={draft.costOwnership} onChange={(e) => setDraft((p) => ({ ...p, costOwnership: e.target.value }))} /></label>
              <label>承担主体<input value={draft.costBearer} onChange={(e) => setDraft((p) => ({ ...p, costBearer: e.target.value }))} /></label>
              <label>审批状态<input value={draft.approvalStatus} onChange={(e) => setDraft((p) => ({ ...p, approvalStatus: e.target.value }))} /></label>
              <label>归属开始<input type="date" value={draft.periodStart || ""} onChange={(e) => setDraft((p) => ({ ...p, periodStart: e.target.value }))} /></label>
              <label>归属结束<input type="date" value={draft.periodEnd || ""} onChange={(e) => setDraft((p) => ({ ...p, periodEnd: e.target.value }))} /></label>
              <label>支付方式<input value={draft.paymentMethod || ""} onChange={(e) => setDraft((p) => ({ ...p, paymentMethod: e.target.value }))} /></label>
              <label>发票类型<input value={draft.invoiceType || ""} onChange={(e) => setDraft((p) => ({ ...p, invoiceType: e.target.value }))} /></label>
              <label>关联项目
                <select value={draft.selectedProjectId || ""} onChange={(e) => setDraft((p) => ({ ...p, selectedProjectId: e.target.value }))}>
                  <option value="">不关联</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              <label>关联供应商
                <select value={draft.selectedSupplierId || ""} onChange={(e) => setDraft((p) => ({ ...p, selectedSupplierId: e.target.value }))}>
                  <option value="">不关联</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select>
              </label>
            </div>

            <label>备注
              <input value={draft.note || ""} onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))} />
            </label>

            <p className="muted small">预估月均成本：¥{amortized.toFixed(2)}</p>

            <div className="actions">
              <button onClick={() => setShowCreate(false)}>取消</button>
              <button onClick={() => void handleCreate()} disabled={isSaving || !draft.title.trim()}>
                {isSaving ? "写入中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="ok">{success}</p> : null}
    </section>
  );
}

function parseDate(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function monthToken(date?: Date): string | undefined {
  if (!date) return undefined;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function previewAmount(input: NewLedgerExpenseInput): number {
  if (input.inputMode === "一次性计入") return input.amount;

  if (input.inputMode === "按月摊销") {
    const start = parseDate(input.periodStart || undefined);
    const end = parseDate(input.periodEnd || undefined);
    if (start && end) {
      const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1);
      return input.amount / months;
    }
    return input.amount;
  }

  return input.amount / 12;
}
