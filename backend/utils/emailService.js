import nodemailer from "nodemailer";

// Validate environment variables on module load
const validateEmailConfig = () => {
  const missingVars = [];
  if (!process.env.EMAIL_USER) missingVars.push("EMAIL_USER");
  if (!process.env.EMAIL_PASS) missingVars.push("EMAIL_PASS");

  if (missingVars.length > 0) {
    console.warn("⚠️  Email service configuration incomplete!");
    console.warn(`   Missing environment variables: ${missingVars.join(", ")}`);
    console.warn("   Password reset emails will NOT work until these are configured.");
    return false;
  }

  console.log("✅ Email service configured successfully");
  console.log(`   Using email: ${process.env.EMAIL_USER}`);
  return true;
};

// Run validation on module load
const isConfigured = validateEmailConfig();

/**
 * Sends an email with optional attachment (invoice PDF, etc.)
 * @param {String} to
 * @param {String} subject
 * @param {String} text
 * @param {String} attachmentPath (optional)
 */
export const sendEmail = async (to, subject, text, attachmentPath = null) => {
  try {
    // Check configuration before attempting to send
    if (!isConfigured) {
      console.error("❌ Email service not configured. Missing EMAIL_USER or EMAIL_PASS environment variables.");
      return false;
    }

    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`   Subject: ${subject}`);

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
      attachments: attachmentPath
        ? [{ filename: "invoice.pdf", path: attachmentPath }]
        : [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully!");
    console.log(`   Response: ${info.response}`);
    console.log(`   Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("❌ Email sending failed!");
    console.error(`   Error Type: ${error.name}`);
    console.error(`   Error Message: ${error.message}`);

    // Provide specific guidance for common errors
    if (error.code === "EAUTH" || error.responseCode === 535) {
      console.error("   ⚠️  Authentication failed!");
      console.error("   → Check that EMAIL_PASS is a Gmail App Password (not regular password)");
      console.error("   → Generate App Password at: https://myaccount.google.com/apppasswords");
      console.error("   → Ensure 2FA is enabled on your Google account");
    } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      console.error("   ⚠️  Network connection failed!");
      console.error("   → Check internet connectivity");
      console.error("   → Verify firewall/proxy settings allow SMTP connections");
    } else if (error.code === "EMESSAGE") {
      console.error("   ⚠️  Invalid email format or content!");
      console.error(`   → Recipient: ${to}`);
    }

    console.error("   Full error:", error);
    return false;
  }
};
