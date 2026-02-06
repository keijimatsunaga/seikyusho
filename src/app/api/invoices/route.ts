import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createDraftInvoice } from '@/domain/invoice';
import { requireSession } from '@/lib/auth';
import { DomainError } from '@/lib/errors';
import { applySecurityHeaders } from '@/lib/security';
import { invoiceStore } from '@/lib/store-singleton';

const schema = z.object({
  customerId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  currency: z.string().length(3),
  dueDate: z.string().datetime(),
  snapshot: z.any()
});

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req);
    const body = schema.parse(await req.json());
    const invoice = await createDraftInvoice(invoiceStore, {
      tenantId: session.tenantId,
      customerId: body.customerId,
      invoiceNumber: body.invoiceNumber,
      currency: body.currency,
      dueDate: new Date(body.dueDate),
      snapshot: body.snapshot,
      createdByUserId: session.userId
    });
    return applySecurityHeaders(NextResponse.json(invoice, { status: 201 }));
  } catch (err) {
    const e = err as Error;
    if (err instanceof DomainError) return NextResponse.json({ error: e.message }, { status: err.status });
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
