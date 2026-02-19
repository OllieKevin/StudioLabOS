export interface QuoteOption {
  id: string;
  name: string;
}

export interface QuoteLineItem {
  id: string;
  itemName: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface QuoteDraft {
  title: string;
  quoteNumber: string;
  version: string;
  currency: string;
  primaryColor: string;
  headerIndexLabel: string;
  headerItemLabel: string;
  headerQtyLabel: string;
  headerRateLabel: string;
  headerAmountLabel: string;
  issuerName: string;
  issuerAddress: string;
  taxRate: number;
  issueDate: string;
  dueDate: string;
  terms: string;
  notes: string;
  selectedClientId?: string;
  selectedProjectId?: string;
  lineItems: QuoteLineItem[];
}

export function emptyQuoteDraft(): QuoteDraft {
  const today = new Date();
  const due = new Date();
  due.setDate(today.getDate() + 15);

  return {
    title: "",
    quoteNumber: "",
    version: "V1",
    currency: "CNY",
    primaryColor: "#232323",
    headerIndexLabel: "#",
    headerItemLabel: "Item & Description",
    headerQtyLabel: "QTY",
    headerRateLabel: "Rate",
    headerAmountLabel: "Amount",
    issuerName: "MixarStudio",
    issuerAddress: "Shanghai, China",
    taxRate: 6,
    issueDate: today.toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
    terms: "30%预付款，交付前付清尾款",
    notes: "报价确认后开始排期。",
    lineItems: [
      {
        id: crypto.randomUUID(),
        itemName: "创意与制作服务",
        description: "按项目里程碑执行",
        quantity: 1,
        rate: 0
      }
    ]
  };
}

export function quoteSubtotal(draft: QuoteDraft): number {
  return draft.lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
}

export function quoteTax(draft: QuoteDraft): number {
  return quoteSubtotal(draft) * (draft.taxRate / 100);
}

export function quoteTotal(draft: QuoteDraft): number {
  return quoteSubtotal(draft) + quoteTax(draft);
}
