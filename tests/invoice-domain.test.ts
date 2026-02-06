import { describe, expect, it } from 'vitest';
import { InMemoryInvoiceStore } from '@/domain/memory-store';
import { createDraftInvoice, createViewToken, issueInvoice, markViewed, updateDraftInvoice, verifyViewToken } from '@/domain/invoice';
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf';

const snapshot = {
  customerName: 'ACME', customerEmail: 'billing@acme.com', billingAddress: 'Tokyo', invoiceNumber: 'INV-1', currency: 'JPY', dueDate: new Date().toISOString(),
  items: [{ description: 'Hosting', quantity: 2, unitPrice: 5000 }]
};

describe('invoice domain', () => {
  it('cannot update after issue', async () => {
    const store = new InMemoryInvoiceStore();
    const inv = await createDraftInvoice(store, { tenantId: 't1', customerId: 'c1', invoiceNumber: 'INV-1', currency: 'JPY', dueDate: new Date(), snapshot, createdByUserId: 'u1' });
    await issueInvoice(store, { tenantId: 't1', invoiceId: inv.id, userId: 'u1' });
    await expect(updateDraftInvoice(store, { tenantId: 't1', invoiceId: inv.id, snapshot, updatedByUserId: 'u1' })).rejects.toThrow(/draft/);
  });

  it('issuing sets issued_at and freezes data', async () => {
    const store = new InMemoryInvoiceStore();
    const inv = await createDraftInvoice(store, { tenantId: 't1', customerId: 'c1', invoiceNumber: 'INV-2', currency: 'JPY', dueDate: new Date(), snapshot, createdByUserId: 'u1' });
    const beforeVersion = await store.getCurrentVersion(inv.id);
    await issueInvoice(store, { tenantId: 't1', invoiceId: inv.id, userId: 'u1' });
    const updated = await store.findInvoiceById(inv.id, 't1');
    const afterVersion = await store.getCurrentVersion(inv.id);
    expect(updated?.issuedAt).toBeTruthy();
    expect(updated?.status).toBe('ISSUED');
    expect(afterVersion?.id).toBe(beforeVersion?.id);
  });

  it('token verification works and expiry is enforced', async () => {
    const store = new InMemoryInvoiceStore();
    const inv = await createDraftInvoice(store, { tenantId: 't1', customerId: 'c1', invoiceNumber: 'INV-3', currency: 'JPY', dueDate: new Date(), snapshot, createdByUserId: 'u1' });
    await issueInvoice(store, { tenantId: 't1', invoiceId: inv.id, userId: 'u1' });
    const active = await createViewToken(store, { tenantId: 't1', invoiceId: inv.id, userId: 'u1', ttlSeconds: 60 });
    const expired = await createViewToken(store, { tenantId: 't1', invoiceId: inv.id, userId: 'u1', ttlSeconds: -1 });
    expect(await verifyViewToken(store, { invoiceId: inv.id, token: active.token })).toBeTruthy();
    expect(await verifyViewToken(store, { invoiceId: inv.id, token: expired.token })).toBeNull();
  });

  it('viewed is idempotent', async () => {
    const store = new InMemoryInvoiceStore();
    const inv = await createDraftInvoice(store, { tenantId: 't1', customerId: 'c1', invoiceNumber: 'INV-4', currency: 'JPY', dueDate: new Date(), snapshot, createdByUserId: 'u1' });
    await issueInvoice(store, { tenantId: 't1', invoiceId: inv.id, userId: 'u1' });
    await markViewed(store, { tenantId: 't1', invoiceId: inv.id });
    await markViewed(store, { tenantId: 't1', invoiceId: inv.id });
    const viewedEvents = store.events.filter((e) => e.eventType === 'INVOICE_VIEWED');
    expect(viewedEvents).toHaveLength(1);
  });

  it('pdf generation corresponds to snapshot data (basic)', async () => {
    const pdf = await generateInvoicePdf(snapshot);
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.includes(Buffer.from('INV-1'))).toBe(true);
  });
});
