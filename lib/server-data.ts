import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import type { AppUser, BootstrapData, DeviceRecord } from "./types";

const ADMIN_PERMISSIONS = [
  "device.read", "device.create", "device.update", "device.delete", "device.restore",
  "version.read", "version.create", "version.submit", "version.approve", "version.publish",
  "file.read", "file.upload", "file.download", "task.read", "task.create",
  "agent.manage", "role.manage", "audit.read",
  "change.read", "change.create", "change.submit", "change.approve",
];
const ENGINEER_PERMISSIONS = [
  "device.read", "device.create", "device.update", "version.read", "version.create",
  "version.submit", "file.read", "file.upload", "file.download", "task.read", "task.create",
  "change.read", "change.create", "change.submit",
];
const REVIEWER_PERMISSIONS = ["device.read", "version.read", "version.approve", "file.read", "file.download", "audit.read", "change.read", "change.approve"];
const VIEWER_PERMISSIONS = ["device.read", "version.read", "file.read", "file.download"];

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function db() {
  if (!env.DB) throw new Error("Database binding is unavailable");
  return env.DB;
}

export async function initializeAndGetUser(auth: ChatGPTUser): Promise<AppUser> {
  const d1 = db();
  await d1.batch([
    d1.prepare("INSERT OR IGNORE INTO roles (id,name,code,permissions,data_scope) VALUES (?,?,?,?,?)").bind("role_admin", "系统管理员", "admin", JSON.stringify(ADMIN_PERMISSIONS), "all"),
    d1.prepare("INSERT OR IGNORE INTO roles (id,name,code,permissions,data_scope) VALUES (?,?,?,?,?)").bind("role_engineer", "设计工程师", "engineer", JSON.stringify(ENGINEER_PERMISSIONS), "project"),
    d1.prepare("INSERT OR IGNORE INTO roles (id,name,code,permissions,data_scope) VALUES (?,?,?,?,?)").bind("role_reviewer", "审核工程师", "reviewer", JSON.stringify(REVIEWER_PERMISSIONS), "project"),
    d1.prepare("INSERT OR IGNORE INTO roles (id,name,code,permissions,data_scope) VALUES (?,?,?,?,?)").bind("role_viewer", "生产只读", "viewer", JSON.stringify(VIEWER_PERMISSIONS), "published"),
  ]);

  let row = await d1.prepare(`SELECT u.id,u.email,u.display_name,u.status,r.code role_code,r.name role_name,r.permissions,r.data_scope
    FROM users u JOIN roles r ON r.id=u.role_id WHERE lower(u.email)=lower(?)`).bind(auth.email).first<Record<string, string>>();

  if (!row) {
    const count = await d1.prepare("SELECT COUNT(*) total FROM users").first<{ total: number }>();
    const userId = id("usr");
    const roleId = auth.email === "public-admin@modelflow.local" || Number(count?.total ?? 0) === 0 ? "role_admin" : "role_engineer";
    await d1.prepare("INSERT INTO users (id,email,display_name,role_id,last_login_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)")
      .bind(userId, auth.email.toLowerCase(), auth.displayName, roleId).run();
    row = await d1.prepare(`SELECT u.id,u.email,u.display_name,u.status,r.code role_code,r.name role_name,r.permissions,r.data_scope
      FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?`).bind(userId).first<Record<string, string>>();
  } else {
    await d1.prepare("UPDATE users SET display_name=?,last_login_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(auth.displayName, row.id).run();
  }

  if (!row || row.status !== "active") throw new Error("ACCOUNT_DISABLED");
  await seedBusinessData(row.id);
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    roleCode: row.role_code,
    roleName: row.role_name,
    permissions: JSON.parse(row.permissions || "[]"),
    dataScope: row.data_scope,
  };
}

async function seedBusinessData(ownerUserId: string) {
  const d1 = db();
  const existing = await d1.prepare("SELECT COUNT(*) total FROM projects").first<{ total: number }>();
  if (Number(existing?.total ?? 0) > 0) return;

  await d1.batch([
    d1.prepare("INSERT INTO projects (id,code,name,owner_user_id) VALUES (?,?,?,?)").bind("prj_sfn", "PRJ-SFN", "厦门 SFN 自动化项目", ownerUserId),
    d1.prepare("INSERT INTO projects (id,code,name,owner_user_id) VALUES (?,?,?,?)").bind("prj_hp", "PRJ-HP", "氢破炉节能改造", ownerUserId),
    d1.prepare("INSERT INTO projects (id,code,name,owner_user_id) VALUES (?,?,?,?)").bind("prj_pack", "PRJ-PACK", "检包自动化升级", ownerUserId),
    d1.prepare("INSERT INTO projects (id,code,name,owner_user_id) VALUES (?,?,?,?)").bind("prj_glue", "PRJ-GLUE", "磁钢粘胶自动化", ownerUserId),
  ]);

  const seeds = [
    ["dev_sfn", "prj_sfn", "EQ-SFN-002", "粉末自动转运设备", "粉末处理设备", "ver_sfn_23", "/devices/powder-transfer-machine.png", 28, "BOM-2.3", "V2.3", "published", "优化视觉定位与上位机联动"],
    ["dev_hp", "prj_hp", "EQ-HP-019", "氢破炉 19 号", "热处理设备", "ver_hp_16", "/devices/hydrogen-furnace.png", 34, "BOM-1.6", "V1.6", "published", "喷淋系统双管改单管，缩短冷却时间"],
    ["dev_pack", "prj_pack", "EQ-PACK-006", "检包自动装盘机", "包装检测设备", "ver_pack_31", "/devices/inspection-tray-machine.png", 31, "BOM-3.1", "V3.1", "in_review", "优化装盘节拍与漏装检测"],
    ["dev_glue", "prj_glue", "EQ-GLUE-004", "磁钢自动粘胶线", "装配设备", "ver_glue_12", "/devices/inspection-tray-machine.png", 19, "BOM-1.2", "V1.2", "draft", "调整机械手抓取结构与胶路参数"],
  ] as const;

  for (const seed of seeds) {
    const [deviceId, projectId, code, name, category, versionId, image, fileCount, bom, versionNo, versionStatus, summary] = seed;
    await d1.batch([
      d1.prepare(`INSERT INTO devices (id,project_id,code,name,category,lifecycle_status,owner_user_id,current_version_id,thumbnail_key,file_count,bom_version)
        VALUES (?,?,?,?,?,'active',?,?,?,?,?)`).bind(deviceId, projectId, code, name, category, ownerUserId, versionId, image, fileCount, bom),
      d1.prepare(`INSERT INTO device_versions (id,device_id,version_no,title,summary,status,owner_user_id,released_at)
        VALUES (?,?,?,?,?,?,?,CASE WHEN ?='published' THEN CURRENT_TIMESTAMP ELSE NULL END)`)
        .bind(versionId, deviceId, versionNo, `${name} ${versionNo}`, summary, versionStatus, ownerUserId, versionStatus),
      d1.prepare("INSERT INTO change_items (id,version_id,type,title,description,module,severity) VALUES (?,?,?,?,?,'mechanical','medium')")
        .bind(id("chg"), versionId, "modified", summary, summary),
    ]);
  }
}

function uiStatus(status: string): DeviceRecord["status"] {
  if (status === "published") return "已发布";
  if (status === "in_review") return "审批中";
  return "草稿";
}

export async function loadBootstrap(user: AppUser): Promise<BootstrapData> {
  const d1 = db();
  const result = await d1.prepare(`SELECT d.id,d.code,d.name,d.category,d.lifecycle_status,d.description,d.row_version,d.thumbnail_key,d.file_count,d.bom_version,d.updated_at,
    p.name project_name,COALESCE(u.display_name,'未分配') owner_name,
    COALESCE(v.version_no,'—') version_no,COALESCE(v.status,'draft') version_status,COALESCE(v.summary,'尚未创建版本') summary
    FROM devices d JOIN projects p ON p.id=d.project_id
    LEFT JOIN users u ON u.id=d.owner_user_id LEFT JOIN device_versions v ON v.id=d.current_version_id
    WHERE d.deleted_at IS NULL ORDER BY d.updated_at DESC`).all<Record<string, string | number>>();

  const deviceRows: DeviceRecord[] = (result.results ?? []).map((row) => ({
    id: String(row.id), code: String(row.code), name: String(row.name), version: String(row.version_no),
    status: uiStatus(String(row.version_status)), project: String(row.project_name), owner: String(row.owner_name),
    updated: String(row.updated_at).slice(0, 10), change: String(row.summary), files: Number(row.file_count),
    bom: String(row.bom_version), image: String(row.thumbnail_key || "/devices/powder-transfer-machine.png"), category: String(row.category),
    lifecycleStatus: String(row.lifecycle_status), description: String(row.description || ""), rowVersion: Number(row.row_version),
  }));
  const versionCounts = await d1.prepare(`SELECT COUNT(*) total,
    SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) published,
    SUM(CASE WHEN status='in_review' THEN 1 ELSE 0 END) pending FROM device_versions`).first<Record<string, number>>();
  return {
    user,
    devices: deviceRows,
    metrics: {
      devices: deviceRows.length,
      versions: Number(versionCounts?.total ?? 0),
      published: Number(versionCounts?.published ?? 0),
      pendingApproval: Number(versionCounts?.pending ?? 0),
    },
  };
}

export async function requirePermission(auth: ChatGPTUser, permission: string) {
  const user = await initializeAndGetUser(auth);
  if (!user.permissions.includes(permission)) throw new Error("FORBIDDEN");
  return user;
}

export async function writeAudit(userId: string, action: string, resourceType: string, resourceId: string | null, detail: unknown) {
  await db().prepare("INSERT INTO audit_logs (id,user_id,action,resource_type,resource_id,detail) VALUES (?,?,?,?,?,?)")
    .bind(id("audit"), userId, action, resourceType, resourceId, JSON.stringify(detail)).run();
}

export function newId(prefix: string) { return id(prefix); }
export function getRawDb() { return db(); }
