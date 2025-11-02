import PDFDocument from 'pdfkit';

export const generateBillPDF = (bill, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(user.storeName, 50, 50)
        .fontSize(10)
        .font('Helvetica')
        .text(user.storeAddress, 50, 75)
        .text(`Phone: ${user.phone}`, 50, 90);

      if (user.gstNumber) {
        doc.text(`GST: ${user.gstNumber}`, 50, 105);
      }

      // Bill details
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 400, 50)
        .fontSize(10)
        .font('Helvetica')
        .text(`Bill No: ${bill.billNo}`, 400, 75)
        .text(`Date: ${new Date(bill.createdAt).toLocaleDateString()}`, 400, 90)
        .text(`Time: ${new Date(bill.createdAt).toLocaleTimeString()}`, 400, 105);

      // Customer details
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Customer Details:', 50, 150)
        .font('Helvetica')
        .text(`Name: ${bill.customerName}`, 50, 170);

      if (bill.customerMobile) {
        doc.text(`Mobile: ${bill.customerMobile}`, 50, 185);
      }

      if (bill.customerEmail) {
        doc.text(`Email: ${bill.customerEmail}`, 50, 200);
      }

      // Table header
      const tableTop = 230;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('#', 50, tableTop)
        .text('Medicine', 70, tableTop)
        .text('Batch', 200, tableTop)
        .text('Qty', 250, tableTop)
        .text('Price', 290, tableTop)
        .text('Disc%', 340, tableTop)
        .text('Amount', 390, tableTop);

      // Table rows
      let y = tableTop + 20;
      bill.items.forEach((item, index) => {
        doc
          .font('Helvetica')
          .text(`${index + 1}`, 50, y)
          .text(item.medicineName, 70, y, { width: 120 })
          .text(item.batchNo, 200, y, { width: 40 })
          .text(item.quantity.toString(), 250, y)
          .text(`₹${item.price.toFixed(2)}`, 290, y)
          .text(`${item.discount}%`, 340, y)
          .text(`₹${(item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)}`, 390, y);
        
        y += 20;
      });

      // Total section
      const totalY = y + 20;
      doc
        .font('Helvetica-Bold')
        .text('Subtotal:', 300, totalY)
        .text(`₹${bill.subtotal.toFixed(2)}`, 390, totalY)
        .text('Discount:', 300, totalY + 15)
        .text(`-₹${bill.discount.toFixed(2)}`, 390, totalY + 15)
        .text('Tax:', 300, totalY + 30)
        .text(`+₹${bill.tax.toFixed(2)}`, 390, totalY + 30)
        .text('Total:', 300, totalY + 45)
        .text(`₹${bill.total.toFixed(2)}`, 390, totalY + 45);

      // Payment method
      doc
        .text(`Payment Method: ${bill.paymentMethod}`, 50, totalY + 70)
        .text(`Payment Status: ${bill.paymentStatus}`, 50, totalY + 85);

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica')
        .text('Thank you for your business!', 50, totalY + 120)
        .text('This is a computer generated invoice.', 50, totalY + 135);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};