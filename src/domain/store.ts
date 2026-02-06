import { ActorType, EventType, Invoice, InvoiceSnapshot, InvoiceVersion, InvoiceViewToken } from '@/types/invoice';

export type EventInsert = {
  invoiceId: string;
  actorType: ActorType;
  actorId?: string;
  eventType: EventType;
  payloadJson: Record<string, unknown>;
};

export interface InvoiceStore {
  createInvoice(input: Omit<Invoice, 'id' | 'currentVersionId'> & { currentVersionId?: string | null }): Promise<Invoice>;
  findInvoiceById(invoiceId: string, tenantId: string): Promise<Invoice | null>;
  updateInvoice(invoiceId: string, tenantId: string, patch: Partial<Invoice>): Promise<Invoice>;
  createVersion(input: {
    invoiceId: string;
    versionNumber: number;
    snapshotJson: InvoiceSnapshot;
    subtotal: number;
    tax: number;
    total: number;
    createdByUserId: string;
  }): Promise<InvoiceVersion>;
  getCurrentVersion(invoiceId: string): Promise<InvoiceVersion | null>;
  getLatestVersionNumber(invoiceId: string): Promise<number>;
  createEvent(input: EventInsert): Promise<void>;
  createViewToken(input: { invoiceId: string; tokenHash: string; expiresAt: Date }): Promise<InvoiceViewToken>;
  findActiveTokens(invoiceId: string): Promise<InvoiceViewToken[]>;
  markTokenUsed(tokenId: string): Promise<void>;
}
