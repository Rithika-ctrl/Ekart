# Email Templates - React Components

This directory contains React component versions of all email templates previously written in Thymeleaf HTML.

## Components

### 1. **OtpEmail** (`OtpEmail.jsx`)
Simple OTP display email for customer verification during order placement.
```jsx
<OtpEmail name="John Doe" otp="123456" />
```
**Props:**
- `name` (string): Customer name
- `otp` (string): One-time password

---

### 2. **OrderEmail** (`OrderEmail.jsx`)
Order confirmation email with complete order details, items, and payment information.
```jsx
<OrderEmail
  name="John Doe"
  orderId="12345"
  paymentMode="Online"
  deliveryTime="3-5 PM"
  items={[{ name: 'Product 1', quantity: 1, price: 999 }]}
  amount={4999.99}
/>
```
**Props:**
- `name` (string): Customer name
- `orderId` (string|number): Order ID
- `paymentMode` (string): "Online" or "Cash on Delivery"
- `deliveryTime` (string): Optional delivery time window
- `items` (array): Array of {name, quantity, price}
- `amount` (number): Total order amount

---

### 3. **CancelEmail** (`CancelEmail.jsx`)
Order cancellation notification with refund details and cancelled items list.
```jsx
<CancelEmail
  name="John Doe"
  orderId="12345"
  amount={4999.99}
  items={[{ name: 'Product 1', quantity: 1, price: 999 }]}
/>
```
**Props:**
- `name` (string): Customer name
- `orderId` (string|number): Order ID
- `amount` (number): Refund amount
- `items` (array): Array of {name, quantity, price}

---

### 4. **ShippedEmail** (`ShippedEmail.jsx`)
Notification sent when order is picked up and assigned to delivery boy (status: SHIPPED).
```jsx
<ShippedEmail
  name="John Doe"
  orderId="12345"
  deliveryBoyName="Ahmed Khan"
  currentCity="Mumbai"
  items={[{ name: 'Product 1', quantity: 1, unitPrice: 999 }]}
/>
```
**Props:**
- `name` (string): Customer name
- `orderId` (string|number): Order ID
- `deliveryBoyName` (string): Name of assigned delivery partner
- `currentCity` (string): Current delivery location
- `items` (array): Array of {name, quantity, unitPrice}

---

### 5. **DeliveredEmail** (`DeliveredEmail.jsx`)
Delivery confirmation email with success message and items delivered.
```jsx
<DeliveredEmail
  name="John Doe"
  orderId="12345"
  amount={4999.99}
  items={[{ name: 'Product 1', quantity: 1, unitPrice: 999 }]}
/>
```
**Props:**
- `name` (string): Customer name
- `orderId` (string|number): Order ID
- `amount` (number): Total order amount paid
- `items` (array): Array of {name, quantity, unitPrice}

---

### 6. **ReplacementEmail** (`ReplacementEmail.jsx`)
Replacement request acknowledgment with step-by-step process information.
```jsx
<ReplacementEmail
  name="John Doe"
  orderId="12345"
  amount={4999.99}
  items={[{ name: 'Product 1', quantity: 1, price: 999 }]}
/>
```
**Props:**
- `name` (string): Customer name
- `orderId` (string|number): Order ID
- `amount` (number): Order amount
- `items` (array): Array of {name, quantity, price}

---

### 7. **StockAlertEmail** (`StockAlertEmail.jsx`)
Low stock alert email sent to vendors when product inventory drops below threshold.
```jsx
<StockAlertEmail
  vendorName="Supplier Inc"
  productName="Premium Widget"
  productId="P12345"
  currentStock={5}
  threshold={10}
/>
```
**Props:**
- `vendorName` (string): Vendor/supplier name
- `productName` (string): Product name
- `productId` (string|number): Product ID
- `currentStock` (number): Current inventory count
- `threshold` (number): Alert threshold level

---

### 8. **BackInStockEmail** (`BackInStockEmail.jsx`)
Product back in stock notification sent to customers who subscribed for "Notify Me" alerts.
```jsx
<BackInStockEmail
  customerName="John Doe"
  productName="Premium Widget"
  productImage="/images/widget.jpg"
  productPrice={999.99}
  productStock={15}
  productId="P12345"
/>
```
**Props:**
- `customerName` (string): Customer name
- `productName` (string): Product name
- `productImage` (string): Product image URL
- `productPrice` (number): Product price
- `productStock` (number): Available stock units
- `productId` (string|number): Product ID

---

### 9. **DeliveryOtpEmail** (`DeliveryOtpEmail.jsx`)
Delivery OTP sent to customer when delivery is out for delivery (for verification at doorstep).
```jsx
<DeliveryOtpEmail
  name="John Doe"
  orderId="12345"
  otp="654321"
/>
```
**Props:**
- `name` (string): Customer name
- `orderId` (string|number): Order ID
- `otp` (string): Delivery verification OTP

