import { db } from "../lib/api/provider";
import type {
  NewSubscriptionInput,
  SubscriptionRecord,
  SubscriptionStatus,
} from "../lib/types/subscription";
import { calculateNextBillingDate } from "./billingDateCalculator";

export async function fetchSubscriptions(): Promise<SubscriptionRecord[]> {
  return (await db.aggregate(`
    SELECT id,
           name,
           service_version as "serviceVersion",
           service_area as "serviceArea",
           status,
           start_date as "startDate",
           description,
           software_version as "softwareVersion",
           download_url as "downloadUrl",
           note,
           price,
           currency,
           billing_cycle as "billingCycle",
           cost_sub_category as "costSubCategory",
           last_payment_date as "lastPaymentDate",
           next_billing_date as "nextBillingDate",
           monthly_equivalent as "monthlyEquivalent",
           yearly_equivalent as "yearlyEquivalent"
    FROM subscriptions
    ORDER BY next_billing_date ASC
  `)) as unknown as SubscriptionRecord[];
}

export async function updateSubscriptionStatus(
  id: string,
  status: SubscriptionStatus,
): Promise<void> {
  await db.update("subscriptions", id, { status });
}

export async function createSubscription(input: NewSubscriptionInput): Promise<void> {
  const nextBilling = calculateNextBillingDate(input.paymentDate, input.billingCycle);

  await db.insert("subscriptions", {
    name: input.toolName,
    service_version: input.serviceVersion,
    service_area: input.serviceArea,
    status: "服役中",
    start_date: input.paymentDate,
    description: input.description ?? null,
    software_version: input.softwareVersion ?? null,
    download_url: input.downloadUrl ?? null,
    note: input.note ?? null,
    price: input.amount,
    currency: input.currency,
    billing_cycle: input.billingCycle,
    cost_sub_category: input.subCategory,
    last_payment_date: input.paymentDate,
    next_billing_date: nextBilling,
    monthly_equivalent: computeMonthly(input.billingCycle, input.amount),
    yearly_equivalent: computeYearly(input.billingCycle, input.amount),
  });

  await db.insert("ledger_expenses", {
    title: `${input.toolName} 订阅`,
    expense_date: input.paymentDate,
    amount_original: input.amount,
    amount_local: input.amount,
    cost_category: "订阅服务",
    cost_detail: input.subCategory,
  });
}

function computeMonthly(cycle: string, price: number): number {
  switch (cycle) {
    case "月度付费":
      return price;
    case "季度付费":
      return price / 3;
    case "半年付费":
      return price / 6;
    case "年度付费":
      return price / 12;
    default:
      return 0;
  }
}

function computeYearly(cycle: string, price: number): number {
  switch (cycle) {
    case "月度付费":
      return price * 12;
    case "季度付费":
      return price * 4;
    case "半年付费":
      return price * 2;
    case "年度付费":
      return price;
    case "版本买断":
      return price;
    default:
      return 0;
  }
}
