export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  USER = "USER",
}

export enum PermissionAction {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  /** Full access to a resource. Implies every other action on it. */
  MANAGE = "manage",
}

export enum Resource {
  USERS = "users",
  ROLES = "roles",
  PERMISSIONS = "permissions",
  DASHBOARD = "dashboard",
  SETTINGS = "settings",
}
