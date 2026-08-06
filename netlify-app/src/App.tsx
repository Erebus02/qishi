import { useEffect, useState } from "react";
import DashboardClient from "./dashboard-client";
import type { BootstrapData } from "../lib/types";

export default function App() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/bootstrap", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`服务暂时不可用（${response.status}）`);
        return response.json() as Promise<BootstrapData>;
      })
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "数据加载失败"));
  }, []);

  if (error) return <main className="startup-state"><div><b>ModelFlow</b><h1>暂时无法连接数据服务</h1><p>{error}</p><button onClick={() => window.location.reload()}>重新加载</button></div></main>;
  if (!data) return <main className="startup-state"><div><b>ModelFlow</b><h1>正在打开设备工作台</h1><p>正在连接设备、版本和审批数据…</p><span className="startup-spinner" /></div></main>;
  return <DashboardClient initialData={data} />;
}
