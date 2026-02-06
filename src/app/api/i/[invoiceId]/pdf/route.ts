import { NextRequest, NextResponse } from 'next/server';
import { verifyViewToken } from '@/domain/invoice';
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf';
import { invoiceStore } from '@/lib/store-singleton';

export async function GET(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  const token = req.nextUrl.searchParams.get('t');
  if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const tokenRow = await verifyViewToken(invoiceStore, { invoiceId: params.invoiceId, token });
  if (!tokenRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const version = await invoiceStore.getCurrentVersion(params.invoiceId);
  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const pdf = await generateInvoicePdf(version.snapshotJson);
  return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf' } });
}
