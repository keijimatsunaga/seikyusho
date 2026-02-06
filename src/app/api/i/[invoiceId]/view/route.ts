import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { markViewed, verifyViewToken } from '@/domain/invoice';
import { invoiceStore } from '@/lib/store-singleton';

export async function POST(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(`view:${ip}`)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  const token = req.nextUrl.searchParams.get('t');
  if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const tokenRow = await verifyViewToken(invoiceStore, { invoiceId: params.invoiceId, token });
  if (!tokenRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const invoice = await invoiceStore.invoices.get(params.invoiceId);
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await markViewed(invoiceStore, { tenantId: invoice.tenantId, invoiceId: invoice.id });
  return NextResponse.json({ ok: true });
}
