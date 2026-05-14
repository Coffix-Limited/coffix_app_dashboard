export const NOTIFICATION_PROTECTED_FIELDS = [
  "docId",
  "createdBy",
  "createdAt",
  "sentAt",
] as const;

export const NOTIFICATION_IMPORTABLE_FIELDS: string[] = [];

export const NOTIFICATION_EXPORTABLE_FIELDS = [
  "docId",
  "name",
  "status",
  "channels",
  "createdAt",
  "sentAt",
] as const;

export const NOTIFICATION_REQUIRED_FIELDS: string[] = [];
