import { useEffect, useMemo } from "react";
import type { QuoteDraft, QuoteLineItem } from "../lib/types/quote";
import { quoteSubtotal, quoteTax, quoteTotal } from "../lib/types/quote";
import { useQuoteStore } from "../stores/useQuoteStore";

export default function QuoteCenterPage() {
  const store = useQuoteStore();

  useEffect(() => {
    void store.bootstrap();
  }, []);

  const subtotal = quoteSubtotal(store.draft);
  const tax = quoteTax(store.draft);
  const total = quoteTotal(store.draft);

  const selectedClient = useMemo(
    () => store.clients.find((item) => item.id === store.draft.selectedClientId)?.name ?? "未指定客户",
    [store.clients, store.draft.selectedClientId]
  );
  const selectedProject = useMemo(
    () => store.projects.find((item) => item.id === store.draft.selectedProjectId)?.name ?? "未指定项目",
    [store.projects, store.draft.selectedProjectId]
  );

  const exportPdf = () => {
    const html = renderQuotePrintHtml(store.draft, selectedClient, selectedProject);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.srcdoc = html;

    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => {
        iframe.remove();
      }, 1500);
    };
  };

  return (
    <section className="panel quote-panel">
      <div className="panel-header">
        <div>
          <h2>报价中心</h2>
          <p className="muted">Invoice Details + Preview（实时预览、PDF 导出、保存）</p>
        </div>
        <div className="actions">
          <button onClick={() => void store.suggestNumbers()}>刷新编号</button>
          <button onClick={exportPdf}>导出 PDF</button>
          <button onClick={() => void store.save()} disabled={store.isSaving}>
            {store.isSaving ? "保存中..." : "保存报价"}
          </button>
        </div>
      </div>

      <div className="quote-shell">
        <div className="quote-editor-card">
          <h3 className="quote-card-title">Invoice Details</h3>

          <div className="quote-field">
            <label className="quote-label quote-required">Customer</label>
            <select value={store.draft.selectedClientId ?? ""} onChange={(e) => store.setField("selectedClientId", e.target.value || undefined)}>
              <option value="">未选择</option>
              {store.clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div className="quote-field">
            <label className="quote-label quote-required">Billing Address</label>
            <input value={store.draft.issuerAddress} onChange={(e) => store.setField("issuerAddress", e.target.value)} placeholder="客户地址或账单地址" />
          </div>

          <div className="quote-row-3">
            <div className="quote-field">
              <label className="quote-label quote-required">Issue Date</label>
              <input type="date" value={store.draft.issueDate} onChange={(e) => store.setField("issueDate", e.target.value)} />
            </div>
            <div className="quote-field">
              <label className="quote-label quote-required">Due Date</label>
              <input type="date" value={store.draft.dueDate} onChange={(e) => store.setField("dueDate", e.target.value)} />
            </div>
            <div className="quote-field">
              <label className="quote-label quote-required">Payment Terms</label>
              <input value={store.draft.terms} onChange={(e) => store.setField("terms", e.target.value)} placeholder="Net 14 / 30%预付款..." />
            </div>
          </div>

          <div className="quote-field">
            <label className="quote-label quote-required">Items Details</label>
            <div className="quote-items-header" style={{ background: store.draft.primaryColor }}>
              <input
                className="quote-header-input"
                value={store.draft.headerIndexLabel}
                onChange={(e) => store.setField("headerIndexLabel", e.target.value)}
              />
              <input
                className="quote-header-input"
                value={store.draft.headerItemLabel}
                onChange={(e) => store.setField("headerItemLabel", e.target.value)}
              />
              <input
                className="quote-header-input"
                value={store.draft.headerQtyLabel}
                onChange={(e) => store.setField("headerQtyLabel", e.target.value)}
              />
              <input
                className="quote-header-input"
                value={store.draft.headerRateLabel}
                onChange={(e) => store.setField("headerRateLabel", e.target.value)}
              />
              <input
                className="quote-header-input"
                value={store.draft.headerAmountLabel}
                onChange={(e) => store.setField("headerAmountLabel", e.target.value)}
              />
              <span />
            </div>
            <div className="quote-items-list">
              {store.draft.lineItems.map((item, index) => (
                <LineEditor
                  key={item.id}
                  index={index}
                  currency={store.draft.currency}
                  item={item}
                  onChange={(patch) => store.updateLine(item.id, patch)}
                  onRemove={() => store.removeLine(item.id)}
                />
              ))}
            </div>
            <button type="button" className="quote-add-item" onClick={() => store.addLine()}>+ Add Item</button>
          </div>

          <div className="quote-row-3">
            <div className="quote-field">
              <label className="quote-label">Discount</label>
              <input value={formatMoney(0, store.draft.currency)} readOnly />
            </div>
            <div className="quote-field">
              <label className="quote-label quote-required">Tax (PPN {store.draft.taxRate.toFixed(0)}%)</label>
              <input value={formatMoney(tax, store.draft.currency)} readOnly />
            </div>
            <div className="quote-field">
              <label className="quote-label quote-required">Total</label>
              <input value={formatMoney(total, store.draft.currency)} readOnly />
            </div>
          </div>

          <div className="quote-field">
            <label className="quote-label quote-required">Notes to Customer</label>
            <textarea rows={3} value={store.draft.notes} onChange={(e) => store.setField("notes", e.target.value)} />
          </div>

          <div className="quote-row-3">
            <div className="quote-field">
              <label className="quote-label">Invoice Name</label>
              <input value={store.draft.title} onChange={(e) => store.setField("title", e.target.value)} />
            </div>
            <div className="quote-field">
              <label className="quote-label">Quote Number</label>
              <input value={store.draft.quoteNumber} onChange={(e) => store.setField("quoteNumber", e.target.value)} />
            </div>
            <div className="quote-field">
              <label className="quote-label">Version</label>
              <input value={store.draft.version} onChange={(e) => store.setField("version", e.target.value)} />
            </div>
          </div>

          <div className="quote-theme-row">
            <div className="quote-field">
              <label className="quote-label">Invoice Theme Color</label>
              <div className="quote-theme-control">
                <span className="quote-theme-chip" style={{ background: store.draft.primaryColor }} />
                <input type="color" value={store.draft.primaryColor} onChange={(e) => store.setField("primaryColor", e.target.value)} />
                <span className="quote-theme-value">{store.draft.primaryColor.toUpperCase()}</span>
              </div>
            </div>
            <div className="quote-field">
              <label className="quote-label">Currency</label>
              <select value={store.draft.currency} onChange={(e) => store.setField("currency", e.target.value)}>
                <option value="CNY">CNY (¥)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="quote-preview-card">
          <h3 className="quote-card-title">Preview</h3>
          <div className="quote-preview-surface">
            <QuotePreview draft={store.draft} clientName={selectedClient} projectName={selectedProject} subtotal={subtotal} tax={tax} total={total} />
          </div>
        </div>
      </div>

      {store.error ? <p className="error">{store.error}</p> : null}
      {store.success ? <p className="ok">{store.success}</p> : null}
    </section>
  );
}

