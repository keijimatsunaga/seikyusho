import crypto from 'node:crypto';
import { InvoiceStore, EventInsert } from '@/domain/store';
import { Invoice, InvoiceVersion, InvoiceViewToken } from '@/types/invoice';

export class InMemoryInvoiceStore implements InvoiceStore {
  invoices = new Map<string, Invoice>();
  versions = new Map<string, InvoiceVersion[]>();
  tokens = new Map<string, InvoiceViewToken[]>();
  events: EventInsert[] = [];

  async createInvoice(input: Omit<Invoice, 'id' | 'currentVersionId'> & { currentVersionId?: string | null }): Promise<Invoice> {
    const id = crypto.randomUUID();
    const invoice: Invoice = { ...input, id, currentVersionId: input.currentVersionId ?? null };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async findInvoiceById(invoiceId: string, tenantId: string): Promise<Invoice | null> {
    const invoice = this.invoices.get(invoiceId);
    return invoice && invoice.tenantId === tenantId ? invoice : null;
  }

  async updateInvoice(invoiceId: string, tenantId: string, patch: Partial<Invoice>): Promise<Invoice> {
    const inv = await this.findInvoiceById(invoiceId, tenantId);
    if (!inv) throw new Error('invoice not found');
    const updated = { ...inv, ...patch };
    this.invoices.set(invoiceId, updated);
    return updated;
  }

  async createVersion(input: {
    invoiceId: string;
    versionNumber: number;
    snapshotJson: InvoiceVersion['snapshotJson'];
    subtotal: number;
    tax: number;
    total: number;
    createdByUserId: string;
  }): Promise<InvoiceVersion> {
    const version: InvoiceVersion = { id: crypto.randomUUID(), createdAt: new Date(), ...input };
    const list = this.versions.get(input.invoiceId) ?? [];
    list.push(version);
    this.versions.set(input.invoiceId, list);
    const invoice = this.invoices.get(input.invoiceId);
    if (invoice) this.invoices.set(input.invoiceId, { ...invoice, currentVersionId: version.id, totalAmount: input.total });
    return version;
  }

  async getCurrentVersion(invoiceId: string): Promise<InvoiceVersion | null> {
    const invoice = this.invoices.get(invoiceId);
    const list = this.versions.get(invoiceId) ?? [];
    if (!invoice?.currentVersionId) return null;
    return list.find((v) => v.id === invoice.currentVersionId) ?? null;
  }

  async getLatestVersionNumber(invoiceId: string): Promise<number> {
    const list = this.versions.get(invoiceId) ?? [];
    return list.length ? Math.max(...list.map((v) => v.versionNumber)) : 0;
  }

  async createEvent(input: EventInsert): Promise<void> { this.events.push(input); }

  async createViewToken(input: { invoiceId: string; tokenHash: string; expiresAt: Date }): Promise<InvoiceViewToken> {
    const t: InvoiceViewToken = { id: crypto.randomUUID(), usedAt: null, ...input };
    const list = this.tokens.get(input.invoiceId) ?? [];
    list.push(t);
    this.tokens.set(input.invoiceId, list);
    return t;
  }

  async findActiveTokens(invoiceId: string): Promise<InvoiceViewToken[]> {
    return (this.tokens.get(invoiceId) ?? []).filter((t) => !t.usedAt);
  }

  async markTokenUsed(tokenId: string): Promise<void> {
    for (const [id, list] of this.tokens.entries()) {
      const next = list.map((t) => (t.id === tokenId ? { ...t, usedAt: new Date() } : t));
      this.tokens.set(id, next);
    }
  }
}
