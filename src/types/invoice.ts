export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'VIEWED' | 'PAID' | 'VOID';
export type ActorType = 'INTERNAL' | 'CUSTOMER' | 'SYSTEM';
export type EventType =
  | 'DRAFT_CREATED'
  | 'DRAFT_UPDATED'
  | 'INVOICE_ISSUED'
  | 'VIEW_TOKEN_CREATED'
  | 'DELIVERY_SENT'
  | 'INVOICE_VIEWED'
  | 'INVOICE_PAID'
  | 'PDF_GENERATED';

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceSnapshot = {
  customerName: string;
  customerEmail: string;
  billingAddress: string;
  invoiceNumber: string;
  currency: string;
  dueDate: string;
  items: InvoiceItem[];
  memo?: string;
};

export type Invoice = {
  id: string;
  tenantId: string;
  customerId: string;
  invoiceNumber: string;
  currency: string;
  status: InvoiceStatus;
  issuedAt: Date | null;
  dueDate: Date;
  totalAmount: number;
  currentVersionId: string | null;
};

export type InvoiceVersion = {
  id: string;
  invoiceId: string;
  versionNumber: number;
  snapshotJson: InvoiceSnapshot;
  subtotal: number;
  tax: number;
  total: number;
  createdByUserId: string;
  createdAt: Date;
};

export type InvoiceViewToken = {
  id: string;
  invoiceId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};
