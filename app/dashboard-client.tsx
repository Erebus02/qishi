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
type ApiRequest = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type ApprovalRecord = {
  id: string; device_id: string; version_no: string; title: string; summary: string; status: string;
  owner_user_id: string | null; owner_name: string | null; device_code: string; device_name: string;
  image: string | null; project_name: string; review_action: string | null; review_detail: string | null;
  reviewer_id: string | null; reviewer_name: string | null; reviewed_at: string | null; created_at: string;
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
  { version: "V2.2", status: "已取代", date: "2026-06-18", owner: "张工", summary: "完善正极材料投料异常报警逻辑", color: "gray" },
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
  const [category, setCategory] = useState("全部分类");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<Device | null>(null);
  const [newVersionFor, setNewVersionFor] = useState<Device | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [showNewDevice, setShowNewDevice] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(initialData.user);
  const [users, setUsers] = useState(initialData.users);
  const [profileOpen, setProfileOpen] = useState(false);
  const can = (permission: string) => user.permissions.includes(permission);
  const apiFetch: ApiRequest = (input, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set("X-ModelFlow-User-Id", user.id);
    return fetch(input, { ...init, headers });
  };

  const filtered = useMemo(() => {
    return devices.filter((device) => {
      const matchesQuery = `${device.name}${device.code}${device.project}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesStatus = status === "全部状态" || device.status === status;
      const matchesCategory = category === "全部分类" || device.category === category;
      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [category, devices, query, status]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const refreshData = async () => {
    const response = await apiFetch("/api/bootstrap", { cache: "no-store" });
    if (!response.ok) return notify("刷新失败，请稍后重试");
    const data = await response.json() as BootstrapData;
    setDevices(data.devices);
    setMetrics(data.metrics);
    setUser(data.user);
    setUsers(data.users);
    notify("数据已从数据库刷新");
  };

  const createDevice = async (payload: NewDevicePayload) => {
    const response = await apiFetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || "创建设备失败");
    await refreshData();
  };

  const createVersion = async (device: Device, payload: NewVersionPayload) => {
    const response = await apiFetch(`/api/devices/${device.id}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || "创建版本失败");
    await refreshData();
  };

  const updateDevice = async (device: Device, payload: { name: string; category: string; lifecycleStatus: string; description: string }) => {
    const response = await apiFetch(`/api/devices/${device.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, rowVersion: device.rowVersion }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || "更新设备失败");
    setSelected(null); setEditingDevice(null); await refreshData();
  };

  const deleteDevice = async (device: Device) => {
    if (!window.confirm(`确定删除“${device.name}”吗？设备将从列表隐藏，审计记录仍会保留。`)) return;
    const response = await apiFetch(`/api/devices/${device.id}`, { method: "DELETE" });
    if (!response.ok) { const result = await response.json() as { error?: string }; return notify(result.error || "删除设备失败"); }
    setSelected(null); notify(`${device.name} 已删除`); await refreshData();
  };

  const switchUser = async (nextUserId: string) => {
    const response = await fetch("/api/bootstrap", { cache: "no-store", headers: { "X-ModelFlow-User-Id": nextUserId } });
    const data = await response.json() as BootstrapData & { error?: string };
    if (!response.ok) return notify(data.error || "切换人员失败");
    setUser(data.user); setUsers(data.users); setDevices(data.devices); setMetrics(data.metrics);
    window.localStorage.setItem("modelflow-active-user", data.user.id);
    setProfileOpen(false); setSelected(null); setEditingDevice(null); setNewVersionFor(null);
    if ((activeNav === "permissions" && !data.user.permissions.includes("role.manage")) ||
        (activeNav === "approvals" && !data.user.permissions.includes("approval.read")) ||
        (activeNav === "changes" && !data.user.permissions.includes("change.read")) ||
        (activeNav === "logs" && !data.user.permissions.includes("audit.read"))) setActiveNav("dashboard");
    notify(`已切换为 ${data.user.displayName} · ${data.user.roleName}`);
  };

  useEffect(() => {
    const savedUserId = window.localStorage.getItem("modelflow-active-user");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedUserId && savedUserId !== initialData.user.id) void switchUser(savedUserId);
    // This one-time session restore intentionally runs after hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleMap: Record<NavKey, { title: string; subtitle: string }> = {
    dashboard: { title: "工作台", subtitle: "掌握设备、版本与审批任务的最新动态" },
    devices: { title: "设备版本管理", subtitle: "集中管理设备及其版本，追溯变更记录，确保数据一致性与可追溯性。" },
    models: { title: "模型文件", subtitle: "统一管理 SolidWorks 模型、工程图与中间格式文件" },
    versions: { title: "版本中心", subtitle: "查看全部设备的版本状态、更新内容与发布记录" },
    changes: { title: "设备变更", subtitle: "选择设备与变更批次，提交变更单并完成审批闭环" },
    bom: { title: "BOM 管理", subtitle: "管理装配层级、零件数量和版本间物料差异" },
    approvals: { title: "审批中心", subtitle: "审核设备版本、更新点和发布资料" },
    permissions: { title: "权限管理", subtitle: "配置角色、功能权限与项目数据范围" },
    logs: { title: "设备更新日志", subtitle: "按设备归档模型新增、文件上传、版本更新与模型发布记录" },
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${collapsed ? "is-collapsed" : ""} ${mobileMenuOpen ? "is-mobile-open" : ""}`}>
        <div className="brand-row">
          <button className="icon-button mobile-menu" onClick={() => setCollapsed(!collapsed)} aria-label="切换菜单">
            <Menu size={20} />
          </button>
          <div className="brand">
            <span className="brand-mark"><Boxes size={20} /></span>
            <span><strong>ModelFlow</strong><small>设备建模管理平台</small></span>
          </div>
        </div>

        <nav className="main-nav" aria-label="主要导航">
          {navItems.filter((item) => (item.key !== "permissions" || can("role.manage")) && (item.key !== "changes" || can("change.read")) && (item.key !== "approvals" || can("approval.read")) && (item.key !== "logs" || can("audit.read"))).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={activeNav === item.key ? "active" : ""}
                onClick={() => { setActiveNav(item.key); setMobileMenuOpen(false); }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.key === "approvals" && metrics.pendingApproval > 0 && <b>{metrics.pendingApproval}</b>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "展开菜单" : "收起菜单"}>
            {collapsed ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
            <span>收起菜单</span>
          </button>
        </div>
      </aside>

      {mobileMenuOpen && <button className="mobile-menu-scrim" aria-label="关闭主菜单" onClick={() => setMobileMenuOpen(false)} />}

      <section className="workspace">
        <header className="topbar">
          <div className="top-actions">
            <button className="icon-button topbar-menu" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="打开主菜单" aria-expanded={mobileMenuOpen}>
              <Menu size={20} />
            </button>
            {can("device.create") && <button className="primary-button" onClick={() => setShowNewDevice(true)}>
              <Plus size={18} /> 新建设备 <ChevronDown size={15} />
            </button>}
            {can("file.upload") && <button className="text-button" onClick={() => setActiveNav("models")}><Upload size={18} /> 导入</button>}
            <button className="text-button" onClick={() => exportDevices(devices)}><Download size={18} /> 导出</button>
            {(can("device.update") || can("version.create") || can("device.delete")) && <button className="text-button" onClick={() => notify("请在设备列表的操作栏选择编辑、创建版本或删除")}><Grid2X2 size={17} /> 批量操作 <ChevronDown size={14} /></button>}
            <button className="text-button" onClick={refreshData}><RefreshCw size={17} /> 刷新</button>
          </div>
          <div className="top-right">
            <label className="global-search">
              <Search size={17} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索设备名称、编码、版本号" />
            </label>
            <button className="icon-button notification" aria-label="通知" onClick={() => { if (can("version.approve")) setActiveNav("approvals"); notify(can("version.approve") && metrics.pendingApproval ? `当前有 ${metrics.pendingApproval} 项版本等待审批` : "当前没有你可处理的审批任务"); }}><Bell size={19} />{can("version.approve") && metrics.pendingApproval > 0 && <i>{metrics.pendingApproval}</i>}</button>
            <button className="profile-button" title={user.email} aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>
              <span>{user.displayName}</span><small>{user.roleName}</small><ChevronDown size={14} />
            </button>
            {profileOpen && <div className="profile-menu" role="menu" aria-label="切换登录人员">
              <header><b>切换登录人员</b><small>用于验证不同角色权限</small></header>
              {users.map((candidate) => <button role="menuitem" className={candidate.id === user.id ? "active" : ""} key={candidate.id} onClick={() => void switchUser(candidate.id)}>
                <span><b>{candidate.displayName}</b><small>{candidate.email}</small></span><em>{candidate.roleName}</em>{candidate.id === user.id && <Check size={15}/>}
              </button>)}
            </div>}
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
                <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="分类筛选"><option>全部分类</option><option>粉体输送设备</option><option>电芯材料设备</option><option>电芯检测设备</option><option>模组装配设备</option><option>PACK 装配设备</option></select>
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
              canCreateVersion={can("version.create")}
              notify={notify}
              metrics={metrics}
            />
          ) : (
            <SectionView active={activeNav} devices={devices} metrics={metrics} user={user} request={apiFetch} onDevice={(device) => setSelected(device)} onNavigate={setActiveNav} onNewDevice={() => setShowNewDevice(true)} notify={notify} onRefresh={refreshData} canApprove={can("change.approve")} canCreate={can("device.create")} />
          )}
        </div>
      </section>

      {selected && <DeviceDetail device={selected} onClose={() => setSelected(null)} onNewVersion={() => setNewVersionFor(selected)} onEdit={() => setEditingDevice(selected)} onDelete={() => void deleteDevice(selected)} canCreateVersion={can("version.create")} canEdit={can("device.update")} canDelete={can("device.delete")} />}
      {newVersionFor && <NewVersionModal device={newVersionFor} onClose={() => setNewVersionFor(null)} onSave={async (payload) => { try { await createVersion(newVersionFor, payload); setNewVersionFor(null); notify(`${newVersionFor.name} 的新版本草稿已写入数据库`); } catch (error) { notify(error instanceof Error ? error.message : "创建版本失败"); } }} />}
      {showNewDevice && <NewDeviceModal onClose={() => setShowNewDevice(false)} onSave={async (payload) => { try { await createDevice(payload); setShowNewDevice(false); notify("新设备已写入数据库"); } catch (error) { notify(error instanceof Error ? error.message : "创建设备失败"); } }} />}
      {editingDevice && <EditDeviceModal device={editingDevice} onClose={() => setEditingDevice(null)} onSave={async (payload) => { try { await updateDevice(editingDevice, payload); notify("设备资料已更新"); } catch (error) { notify(error instanceof Error ? error.message : "更新设备失败"); } }} />}
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </main>
  );
}

function DeviceManager({ devices, view, query, setQuery, onSelect, onNewVersion, onEdit, onDelete, canCreateVersion, canEdit, canDelete, notify, metrics }: {
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
  canCreateVersion: boolean;
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
                  {canCreateVersion && <button className="icon-button" onClick={() => onNewVersion(device)} title="创建新版本"><Plus size={17} /></button>}
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
                  <div className="card-actions"><button onClick={() => onSelect(device)}>查看详情</button>{canEdit && <button onClick={() => onEdit(device)}><Pencil size={15}/>编辑</button>}{canCreateVersion && <button onClick={() => onNewVersion(device)}><Plus size={16} /> 新版本</button>}</div>
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

function DeviceDetail({ device, onClose, onNewVersion, onEdit, onDelete, canCreateVersion, canEdit, canDelete }: { device: Device; onClose: () => void; onNewVersion: () => void; onEdit: () => void; onDelete: () => void; canCreateVersion: boolean; canEdit: boolean; canDelete: boolean }) {
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
            <div className="summary-actions">{canCreateVersion && <button className="primary-button" onClick={onNewVersion}><Plus size={17} /> 创建新版本</button>}{canEdit && <button onClick={onEdit}><Pencil size={16} /> 编辑设备</button>}<button onClick={() => downloadText(`${device.code}-设备资料.json`, JSON.stringify(device, null, 2))}><Download size={16} /> 下载资料</button>{canDelete && <button className="delete-action" onClick={onDelete}><Trash2 size={16}/>删除设备</button>}</div>
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
  const files = [["CELL-OCV-006_总装.SLDASM", "主装配体", "48.6 MB"], ["CELL-OCV-006_检测工位.SLDPRT", "零件", "12.4 MB"], ["CELL-OCV-006_总装图.SLDDRW", "工程图", "8.9 MB"], ["CELL-OCV-006_发布图纸.PDF", "发布资料", "5.2 MB"]];
  return <div className="simple-table"><div><b>文件名</b><b>类型</b><b>大小</b><b>状态</b><b>操作</b></div>{files.map((file) => <div key={file[0]}><span><FileCog size={17} />{file[0]}</span><span>{file[1]}</span><span>{file[2]}</span><span className="healthy">已同步</span><button title={`下载${file[0]}`} onClick={() => downloadText(file[0] + ".txt", `ModelFlow 文件记录\n文件：${file[0]}\n类型：${file[1]}\n大小：${file[2]}`)}><Download size={16} /></button></div>)}</div>;
}

function BomTable() {
  const rows = [["CELL-201", "检测工位主机架", "焊接件", "1"], ["CELL-225", "电芯定位载具", "装配体", "12"], ["MISUMI-HFS8", "铝型材 40×40", "标准件", "18"], ["SMC-CDQ2", "薄型气缸", "外购件", "6"]];
  return <div className="simple-table bom-table"><div><b>物料编码</b><b>名称</b><b>分类</b><b>数量</b><b>版本变化</b></div>{rows.map((row, index) => <div key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong><span>{row[2]}</span><span>{row[3]}</span><span className={index === 1 ? "change-badge" : "muted"}>{index === 1 ? "+1" : "无变化"}</span></div>)}</div>;
}

function ApprovalList() { return <div className="approval-list"><article><CheckCircle2 /><div><b>结构审核通过</b><p>装配关系与工程图版本一致，可以进入发布流程。</p><span>审核人：周工 · 2026-07-20 14:32</span></div></article><article><CheckCircle2 /><div><b>工艺审核通过</b><p>关键参数与现场验证记录完整。</p><span>审核人：陈工 · 2026-07-20 10:18</span></div></article></div>; }
function AuditList() { return <div className="audit-list">{["张工新增设备模型", "张工上传主装配体文件", "张工创建版本 V2.3", "张工发布设备模型 V2.3"].map((item, index) => <div key={item}><i></i><span><b>{item}</b><small>2026-07-{18 + Math.min(index, 2)} · {9 + index}:2{index}</small></span></div>)}</div>; }

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
  }}><header><div><p>DEVICE MASTER DATA</p><h2>新建设备</h2></div><button type="button" className="icon-button" aria-label="关闭新建设备窗口" onClick={onClose}><X /></button></header><div className="form-grid"><label>设备编号<input name="code" placeholder="例如 EQ-CELL-001" required /></label><label>设备名称<input name="name" placeholder="例如 方形电芯激光焊接机" required /></label><label>所属项目<select name="projectCode"><option value="PRJ-MATERIAL">华东动力电池材料产线项目</option><option value="PRJ-CELL">方形电芯一期产线项目</option><option value="PRJ-PACK">动力电池模组 PACK 自动化项目</option><option value="PRJ-ESS">储能电池模组智能产线项目</option></select></label><label>负责人<select><option>当前用户</option></select></label><label>设备分类<select name="category"><option>粉体输送设备</option><option>电芯材料设备</option><option>电芯检测设备</option><option>模组装配设备</option><option>PACK 装配设备</option></select></label><label>生命周期状态<select name="lifecycleStatus"><option value="designing">设计中</option><option value="testing">测试中</option><option value="active">生产使用中</option></select></label><label className="full-field">设备说明<textarea name="description" placeholder="填写锂电工序、产能节拍、关键能力与项目背景……" /></label></div><footer><button type="button" onClick={onClose}>取消</button><button type="submit" className="primary-button">保存设备</button></footer></form></div>;
}

function EditDeviceModal({ device, onClose, onSave }: { device: Device; onClose: () => void; onSave: (payload: { name: string; category: string; lifecycleStatus: string; description: string }) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  return <div className="overlay modal-overlay"><form className="modal" onSubmit={async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true);
    try { await onSave({ name: String(form.get("name")), category: String(form.get("category")), lifecycleStatus: String(form.get("lifecycleStatus")), description: String(form.get("description") || "") }); } finally { setSaving(false); }
  }}><header><div><p>DEVICE MASTER DATA · {device.code}</p><h2>编辑设备</h2></div><button type="button" className="icon-button" aria-label="关闭编辑窗口" onClick={onClose}><X/></button></header><div className="form-grid">
    <label>设备编号<input value={device.code} readOnly title="设备编号创建后不可修改"/></label><label>设备名称<input name="name" defaultValue={device.name} required/></label>
    <label>设备分类<select name="category" defaultValue={device.category}><option>粉体输送设备</option><option>电芯材料设备</option><option>电芯检测设备</option><option>模组装配设备</option><option>PACK 装配设备</option></select></label>
    <label>生命周期状态<select name="lifecycleStatus" defaultValue={device.lifecycleStatus}><option value="designing">设计中</option><option value="testing">测试中</option><option value="active">生产使用中</option><option value="retired">已停用</option></select></label>
    <label className="full-field">设备说明<textarea name="description" defaultValue={device.description} placeholder="填写设备用途、能力与项目背景"/></label>
  </div><footer><button type="button" onClick={onClose}>取消</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "保存中…" : "保存修改"}</button></footer></form></div>;
}

