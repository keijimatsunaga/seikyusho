import { markViewed, verifyViewToken } from '@/domain/invoice';
import { invoiceStore } from '@/lib/store-singleton';

export default async function CustomerInvoicePage({ params, searchParams }: { params: { invoiceId: string }; searchParams: { t?: string } }) {
  const token = searchParams.t;
  if (!token) return <main><h1>Invalid link</h1><p>Token is missing.</p></main>;
  const tokenRow = await verifyViewToken(invoiceStore, { invoiceId: params.invoiceId, token });
  if (!tokenRow) return <main><h1>Link expired</h1><p>Please request a new invoice link.</p></main>;
  const invoice = await invoiceStore.findInvoiceById(params.invoiceId, 'tenant-public');
  if (!invoice) return <main><h1>Not found</h1></main>;
  const version = await invoiceStore.getCurrentVersion(invoice.id);
  if (!version) return <main><h1>No invoice snapshot</h1></main>;
  await markViewed(invoiceStore, { tenantId: invoice.tenantId, invoiceId: invoice.id });

  return (
    <main>
      <h1>Invoice {invoice.invoiceNumber}</h1>
      <p>{version.snapshotJson.customerName}</p>
      <ul>
        {version.snapshotJson.items.map((item, i) => <li key={i}>{item.description} × {item.quantity}</li>)}
      </ul>
      <p>Total: {version.total}</p>
    </main>
  );
}
