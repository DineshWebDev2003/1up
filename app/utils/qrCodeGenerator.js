//// Simple QR Code Generator Utility
// Note: For production, install a proper QR code library like 'react-native-qrcode-svg'

export const generateQRCodeData = (feeId, amount, studentId) => {
  const paymentData = {
    fee_id: feeId,
    amount: amount,
    student_id: studentId,
    timestamp: new Date().toISOString(),
    type: 'fee_payment'
  };
  
  return JSON.stringify(paymentData);
};

export const generateUPIQRData = (upiId, amount, note) => {
  const upiData = `upi://pay?pa=${upiId}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  return upiData;
};

export const generatePaymentURL = (feeId, amount) => {
  // This would be your payment gateway URL
  return `https://your-payment-gateway.com/pay?fee_id=${feeId}&amount=${amount}`;
};

// Simple QR code placeholder component
export const QRCodePlaceholder = ({ data, size = 200 }) => {
  return {
    data: data,
    size: size,
    // In production, replace this with actual QR code rendering
    placeholder: true
  };
};
