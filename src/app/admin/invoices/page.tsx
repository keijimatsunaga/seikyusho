import Link from 'next/link';
import { invoiceStore } from '@/lib/store-singleton';

export default async function AdminInvoicesPage({ searchParams }: { searchParams: { status?: string } }) {
  const rows = [...invoiceStore.invoices.values()].filter((i) => !searchParams.status || i.status === searchParams.status);
  return <main><h1>Invoices</h1><Link href="/admin/invoices/new">New</Link><ul>{rows.map((i) => <li key={i.id}><Link href={`/admin/invoices/${i.id}`}>{i.invoiceNumber} ({i.status})</Link></li>)}</ul></main>;
}
