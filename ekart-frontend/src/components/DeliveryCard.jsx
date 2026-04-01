import React from "react";
import { Box, Truck, CheckCircle, MapPin, Phone, TruckDelivery } from "lucide-react";

export default function DeliveryCard({
  order,
  variant = "pickup", // pickup | out | delivered
  onPickUp,
  onConfirmDelivery,
  otpValue = "",
  setOtp = () => {},
  loading = false,
}) {
  if (loading) {
    return (
      <div className="w-full rounded-xl bg-white shadow-sm p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/5 mb-3" />
        <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3 mt-3" />
      </div>
    );
  }

  const customerName = order.customer?.name || order.customerName || "—";
  const customerPhone = order.customer?.mobile || order.mobile || "—";
  const pin = order.deliveryPinCode || order.pin || "—";

  return (
    <article className="w-full bg-white rounded-2xl shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
            {variant === "pickup" ? <Box size={20} /> : variant === "out" ? <TruckDelivery size={20} /> : <CheckCircle size={20} />}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Order #{order.id}</div>
            <div className="text-xs text-gray-500">{customerName} · <span className="text-gray-400">{order.items?.length || 0} items</span></div>
            <div className="mt-1 text-xs text-gray-500 flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> <span>{pin}</span></div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-extrabold text-gray-900">{order.amount ? `₹${Number(order.amount).toFixed(2)}` : order.totalPrice ? `₹${Number(order.totalPrice).toFixed(2)}` : "—"}</div>
          <div className="text-xs text-gray-400">{order.deliverySlot || "ASAP"}</div>
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-600 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-500"><Phone size={14} /> <span>{customerPhone}</span></div>
        <div className="text-xs text-gray-500">{(order.items || []).map((it, i) => `${it.name} ×${it.quantity}${i < order.items.length - 1 ? ", " : ""}`)}</div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {variant === "pickup" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPickUp(order.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
            >
              <Truck size={16} /> Picked Up
            </button>
          </div>
        )}

        {variant === "out" && (
          <div className="w-full sm:w-auto flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpValue}
              onChange={e => setOtp(order.id, e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="OTP"
              className="flex-1 sm:flex-none min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              onClick={() => onConfirmDelivery(order.id)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-green-500 text-green-600 hover:bg-green-50 text-sm font-semibold transition"
            >
              <CheckCircle size={16} /> Deliver
            </button>
          </div>
        )}

        {variant === "delivered" && (
          <div className="text-sm text-gray-400">Delivered</div>
        )}
      </div>
    </article>
  );
}
