import { create } from "zustand";
import type {
  NewSubscriptionInput,
  SubscriptionRecord,
  SubscriptionStatus,
} from "../lib/types/subscription";
import {
  createSubscription,
  fetchSubscriptions,
  updateSubscriptionStatus,
} from "../services/subscriptionService";

type FilterState = {
  keyword: string;
  status: "全部" | "服役中" | "暂停使用" | "Done";
  area: string;
  cycle: string;
};

type State = {
  items: SubscriptionRecord[];
  selectedId?: string;
  filters: FilterState;
  isSyncing: boolean;
  isSaving: boolean;
  error?: string;
  success?: string;
  sync: () => Promise<void>;
  select: (id?: string) => void;
  setFilters: (next: Partial<FilterState>) => void;
  updateStatus: (id: string, status: SubscriptionStatus) => Promise<void>;
  createSubscription: (input: NewSubscriptionInput) => Promise<void>;
};

export const useSubscriptionStore = create<State>((set, get) => ({
  items: [],
  selectedId: undefined,
  filters: {
    keyword: "",
    status: "全部",
    area: "全部",
    cycle: "全部",
  },
  isSyncing: false,
  isSaving: false,
  error: undefined,
  success: undefined,

  async sync() {
    set({ isSyncing: true, error: undefined, success: undefined });
    try {
      const items = await fetchSubscriptions();
      set({
        items,
        selectedId: get().selectedId ?? items[0]?.id,
        isSyncing: false,
      });
    } catch (error) {
      set({
        isSyncing: false,
        error: error instanceof Error ? error.message : "数据加载失败",
      });
    }
  },

  select(id) {
    set({ selectedId: id });
  },

  setFilters(next) {
    set({ filters: { ...get().filters, ...next } });
  },

  async updateStatus(id, status) {
    set({ isSaving: true, error: undefined, success: undefined });
    try {
      await updateSubscriptionStatus(id, status);
      set({ isSaving: false, success: "状态已更新" });
      await get().sync();
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "状态更新失败",
      });
    }
  },

  async createSubscription(input) {
    set({ isSaving: true, error: undefined, success: undefined });
    try {
      await createSubscription(input);
      set({ isSaving: false, success: "订阅已创建" });
      await get().sync();
    } catch (error) {
      set({
        isSaving: false,
        error: error instanceof Error ? error.message : "新增失败",
      });
    }
  },
}));

export function useFilteredSubscriptions(): SubscriptionRecord[] {
  const { items, filters } = useSubscriptionStore();
  const keyword = filters.keyword.trim().toLowerCase();

  return items
    .filter((item) => (filters.status === "全部" ? true : item.status === filters.status))
    .filter((item) => (filters.area === "全部" ? true : item.serviceArea === filters.area))
    .filter((item) => (filters.cycle === "全部" ? true : item.billingCycle === filters.cycle))
    .filter((item) => {
      if (!keyword) return true;
      return (
        item.name.toLowerCase().includes(keyword) ||
        (item.description ?? "").toLowerCase().includes(keyword)
      );
    })
    .sort((a, b) => ((a.nextBillingDate ?? "9999") > (b.nextBillingDate ?? "9999") ? 1 : -1));
}
