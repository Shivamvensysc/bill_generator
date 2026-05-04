// src/types/index.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface Vendor {
  id: string;
  vendorName: string;
  phone: string;
  email: string;
  address: string;
  pan: string;
  gstNumber: string;
  stateCode: string;
  aadhaarNumber: string;
  msmeCertificateNo: string;
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BillItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  vendorId: string;
  vendor: Vendor;
  items: BillItem[];
  subtotal: number;
  totalAmount: number;
  date: Date;
  status: 'paid' | 'pending' | 'overdue';
}

export const FIXED_ITEMS: Omit<BillItem, 'id' | 'amount'>[] = [
  { description: 'Frisking', quantity: 1, unit: 'Nos', rate: 0 },
  { description: 'Biometric', quantity: 1, unit: 'Nos', rate: 0 },
  { description: 'CCTV', quantity: 1, unit: 'Nos', rate: 0 },
  { description: 'EC', quantity: 1, unit: 'Nos', rate: 0 },
  { description: 'CI', quantity: 1, unit: 'Nos', rate: 0 },
  { description: 'RI', quantity: 1, unit: 'Nos', rate: 0 },
];