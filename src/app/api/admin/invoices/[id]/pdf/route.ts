import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf';
import { invoiceStore } from '@/lib/store-singleton';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireSession(req);
  const invoice = await invoiceStore.findInvoiceById(params.id, session.tenantId);
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const version = await invoiceStore.getCurrentVersion(invoice.id);
  if (!version) return NextResponse.json({ error: 'No snapshot' }, { status: 404 });
  const pdf = await generateInvoicePdf(version.snapshotJson);
  return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf' } });
}
