import { db } from "../lib/sqlite/provider";
import type { DigitalAssetDetail, DigitalAssetRow } from "../lib/types/asset";

type AssetBaseRow = Omit<DigitalAssetRow, "ledgerRelationIds">;

export async function fetchAssets(): Promise<DigitalAssetRow[]> {
  const baseRows = (await db.aggregate(`
    SELECT id, name, status,
           service_version as "serviceVersion",
           service_area as "serviceArea",
           software_version as "softwareVersion",
           start_date as "startDate",
           download_url as "downloadUrl",
           description,
           note
    FROM digital_assets
    ORDER BY name ASC
  `)) as unknown as AssetBaseRow[];

  return Promise.all(
    baseRows.map(async (row) => ({
      ...row,
      ledgerRelationIds: await db.getLinked("asset_ledger_links", "asset_id", row.id),
    })),
  );
}

export async function fetchAssetDetail(assetId: string): Promise<DigitalAssetDetail> {
  const assets = await fetchAssets();
  const asset = assets.find((item) => item.id === assetId);
  if (!asset) throw new Error("未找到数字资产");

  const ledgerIds = asset.ledgerRelationIds;
  let relatedLedger: DigitalAssetDetail["relatedLedger"] = [];

  if (ledgerIds.length > 0) {
    const placeholders = ledgerIds.map(() => "?").join(", ");
    relatedLedger = (await db.aggregate(
      `SELECT
         id,
         title,
         amount_local as "amount",
         expense_date as "expenseDate",
         cost_category as "costCategory"
       FROM ledger_expenses
       WHERE id IN (${placeholders})
       ORDER BY expense_date DESC`,
      ledgerIds,
    )) as unknown as DigitalAssetDetail["relatedLedger"];
  }

  return { asset, relatedLedger };
}

export function filterAssets(
  items: DigitalAssetRow[],
  keyword: string,
  status: string,
  area: string,
): DigitalAssetRow[] {
  const key = keyword.trim().toLowerCase();
  return items
    .filter((item) => (status === "全部" ? true : item.status === status))
    .filter((item) => (area === "全部" ? true : item.serviceArea === area))
    .filter((item) => {
      if (!key) return true;
      return (
        item.name.toLowerCase().includes(key) ||
        (item.description ?? "").toLowerCase().includes(key)
      );
    });
}
