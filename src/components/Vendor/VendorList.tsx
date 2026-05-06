import React, { useState, useEffect } from 'react';
import { Search, Eye, Building, Mail, ChevronLeft, ChevronRight, Download, Users, Edit2, Trash2 } from 'lucide-react';
import type { Vendor } from '../../types';
import axios from "axios";

interface VendorListProps {
  onVendorClick: (vendorId: string) => void;
  onEditVendor: (vendor: Vendor) => void;
onVendorDeleted?: (id: string) => void;
}

const VendorList: React.FC<VendorListProps> = ({ onVendorClick, onEditVendor, onVendorDeleted }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof Vendor>('vendorName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const res = await axios.get("http://192.168.11.103:5000/vendors");
      const mappedVendors: Vendor[] = res.data.map((v: any) => ({
        id: String(v.id),
        vendorName: v.name,
        phone: v.phone,
        email: v.email,
        gstNumber: v.gst_number,
        pan: v.pan_number,
        address: v.address,
        stateCode: v.state,
        aadhaarNumber: v.aadhaar_number,
        msmeCertificateNo: v.msme_certificate_path,
        bankDetails: {
          accountNumber: v.account_number,
          ifscCode: v.ifsc_code,
        },
        createdAt: new Date(v.created_at),
      }));
      setVendors(mappedVendors);
    } catch (error) {
      console.error("Failed to fetch vendors", error);
      alert("Failed to fetch vendors. Please check your connection.");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
  e.stopPropagation();

  try {
    await axios.delete(`http://192.168.11.103:5000/vendors/${id}`);

    // ✅ Instant UI update (no reload)
    setVendors(prev => prev.filter(v => v.id !== id));

    alert('✅ Vendor deleted successfully!');

    onVendorDeleted?.(id); // optional
    setDeleteConfirm(null);

  } catch (error: any) {
    console.error("Failed to delete vendor", error);

    alert(
      error.response?.data?.message ||
      "Failed to delete vendor"
    );
  }
};

  const handleEdit = (vendor: Vendor, e: React.MouseEvent) => {
    e.stopPropagation();
    onEditVendor(vendor);
  };

  // Filter vendors
  const filteredVendors = vendors.filter(vendor =>
    vendor.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone.includes(searchTerm) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.gstNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.pan?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort vendors
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (aValue && bValue) {
      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    }
    
    return 0;
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVendors = sortedVendors.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedVendors.length / itemsPerPage);

  const handleSort = (field: keyof Vendor) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Vendor) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const exportToCSV = () => {
    const headers = ['Vendor Name', 'Phone', 'Email', 'GST Number', 'PAN', 'Address', 'Created Date'];
    const csvData = filteredVendors.map(vendor => [
      vendor.vendorName,
      vendor.phone,
      vendor.email || 'N/A',
      vendor.gstNumber || 'N/A',
      vendor.pan || 'N/A',
      vendor.address || 'N/A',
      formatDate(vendor.createdAt)
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors_export_${new Date().toLocaleDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this vendor? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleDelete(deleteConfirm, e)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Vendor Management</h1>
                <p className="text-primary-100 flex items-center gap-2">
                  Manage and track all your vendors
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-800 placeholder-gray-400"
                />
              </div>
              
              <button
                onClick={exportToCSV}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  onClick={() => handleSort('vendorName')}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Vendor Name {getSortIcon('vendorName')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('phone')}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    Contact {getSortIcon('phone')}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  GST Number 
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentVendors?.map((vendor) => (
                <tr 
                  key={vendor.id}
                  className="hover:bg-gray-50 transition-colors group"
                >
                  <td 
                    className="px-6 py-4 cursor-pointer"
                    onClick={() => onVendorClick(vendor.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{vendor.vendorName}</p>
                        <p className="text-xs text-gray-500">ID: {vendor.id.slice(-8)}</p>
                      </div>
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 cursor-pointer"
                    onClick={() => onVendorClick(vendor.id)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-700">
                        {vendor.phone}
                      </div>
                    </div>
                  </td>
                  <td 
                    className="px-6 py-4 cursor-pointer"
                    onClick={() => onVendorClick(vendor.id)}
                  >
                    <div className="space-y-1">
                      {vendor.gstNumber && (
                        <div>
                          <p className="text-sm font-mono text-gray-900">{vendor.gstNumber}</p>
                        </div>
                      )}
                      {vendor.pan && !vendor.gstNumber && (
                        <div>
                          <p className="text-xs text-gray-500">PAN</p>
                          <p className="text-sm font-mono text-gray-900">{vendor.pan}</p>
                        </div>
                      )}
                      {!vendor.gstNumber && !vendor.pan && (
                        <p className="text-sm text-gray-400">Not provided</p>
                      )}
                    </div>
                   </td>
                  <td 
                    className="px-6 py-4 cursor-pointer"
                    onClick={() => onVendorClick(vendor.id)}
                  >
                    <div className="space-y-1">
                      {vendor.email && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Mail className="w-3 h-3 mr-1" />
                          {vendor.email}
                        </div>
                      )}
                      {!vendor.email && (
                        <p className="text-sm text-gray-400">Not provided</p>
                      )}
                    </div>
                   </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => handleEdit(vendor, e)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(vendor.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVendorClick(vendor.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </div>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredVendors.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No vendors found</h3>
            <p className="text-gray-500">Create your first vendor to get started</p>
          </div>
        )}

        {/* Pagination */}
        {filteredVendors.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredVendors.length)} of {filteredVendors.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorList;