import type { SubscriptionRecord } from "../lib/types/subscription";
import { daysUntil } from "./billingDateCalculator";

const NOTIFIED_KEY = "subscription_notification_state_v1";

type NotificationState = Record<string, number>;

export async function scheduleRenewalNotifications(subscriptions: SubscriptionRecord[]): Promise<void> {
  if (typeof Notification === "undefined") return;

  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      return;
    }
  }
  if (Notification.permission !== "granted") return;

  const state = loadState();
  const now = Date.now();

  for (const item of subscriptions) {
    if (item.status !== "服役中" || !item.nextBillingDate) continue;

    const days = daysUntil(item.nextBillingDate);
    if (typeof days !== "number" || days < 0 || days > 3) continue;

    const dayLabel = item.nextBillingDate.slice(0, 10);
    const notifyKey = `${item.id}:${dayLabel}`;
    const lastTs = state[notifyKey] ?? 0;
    if (now - lastTs < 12 * 60 * 60 * 1000) continue;

    new Notification("订阅即将续费", {
      body: `${item.name} 将于 ${new Date(item.nextBillingDate).toLocaleDateString()} 扣费 ¥${item.price.toFixed(2)}`
    });
    state[notifyKey] = now;
  }

  saveState(state);
}

function loadState(): NotificationState {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as NotificationState;
  } catch {
    return {};
  }
}

function saveState(state: NotificationState): void {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(state));
}
