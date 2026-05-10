export const COUPON_PROTECTED_FIELDS = [
  "docId",
  "createdAt",
  "usageCount",
  "userIds",
  "source",
  "referralId",
] as const;

export const COUPON_IMPORTABLE_FIELDS = [
  "code",
  "type",
  "amount",
  "expiryDate",
  "storeId",
  "notes",
  "usageLimit",
  "isUsed",
] as const;

export const COUPON_EXPORTABLE_FIELDS = [
  "docId",
  "createdAt",
  "usageCount",
  "userIds",
  "source",
  "referralId",
  "code",
  "type",
  "amount",
  "expiryDate",
  "storeId",
  "notes",
  "usageLimit",
  "isUsed",
] as const;

export const COUPON_REQUIRED_FIELDS = ["code"] as const;
