// src/components/Bill/BillGenerator.tsx
import React, { useState, useEffect } from 'react';
import { Download, Search, FileText} from 'lucide-react';
import type { Vendor, BillItem } from '../../types';
import { BillValidator } from '../../utils/validation';
import { generateBillPDF } from '../../utils/pdfGenerator';

const BillGenerator: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<BillItem[]>([
    {
      id: '1',
      description: 'Frisking',
      quantity: 0,
      unit: 'Nos',
      rate: 0,
      amount: 0
    },
    {
      id: '2',
      description: 'Biometric',
      quantity: 0,
      unit: 'Nos',
      rate: 0,
      amount: 0
    },
    {
      id: '3',
      description: 'CCTV',
      quantity: 0,
      unit: 'Nos',
      rate: 0,
      amount: 0
    },
    {
      id: '4',
      description: 'EC',
      quantity: 0,
      unit: 'Nos',
      rate: 0,
      amount: 0
    },
    {
      id: '5',
      description: 'CI',
      quantity: 0,
      unit: 'Nos',
      rate: 0,
      amount: 0
    },
    {
      id: '6',
      description: 'RI',
      quantity: 0,
      unit: 'Nos',
      rate: 0,
      amount: 0
    }
  ]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [showVendorList, setShowVendorList] = useState(false);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = () => {
    const storedVendors = JSON.parse(localStorage.getItem('vendors') || '[]');
    setVendors(storedVendors);
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone.includes(searchTerm)
  );

  const handleSelectVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowVendorList(false);
    setSearchTerm('');
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
    const total = itemsList.reduce((sum, item) => sum + item.amount, 0);
    setTotalAmount(total);
  };

  const handleDownloadBill = async () => {
    if (!selectedVendor) {
      alert('Please select a vendor first!');
      return;
    }
    
    // Check if any item has valid values
    const hasValidItems = items.some(item => item.quantity > 0 && item.rate > 0);
    if (!hasValidItems) {
      alert('Please add at least one item with quantity and rate');
      return;
    }
    
    await generateBillPDF(selectedVendor, items, totalAmount);
  };

  const resetForm = () => {
    setSelectedVendor(null);
    setItems(items.map(item => ({ ...item, quantity: 0, rate: 0, amount: 0 })));
    setTotalAmount(0);
    setErrors({});
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Vendor Selection Card */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-800">Generate Bill</h2>
        </div>
        
        {/* Vendor Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Vendor <span className="text-red-500">*</span>
          </label>
          
          {!selectedVendor ? (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowVendorList(true);
                  }}
                  onFocus={() => setShowVendorList(true)}
                  className="input-field pl-10"
                  placeholder="Search vendor by name or phone..."
                />
              </div>
              
              {showVendorList && searchTerm && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {filteredVendors.length > 0 ? (
                    filteredVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        onClick={() => handleSelectVendor(vendor)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                      >
                        <p className="font-semibold text-gray-800">{vendor.vendorName}</p>
                        <p className="text-sm text-gray-500">Phone: {vendor.phone}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No vendors found. Please create a vendor first.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600">Selected Vendor</p>
                  <p className="text-lg font-bold text-gray-800">{selectedVendor.vendorName}</p>
                  <p className="text-sm text-gray-600 mt-1">Phone: {selectedVendor.phone}</p>
                  {selectedVendor.email && (
                    <p className="text-sm text-gray-600">Email: {selectedVendor.email}</p>
                  )}
                  {selectedVendor.gstNumber && (
                    <p className="text-sm text-gray-600">GST: {selectedVendor.gstNumber}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Bill Items Card */}
      {selectedVendor && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">Bill Items</h3>
            <button
              onClick={resetForm}
              className="text-gray-600 hover:text-red-600 transition-colors"
            >
              Clear All
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Unit</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rate (₹)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{item.description}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                        className="w-28 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-right">
                    <span className="text-lg font-bold text-gray-800">Total Amount:</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-2xl font-bold text-primary-600">₹{totalAmount.toFixed(2)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Download Button */}
          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={handleDownloadBill}
              className="btn-primary flex items-center space-x-2 px-8 py-3"
            >
              <Download className="w-5 h-5" />
              <span>Download Bill (PDF)</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {selectedVendor && items.every(item => item.quantity === 0 && item.rate === 0) && (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Items Added</h3>
          <p className="text-gray-500">Add quantity and rate for items to generate bill</p>
        </div>
      )}
    </div>
  );
};

export default BillGenerator;