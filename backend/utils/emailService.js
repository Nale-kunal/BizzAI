import nodemailer from "nodemailer";

/**
 * Generates professional HTML email template for invoice
 * @param {Object} invoiceData - Invoice object from DB
 * @returns {String} HTML email content
 */
export const generateInvoiceHTML = (invoiceData) => {
  const date = new Date(invoiceData.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const itemsRows = invoiceData.items.map(item => {
    // Get item name - handle both populated and unpopulated items
    const itemName = item.name || item.item?.name || 'Item';

    return `
    <tr>
      <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">${itemName}</td>
      <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #1f2937; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #1f2937; font-size: 14px;">&#8377;${item.price.toFixed(2)}</td>
      <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: 600; font-size: 14px;">&#8377;${item.total.toFixed(2)}</td>
    </tr>
  `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceData.invoiceNo}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; line-height: 1.6;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="650" style="max-width: 650px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 35px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">INVOICE</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; color: rgba(255,255,255,0.95); font-weight: 500;">Grocery Billing System</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invoice Info -->
          <tr>
            <td style="padding: 35px 40px 30px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width: 50%; vertical-align: top;">
                    <p style="margin: 0 0 6px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Invoice Number</p>
                    <p style="margin: 0; font-size: 20px; color: #111827; font-weight: 700; letter-spacing: -0.3px;">${invoiceData.invoiceNo}</p>
                  </td>
                  <td style="width: 50%; vertical-align: top; text-align: right;">
                    <p style="margin: 0 0 6px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Date</p>
                    <p style="margin: 0; font-size: 15px; color: #374151; font-weight: 600;">${date}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${invoiceData.customer ? `
          <!-- Customer Details -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 8px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">Bill To</p>
                <p style="margin: 0 0 6px 0; font-size: 18px; color: #111827; font-weight: 700;">${invoiceData.customer.name}</p>
                <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">
                  <span style="display: inline-block; margin-right: 4px;">&#128222;</span> ${invoiceData.customer.phone}
                </p>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 40px 35px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: linear-gradient(to bottom, #f9fafb, #f3f4f6);">
                    <th style="padding: 16px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #e5e7eb;">Item</th>
                    <th style="padding: 16px 12px; text-align: center; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #e5e7eb; width: 80px;">Qty</th>
                    <th style="padding: 16px 12px; text-align: right; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #e5e7eb; width: 120px;">Price</th>
                    <th style="padding: 16px 12px; text-align: right; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #e5e7eb; width: 120px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Billing Summary -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width: 50%;"></td>
                  <td style="width: 50%;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; padding: 24px;">
                      <tr>
                        <td>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0;">
                                <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">Subtotal</p>
                              </td>
                              <td align="right" style="padding: 8px 0;">
                                <p style="margin: 0; font-size: 14px; color: #374151; font-weight: 600;">&#8377;${invoiceData.subtotal.toFixed(2)}</p>
                              </td>
                            </tr>
                            ${invoiceData.discount > 0 ? `
                            <tr>
                              <td style="padding: 8px 0;">
                                <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">Discount</p>
                              </td>
                              <td align="right" style="padding: 8px 0;">
                                <p style="margin: 0; font-size: 14px; color: #10b981; font-weight: 600;">-&#8377;${invoiceData.discount.toFixed(2)}</p>
                              </td>
                            </tr>
                            ` : ''}
                            ${invoiceData.creditApplied > 0 ? `
                            <tr>
                              <td style="padding: 8px 0;">
                                <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">Credit Applied</p>
                              </td>
                              <td align="right" style="padding: 8px 0;">
                                <p style="margin: 0; font-size: 14px; color: #10b981; font-weight: 600;">-&#8377;${invoiceData.creditApplied.toFixed(2)}</p>
                              </td>
                            </tr>
                            ` : ''}
                            <tr>
                              <td colspan="2" style="padding: 12px 0 8px 0; border-top: 2px solid #e5e7eb;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                  <tr>
                                    <td>
                                      <p style="margin: 0; font-size: 17px; color: #111827; font-weight: 700;">Total Amount</p>
                                    </td>
                                    <td align="right">
                                      <p style="margin: 0; font-size: 20px; color: #667eea; font-weight: 700; letter-spacing: -0.3px;">&#8377;${invoiceData.totalAmount.toFixed(2)}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">Paid Amount</p>
                              </td>
                              <td align="right" style="padding: 8px 0;">
                                <p style="margin: 0; font-size: 14px; color: #374151; font-weight: 600;">&#8377;${invoiceData.paidAmount.toFixed(2)}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">Payment Status</p>
                              </td>
                              <td align="right" style="padding: 8px 0;">
                                <span style="display: inline-block; padding: 6px 14px; background-color: ${invoiceData.paymentStatus === 'paid' ? '#d1fae5' : invoiceData.paymentStatus === 'partial' ? '#fef3c7' : '#fee2e2'}; color: ${invoiceData.paymentStatus === 'paid' ? '#065f46' : invoiceData.paymentStatus === 'partial' ? '#92400e' : '#991b1b'}; border-radius: 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${invoiceData.paymentStatus}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb; background-color: #fafbfc;">
              <p style="margin: 0 0 8px 0; font-size: 17px; color: #111827; font-weight: 700;">Thank you for shopping with us! &#128591;</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280; font-weight: 500;">Please find the detailed invoice attached as PDF.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Sends an email with optional attachment (invoice PDF, etc.)
 * @param {String} to
 * @param {String} subject
 * @param {String} text
 * @param {String} attachmentPath (optional)
 * @param {String} html (optional) - HTML email content
 */
export const sendEmail = async (to, subject, text, attachmentPath = null, html = null) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Grocery Billing" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      attachments: attachmentPath
        ? [{ filename: "invoice.pdf", path: attachmentPath }]
        : [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📨 Email sent:", info.response);
    return true;
  } catch (error) {
    console.error("Email Error:", error);
    return false;
  }
};
