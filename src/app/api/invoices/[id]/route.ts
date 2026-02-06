import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateDraftInvoice } from '@/domain/invoice';
import { requireSession } from '@/lib/auth';
import { DomainError } from '@/lib/errors';
import { invoiceStore } from '@/lib/store-singleton';

const updateSchema = z.object({ snapshot: z.any() });

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireSession(req);
    const body = updateSchema.parse(await req.json());
    await updateDraftInvoice(invoiceStore, {
      tenantId: session.tenantId,
      invoiceId: params.id,
      snapshot: body.snapshot,
      updatedByUserId: session.userId
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DomainError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = requireSession(req);
    const invoice = await invoiceStore.findInvoiceById(params.id, session.tenantId);
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(invoice);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
