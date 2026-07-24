"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { BootstrapData, DeviceRecord } from "../lib/types";
import {
  Activity,
  Archive,
  Bell,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileBox,
  FileCog,
  FileText,
  FilePenLine,
  Filter,
  Grid2X2,
  History,
  LayoutDashboard,
  List,
  Menu,
  PackageOpen,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  UserCog,
  X,
  Zap,
} from "lucide-react";

type NavKey =
  | "dashboard"
  | "devices"
  | "models"
  | "versions"
  | "changes"
  | "bom"
  | "approvals"
  | "permissions"
  | "logs";

type Device = DeviceRecord;
type NewDevicePayload = { code: string; name: string; projectCode: string; category: string; lifecycleStatus: string; description: string };
type NewVersionPayload = { versionNo: string; title: string; summary: string; copyFiles: boolean; copyBom: boolean };
type ChangeOrder = {
  id: string; order_no: string; batch_no: string; title: string; reason: string; description: string;
  priority: string; planned_at: string | null; status: string; applicant_name: string; reviewer_name: string | null;
  device_count: number; devices: string; created_at: string;
};

const navItems = [
  { key: "dashboard" as const, label: "工作台", icon: LayoutDashboard },
  { key: "devices" as const, label: "设备管理", icon: Boxes },
  { key: "models" as const, label: "模型文件", icon: FileBox },
  { key: "versions" as const, label: "版本中心", icon: History },
  { key: "changes" as const, label: "设备变更", icon: FilePenLine },
  { key: "bom" as const, label: "BOM 管理", icon: PackageOpen },
  { key: "approvals" as const, label: "审批中心", icon: ClipboardCheck, badge: 18 },
  { key: "permissions" as const, label: "权限管理", icon: ShieldCheck },
  { key: "logs" as const, label: "系统日志", icon: Activity },
];

const versions = [
  { version: "V2.3", status: "当前版本", date: "2026-07-20", owner: "张工", summary: "优化视觉定位与上位机联动", color: "green" },
  { version: "V2.2", status: "已取代", date: "2026-06-18", owner: "张工", summary: "完善粉末转运异常报警逻辑", color: "gray" },
  { version: "V2.1", status: "已取代", date: "2026-05-09", owner: "李工", summary: "新增料仓称重与数据采集", color: "gray" },
  { version: "V2.0", status: "已取代", date: "2026-03-22", owner: "李工", summary: "二代结构升级与总装重构", color: "gray" },
];

function StatusTag({ status }: { status: Device["status"] }) {
  return <span className={`status-tag status-${status}`}>{status}</span>;
}

function AppIcon({ children }: { children: React.ReactNode }) {
  return <span className="app-icon">{children}</span>;
}

