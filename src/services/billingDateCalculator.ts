import type { BillingCycle } from "../lib/types/subscription";

const CYCLE_MONTHS: Record<BillingCycle, number | null> = {
  月度付费: 1,
  季度付费: 3,
  半年付费: 6,
  年度付费: 12,
  版本买断: null,
  免费版本: null
};

function addMonths(source: Date, months: number): Date {
  const next = new Date(source);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function calculateNextBillingDate(lastPaymentISO: string | undefined, cycle: BillingCycle): string | undefined {
  if (!lastPaymentISO) return undefined;

  const step = CYCLE_MONTHS[cycle];
  if (!step) return undefined;

  const base = new Date(lastPaymentISO);
  if (Number.isNaN(base.getTime())) return undefined;

  const now = new Date();
  let candidate = addMonths(base, step);

  while (candidate < now) {
    candidate = addMonths(candidate, step);
  }

  return candidate.toISOString();
}

export function daysUntil(isoDate: string | undefined): number | undefined {
  if (!isoDate) return undefined;
  const next = new Date(isoDate);
  if (Number.isNaN(next.getTime())) return undefined;

  const diffMs = next.getTime() - Date.now();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
