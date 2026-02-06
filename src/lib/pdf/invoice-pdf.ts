import PDFDocument from 'pdfkit';
import { InvoiceSnapshot } from '@/types/invoice';

export async function generateInvoicePdf(snapshot: InvoiceSnapshot): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text(`Invoice ${snapshot.invoiceNumber}`);
    doc.moveDown().fontSize(12).text(`Customer: ${snapshot.customerName}`);
    doc.text(`Email: ${snapshot.customerEmail}`);
    doc.text(`Due: ${snapshot.dueDate}`);
    snapshot.items.forEach((item) => {
      doc.text(`${item.description} x ${item.quantity} @ ${item.unitPrice}`);
    });
    doc.end();
  });
}