function LineEditor({
  index,
  currency,
  item,
  onChange,
  onRemove
}: {
  index: number;
  currency: string;
  item: QuoteLineItem;
  onChange: (patch: Partial<QuoteLineItem>) => void;
  onRemove: () => void;
}) {
  const amount = item.quantity * item.rate;
  return (
    <div className="quote-line-block">
      <div className="quote-line-grid">
        <div className="quote-line-index">{index + 1}</div>
        <div className="quote-line-item-cell">
          <input value={item.itemName} placeholder="Item name" onChange={(e) => onChange({ itemName: e.target.value })} />
          <input value={item.description} placeholder="Description" onChange={(e) => onChange({ description: e.target.value })} />
        </div>
        <input type="number" value={item.quantity} onChange={(e) => onChange({ quantity: Number(e.target.value || 0) })} />
        <input type="number" value={item.rate} onChange={(e) => onChange({ rate: Number(e.target.value || 0) })} />
        <div className="quote-line-amount">{formatMoney(amount, currency)}</div>
        <button type="button" className="quote-line-remove" onClick={onRemove}>✕</button>
      </div>
    </div>
  );
}

function QuotePreview({
  draft,
  clientName,
  projectName,
  subtotal,
  tax,
  total
}: {
  draft: QuoteDraft;
  clientName: string;
  projectName: string;
  subtotal: number;
  tax: number;
  total: number;
}) {
  const invoiceHeading = draft.title.trim() || "INVOICE";

  return (
    <div className="invoice-paper quote-preview-paper">
      <div className="invoice-top">
        <div>
          <div className="invoice-logo" style={{ background: draft.primaryColor }}>
            {draft.issuerName.slice(0, 1).toUpperCase()}
          </div>
          <h3 style={{ color: draft.primaryColor }}>{draft.issuerName}</h3>
          <p>{draft.issuerAddress || "-"}</p>
        </div>
        <div className="invoice-right">
          <h1 style={{ color: draft.primaryColor }}>{invoiceHeading}</h1>
          <strong>#{draft.quoteNumber || "-"}</strong>
          <div className="invoice-total">{formatMoney(total, draft.currency)}</div>
        </div>
      </div>

      <div className="invoice-meta">
        <div>
          <h4>Billed By</h4>
          <p>{draft.issuerName || "-"}</p>
          <p>{draft.issuerAddress || "-"}</p>
          <h4 style={{ marginTop: 12 }}>Bill To</h4>
          <p>{clientName}</p>
          <p>{projectName}</p>
        </div>
        <div>
          <p><strong>Invoice Date:</strong> {formatDate(draft.issueDate)}</p>
          <p><strong>Due Date:</strong> {formatDate(draft.dueDate)}</p>
          <p><strong>Terms:</strong> {draft.terms}</p>
        </div>
      </div>

      <table className="table invoice-table">
        <thead>
          <tr style={{ background: draft.primaryColor, color: "#fff" }}>
            <th>{draft.headerIndexLabel || "#"}</th>
            <th>{draft.headerItemLabel || "Item & Description"}</th>
            <th>{draft.headerQtyLabel || "Qty"}</th>
            <th>{draft.headerRateLabel || "Rate"}</th>
            <th>{draft.headerAmountLabel || "Amount"}</th>
          </tr>
        </thead>
        <tbody>
          {draft.lineItems.map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              <td>
                <div>{item.itemName || "未命名条目"}</div>
                <div className="muted small">{item.description || "-"}</div>
              </td>
              <td>{item.quantity}</td>
              <td>{formatMoney(item.rate, draft.currency)}</td>
              <td>{formatMoney(item.quantity * item.rate, draft.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-summary">
        <p><span>Sub Total</span><strong>{formatMoney(subtotal, draft.currency)}</strong></p>
        <p><span>Tax Rate</span><strong>{draft.taxRate.toFixed(2)}%</strong></p>
        <p className="total"><span>Total</span><strong>{formatMoney(total, draft.currency)}</strong></p>
      </div>

      <div className="invoice-footer">
        <h4>Notes</h4>
        <p>{draft.notes || "-"}</p>
      </div>
    </div>
  );
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function renderQuotePrintHtml(draft: QuoteDraft, clientName: string, projectName: string): string {
  const subtotal = quoteSubtotal(draft);
  const tax = quoteTax(draft);
  const total = quoteTotal(draft);
  const invoiceHeading = escapeHtml(draft.title.trim() || "INVOICE");

  const rows = draft.lineItems
    .map((item, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div>${escapeHtml(item.itemName || "未命名条目")}</div>
            <div style="color:#667085;font-size:12px;">${escapeHtml(item.description || "-")}</div>
          </td>
          <td>${item.quantity}</td>
          <td>${formatMoney(item.rate, draft.currency)}</td>
          <td>${formatMoney(item.quantity * item.rate, draft.currency)}</td>
        </tr>
      `;
    })
    .join("\n");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(draft.quoteNumber || "报价单")}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; color: #111827; }
    .top { display:flex; justify-content:space-between; align-items:flex-start; }
    .logo { width:72px; height:72px; border-radius:50%; background:${draft.primaryColor}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:34px; font-weight:700; }
    h1 { margin:0; color:${draft.primaryColor}; }
    table { width:100%; border-collapse:collapse; margin-top:18px; }
    th,td { padding:10px; border-bottom:1px solid #e5e7eb; text-align:left; }
    thead tr { background:${draft.primaryColor}; }
    thead th { color:#fff; }
    .meta { display:flex; justify-content:space-between; margin:20px 0; }
    .sum { margin-top:20px; width:300px; margin-left:auto; }
    .sum p { display:flex; justify-content:space-between; }
    .sum .total { font-size:20px; font-weight:700; }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <div class="logo">${escapeHtml(draft.issuerName.slice(0, 1).toUpperCase())}</div>
      <h2 style="color:${draft.primaryColor}">${escapeHtml(draft.issuerName)}</h2>
      <div>${escapeHtml(draft.issuerAddress)}</div>
    </div>
    <div style="text-align:right;">
      <h1>${invoiceHeading}</h1>
      <div><strong>#${escapeHtml(draft.quoteNumber || "-")}</strong></div>
      <div style="font-size:32px;font-weight:700;margin-top:8px;">${formatMoney(total, draft.currency)}</div>
    </div>
  </div>

  <div class="meta">
    <div>
      <h3>Bill To</h3>
      <div>${escapeHtml(clientName)}</div>
      <div>${escapeHtml(projectName)}</div>
    </div>
    <div>
      <div><strong>Invoice Date:</strong> ${escapeHtml(formatDate(draft.issueDate))}</div>
      <div><strong>Due Date:</strong> ${escapeHtml(formatDate(draft.dueDate))}</div>
      <div><strong>Terms:</strong> ${escapeHtml(draft.terms)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${escapeHtml(draft.headerIndexLabel || "#")}</th>
        <th>${escapeHtml(draft.headerItemLabel || "Item & Description")}</th>
        <th>${escapeHtml(draft.headerQtyLabel || "Qty")}</th>
        <th>${escapeHtml(draft.headerRateLabel || "Rate")}</th>
        <th>${escapeHtml(draft.headerAmountLabel || "Amount")}</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="sum">
    <p><span>Sub Total</span><strong>${formatMoney(subtotal, draft.currency)}</strong></p>
    <p><span>Tax Rate</span><strong>${draft.taxRate.toFixed(2)}%</strong></p>
    <p><span>Tax</span><strong>${formatMoney(tax, draft.currency)}</strong></p>
    <p class="total"><span>Total</span><strong>${formatMoney(total, draft.currency)}</strong></p>
  </div>

  <h3>Notes</h3>
  <p>${escapeHtml(draft.notes || "-")}</p>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(value: number, currency: string): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const currencyCode = normalizeCurrencyCode(currency);

  try {
    return new Intl.NumberFormat(localeForCurrency(currencyCode), {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeValue);
  } catch {
    return `${currencyCode} ${safeValue.toFixed(2)}`;
  }
}

function normalizeCurrencyCode(value: string): string {
  const normalized = value.trim().toUpperCase().split(/\s+/)[0] ?? "CNY";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "CNY";
}

function localeForCurrency(currencyCode: string): string {
  if (currencyCode === "CNY") return "zh-CN";
  if (currencyCode === "USD") return "en-US";
  if (currencyCode === "EUR") return "de-DE";
  return "en-US";
}
