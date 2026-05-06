import React, { useState, useEffect } from 'react';
import { Download, Building, Phone, Mail, MapPin, FileText, Eye, Image as ImageIcon } from 'lucide-react';
import type { Vendor, BillItem } from '../../types';
import { FIXED_ITEMS } from '../../types';
import { BillValidator } from '../../utils/validation';
import { generateBillPDF } from '../../utils/pdfGenerator';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  const [vendorLogo, setVendorLogo] = useState<string>('');
  const [certificateFile, setCertificateFile] = useState<{ name: string; url: string } | null>(null);

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
          logo_path: response.data.logo_path,
        };
        
        setVendor(vendorData);
        
        // Set vendor logo
        if (response.data.logo_path) {
          const logoUrl = `http://192.168.11.103:5000/${response.data.logo_path}`;
          setVendorLogo(logoUrl);
        }
        
        // Set certificate file info
        if (response.data.msme_certificate_path) {
          const certUrl = `http://192.168.11.103:5000/${response.data.msme_certificate_path}`;
          setCertificateFile({
            name: response.data.msme_certificate_path.split('/').pop() || 'MSME_Certificate.pdf',
            url: certUrl
          });
        }
        
        // Initialize items
        const initialItems = FIXED_ITEMS.map((item, index) => ({
          id: index.toString(),
          ...item,
          amount: 0
        }));
        setItems(initialItems);
        
        toast.success('✅ Vendor details loaded successfully!', {
          position: "top-right",
          autoClose: 3000,
        });
        
      } catch (err: any) {
        console.error("Failed to fetch vendor details", err);
        const errorMsg = err.response?.data?.message || "Failed to load vendor details. Please try again.";
        setError(errorMsg);
        toast.error(`❌ ${errorMsg}`, {
          position: "top-right",
          autoClose: 4000,
        });
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

  const handleDownloadCertificate = () => {
    if (certificateFile) {
      window.open(certificateFile.url, '_blank');
      toast.info('📄 Downloading MSME Certificate...', {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };

  const handleGenerateBill = async () => {
    if (!vendor) return;
    
    const hasValidItems = items.some(item => item.quantity > 0 && item.rate > 0);
    if (!hasValidItems) {
      toast.warning('⚠️ Please add at least one item with quantity and rate', {
        position: "top-right",
        autoClose: 3000,
      });
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
        
        const billCalculations = {
          subtotal: apiResponse.subtotal || 0,
          gst_total: apiResponse.gst_total || 0,
          grand_total: apiResponse.grand_total || 0
        };
        
        setBillData({
          message: apiResponse.message,
          bill_id: apiResponse.bill_id,
          subtotal: billCalculations.subtotal,
          gst_total: billCalculations.gst_total,
          grand_total: billCalculations.grand_total
        });
        
        // Update total amounts
        setTotalAmount(billCalculations.subtotal);
        
        // Generate PDF with backend-calculated values and vendor logo
        await generateBillPDF(
          vendor, 
          items, 
          billCalculations.subtotal, 
          logoBase64, 
          {
            grandTotal: billCalculations.grand_total,
            companyGST: COMPANY_GST,
            companyState: COMPANY_STATE,
            gstTotal: billCalculations.gst_total,
            vendorLogo: vendorLogo 
          }
        );
        
        toast.success(`✅ ${apiResponse.message || 'Bill created successfully!'} Bill ID: ${apiResponse.bill_id}`, {
          position: "top-right",
          autoClose: 4000,
        });
      } else {
        toast.warning('⚠️ Bill created but unexpected response format.', {
          position: "top-right",
          autoClose: 3000,
        });
      }
      
    } catch (error: any) {
      console.error("Failed to create bill", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create bill. Please try again.";
      toast.error(`❌ ${errorMessage}`, {
        position: "top-right",
        autoClose: 5000,
      });
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
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Vendor Details Card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Building className="w-6 h-6 mr-2 text-primary-600" />
              Vendor Details
            </h2>
            {vendorLogo && (
              <div className="flex items-center gap-2">
                <img 
                  src={vendorLogo} 
                  alt="Vendor Logo" 
                  className="h-12 w-12 object-contain rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
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
                {certificateFile && (
                  <div>
                    <p className="text-sm text-gray-500">MSME Certificate</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-semibold text-gray-800 text-sm truncate flex-1">
                        {certificateFile.name}
                      </p>
                      <button
                        onClick={handleDownloadCertificate}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-600 rounded hover:bg-primary-100 transition-colors text-xs"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </div>
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
                      <span className="font-semibold text-gray-700">CGST (9%):</span>
                      <span className="text-gray-800">₹{(displayGSTTotal / 2).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-gray-700">SGST (9%):</span>
                      <span className="text-gray-800">₹{(displayGSTTotal / 2).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-gray-700">Total GST:</span>
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