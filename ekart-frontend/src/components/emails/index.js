/**
 * Email Components Export
 * Central export for all email template components
 */

export { OtpEmail } from './OtpEmail';
export { OrderEmail } from './OrderEmail';
export { CancelEmail } from './CancelEmail';
export { ShippedEmail } from './ShippedEmail';
export { DeliveredEmail } from './DeliveredEmail';
export { ReplacementEmail } from './ReplacementEmail';
export { StockAlertEmail } from './StockAlertEmail';
export { BackInStockEmail } from './BackInStockEmail';
export { DeliveryOtpEmail } from './DeliveryOtpEmail';

// Shared components
export { EmailLayout, EmailHeader, EmailBody, EmailFooter } from './shared/EmailLayout';

/**
 * Email Templates Map
 * Maps template names to component props for easy reference
 */
export const emailTemplates = {
  OTP: {
    component: 'OtpEmail',
    props: ['name', 'otp'],
    description: 'Customer OTP verification email'
  },
  ORDER: {
    component: 'OrderEmail',
    props: ['name', 'orderId', 'paymentMode', 'deliveryTime', 'items', 'amount'],
    description: 'Order confirmation email'
  },
  CANCEL: {
    component: 'CancelEmail',
    props: ['name', 'orderId', 'amount', 'items'],
    description: 'Order cancellation email with refund details'
  },
  SHIPPED: {
    component: 'ShippedEmail',
    props: ['name', 'orderId', 'deliveryBoyName', 'currentCity', 'items'],
    description: 'Order shipped notification'
  },
  DELIVERED: {
    component: 'DeliveredEmail',
    props: ['name', 'orderId', 'amount', 'items'],
    description: 'Order delivery confirmation'
  },
  REPLACEMENT: {
    component: 'ReplacementEmail',
    props: ['name', 'orderId', 'amount', 'items'],
    description: 'Replacement request acknowledgment'
  },
  STOCK_ALERT: {
    component: 'StockAlertEmail',
    props: ['vendorName', 'productName', 'productId', 'currentStock', 'threshold'],
    description: 'Low stock alert for vendors'
  },
  BACK_IN_STOCK: {
    component: 'BackInStockEmail',
    props: ['customerName', 'productName', 'productImage', 'productPrice', 'productStock', 'productId'],
    description: 'Product back in stock notification'
  },
  DELIVERY_OTP: {
    component: 'DeliveryOtpEmail',
    props: ['name', 'orderId', 'otp'],
    description: 'Delivery OTP for order verification'
  }
};
