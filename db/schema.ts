import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  permissions: text("permissions").notNull().default("[]"),
  dataScope: text("data_scope").notNull().default("own"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  roleId: text("role_id").notNull().references(() => roles.id),
  status: text("status").notNull().default("active"),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id").references(() => users.id),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  lifecycleStatus: text("lifecycle_status").notNull().default("designing"),
  description: text("description").notNull().default(""),
  ownerUserId: text("owner_user_id").references(() => users.id),
  currentVersionId: text("current_version_id"),
  thumbnailKey: text("thumbnail_key"),
  fileCount: integer("file_count").notNull().default(0),
  bomVersion: text("bom_version").notNull().default(""),
  rowVersion: integer("row_version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at"),
}, (table) => ({
  codeIndex: uniqueIndex("devices_code_unique").on(table.code),
}));

export const deviceVersions = sqliteTable("device_versions", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull().references(() => devices.id),
  versionNo: text("version_no").notNull(),
  baseVersionId: text("base_version_id"),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull().default("draft"),
  ownerUserId: text("owner_user_id").references(() => users.id),
  releasedAt: text("released_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  deviceVersionUnique: uniqueIndex("device_versions_device_no_unique").on(table.deviceId, table.versionNo),
}));

export const changeItems = sqliteTable("change_items", {
  id: text("id").primaryKey(),
  versionId: text("version_id").notNull().references(() => deviceVersions.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  module: text("module").notNull().default("mechanical"),
  severity: text("severity").notNull().default("medium"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").references(() => devices.id),
  versionId: text("version_id").references(() => deviceVersions.id),
  fileName: text("file_name").notNull(),
  objectKey: text("object_key").notNull().unique(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256"),
  role: text("role").notNull().default("attachment"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  machineName: text("machine_name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  solidworksVersion: text("solidworks_version"),
  agentVersion: text("agent_version"),
  status: text("status").notNull().default("offline"),
  lastSeenAt: text("last_seen_at"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").references(() => devices.id),
  versionId: text("version_id").references(() => deviceVersions.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  priority: integer("priority").notNull().default(0),
  inputFileId: text("input_file_id").references(() => files.id),
  parameters: text("parameters").notNull().default("{}"),
  result: text("result"),
  errorMessage: text("error_message"),
  assignedAgentId: text("assigned_agent_id").references(() => agents.id),
  attempts: integer("attempts").notNull().default(0),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  detail: text("detail").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const changeOrders = sqliteTable("change_orders", {
  id: text("id").primaryKey(),
  orderNo: text("order_no").notNull().unique(),
  batchNo: text("batch_no").notNull(),
  title: text("title").notNull(),
  reason: text("reason").notNull(),
  description: text("description").notNull().default(""),
  priority: text("priority").notNull().default("normal"),
  plannedAt: text("planned_at"),
  status: text("status").notNull().default("draft"),
  applicantUserId: text("applicant_user_id").notNull().references(() => users.id),
  reviewerUserId: text("reviewer_user_id").references(() => users.id),
  reviewComment: text("review_comment"),
  submittedAt: text("submitted_at"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const changeOrderDevices = sqliteTable("change_order_devices", {
  id: text("id").primaryKey(),
  changeOrderId: text("change_order_id").notNull().references(() => changeOrders.id),
  deviceId: text("device_id").notNull().references(() => devices.id),
  versionId: text("version_id").references(() => deviceVersions.id),
  deviceCodeSnapshot: text("device_code_snapshot").notNull(),
  deviceNameSnapshot: text("device_name_snapshot").notNull(),
  versionNoSnapshot: text("version_no_snapshot").notNull().default("—"),
}, (table) => ({
  orderDeviceUnique: uniqueIndex("change_order_devices_order_device_unique").on(table.changeOrderId, table.deviceId),
}));
