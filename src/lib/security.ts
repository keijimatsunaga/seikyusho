import { NextResponse } from 'next/server';

export function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'same-origin');
  res.headers.set('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'self';");
  return res;
}
