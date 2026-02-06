import { invoiceStore } from '@/lib/store-singleton';

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = invoiceStore.invoices.get(params.id);
  if (!invoice) return <main><h1>Not found</h1></main>;
  const events = invoiceStore.events.filter((event) => event.invoiceId === params.id);
  return (
    <main>
      <h1>{invoice.invoiceNumber}</h1>
      <p>Status: {invoice.status}</p>
      <h2>Event timeline</h2>
      <ul>{events.map((event, idx) => <li key={idx}>{event.eventType}</li>)}</ul>
      <p>Edit is available while draft via PUT /api/invoices/{invoice.id}.</p>
    </main>
  );
}
