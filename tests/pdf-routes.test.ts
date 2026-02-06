import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getAdminPdf } from '@/app/api/admin/invoices/[id]/pdf/route';
import { GET as getCustomerPdf } from '@/app/api/i/[invoiceId]/pdf/route';
import { createDraftInvoice, createViewToken, issueInvoice } from '@/domain/invoice';
import { invoiceStore } from '@/lib/store-singleton';

const snapshot = {
  customerName: 'ACME', customerEmail: 'billing@acme.com', billingAddress: 'Tokyo', invoiceNumber: 'INV-PDF', currency: 'JPY', dueDate: new Date().toISOString(),
  items: [{ description: 'Hosting', quantity: 2, unitPrice: 5000 }]
};

describe('pdf routes', () => {
  it('admin pdf route requires auth', async () => {
    const req = new NextRequest('http://localhost/api/admin/invoices/x/pdf');
    await expect(getAdminPdf(req, { params: { id: 'x' } })).rejects.toThrow(/Unauthorized/);
  });

  it('customer pdf route requires valid token', async () => {
    const inv = await createDraftInvoice(invoiceStore, { tenantId: 't-pdf', customerId: 'c', invoiceNumber: 'INV-PDF-2', currency: 'JPY', dueDate: new Date(), snapshot, createdByUserId: 'u' });
    await issueInvoice(invoiceStore, { tenantId: 't-pdf', invoiceId: inv.id, userId: 'u' });
    const badReq = new NextRequest(`http://localhost/api/i/${inv.id}/pdf?t=bad`);
    const badRes = await getCustomerPdf(badReq, { params: { invoiceId: inv.id } });
    expect(badRes.status).toBe(404);

    const token = await createViewToken(invoiceStore, { tenantId: 't-pdf', invoiceId: inv.id, userId: 'u' });
    const okReq = new NextRequest(`http://localhost/api/i/${inv.id}/pdf?t=${token.token}`);
    const okRes = await getCustomerPdf(okReq, { params: { invoiceId: inv.id } });
    expect(okRes.status).toBe(200);
  });
});
