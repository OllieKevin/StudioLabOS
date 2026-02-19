# Notion Schema Mapping (Baseline)

## Databases
- Projects: `866807dd6bf74909b1c5f525abcb9ae6`
- Clients: `cf542cea-dc8b-4e66-9982-9ea444ee20b1`
- Contracts: `2648414b-4346-8003-b4b7-000bd88e08c5`
- Ledger: b661ad8c-0f3e-4895-a763-daa132597670
- Subscription Assets: 2d18414b-4346-805a-b9fb-f0f56968c7f4
- Tasks: `7608774f-280a-4be3-aec1-65d920e29383`
- Meetings: `1b5ef857-1f95-4324-9005-3554b1dad348`

## Subscription Fields
### Assets
- Name (title)
- 服务版本 (select)
- Area 服务方向 (select)
- 使用状态 (status/select)
- 使用时间 (date)
- Description (rich_text)
- 软件版本 (rich_text)
- Download URL (url)
- PhotoCover (files)
- 备注描述 (rich_text)
- 财务总账记录 (relation)

### Ledger
- 项目明细/费用名称 (title)
- 原始金额/金额 (number)
- 付款日期/费用日期 (date)
- 支付版本/成本计入方式 (select)
- 月度费用/月均成本 (formula/number)
- 年度费用 (formula/number)
- 成本明细/成本子类别 (select)
