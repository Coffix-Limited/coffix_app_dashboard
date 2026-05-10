export const LOG_PROTECTED_FIELDS = [
  "docId",
  "time",
  "page",
  "category",
  "severityLevel",
  "action",
  "notes",
  "customerId",
  "userId",
] as const;

export const LOG_IMPORTABLE_FIELDS: string[] = [];

export const LOG_EXPORTABLE_FIELDS = [
  "docId",
  "time",
  "page",
  "category",
  "severityLevel",
  "action",
  "notes",
  "customerId",
  "userId",
] as const;

export const LOG_REQUIRED_FIELDS: string[] = [];
