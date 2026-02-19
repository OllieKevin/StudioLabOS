import { useRef, useState, type ChangeEvent } from "react";

type ImportResult = {
  ok: boolean;
  mode?: string;
  counts?: Record<string, number>;
};

export default function SettingsPage() {
  const [message, setMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setMessage("");

    try {
      const res = await fetch("/api/db/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `mixarlabos_export_${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);

      setMessage("导出成功");
    } catch (error) {
      setMessage(`导出失败: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  function triggerImport() {
    const confirmed = window.confirm("导入将覆盖当前全部数据，是否继续？");
    if (!confirmed) {
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsImporting(true);
    setMessage("");

    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;

      const res = await fetch("/api/db/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: json }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const result = (await res.json()) as ImportResult;
      if (!result.ok) {
        throw new Error("导入失败");
      }

      const total = Object.values(result.counts ?? {}).reduce((sum, value) => sum + value, 0);
      setMessage(`导入成功（全量替换，${total} 条记录）`);
    } catch (error) {
      setMessage(`导入失败: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>设置</h2>
          <p className="muted">本版本使用服务端 SQLite 数据存储。</p>
        </div>
      </div>

      <div className="detail-panel">
        <h3>数据管理</h3>
        <p className="muted">可导出完整数据库 JSON 备份，也可导入并全量替换现有数据。</p>
        <div className="actions">
          <button onClick={() => void handleExport()}>导出 JSON</button>
          <button onClick={triggerImport} disabled={isImporting}>{isImporting ? "导入中..." : "导入 JSON"}</button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(event) => {
            void handleImportFile(event);
          }}
        />
        {message ? <p className="ok">{message}</p> : null}
      </div>
    </section>
  );
}
