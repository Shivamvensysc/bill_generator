import React, { useState, useCallback, useEffect } from 'react';
import { 
  Save, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Building, 
  FileText, 
  IdCard,
  Hash,
  Globe,
  Briefcase,
  Wallet,
  RefreshCw,
  Users,
  ArrowLeft
} from 'lucide-react';   
import { VendorValidator } from '../../utils/validation';
import type { Vendor } from '../../types'; 
import axios from 'axios';

interface CreateVendorProps {
  editingVendor?: Vendor | null;
  onVendorSaved?: () => void;
  onCancel?: () => void;
}

const InputField = React.memo(({ 
  label, 
  name, 
  value, 
  onChange, 
  onBlur, 
  placeholder, 
  icon: Icon, 
  required = false,
  type = "text",
  error
}: any) => (
  <div className="group">
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-600 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:border-primary-500 transition-all duration-200 ${
          error ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        placeholder={placeholder}
      />
    </div>
    {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span className="text-red-500">⚠️</span> {error}</p>}
  </div>
));

const TextAreaField = React.memo(({ label, name, value, onChange, placeholder, icon: Icon }: any) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-3 text-gray-400">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 transition-all duration-200"
        placeholder={placeholder}
      />
    </div>
  </div>
));

const CreateVendor: React.FC<CreateVendorProps> = ({ editingVendor, onVendorSaved, onCancel }) => {
  const [formData, setFormData] = useState({
    vendorName: '',
    phone: '',
    email: '',
    address: '',
    pan: '',
    gstNumber: '',
    stateCode: '',
    aadhaarNumber: '',
    msmeCertificateNo: '',
    bankDetails: {
      accountNumber: '',
      ifscCode: '',
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (editingVendor) {
      setIsEditMode(true);
      setFormData({
        vendorName: editingVendor.vendorName || '',
        phone: editingVendor.phone || '',
        email: editingVendor.email || '',
        address: editingVendor.address || '',
        pan: editingVendor.pan || '',
        gstNumber: editingVendor.gstNumber || '',
        stateCode: editingVendor.stateCode || '',
        aadhaarNumber: editingVendor.aadhaarNumber || '',
        msmeCertificateNo: editingVendor.msmeCertificateNo || '',
        bankDetails: {
          accountNumber: editingVendor.bankDetails?.accountNumber || '',
          ifscCode: editingVendor.bankDetails?.ifscCode || '',
        }
      });
    } else {
      setIsEditMode(false);
      setFormData({
        vendorName: '',
        phone: '',
        email: '',
        address: '',
        pan: '',
        gstNumber: '',
        stateCode: '',
        aadhaarNumber: '',
        msmeCertificateNo: '',
        bankDetails: {
          accountNumber: '',
          ifscCode: '',
        }
      });
    }
  }, [editingVendor]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData(prev => {
      if (['accountNumber', 'ifscCode'].includes(name)) {
        return {
          ...prev,
          bankDetails: {
            ...prev.bankDetails,
            [name]: value
          }
        };
      } else {
        return {
          ...prev,
          [name]: value
        };
      }
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const validateField = useCallback((name: string, value: string): string => {
    switch (name) {
      case 'vendorName': return VendorValidator.validateVendorName(value).message;
      case 'phone': return VendorValidator.validatePhone(value).message;
      case 'email': return VendorValidator.validateEmail(value).message;
      case 'pan': return VendorValidator.validatePAN(value).message;
      case 'gstNumber': return VendorValidator.validateGST(value).message;
      case 'aadhaarNumber': return VendorValidator.validateAadhaar(value).message;
      case 'ifscCode': return VendorValidator.validateIFSC(value).message;
      case 'accountNumber': return VendorValidator.validateAccountNumber(value).message;
      default: return '';
    }
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateField]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newErrors: Record<string, string> = {};

    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'bankDetails' && key !== 'address' && key !== 'stateCode' && key !== 'msmeCertificateNo') {
        const error = validateField(key, value as string);
        if (error) newErrors[key] = error;
      }
    });

    Object.entries(formData.bankDetails).forEach(([key, value]) => {
      if (value) {
        const error = validateField(key, value);
        if (error) newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        name: formData.vendorName,
        address: formData.address,
        state: formData.stateCode,
        gst_number: formData.gstNumber,
        pan_number: formData.pan,
        aadhaar_number: formData.aadhaarNumber,
        phone: formData.phone,
        email: formData.email,
        account_number: formData.bankDetails.accountNumber,
        ifsc_code: formData.bankDetails.ifscCode,
        msme_certificate_path: formData.msmeCertificateNo
      };

      if (isEditMode && editingVendor) {
        // Update existing vendor
        const response = await axios.put(
          `http://192.168.11.103:5000/vendors/${editingVendor.id}`,
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        // Check if response matches expected format {updated: true}
        if (response.data && response.data.updated === true) {
          alert('✅ Vendor updated successfully!');
        } else {
          alert('⚠️ Vendor updated but unexpected response format.');
        }
      } else {
        // Create new vendor
        const response = await axios.post(
          'http://192.168.11.103:5000/vendors',
          payload,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        if (response.data && response.data.id) {
          alert('✅ Vendor created successfully!');
        } else {
          alert('⚠️ Vendor created but unexpected response format.');
        }
      }

      // Reset form
      setFormData({
        vendorName: '',
        phone: '',
        email: '',
        address: '',
        pan: '',
        gstNumber: '',
        stateCode: '',
        aadhaarNumber: '',
        msmeCertificateNo: '',
        bankDetails: {
          accountNumber: '',
          ifscCode: '',
        }
      });
      setErrors({});

      if (onVendorSaved) {
        onVendorSaved();
      }

    } catch (error: any) {
      console.error('API Error:', error);
      if (error.response?.data?.message) {
        alert(`❌ Failed to ${isEditMode ? 'update' : 'create'} vendor: ${error.response.data.message}`);
      } else {
        alert(`❌ Failed to ${isEditMode ? 'update' : 'create'} vendor. Please try again.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateField, isEditMode, editingVendor, onVendorSaved]);

  const handleReset = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all fields?')) {
      setFormData({
        vendorName: '',
        phone: '',
        email: '',
        address: '',
        pan: '',
        gstNumber: '',
        stateCode: '',
        aadhaarNumber: '',
        msmeCertificateNo: '',
        bankDetails: {
          accountNumber: '',
          ifscCode: ''
        }
      });
      setErrors({});
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-72 h-72 bg-primary-100 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
        
        <div className="relative mb-4">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-4 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                  <Users className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    {isEditMode ? 'Edit Vendor' : 'Create New Vendor'}
                  </h1>
                  <p className="text-primary-100 flex items-center gap-2">
                    {isEditMode ? 'Update vendor details' : 'Add vendor details to generate bills and manage payments'}
                  </p>
                </div>
              </div>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information Section */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-lg mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-2 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                Basic Information
              </h3>
              <p className="text-sm text-gray-500">Essential contact and identification details</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InputField
                  label="Vendor Name"
                  name="vendorName"
                  value={formData.vendorName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter vendor name"
                  icon={Building}
                  required={true}
                  error={errors.vendorName}
                />
                
                <InputField
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="10-digit mobile number"
                  icon={Phone}
                  required={true}
                  error={errors.phone}
                />
                
                <InputField
                  label="Email Address"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="vendor@company.com"
                  icon={Mail}
                  error={errors.email}
                />
                
                <div className="md:col-span-2 lg:col-span-3">
                  <TextAreaField
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Full address (Street, City, State, Pincode)"
                    icon={MapPin}
                  />
                </div>
                
                <InputField
                  label="PAN Number"
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="ABCDE1234F"
                  icon={IdCard}
                  error={errors.pan}
                />
                
                <InputField
                  label="GST Number"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="22AAAAA0000A1Z"
                  icon={FileText}
                  error={errors.gstNumber}
                />
                
                <InputField
                  label="State Code"
                  name="stateCode"
                  value={formData.stateCode}
                  onChange={handleChange}
                  placeholder="MH, UP, DL, KA, etc."
                  icon={Globe}
                />
                
                <InputField
                  label="Aadhaar Number"
                  name="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="1234 5678 9012"
                  icon={IdCard}
                  error={errors.aadhaarNumber}
                />
                
                <InputField
                  label="MSME Certificate No"
                  name="msmeCertificateNo"
                  value={formData.msmeCertificateNo}
                  onChange={handleChange}
                  placeholder="MSME registration number"
                  icon={Briefcase}
                />
              </div>
            </div>
          </div>

          {/* Bank Details Section */}
          <div className="bg-white border border-slate-300 rounded-2xl shadow-lg mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-2 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Building className="w-5 h-5 text-primary-600" />
                </div>
                Bank Details
              </h3>
              <p className="text-sm text-gray-500">Bank account information for payments</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InputField
                  label="Account Number"
                  name="accountNumber"
                  value={formData.bankDetails.accountNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="9-18 digit account number"
                  icon={Wallet}
                  error={errors.accountNumber}
                />
                
                <InputField
                  label="IFSC Code"
                  name="ifscCode"
                  value={formData.bankDetails.ifscCode}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="SBIN0001234"
                  icon={Hash}
                  error={errors.ifscCode}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            {!isEditMode && (
              <button
                type="button"
                onClick={handleReset}
                className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Form
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isEditMode ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditMode ? 'Update Vendor' : 'Save Vendor'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateVendor;


