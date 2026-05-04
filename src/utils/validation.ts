// src/utils/validation.ts
export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export class VendorValidator {
  static validateVendorName(name: string): ValidationResult {
    if (!name || name.trim().length === 0) {
      return { isValid: false, message: 'Vendor name is required' };
    }
    if (name.length < 2) {
      return { isValid: false, message: 'Vendor name must be at least 2 characters' };
    }
    if (name.length > 100) {
      return { isValid: false, message: 'Vendor name cannot exceed 100 characters' };
    }
    if (!/^[a-zA-Z\s\-\.&]+$/.test(name)) {
      return { isValid: false, message: 'Vendor name can only contain letters, spaces, dots, and &' };
    }
    return { isValid: true, message: '' };
  }

  static validatePhone(phone: string): ValidationResult {
    if (!phone || phone.trim().length === 0) {
      return { isValid: false, message: 'Phone number is required' };
    }
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return { isValid: false, message: 'Enter valid 10-digit Indian mobile number' };
    }
    return { isValid: true, message: '' };
  }

  static validateEmail(email: string): ValidationResult {
    if (email && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
      if (!emailRegex.test(email)) {
        return { isValid: false, message: 'Enter valid email address' };
      }
    }
    return { isValid: true, message: '' };
  }

  static validatePAN(pan: string): ValidationResult {
    if (pan && pan.trim().length > 0) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(pan.toUpperCase())) {
        return { isValid: false, message: 'Enter valid PAN (e.g., ABCDE1234F)' };
      }
    }
    return { isValid: true, message: '' };
  }

  static validateGST(gst: string): ValidationResult {
    if (gst && gst.trim().length > 0) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(gst.toUpperCase())) {
        return { isValid: false, message: 'Enter valid GST number (15 characters)' };
      }
    }
    return { isValid: true, message: '' };
  }

  static validateAadhaar(aadhaar: string): ValidationResult {
    if (aadhaar && aadhaar.trim().length > 0) {
      const aadhaarRegex = /^[2-9]{1}[0-9]{11}$/;
      const cleanAadhaar = aadhaar.replace(/\s/g, '');
      if (!aadhaarRegex.test(cleanAadhaar)) {
        return { isValid: false, message: 'Enter valid 12-digit Aadhaar number' };
      }
    }
    return { isValid: true, message: '' };
  }

  static validateIFSC(ifsc: string): ValidationResult {
    if (ifsc && ifsc.trim().length > 0) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(ifsc.toUpperCase())) {
        return { isValid: false, message: 'Enter valid IFSC code (e.g., SBIN0001234)' };
      }
    }
    return { isValid: true, message: '' };
  }

  static validateAccountNumber(accNo: string): ValidationResult {
    if (accNo && accNo.trim().length > 0) {
      if (accNo.length < 9 || accNo.length > 18) {
        return { isValid: false, message: 'Account number should be 9-18 digits' };
      }
      if (!/^\d+$/.test(accNo)) {
        return { isValid: false, message: 'Account number should contain only digits' };
      }
    }
    return { isValid: true, message: '' };
  }
}

export class BillValidator {
  static validateItem(item: { quantity: number; rate: number }): ValidationResult {
    if (item.quantity < 0) {
      return { isValid: false, message: 'Quantity cannot be negative' };
    }
    if (item.rate < 0) {
      return { isValid: false, message: 'Rate cannot be negative' };
    }
    if (item.quantity > 10000) {
      return { isValid: false, message: 'Quantity cannot exceed 10,000' };
    }
    if (item.rate > 9999999) {
      return { isValid: false, message: 'Rate cannot exceed ₹99,99,999' };
    }
    return { isValid: true, message: '' };
  }
}