import { useEffect, useMemo, useState } from "react";
import AdobePhotoshop from "@icon-park/react/es/icons/AdobePhotoshop";
import Apple from "@icon-park/react/es/icons/Apple";
import ApplicationMenu from "@icon-park/react/es/icons/ApplicationMenu";
import Asterisk from "@icon-park/react/es/icons/Asterisk";
import BookOne from "@icon-park/react/es/icons/BookOne";
import CloudStorage from "@icon-park/react/es/icons/CloudStorage";
import Figma from "@icon-park/react/es/icons/Figma";
import Github from "@icon-park/react/es/icons/Github";
import Google from "@icon-park/react/es/icons/Google";
import FindOne from "@icon-park/react/es/icons/FindOne";
import AddOne from "@icon-park/react/es/icons/AddOne";
import LoadingOne from "@icon-park/react/es/icons/LoadingOne";
import World from "@icon-park/react/es/icons/World";
import type { BillingCycle, NewSubscriptionInput, SubscriptionRecord, SubscriptionStatus } from "../lib/types/subscription";
import { daysUntil } from "../services/billingDateCalculator";
import { useFilteredSubscriptions, useSubscriptionStore } from "../stores/useSubscriptionStore";
import { getUiPreferences } from "../lib/ui/preferences";
import type { ComponentType, CSSProperties, PointerEvent as ReactPointerEvent } from "react";

type PeriodKey = "day" | "week" | "month" | "year";
type ViewMode = "总览" | "分栏" | "日历" | "趋势";

const STATUS_OPTIONS = ["全部", "服役中", "暂停使用", "Done"] as const;
const VIEW_OPTIONS: ViewMode[] = ["总览", "分栏", "日历", "趋势"];
const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string }> = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" }
];
const CYCLE_OPTIONS: BillingCycle[] = ["月度付费", "季度付费", "半年付费", "年度付费", "版本买断", "免费版本"];

const defaultDraft = (): NewSubscriptionInput => ({
  toolName: "",
  serviceVersion: "月度订阅",
  serviceArea: "内容生产",
  amount: 0,
  billingCycle: "月度付费",
  paymentDate: new Date().toISOString().slice(0, 10),
  subCategory: "生产力工具",
  currency: "CNY",
  description: "",
  softwareVersion: "",
  downloadUrl: "",
  note: ""
});

