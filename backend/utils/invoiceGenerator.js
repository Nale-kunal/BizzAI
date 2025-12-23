import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * Generates professional PDF invoice and saves it to /invoices folder
 * @param {Object} invoiceData - Invoice object from DB
 * @returns {String} filePath - Generated PDF path
 */
export const generateInvoicePDF = async (invoiceData) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const invoicesDir = path.join("invoices");
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir);

  const filePath = path.join(invoicesDir, `${invoiceData.invoiceNo}.pdf`);
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // Colors
  const primaryColor = '#4F46E5';
  const grayColor = '#6B7280';
  const darkColor = '#111827';

  // Header with background
  doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
  doc.fillColor('#FFFFFF')
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('INVOICE', 50, 35, { align: 'center' });
  doc.fontSize(12)
    .font('Helvetica')
    .text('Grocery Billing System', 50, 65, { align: 'center' });

  // Reset position and color
  doc.fillColor(darkColor);
  let yPos = 130;

  // Invoice Info Section
  doc.fontSize(10).font('Helvetica-Bold').fillColor(grayColor);
  doc.text('INVOICE NUMBER', 50, yPos);
  doc.text('DATE', 350, yPos);

  doc.fontSize(14).font('Helvetica-Bold').fillColor(darkColor);
  doc.text(invoiceData.invoiceNo, 50, yPos + 15);
  doc.fontSize(11).font('Helvetica').fillColor(grayColor);
  doc.text(new Date(invoiceData.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }), 350, yPos + 15);

  yPos += 50;

  // Customer Info
  if (invoiceData.customer) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor(grayColor);
    doc.text('BILL TO', 50, yPos);

    doc.fontSize(12).font('Helvetica-Bold').fillColor(darkColor);
    doc.text(invoiceData.customer.name, 50, yPos + 15);

    doc.fontSize(10).font('Helvetica').fillColor(grayColor);
    doc.text(`Phone: ${invoiceData.customer.phone}`, 50, yPos + 32);

    yPos += 65;
  } else {
    yPos += 20;
  }

  // Items Table
  const tableTop = yPos;
  const tableLeft = 50;
  const tableWidth = doc.page.width - 100;

  // Column widths
  const col1Width = tableWidth * 0.45; // Item name
  const col2Width = tableWidth * 0.15; // Qty
  const col3Width = tableWidth * 0.20; // Price
  const col4Width = tableWidth * 0.20; // Total

  const col1X = tableLeft;
  const col2X = col1X + col1Width;
  const col3X = col2X + col2Width;
  const col4X = col3X + col3Width;

  // Table Header Background
  doc.rect(tableLeft, tableTop, tableWidth, 30).fillAndStroke('#F3F4F6', '#E5E7EB');

  // Table Headers
  doc.fontSize(10).font('Helvetica-Bold').fillColor(grayColor);
  doc.text('ITEM', col1X + 10, tableTop + 10, { width: col1Width - 20, align: 'left' });
  doc.text('QTY', col2X + 5, tableTop + 10, { width: col2Width - 10, align: 'center' });
  doc.text('PRICE', col3X + 5, tableTop + 10, { width: col3Width - 10, align: 'right' });
  doc.text('TOTAL', col4X + 5, tableTop + 10, { width: col4Width - 10, align: 'right' });

  // Table Rows
  let rowY = tableTop + 30;
  doc.fontSize(10).font('Helvetica').fillColor(darkColor);

  invoiceData.items.forEach((item, index) => {
    // Get item name - handle both populated and unpopulated items
    const itemName = item.name || item.item?.name || 'Item';

    // Alternate row background
    if (index % 2 === 0) {
      doc.rect(tableLeft, rowY, tableWidth, 25).fill('#FAFAFA');
    }

    // Item name
    doc.fillColor(darkColor)
      .text(itemName, col1X + 10, rowY + 7, {
        width: col1Width - 20,
        align: 'left',
        ellipsis: true
      });

    // Quantity
    doc.text(item.quantity.toString(), col2X + 5, rowY + 7, {
      width: col2Width - 10,
      align: 'center'
    });

    // Price
    doc.text(`₹${item.price.toFixed(2)}`, col3X + 5, rowY + 7, {
      width: col3Width - 10,
      align: 'right'
    });

    // Total
    doc.font('Helvetica-Bold')
      .text(`₹${item.total.toFixed(2)}`, col4X + 5, rowY + 7, {
        width: col4Width - 10,
        align: 'right'
      });

    // Row border
    doc.strokeColor('#E5E7EB')
      .lineWidth(0.5)
      .moveTo(tableLeft, rowY + 25)
      .lineTo(tableLeft + tableWidth, rowY + 25)
      .stroke();

    rowY += 25;
    doc.font('Helvetica');
  });

  // Table border
  doc.strokeColor('#E5E7EB')
    .lineWidth(1)
    .rect(tableLeft, tableTop, tableWidth, rowY - tableTop)
    .stroke();

  rowY += 30;

  // Summary Section
  const summaryX = doc.page.width - 250;
  const summaryWidth = 200;

  doc.fontSize(10).font('Helvetica').fillColor(grayColor);

  // Subtotal
  doc.text('Subtotal:', summaryX, rowY, { width: summaryWidth - 80, align: 'left' });
  doc.fillColor(darkColor).text(`₹${invoiceData.subtotal.toFixed(2)}`, summaryX, rowY, {
    width: summaryWidth,
    align: 'right'
  });
  rowY += 20;

  // Discount (if any)
  if (invoiceData.discount > 0) {
    doc.fillColor(grayColor).text('Discount:', summaryX, rowY, { width: summaryWidth - 80, align: 'left' });
    doc.fillColor('#10B981').text(`-₹${invoiceData.discount.toFixed(2)}`, summaryX, rowY, {
      width: summaryWidth,
      align: 'right'
    });
    rowY += 20;
  }

  // Credit Applied (if any)
  if (invoiceData.creditApplied > 0) {
    doc.fillColor(grayColor).text('Credit Applied:', summaryX, rowY, { width: summaryWidth - 80, align: 'left' });
    doc.fillColor('#10B981').text(`-₹${invoiceData.creditApplied.toFixed(2)}`, summaryX, rowY, {
      width: summaryWidth,
      align: 'right'
    });
    rowY += 20;
  }

  // Total Amount
  doc.strokeColor('#E5E7EB')
    .lineWidth(1)
    .moveTo(summaryX, rowY)
    .lineTo(summaryX + summaryWidth, rowY)
    .stroke();
  rowY += 10;

  doc.fontSize(12).font('Helvetica-Bold').fillColor(darkColor);
  doc.text('Total Amount:', summaryX, rowY, { width: summaryWidth - 100, align: 'left' });
  doc.fillColor(primaryColor).text(`₹${invoiceData.totalAmount.toFixed(2)}`, summaryX, rowY, {
    width: summaryWidth,
    align: 'right'
  });
  rowY += 25;

  // Paid Amount
  doc.fontSize(10).font('Helvetica').fillColor(grayColor);
  doc.text('Paid Amount:', summaryX, rowY, { width: summaryWidth - 80, align: 'left' });
  doc.fillColor(darkColor).text(`₹${invoiceData.paidAmount.toFixed(2)}`, summaryX, rowY, {
    width: summaryWidth,
    align: 'right'
  });
  rowY += 20;

  // Payment Status
  doc.fillColor(grayColor).text('Payment Status:', summaryX, rowY, { width: summaryWidth - 80, align: 'left' });
  const statusColor = invoiceData.paymentStatus === 'paid' ? '#10B981' :
    invoiceData.paymentStatus === 'partial' ? '#F59E0B' : '#EF4444';
  doc.fillColor(statusColor)
    .font('Helvetica-Bold')
    .text(invoiceData.paymentStatus.toUpperCase(), summaryX, rowY, {
      width: summaryWidth,
      align: 'right'
    });

  // Footer
  const footerY = doc.page.height - 80;
  doc.fontSize(11)
    .font('Helvetica')
    .fillColor(darkColor)
    .text('Thank you for shopping with us!', 50, footerY, {
      align: 'center',
      width: doc.page.width - 100
    });

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on("finish", () => resolve(filePath));
    writeStream.on("error", reject);
  });
};
