import crypto from 'node:crypto';
import { DomainError } from '@/lib/errors';
import { InvoiceStore } from '@/domain/store';
import { InvoiceSnapshot } from '@/types/invoice';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

const calculateTotals = (snapshot: InvoiceSnapshot): { subtotal: number; tax: number; total: number } => {
  const subtotal = snapshot.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = Math.round(subtotal * 0.1 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
};

export async function createDraftInvoice(store: InvoiceStore, input: {
  tenantId: string; customerId: string; invoiceNumber: string; currency: string; dueDate: Date;
  snapshot: InvoiceSnapshot; createdByUserId: string;
}) {
  const totals = calculateTotals(input.snapshot);
  const invoice = await store.createInvoice({
    tenantId: input.tenantId,
    customerId: input.customerId,
    invoiceNumber: input.invoiceNumber,
    currency: input.currency,
    status: 'DRAFT',
    issuedAt: null,
    dueDate: input.dueDate,
    totalAmount: totals.total
  });
  const version = await store.createVersion({ invoiceId: invoice.id, versionNumber: 1, ...totals, snapshotJson: input.snapshot, createdByUserId: input.createdByUserId });
  await store.updateInvoice(invoice.id, input.tenantId, { currentVersionId: version.id });
  await store.createEvent({ invoiceId: invoice.id, actorType: 'INTERNAL', actorId: input.createdByUserId, eventType: 'DRAFT_CREATED', payloadJson: { versionNumber: 1 } });
  return invoice;
}

export async function updateDraftInvoice(store: InvoiceStore, input: {
  tenantId: string; invoiceId: string; snapshot: InvoiceSnapshot; updatedByUserId: string;
}) {
  const invoice = await store.findInvoiceById(input.invoiceId, input.tenantId);
  if (!invoice) throw new DomainError('Invoice not found', 404);
  if (invoice.status !== 'DRAFT') throw new DomainError('Only draft invoices can be edited', 409);
  const totals = calculateTotals(input.snapshot);
  const nextVersion = (await store.getLatestVersionNumber(invoice.id)) + 1;
  const version = await store.createVersion({ invoiceId: invoice.id, versionNumber: nextVersion, snapshotJson: input.snapshot, ...totals, createdByUserId: input.updatedByUserId });
  await store.updateInvoice(invoice.id, input.tenantId, { currentVersionId: version.id, totalAmount: totals.total });
  await store.createEvent({ invoiceId: invoice.id, actorType: 'INTERNAL', actorId: input.updatedByUserId, eventType: 'DRAFT_UPDATED', payloadJson: { versionNumber: nextVersion } });
}

export async function issueInvoice(store: InvoiceStore, input: { tenantId: string; invoiceId: string; userId: string }) {
  const invoice = await store.findInvoiceById(input.invoiceId, input.tenantId);
  if (!invoice) throw new DomainError('Invoice not found', 404);
  if (invoice.status !== 'DRAFT') throw new DomainError('Only draft invoices can be issued', 409);
  const version = await store.getCurrentVersion(invoice.id);
  if (!version) throw new DomainError('Current version missing', 500);
  if (Math.abs(version.total - invoice.totalAmount) > 0.001) throw new DomainError('Total mismatch', 409);
  const issuedAt = new Date();
  await store.updateInvoice(invoice.id, input.tenantId, { status: 'ISSUED', issuedAt });
  await store.createEvent({ invoiceId: invoice.id, actorType: 'INTERNAL', actorId: input.userId, eventType: 'INVOICE_ISSUED', payloadJson: { issuedAt: issuedAt.toISOString(), versionId: version.id } });
}

export async function createViewToken(store: InvoiceStore, input: { tenantId: string; invoiceId: string; userId: string; ttlSeconds?: number }) {
  const invoice = await store.findInvoiceById(input.invoiceId, input.tenantId);
  if (!invoice) throw new DomainError('Invoice not found', 404);
  if (!['ISSUED', 'SENT', 'VIEWED', 'PAID'].includes(invoice.status)) throw new DomainError('Invoice must be issued first', 409);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * (input.ttlSeconds ?? TOKEN_TTL_SECONDS));
  const row = await store.createViewToken({ invoiceId: invoice.id, tokenHash: sha256(token), expiresAt });
  await store.createEvent({ invoiceId: invoice.id, actorType: 'INTERNAL', actorId: input.userId, eventType: 'VIEW_TOKEN_CREATED', payloadJson: { tokenId: row.id, expiresAt: expiresAt.toISOString() } });
  return { token, expiresAt };
}

export async function verifyViewToken(store: InvoiceStore, input: { invoiceId: string; token: string }) {
  const active = await store.findActiveTokens(input.invoiceId);
  const now = Date.now();
  const incoming = Buffer.from(sha256(input.token), 'hex');
  for (const tokenRow of active) {
    if (tokenRow.expiresAt.getTime() < now) continue;
    const current = Buffer.from(tokenRow.tokenHash, 'hex');
    if (current.length === incoming.length && crypto.timingSafeEqual(current, incoming)) {
      return tokenRow;
    }
  }
  return null;
}

export async function markViewed(store: InvoiceStore, input: { tenantId: string; invoiceId: string; actorId?: string }) {
  const invoice = await store.findInvoiceById(input.invoiceId, input.tenantId);
  if (!invoice) throw new DomainError('Invoice not found', 404);
  if (invoice.status === 'VIEWED' || invoice.status === 'PAID') return;
  await store.updateInvoice(invoice.id, input.tenantId, { status: 'VIEWED' });
  await store.createEvent({ invoiceId: invoice.id, actorType: 'CUSTOMER', actorId: input.actorId, eventType: 'INVOICE_VIEWED', payloadJson: {} });
}

export async function markPaid(store: InvoiceStore, input: { tenantId: string; invoiceId: string; actorId?: string }) {
  const invoice = await store.findInvoiceById(input.invoiceId, input.tenantId);
  if (!invoice) throw new DomainError('Invoice not found', 404);
  if (invoice.status === 'PAID') return;
  await store.updateInvoice(invoice.id, input.tenantId, { status: 'PAID' });
  await store.createEvent({ invoiceId: invoice.id, actorType: 'SYSTEM', actorId: input.actorId, eventType: 'INVOICE_PAID', payloadJson: {} });
}