export default function SubscriptionPage() {
  const store = useSubscriptionStore();
  const filtered = useFilteredSubscriptions();
  const [view, setView] = useState<ViewMode>("总览");
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [currency, setCurrency] = useState("CNY ¥");
  const [showCreate, setShowCreate] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [draft, setDraft] = useState<NewSubscriptionInput>(defaultDraft);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [motionIntensity, setMotionIntensity] = useState(() => getUiPreferences().motionIntensity);

  useEffect(() => {
    void store.sync();
  }, [store.sync]);

  useEffect(() => {
    const syncPrefs = () => {
      setMotionIntensity(getUiPreferences().motionIntensity);
    };
    window.addEventListener("mixarlab:ui-prefs-updated", syncPrefs);
    window.addEventListener("storage", syncPrefs);
    return () => {
      window.removeEventListener("mixarlab:ui-prefs-updated", syncPrefs);
      window.removeEventListener("storage", syncPrefs);
    };
  }, []);

  const selected = useMemo(() => {
    if (!store.selectedId) return undefined;
    return filtered.find((item) => item.id === store.selectedId) ?? store.items.find((item) => item.id === store.selectedId);
  }, [filtered, store.items, store.selectedId]);

  useEffect(() => {
    if (!selected && filtered.length > 0) {
      store.select(filtered[0].id);
    }
  }, [filtered, selected, store.select]);

  const uniqueAreas = useMemo(() => {
    const set = new Set(store.items.map((item) => item.serviceArea).filter(Boolean));
    return ["全部", ...Array.from(set).sort()];
  }, [store.items]);

  const uniqueCycles = useMemo(() => {
    const set = new Set(store.items.map((item) => item.billingCycle).filter(Boolean));
    return ["全部", ...Array.from(set).sort()];
  }, [store.items]);

  const overview = useMemo(() => {
    const active = store.items.filter((item) => item.status === "服役中");
    const paused = store.items.filter((item) => item.status === "暂停使用");
    const done = store.items.filter((item) => item.status === "Done");
    const monthlyTotal = active.reduce((sum, item) => sum + item.monthlyEquivalent, 0);
    const yearlyTotal = active.reduce((sum, item) => sum + item.yearlyEquivalent, 0);
    const growth = monthlyTotal > 0 ? 8.7 : 0;

    return {
      activeCount: active.length,
      pausedCount: paused.length,
      doneCount: done.length,
      monthlyTotal,
      yearlyTotal,
      growth
    };
  }, [store.items]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, { amount: number; items: SubscriptionRecord[] }>();
    for (const item of filtered) {
      const key = item.serviceArea || "未分类";
      const current = map.get(key) ?? { amount: 0, items: [] };
      current.amount += item.monthlyEquivalent;
      current.items.push(item);
      map.set(key, current);
    }

    const rows = Array.from(map.entries())
      .map(([category, payload]) => ({ category, amount: payload.amount, items: payload.items }))
      .sort((a, b) => b.amount - a.amount);

    return rows;
  }, [filtered]);

  useEffect(() => {
    if (!selectedCategory && categoryStats.length > 0) {
      setSelectedCategory(categoryStats[0].category);
    }
    if (selectedCategory && !categoryStats.find((item) => item.category === selectedCategory)) {
      setSelectedCategory(categoryStats[0]?.category ?? "");
    }
  }, [categoryStats, selectedCategory]);

  const selectedCategoryDetail = useMemo(
    () => categoryStats.find((item) => item.category === selectedCategory),
    [categoryStats, selectedCategory]
  );

  const upcoming = useMemo(
    () =>
      filtered
        .filter((item) => Boolean(item.nextBillingDate))
        .sort((a, b) => (a.nextBillingDate ?? "9999") > (b.nextBillingDate ?? "9999") ? 1 : -1),
    [filtered]
  );

  const recentActive = useMemo(
    () =>
      [...store.items]
        .filter((item) => item.status === "服役中")
        .sort((a, b) => (a.startDate ?? "1900-01-01") > (b.startDate ?? "1900-01-01") ? -1 : 1)
        .slice(0, 4),
    [store.items]
  );

  const upcomingRenewals = useMemo(
    () =>
      [...store.items]
        .filter((item) => item.status === "服役中")
        .filter((item) => {
          const days = daysUntil(item.nextBillingDate);
          return typeof days === "number" && days >= 0 && days <= 30;
        })
        .sort((a, b) => (a.nextBillingDate ?? "9999") > (b.nextBillingDate ?? "9999") ? 1 : -1)
        .slice(0, 4),
    [store.items]
  );

  const trendMonths = useMemo(() => buildTrendMonths(filtered), [filtered]);

  const handleCreate = async () => {
    await store.createSubscription(draft);
    const latest = useSubscriptionStore.getState();
    if (!latest.error) {
      setShowCreate(false);
      setDraft(defaultDraft());
    }
  };

  const openInspectorFor = (id: string) => {
    store.select(id);
    setInspectorOpen(true);
  };

  return (
    <section className="panel overlay-host compact-ui">
      <div className="panel-header">
        <div>
          <h2>软件订阅管理</h2>
          <p className="muted">参考 SubList 的聚合看板 + 卡片化管理 + 详情分栏</p>
        </div>
        <div className="actions">
          <button disabled={store.isSyncing} onClick={() => void store.sync()}>
            <LoadingOne
              theme="outline"
              size={16}
              fill="currentColor"
              className={store.isSyncing ? "spin-icon" : ""}
            />
            {store.isSyncing ? "同步中..." : "刷新同步"}
          </button>
          <button onClick={() => setShowCreate(true)}>
            <AddOne theme="outline" size={16} fill="currentColor" />
            新增订阅
          </button>
        </div>
      </div>

      <div className="sub-toolbar">
        <div className="segmented">
          {PERIOD_OPTIONS.map((item) => (
            <button key={item.key} className={period === item.key ? "active-pill" : ""} onClick={() => setPeriod(item.key)}>{item.label}</button>
          ))}
        </div>

        <div className="segmented">
          {VIEW_OPTIONS.map((mode) => (
            <button
              key={mode}
              className={view === mode ? "active-pill" : ""}
              onClick={() => {
                setView(mode);
                if (mode !== "分栏") {
                  setInspectorOpen(false);
                }
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="CNY ¥">CNY ¥</option>
          <option value="USD $">USD $</option>
        </select>
      </div>

      <div className="filters">
        <label className="search-input">
          <FindOne theme="outline" size={16} fill="currentColor" />
          <input placeholder="搜索工具名称 / 描述" value={store.filters.keyword} onChange={(e) => store.setFilters({ keyword: e.target.value })} />
        </label>
        <select value={store.filters.status} onChange={(e) => store.setFilters({ status: e.target.value as typeof STATUS_OPTIONS[number] })}>
          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select value={store.filters.area} onChange={(e) => store.setFilters({ area: e.target.value })}>
          {uniqueAreas.map((area) => <option key={area} value={area}>{area}</option>)}
        </select>
        <select value={store.filters.cycle} onChange={(e) => store.setFilters({ cycle: e.target.value })}>
          {uniqueCycles.map((cycle) => <option key={cycle} value={cycle}>{cycle}</option>)}
        </select>
      </div>

      <div className="summary-grid">
        <div className="summary-card"><span>月度支出</span><strong>{formatCurrency(overview.monthlyTotal, currency)}</strong></div>
        <div className="summary-card"><span>年度支出</span><strong>{formatCurrency(overview.yearlyTotal, currency)}</strong></div>
        <div className="summary-card"><span>活跃订阅</span><strong>{overview.activeCount}</strong></div>
        <div className="summary-card"><span>总订阅数</span><strong>{store.items.length}</strong></div>
      </div>

      {view === "总览" ? (
        <div className="sub-insight-grid">
          <div className="detail-panel sub-insight-card">
            <h3>最近订阅</h3>
            <div className="form-grid">
              {recentActive.length === 0 ? <p className="muted small">暂无活跃订阅</p> : null}
              {recentActive.map((item) => (
                <button key={item.id} type="button" className="sub-mini-row" onClick={() => openInspectorFor(item.id)}>
                  <div className="sub-avatar">
                    <SubscriptionIcon name={item.name} size={16} />
                  </div>
                  <div className="sub-mini-main">
                    <div className="row-title">{item.name}</div>
                    <div className="muted small">{item.startDate ? `开始于 ${new Date(item.startDate).toLocaleDateString()}` : item.serviceArea}</div>
                  </div>
                  <div className="sub-mini-amount">{formatCurrency(item.price, currency)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="detail-panel sub-insight-card">
            <h3>即将续费（30天）</h3>
            <div className="form-grid">
              {upcomingRenewals.length === 0 ? <p className="muted small">未来30天无续费</p> : null}
              {upcomingRenewals.map((item) => (
                <button key={item.id} type="button" className="sub-mini-row" onClick={() => openInspectorFor(item.id)}>
                  <div className="sub-avatar">
                    <SubscriptionIcon name={item.name} size={16} />
                  </div>
                  <div className="sub-mini-main">
                    <div className="row-title">{item.name}</div>
                    <div className="muted small">{item.nextBillingDate ? `到期 ${new Date(item.nextBillingDate).toLocaleDateString()}` : "未设置到期"}</div>
                  </div>
                  <div className="sub-mini-amount">{formatCurrency(item.price, currency)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="detail-panel sub-insight-card">
            <h3>MRR 增长趋势</h3>
            <div className="sub-growth-main">{formatCurrency(overview.monthlyTotal, currency)}</div>
            <p className="muted small">当前月度经常性支出</p>
            <div className="sub-growth-grid">
              <div><strong>{overview.activeCount}</strong><span>活跃</span></div>
              <div><strong>{overview.pausedCount}</strong><span>暂停</span></div>
              <div><strong>{overview.doneCount}</strong><span>Done</span></div>
            </div>
            <div className="sub-growth-tag">+{overview.growth.toFixed(1)}% 环比</div>
          </div>
        </div>
      ) : null}

      {view === "总览" ? (
        <>
      <div className="sub-cards-grid">
        {filtered.map((item) => (
          <SubscriptionCard
            key={item.id}
            item={item}
            selected={store.selectedId === item.id}
            onClick={() => openInspectorFor(item.id)}
            currency={currency}
            glowStrength={motionIntensity / 100}
          />
        ))}
      </div>

          <div className="sub-breakdown-grid">
            <div className="detail-panel">
              <h3>Category breakdown</h3>
              <div className="form-grid">
                {categoryStats.map((row) => {
                  const max = Math.max(...categoryStats.map((item) => item.amount), 1);
                  const ratio = (row.amount / max) * 100;
                  return (
                    <button key={row.category} type="button" className={`area-row area-button ${selectedCategory === row.category ? "active" : ""}`} onClick={() => setSelectedCategory(row.category)}>
                      <span>{row.category}</span>
                      <div className="area-meter"><div className="area-meter-fill" style={{ width: `${ratio}%` }} /></div>
                      <span>{formatCurrency(row.amount, currency)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="detail-panel sub-floating-panel">
              <h3>{selectedCategoryDetail?.category ?? "Category"}</h3>
              <p className="muted">{formatCurrency(selectedCategoryDetail?.amount ?? 0, currency)}</p>
              <div className="form-grid">
                {selectedCategoryDetail?.items.slice(0, 5).map((item) => (
                  <div key={item.id} className="list-row compact">
                    <div>
                      <div className="row-title">{item.name}</div>
                      <div className="muted small">{item.billingCycle} · {item.serviceArea}</div>
                    </div>
                    <strong>{formatCurrency(item.price, currency)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {view === "分栏" ? (
        <div className="sub-list-layout">
          <div className="list-panel">
            {filtered.map((item) => (
              <SubscriptionCard
                key={item.id}
                item={item}
                selected={store.selectedId === item.id}
                onClick={() => openInspectorFor(item.id)}
                currency={currency}
                glowStrength={motionIntensity / 100}
                compact
              />
            ))}
          </div>
        </div>
      ) : null}

      {inspectorOpen ? (
        <div className="inspector-overlay" onClick={() => setInspectorOpen(false)}>
          <aside className="inspector-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="inspector-header">
              <div>
                <h3>订阅详情</h3>
                <p className="muted small">可快速更新订阅状态</p>
              </div>
              <button className="inspector-close" onClick={() => setInspectorOpen(false)}>关闭</button>
            </div>

            <div className="inspector-body">
              {!selected ? (
                <div className="empty">选择一条订阅查看详情</div>
              ) : (
                <>
                  <div className="sub-detail-head">
                    <div className="sub-avatar lg">
                      <SubscriptionIcon name={selected.name} size={32} />
                    </div>
                    <div>
                      <h3>{selected.name}</h3>
                      <p className="muted">{selected.billingCycle} · {selected.serviceArea}</p>
                    </div>
                  </div>

                  <table className="table sub-detail-table">
                    <tbody>
                      <tr><td>Amount</td><td>{formatCurrency(selected.price, currency)}</td></tr>
                      <tr><td>Billing Cycle</td><td>{selected.billingCycle}</td></tr>
                      <tr><td>Category</td><td>{selected.serviceArea}</td></tr>
                      <tr><td>Status</td><td>{selected.status}</td></tr>
                      <tr><td>Start Date</td><td>{selected.startDate ? new Date(selected.startDate).toLocaleDateString() : "-"}</td></tr>
                      <tr><td>Next Due</td><td>{selected.nextBillingDate ? new Date(selected.nextBillingDate).toLocaleDateString() : "-"}</td></tr>
                      <tr><td>Total Spent(估算)</td><td>{formatCurrency(estimateTotalSpent(selected), currency)}</td></tr>
                      <tr><td>Website</td><td>{selected.downloadUrl ? <a href={selected.downloadUrl} target="_blank" rel="noreferrer">{selected.downloadUrl}</a> : "-"}</td></tr>
                    </tbody>
                  </table>

                  <div className="actions">
                    <button disabled={store.isSaving || selected.status === "服役中"} onClick={() => void store.updateStatus(selected.id, "服役中" as SubscriptionStatus)}>恢复</button>
                    <button disabled={store.isSaving || selected.status === "暂停使用"} onClick={() => void store.updateStatus(selected.id, "暂停使用" as SubscriptionStatus)}>暂停</button>
                    <button disabled={store.isSaving || selected.status === "Done"} onClick={() => void store.updateStatus(selected.id, "Done" as SubscriptionStatus)}>归档</button>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {view === "日历" ? (
        <div className="detail-panel">
          <h3>扣款日历</h3>
          {upcoming.length === 0 ? (
            <p className="muted">没有可计算扣款日期的订阅。</p>
          ) : (
            <div className="calendar-grid">
              {groupByMonth(upcoming).map((month) => (
                <div key={month.monthKey} className="calendar-month">
                  <h4>{month.monthLabel}</h4>
                  {month.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="calendar-row"
                      onClick={() => {
                        openInspectorFor(item.id);
                      }}
                    >
                      <span>{new Date(item.nextBillingDate ?? "").toLocaleDateString()} · {item.name}</span>
                      <strong>{formatCurrency(item.price, currency)}</strong>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {view === "趋势" ? (
        <div className="split-layout">
          <div className="detail-panel">
            <h3>近12个月支出趋势</h3>
            <div className="trend-bars">
              {trendMonths.map((bucket) => (
                <div key={bucket.key} className="trend-item">
                  <div className="trend-bar" style={{ height: `${bucket.height}px` }} title={`${bucket.label}: ${formatCurrency(bucket.value, currency)}`} />
                  <span className="muted small">{bucket.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-panel">
            <h3>类别占比（月均）</h3>
            <div className="form-grid">
              {categoryStats.map((row) => {
                const max = Math.max(...categoryStats.map((item) => item.amount), 1);
                const ratio = (row.amount / max) * 100;
                return (
                  <div key={row.category} className="area-row">
                    <div>
                      <div>{row.category}</div>
                      <div className="muted small">{formatCurrency(row.amount, currency)} / 月</div>
                    </div>
                    <div className="area-meter"><div className="area-meter-fill" style={{ width: `${ratio}%` }} /></div>
                    <div className="muted small">{ratio.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {store.error ? <p className="error">{store.error}</p> : null}
      {store.success ? <p className="ok">{store.success}</p> : null}

      {showCreate ? (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>新增订阅</h3>
            <div className="form-grid two-col">
              <label>工具名称<input value={draft.toolName} onChange={(e) => setDraft((prev) => ({ ...prev, toolName: e.target.value }))} /></label>
              <label>服务版本<input value={draft.serviceVersion} onChange={(e) => setDraft((prev) => ({ ...prev, serviceVersion: e.target.value }))} /></label>
              <label>服务方向<input value={draft.serviceArea} onChange={(e) => setDraft((prev) => ({ ...prev, serviceArea: e.target.value }))} /></label>
              <label>金额<input type="number" value={draft.amount} onChange={(e) => setDraft((prev) => ({ ...prev, amount: Number(e.target.value || 0) }))} /></label>
              <label>计费周期
                <select value={draft.billingCycle} onChange={(e) => setDraft((prev) => ({ ...prev, billingCycle: e.target.value as BillingCycle }))}>
                  {CYCLE_OPTIONS.map((cycle) => <option key={cycle} value={cycle}>{cycle}</option>)}
                </select>
              </label>
              <label>付款日期<input type="date" value={draft.paymentDate} onChange={(e) => setDraft((prev) => ({ ...prev, paymentDate: e.target.value }))} /></label>
              <label>订阅分类<input value={draft.subCategory} onChange={(e) => setDraft((prev) => ({ ...prev, subCategory: e.target.value }))} /></label>
              <label>下载链接<input value={draft.downloadUrl ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, downloadUrl: e.target.value }))} /></label>
              <label>描述<input value={draft.description ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} /></label>
              <label>备注<input value={draft.note ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))} /></label>
            </div>
            <div className="actions">
              <button onClick={() => setShowCreate(false)}>取消</button>
              <button onClick={() => void handleCreate()} disabled={store.isSaving || !draft.toolName.trim()}>
                {store.isSaving ? "创建中..." : "创建订阅"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SubscriptionCard({
  item,
  selected,
  onClick,
  currency,
  glowStrength,
  compact
}: {
  item: SubscriptionRecord;
  selected: boolean;
  onClick: () => void;
  currency: string;
  glowStrength: number;
  compact?: boolean;
}) {
  const dueText = item.nextBillingDate ? new Date(item.nextBillingDate).toLocaleDateString() : "None";
  const dueDays = daysUntil(item.nextBillingDate);
  const tone = toneClass(item.serviceArea);
  const glowStyle: CSSProperties = {
    "--glow-strength": String(Math.max(0, Math.min(1, glowStrength)))
  } as CSSProperties;

  return (
    <button
      type="button"
      className={`sub-card ${tone} ${selected ? "selected" : ""} ${compact ? "compact" : ""}`}
      style={glowStyle}
      onClick={onClick}
      onPointerEnter={(event) => setCardHoverState(event.currentTarget, true)}
      onPointerMove={updateCardGlowPosition}
      onPointerLeave={(event) => setCardHoverState(event.currentTarget, false)}
    >
      <div className="sub-card-head">
        <div className="sub-avatar">
          <SubscriptionIcon name={item.name} size={18} />
        </div>
        <div>
          <div className="row-title">{item.name}</div>
          <div className="muted">{cycleLabel(item.billingCycle)} · {item.serviceArea}</div>
        </div>
      </div>
      <div className="sub-price">{formatCurrency(item.price, currency)}</div>
      <div className="sub-card-foot">
        <span className={`status ${statusClass(item.status)}`}>{item.status}</span>
        <span className={typeof dueDays === "number" && dueDays <= 7 ? "warning-text" : "muted"}>{dueText}</span>
      </div>
    </button>
  );
}

function setCardHoverState(target: HTMLButtonElement, isHovering: boolean): void {
  target.style.setProperty("--hover", isHovering ? "1" : "0");
}

function updateCardGlowPosition(event: ReactPointerEvent<HTMLButtonElement>): void {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  event.currentTarget.style.setProperty("--mx", `${x}px`);
  event.currentTarget.style.setProperty("--my", `${y}px`);
}

function statusClass(status: SubscriptionStatus): string {
  if (status === "服役中") return "status-active";
  if (status === "暂停使用") return "status-paused";
  return "status-done";
}

function formatCurrency(value: number, currency: string): string {
  const symbol = currency.includes("USD") ? "$" : "¥";
  return `${symbol}${value.toFixed(2)}`;
}

function cycleLabel(cycle: BillingCycle): string {
  if (cycle === "年度付费") return "annual";
  if (cycle === "月度付费") return "monthly";
  if (cycle === "季度付费") return "quarterly";
  if (cycle === "半年付费") return "semiannual";
  if (cycle === "免费版本") return "free";
  return "lifetime";
}

function toneClass(area: string): string {
  if (area.includes("内容") || area.includes("生产")) return "tone-blue";
  if (area.includes("运营")) return "tone-pink";
  if (area.includes("执行")) return "tone-green";
  return "tone-neutral";
}

function resolveIconType(name: string): ComponentType<{
  theme?: "outline" | "filled" | "two-tone" | "multi-color";
  size?: number;
  fill?: string | string[];
  strokeWidth?: number;
}> {
  const lower = name.toLowerCase();
  if (lower.includes("apple") || lower.includes("icloud")) return Apple;
  if (lower.includes("openai") || lower.includes("chatgpt") || lower.includes("claude")) return Asterisk;
  if (lower.includes("google") || lower.includes("gemini")) return Google;
  if (lower.includes("figma")) return Figma;
  if (lower.includes("github")) return Github;
  if (lower.includes("notion")) return BookOne;
  if (lower.includes("adobe")) return AdobePhotoshop;
  if (lower.includes("midjourney")) return World;
  if (lower.includes("cloud")) return CloudStorage;
  return ApplicationMenu;
}

function SubscriptionIcon({ name, size }: { name: string; size: number }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoSlug = resolveSelfhstSlug(name);

  if (logoSlug && !logoFailed) {
    return (
      <img
        src={`/logos/subscriptions/${logoSlug}.svg`}
        alt={name}
        width={size}
        height={size}
        className="sub-logo"
        onError={() => setLogoFailed(true)}
      />
    );
  }

  const IconComp = resolveIconType(name);
  return <IconComp theme="filled" size={size} fill="currentColor" />;
}

function resolveSelfhstSlug(name: string): string | undefined {
  const lower = name.trim().toLowerCase();
  const aliases: Array<[RegExp, string]> = [
    [/openai|chatgpt/, "openai"],
    [/claude/, "claude"],
    [/github copilot/, "github-copilot"],
    [/github/, "github"],
    [/figma/, "figma"],
    [/framer/, "framer"],
    [/notion/, "notion"],
    [/apple developer/, "apple-developer"],
    [/apple tv/, "apple-tv"],
    [/icloud/, "icloud"],
    [/google ai|gemini/, "gemini"],
    [/midjourney/, "midjourney"],
    [/perplexity/, "perplexity"],
    [/windsurf/, "windsurf"],
    [/x premium|twitter/, "x-twitter"],
    [/adobe after effects|after effects/, "adobe-after-effects"],
    [/davinci/, "davinci-resolve"],
    [/blender/, "blender"],
    [/runway/, "runway"]
  ];

  for (const [rule, slug] of aliases) {
    if (rule.test(lower)) return slug;
  }

  const normalized = lower
    .replaceAll("&", " and ")
    .replaceAll("+", " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || undefined;
}

function estimateTotalSpent(item: SubscriptionRecord): number {
  const startDate = item.startDate ? new Date(item.startDate) : undefined;
  if (!startDate || Number.isNaN(startDate.getTime())) return item.price;

  const now = new Date();
  const months = Math.max(1, (now.getFullYear() - startDate.getFullYear()) * 12 + now.getMonth() - startDate.getMonth() + 1);

  if (item.billingCycle === "月度付费") return item.price * months;
  if (item.billingCycle === "季度付费") return item.price * Math.ceil(months / 3);
  if (item.billingCycle === "半年付费") return item.price * Math.ceil(months / 6);
  if (item.billingCycle === "年度付费") return item.price * Math.ceil(months / 12);
  return item.price;
}

function groupByMonth(items: Array<{ id: string; name: string; price: number; nextBillingDate?: string }>) {
  const map = new Map<string, Array<{ id: string; name: string; price: number; nextBillingDate?: string }>>();
  for (const item of items) {
    if (!item.nextBillingDate) continue;
    const date = new Date(item.nextBillingDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(monthKey)) map.set(monthKey, []);
    map.get(monthKey)?.push(item);
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0] > b[0] ? 1 : -1)
    .map(([monthKey, monthItems]) => ({
      monthKey,
      monthLabel: new Date(`${monthKey}-01`).toLocaleDateString(undefined, { year: "numeric", month: "long" }),
      items: monthItems.sort((a, b) => (a.nextBillingDate ?? "9999") > (b.nextBillingDate ?? "9999") ? 1 : -1)
    }));
}

function buildTrendMonths(items: Array<{ lastPaymentDate?: string; price: number }>) {
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const map = new Map(monthKeys.map((key) => [key, 0]));
  for (const item of items) {
    if (!item.lastPaymentDate) continue;
    const d = new Date(item.lastPaymentDate);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) ?? 0) + item.price);
  }

  const values = Array.from(map.values());
  const max = Math.max(...values, 1);

  return Array.from(map.entries()).map(([key, value]) => ({
    key,
    value,
    height: Math.max(8, Math.round((value / max) * 160)),
    label: key.slice(5)
  }));
}
