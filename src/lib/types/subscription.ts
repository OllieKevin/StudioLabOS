export type SubscriptionStatus = "服役中" | "暂停使用" | "Done";

export type BillingCycle =
  | "月度付费"
  | "季度付费"
  | "半年付费"
  | "年度付费"
  | "版本买断"
  | "免费版本";

export interface SubscriptionRecord {
  id: string;
  name: string;
  serviceVersion: string;
  serviceArea: string;
  status: SubscriptionStatus;
  startDate?: string;
  description?: string;
  softwareVersion?: string;
  downloadUrl?: string;
  note?: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  costSubCategory?: string;
  lastPaymentDate?: string;
  nextBillingDate?: string;
  monthlyEquivalent: number;
  yearlyEquivalent: number;
}

export interface NewSubscriptionInput {
  toolName: string;
  serviceVersion: string;
  serviceArea: string;
  amount: number;
  billingCycle: BillingCycle;
  paymentDate: string;
  subCategory: string;
  currency: string;
  description?: string;
  softwareVersion?: string;
  downloadUrl?: string;
  note?: string;
}
