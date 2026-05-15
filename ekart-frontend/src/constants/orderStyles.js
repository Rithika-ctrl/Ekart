export const ORDER_STATUS_COLORS = {
  PLACED: "#d97706",
  CONFIRMED: "#6366f1",
  PROCESSING: "#d97706",
  PACKED: "#6366f1",
  SHIPPED: "#3b82f6",
  OUT_FOR_DELIVERY: "#8b5cf6",
  DELIVERED: "#16a34a",
  REFUNDED: "#0891b2",
  CANCELLED: "#dc2626",
};

export const PAYMENT_STATUS_COLORS = {
  PENDING: "#9ca3af",
  COD_COLLECTED: "#f59e0b",
  PAID: "#10b981",
};

export const REFUND_STATUS_STYLES = {
  PENDING: { text: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", label: "Pending Review" },
  APPROVED: { text: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", label: "Approved" },
  REJECTED: { text: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", label: "Rejected" },
};
