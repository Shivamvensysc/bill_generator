import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Vendor, BillItem } from "../types";

const getCurrentDate = () => {
  const date = new Date();
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};


const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `INV-${year}${month}-${random}`;
};

const numberToWords = (num: number) => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const convertToWords = (n: number): string => {
    if (n === 0) return "Zero";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + convertToWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        convertToWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + convertToWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        convertToWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + convertToWords(n % 100000) : "")
      );
    return (
      convertToWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + convertToWords(n % 10000000) : "")
    );
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convertToWords(rupees) + " Rupees";
  if (paise > 0) result += " and " + convertToWords(paise) + " Paise";
  return result + " Only";
};

const calculateGST = (amount: number, gstRate: number = 18) => {
  const gstAmount = (amount * gstRate) / 100;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  return { cgst, sgst, totalGST: gstAmount, rate: gstRate };
};

export const generateBillPDF = async (
  vendor: Vendor,
  items: BillItem[],
  totalAmount: number,
  logoBase64?: string,
  gstDetail?: {
    cgst: number;
    sgst: number;
    igst: number;
    grandTotal: number;
    companyGST: string;
    companyState: string;
  }
) => {
  const invoiceNumber = generateInvoiceNumber();
  const currentDate = getCurrentDate();
  const dueDate = new Date(
    Date.now() + 15 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const validItems = items.filter((item) => item.quantity > 0 || item.rate > 0);
  const subtotal = validItems.reduce((sum, item) => sum + item.amount, 0);
  const gstDetails = calculateGST(subtotal);
  const grandTotal = subtotal + gstDetails.totalGST;
  const amountInWords = numberToWords(grandTotal);

  const billHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoiceNumber}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #e8ecf2;
          padding: 30px;
          line-height: 1.5;
        }
        
        .invoice {
          max-width: 1100px;
          margin: 0 auto;
          background: white;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          overflow: hidden;
          position: relative;
        }
        
        /* Premium Gradient Border */
        .invoice::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%);
        }
        
        /* Header Section */
        .header {
          padding: 40px 48px 30px;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-bottom: 1px solid #e2e8f0;
        }
        
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .logo-icon-custom {
    width: 56px;
    height: 56px;
    background: white;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    overflow: hidden;
    padding: 8px;
  }
        
        .logo-area {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .logo-icon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3); }
          50% { box-shadow: 0 8px 30px rgba(102, 126, 234, 0.5); }
        }
        
        .logo-icon svg {
          width: 32px;
          height: 32px;
        }
        
        .brand-wrapper {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .company-name {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
          position: relative;
          display: inline-block;
        }
        
        .company-name::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 60%;
          height: 3px;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 2px;
        }
        
        .company-tagline {
          font-size: 11px;
          font-weight: 500;
          color: #94a3b8;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .company-tagline span {
          color: #10b981;
          font-size: 8px;
          display: inline-block;
          margin-right: 4px;
        }
        
        .invoice-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(102, 126, 234, 0.4);
          transition: all 0.3s ease;
          position: relative;
        }
        
        .badge-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shine 3s infinite;
        }
        
        @keyframes shine {
          0% { left: -100%; }
          20%, 100% { left: 100%; }
        }
        
        .badge-content {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 28px;
          position: relative;
          z-index: 1;
        }
        
        .invoice-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        .badge-text {
          text-align: left;
          border-left: 2px solid rgba(255,255,255,0.3);
          padding-left: 12px;
        }
        
        .invoice-badge h1 {
          color: white;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: 2px;
          margin: 0;
          line-height: 1;
        }
        
        .invoice-badge p {
          color: rgba(255,255,255,0.9);
          font-size: 10px;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .company-details {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px dashed #cbd5e1;
        }
        
        .company-address {
          color: #475569;
          font-size: 13px;
          line-height: 1.6;
        }
        
        .company-contact {
          text-align: right;
          color: #475569;
          font-size: 13px;
        }
        
        /* Bill To Section */
        .bill-to-section {
          padding: 32px 48px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .bill-to-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #667eea;
          margin-bottom: 16px;
        }
        
        .vendor-info p {
          margin: 8px 0;
          font-size: 14px;
          color: #1e293b;
        }
        
        .vendor-info strong {
          color: #0f172a;
          font-weight: 600;
        }
        
        .invoice-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .meta-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .meta-label {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
        }
        
        .meta-value {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        
        /* Items Table */
        .items-section {
          padding: 32px 48px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .items-table th {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 14px 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: white;
        }
        
        .items-table td {
          padding: 14px 12px;
          font-size: 13px;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .items-table tr:last-child td {
          border-bottom: none;
        }
        
        .text-right {
          text-align: right;
        }
        
        .text-center {
          text-align: center;
        }
        
        .amount-highlight {
          font-weight: 700;
          color: #667eea;
        }
        
        /* Summary Section */
        .summary-section {
          padding: 0 48px 32px;
          display: flex;
          justify-content: flex-end;
        }
        
        .summary-card {
          width: 380px;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-radius: 20px;
          padding: 24px;
          border: 1px solid #e2e8f0;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          font-size: 14px;
          color: #475569;
        }
        
        .summary-row.total {
          border-top: 2px solid #e2e8f0;
          margin-top: 8px;
          padding-top: 16px;
          font-size: 18px;
          font-weight: 800;
          color: #667eea;
        }
        
        /* Amount in Words */
        .amount-words {
          padding: 0 48px 32px;
        }
        
        .words-box {
          background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
          border-left: 4px solid #667eea;
          padding: 14px 20px;
          border-radius: 12px;
        }
        
        .words-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: #667eea;
          margin-bottom: 6px;
        }
        
        .words-value {
          font-size: 13px;
          font-weight: 600;
          color: #854d0e;
        }
        
        /* Bank Details */
        .bank-section {
          padding: 28px 48px;
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border-top: 1px solid #a7f3d0;
          border-bottom: 1px solid #a7f3d0;
        }
        
        .bank-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #059669;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .bank-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        
        .bank-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .bank-item-label {
          font-size: 11px;
          font-weight: 600;
          color: #047857;
          text-transform: uppercase;
        }
        
        .bank-item-value {
          font-size: 13px;
          font-weight: 600;
          color: #064e3b;
        }
        
        /* Footer */
        .footer {
          padding: 32px 48px;
          text-align: center;
          background: #0f172a;
          color: #94a3b8;
        }
        
        .signature-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 1px solid #1e293b;
        }
        
        .signature-box {
          text-align: center;
          width: 200px;
        }
        
        .signature-line {
          border-top: 1px solid #475569;
          margin-bottom: 8px;
          padding-top: 8px;
        }
        
        .signature-label {
          font-size: 11px;
          color: #64748b;
        }
        
        .qr-placeholder {
          width: 70px;
          height: 70px;
          background: #1e293b;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto;
        }
        
        .footer-text {
          font-size: 11px;
          color: #64748b;
          margin-top: 16px;
        }
        
        .footer-text p {
          margin: 4px 0;
        }
        
        .thankyou {
          font-size: 14px;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 16px;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .invoice {
            box-shadow: none;
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice">
        <!-- Header -->
        <div class="header">
          <div class="header-top">
            <div class="logo-area">
              ${
                logoBase64
                  ? `
                <div class="logo-icon-custom">
                  <img src="${logoBase64}" alt="Company Logo" style="width: 56px; height: 56px; object-fit: contain; border-radius: 16px;" />
                </div>
              `
                  : `
                <div class="logo-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6H21V19H3V6Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <path d="M8 10H16" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M8 14H13" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M3 6L6 3H18L21 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="17" cy="16" r="1.5" fill="white" stroke="white"/>
                    <circle cx="7" cy="16" r="1.5" fill="white" stroke="white"/>
                  </svg>
                </div>
              `
              }
              <div class="brand-wrapper">
                <div class="company-name">BILLMASTER</div>
                <div class="company-tagline"><span>●</span> Smart Billing Solutions</div>
              </div>
            </div>
            <div class="invoice-badge">
              <div class="badge-shine"></div>
              <div class="badge-content">
                <div class="invoice-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <path d="M7 7H12" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M7 12H17" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M7 17H14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </div>
                <div class="badge-text">
                  <h1>INVOICE</h1>
                  <p>Tax Invoice</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="company-details">
            <div class="company-address">
              <strong>Registered Office</strong><br>
              123 Business Park, Chakala<br>
              Andheri East, Mumbai - 400093<br>
              Maharashtra, India
            </div>
            <div class="company-contact">
              📞 +91 22 6123 4567<br>
              ✉ billing@billmaster.com<br>
              🌐 www.billmaster.com<br>
              GST: 27AABCU1234F1Z
            </div>
          </div>
        </div>
        
        <!-- Bill To Section -->
        <div class="bill-to-section">
          <div class="bill-to-grid">
            <div class="vendor-info">
              <div class="section-title">📋 BILL TO</div>
              <p><strong>${vendor.vendorName}</strong></p>
              <p>${vendor.address || "Address not provided"}</p>
              <p>📞 ${vendor.phone}</p>
              ${vendor.email ? `<p>✉ ${vendor.email}</p>` : ""}
              ${vendor.pan ? `<p>PAN: ${vendor.pan}</p>` : ""}
              ${vendor.gstNumber ? `<p>GST: ${vendor.gstNumber}</p>` : ""}
            </div>
            <div>
              <div class="section-title">📄 INVOICE DETAILS</div>
              <div class="invoice-meta">
                <div class="meta-item"><span class="meta-label">Invoice No</span><span class="meta-value">${invoiceNumber}</span></div>
                <div class="meta-item"><span class="meta-label">Date</span><span class="meta-value">${currentDate}</span></div>
                <div class="meta-item"><span class="meta-label">Due Date</span><span class="meta-value">${dueDate}</span></div>
                <div class="meta-item"><span class="meta-label">Payment Terms</span><span class="meta-value">15 Days</span></div>
                <div class="meta-item"><span class="meta-label">Place of Supply</span><span class="meta-value">${vendor.stateCode || "Maharashtra"}</span></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Items Table -->
        <div class="items-section">
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%">#</th>
                <th style="width: 35%">Description of Services</th>
                <th style="width: 15%" class="text-center">Qty</th>
                <th style="width: 15%" class="text-center">Unit</th>
                <th style="width: 15%" class="text-right">Rate (₹)</th>
                <th style="width: 15%" class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${validItems
                .map(
                  (item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${item.description}</strong>${item.description === "Frisking" || item.description === "Biometric" ? '<br><span style="font-size: 11px; color: #667eea;">Security Service</span>' : ""}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-center">${item.unit}</td>
                  <td class="text-right">${item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td class="text-right amount-highlight">₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        <!-- Summary -->
        <div class="summary-section">
          <div class="summary-card">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>₹ ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row">
              <span>CGST (9%)</span>
              <span>₹ ${gstDetails.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row">
              <span>SGST (9%)</span>
              <span>₹ ${gstDetails.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row total">
              <span>Grand Total</span>
              <span>₹ ${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        
        <!-- Amount in Words -->
        <div class="amount-words">
          <div class="words-box">
            <div class="words-label">Amount Chargeable (in words)</div>
            <div class="words-value">${amountInWords}</div>
          </div>
        </div>
        
        <!-- Bank Details -->
        ${
          vendor.bankDetails?.bankName
            ? `
          <div class="bank-section">
            <div class="bank-title">
              <span>🏦</span> BANK ACCOUNT DETAILS
            </div>
            <div class="bank-grid">
              <div class="bank-item">
                <span class="bank-item-label">Bank Name</span>
                <span class="bank-item-value">${vendor.bankDetails.bankName}</span>
              </div>
              <div class="bank-item">
                <span class="bank-item-label">Account Number</span>
                <span class="bank-item-value">${vendor.bankDetails.accountNumber || "N/A"}</span>
              </div>
              <div class="bank-item">
                <span class="bank-item-label">IFSC Code</span>
                <span class="bank-item-value">${vendor.bankDetails.ifscCode || "N/A"}</span>
              </div>
              <div class="bank-item">
                <span class="bank-item-label">Account Type</span>
                <span class="bank-item-value">${vendor.bankDetails.accountType || "N/A"}</span>
              </div>
              <div class="bank-item">
                <span class="bank-item-label">Branch</span>
                <span class="bank-item-value">${vendor.bankDetails.branch || "N/A"}</span>
              </div>
              <div class="bank-item">
                <span class="bank-item-label">UPI ID</span>
                <span class="bank-item-value">billmaster@icici</span>
              </div>
            </div>
          </div>
        `
            : ""
        }
        
        <!-- Footer -->
        <div class="footer">
          <div class="signature-row">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">For BILLMASTER</div>
              <div class="signature-label">Authorized Signatory</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Receiver's Signature</div>
            </div>
            <div class="signature-box">
              <div class="qr-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3H9V9H3V3Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M15 3H21V9H15V3Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M3 15H9V21H3V15Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M15 15H21V21H15V15Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="signature-label" style="margin-top: 8px;">Scan to Pay</div>
            </div>
          </div>
          
          <div class="thankyou">✨ THANK YOU FOR YOUR BUSINESS! ✨</div>
          
          <div class="footer-text">
            <p><strong>Terms & Conditions:</strong></p>
            <p>1. Payment is due within 15 days from the invoice date.</p>
            <p>2. Interest @ 18% per annum will be charged on delayed payments.</p>
            <p>3. This is a computer generated invoice and does not require physical signature.</p>
            <p>4. Subject to Mumbai jurisdiction only.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = billHTML;
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.top = "-9999px";
  document.body.appendChild(tempDiv);

  try {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const canvas = await html2canvas(tempDiv, {
      scale: 2.5,
      logging: false,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: 1100,
      onclone: (clonedDoc) => {
        const style = clonedDoc.createElement("style");
        style.textContent = `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: white; }
        `;
        clonedDoc.head.appendChild(style);
      },
    });

    const imgData = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    let heightLeft = imgHeight - pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fileName = `Invoice_${vendor.vendorName.replace(/\s/g, "_")}_${new Date().toLocaleDateString().replace(/\//g, "-")}.pdf`;
    pdf.save(fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error("Failed to generate PDF. Please try again.");
  } finally {
    document.body.removeChild(tempDiv);
  }
};
