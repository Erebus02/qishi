export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  roleCode: string;
  roleName: string;
  permissions: string[];
  dataScope: string;
};

export type DeviceRecord = {
  id: string;
  code: string;
  name: string;
  version: string;
  status: "已发布" | "审批中" | "草稿";
  project: string;
  owner: string;
  updated: string;
  change: string;
  files: number;
  bom: string;
  image: string;
  category: string;
  lifecycleStatus: string;
  description: string;
  rowVersion: number;
};

export type BootstrapData = {
  user: AppUser;
  devices: DeviceRecord[];
  metrics: {
    devices: number;
    versions: number;
    published: number;
    pendingApproval: number;
  };
};
