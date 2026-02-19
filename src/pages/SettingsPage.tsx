import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function SettingsPage() {
  const [message, setMessage] = useState("");

  async function handleExport() {
    try {
      const path = await invoke<string>("db_export_json", {
        path: `mixarlabos_export_${Date.now()}.json`,
      });
      setMessage(`已导出到: ${path}`);
    } catch (error) {
      setMessage(`导出失败: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  async function handleImport() {
    setMessage("导入功能开发中");
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>设置</h2>
          <p className="muted">本版本使用本地 SQLite 数据存储。</p>
        </div>
      </div>

      <div className="detail-panel">
        <h3>数据管理</h3>
        <p className="muted">可导出完整数据库为 JSON 备份文件。</p>
        <div className="actions">
          <button onClick={() => void handleExport()}>导出 JSON</button>
          <button onClick={() => void handleImport()}>导入 JSON</button>
        </div>
        {message ? <p className="ok">{message}</p> : null}
      </div>
    </section>
  );
}
