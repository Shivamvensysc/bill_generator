import React, { useState, useEffect } from 'react';
import { Download, Edit, Building, Phone, Mail, MapPin, FileText, Upload, X } from 'lucide-react';
import type { Vendor, BillItem } from '../../types';
import { FIXED_ITEMS } from '../../types';
import { BillValidator } from '../../utils/validation';
import { generateBillPDF } from '../../utils/pdfGenerator';
import axios from 'axios';

interface VendorDetailsProps {
  vendorId: string;
}

// Company details (you can make these configurable)
const COMPANY_GST = "27AABCU9603R1ZM";
const COMPANY_STATE = "UP"; // Your company state code

// Helper function to convert number to words
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      n = 0;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result.trim();
  };

  if (num === 0) return 'Zero Rupees Only';

  let rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let words = '';
  
  if (rupees >= 10000000) {
    words += convertLessThanThousand(Math.floor(rupees / 10000000)) + ' Crore ';
    rupees %= 10000000;
  }
  if (rupees >= 100000) {
    words += convertLessThanThousand(Math.floor(rupees / 100000)) + ' Lakh ';
    rupees %= 100000;
  }
  if (rupees >= 1000) {
    words += convertLessThanThousand(Math.floor(rupees / 1000)) + ' Thousand ';
    rupees %= 1000;
  }
  if (rupees > 0) {
    words += convertLessThanThousand(rupees);
  }

  words = words.trim() + ' Rupees';
  
  if (paise > 0) {
    words += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }
  
  return words + ' Only';
};

