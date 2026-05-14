export const TRANSACTION_PROTECTED_FIELDS = [
  "docId",
  "orderId",
  "customerId",
  "amount",
  "createdAt",
  "status",
  "paymentMethod",
  "paymentId",
  "paymentTime",
  "orderNumber",
  "type",
  "recipientCustomerId",
  "recipientEmail",
  "recipientFullName",
  "senderFirstName",
  "senderLastName",
  "transactionNumber",
  "totalAmount",
  "gst",
  "gstAmount",
  "gstNumber",
] as const;

export const TRANSACTION_IMPORTABLE_FIELDS: string[] = [];

export const TRANSACTION_EXPORTABLE_FIELDS = [
  "transactionNumber",
  "createdAt",
  "paymentMethod",
  "type",
  "customerId",
  "amount",
  "status",
  "orderId",
  "gst",
  "gstAmount",
  "totalAmount",
  "recipientEmail",
] as const;

export const TRANSACTION_REQUIRED_FIELDS: string[] = [];
