export interface DigitalAssetRow {
  id: string;
  name: string;
  status: string;
  serviceVersion?: string;
  serviceArea?: string;
  softwareVersion?: string;
  startDate?: string;
  downloadUrl?: string;
  description?: string;
  note?: string;
  ledgerRelationIds: string[];
}

export interface DigitalAssetDetail {
  asset: DigitalAssetRow;
  relatedLedger: Array<{
    id: string;
    title: string;
    amount: number;
    expenseDate?: string;
    costCategory?: string;
  }>;
}