function nextVersion(version: string) { const [major, minor] = version.replace("V", "").split(".").map(Number); return `V${major}.${minor + 1}`; }

function downloadText(filename: string, content: string) { const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function exportDevices(rows: Device[]) { downloadText(`ModelFlow设备清单-${new Date().toISOString().slice(0, 10)}.csv`, "设备编号,设备名称,当前版本,状态,所属项目,负责人,更新时间\n" + rows.map((d) => [d.code,d.name,d.version,d.status,d.project,d.owner,d.updated].map((v) => `\"${String(v).replaceAll('"','""')}\"`).join(",")).join("\n")); }

function SectionView({ active, devices: currentDevices, metrics, user, request, onDevice, onNavigate, onNewDevice, notify, onRefresh, canApprove, canCreate }: { active: NavKey; devices: Device[]; metrics: BootstrapData["metrics"]; user: BootstrapData["user"]; request: ApiRequest; onDevice: (device: Device) => void; onNavigate: (key: NavKey) => void; onNewDevice: () => void; notify: (message: string) => void; onRefresh: () => Promise<void>; canApprove: boolean; canCreate: boolean }) {
  if (active === "dashboard") return <Dashboard devices={currentDevices} metrics={metrics} onDevice={onDevice} onNavigate={onNavigate} onNewDevice={onNewDevice} canCreate={canCreate} canUpload={user.permissions.includes("file.upload")} canChange={user.permissions.includes("change.create")} canApprove={user.permissions.includes("version.approve")} />;
  if (active === "versions") return <VersionCenter devices={currentDevices} request={request} onRefresh={onRefresh} onDevice={onDevice} notify={notify} canSubmit={user.permissions.includes("version.submit")} />;
  if (active === "changes") return <ChangeOrderCenter devices={currentDevices} request={request} notify={notify} canApprove={canApprove} />;
  if (active === "permissions") return <PermissionCenter notify={notify} />;
  if (active === "approvals") return <ApprovalCenter user={user} request={request} notify={notify} onRefresh={onRefresh} />;
  if (active === "models") return <ModelCenter devices={currentDevices} notify={notify} canUpload={user.permissions.includes("file.upload")} />;
  if (active === "bom") return <BomCenter />;
  return <LogCenter devices={currentDevices} notify={notify} />;
}

function ChangeOrderCenter({ devices, request, notify, canApprove }: { devices: Device[]; request: ApiRequest; notify: (message: string) => void; canApprove: boolean }) {
  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const load = async () => {
    setLoading(true);
    const response = await request("/api/change-orders", { cache: "no-store" });
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
    const response = await request(`/api/change-orders/${id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, comment }) });
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
    {showForm && <ChangeOrderModal devices={devices} request={request} onClose={() => setShowForm(false)} onSubmitted={async (message) => { setShowForm(false); notify(message); await load(); }} />}
  </>;
}

function ChangeOrderModal({ devices, request, onClose, onSubmitted }: { devices: Device[]; request: ApiRequest; onClose: () => void; onSubmitted: (message: string) => Promise<void> }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [beforeImage, setBeforeImage] = useState<{ name: string; url: string } | null>(null);
  const [afterImage, setAfterImage] = useState<{ name: string; url: string } | null>(null);
  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const selectEvidence = (file: File | undefined, kind: "before" | "after") => {
    if (!file) return;
    const next = { name: file.name, url: URL.createObjectURL(file) };
    const current = kind === "before" ? beforeImage : afterImage;
    if (current) URL.revokeObjectURL(current.url);
    if (kind === "before") setBeforeImage(next); else setAfterImage(next);
  };
  return <div className="overlay modal-overlay"><form className="modal change-modal" onSubmit={async (event) => {
    event.preventDefault();
    if (!selectedIds.length) return window.alert("请至少选择一台设备");
    if (!beforeImage || !afterImage) return window.alert("请上传改造前和改造后的对比图片");
    const form = new FormData(event.currentTarget); setSaving(true);
    const evidenceDescription = `${String(form.get("description") || "").trim()}\n\n改造位置：${String(form.get("modificationLocation") || "").trim()}\n改造前图片：${beforeImage.name}\n改造后图片：${afterImage.name}`;
    const response = await request("/api/change-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceIds: selectedIds, batchNo: form.get("batchNo"), title: form.get("title"), reason: form.get("reason"), priority: form.get("priority"), plannedAt: form.get("plannedAt"), description: evidenceDescription, modificationLocation: form.get("modificationLocation"), beforeImageName: beforeImage.name, afterImageName: afterImage.name, submit: true }) });
    const result = await response.json() as { orderNo?: string; error?: string }; setSaving(false);
    if (!response.ok) return window.alert(result.error || "提交失败");
    await onSubmitted(`变更申请 ${result.orderNo} 已提交审批`);
  }}>
    <header><div><p>ENGINEERING CHANGE ORDER</p><h2>提交设备变更申请</h2></div><button type="button" className="icon-button" onClick={onClose}><X/></button></header>
    <div className="change-form-body">
      <div className="form-section-title"><span>1</span><div><b>选择变更设备</b><small>可选择同一批次内的一台或多台设备</small></div><em>已选 {selectedIds.length} 台</em></div>
      <div className="device-picker">{devices.map((device) => <label key={device.id} className={selectedIds.includes(device.id) ? "selected" : ""}><input type="checkbox" checked={selectedIds.includes(device.id)} onChange={() => toggle(device.id)}/><img src={device.image} alt=""/><span><b>{device.name}</b><small>{device.code} · 当前 {device.version}</small></span><i><Check size={14}/></i></label>)}</div>
      <div className="form-section-title"><span>2</span><div><b>填写变更信息</b><small>变更批次和内容将作为审批依据</small></div></div>
      <div className="form-grid change-fields"><label>变更批次<input name="batchNo" placeholder="例如：2026-Q3-02 批" required/></label><label>优先级<select name="priority"><option value="normal">普通</option><option value="high">高</option><option value="urgent">紧急</option></select></label><label className="full-field">变更标题<input name="title" placeholder="概括本批次设备变更" required/></label><label>变更原因<select name="reason" required><option value="">请选择</option><option>设计优化</option><option>客户需求</option><option>质量问题整改</option><option>降本替代</option><option>安全合规</option></select></label><label>计划实施日期<input type="date" name="plannedAt"/></label><label className="full-field">改造位置<input name="modificationLocation" placeholder="例如：上料工位左侧防护罩、视觉检测工位相机支架" required/></label><label className="full-field">变更内容与影响说明<textarea name="description" placeholder="说明具体改动、前后差异、涉及模型/BOM、风险、验证与回退方案……" required/></label></div>
      <div className="form-section-title change-evidence-title"><span>3</span><div><b>上传改造前后对比图片</b><small>使用相同角度拍摄，并清楚标注改造位置，便于审批人员核对</small></div><em>两张均为必填</em></div>
      <div className="change-image-compare">
        <label className={beforeImage ? "has-image" : ""}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectEvidence(event.target.files?.[0], "before")} required={!beforeImage}/>{beforeImage ? <img src={beforeImage.url} alt="改造前预览"/> : <span><Upload size={25}/><b>上传改造前图片</b><small>展示原结构、原位置或现存问题</small></span>}<footer><b>改造前</b><small>{beforeImage?.name || "JPG、PNG、WEBP"}</small></footer></label>
        <div className="change-compare-arrow"><ChevronRight size={22}/><span>前后对比</span></div>
        <label className={afterImage ? "has-image" : ""}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectEvidence(event.target.files?.[0], "after")} required={!afterImage}/>{afterImage ? <img src={afterImage.url} alt="改造后预览"/> : <span><Upload size={25}/><b>上传改造后图片</b><small>展示新结构、完成状态与实际效果</small></span>}<footer><b>改造后</b><small>{afterImage?.name || "JPG、PNG、WEBP"}</small></footer></label>
      </div>
    </div>
    <footer><span className="submit-hint"><ShieldCheck size={15}/>提交后将进入审批中心，申请人不可审批自己的变更单</span><button type="button" onClick={onClose}>取消</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "提交中…" : "提交变更申请"}</button></footer>
  </form></div>;
}

function changeStatusLabel(status: string) { return ({ draft: "草稿", submitted: "待审批", approved: "已批准", rejected: "已驳回", implemented: "已实施" } as Record<string, string>)[status] || status; }

function Dashboard({ devices, metrics, onDevice, onNavigate, onNewDevice, canCreate, canUpload, canChange, canApprove }: { devices: Device[]; metrics: BootstrapData["metrics"]; onDevice: (device: Device) => void; onNavigate: (key: NavKey) => void; onNewDevice: () => void; canCreate: boolean; canUpload: boolean; canChange: boolean; canApprove: boolean }) {
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
        {canUpload && <button onClick={() => onNavigate("models")}><i className="quick-teal"><Upload /></i><span><b>上传模型</b><small>添加 SolidWorks 模型或工程图</small></span><ChevronRight /></button>}
        {canChange && <button onClick={() => onNavigate("changes")}><i className="quick-purple"><FilePenLine /></i><span><b>发起变更</b><small>选择设备并提交变更申请</small></span><ChevronRight /></button>}
        {canApprove && <button onClick={() => onNavigate("approvals")}><i className="quick-orange"><ClipboardCheck /></i><span><b>处理审批</b><small>{metrics.pendingApproval ? `${metrics.pendingApproval} 项等待处理` : "当前没有待审批任务"}</small></span><ChevronRight /></button>}
      </div>
    </section>
    <section className="dashboard-card recent-work"><header><div><span>继续工作</span><h3>最近更新的设备</h3></div><button onClick={() => onNavigate("devices")}>查看全部 <ChevronRight size={15}/></button></header>{devices.slice(0,4).map(d => <button key={d.id} onClick={() => onDevice(d)}><img src={d.image} alt="" /><span><b>{d.name}</b><small>{d.change}</small></span><StatusTag status={d.status}/><em>{d.version}</em><ChevronRight /></button>)}</section>
    <section className="dashboard-card pending-work"><header><div><span>需要关注</span><h3>待处理事项</h3></div></header>{pending.length ? pending.slice(0,4).map((d, index) => <button key={d.id} onClick={() => onDevice(d)}><i>{index + 1}</i><span><b>{d.name}</b><small>{d.status} · {d.owner}</small></span><ChevronRight /></button>) : <div className="all-clear"><CheckCircle2/><b>当前事项已处理完毕</b><span>可以继续维护设备资料或创建新版本。</span></div>}</section>
  </div>;
}

function VersionCenter({ devices, request, onRefresh, onDevice, notify, canSubmit }: { devices: Device[]; request: ApiRequest; onRefresh: () => Promise<void>; onDevice: (device: Device) => void; notify: (message: string) => void; canSubmit: boolean }) {
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const submit = async (device: Device) => {
    setSubmittingId(device.id);
    const response = await request(`/api/devices/${device.id}/versions/submit`, { method: "POST" });
    const result = await response.json() as { error?: string };
    setSubmittingId(null);
    if (!response.ok) return notify(result.error || "提交审批失败");
    notify(`${device.name} ${device.version} 已提交审批`); await onRefresh();
  };
  return <section className="content-card"><div className="section-toolbar"><label><Search size={17}/><input placeholder="搜索设备或版本" /></label><button onClick={() => notify("可直接输入设备名称或版本号筛选，点击设备名称查看详情")}><Filter size={16}/>筛选说明</button></div><div className="simple-table version-table"><div><b>设备</b><b>版本</b><b>状态</b><b>更新摘要</b><b>更新时间</b><b>操作</b></div>{devices.map((device)=><div className="version-row" key={device.id}><button className="version-device" onClick={()=>onDevice(device)}><img src={device.image} alt=""/><strong>{device.name}</strong></button><b>{device.version}</b><StatusTag status={device.status}/><span>{device.change}</span><span>{device.updated}</span><span>{canSubmit && device.status === "草稿" ? <button className="small-action" disabled={submittingId === device.id} onClick={() => void submit(device)}>{submittingId === device.id ? "提交中" : "提交审批"}</button> : "—"}</span></div>)}</div></section>;
}

function PermissionCenter({ notify }: { notify: (message: string) => void }) {
  const roles = [
    { name: "系统管理员", count: 2, description: "拥有全部设备、流程与权限配置能力" },
    { name: "项目负责人", count: 4, description: "管理项目范围内设备、版本和审批流程" },
    { name: "设计工程师", count: 12, description: "创建和维护负责范围内的设备及草稿版本" },
    { name: "审核工程师", count: 3, description: "审批、转发、加签并完成授权流程" },
    { name: "生产人员", count: 28, description: "只读查看已发布设备与已完成流程" },
  ];
  const permissions = ["查看授权设备","新增设备","编辑主数据","创建版本","审批与退回","查看审批流程","转发审批","审批加签","删除审批流程","取回申请","撤销申请","完成审批流程","发布版本","下载源模型","删除设备"];
  const defaults: Record<string, string[]> = {
    系统管理员: permissions,
    项目负责人: ["查看授权设备","新增设备","编辑主数据","创建版本","审批与退回","查看审批流程","转发审批","审批加签","取回申请","撤销申请","完成审批流程","发布版本","下载源模型"],
    设计工程师: ["查看授权设备","新增设备","编辑主数据","创建版本","查看审批流程","取回申请","撤销申请","下载源模型"],
    审核工程师: ["查看授权设备","审批与退回","查看审批流程","转发审批","审批加签","完成审批流程","下载源模型"],
    生产人员: ["查看授权设备","查看审批流程"],
  };
  const [selectedRole, setSelectedRole] = useState(2);
  const [grants, setGrants] = useState<Record<string, string[]>>(defaults);
  const role = roles[selectedRole];
  const toggleGrant = (permission: string) => setGrants((current) => ({ ...current, [role.name]: current[role.name].includes(permission) ? current[role.name].filter((item) => item !== permission) : [...current[role.name], permission] }));
  return <div className="permission-layout"><aside className="role-list"><header><h3>角色</h3><button onClick={() => notify("当前展示内置角色的审批权限分布")}><Plus size={16}/></button></header>{roles.map((item,index)=><button className={index===selectedRole?"active":""} key={item.name} onClick={() => setSelectedRole(index)}><span><UserCog size={17}/>{item.name}</span><small>{item.count} 人</small></button>)}</aside><section className="permission-card"><header><div><h3>{role.name}</h3><p>{role.description}</p></div><button className="primary-button" onClick={()=>notify(`${role.name}权限配置已保存`)}>保存配置</button></header><div className="scope-row"><span>数据范围</span><select defaultValue={selectedRole===0?"全部数据":"参与的项目 + 负责的设备"}><option>参与的项目 + 负责的设备</option><option>所属组织</option><option>全部数据</option></select></div><div className="permission-section-label"><ShieldCheck size={16}/><b>功能与审批操作权限</b><span>审批按钮会按照这里的配置显示</span></div><div className="permission-matrix"><div><b>功能权限</b><b>允许</b><b>仅负责范围</b></div>{permissions.map((permission,index)=><div key={permission}><span>{permission}</span><label><input type="checkbox" checked={grants[role.name].includes(permission)} onChange={() => toggleGrant(permission)}/><i></i></label><label><input type="checkbox" defaultChecked={selectedRole!==0 && [2,3,9,10,13].includes(index)}/><i></i></label></div>)}</div></section></div>;
}

function ApprovalCenter({ user, request, notify, onRefresh }: { user: BootstrapData["user"]; request: ApiRequest; notify: (message: string) => void; onRefresh: () => Promise<void> }) {
  const [tab, setTab] = useState<"pending" | "reviewed" | "all">("pending");
  const [records, setRecords] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    const response = await request("/api/approvals", { cache: "no-store" });
    const result = await response.json() as { approvals?: ApprovalRecord[]; error?: string };
    setLoading(false);
    if (!response.ok) return notify(result.error || "审批记录加载失败");
    setRecords(result.approvals || []);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const review = async (record: ApprovalRecord, action: "approve" | "reject") => {
    const comment = action === "reject" ? window.prompt("请输入退回修改意见") : "审批通过";
    if (action === "reject" && !comment?.trim()) return;
    setPendingId(record.id);
    try {
      const response = await request(`/api/devices/${record.device_id}/versions/review`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, comment }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "版本审批失败");
      notify(`${record.device_name} ${action === "approve" ? "已审批通过" : "已退回修改"}`);
      await Promise.all([onRefresh(), load()]); setTab("reviewed");
    } catch (error) { notify(error instanceof Error ? error.message : "版本审批失败"); }
    finally { setPendingId(null); }
  };
  const workflowAction = async (record: ApprovalRecord, action: "forward" | "add_sign" | "delete" | "retrieve" | "cancel" | "complete") => {
    const labels = { forward: "转发", add_sign: "加签", delete: "删除", retrieve: "取回", cancel: "撤销", complete: "流程完成" };
    if (action === "delete" && !window.confirm(`确认删除 ${record.device_name} ${record.version_no} 的审批流程？`)) return;
    if (action === "cancel" && !window.confirm("确认撤销该审批申请？撤销后流程将停止。")) return;
    const assignee = action === "forward" || action === "add_sign" ? window.prompt(action === "forward" ? "请输入转发接收人" : "请输入加签人员") : "";
    if ((action === "forward" || action === "add_sign") && !assignee?.trim()) return;
    const response = await request(`/api/approvals/${record.id}/workflow`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, assignee: assignee?.trim() || null }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) return notify(result.error || `${labels[action]}失败`);
    if (action === "delete") setRecords((items) => items.filter((item) => item.id !== record.id));
    else setRecords((items) => items.map((item) => item.id !== record.id ? item : {
      ...item,
      status: action === "retrieve" ? "draft" : action === "cancel" ? "cancelled" : action === "complete" ? "completed" : item.status,
      reviewer_name: action === "forward" ? assignee!.trim() : item.reviewer_name,
      review_detail: action === "add_sign" ? `已加签：${assignee!.trim()}` : action === "forward" ? `已转发：${assignee!.trim()}` : labels[action],
      reviewer_id: action === "complete" ? user.id : item.reviewer_id,
      reviewed_at: action === "complete" ? new Date().toISOString() : item.reviewed_at,
    }));
    notify(action === "forward" ? `流程已转发给 ${assignee}` : action === "add_sign" ? `已增加加签人员 ${assignee}` : `${labels[action]}操作已完成`);
  };
  const pending = records.filter((record) => record.status === "in_review" && record.owner_user_id !== user.id);
  const reviewed = records.filter((record) => record.reviewer_id === user.id && (!!record.review_action || record.status === "completed"));
  const visible = tab === "pending" ? pending : tab === "reviewed" ? reviewed : records;
  const statusLabel = (record: ApprovalRecord) => record.status === "cancelled" ? "已撤销" : record.status === "completed" ? "流程完成" : record.review_action === "version.reject" ? "已退回" : record.review_action === "version.approve" ? "已批准" : record.status === "published" ? "已发布" : record.status === "draft" ? "草稿" : "审批中";
  const detailLabel = (detail: string | null) => { if (!detail) return ""; try { const parsed = JSON.parse(detail) as { comment?: string; assignee?: string }; return parsed.comment || (parsed.assignee ? `处理人：${parsed.assignee}` : ""); } catch { return detail; } };
  return <section className="approval-board"><div className="approval-tabs" role="tablist"><button type="button" role="tab" aria-selected={tab === "pending"} className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>待我审批 <b>{pending.length}</b></button><button type="button" role="tab" aria-selected={tab === "reviewed"} className={tab === "reviewed" ? "active" : ""} onClick={() => setTab("reviewed")}>我已审批 <b className="reviewed-count">{reviewed.length}</b></button><button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>全部流程 <b className="all-count">{records.length}</b></button></div><div className="approval-tab-caption">{tab === "pending" ? "仅显示当前需要你处理的流程" : tab === "reviewed" ? "显示由你批准、退回或完成的流程" : "显示待审、已审、撤销、完成等全部流程节点"}</div>{loading ? <div className="empty-state">正在读取审批记录…</div> : visible.length === 0 ? <div className="empty-state">{tab === "pending" ? "当前没有需要你审批的版本" : tab === "reviewed" ? "你还没有审批记录，可在“全部流程”查看其他节点" : "暂无版本流程记录"}</div> : visible.map(record=><article key={`${record.id}-${record.reviewed_at || record.status}`}><img src={record.image || "/devices/powder-transfer-machine.png"} alt=""/><div><span>{record.project_name} · {record.device_code}</span><h3>{record.device_name} <b>{record.version_no}</b></h3><p>{record.summary}</p><small>提交人：{record.owner_name || "未分配"}{record.reviewer_name ? ` · 当前处理人：${record.reviewer_name}` : ""}{detailLabel(record.review_detail) ? ` · ${detailLabel(record.review_detail)}` : ""}</small></div><div className="approval-operation-panel"><span className={`approval-result ${record.review_action === "version.reject" || record.status === "cancelled" ? "rejected" : ""}`}>{statusLabel(record)}</span>{record.status === "in_review" && record.owner_user_id !== user.id && user.permissions.includes("version.approve") && <div className="approval-primary-actions"><button disabled={pendingId === record.id} onClick={()=>review(record,"reject")}>退回</button><button disabled={pendingId === record.id} className="primary-button" onClick={()=>review(record,"approve")}><Check size={16}/>{pendingId === record.id ? "处理中" : "批准"}</button></div>}<div className="approval-workflow-actions">{record.status === "in_review" && user.permissions.includes("approval.forward") && <button onClick={() => workflowAction(record,"forward")}>转发</button>}{record.status === "in_review" && user.permissions.includes("approval.add_sign") && <button onClick={() => workflowAction(record,"add_sign")}>加签</button>}{record.owner_user_id === user.id && record.status === "in_review" && user.permissions.includes("approval.retrieve") && <button onClick={() => workflowAction(record,"retrieve")}>取回</button>}{record.owner_user_id === user.id && ["draft","in_review"].includes(record.status) && user.permissions.includes("approval.cancel") && <button onClick={() => workflowAction(record,"cancel")}>撤销</button>}{["in_review","published"].includes(record.status) && user.permissions.includes("approval.complete") && <button onClick={() => workflowAction(record,"complete")}>流程完成</button>}{user.permissions.includes("approval.delete") && ["draft","cancelled","completed"].includes(record.status) && <button className="danger-button" onClick={() => workflowAction(record,"delete")}>删除</button>}</div></div></article>)}</section>;
}

type ModelFileRecord = { id: string; deviceCode: string; version: string; name: string; category: string; size: string; status: string };

function ModelCenter({ devices, notify, canUpload }: { devices: Device[]; notify: (message: string) => void; canUpload: boolean }) {
  const [deviceCode, setDeviceCode] = useState(devices.find((device) => device.code === "EQ-OCV-006")?.code || devices[0]?.code || "");
  const selectedDevice = devices.find((device) => device.code === deviceCode) || devices[0];
  const deviceVersions = useMemo(() => selectedDevice ? [selectedDevice.version, "V1.1", "V1.0"].filter((value, index, all) => all.indexOf(value) === index) : [], [selectedDevice]);
  const [version, setVersion] = useState(selectedDevice?.version || "");
  const [category, setCategory] = useState("主装配体");
  const [expandedDevices, setExpandedDevices] = useState<string[]>(selectedDevice ? [selectedDevice.code] : []);
  const [expandedVersions, setExpandedVersions] = useState<string[]>(selectedDevice ? [`${selectedDevice.code}-${selectedDevice.version}`] : []);
  const [files, setFiles] = useState<ModelFileRecord[]>([
    { id: "f1", deviceCode: "EQ-OCV-006", version: "V3.1", name: "CELL-OCV-006_总装.SLDASM", category: "主装配体", size: "48.6 MB", status: "已同步" },
    { id: "f2", deviceCode: "EQ-OCV-006", version: "V3.1", name: "CELL-OCV-006_检测工位.SLDPRT", category: "零件模型", size: "12.4 MB", status: "已同步" },
    { id: "f3", deviceCode: "EQ-OCV-006", version: "V3.1", name: "CELL-OCV-006_总装图.SLDDRW", category: "工程图", size: "8.9 MB", status: "已同步" },
    { id: "f4", deviceCode: "EQ-OCV-006", version: "V3.1", name: "CELL-OCV-006_发布图纸.PDF", category: "发布资料", size: "5.2 MB", status: "已同步" },
  ]);

  useEffect(() => {
    if (!selectedDevice) return;
    setVersion(selectedDevice.version);
    setExpandedDevices((items) => items.includes(selectedDevice.code) ? items : [...items, selectedDevice.code]);
    setExpandedVersions((items) => items.includes(`${selectedDevice.code}-${selectedDevice.version}`) ? items : [...items, `${selectedDevice.code}-${selectedDevice.version}`]);
  }, [selectedDevice]);

  const visibleFiles = files.filter((file) => file.deviceCode === deviceCode && file.version === version);
  const chooseDevice = (code: string, deviceVersion: string) => { setDeviceCode(code); setVersion(deviceVersion); };
  const toggle = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  const upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDevice || !version) return;
    const size = file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "待计算";
    setFiles((items) => [...items, { id: `local-${Date.now()}`, deviceCode: selectedDevice.code, version, name: file.name, category, size, status: "待同步" }]);
    notify(`已添加到 ${selectedDevice.name} / ${version} / ${category}`);
    event.target.value = "";
  };

  return <section className="model-center-layout">
    <aside className="model-tree" aria-label="设备版本文件层级">
      <header><div><b>资料层级</b><small>设备 / 版本 / 文件图单</small></div><span>{devices.length} 台设备</span></header>
      <div className="model-tree-body">
        {devices.map((device) => {
          const deviceOpen = expandedDevices.includes(device.code);
          const versionsForDevice = [device.version, "V1.1", "V1.0"].filter((value, index, all) => all.indexOf(value) === index);
          return <div className="tree-device" key={device.id}>
            <button className={device.code === deviceCode ? "selected" : ""} onClick={() => { toggle(device.code, setExpandedDevices); chooseDevice(device.code, device.version); }}>
              {deviceOpen ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}<Boxes size={17}/><span><b>{device.name}</b><small>{device.code}</small></span>
            </button>
            {deviceOpen && <div className="tree-versions">{versionsForDevice.map((item) => {
              const key = `${device.code}-${item}`;
              const versionOpen = expandedVersions.includes(key);
              const count = files.filter((file) => file.deviceCode === device.code && file.version === item).length;
              return <div key={key}><button className={device.code === deviceCode && item === version ? "selected" : ""} onClick={() => { toggle(key, setExpandedVersions); chooseDevice(device.code, item); }}>
                {versionOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}<History size={16}/><span><b>{item}</b><small>{item === device.version ? "当前版本" : "历史版本"}</small></span><em>{count}</em>
              </button>{versionOpen && device.code === deviceCode && item === version && <div className="tree-files"><span><FileBox size={14}/>文件图单 <b>{count}</b></span></div>}</div>;
            })}</div>}
          </div>;
        })}
      </div>
    </aside>

    <div className="model-workspace">
      {canUpload && <div className="model-upload-panel">
        <header><div><b>上传文件图单</b><p>先确认设备、版本和文件类别，再选择需要上传的文件。</p></div><span>① 设备　② 版本　③ 类别　④ 文件</span></header>
        <div className="model-upload-fields">
          <label>所属设备<select value={deviceCode} onChange={(event) => setDeviceCode(event.target.value)}>{devices.map((device) => <option key={device.id} value={device.code}>{device.name}（{device.code}）</option>)}</select></label>
          <label>所属版本<select value={version} onChange={(event) => setVersion(event.target.value)}>{deviceVersions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>文件类别<select value={category} onChange={(event) => setCategory(event.target.value)}><option>主装配体</option><option>子装配体</option><option>零件模型</option><option>工程图</option><option>中间格式</option><option>电气图纸</option><option>发布资料</option><option>其他附件</option></select></label>
          <label className="model-file-button">选择文件<input id="model-file-picker" type="file" accept=".sldasm,.sldprt,.slddrw,.step,.stp,.dwg,.pdf" onChange={upload}/><span><Upload size={17}/>选择并添加文件</span></label>
        </div>
      </div>}

      <div className="model-file-panel">
        <header><div><span>{selectedDevice?.name || "未选择设备"}</span><ChevronRight size={14}/><span>{version || "未选择版本"}</span><ChevronRight size={14}/><b>文件图单</b></div><small>共 {visibleFiles.length} 个文件</small></header>
        <div className="model-file-table"><div className="model-file-head"><b>文件名</b><b>文件类别</b><b>大小</b><b>状态</b><b>操作</b></div>
          {visibleFiles.length ? visibleFiles.map((file) => <div className="model-file-row" key={file.id}><span><FileCog size={17}/><b>{file.name}</b></span><span>{file.category}</span><span>{file.size}</span><span className={file.status === "已同步" ? "healthy" : "pending-file"}>{file.status}</span><button title={`下载${file.name}`} onClick={() => downloadText(`${file.name}.txt`, `设备：${selectedDevice?.name}\n版本：${version}\n类别：${file.category}\n文件：${file.name}`)}><Download size={16}/></button></div>) : <div className="model-file-empty"><FileBox size={30}/><b>该版本还没有文件图单</b><span>请在上方选择文件类别后添加文件</span></div>}
        </div>
      </div>
    </div>
  </section>;
}
type BomItem = { id: string; materialNo: string; name: string; category: string; quantity: number; unit: string; specification: string };
function BomCenter() {
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [items, setItems] = useState<BomItem[]>([
    { id: "b1", materialNo: "CELL-201", name: "检测工位主机架", category: "焊接件", quantity: 1, unit: "件", specification: "Q235B 焊接机架" },
    { id: "b2", materialNo: "CELL-225", name: "电芯定位载具", category: "装配体", quantity: 12, unit: "套", specification: "方形电芯 280Ah" },
    { id: "b3", materialNo: "MISUMI-HFS8", name: "铝型材 40×40", category: "标准件", quantity: 18, unit: "根", specification: "HFS8-4040" },
    { id: "b4", materialNo: "SMC-CDQ2", name: "薄型气缸", category: "外购件", quantity: 6, unit: "件", specification: "CDQ2B40-50DMZ" },
  ]);
  const visible = items.filter((item) => `${item.materialNo} ${item.name} ${item.category} ${item.specification}`.toLowerCase().includes(query.trim().toLowerCase()));
  const importBom = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const parsed = rows.slice(rows[0]?.includes("物料") || rows[0]?.toLowerCase().includes("material") ? 1 : 0).map((line, index) => {
      const [materialNo, name, category = "未分类", quantity = "1", unit = "件", specification = ""] = line.split(/[,，\t]/).map((cell) => cell.trim().replace(/^"|"$/g, ""));
      return materialNo && name ? { id: `import-${Date.now()}-${index}`, materialNo, name, category, quantity: Math.max(1, Number(quantity) || 1), unit, specification } : null;
    }).filter((item): item is BomItem => Boolean(item));
    if (!parsed.length) return window.alert("未识别到有效物料，请使用 CSV/TSV：物料号、名称、分类、数量、单位、规格");
    setItems((current) => {
      const next = [...current];
      for (const item of parsed) { const existing = next.findIndex((row) => row.materialNo === item.materialNo); if (existing >= 0) next[existing] = { ...next[existing], ...item, id: next[existing].id }; else next.push(item); }
      return next;
    });
    window.alert(`成功导入 ${parsed.length} 条物料，重复物料号已更新`);
  };
  const addItem = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const materialNo = String(form.get("materialNo") || "").trim();
    if (items.some((item) => item.materialNo === materialNo)) return window.alert("该物料号已存在，请使用其他物料号");
    setItems((current) => [...current, { id: `bom-${Date.now()}`, materialNo, name: String(form.get("name") || "").trim(), category: String(form.get("category") || "未分类"), quantity: Math.max(1, Number(form.get("quantity")) || 1), unit: String(form.get("unit") || "件"), specification: String(form.get("specification") || "").trim() }]); setShowAdd(false);
  };
  const removeItem = (item: BomItem) => { if (window.confirm(`确认删除物料 ${item.materialNo}（${item.name}）？`)) setItems((current) => current.filter((row) => row.id !== item.id)); };
  return <section className="content-card bom-ledger">
    <div className="bom-summary"><Metric icon={<PackageOpen/>} tone="blue" label="物料项" value={String(items.length)} trend="当前台账"/><Metric icon={<Archive/>} tone="teal" label="标准件" value={String(items.filter((item) => item.category === "标准件").length)} trend="自动统计"/><Metric icon={<Zap/>} tone="orange" label="物料总数" value={String(items.reduce((sum, item) => sum + item.quantity, 0))} trend="数量合计"/></div>
    <div className="bom-toolbar"><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="查询物料号、名称、分类或规格"/></label><span>显示 {visible.length} / {items.length} 条</span><label className="bom-import"><Upload size={16}/>批量导入<input type="file" accept=".csv,.tsv,.txt" onChange={(event) => void importBom(event.target.files?.[0])}/></label><button className="primary-button" onClick={() => setShowAdd(true)}><Plus size={16}/>新增物料</button></div>
    <div className="bom-ledger-table"><div className="bom-ledger-head"><b>物料号</b><b>物料名称</b><b>分类</b><b>规格型号</b><b>数量</b><b>单位</b><b>操作</b></div>{visible.length ? visible.map((item) => <div className="bom-ledger-row" key={item.id}><b>{item.materialNo}</b><span>{item.name}</span><span>{item.category}</span><span>{item.specification || "—"}</span><span>{item.quantity}</span><span>{item.unit}</span><button className="danger-button" onClick={() => removeItem(item)} title={`删除${item.materialNo}`}><Trash2 size={16}/></button></div>) : <div className="empty-state"><Search size={28}/><b>没有匹配的物料</b><span>请调整查询条件或新增物料</span></div>}</div>
    {showAdd && <div className="overlay modal-overlay"><form className="modal bom-add-modal" onSubmit={addItem}><header><div><p>BOM MATERIAL MASTER</p><h2>新增物料</h2></div><button type="button" className="icon-button" aria-label="关闭新增物料窗口" onClick={() => setShowAdd(false)}><X/></button></header><div className="form-grid"><label>物料号<input name="materialNo" placeholder="例如 CELL-301" required/></label><label>物料名称<input name="name" placeholder="例如 视觉相机安装支架" required/></label><label>物料分类<select name="category"><option>自制件</option><option>装配体</option><option>焊接件</option><option>标准件</option><option>外购件</option><option>电气件</option></select></label><label>数量<input name="quantity" type="number" min="1" defaultValue="1" required/></label><label>单位<select name="unit"><option>件</option><option>套</option><option>根</option><option>米</option><option>台</option><option>个</option></select></label><label>规格型号<input name="specification" placeholder="填写型号、尺寸或材质"/></label></div><footer><button type="button" onClick={() => setShowAdd(false)}>取消</button><button type="submit" className="primary-button">保存物料</button></footer></form></div>}
  </section>;
}
type DeviceLogEvent = { id: string; category: "device" | "model" | "version" | "publish"; title: string; detail: string; operator: string; time: string };
function LogCenter({ devices, notify }: { devices: Device[]; notify: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | DeviceLogEvent["category"]>("all");
  const [expanded, setExpanded] = useState<string[]>(devices.slice(0, 2).map((device) => device.id));
  const categoryLabel = { all: "全部记录", device: "设备更新", model: "模型文件", version: "版本更新", publish: "模型发布" };
  const groups = devices.map((device, deviceIndex) => ({
    device,
    progress: device.status === "已发布" ? 100 : device.status === "审批中" ? 82 : 56,
    events: [
      { id: `${device.id}-1`, category: "device" as const, title: `${device.owner}新增设备模型`, detail: `创建 ${device.name} 设备主数据并录入设备编号 ${device.code}`, operator: device.owner, time: `2026-08-0${Math.max(1, 3 + deviceIndex)} 09:20` },
      { id: `${device.id}-2`, category: "model" as const, title: `${device.owner}上传主装配体模型`, detail: `上传 ${device.code}_总装.SLDASM，并归档到当前设备版本`, operator: device.owner, time: `2026-08-0${Math.max(1, 4 + deviceIndex)} 11:15` },
      { id: `${device.id}-3`, category: "version" as const, title: `${device.owner}更新设备版本 ${device.version}`, detail: device.change, operator: device.owner, time: `2026-08-0${Math.max(1, 5 + deviceIndex)} 14:30` },
      ...(device.status === "已发布" ? [{ id: `${device.id}-4`, category: "publish" as const, title: `${device.owner}发布设备模型 ${device.version}`, detail: `将 ${device.name} ${device.version} 设置为当前正式版本`, operator: device.owner, time: `2026-08-0${Math.max(1, 6 + deviceIndex)} 16:10` }] : []),
    ] as DeviceLogEvent[],
  }));
  const filtered = groups.map((group) => ({ ...group, events: group.events.filter((event) => (category === "all" || event.category === category) && `${group.device.name} ${group.device.code} ${event.title} ${event.detail} ${event.operator}`.toLowerCase().includes(query.trim().toLowerCase())) })).filter((group) => group.events.length > 0);
  const toggle = (id: string) => setExpanded((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const exportText = filtered.flatMap((group) => group.events.map((event) => `${group.device.name}\t${categoryLabel[event.category]}\t${event.title}\t${event.time}`)).join("\n");
  return <section className="content-card device-log-page">
    <div className="device-log-toolbar"><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索设备、版本、模型或操作人"/></label><div className="log-category-tabs">{Object.entries(categoryLabel).map(([key,label]) => <button className={category === key ? "active" : ""} key={key} onClick={() => setCategory(key as typeof category)}>{label}</button>)}</div><button className="log-export" onClick={() => { downloadText("ModelFlow设备更新日志.txt", exportText); notify("设备更新日志已导出"); }}><Download size={16}/>导出</button></div>
    <div className="device-log-caption"><Activity size={16}/><span>这里只记录设备、模型文件和版本更新；审批记录请到“审批中心”查看。</span><b>{filtered.reduce((sum, group) => sum + group.events.length, 0)} 条记录</b></div>
    <div className="device-log-groups">{filtered.length ? filtered.map(({device,progress,events}) => { const open = expanded.includes(device.id); return <article className="device-log-group" key={device.id}><button className="device-log-head" onClick={() => toggle(device.id)}><img src={device.image} alt=""/><span><b>{device.name}</b><small>{device.code} · 当前版本 {device.version}</small></span><div className="device-log-progress"><span><i style={{width:`${progress}%`}}/></span><small>资料进度 {progress}%</small></div><em>{events.length} 条更新</em>{open ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}</button>{open && <div className="device-log-events">{events.map((event) => <div key={event.id}><i className={`log-dot ${event.category}`}></i><span className="log-event-icon">{event.category === "device" ? <Boxes size={16}/> : event.category === "model" ? <FileBox size={16}/> : <History size={16}/>}</span><div><b>{event.title}</b><p>{event.detail}</p><small>{categoryLabel[event.category]} · 操作人：{event.operator}</small></div><time>{event.time}</time></div>)}</div>}</article>; }) : <div className="empty-state"><Search size={30}/><b>没有匹配的设备更新记录</b><span>请调整日志类别或搜索关键词</span></div>}</div>
  </section>;
}
