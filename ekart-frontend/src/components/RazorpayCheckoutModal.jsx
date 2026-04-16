import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';

/**
 * RazorpayCheckoutModal — Razorpay payment integration for EKART
 * 
 * Flow:
 * 1. User clicks "Pay Now" → initiate checkout
 * 2. Frontend calls backend /api/react/orders/checkout to get Razorpay order details
 * 3. Open Razorpay checkout modal
 * 4. User completes payment
 * 5. Verify signature on backend via /api/react/orders/callback
 * 6. Place the actual order with payment details
 * 7. Show success
 * 
 * Security:
 * - Signature verification mandatory (backend)
 * - Amount validation (backend has true amount)
 * - Razorpay keys not exposed in frontend
 */
export function RazorpayCheckoutModal({ 
  isOpen, 
  onClose, 
  carttotal, 
  addressId, 
  deliveryTime = "STANDARD",
  onPaymentSuccess,
  showToast 
}) {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState(null);
  const [error, setError] = useState(null);

  // Load Razorpay script on mount
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePayNow = async () => {
    if (!auth?.id) {
      showToast('❌ Please sign in to proceed');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create Razorpay order on backend
      
      const checkoutRes = await fetch('/api/react/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Customer-Id': auth.id
        },
        body: JSON.stringify({
          addressId,
          deliveryTime
        })
      });

      const checkoutData = await checkoutRes.json();

      if (!checkoutData.success) {
        setError(checkoutData.message || 'Failed to create order');
        setLoading(false);
        return;
      }

      setRazorpayOrder(checkoutData);

      // Step 2: Open Razorpay checkout
      const options = {
        key: checkoutData.razorpayKeyId,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        order_id: checkoutData.razorpayOrderId,
        name: 'EKART',
        description: `Order #${checkoutData.tempOrderId}`,
        customer_id: `customer_${auth.id}`,
        prefill: {
          name: checkoutData.customerName || auth.name || 'Customer',
          email: checkoutData.customerEmail || auth.email || '',
          contact: checkoutData.customerPhone || '9999999999'
        },
        notes: {
          orderId: checkoutData.tempOrderId,
          customerId: auth.id,
          addressId: addressId
        },
        theme: {
          color: '#f5a800' // EKART brand color
        },
        handler: async (response) => {
          await handlePaymentSuccess(response, checkoutData);
        },
        modal: {
          ondismiss: () => {
            console.log('❌ Payment cancelled by user');
            showToast('Payment cancelled');
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      setError(err.message || 'Checkout failed');
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (response, checkoutData) => {
    try {
      // Step 3: Verify signature on backend
      
      const callbackRes = await fetch('/api/react/orders/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Customer-Id': auth.id
        },
        body: JSON.stringify({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          tempOrderId: checkoutData.tempOrderId
        })
      });

      const callbackData = await callbackRes.json();

      if (!callbackData.success) {
        setError('Payment verification failed: ' + callbackData.message);
        setLoading(false);
        return;
      }

      // Step 4: Place actual order with payment details
      
      if (onPaymentSuccess) {
        await onPaymentSuccess({
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          amount: checkoutData.totalAmount
        });
      }

      showToast('💰 Payment successful! Order confirmed.');
      setLoading(false);
      onClose();

    } catch (err) {
      setError(err.message || 'Payment verification failed');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">💳 Checkout</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="flex justify-between text-gray-700">
            <span>Cart Total:</span>
            <span className="font-semibold">₹{Math.round(carttotal)}</span>
          </div>
          {razorpayOrder && (
            <>
              <div className="flex justify-between text-gray-700">
                <span>Delivery Charge:</span>
                <span>₹{Math.round(razorpayOrder.deliveryCharge)}</span>
              </div>
              {razorpayOrder.couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon Discount:</span>
                  <span>-₹{Math.round(razorpayOrder.couponDiscount)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total to Pay:</span>
                <span className="text-orange-600">₹{Math.round(razorpayOrder.totalAmount)}</span>
              </div>
            </>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={handlePayNow}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-700 active:scale-95'
            }`}
          >
            {loading ? '⏳ Processing...' : '💰 Pay Now'}
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold border-2 border-gray-300 transition ${
              loading
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100 active:scale-95'
            }`}
          >
            Cancel
          </button>
        </div>

        <p className="text-center text-gray-500 text-xs mt-4">
          Powered by Razorpay • Secure Payment Gateway
        </p>
      </div>
    </div>
  );
}
