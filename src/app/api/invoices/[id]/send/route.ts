import { NextRequest, NextResponse } from 'next/server';
import { createViewToken } from '@/domain/invoice';
import { requireSession } from '@/lib/auth';
import { DomainError } from '@/lib/errors';
import { StubEmailProvider } from '@/lib/email/provider';
import { invoiceStore } from '@/lib/store-singleton';

const emailProvider = new StubEmailProvider();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireSession(req);
    const invoice = await invoiceStore.findInvoiceById(params.id, session.tenantId);
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const token = await createViewToken(invoiceStore, { tenantId: session.tenantId, invoiceId: params.id, userId: session.userId });
    const link = `${process.env.APP_URL ?? 'http://localhost:3000'}/i/${invoice.id}?t=${token.token}`;
    const result = await emailProvider.send({ to: 'customer@example.com', subject: `Invoice ${invoice.invoiceNumber}`, text: link });
    await invoiceStore.createEvent({ invoiceId: invoice.id, actorType: 'INTERNAL', actorId: session.userId, eventType: 'DELIVERY_SENT', payloadJson: { linkPreview: 'redacted', providerMessageId: result.messageId ?? null } });
    await invoiceStore.updateInvoice(invoice.id, session.tenantId, { status: 'SENT' });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DomainError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
