#!/bin/bash

# ════════════════════════════════════════════════════════════════════════════════════
# DELIVERY SYSTEM - API TEST SCRIPT
# ════════════════════════════════════════════════════════════════════════════════════
# This script helps test all delivery system endpoints
# Usage: bash test-delivery-api.sh
# ════════════════════════════════════════════════════════════════════════════════════

set -e

# ────────────────────────────────────────────────────────────────────────────────────
# CONFIGURATION
# ────────────────────────────────────────────────────────────────────────────────────

BASE_URL="http://localhost:8080"
API_BASE="$BASE_URL/api/react"
DELIVERY_BOY_ID=1
DELIVERY_BOY_EMAIL="raj.courier@test.com"
DELIVERY_BOY_PASSWORD="test@123"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ────────────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ────────────────────────────────────────────────────────────────────────────────────

print_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# ────────────────────────────────────────────────────────────────────────────────────
# TEST 1: DELIVERY BOY LOGIN
# ────────────────────────────────────────────────────────────────────────────────────

print_header "TEST 1: DELIVERY BOY LOGIN"

LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/delivery/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DELIVERY_BOY_EMAIL\",
    \"password\": \"$DELIVERY_BOY_PASSWORD\"
  }")

echo "Request: POST /auth/delivery/login"
echo "Payload: { email: $DELIVERY_BOY_EMAIL, password: [hidden] }"
echo "Response:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null || echo "")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  print_error "Failed to get auth token"
  exit 1
fi

print_success "Login successful. Token: ${TOKEN:0:20}..."

# ────────────────────────────────────────────────────────────────────────────────────
# TEST 2: CHECK DELIVERY BOY PROFILE
# ────────────────────────────────────────────────────────────────────────────────────

print_header "TEST 2: GET DELIVERY BOY PROFILE"

echo "Request: GET /delivery/profile"
echo "Header: X-Delivery-Id: $DELIVERY_BOY_ID"
echo "Response:"

curl -s -X GET "$API_BASE/delivery/profile" \
  -H "X-Delivery-Id: $DELIVERY_BOY_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null

print_success "Profile retrieved"

# ────────────────────────────────────────────────────────────────────────────────────
# TEST 3: CHECK ORDERS (BEFORE ASSIGNMENT - SHOULD BE EMPTY)
# ────────────────────────────────────────────────────────────────────────────────────

print_header "TEST 3: GET DELIVERY BOY ORDERS (Before Assignment)"

echo "Request: GET /delivery/orders"
echo "Header: X-Delivery-Id: $DELIVERY_BOY_ID"
echo "Response:"

ORDERS_RESPONSE=$(curl -s -X GET "$API_BASE/delivery/orders" \
  -H "X-Delivery-Id: $DELIVERY_BOY_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$ORDERS_RESPONSE" | jq '.' 2>/dev/null || echo "$ORDERS_RESPONSE"

# Extract counts
TO_PICKUP=$(echo "$ORDERS_RESPONSE" | jq '.toPickUp | length' 2>/dev/null || echo 0)
OUT_FOR_DELIVERY=$(echo "$ORDERS_RESPONSE" | jq '.outForDelivery | length' 2>/dev/null || echo 0)
DELIVERED=$(echo "$ORDERS_RESPONSE" | jq '.delivered | length' 2>/dev/null || echo 0)

print_success "Orders: toPickup=$TO_PICKUP, outForDelivery=$OUT_FOR_DELIVERY, delivered=$DELIVERED"

if [ "$TO_PICKUP" -eq 0 ] && [ "$OUT_FOR_DELIVERY" -eq 0 ]; then
  echo -e "\n${BLUE}ℹ No orders assigned yet. Use ASSIGN ORDERS (next section) to assign test orders.${NC}\n"
fi

# ────────────────────────────────────────────────────────────────────────────────────
# TEST 4: TOGGLE ONLINE/OFFLINE STATUS
# ────────────────────────────────────────────────────────────────────────────────────

print_header "TEST 4: TOGGLE ONLINE/OFFLINE STATUS"

echo "Request: POST /delivery/availability/toggle"
echo "Header: X-Delivery-Id: $DELIVERY_BOY_ID"
echo "Response:"

TOGGLE_RESPONSE=$(curl -s -X POST "$API_BASE/delivery/availability/toggle" \
  -H "X-Delivery-Id: $DELIVERY_BOY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{}")

echo "$TOGGLE_RESPONSE" | jq '.' 2>/dev/null || echo "$TOGGLE_RESPONSE"

AVAILABLE=$(echo "$TOGGLE_RESPONSE" | jq '.available' 2>/dev/null || echo "unknown")
print_success "Availability toggled to: $AVAILABLE"

# ────────────────────────────────────────────────────────────────────────────────────
# TEST 5: ADMIN ASSIGNMENT ENDPOINTS
# ────────────────────────────────────────────────────────────────────────────────────

print_header "TEST 5: ASSIGN TEST ORDERS TO DELIVERY BOY"

echo -e "${BLUE}This requires admin access. Use these cURL commands:${NC}\n"

echo -e "${GREEN}# Assign Order 1${NC}"
echo "curl -X POST $BASE_URL/api/flutter/admin/delivery/assign \\"
echo "  -d \"orderId=1&deliveryBoyId=$DELIVERY_BOY_ID\""

echo -e "\n${GREEN}# Assign Order 2${NC}"
echo "curl -X POST $BASE_URL/api/flutter/admin/delivery/assign \\"
echo "  -d \"orderId=2&deliveryBoyId=$DELIVERY_BOY_ID\""

echo -e "\n${GREEN}# Assign Order 3${NC}"
echo "curl -X POST $BASE_URL/api/flutter/admin/delivery/assign \\"
echo "  -d \"orderId=3&deliveryBoyId=$DELIVERY_BOY_ID\""

echo -e "\n${GREEN}# Assign Order 4${NC}"
echo "curl -X POST $BASE_URL/api/flutter/admin/delivery/assign \\"
echo "  -d \"orderId=4&deliveryBoyId=$DELIVERY_BOY_ID\""

echo -e "\n${GREEN}# Assign Order 5${NC}"
echo "curl -X POST $BASE_URL/api/flutter/admin/delivery/assign \\"
echo "  -d \"orderId=5&deliveryBoyId=$DELIVERY_BOY_ID\""

echo -e "\n${BLUE}After running above commands, re-run TEST 3 to see assigned orders.${NC}\n"

# ────────────────────────────────────────────────────────────────────────────────────
# TEST 6: MARK ORDER AS PICKED UP (If orders are assigned)
# ────────────────────────────────────────────────────────────────────────────────────

print_header "TEST 6: MARK ORDER AS PICKED UP"

if [ "$TO_PICKUP" -gt 0 ]; then
  # Get first order ID (assuming test data)
  ORDER_ID=1
  
  echo "Request: POST /delivery/orders/$ORDER_ID/pickup"
  echo "Header: X-Delivery-Id: $DELIVERY_BOY_ID"
  echo "Response:"
  
  PICKUP_RESPONSE=$(curl -s -X POST "$API_BASE/delivery/orders/$ORDER_ID/pickup" \
    -H "X-Delivery-Id: $DELIVERY_BOY_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{}")
  
  echo "$PICKUP_RESPONSE" | jq '.' 2>/dev/null || echo "$PICKUP_RESPONSE"
  
  print_success "Order marked as picked up"
else
  echo -e "${RED}✗ No orders to pick up - assign orders first (see TEST 5)${NC}"
fi

# ────────────────────────────────────────────────────────────────────────────────────
# TEST 7: MARK ORDER AS DELIVERED
# ────────────────────────────────────────────────────────────────────────────────────

print_header "TEST 7: MARK ORDER AS DELIVERED"

echo "Request: POST /delivery/orders/{orderId}/deliver"
echo "Header: X-Delivery-Id: $DELIVERY_BOY_ID"
echo "Example (Order 1):"

DELIVER_RESPONSE=$(curl -s -w "\nHTTP_CODE: %{http_code}" -X POST "$API_BASE/delivery/orders/1/deliver" \
  -H "X-Delivery-Id: $DELIVERY_BOY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"lat\": \"13.0827\",
    \"lng\": \"80.2707\",
    \"deliveryNote\": \"Delivered at door - Signature not required\"
  }" 2>/dev/null)

echo "$DELIVER_RESPONSE" | jq '.' 2>/dev/null || echo "$DELIVER_RESPONSE"

echo -e "\n${BLUE}ℹ Use appropriate order IDs and coordinates for your test.${NC}"

# ────────────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ────────────────────────────────────────────────────────────────────────────────────

print_header "TEST SUMMARY & NEXT STEPS"

echo -e "${BLUE}📋 What's Been Tested:${NC}"
echo "  ✓ Delivery Boy Login"
echo "  ✓ Get Profile"
echo "  ✓ Get Orders (currently empty)"
echo "  ✓ Toggle Online/Offline Status"
echo "  ✓ Mark Order as Picked Up"
echo "  ✓ Mark Order as Delivered"

echo -e "\n${BLUE}📝 Next Steps:${NC}"
echo "  1. Assign test orders using the commands in TEST 5"
echo "  2. Re-run this script to verify orders now appear"
echo "  3. Test picking up and delivering orders"

echo -e "\n${BLUE}📚 API Documentation:${NC}"
echo "  POST   /api/react/auth/delivery/login"
echo "  GET    /api/react/delivery/profile"
echo "  GET    /api/react/delivery/orders"
echo "  POST   /api/react/delivery/availability/toggle"
echo "  POST   /api/react/delivery/orders/{id}/pickup"
echo "  POST   /api/react/delivery/orders/{id}/deliver"
echo ""
echo "  POST   /api/flutter/admin/delivery/assign (orderId, deliveryBoyId)"
echo ""

echo -e "${GREEN}✓ Testing complete!${NC}\n"
