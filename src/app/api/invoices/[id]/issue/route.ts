import { NextRequest, NextResponse } from 'next/server';
import { issueInvoice } from '@/domain/invoice';
import { requireSession } from '@/lib/auth';
import { DomainError } from '@/lib/errors';
import { invoiceStore } from '@/lib/store-singleton';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireSession(req);
    await issueInvoice(invoiceStore, { tenantId: session.tenantId, invoiceId: params.id, userId: session.userId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DomainError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
