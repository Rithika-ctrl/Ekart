from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, GradientFill
from openpyxl.utils import get_column_letter

wb = Workbook()

# ─── Color palette ────────────────────────────────────────────────────────────
DARK_HEADER   = "1E2A3A"   # dark navy
YELLOW_HEADER = "D4A017"   # ekart gold
GREEN_DONE    = "1DB882"   # green ✓
RED_MISSING   = "E84C3C"   # red ✗
BLUE_PARTIAL  = "2563EB"   # blue ≈
LIGHT_GRAY    = "F5F5F5"
ALT_ROW       = "F9F9F6"
WHITE         = "FFFFFF"
SECTION_BG    = "EBF4FF"

thin = Side(style="thin", color="CCCCCC")
med  = Side(style="medium", color="AAAAAA")
THIN_BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
MED_BORDER  = Border(left=med,  right=med,  top=med,  bottom=med)

def hdr(ws, cell, val, fg="FFFFFF", bg=DARK_HEADER, bold=True, sz=10, wrap=True, align="center"):
    c = ws[cell]
    c.value = val
    c.font = Font(name="Arial", bold=bold, color=fg, size=sz)
    c.fill = PatternFill("solid", fgColor=bg)
    c.alignment = Alignment(horizontal=align, vertical="center", wrap_text=wrap)
    c.border = THIN_BORDER

def cell(ws, row, col, val, bg=WHITE, bold=False, color="000000", sz=10, wrap=True, align="left"):
    c = ws.cell(row=row, column=col, value=val)
    c.font = Font(name="Arial", bold=bold, color=color, size=sz)
    c.fill = PatternFill("solid", fgColor=bg)
    c.alignment = Alignment(horizontal=align, vertical="center", wrap_text=wrap)
    c.border = THIN_BORDER
    return c

def status_cell(ws, row, col, status, bg):
    symbols = {"✅ Done": GREEN_DONE, "❌ Missing": RED_MISSING, "⚠️ Partial": BLUE_PARTIAL}
    c = cell(ws, row, col, status, bg=bg, bold=True, color=symbols.get(status, "000000"), align="center")
    return c

# ════════════════════════════════════════════════════════════════════════════════
# SHEET 1 — DELIVERY FEATURES MASTER TABLE
# ════════════════════════════════════════════════════════════════════════════════
ws1 = wb.active
ws1.title = "Delivery Features"

# Title row
ws1.merge_cells("A1:H1")
c = ws1["A1"]
c.value = "EKART — Delivery Feature Coverage: HTML vs React"
c.font = Font(name="Arial", bold=True, size=14, color="FFFFFF")
c.fill = PatternFill("solid", fgColor=DARK_HEADER)
c.alignment = Alignment(horizontal="center", vertical="center")
ws1.row_dimensions[1].height = 30

ws1.merge_cells("A2:H2")
c = ws1["A2"]
c.value = "Detailed comparison of every delivery feature — what exists in Thymeleaf HTML and what has been migrated to React"
c.font = Font(name="Arial", size=10, color="666666", italic=True)
c.fill = PatternFill("solid", fgColor="F0F4FF")
c.alignment = Alignment(horizontal="center", vertical="center")
ws1.row_dimensions[2].height = 18

# Column headers
headers = [
    ("A3", "#"),
    ("B3", "Feature / Sub-Feature"),
    ("C3", "Category"),
    ("D3", "In HTML\n(Thymeleaf)"),
    ("E3", "In React\n(Migrated)"),
    ("F3", "HTML Page(s)"),
    ("G3", "React Component / File"),
    ("H3", "Notes / Gap"),
]
ws1.row_dimensions[3].height = 36
for addr, val in headers:
    hdr(ws1, addr, val, bg=YELLOW_HEADER, fg=DARK_HEADER, sz=10)

# Column widths
widths = {"A": 5, "B": 38, "C": 22, "D": 13, "E": 13, "F": 30, "G": 34, "H": 48}
for col, w in widths.items():
    ws1.column_dimensions[col].width = w

# ─── Data rows ────────────────────────────────────────────────────────────────
# Format: (row_num, feature, category, in_html, in_react, html_page, react_file, notes)
DONE     = "✅ Done"
MISSING  = "❌ Missing"
PARTIAL  = "⚠️ Partial"

rows = [
    # ── DELIVERY BOY AUTH ──
    ("─── DELIVERY BOY AUTHENTICATION", "", "", "", "", "", "", "section"),
    (1,  "Delivery Boy Registration Form",        "Auth",   DONE, MISSING, "delivery-register.html",              "—",                                   "HTML-only: name, email, mobile, password, vehicle fields via POST /delivery/register"),
    (2,  "Registration Email OTP Verification",   "Auth",   DONE, MISSING, "delivery-otp.html",                   "—",                                   "6-digit OTP page after registration. No React equivalent; DeliveryApp skips auth — handled by App.jsx JWT flow"),
    (3,  "Delivery Login Page",                   "Auth",   DONE, MISSING, "delivery-login.html",                 "—",                                   "HTML-only. React uses shared AuthPage (JWT). HTML delivery login is a separate standalone form"),
    (4,  "Pending Approval Waiting Screen",       "Auth",   DONE, DONE,    "delivery-pending.html",               "DeliveryApp.jsx",                     "Both show pending state. React shows it inline (guard) inside DeliveryApp when profile.approved=false"),
    (5,  "Logout",                                "Auth",   DONE, DONE,    "delivery-home.html",                  "DeliveryApp.jsx",                     "HTML → /delivery/logout. React → JWT logout() + navigate /auth"),

    # ── DELIVERY BOY DASHBOARD ──
    ("─── DELIVERY BOY DASHBOARD", "", "", "", "", "", "", "section"),
    (6,  "Welcome Banner (Name + Code)",          "Dashboard", DONE, DONE, "delivery-home.html",                  "DeliveryApp.jsx",                     "Both show delivery boy name, code, assigned pin codes"),
    (7,  "Assigned Warehouse Card",               "Dashboard", DONE, DONE, "delivery-home.html",                  "DeliveryApp.jsx",                     "Both show warehouse name, city, state, code; 'No warehouse assigned' fallback"),
    (8,  "Summary Stats (Pickup / OFD / Done)",   "Dashboard", DONE, DONE, "delivery-home.html",                  "DeliveryApp.jsx",                     "3-stat counters: To Pick Up, Out for Delivery, Delivered"),
    (9,  "Online / Offline Availability Toggle",  "Dashboard", MISSING, DONE, "—",                               "DeliveryApp.jsx",                     "React-only feature! HTML page has no availability toggle. Button toggles via POST /delivery/availability/toggle"),
    (10, "Alert / Flash Message Stack",           "Dashboard", DONE, DONE, "delivery-home.html",                  "DeliveryApp.jsx",                     "Both support dismissable alerts. React uses toast instead of server flash"),

    # ── PICKUP WORKFLOW ──
    ("─── ORDER PICKUP WORKFLOW", "", "", "", "", "", "", "section"),
    (11, "To-Pick-Up Orders List",                "Pickup", DONE, DONE,    "delivery-home.html",                  "DeliveryApp.jsx (ToPickUp panel)",    "Lists orders assigned to this delivery boy that are PACKED at warehouse"),
    (12, "Order Detail: ID, Customer, Mobile",    "Pickup", DONE, DONE,    "delivery-home.html",                  "DeliveryApp.jsx",                     "Shows order ID, customer name, mobile number"),
    (13, "Order Detail: Delivery PIN Code",       "Pickup", DONE, DONE,    "delivery-home.html",                  "DeliveryApp.jsx",                     "Shows destination PIN code on order card"),
    (14, "Order Detail: Items List",              "Pickup", DONE, DONE,    "delivery-home.html",                  "DeliveryApp.jsx",                     "Shows item name × quantity for each item in order"),
    (15, "Order Detail: Total Amount",            "Pickup", DONE, DONE,    "delivery-home.html",                  "DeliveryApp.jsx",                     "Shows formatted ₹ amount of order"),
    (16, "'Picked Up' Button (Mark Pickup)",      "Pickup", DONE, DONE,    "delivery-home.html (confirmPickup())", "DeliveryApp.jsx (markPickedUp())",  "POST /delivery/order/{id}/pickup. Moves order to Out for Delivery list"),

    # ── OUT FOR DELIVERY ──
    ("─── OUT FOR DELIVERY WORKFLOW", "", "", "", "", "", "", "section"),
    (17, "Out-for-Delivery Orders List",          "OFD",   DONE, DONE,     "delivery-home.html",                  "DeliveryApp.jsx (OutNow panel)",      "Lists orders currently in OUT_FOR_DELIVERY status"),
    (18, "PIN Code Highlight on Active Orders",   "OFD",   DONE, DONE,     "delivery-home.html (yellow highlight)","DeliveryApp.jsx (.dk-order-pin.highlight)", "PIN shown in accent color for active delivery orders"),
    (19, "OTP Input Field (6-digit)",             "OFD",   DONE, DONE,     "delivery-home.html (otp-input)",      "DeliveryApp.jsx (otpMap state)",      "Numeric input; HTML uses per-order id='otp-{id}'; React uses otpMap[orderId]"),
    (20, "'Deliver' Button + OTP Validation",     "OFD",   DONE, DONE,     "delivery-home.html (confirmDeliver())", "DeliveryApp.jsx (confirmDelivery())", "POST /delivery/order/{id}/deliver with OTP FormData; validates 6-digit before sending"),

    # ── DELIVERED HISTORY ──
    ("─── DELIVERED ORDERS HISTORY", "", "", "", "", "", "", "section"),
    (21, "Delivered Orders List (Today)",         "History", DONE, DONE,   "delivery-home.html",                  "DeliveryApp.jsx (Delivered panel)",   "Both show completed deliveries with dimmed/opacity styling"),
    (22, "Delivered Order Detail",                "History", DONE, DONE,   "delivery-home.html",                  "DeliveryApp.jsx",                     "Shows order ID, customer name, items, amount for delivered orders"),

    # ── WAREHOUSE TRANSFER ──
    ("─── WAREHOUSE TRANSFER REQUEST", "", "", "", "", "", "", "section"),
    (23, "Request Warehouse Transfer Button",     "Warehouse", DONE, DONE,  "delivery-home.html (openChangeModal())","DeliveryApp.jsx (openTransferModal())", "Opens modal if no pending transfer request"),
    (24, "Transfer Modal: Select Warehouse",      "Warehouse", DONE, DONE,  "delivery-home.html (changeModal)",    "DeliveryApp.jsx (transferModal)",     "Dropdown of all warehouses, excludes current one"),
    (25, "Transfer Modal: Reason Field",          "Warehouse", DONE, DONE,  "delivery-home.html",                  "DeliveryApp.jsx",                     "Optional textarea for transfer reason"),
    (26, "Submit Transfer Request",               "Warehouse", DONE, DONE,  "delivery-home.html",                  "DeliveryApp.jsx (submitTransfer())",  "POST /delivery/warehouse-change/request"),
    (27, "Pending Transfer Badge (status)",       "Warehouse", DONE, DONE,  "delivery-home.html (pending badge)",  "DeliveryApp.jsx (pendingTransfer)",   "Shows 'Transfer to X — Pending' badge when request exists; hides transfer button"),

    # ── ADMIN: DELIVERY MANAGEMENT ──
    ("─── ADMIN — DELIVERY BOY MANAGEMENT", "", "", "", "", "", "", "section"),
    (28, "Admin Delivery Management Page",        "Admin", DONE, DONE,      "admin-delivery-management.html",      "AdminApp.jsx (DeliveryAdmin component)", "Full delivery management section for admin"),
    (29, "Pending Delivery Boy Approvals List",   "Admin", DONE, DONE,      "admin-delivery-management.html",      "AdminApp.jsx",                        "Lists self-registered, OTP-verified delivery boys awaiting approval"),
    (30, "Assign Warehouse to Delivery Boy",      "Admin", DONE, DONE,      "admin-delivery-management.html",      "AdminApp.jsx (approvalWh state)",     "Dropdown to assign warehouse before approving"),
    (31, "Assign Pin Codes to Delivery Boy",      "Admin", DONE, DONE,      "admin-delivery-management.html",      "AdminApp.jsx (approvalPins state)",   "Text input for comma-separated pin codes this delivery boy covers"),
    (32, "Approve Delivery Boy",                  "Admin", DONE, DONE,      "admin-delivery-management.html (approveDB())", "AdminApp.jsx (approveDelivery())", "POST /admin/delivery/boy/approve (HTML) | /admin/delivery-boys/{id}/approve (React)"),
    (33, "Reject Delivery Boy",                   "Admin", DONE, DONE,      "admin-delivery-management.html (rejectDB())", "AdminApp.jsx (rejectDelivery())",  "Prompt for rejection reason; emails delivery boy"),
    (34, "Warehouse Transfer Requests Table",     "Admin", DONE, DONE,      "admin-delivery-management.html",      "AdminApp.jsx",                        "Shows delivery boy, current warehouse → requested warehouse, reason, date"),
    (35, "Approve Warehouse Transfer",            "Admin", DONE, DONE,      "admin-delivery-management.html",      "AdminApp.jsx (approveTransfer())",    "Optional note prompt, then POST approve"),
    (36, "Reject Warehouse Transfer",             "Admin", DONE, DONE,      "admin-delivery-management.html",      "AdminApp.jsx (rejectTransfer())",     "Reason prompt, then POST reject"),

    # ── ADMIN: ORDER ASSIGNMENT ──
    ("─── ADMIN — ORDER → DELIVERY BOY ASSIGNMENT", "", "", "", "", "", "", "section"),
    (37, "Packed Orders — Assign Delivery Boy",   "Admin", DONE, DONE,      "admin-delivery-management.html",      "AdminApp.jsx",                        "Table of PACKED orders; admin picks eligible delivery boy per order"),
    (38, "Eligible Delivery Boys Dropdown",       "Admin", DONE, DONE,      "admin-delivery-management.html",      "AdminApp.jsx (eligibleMap)",          "Fetches /admin/delivery/boys/for-order/{id}; filtered by PIN code; shows 🟢/🔴 availability"),
    (39, "Assign Delivery Boy Action",            "Admin", DONE, DONE,      "admin-delivery-management.html (assignDeliveryBoy())", "AdminApp.jsx (assignDeliveryBoy())", "POST /admin/delivery/assign with orderId + deliveryBoyId"),
    (40, "Shipped Orders View",                   "Admin", DONE, DONE,      "admin-delivery-management.html",      "AdminApp.jsx (shippedOrders)",        "Table of SHIPPED orders with assigned delivery boy name"),
    (41, "Out for Delivery Orders View",          "Admin", DONE, DONE,      "admin-delivery-management.html",      "AdminApp.jsx (outOrders)",            "Table of OUT_FOR_DELIVERY orders with delivery boy name"),

    # ── ADMIN: WAREHOUSE MGMT ──
    ("─── ADMIN — WAREHOUSE MANAGEMENT", "", "", "", "", "", "", "section"),
    (42, "Warehouse List / Management Page",      "Warehouse", DONE, DONE,  "admin-warehouse.html",                "AdminApp.jsx (WarehouseAdmin)",       "Manage warehouses: list, add new"),
    (43, "Add New Warehouse",                     "Warehouse", DONE, DONE,  "admin-warehouse.html",                "AdminApp.jsx",                        "POST /admin/delivery/warehouse — name, city, state, pin codes, code fields"),
    (44, "Link to Warehouse Management",          "Warehouse", DONE, DONE,  "admin-delivery-management.html",      "AdminApp.jsx",                        "Button/link in delivery page to navigate to warehouse section"),

    # ── CUSTOMER TRACKING ──
    ("─── CUSTOMER — ORDER TRACKING", "", "", "", "", "", "", "section"),
    (45, "Track Orders Page (All Active Orders)", "Customer", DONE, DONE,   "track-orders.html",                   "CustomerApp.jsx (TrackOrdersPage)",   "Lists active orders with status pipeline, progress indicators"),
    (46, "Order Status Pipeline (5 steps)",       "Customer", DONE, DONE,   "track-orders.html",                   "CustomerApp.jsx",                     "PROCESSING → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED"),
    (47, "Progress Bar per Order",                "Customer", MISSING, DONE,"—",                                   "CustomerApp.jsx (PROGRESS map)",      "React-only: animated gradient progress bar with % complete. HTML uses step dots only"),
    (48, "Single Order Deep-Track Page",          "Customer", DONE, DONE,   "track-single-order.html",             "CustomerApp.jsx (TrackSingleOrderPage)", "Detailed view: pipeline, shipment info, items, estimated delivery"),
    (49, "Live Tracking History (Events from DB)","Customer", MISSING, DONE,"—",                                   "CustomerApp.jsx",                     "React-only: fetches /api/react/orders/{id}/track for real timestamped tracking events with location"),
    (50, "Estimated Delivery Date Display",       "Customer", DONE, DONE,   "track-single-order.html",             "CustomerApp.jsx",                     "Both show estimated delivery date from server"),
    (51, "Current City / Location Display",       "Customer", PARTIAL, DONE,"track-orders.html (city fallback)",   "CustomerApp.jsx (currentCity)",       "React fetches live currentCity from tracking API. HTML shows currentCity only if set on order"),
    (52, "CANCELLED / REFUNDED Status Banners",   "Customer", DONE, DONE,   "track-single-order.html, track-orders.html", "CustomerApp.jsx",            "Both handle terminal states with special banners/styling"),
    (53, "Tracking History Event Log",            "Customer", MISSING, DONE,"—",                                   "CustomerApp.jsx (history events)",    "React-only: timestamped event timeline (status, description, location, timestamp) from DB"),

    # ── CUSTOMER ORDER MANAGEMENT ──
    ("─── CUSTOMER — ORDER MANAGEMENT", "", "", "", "", "", "", "section"),
    (54, "Order History / My Orders Page",        "Customer", DONE, DONE,   "order-history.html (HTML) / track-orders.html", "CustomerApp.jsx (OrdersPage)", "Both show full order history with status badges"),
    (55, "Order Status Badges (color coded)",     "Customer", DONE, DONE,   "order-history.html",                  "CustomerApp.jsx",                     "Color-coded: PLACED, CONFIRMED, SHIPPED, OFD, DELIVERED, CANCELLED"),
    (56, "Cancel Order Button",                   "Customer", DONE, DONE,   "order-history.html (view-orders.html)","CustomerApp.jsx (cancelOrder())",    "Shown for PLACED/CONFIRMED/SHIPPED/OFD; hidden for DELIVERED/CANCELLED"),
    (57, "Reorder Button",                        "Customer", DONE, DONE,   "track-orders.html (quickReorder())",   "CustomerApp.jsx (reorderItems())",   "Shown for DELIVERED orders; checks stock before reordering"),
    (58, "Reorder Stock Check Modal",             "Customer", MISSING, DONE,"—",                                   "CustomerApp.jsx (ReorderStockModal)", "React-only: shows which items are out of stock before confirming reorder"),
    (59, "Refund Report Button",                  "Customer", DONE, DONE,   "track-orders.html, order-history.html","CustomerApp.jsx",                    "Links to refund report for non-cancelled/refunded orders"),
    (60, "Delivery Charge Display",               "Customer", DONE, DONE,   "order-history.html",                  "CustomerApp.jsx",                     "Shows delivery charge if > 0"),
    (61, "Delivery Time / Speed Option",          "Customer", DONE, DONE,   "order-history.html",                  "CustomerApp.jsx (PaymentPage)",       "STANDARD / EXPRESS delivery time selection at checkout"),

    # ── CUSTOMER DELIVERY PIN ──
    ("─── CUSTOMER — DELIVERY PIN & LOCATION", "", "", "", "", "", "", "section"),
    (62, "Delivery PIN Entry (Sticky Bar)",       "Customer", MISSING, DONE,"—",                                   "CustomerApp.jsx (PinBar component)",  "React-only: sticky PIN code bar at top; filters products by serviceability"),
    (63, "PIN-based Product Serviceability Check","Customer", MISSING, DONE,"—",                                   "CustomerApp.jsx (isPinAllowed())",    "React-only: checks product.deliveryPinCodes before allowing add-to-cart"),
    (64, "PIN Restriction Warning at Checkout",   "Customer", MISSING, DONE,"—",                                   "CustomerApp.jsx (placeOrder())",      "React-only: blocks order if items can't be delivered to selected address PIN"),
    (65, "Delivery Address PIN Extraction",       "Customer", MISSING, DONE,"—",                                   "CustomerApp.jsx",                     "React auto-extracts PIN from selected address.postalCode for validation"),

    # ── DELIVERY OTP (CUSTOMER SIDE) ──
    ("─── CUSTOMER — DELIVERY OTP", "", "", "", "", "", "", "section"),
    (66, "Delivery OTP Email to Customer",        "OTP",    DONE, DONE,     "delivery-otp-email.html (email template)", "Backend (service layer)",        "Email sent when order marked OUT_FOR_DELIVERY with 6-digit OTP for delivery verification"),
    (67, "OTP Display in Order Page",             "OTP",    MISSING, MISSING,"—",                                   "—",                                   "OTP is emailed only; neither HTML nor React shows it on the order page"),
    (68, "OTP Verification (Delivery Boy side)",  "OTP",    DONE, DONE,     "delivery-home.html",                   "DeliveryApp.jsx",                     "Delivery boy enters customer OTP to confirm delivery"),

    # ── NOTIFICATION EMAILS ──
    ("─── DELIVERY EMAIL NOTIFICATIONS", "", "", "", "", "", "", "section"),
    (69, "Order Shipped Email",                   "Email",  DONE, DONE,     "shipped-email.html",                   "Backend (CartOrderApiController)",    "Sent when status → SHIPPED"),
    (70, "Out for Delivery Email",                "Email",  DONE, DONE,     "delivery-otp-email.html",              "Backend",                             "Sent when delivery boy picks up; includes OTP"),
    (71, "Order Delivered Email",                 "Email",  DONE, DONE,     "delivered-email.html",                 "Backend",                             "Sent when OTP-confirmed delivery"),
    (72, "Delivery Boy Approval Email",           "Email",  DONE, DONE,     "(service layer)",                      "Backend",                             "Sent to delivery boy when admin approves/rejects their application"),

    # ── ADMIN ORDER STATUS MGMT ──
    ("─── ADMIN — ORDER STATUS MANAGEMENT", "", "", "", "", "", "", "section"),
    (73, "Admin View Orders (All Statuses)",      "Admin",  DONE, DONE,     "view-orders.html",                     "AdminApp.jsx (OrdersAdmin)",          "Admin sees all orders, can filter by status"),
    (74, "Order Status Dropdown (Admin Update)",  "Admin",  DONE, DONE,     "view-orders.html",                     "AdminApp.jsx",                        "Admin can manually update any order status"),
    (75, "Status Filter Buttons",                 "Admin",  DONE, DONE,     "view-orders.html",                     "AdminApp.jsx",                        "Filter by PLACED, CONFIRMED, SHIPPED, OFD, DELIVERED, CANCELLED"),
    (76, "Status Count Summary",                  "Admin",  DONE, DONE,     "view-orders.html",                     "AdminApp.jsx (statusCounts)",         "Bar/count of orders by trackingStatus"),
]

row = 4
for item in rows:
    if len(item) == 8 and item[-1] == "section":
        ws1.merge_cells(f"A{row}:H{row}")
        c = ws1.cell(row=row, column=1, value=item[0])
        c.font = Font(name="Arial", bold=True, size=10, color=DARK_HEADER)
        c.fill = PatternFill("solid", fgColor="D6E4F0")
        c.alignment = Alignment(horizontal="left", vertical="center")
        c.border = MED_BORDER
        ws1.row_dimensions[row].height = 20
        row += 1
        continue

    num, feat, cat, in_html, in_react, html_page, react_file, notes = item
    bg = ALT_ROW if row % 2 == 0 else WHITE

    cell(ws1, row, 1, num, bg=bg, align="center", bold=False, color="888888")
    cell(ws1, row, 2, feat, bg=bg, bold=True)
    
    # Category badge colors
    cat_colors = {
        "Auth": "FFF3CD", "Dashboard": "E8F4FD", "Pickup": "FFF8E1",
        "OFD": "E8F9F2", "History": "F3E8FF", "Warehouse": "EBF5FB",
        "Admin": "FDE8E8", "Customer": "E8F4FD", "OTP": "FFF3CD",
        "Email": "F0FFF4"
    }
    cat_bg = cat_colors.get(cat, "F5F5F5")
    cell(ws1, row, 3, cat, bg=cat_bg, align="center")

    # Status cells
    status_colors = {
        DONE: "E8FBF2",
        MISSING: "FDE8E8",
        PARTIAL: "EBF5FF"
    }
    s4 = ws1.cell(row=row, column=4, value=in_html)
    icon_colors = {DONE: GREEN_DONE, MISSING: RED_MISSING, PARTIAL: BLUE_PARTIAL}
    s4.font = Font(name="Arial", bold=True, color=icon_colors.get(in_html, "000000"), size=10)
    s4.fill = PatternFill("solid", fgColor=status_colors.get(in_html, WHITE))
    s4.alignment = Alignment(horizontal="center", vertical="center")
    s4.border = THIN_BORDER

    s5 = ws1.cell(row=row, column=5, value=in_react)
    s5.font = Font(name="Arial", bold=True, color=icon_colors.get(in_react, "000000"), size=10)
    s5.fill = PatternFill("solid", fgColor=status_colors.get(in_react, WHITE))
    s5.alignment = Alignment(horizontal="center", vertical="center")
    s5.border = THIN_BORDER

    cell(ws1, row, 6, html_page, bg=bg, color="444444", sz=9)
    cell(ws1, row, 7, react_file, bg=bg, color="2563EB", sz=9)
    cell(ws1, row, 8, notes, bg=bg, color="555555", sz=9)
    ws1.row_dimensions[row].height = 42
    row += 1

# ════════════════════════════════════════════════════════════════════════════════
# SHEET 2 — SUMMARY / GAPS
# ════════════════════════════════════════════════════════════════════════════════
ws2 = wb.create_sheet("Migration Summary")

ws2.merge_cells("A1:F1")
c = ws2["A1"]
c.value = "EKART Delivery — React Migration Summary & Gap Analysis"
c.font = Font(name="Arial", bold=True, size=14, color="FFFFFF")
c.fill = PatternFill("solid", fgColor=DARK_HEADER)
c.alignment = Alignment(horizontal="center", vertical="center")
ws2.row_dimensions[1].height = 30

# ── Stats block ──
stats_data = [
    ("Total Delivery Features Tracked", 76),
    ("✅ In HTML (Thymeleaf)", 64),
    ("✅ In React (Migrated/Implemented)", 65),
    ("❌ In HTML but NOT in React", 4),
    ("✅ In React but NOT in HTML (React-Only / New)", 10),
    ("⚠️ Partial in HTML, Full in React", 1),
    ("Migration Coverage %", "=C5/C7*100"),
]
ws2.row_dimensions[2].height = 8

hdr(ws2, "B3", "Metric", bg=YELLOW_HEADER, fg=DARK_HEADER)
hdr(ws2, "C3", "Count", bg=YELLOW_HEADER, fg=DARK_HEADER)
ws2.column_dimensions["A"].width = 3
ws2.column_dimensions["B"].width = 46
ws2.column_dimensions["C"].width = 18
ws2.column_dimensions["D"].width = 3
ws2.column_dimensions["E"].width = 40
ws2.column_dimensions["F"].width = 3

for i, (label, val) in enumerate(stats_data, start=4):
    bg = ALT_ROW if i % 2 == 0 else WHITE
    c = ws2.cell(row=i, column=2, value=label)
    c.font = Font(name="Arial", size=11, bold=True if i == 4 else False)
    c.fill = PatternFill("solid", fgColor=bg)
    c.alignment = Alignment(vertical="center")
    c.border = THIN_BORDER
    if isinstance(val, str):
        cv = ws2.cell(row=i, column=3, value=val)
    else:
        cv = ws2.cell(row=i, column=3, value=val)
    cv.font = Font(name="Arial", size=11, bold=True, color=DARK_HEADER)
    cv.fill = PatternFill("solid", fgColor=bg)
    cv.alignment = Alignment(horizontal="center", vertical="center")
    cv.border = THIN_BORDER
    ws2.row_dimensions[i].height = 22

ws2["C10"].number_format = "0.0\"%\""

# ── GAPS section ──
ws2.row_dimensions[12].height = 8
hdr(ws2, "B13", "❌ Missing in React — Features only in HTML (Need Migration)", bg=RED_MISSING, fg="FFFFFF", sz=11)
ws2.merge_cells("B13:C13")
ws2.row_dimensions[13].height = 24

missing_in_react = [
    ("Delivery Boy Registration Form (HTML-only)",      "/delivery/register → delivery-register.html",      "Create a React registration page inside AuthPage or DeliveryApp"),
    ("Email OTP Verification for Delivery Boy",         "/delivery/otp/{id} → delivery-otp.html",           "Build React OTP verification step after delivery registration"),
    ("Delivery Boy Login Page (standalone HTML form)",  "/delivery/login → delivery-login.html",             "React AuthPage already has JWT login; ensure routing for delivery role"),
]

hdr(ws2, "B14", "Feature", bg="F5C6CB", fg=DARK_HEADER, sz=10)
hdr(ws2, "C14", "HTML Source", bg="F5C6CB", fg=DARK_HEADER, sz=10)
hdr(ws2, "E14", "Recommended Action", bg="F5C6CB", fg=DARK_HEADER, sz=10)
ws2.merge_cells("E14:F14")
ws2.column_dimensions["E"].width = 55

for i, (feat, src, action) in enumerate(missing_in_react, start=15):
    bg = "FFF5F5"
    for col, val in [(2, feat), (3, src), (5, action)]:
        c = ws2.cell(row=i, column=col, value=val)
        c.font = Font(name="Arial", size=10)
        c.fill = PatternFill("solid", fgColor=bg)
        c.alignment = Alignment(vertical="center", wrap_text=True)
        c.border = THIN_BORDER
    ws2.row_dimensions[i].height = 32

# ── React-only features ──
ws2.row_dimensions[19].height = 8
hdr(ws2, "B20", "🚀 React-Only Features (New Capabilities — NOT in HTML)", bg=GREEN_DONE, fg="FFFFFF", sz=11)
ws2.merge_cells("B20:E20")
ws2.row_dimensions[20].height = 24

react_only = [
    ("Online/Offline Availability Toggle",         "DeliveryApp.jsx",               "Delivery boy can toggle availability; admin sees 🟢/🔴"),
    ("Live Tracking API + Event History",          "CustomerApp.jsx (TrackSingleOrderPage)", "Fetches /api/react/orders/{id}/track for real-time events with timestamp + location"),
    ("Progress Bar on Track Orders",               "CustomerApp.jsx (TrackOrdersPage)","Animated gradient progress bar showing % complete"),
    ("Reorder Stock Check Modal",                  "CustomerApp.jsx",               "Pre-reorder modal shows which items are out of stock"),
    ("Delivery PIN Sticky Bar",                    "CustomerApp.jsx (PinBar)",      "Sticky top bar for customer to enter/change delivery PIN"),
    ("PIN-based Product Serviceability Filter",    "CustomerApp.jsx (isPinAllowed)","Hides/warns about products not deliverable to PIN"),
    ("PIN Restriction Block at Checkout",          "CustomerApp.jsx (placeOrder())",  "Prevents order placement if items can't reach selected address PIN"),
    ("Delivery Address PIN Auto-extraction",       "CustomerApp.jsx",               "Reads postalCode from address object for PIN validation"),
    ("Admin: Delivery Boy Count Badge on Tab",     "AdminApp.jsx",                  "Badge shows pending approvals count on Delivery nav tab"),
    ("Admin: Order Status Filter by TrackStatus",  "AdminApp.jsx (OrdersAdmin)",    "Filter buttons for each tracking status with live counts"),
]

hdr(ws2, "B21", "Feature", bg="C3E6CB", fg=DARK_HEADER, sz=10)
hdr(ws2, "C21", "React Component", bg="C3E6CB", fg=DARK_HEADER, sz=10)
hdr(ws2, "E21", "Description", bg="C3E6CB", fg=DARK_HEADER, sz=10)
ws2.merge_cells("E21:F21")

for i, (feat, comp, desc) in enumerate(react_only, start=22):
    bg = "F0FFF4" if i % 2 == 0 else "E8FBF2"
    for col, val in [(2, feat), (3, comp), (5, desc)]:
        c = ws2.cell(row=i, column=col, value=val)
        c.font = Font(name="Arial", size=10)
        c.fill = PatternFill("solid", fgColor=bg)
        c.alignment = Alignment(vertical="center", wrap_text=True)
        c.border = THIN_BORDER
    ws2.row_dimensions[i].height = 32

# ─── freeze panes ─────────────────────────────────────────────────────────────
ws1.freeze_panes = "A4"
ws2.freeze_panes = "B4"

wb.save("EKART_Delivery_Features_Report.xlsx")
print("Done!")