const VendorDetails: React.FC<VendorDetailsProps> = ({ vendorId }) => { 
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoBase64, setLogoBase64] = useState<string>('');

  // GST States
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [igst, setIgst] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  // Fetch vendor details from API
  useEffect(() => {
    const fetchVendor = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://192.168.11.99:5000/vendors/${vendorId}`);
        
        // Map API response to Vendor type
        const vendorData: Vendor = {
          id: String(response.data.id),
          vendorName: response.data.name,
          phone: response.data.phone,
          email: response.data.email,
          gstNumber: response.data.gst_number,
          pan: response.data.pan_number,
          address: response.data.address,
          stateCode: response.data.state,
          aadhaarNumber: response.data.aadhaar_number,
          msmeCertificateNo: response.data.msme_certificate_path,
          bankDetails: {
            accountNumber: response.data.account_number,
            ifscCode: response.data.ifsc_code,
          },
          createdAt: new Date(response.data.created_at),
           updatedAt: new Date(response.data.updated_at), 
        };
        
        setVendor(vendorData);
        
        // Initialize items
        const initialItems = FIXED_ITEMS.map((item, index) => ({
          id: index.toString(),
          ...item,
          amount: 0
        }));
        setItems(initialItems);
        
      } catch (err: any) {
        console.error("Failed to fetch vendor details", err);
        setError(err.response?.data?.message || "Failed to load vendor details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    if (vendorId) {
      fetchVendor();
    }
  }, [vendorId]);

  const calculateGST = (subtotal: number, vendorGST?: string, vendorStateCode?: string) => {
    // Check if GST is applicable (vendor has GST number)
    const isGSTApplicable = vendorGST && vendorGST.trim() !== '';
    
    if (!isGSTApplicable || subtotal === 0) {
      setCgst(0);
      setSgst(0);
      setIgst(0);
      setGrandTotal(subtotal);
      return;
    }

    // Get vendor state code (first 2 characters of GST or from vendor state code)
    const vendorState = vendorStateCode || (vendorGST?.substring(0, 2) || '');
    
    if (vendorState.toUpperCase() === COMPANY_STATE) {
      // Same state - Apply CGST + SGST (9% each)
      const cgstAmount = subtotal * 0.09;
      const sgstAmount = subtotal * 0.09;
      setCgst(cgstAmount);
      setSgst(sgstAmount);
      setIgst(0);
      setGrandTotal(subtotal + cgstAmount + sgstAmount);
    } else {
      // Different state - Apply IGST (18%)
      const igstAmount = subtotal * 0.18;
      setCgst(0);
      setSgst(0);
      setIgst(igstAmount);
      setGrandTotal(subtotal + igstAmount);
    }
  };

  const handleItemChange = (index: number, field: keyof BillItem, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calculate amount
    const quantity = Number(updatedItems[index].quantity) || 0;
    const rate = Number(updatedItems[index].rate) || 0;
    updatedItems[index].amount = quantity * rate;
    
    setItems(updatedItems);
    calculateTotal(updatedItems);
    
    // Validate
    const validation = BillValidator.validateItem({ quantity, rate });
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, [`item-${index}`]: validation.message }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`item-${index}`];
        return newErrors;
      });
    }
  };

 
  const calculateTotal = (itemsList: BillItem[]) => {
    const subtotal = itemsList.reduce((sum, item) => sum + item.amount, 0);
    setTotalAmount(subtotal);
    
    // Calculate GST based on vendor's GST and state
    calculateGST(subtotal, vendor?.gstNumber, vendor?.stateCode);
  };

  // Recalculate GST when vendor changes
  useEffect(() => {
    if (vendor) {
      calculateTotal(items);
    }
  }, [vendor?.gstNumber, vendor?.stateCode]);

  const handleDownloadBill = async () => {
    if (!vendor) return;
    
    const hasValidItems = items.some(item => item.quantity > 0 && item.rate > 0);
    if (!hasValidItems) {
      alert('Please add at least one item with quantity and rate');
      return;
    }
    
    // Pass GST details to PDF generator
    await generateBillPDF(vendor, items, totalAmount, logoBase64, {
      cgst,
      sgst,
      igst,
      grandTotal,
      companyGST: COMPANY_GST,
      companyState: COMPANY_STATE
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vendor details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 mx-auto mb-4">
            <Building className="w-12 h-12 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Error Loading Vendor</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Vendor Not Found</h3>
          <p className="text-gray-500">The vendor you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const isGSTApplicable = vendor.gstNumber && vendor.gstNumber.trim() !== '';
  const subtotal = totalAmount;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
     
      {/* Vendor Details Card */}
      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Building className="w-6 h-6 mr-2 text-primary-600" />
            Vendor Details
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Building className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Vendor Name</p>
                  <p className="font-semibold text-gray-800">{vendor.vendorName}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-semibold text-gray-800">{vendor.phone}</p>
                </div>
              </div>
              {vendor.email && (
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-800">{vendor.email}</p>
                  </div>
                </div>
              )}
              {vendor.address && (
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-semibold text-gray-800">{vendor.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tax Information</h3>
            <div className="space-y-3">
              {vendor.pan && (
                <div>
                  <p className="text-sm text-gray-500">PAN Number</p>
                  <p className="font-semibold text-gray-800">{vendor.pan}</p>
                </div>
              )}
              {vendor.gstNumber && (
                <div>
                  <p className="text-sm text-gray-500">GST Number</p>
                  <p className="font-semibold text-gray-800">{vendor.gstNumber}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    GST Status: {isGSTApplicable ? 
                      (vendor.stateCode?.toUpperCase() === COMPANY_STATE ? 'Same State (CGST+SGST)' : 'Different State (IGST)') : 
                      'GST Not Applicable'}
                  </p>
                </div>
              )}
              {vendor.stateCode && (
                <div>
                  <p className="text-sm text-gray-500">State Code</p>
                  <p className="font-semibold text-gray-800">{vendor.stateCode}</p>
                </div>
              )}
              {vendor.aadhaarNumber && (
                <div>
                  <p className="text-sm text-gray-500">Aadhaar Number</p>
                  <p className="font-semibold text-gray-800">{vendor.aadhaarNumber}</p>
                </div>
              )}
              {vendor.msmeCertificateNo && (
                <div>
                  <p className="text-sm text-gray-500">MSME Certificate</p>
                  <p className="font-semibold text-gray-800">{vendor.msmeCertificateNo}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {(vendor.bankDetails?.accountNumber || vendor.bankDetails?.ifscCode) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendor.bankDetails?.accountNumber && (
                <div>
                  <p className="text-sm text-gray-500">Account Number</p>
                  <p className="font-semibold text-gray-800">{vendor.bankDetails.accountNumber}</p>
                </div>
              )}
              {vendor.bankDetails?.ifscCode && (
                <div>
                  <p className="text-sm text-gray-500">IFSC Code</p>
                  <p className="font-semibold text-gray-800">{vendor.bankDetails.ifscCode}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Bill Generation Card */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-800">Generate Bill</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Qty</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Unit</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rate (₹)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{item.description}</span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="0"
                      step="1"
                    />
                    {errors[`item-${index}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`item-${index}`]}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600">{item.unit}</span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                      className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-800">₹{item.amount.toFixed(2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* GST and Total Section */}
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="flex justify-end">
            <div className="w-96 space-y-2">
              <div className="flex justify-between py-2">
                <span className="font-semibold text-gray-700">Subtotal:</span>
                <span className="text-gray-800">₹{subtotal.toFixed(2)}</span>
              </div>
              
              {isGSTApplicable && subtotal > 0 && (
                <>
                  {cgst > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-gray-700">CGST (9%):</span>
                      <span className="text-gray-800">₹{cgst.toFixed(2)}</span>
                    </div>
                  )}
                  {sgst > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-gray-700">SGST (9%):</span>
                      <span className="text-gray-800">₹{sgst.toFixed(2)}</span>
                    </div>
                  )}
                  {igst > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-gray-700">IGST (18%):</span>
                      <span className="text-gray-800">₹{igst.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              
              {!isGSTApplicable && subtotal > 0 && (
                <div className="flex justify-between py-2">
                  <span className="font-semibold text-gray-700 text-yellow-600">GST Status:</span>
                  <span className="text-yellow-600">Not Applicable (No Vendor GST)</span>
                </div>
              )}
              
              <div className="flex justify-between py-3 border-t-2 border-gray-300">
                <span className="text-xl font-bold text-gray-800">Total Amount:</span>
                <span className="text-xl font-bold text-primary-600">₹{grandTotal.toFixed(2)}</span>
              </div>
              
              {grandTotal > 0 && (
                <div className="flex justify-between py-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-600">Amount in Words:</span>
                  <span className="text-sm text-gray-700 text-right">{numberToWords(grandTotal)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button onClick={handleDownloadBill} className="btn-primary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Download Bill (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorDetails;