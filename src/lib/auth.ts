import { NextRequest } from 'next/server';
import { DomainError } from '@/lib/errors';

export type Session = { userId: string; tenantId: string; role: 'ADMIN' | 'MEMBER' };

export function requireSession(req: NextRequest): Session {
  const tenantId = req.headers.get('x-tenant-id');
  const userId = req.headers.get('x-user-id');
  const role = (req.headers.get('x-role') ?? 'MEMBER') as Session['role'];
  if (!tenantId || !userId) throw new DomainError('Unauthorized', 401);
  return { tenantId, userId, role };
}
