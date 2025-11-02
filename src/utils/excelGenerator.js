import ExcelJS from 'exceljs';

export const generateMedicinesExcel = (medicines) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Medicines');

  // Add headers
  worksheet.columns = [
    { header: 'Medicine Name', key: 'name', width: 30 },
    { header: 'Batch No', key: 'batchNo', width: 15 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Price', key: 'price', width: 12 },
    { header: 'MRP', key: 'mrp', width: 12 },
    { header: 'Discount %', key: 'discount', width: 12 },
    { header: 'Supplier', key: 'supplier', width: 20 },
    { header: 'Expiry Date', key: 'expiryDate', width: 15 },
    { header: 'Added Date', key: 'addedDate', width: 15 }
  ];

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6FA' }
  };

  // Add data
  medicines.forEach(medicine => {
    worksheet.addRow({
      name: medicine.name,
      batchNo: medicine.batchNo,
      category: medicine.category,
      quantity: medicine.quantity,
      price: medicine.price,
      mrp: medicine.mrp,
      discount: medicine.discount,
      supplier: medicine.supplier || 'N/A',
      expiryDate: new Date(medicine.expiryDate).toLocaleDateString(),
      addedDate: new Date(medicine.addedDate).toLocaleDateString()
    });
  });

  return workbook;
};

export const generateSalesExcel = (bills, startDate, endDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  // Add headers
  worksheet.columns = [
    { header: 'Bill No', key: 'billNo', width: 15 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Customer Name', key: 'customerName', width: 25 },
    { header: 'Customer Mobile', key: 'customerMobile', width: 15 },
    { header: 'Items Count', key: 'itemsCount', width: 12 },
    { header: 'Subtotal', key: 'subtotal', width: 12 },
    { header: 'Discount', key: 'discount', width: 12 },
    { header: 'Tax', key: 'tax', width: 12 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 }
  ];

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6FA' }
  };

  // Add data
  bills.forEach(bill => {
    worksheet.addRow({
      billNo: bill.billNo,
      date: new Date(bill.createdAt).toLocaleDateString(),
      customerName: bill.customerName,
      customerMobile: bill.customerMobile || 'N/A',
      itemsCount: bill.items.length,
      subtotal: bill.subtotal,
      discount: bill.discount,
      tax: bill.tax,
      total: bill.total,
      paymentMethod: bill.paymentMethod
    });
  });

  // Add summary
  const totalRow = worksheet.rowCount + 2;
  const totalSales = bills.length;
  const totalRevenue = bills.reduce((sum, bill) => sum + bill.total, 0);
  const totalDiscount = bills.reduce((sum, bill) => sum + bill.discount, 0);

  worksheet.getCell(`A${totalRow}`).value = 'Summary';
  worksheet.getCell(`A${totalRow}`).font = { bold: true };
  
  worksheet.getCell(`A${totalRow + 1}`).value = 'Total Sales:';
  worksheet.getCell(`B${totalRow + 1}`).value = totalSales;
  
  worksheet.getCell(`A${totalRow + 2}`).value = 'Total Revenue:';
  worksheet.getCell(`B${totalRow + 2}`).value = totalRevenue;
  
  worksheet.getCell(`A${totalRow + 3}`).value = 'Total Discount:';
  worksheet.getCell(`B${totalRow + 3}`).value = totalDiscount;
  
  worksheet.getCell(`A${totalRow + 4}`).value = 'Date Range:';
  worksheet.getCell(`B${totalRow + 4}`).value = `${startDate} to ${endDate}`;

  return workbook;
};