---

## Shared Components

Located in `shared/` directory:

### **EmailLayout** Components
Reusable components for common email structure patterns:

- `EmailLayout`: Main wrapper with dark/light mode support
- `EmailHeader`: Header section with branding and status badges
- `EmailBody`: Body content wrapper
- `EmailFooter`: Footer with copyright information

```jsx
import { EmailLayout, EmailHeader, EmailBody, EmailFooter } from './shared/EmailLayout';

<EmailLayout darkMode={true}>
  <EmailHeader
    title="Order Confirmed"
    subtitle="Thank you for shopping"
    statusBadgeText="Confirmed"
    statusBadgeColor="#4ade80"
  />
  <EmailBody>
    {/* Content */}
  </EmailBody>
  <EmailFooter>© 2026 Ekart</EmailFooter>
</EmailLayout>
```

---

## Features

✅ **Email-Safe Styling**: All components use inline CSS (no external dependencies)
✅ **Dark Mode Ready**: Professional dark theme with proper contrast
✅ **Responsive Design**: Mobile-friendly layouts where applicable
✅ **Accessibility**: Proper semantic HTML and color contrast
✅ **Performance**: Lightweight components with minimal bundle size
✅ **Currency Formatting**: Automatic rupee (₹) formatting for prices
✅ **Type Consistency**: Default props for all optional parameters

## Usage in Backend

These components can be used in your Spring Boot backend to render emails:

1. **Install React server-side rendering library** (e.g., `@react-pdf/renderer` or custom Node.js bridge)

2. **Call components from Java**:
```java
// In your email service
String htmlContent = renderReactComponent(
    "OrderEmail",
    new OrderEmailProps(
        "John Doe",
        "12345",
        "Online",
        "3-5 PM",
        items,
        4999.99
    )
);
emailService.send(to, "Order Confirmation", htmlContent);
```

## Alternative: Export as Static HTML

For simpler integration without Node.js bridge, components can be exported as static HTML strings:

```jsx
import { renderToString } from 'react-dom/server';
import { OrderEmail } from './emails';

const html = renderToString(
    <OrderEmail name="John" orderId="123" paymentMode="Online" items={[]} amount={999} />
);
```

---

## Styling Approach

All components use **inline CSS** via `style` objects in React:

```jsx
const styles = {
  container: {
    background: '#fff',
    padding: '20px',
    borderRadius: '8px'
  }
};

return <div style={styles.container}>Content</div>;
```

This approach ensures compatibility with email clients that don't support `<style>` tags.

---

## Color Palette

- **Primary**: `#f5a800` (Ekart Gold)
- **Primary Blue**: `#2874f0`
- **Orange**: `#fb641b`
- **Success**: `#22c55e` / `#4ade80` (Green)
- **Danger**: `#ff6b5b` / `#ef4444` (Red)
- **Dark Background**: `#0d1020`
- **Card Background**: `#13162b` / `#111827`
- **Text White**: `#ffffff`
- **Text Light**: `#94a3b8` / `#878787`

---

## Testing

To test components locally, use the Storybook setup or render directly in a browser:

```jsx
import { OrderEmail } from '@/components/emails';

export default function EmailPreview() {
  return (
    <OrderEmail
      name="Test User"
      orderId="TEST123"
      paymentMode="Online"
      items={[
        { name: 'Product 1', quantity: 2, price: 499 },
        { name: 'Product 2', quantity: 1, price: 999 }
      ]}
      amount={1997}
    />
  );
}
```

---

## File Structure

```
src/components/emails/
├── index.js                 # Main export file
├── OtpEmail.jsx
├── OrderEmail.jsx
├── CancelEmail.jsx
├── ShippedEmail.jsx
├── DeliveredEmail.jsx
├── ReplacementEmail.jsx
├── StockAlertEmail.jsx
├── BackInStockEmail.jsx
├── DeliveryOtpEmail.jsx
└── shared/
    └── EmailLayout.jsx      # Shared layout components
```

---

## Migration Notes

### From Thymeleaf to React

- `th:text="${variable}"` → `{variable}`
- `th:if="${condition}"` → `{condition && <Component />}`
- `th:each="item : ${items}"` → `items.map(item => ...)`
- Inline styles replace `<style>` tags
- All variables become component props

Example comparison:

**Thymeleaf:**
```html
<span th:text="${amount}">0.00</span>
```

**React:**
```jsx
<span>{amount.toFixed(2)}</span>
```

---

## Future Enhancements

- [ ] Add Email Preview component for dashboard
- [ ] Create email template builder UI
- [ ] Add A/B testing variants
- [ ] Implement email analytics tracking
- [ ] Add template customization settings
- [ ] Create email scheduling system

---

**Last Updated:** 2025
**Version:** 1.0.0