export default function DashboardClient({ initialData }: { initialData: BootstrapData }) {
  const [devices, setDevices] = useState<Device[]>(initialData.devices);
  const [metrics, setMetrics] = useState(initialData.metrics);
  const [activeNav, setActiveNav] = useState<NavKey>("dashboard");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("全部状态");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<Device | null>(null);
  const [newVersionFor, setNewVersionFor] = useState<Device | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [showNewDevice, setShowNewDevice] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState("");
  const user = initialData.user;
  const can = (permission: string) => user.permissions.includes(permission);

  const filtered = useMemo(() => {
    return devices.filter((device) => {
      const matchesQuery = `${device.name}${device.code}${device.project}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesStatus = status === "全部状态" || device.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [devices, query, status]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const refreshData = async () => {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (!response.ok) return notify("刷新失败，请稍后重试");
    const data = await response.json() as BootstrapData;
    setDevices(data.devices);
    setMetrics(data.metrics);
    notify("数据已从数据库刷新");
  };

  const createDevice = async (payload: NewDevicePayload) => {
    const response = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || "创建设备失败");
    await refreshData();
  };

  const createVersion = async (device: Device, payload: NewVersionPayload) => {
    const response = await fetch(`/api/devices/${device.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || "创建版本失败");
    await refreshData();
  };

  const updateDevice = async (device: Device, payload: { name: string; category: string; lifecycleStatus: string; description: string }) => {
    const response = await fetch(`/api/devices/${device.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, rowVersion: device.rowVersion }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || "更新设备失败");
    setSelected(null); setEditingDevice(null); await refreshData();
  };

  const deleteDevice = async (device: Device) => {
    if (!window.confirm(`确定删除“${device.name}”吗？设备将从列表隐藏，审计记录仍会保留。`)) return;
    const response = await fetch(`/api/devices/${device.id}`, { method: "DELETE" });
    if (!response.ok) { const result = await response.json() as { error?: string }; return notify(result.error || "删除设备失败"); }
    setSelected(null); notify(`${device.name} 已删除`); await refreshData();
  };

  const titleMap: Record<NavKey, { title: string; subtitle: string }> = {
    dashboard: { title: "工作台", subtitle: "掌握设备、版本与审批任务的最新动态" },
    devices: { title: "设备版本管理", subtitle: "集中管理设备及其版本，追溯变更记录，确保数据一致性与可追溯性。" },
    models: { title: "模型文件", subtitle: "统一管理 SolidWorks 模型、工程图与中间格式文件" },
    versions: { title: "版本中心", subtitle: "查看全部设备的版本状态、更新内容与发布记录" },
    changes: { title: "设备变更", subtitle: "选择设备与变更批次，提交变更单并完成审批闭环" },
    bom: { title: "BOM 管理", subtitle: "管理装配层级、零件数量和版本间物料差异" },
    approvals: { title: "审批中心", subtitle: "审核设备版本、更新点和发布资料" },
    permissions: { title: "权限管理", subtitle: "配置角色、功能权限与项目数据范围" },
    logs: { title: "系统日志", subtitle: "追踪关键操作、任务执行与安全事件" },
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${collapsed ? "is-collapsed" : ""}`}>
        <div className="brand-row">
          <button className="icon-button mobile-menu" onClick={() => setCollapsed(!collapsed)} aria-label="切换菜单">
            <Menu size={20} />
          </button>
          {!collapsed && (
            <div className="brand">
              <span className="brand-mark"><Boxes size={20} /></span>
              <span><strong>ModelFlow</strong><small>设备建模管理平台</small></span>
            </div>
          )}
        </div>

        <nav className="main-nav" aria-label="主要导航">
          {navItems.filter((item) => (item.key !== "permissions" || can("role.manage")) && (item.key !== "changes" || can("change.read"))).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={activeNav === item.key ? "active" : ""}
                onClick={() => setActiveNav(item.key)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} strokeWidth={1.8} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge && <b>{item.badge}</b>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
            {!collapsed && <span>收起菜单</span>}
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="top-actions">
            {can("device.create") && <button className="primary-button" onClick={() => setShowNewDevice(true)}>
              <Plus size={18} /> 新建设备 <ChevronDown size={15} />
            </button>}
            <button className="text-button" onClick={() => setActiveNav("models")}><Upload size={18} /> 导入</button>
            <button className="text-button" onClick={() => exportDevices(devices)}><Download size={18} /> 导出</button>
            <button className="text-button" onClick={() => notify("请在设备列表的操作栏选择编辑、创建版本或删除")}><Grid2X2 size={17} /> 批量操作 <ChevronDown size={14} /></button>
            <button className="text-button" onClick={refreshData}><RefreshCw size={17} /> 刷新</button>
          </div>
          <div className="top-right">
            <label className="global-search">
              <Search size={17} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索设备名称、编码、版本号" />
            </label>
            <button className="icon-button notification" aria-label="通知" onClick={() => notify("当前有 8 条待处理提醒，请前往审批中心查看")}><Bell size={19} /><i>8</i></button>
            <button className="profile-button" title={user.email} onClick={() => notify(`${user.displayName} · ${user.roleName}`)}>
              <span>{user.displayName}</span><small>{user.roleName}</small><ChevronDown size={14} />
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-head">
            <div>
              <p className="eyebrow">SOLIDWORKS DATA HUB</p>
              <h1>{titleMap[activeNav].title}</h1>
              <p>{titleMap[activeNav].subtitle}</p>
            </div>
            {activeNav === "devices" && (
              <div className="head-controls">
                <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="状态筛选">
                  <option>全部状态</option><option>已发布</option><option>审批中</option><option>草稿</option>
                </select>
                <select aria-label="分类筛选"><option>全部分类</option><option>热处理设备</option><option>包装检测设备</option></select>
                <div className="view-switch">
                  <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="卡片视图"><Grid2X2 size={17} /></button>
                  <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="列表视图"><List size={18} /></button>
                </div>
              </div>
            )}
          </div>

          {activeNav === "devices" ? (
            <DeviceManager
              devices={filtered}
              view={view}
              query={query}
              setQuery={setQuery}
              onSelect={setSelected}
              onNewVersion={setNewVersionFor}
              onEdit={setEditingDevice}
              onDelete={(device) => void deleteDevice(device)}
              canEdit={can("device.update")}
              canDelete={can("device.delete")}
              notify={notify}
              metrics={metrics}
            />
          ) : (
            <SectionView active={activeNav} devices={devices} metrics={metrics} onDevice={(device) => setSelected(device)} onNavigate={setActiveNav} onNewDevice={() => setShowNewDevice(true)} notify={notify} canApprove={can("change.approve")} canCreate={can("device.create")} />
          )}
        </div>
      </section>

      {selected && <DeviceDetail device={selected} onClose={() => setSelected(null)} onNewVersion={() => setNewVersionFor(selected)} onEdit={() => setEditingDevice(selected)} onDelete={() => void deleteDevice(selected)} canEdit={can("device.update")} canDelete={can("device.delete")} />}
      {newVersionFor && <NewVersionModal device={newVersionFor} onClose={() => setNewVersionFor(null)} onSave={async (payload) => { try { await createVersion(newVersionFor, payload); setNewVersionFor(null); notify(`${newVersionFor.name} 的新版本草稿已写入数据库`); } catch (error) { notify(error instanceof Error ? error.message : "创建版本失败"); } }} />}
      {showNewDevice && <NewDeviceModal onClose={() => setShowNewDevice(false)} onSave={async (payload) => { try { await createDevice(payload); setShowNewDevice(false); notify("新设备已写入数据库"); } catch (error) { notify(error instanceof Error ? error.message : "创建设备失败"); } }} />}
      {editingDevice && <EditDeviceModal device={editingDevice} onClose={() => setEditingDevice(null)} onSave={async (payload) => { try { await updateDevice(editingDevice, payload); notify("设备资料已更新"); } catch (error) { notify(error instanceof Error ? error.message : "更新设备失败"); } }} />}
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </main>
  );
}

function DeviceManager({ devices, view, query, setQuery, onSelect, onNewVersion, onEdit, onDelete, canEdit, canDelete, notify, metrics }: {
  devices: Device[];
  view: "list" | "grid";
  query: string;
  setQuery: (value: string) => void;
  onSelect: (device: Device) => void;
  onNewVersion: (device: Device) => void;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
  canEdit: boolean;
  canDelete: boolean;
  notify: (message: string) => void;
  metrics: BootstrapData["metrics"];
}) {
  return (
    <>
      <section className="metric-grid">
        <Metric icon={<Boxes />} tone="blue" label="设备总数" value={String(metrics.devices)} trend="实时数据" />
        <Metric icon={<FileCog />} tone="teal" label="版本总数" value={String(metrics.versions)} trend="实时数据" />
        <Metric icon={<Check />} tone="orange" label="已发布版本" value={String(metrics.published)} trend="正式基线" />
        <Metric icon={<Clock3 />} tone="purple" label="待审批版本" value={String(metrics.pendingApproval)} trend="待处理" negative={metrics.pendingApproval > 0} />
      </section>

      <section className="device-panel">
        <div className="table-toolbar">
          <label><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="在设备库中搜索" /></label>
          <span>{devices.length} 台设备</span>
          <button onClick={() => notify("请使用页面顶部的状态和分类条件进行筛选")}><Filter size={16} /> 筛选</button>
          <button onClick={() => notify(`当前为${view === "list" ? "列表" : "卡片"}视图，可在右上角切换`)}><SlidersHorizontal size={16} /> 显示设置</button>
        </div>

        {devices.length === 0 ? (
          <div className="empty-state"><Search size={34} /><h3>未找到匹配设备</h3><p>尝试调整关键词或清空状态筛选。</p></div>
        ) : view === "list" ? (
          <div className="device-list">
            <div className="list-head">
              <span>设备</span><span>当前版本</span><span>状态</span><span>负责人</span><span>更新时间</span><span>更新说明</span><span>文件</span><span>操作</span>
            </div>
            {devices.map((device, index) => (
              <article className={`device-row ${index === 0 ? "featured-row" : ""}`} key={device.id}>
                <button className="device-identity" onClick={() => onSelect(device)}>
                  <span className="thumb"><img src={device.image} alt="" /></span>
                  <span><strong>{device.name}</strong><small>{device.code} · {device.category}</small></span>
                </button>
                <button className="version-pill" onClick={() => onSelect(device)}>{device.version}</button>
                <StatusTag status={device.status} />
                <span className="owner"><i>{device.owner.slice(0, 1)}</i>{device.owner}</span>
                <span>{device.updated}</span>
                <span className="change-copy">{device.change}</span>
                <span className="file-count"><FileText size={15} /> {device.files}</span>
                <div className="row-actions">
                  <button className="view-detail" onClick={() => onSelect(device)}>查看详情</button>
                  <button className="icon-button" onClick={() => onNewVersion(device)} title="创建新版本"><Plus size={17} /></button>
                  {canEdit && <button className="icon-button" aria-label={`编辑${device.name}`} title="编辑设备" onClick={() => onEdit(device)}><Pencil size={17} /></button>}
                  {canDelete && <button className="icon-button danger-button" aria-label={`删除${device.name}`} title="删除设备" onClick={() => onDelete(device)}><Trash2 size={17} /></button>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="device-cards">
            {devices.map((device) => (
              <article className="device-card" key={device.id}>
                <div className="card-image"><img src={device.image} alt={`${device.name}缩略图`} /><StatusTag status={device.status} /></div>
                <div className="card-body">
                <div className="card-title"><div><h3>{device.name}</h3><p>{device.code}</p></div>{canEdit && <button className="icon-button" aria-label={`编辑${device.name}`} onClick={() => onEdit(device)}><Pencil size={18} /></button>}</div>
                  <dl><div><dt>当前版本</dt><dd><b>{device.version}</b></dd></div><div><dt>负责人</dt><dd>{device.owner}</dd></div><div><dt>更新时间</dt><dd>{device.updated}</dd></div></dl>
                  <p className="card-change">{device.change}</p>
                  <div className="card-actions"><button onClick={() => onSelect(device)}>查看详情</button>{canEdit && <button onClick={() => onEdit(device)}><Pencil size={15}/>编辑</button>}<button onClick={() => onNewVersion(device)}><Plus size={16} /> 新版本</button></div>
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="pagination"><span>共 {devices.length} 条</span><button disabled><ChevronLeft size={16} /></button><button className="active" disabled>1</button><button disabled><ChevronRight size={16} /></button></div>
      </section>
    </>
  );
}

function Metric({ icon, tone, label, value, trend, negative }: { icon: React.ReactNode; tone: string; label: string; value: string; trend: string; negative?: boolean }) {
  return <article className="metric-card"><AppIcon>{<span className={`metric-icon ${tone}`}>{icon}</span>}</AppIcon><div><p>{label}</p><strong>{value}</strong><small className={negative ? "negative" : ""}>较上月 <b>{trend}</b></small></div></article>;
}

function DeviceDetail({ device, onClose, onNewVersion, onEdit, onDelete, canEdit, canDelete }: { device: Device; onClose: () => void; onNewVersion: () => void; onEdit: () => void; onDelete: () => void; canEdit: boolean; canDelete: boolean }) {
  const [tab, setTab] = useState("概览");
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="detail-sheet">
        <header className="sheet-head"><div><p>设备详情 / {device.code}</p><h2>{device.name}</h2></div><button className="icon-button" aria-label="关闭设备详情" onClick={onClose}><X size={20} /></button></header>
        <div className="object-summary">
          <div className="object-image"><img src={device.image} alt={`${device.name}模型预览`} /><span><Boxes size={16} /> 3D 模型预览</span></div>
          <div className="object-meta">
            <div className="title-line"><h3>{device.code}</h3><span className="version-pill">{device.version}</span><StatusTag status={device.status} /></div>
            <dl>
              <div><dt>所属项目</dt><dd>{device.project}</dd></div><div><dt>设备分类</dt><dd>{device.category}</dd></div>
              <div><dt>负责人</dt><dd>{device.owner}</dd></div><div><dt>更新时间</dt><dd>{device.updated}</dd></div>
              <div><dt>文件数量</dt><dd>{device.files} 个</dd></div><div><dt>BOM 版本</dt><dd>{device.bom}</dd></div>
            </dl>
            <div className="summary-actions"><button className="primary-button" onClick={onNewVersion}><Plus size={17} /> 创建新版本</button>{canEdit && <button onClick={onEdit}><Pencil size={16} /> 编辑设备</button>}<button onClick={() => downloadText(`${device.code}-设备资料.json`, JSON.stringify(device, null, 2))}><Download size={16} /> 下载资料</button>{canDelete && <button className="delete-action" onClick={onDelete}><Trash2 size={16}/>删除设备</button>}</div>
          </div>
        </div>
        <div className="tabs">{["概览", "版本记录", "模型文件", "BOM", "审批记录", "操作日志"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
        <div className="sheet-content">
          {tab === "概览" && <Overview device={device} />}
          {tab === "版本记录" && <VersionTimeline />}
          {tab === "模型文件" && <FileTable />}
          {tab === "BOM" && <BomTable />}
          {tab === "审批记录" && <ApprovalList />}
          {tab === "操作日志" && <AuditList />}
        </div>
      </section>
    </div>
  );
}

function Overview({ device }: { device: Device }) {
  return <div className="overview-grid">
    <section className="info-card"><div className="card-section-head"><h3>当前版本更新点</h3><span>{device.version}</span></div><p className="lead-change">{device.change}</p><ul className="change-list"><li><b className="add">新增</b> 上位机任务状态同步与异常复位流程</li><li><b className="edit">修改</b> 视觉定位标定参数及机械手坐标映射</li><li><b className="check">验证</b> 连续 30 个循环定位误差满足设计要求</li></ul></section>
    <section className="info-card"><div className="card-section-head"><h3>资料完整性</h3><span className="healthy">完整</span></div><div className="progress-ring"><strong>96%</strong><span>资料完整度</span></div><div className="check-grid"><span><Check size={15} />主装配体</span><span><Check size={15} />工程图</span><span><Check size={15} />BOM</span><span><Clock3 size={15} />测试报告待更新</span></div></section>
    <section className="info-card full"><div className="card-section-head"><h3>最近版本</h3></div><VersionTimeline compact /></section>
  </div>;
}

function VersionTimeline({ compact = false }: { compact?: boolean }) {
  return <div className={`version-timeline ${compact ? "compact" : ""}`}>{versions.map((item, index) => <article key={item.version}><i className={item.color}></i><div className="timeline-main"><div><b>{item.version}</b><span>{item.status}</span></div><p>{item.summary}</p></div><div className="timeline-meta"><span>{item.owner}</span><time>{item.date}</time></div>{index < versions.length - 1 && <em />}</article>)}</div>;
}

function FileTable() {
  const files = [["SFN-002_总装.SLDASM", "主装配体", "48.6 MB"], ["SFN-002_机架.SLDPRT", "零件", "12.4 MB"], ["SFN-002_总装图.SLDDRW", "工程图", "8.9 MB"], ["SFN-002_发布图纸.PDF", "发布资料", "5.2 MB"]];
  return <div className="simple-table"><div><b>文件名</b><b>类型</b><b>大小</b><b>状态</b><b>操作</b></div>{files.map((file) => <div key={file[0]}><span><FileCog size={17} />{file[0]}</span><span>{file[1]}</span><span>{file[2]}</span><span className="healthy">已同步</span><button title={`下载${file[0]}`} onClick={() => downloadText(file[0] + ".txt", `ModelFlow 文件记录\n文件：${file[0]}\n类型：${file[1]}\n大小：${file[2]}`)}><Download size={16} /></button></div>)}</div>;
}

function BomTable() {
  const rows = [["SFN-201", "主机架焊接件", "焊接件", "1"], ["SFN-225", "料仓组件", "装配体", "2"], ["MISUMI-HFS8", "铝型材 40×40", "标准件", "18"], ["SMC-CDQ2", "薄型气缸", "外购件", "6"]];
  return <div className="simple-table bom-table"><div><b>物料编码</b><b>名称</b><b>分类</b><b>数量</b><b>版本变化</b></div>{rows.map((row, index) => <div key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong><span>{row[2]}</span><span>{row[3]}</span><span className={index === 1 ? "change-badge" : "muted"}>{index === 1 ? "+1" : "无变化"}</span></div>)}</div>;
}

function ApprovalList() { return <div className="approval-list"><article><CheckCircle2 /><div><b>结构审核通过</b><p>装配关系与工程图版本一致，可以进入发布流程。</p><span>审核人：周工 · 2026-07-20 14:32</span></div></article><article><CheckCircle2 /><div><b>工艺审核通过</b><p>关键参数与现场验证记录完整。</p><span>审核人：陈工 · 2026-07-20 10:18</span></div></article></div>; }
function AuditList() { return <div className="audit-list">{["张工创建版本 V2.3", "系统完成模型重建检查", "周工批准结构审核", "张工发布版本 V2.3"].map((item, index) => <div key={item}><i></i><span><b>{item}</b><small>2026-07-{18 + Math.min(index, 2)} · {9 + index}:2{index}</small></span></div>)}</div>; }

function NewVersionModal({ device, onClose, onSave }: { device: Device; onClose: () => void; onSave: (payload: NewVersionPayload) => Promise<void> }) {
  return <div className="overlay modal-overlay"><form className="modal" onSubmit={async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onSave({ versionNo: String(form.get("versionNo")), title: String(form.get("title")), summary: String(form.get("summary")), copyFiles: form.get("copyFiles") === "on", copyBom: form.get("copyBom") === "on" });
  }}><header><div><p>基于 {device.version} 创建</p><h2>创建新版本</h2></div><button type="button" className="icon-button" aria-label="关闭创建版本窗口" onClick={onClose}><X /></button></header><div className="form-grid"><label>设备<input value={device.name} readOnly /></label><label>升级类型<select><option>次版本更新</option><option>主版本更新</option><option>修订版本</option></select></label><label>新版本号<input name="versionNo" defaultValue={nextVersion(device.version)} required /></label><label>版本负责人<select><option>当前用户</option></select></label><label className="full-field">版本标题<input name="title" placeholder="例如：视觉定位与节拍优化" required /></label><label className="full-field">更新摘要<textarea name="summary" placeholder="说明本版本相对于基准版本的主要变化……" required /></label><label className="check-field"><input name="copyFiles" type="checkbox" defaultChecked />复制基准版本文件</label><label className="check-field"><input name="copyBom" type="checkbox" defaultChecked />复制基准版本 BOM</label></div><footer><button type="button" onClick={onClose}>取消</button><button type="submit" className="primary-button">创建草稿版本</button></footer></form></div>;
}

function NewDeviceModal({ onClose, onSave }: { onClose: () => void; onSave: (payload: NewDevicePayload) => Promise<void> }) {
  return <div className="overlay modal-overlay"><form className="modal" onSubmit={async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onSave({ code: String(form.get("code")), name: String(form.get("name")), projectCode: String(form.get("projectCode")), category: String(form.get("category")), lifecycleStatus: String(form.get("lifecycleStatus")), description: String(form.get("description") || "") });
  }}><header><div><p>DEVICE MASTER DATA</p><h2>新建设备</h2></div><button type="button" className="icon-button" aria-label="关闭新建设备窗口" onClick={onClose}><X /></button></header><div className="form-grid"><label>设备编号<input name="code" placeholder="例如 EQ-NEW-001" required /></label><label>设备名称<input name="name" placeholder="请输入设备名称" required /></label><label>所属项目<select name="projectCode"><option value="PRJ-SFN">厦门 SFN 自动化项目</option><option value="PRJ-HP">氢破炉节能改造</option><option value="PRJ-PACK">检包自动化升级</option></select></label><label>负责人<select><option>当前用户</option></select></label><label>设备分类<select name="category"><option>自动化设备</option><option>热处理设备</option><option>包装检测设备</option></select></label><label>生命周期状态<select name="lifecycleStatus"><option value="designing">设计中</option><option value="testing">测试中</option><option value="active">生产使用中</option></select></label><label className="full-field">设备说明<textarea name="description" placeholder="填写设备用途、关键能力与项目背景……" /></label></div><footer><button type="button" onClick={onClose}>取消</button><button type="submit" className="primary-button">保存设备</button></footer></form></div>;
}

function EditDeviceModal({ device, onClose, onSave }: { device: Device; onClose: () => void; onSave: (payload: { name: string; category: string; lifecycleStatus: string; description: string }) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  return <div className="overlay modal-overlay"><form className="modal" onSubmit={async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true);
    try { await onSave({ name: String(form.get("name")), category: String(form.get("category")), lifecycleStatus: String(form.get("lifecycleStatus")), description: String(form.get("description") || "") }); } finally { setSaving(false); }
  }}><header><div><p>DEVICE MASTER DATA · {device.code}</p><h2>编辑设备</h2></div><button type="button" className="icon-button" aria-label="关闭编辑窗口" onClick={onClose}><X/></button></header><div className="form-grid">
    <label>设备编号<input value={device.code} readOnly title="设备编号创建后不可修改"/></label><label>设备名称<input name="name" defaultValue={device.name} required/></label>
    <label>设备分类<select name="category" defaultValue={device.category}><option>自动化设备</option><option>粉末处理设备</option><option>热处理设备</option><option>包装检测设备</option><option>装配设备</option></select></label>
    <label>生命周期状态<select name="lifecycleStatus" defaultValue={device.lifecycleStatus}><option value="designing">设计中</option><option value="testing">测试中</option><option value="active">生产使用中</option><option value="retired">已停用</option></select></label>
    <label className="full-field">设备说明<textarea name="description" defaultValue={device.description} placeholder="填写设备用途、能力与项目背景"/></label>
  </div><footer><button type="button" onClick={onClose}>取消</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "保存中…" : "保存修改"}</button></footer></form></div>;
}

function nextVersion(version: string) { const [major, minor] = version.replace("V", "").split(".").map(Number); return `V${major}.${minor + 1}`; }

function downloadText(filename: string, content: string) { const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function exportDevices(rows: Device[]) { downloadText(`ModelFlow设备清单-${new Date().toISOString().slice(0, 10)}.csv`, "设备编号,设备名称,当前版本,状态,所属项目,负责人,更新时间\n" + rows.map((d) => [d.code,d.name,d.version,d.status,d.project,d.owner,d.updated].map((v) => `\"${String(v).replaceAll('"','""')}\"`).join(",")).join("\n")); }

function SectionView({ active, devices: currentDevices, metrics, onDevice, onNavigate, onNewDevice, notify, canApprove, canCreate }: { active: NavKey; devices: Device[]; metrics: BootstrapData["metrics"]; onDevice: (device: Device) => void; onNavigate: (key: NavKey) => void; onNewDevice: () => void; notify: (message: string) => void; canApprove: boolean; canCreate: boolean }) {
  if (active === "dashboard") return <Dashboard devices={currentDevices} metrics={metrics} onDevice={onDevice} onNavigate={onNavigate} onNewDevice={onNewDevice} canCreate={canCreate} />;
  if (active === "versions") return <VersionCenter devices={currentDevices} onDevice={onDevice} notify={notify} />;
  if (active === "changes") return <ChangeOrderCenter devices={currentDevices} notify={notify} canApprove={canApprove} />;
  if (active === "permissions") return <PermissionCenter notify={notify} />;
  if (active === "approvals") return <ApprovalCenter notify={notify} />;
  if (active === "models") return <ModelCenter notify={notify} />;
  if (active === "bom") return <BomCenter />;
  return <LogCenter notify={notify} />;
}

function ChangeOrderCenter({ devices, notify, canApprove }: { devices: Device[]; notify: (message: string) => void; canApprove: boolean }) {
  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/change-orders", { cache: "no-store" });
    const result = await response.json() as { changeOrders?: ChangeOrder[]; error?: string };
    setLoading(false);
    if (!response.ok) return notify(result.error || "变更单加载失败");
    setOrders(result.changeOrders || []);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const review = async (id: string, action: "approve" | "reject") => {
    const comment = action === "reject" ? window.prompt("请输入驳回原因") : "批准实施";
    if (action === "reject" && !comment) return;
    const response = await fetch(`/api/change-orders/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, comment }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) return notify(result.error || "审批失败");
    notify(action === "approve" ? "变更申请已批准" : "变更申请已驳回");
    await load();
  };
  const counts = { pending: orders.filter((x) => x.status === "submitted").length, approved: orders.filter((x) => x.status === "approved").length, rejected: orders.filter((x) => x.status === "rejected").length };
  return <>
    <section className="change-center">
      <div className="change-actions"><div><h3>设备变更单</h3><p>按批次选择一台或多台设备，提交后进入审批流程。</p></div><button className="primary-button" onClick={() => setShowForm(true)}><Plus size={17}/>提交变更申请</button></div>
      <div className="change-summary"><div><span>全部变更</span><b>{orders.length}</b></div><div><span>待审批</span><b className="pending">{counts.pending}</b></div><div><span>已批准</span><b className="approved">{counts.approved}</b></div><div><span>已驳回</span><b className="rejected">{counts.rejected}</b></div></div>
      <div className="change-table">
        <div className="change-table-head"><b>变更单号 / 批次</b><b>涉及设备</b><b>变更事项</b><b>申请人</b><b>状态</b><b>申请时间</b><b>操作</b></div>
        {loading ? <div className="change-empty">正在读取变更记录…</div> : orders.length === 0 ? <div className="change-empty"><FilePenLine size={28}/><b>暂无设备变更单</b><span>点击“提交变更申请”发起第一条变更。</span></div> : orders.map((order) => <article key={order.id}>
          <span><strong>{order.order_no}</strong><small>{order.batch_no}</small></span>
          <span title={order.devices}><strong>{order.device_count} 台设备</strong><small>{order.devices}</small></span>
          <span><strong>{order.title}</strong><small>{order.reason}</small></span><span>{order.applicant_name}</span>
          <span><i className={`change-status ${order.status}`}>{changeStatusLabel(order.status)}</i></span><time>{new Date(order.created_at).toLocaleDateString("zh-CN")}</time>
          <span className="change-review">{canApprove && order.status === "submitted" ? <><button onClick={() => void review(order.id, "reject")}>驳回</button><button className="approve" onClick={() => void review(order.id, "approve")}>批准</button></> : <button onClick={() => notify(order.description || "该变更单暂无补充说明")}>查看</button>}</span>
        </article>)}
      </div>
    </section>
    {showForm && <ChangeOrderModal devices={devices} onClose={() => setShowForm(false)} onSubmitted={async (message) => { setShowForm(false); notify(message); await load(); }} />}
  </>;
}

function ChangeOrderModal({ devices, onClose, onSubmitted }: { devices: Device[]; onClose: () => void; onSubmitted: (message: string) => Promise<void> }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  return <div className="overlay modal-overlay"><form className="modal change-modal" onSubmit={async (event) => {
    event.preventDefault();
    if (!selectedIds.length) return window.alert("请至少选择一台设备");
    const form = new FormData(event.currentTarget); setSaving(true);
    const response = await fetch("/api/change-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceIds: selectedIds, batchNo: form.get("batchNo"), title: form.get("title"), reason: form.get("reason"), priority: form.get("priority"), plannedAt: form.get("plannedAt"), description: form.get("description"), submit: true }) });
    const result = await response.json() as { orderNo?: string; error?: string }; setSaving(false);
    if (!response.ok) return window.alert(result.error || "提交失败");
    await onSubmitted(`变更申请 ${result.orderNo} 已提交审批`);
  }}>
    <header><div><p>ENGINEERING CHANGE ORDER</p><h2>提交设备变更申请</h2></div><button type="button" className="icon-button" onClick={onClose}><X/></button></header>
    <div className="change-form-body">
      <div className="form-section-title"><span>1</span><div><b>选择变更设备</b><small>可选择同一批次内的一台或多台设备</small></div><em>已选 {selectedIds.length} 台</em></div>
      <div className="device-picker">{devices.map((device) => <label key={device.id} className={selectedIds.includes(device.id) ? "selected" : ""}><input type="checkbox" checked={selectedIds.includes(device.id)} onChange={() => toggle(device.id)}/><img src={device.image} alt=""/><span><b>{device.name}</b><small>{device.code} · 当前 {device.version}</small></span><i><Check size={14}/></i></label>)}</div>
      <div className="form-section-title"><span>2</span><div><b>填写变更信息</b><small>变更批次和内容将作为审批依据</small></div></div>
      <div className="form-grid change-fields"><label>变更批次<input name="batchNo" placeholder="例如：2026-Q3-02 批" required/></label><label>优先级<select name="priority"><option value="normal">普通</option><option value="high">高</option><option value="urgent">紧急</option></select></label><label className="full-field">变更标题<input name="title" placeholder="概括本批次设备变更" required/></label><label>变更原因<select name="reason" required><option value="">请选择</option><option>设计优化</option><option>客户需求</option><option>质量问题整改</option><option>降本替代</option><option>安全合规</option></select></label><label>计划实施日期<input type="date" name="plannedAt"/></label><label className="full-field">变更内容与影响说明<textarea name="description" placeholder="说明具体改动、涉及模型/BOM、风险、验证与回退方案……" required/></label></div>
    </div>
    <footer><span className="submit-hint"><ShieldCheck size={15}/>提交后将进入审批中心，申请人不可审批自己的变更单</span><button type="button" onClick={onClose}>取消</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "提交中…" : "提交变更申请"}</button></footer>
  </form></div>;
}

function changeStatusLabel(status: string) { return ({ draft: "草稿", submitted: "待审批", approved: "已批准", rejected: "已驳回", implemented: "已实施" } as Record<string, string>)[status] || status; }

function Dashboard({ devices, metrics, onDevice, onNavigate, onNewDevice, canCreate }: { devices: Device[]; metrics: BootstrapData["metrics"]; onDevice: (device: Device) => void; onNavigate: (key: NavKey) => void; onNewDevice: () => void; canCreate: boolean }) {
  const pending = devices.filter((device) => device.status !== "已发布");
  return <div className="user-dashboard">
    <section className="welcome-panel">
      <div><span className="welcome-kicker">今日工作台</span><h2>先处理最重要的设备任务</h2><p>设备、版本和审批集中在一个工作区。你可以从下面的快捷入口开始，也可以直接继续最近的工作。</p></div>
      <div className="welcome-stats"><span><b>{metrics.devices}</b>设备</span><span><b>{metrics.pendingApproval}</b>待审批</span><span><b>{metrics.published}</b>已发布</span></div>
    </section>
    <section className="quick-start" aria-label="快捷操作">
      <header><div><span>快捷开始</span><h3>你今天想完成什么？</h3></div><small>选择一个任务即可进入对应流程</small></header>
      <div>
        {canCreate && <button onClick={onNewDevice}><i className="quick-blue"><Plus /></i><span><b>新建设备</b><small>录入设备基础资料和负责人</small></span><ChevronRight /></button>}
        <button onClick={() => onNavigate("models")}><i className="quick-teal"><Upload /></i><span><b>上传模型</b><small>添加 SolidWorks 模型或工程图</small></span><ChevronRight /></button>
        <button onClick={() => onNavigate("changes")}><i className="quick-purple"><FilePenLine /></i><span><b>发起变更</b><small>选择设备并提交变更申请</small></span><ChevronRight /></button>
        <button onClick={() => onNavigate("approvals")}><i className="quick-orange"><ClipboardCheck /></i><span><b>处理审批</b><small>{metrics.pendingApproval ? `${metrics.pendingApproval} 项等待处理` : "当前没有待审批任务"}</small></span><ChevronRight /></button>
      </div>
    </section>
    <section className="dashboard-card recent-work"><header><div><span>继续工作</span><h3>最近更新的设备</h3></div><button onClick={() => onNavigate("devices")}>查看全部 <ChevronRight size={15}/></button></header>{devices.slice(0,4).map(d => <button key={d.id} onClick={() => onDevice(d)}><img src={d.image} alt="" /><span><b>{d.name}</b><small>{d.change}</small></span><StatusTag status={d.status}/><em>{d.version}</em><ChevronRight /></button>)}</section>
    <section className="dashboard-card pending-work"><header><div><span>需要关注</span><h3>待处理事项</h3></div></header>{pending.length ? pending.slice(0,4).map((d, index) => <button key={d.id} onClick={() => onDevice(d)}><i>{index + 1}</i><span><b>{d.name}</b><small>{d.status} · {d.owner}</small></span><ChevronRight /></button>) : <div className="all-clear"><CheckCircle2/><b>当前事项已处理完毕</b><span>可以继续维护设备资料或创建新版本。</span></div>}</section>
  </div>;
}

function VersionCenter({ devices, onDevice, notify }: { devices: Device[]; onDevice: (device: Device) => void; notify: (message: string) => void }) { return <section className="content-card"><div className="section-toolbar"><label><Search size={17}/><input placeholder="搜索设备或版本" /></label><button onClick={() => notify("可直接输入设备名称或版本号筛选，点击结果查看详情")}><Filter size={16}/>筛选说明</button></div><div className="simple-table version-table"><div><b>设备</b><b>版本</b><b>基准版本</b><b>状态</b><b>更新摘要</b><b>更新时间</b></div>{devices.map((d,i)=><button key={d.id} onClick={()=>onDevice(d)}><span><img src={d.image} alt=""/><strong>{d.name}</strong></span><b>{d.version}</b><span>{i===0?"V2.2":"上一版本"}</span><StatusTag status={d.status}/><span>{d.change}</span><span>{d.updated}</span></button>)}</div></section>; }

function PermissionCenter({ notify }: { notify: (message: string) => void }) { const roles=["系统管理员","项目负责人","设计工程师","审核工程师","生产人员"]; const permissions=["查看授权设备","新增设备","编辑主数据","创建版本","审批版本","发布版本","下载源模型","删除设备"]; return <div className="permission-layout"><aside className="role-list"><header><h3>角色</h3><button onClick={() => notify("自定义角色将在下一阶段开放；当前可配置内置角色")}><Plus size={16}/></button></header>{roles.map((r,i)=><button className={i===2?"active":""} key={r} onClick={() => notify(`已选择角色：${r}`)}><span><UserCog size={17}/>{r}</span><small>{[2,4,12,3,28][i]} 人</small></button>)}</aside><section className="permission-card"><header><div><h3>设计工程师</h3><p>创建和维护负责范围内的设备及草稿版本</p></div><button className="primary-button" onClick={()=>notify("权限配置已保存")}>保存配置</button></header><div className="scope-row"><span>数据范围</span><select><option>参与的项目 + 负责的设备</option><option>所属组织</option><option>全部数据</option></select></div><div className="permission-matrix"><div><b>功能权限</b><b>允许</b><b>仅负责范围</b></div>{permissions.map((p,i)=><div key={p}><span>{p}</span><label><input type="checkbox" defaultChecked={i<7}/><i></i></label><label><input type="checkbox" defaultChecked={i===2||i===3||i===6}/><i></i></label></div>)}</div></section></div>; }

function ApprovalCenter({ notify }: { notify: (message: string) => void }) { return <section className="approval-board"><div className="approval-tabs"><button className="active" onClick={() => notify("正在显示待我审批")}>待我审批 <b>18</b></button><button onClick={() => notify("正在显示我已审批的记录")}>我已审批</button><button onClick={() => notify("正在显示全部流程")}>全部流程</button></div>{devices.filter(d=>d.status!=="已发布").map(d=><article key={d.id}><img src={d.image} alt=""/><div><span>{d.project}</span><h3>{d.name} <b>{d.version}</b></h3><p>{d.change}</p><small>提交人：{d.owner} · {d.updated}</small></div><div><button onClick={()=>notify(`${d.name} 已退回修改`)}>退回</button><button className="primary-button" onClick={()=>notify(`${d.name} 已审批通过`)}><Check size={16}/>批准</button></div></article>)}</section>; }

function ModelCenter({ notify }: { notify: (message: string) => void }) { return <section className="content-card"><input id="model-file-picker" type="file" hidden onChange={(event) => notify(event.target.files?.[0] ? `已选择：${event.target.files[0].name}` : "未选择文件")}/><div className="model-drop" onClick={()=>document.getElementById("model-file-picker")?.click()}><Upload size={28}/><div><b>上传 SolidWorks 模型</b><p>支持 SLDASM、SLDPRT、SLDDRW、STEP、DWG、PDF</p></div><button type="button" className="primary-button">选择文件</button></div><FileTable /></section>; }
function BomCenter() { return <section className="content-card"><div className="bom-summary"><Metric icon={<PackageOpen/>} tone="blue" label="物料项" value="1,286" trend="↑ 3.2%"/><Metric icon={<Archive/>} tone="teal" label="标准件" value="548" trend="42.6%"/><Metric icon={<Zap/>} tone="orange" label="异常项" value="12" trend="待处理" negative/></div><BomTable /></section>; }
function LogCenter({ notify }: { notify: (message: string) => void }) { return <section className="content-card log-page"><div className="section-toolbar"><label><Search size={17}/><input placeholder="搜索用户、设备或操作"/></label><button onClick={() => notify("请输入用户、设备或操作关键词进行筛选")}><Filter size={16}/>筛选说明</button><button onClick={() => downloadText("ModelFlow操作日志.txt", "张工创建版本 V2.3\n系统完成模型重建检查\n周工批准结构审核\n张工发布版本 V2.3")}><Download size={16}/>导出日志</button></div><AuditList /><AuditList /></section>; }
