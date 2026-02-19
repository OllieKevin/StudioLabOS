import { create } from "zustand";
import type { QuoteDraft, QuoteLineItem, QuoteOption } from "../lib/types/quote";
import { emptyQuoteDraft } from "../lib/types/quote";
import {
  createQuoteRecord,
  loadQuoteOptions,
  suggestQuoteNumber,
  suggestQuoteVersion,
} from "../services/quoteService";

type State = {
  draft: QuoteDraft;
  clients: QuoteOption[];
  projects: QuoteOption[];
  isLoading: boolean;
  isSaving: boolean;
  error?: string;
  success?: string;
  bootstrap: () => Promise<void>;
  setField: <K extends keyof QuoteDraft>(key: K, value: QuoteDraft[K]) => void;
  addLine: () => void;
  removeLine: (id: string) => void;
  updateLine: (id: string, patch: Partial<QuoteLineItem>) => void;
  suggestNumbers: () => Promise<void>;
  save: () => Promise<void>;
};

export const useQuoteStore = create<State>((set, get) => ({
  draft: emptyQuoteDraft(),
  clients: [],
  projects: [],
  isLoading: false,
  isSaving: false,
  error: undefined,
  success: undefined,

  async bootstrap() {
    set({ isLoading: true, error: undefined });
    try {
      const options = await loadQuoteOptions();
      set({ clients: options.clients, projects: options.projects, isLoading: false });
      await get().suggestNumbers();
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "报价模块加载失败",
      });
    }
  },

  setField(key, value) {
    set({ draft: { ...get().draft, [key]: value } });
  },

  addLine() {
    const next: QuoteLineItem = {
      id: crypto.randomUUID(),
      itemName: "",
      description: "",
      quantity: 1,
      rate: 0,
    };
    set({ draft: { ...get().draft, lineItems: [...get().draft.lineItems, next] } });
  },

  removeLine(id) {
    set({
      draft: {
        ...get().draft,
        lineItems: get().draft.lineItems.filter((item) => item.id !== id),
      },
    });
  },

  updateLine(id, patch) {
    set({
      draft: {
        ...get().draft,
        lineItems: get().draft.lineItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      },
    });
  },

  async suggestNumbers() {
    try {
      const number = await suggestQuoteNumber("MX");
      const version = await suggestQuoteVersion(get().draft.selectedProjectId);
      set({ draft: { ...get().draft, quoteNumber: number, version } });
    } catch {
      // non-blocking
    }
  },

  async save() {
    set({ isSaving: true, error: undefined, success: undefined });
    try {
      await createQuoteRecord(get().draft);
      set({ isSaving: false, success: "报价已保存" });
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "报价保存失败",
      });
    }
  },
}));
