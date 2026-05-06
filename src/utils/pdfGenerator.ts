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

export const generateBillPDF = async (
  vendor: Vendor,
  items: BillItem[],
  totalAmount: number,
  logoBase64?: string,
  gstDetail?: {
    grandTotal: number;
    companyGST: string;
    companyState: string;
    gstTotal?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    vendorLogo?: string;
  }
) => {
  const invoiceNumber = generateInvoiceNumber();
  const currentDate = getCurrentDate();
 
  const validItems = items.filter((item) => item.quantity > 0 || item.rate > 0);
  const subtotal = validItems.reduce((sum, item) => sum + item.amount, 0);
  
  // Use API response values if available
  const gstTotal = gstDetail?.gstTotal || (gstDetail?.cgst && gstDetail?.sgst ? gstDetail.cgst + gstDetail.sgst : (gstDetail?.igst || 0));
  const cgstAmount = gstDetail?.cgst || (gstTotal > 0 ? gstTotal / 2 : 0);
  const sgstAmount = gstDetail?.sgst || (gstTotal > 0 ? gstTotal / 2 : 0);
  const igstAmount = gstDetail?.igst || 0;
  
  const finalGSTTotal = gstTotal > 0 ? gstTotal : 0;
  const finalGrandTotal = gstDetail?.grandTotal || (subtotal + finalGSTTotal);
  const amountInWords = numberToWords(finalGrandTotal);

  // Determine if it's IGST or CGST/SGST based on state codes
  const isInterState = vendor.stateCode && gstDetail?.companyState && 
    vendor.stateCode !== gstDetail.companyState;
  
  // Company details
  const companyDetails = {
    name: "BILLMASTER",
    tagline: "Smart Billing Solutions",
    address: "123 Business Park, Chakala, Andheri East, Mumbai - 400093, Maharashtra, India",
    phone: "+91 22 6123 4567",
    email: "billing@billmaster.com",
    website: "www.billmaster.com",
    gst: gstDetail?.companyGST || "27AABCU1234F1Z",
    state: gstDetail?.companyState || "MH"
  };

  // Extract bank name from IFSC or use default
  const getBankName = (ifscCode: string) => {
    if (!ifscCode) return "Not Available";
    const bankPrefix = ifscCode.substring(0, 4);
    const bankMap: { [key: string]: string } = {
      'SBIN': 'State Bank of India',
      'HDFC': 'HDFC Bank',
      'ICIC': 'ICICI Bank',
      'AXIS': 'Axis Bank',
      'PUNB': 'Punjab National Bank',
      'CANB': 'Canara Bank',
      'BOB': 'Bank of Baroda',
      'IOBA': 'Indian Overseas Bank',
      'UBIN': 'Union Bank of India',
      'IDIB': 'Indian Bank',
      'YESB': 'Yes Bank',
      'KARB': 'Karnataka Bank',
      'FDRL': 'Federal Bank',
      'CORP': 'Corporation Bank',
      'VIJB': 'Vijaya Bank'
    };
    return bankMap[bankPrefix] || 'Bank of India';
  };

  const bankName = vendor.bankDetails?.ifscCode ? getBankName(vendor.bankDetails.ifscCode) : "Not Available";

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
          background: white;
          padding: 40px;
          line-height: 1.5;
        }
        
        .invoice {
          max-width: 1100px;
          margin: 0 auto;
          background: white;
          position: relative;
        }
        
        /* Header Section */
        .header {
          padding: 30px 40px 20px;
          background: #f8fafc;
          border-bottom: 2px solid #667eea;
        }
        
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        
        .logo-area {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .vendor-logo-large {
          width: 80px;
          height: 80px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        
        .vendor-name-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .vendor-name-title {
          font-size: 24px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.5px;
        }
        
        .vendor-type {
          font-size: 12px;
          font-weight: 500;
          color: #667eea;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .logo-icon-custom {
          width: 56px;
          height: 56px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 8px;
        }
        
        .invoice-badge {
          background: #667eea;
          padding: 12px 28px;
          border-radius: 8px;
        }
        
        .badge-content {
          display: flex;
          align-items: center;
          gap: 12px;
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
          border-top: 1px solid #e2e8f0;
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
          padding: 30px 40px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #667eea;
          margin-bottom: 16px;
        }
        
        .bill-to-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
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
          gap: 12px;
        }
        
        .meta-item {
          display: flex;
          justify-content: flex-end;   
          gap: 12px; 
          align-items: center;
          padding: 7px 0;
        
        }
        
        .meta-label {
          font-size: 12px;
          font-weight: 600;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .meta-value {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }
        
        /* Items Table */
        .items-section {
          padding: 30px 40px;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .items-table th {
          background: #667eea;
          padding: 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: white;
        }
        
        .items-table td {
          padding: 12px;
          font-size: 13px;
          color: #334155;
          border-bottom: 1px solid #94A3B8;
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
          padding: 0 40px 30px;
          display: flex;
          justify-content: flex-end;
        }
        
        .summary-card {
          width: 380px;
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 13px;
          color: #475569;
        }
        
        .summary-row.gst-row {
          border-top: 1px solid #64748B;
          margin-top: 4px;
        }
        
        .summary-row.total {
          border-top: 2px solid #64748B;
          margin-top: 6px;
          padding-top: 12px;
          font-size: 16px;
          font-weight: 800;
          color: #667eea;
        }
        
        /* Amount in Words */
        .amount-words {
          padding: 0 40px 30px;
        }
        
        .words-box {
          background: #fefce8;
          border-left: 4px solid #94A3B8;
          padding: 10px 14px;
          border-radius: 4px;
        }
        
        .words-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          color: #667eea;
          margin-bottom: 4px;
        }
        
        .words-value {
          font-size: 12px;
          font-weight: 600;
          color: #854d0e;
        }
        
        /* Vendor Information Section */
        .vendor-info-section {
          padding: 20px 40px;
          margin: 0 40px 30px 40px;
          background: white;
          border: 1px solid #64748B;
          border-radius: 8px;
        }
        
        .vendor-info-title {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #4B5563;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .vendor-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        
        .vendor-info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          background: white;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .vendor-info-label {
          font-size: 11px;
          font-weight: 600;
          color: #111827;
          min-width: 90px;
          text-transform: uppercase;
        }
        
        .vendor-info-value {
          font-size: 12px;
          font-weight: 500;
          color: #1e293b;
        }
        
        @media print {
          body {
            background: white;
            padding: 0;
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
              <div class="vendor-name-header">
                <div class="vendor-name-title">${vendor.vendorName}</div>
              </div>
            </div>
            <div class="invoice-badge">
              <div class="badge-content">
                <div class="badge-text">
                  <h1>INVOICE</h1>
                  <p>Tax Invoice</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Bill To Section -->
        <div class="bill-to-section">
          <div class="bill-to-grid">
            <div class="vendor-info">
              <div class="section-title">BILL TO</div>
              <p><strong>Vensysco Technologies</strong></p>
              <p>7th Floor, TOWER-B, Alphathum, Sector 90, Noida, </br> Uttar Pradesh 201304</p>
              <p>📞 +91 7654378903</p>
              <p>✉ info@vensysco.in</p>
            </div>
            <div>
              <div class="invoice-meta">
                <div class="meta-item">
                  <span class="meta-label">Invoice No : </span>
                  <span class="meta-value">${invoiceNumber}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">Date : </span>
                  <span class="meta-value">${currentDate}</span>
                </div>
                ${vendor.stateCode ? `
                <div class="meta-item">
                  <span class="meta-label">Place of Supply : </span>
                  <span class="meta-value">${vendor.stateCode}</span>
                </div>
                ` : ""}
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
                <th style="width: 40%">Description of Services</th>
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
            ${finalGSTTotal > 0 && !isInterState ? `
            <div class="summary-row gst-row">
              <span>CGST (9%)</span>
              <span>₹ ${cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row">
              <span>SGST (9%)</span>
              <span>₹ ${sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            ` : ''}
            ${finalGSTTotal > 0 && isInterState ? `
            <div class="summary-row gst-row">
              <span>IGST (18%)</span>
              <span>₹ ${finalGSTTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            ` : ''}
            ${finalGSTTotal > 0 ? `
            <div class="summary-row">
              <span><strong>Total GST</strong></span>
              <span><strong>₹ ${finalGSTTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></span>
            </div>
            ` : ''}
            <div class="summary-row total">
              <span>Grand Total</span>
              <span>₹ ${finalGrandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        
        <!-- Amount in Words -->
        <div class="amount-words">
          <div class="words-box">
            <div class="words-label">Amount in Words</div>
            <div class="words-value">${amountInWords}</div>
          </div>
        </div>
        
        <!-- Vendor Information Section with Bank Details -->
        <div class="vendor-info-section">
          <div class="vendor-info-title">
            <span>🏦</span> VENDOR INFORMATION
          </div>
          <div class="vendor-info-grid">
            <div class="vendor-info-item">
              <span class="vendor-info-label">Bank Name : </span>
              <span class="vendor-info-value">${bankName}</span>
            </div>
            <div class="vendor-info-item">
              <span class="vendor-info-label">Account No. : </span>
              <span class="vendor-info-value">${vendor.bankDetails?.accountNumber || "Not Available"}</span>
            </div>
            <div class="vendor-info-item">
              <span class="vendor-info-label">IFSC Code : </span>
              <span class="vendor-info-value">${vendor.bankDetails?.ifscCode || "Not Available"}</span>
            </div>
            <div class="vendor-info-item">
              <span class="vendor-info-label">PAN No. : </span>
              <span class="vendor-info-value">${vendor.pan || "Not Available"}</span>
            </div>
            <div class="vendor-info-item">
              <span class="vendor-info-label">GST Number : </span>
              <span class="vendor-info-value">${vendor.gstNumber || "Not Available"}</span>
            </div>
            <div class="vendor-info-item">
              <span class="vendor-info-label">Mobile No. : </span>
              <span class="vendor-info-value">${vendor.phone || "Not Available"}</span>
            </div>
            ${vendor.email ? `
            <div class="vendor-info-item">
              <span class="vendor-info-label">Email : </span>
              <span class="vendor-info-value">${vendor.email}</span>
            </div>
            ` : ''}
            ${vendor.address ? `
            <div class="vendor-info-item">
              <span class="vendor-info-label">Address : </span>
              <span class="vendor-info-value">${vendor.address}</span>
            </div>
            ` : ''}
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