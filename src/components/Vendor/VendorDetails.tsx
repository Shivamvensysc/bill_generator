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

const COMPANY_GST = "27AABCU9603R1ZM";
const COMPANY_STATE = "UP";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bill data from API response
  const [billData, setBillData] = useState<{
    message: string;
    bill_id: number;
    subtotal: number;
    gst_total: number;
    grand_total: number;
  } | null>(null);

  // Fetch vendor details from API
  useEffect(() => {
    const fetchVendor = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://192.168.11.103:5000/vendors/${vendorId}`);
        
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
    
    // Load saved logo from localStorage
    const savedLogo = localStorage.getItem('companyLogo');
    if (savedLogo) {
      setLogoBase64(savedLogo);
    }
  }, [vendorId]);

  const handleItemChange = (index: number, field: keyof BillItem, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calculate amount
    const quantity = Number(updatedItems[index].quantity) || 0;
    const rate = Number(updatedItems[index].rate) || 0;
    updatedItems[index].amount = quantity * rate;
    
    setItems(updatedItems);
    
    // Update subtotal
    const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    setTotalAmount(subtotal);
    
    // Clear bill data when items change (so user knows they need to generate again)
    setBillData(null);
    
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/image\/(png|jpeg|jpg|svg)/)) {
        alert('Please upload PNG, JPG, or SVG file only');
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo size should be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const logoData = reader.result as string;
        setLogoBase64(logoData);
        localStorage.setItem('companyLogo', logoData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoBase64('');
    localStorage.removeItem('companyLogo');
  };

  const handleGenerateBill = async () => {
    if (!vendor) return;
    
    const hasValidItems = items.some(item => item.quantity > 0 && item.rate > 0);
    if (!hasValidItems) {
      alert('Please add at least one item with quantity and rate');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare items for API
      const apiItems = items
        .filter(item => item.quantity > 0 && item.rate > 0)
        .map(item => ({
          item_name: item.description,
          qty: item.quantity,
          uom: item.unit,
          price: item.rate
        }));
      
      console.log('Sending bill data:', {
        vendor_id: parseInt(vendor.id),
        items: apiItems
      });
      
      // Call POST API to create bill
      const response = await axios.post('http://192.168.11.103:5000/bills', {
        vendor_id: parseInt(vendor.id),
        items: apiItems
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API Response:', response.data);
      
      // Check API response
      if (response.data && response.data.bill_id) {
        // Store bill data from API response
        const apiResponse = response.data;
        
        setBillData({
          message: apiResponse.message,
          bill_id: apiResponse.bill_id,
          subtotal: apiResponse.subtotal || 0,
          gst_total: apiResponse.gst_total || 0,
          grand_total: apiResponse.grand_total || 0
        });
        
        // Update total amounts
        setTotalAmount(apiResponse.subtotal || 0);
        
        // Generate PDF with backend-calculated values
        // Since backend only returns total GST, we pass 0 for individual GST types
        await generateBillPDF(vendor, items, apiResponse.subtotal || 0, logoBase64, {
          cgst: 0,
          sgst: 0,
          igst: 0,
          grandTotal: apiResponse.grand_total || 0,
          companyGST: COMPANY_GST,
          companyState: COMPANY_STATE
        });
        
        alert(`✅ ${apiResponse.message || 'Bill created successfully!'} Bill ID: ${apiResponse.bill_id}`);
      } else {
        alert('⚠️ Bill created but unexpected response format.');
      }
      
    } catch (error: any) {
      console.error("Failed to create bill", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create bill. Please try again.";
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
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
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
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
  
  // Use backend calculated values if available
  const displaySubtotal = billData?.subtotal ?? subtotal;
  const displayGrandTotal = billData?.grand_total ?? 0;
  const displayGSTTotal = billData?.gst_total ?? 0;
  const hasBillData = billData !== null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Logo Upload Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-50 rounded-xl shadow-md flex items-center justify-center overflow-hidden border border-gray-200">
              {logoBase64 ? (
                <img src={logoBase64} alt="Company Logo" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                <Building className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Company Logo</h3>
              <p className="text-sm text-gray-500">Upload your company logo to appear on invoices</p>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{logoBase64 ? 'Change Logo' : 'Upload Logo'}</span>
              </div>
            </label>
            {logoBase64 && (
              <button onClick={handleRemoveLogo} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center space-x-2">
                <X className="w-4 h-4" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Details Card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Building className="w-6 h-6 mr-2 text-primary-600" />
            Vendor Details
          </h2>
        </div>
        
        <div className="p-6">
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
                      GST Status: {isGSTApplicable ? 'GST Registered' : 'GST Not Applicable'}
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
      </div>
      
      {/* Bill Generation Card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-800">Generate Bill</h2>
          </div>
        </div>
        
        <div className="p-6">
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

          {/* GST and Total Section - Display Backend Calculated Values */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="flex justify-end">
              <div className="w-96 space-y-2">
                <div className="flex justify-between py-2">
                  <span className="font-semibold text-gray-700">Subtotal:</span>
                  <span className="text-gray-800">₹{displaySubtotal.toFixed(2)}</span>
                </div>
                
                {isGSTApplicable && hasBillData && displaySubtotal > 0 && (
                  <>
                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-gray-700">GST Amount:</span>
                      <span className="text-gray-800">₹{displayGSTTotal.toFixed(2)}</span>
                    </div>
                  </>
                )}
                
                {isGSTApplicable && !hasBillData && displaySubtotal > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-700 text-blue-600">GST Status:</span>
                    <span className="text-blue-600">Click "Generate Bill" to calculate GST</span>
                  </div>
                )}
                
                {!isGSTApplicable && displaySubtotal > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="font-semibold text-gray-700 text-yellow-600">GST Status:</span>
                    <span className="text-yellow-600">Not Applicable (No Vendor GST)</span>
                  </div>
                )}
                
                <div className="flex justify-between py-3 border-t-2 border-gray-300">
                  <span className="text-xl font-bold text-gray-800">Total Amount:</span>
                  <span className="text-xl font-bold text-primary-600">
                    ₹{displayGrandTotal.toFixed(2)}
                  </span>
                </div>
                
                {displayGrandTotal > 0 && (
                  <div className="flex justify-between py-2 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-600">Amount in Words:</span>
                    <span className="text-sm text-gray-700 text-right">{numberToWords(displayGrandTotal)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleGenerateBill} 
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Bill...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Generate & Download Bill</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetails;