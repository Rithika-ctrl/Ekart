# 🔍 EKART Vendor Side - Complete Error Analysis

**Report Generated:** March 31, 2026  
**Analysis Scope:** Frontend & Backend Vendor Features

---

## ✅ SUMMARY

- **Total Issues Found:** 12 critical/major issues
- **Frontend Issues:** 5
- **Backend Issues:** 7
- **Status:** No syntax errors, but functional/integration issues exist

---

## 🚨 CRITICAL ISSUES

### **1. API Endpoint Path Mismatch**
**Severity:** 🔴 CRITICAL  
**Location:** Frontend - [VendorApp.jsx](ekart-frontend/src/pages/VendorApp.jsx#L40)  
**Issue:** Frontend calls `/vendor/*` endpoints but backend endpoints are actually `/api/react/vendor/*`

**Frontend Calls:**
```javascript
api("/vendor/stats")           // Line 40
api("/vendor/products")        // Line 41
api("/vendor/orders")          // Line 42
api("/vendor/stock-alerts")    // Line 43
api("/vendor/profile")         // Line 44
api("/vendor/sales-report")    // Line 48
api("/vendor/orders/{orderId}/mark-packed")  // Line 53
api("/vendor/categories")      // Line 618
api("/vendor/storefront/update")  // Line 950
api("/vendor/profile/update")  // Line 1061
api("/vendor/profile/change-password")  // Line 1065
```

**Backend Actual Endpoints:** `/api/react/vendor/*` (ReactApiController.java, line 2228+)

**Fix Required:**
- Update API base path from `/vendor/` to `/api/react/vendor/`
- OR: Create reverse proxy that maps `/api/flutter/` to `/api/react/`

---

### **2. Missing GST Rate Field Handling in Backend**
**Severity:** 🔴 CRITICAL  
**Location:** Backend - [ReactApiController.java](EKART/src/main/java/com/example/ekart/controller/ReactApiController.java#L2356)  
**Issue:** Frontend sends `gstRate` field but backend `vendorAddProduct` doesn't process it

**Frontend Code (Line 647):**
```javascript
if (form.gstRate !== "") fd.append("gstRate", parseFloat(form.gstRate));
```

**Backend Code (Line 2356-2379):**
```java
@PostMapping("/vendor/products/add")
public ResponseEntity<Map<String, Object>> vendorAddProduct(
    @RequestHeader("X-Vendor-Id") int vendorId, 
    @RequestBody Map<String, Object> body) {
    // ... code ...
    p.setName((String) body.get("name"));
    p.setDescription((String) body.get("description"));
    // ❌ MISSING: gstRate handling
    // p.setGstRate(...) is NOT being called
```

**Fix:**
```java
Object gstVal = body.get("gstRate");
if (gstVal != null && !gstVal.toString().isBlank()) {
    try {
        double gst = Double.parseDouble(gstVal.toString());
        p.setGstRate(gst);
    } catch (NumberFormatException e) { }
}
```

---

### **3. Missing GST Rate in Update Product Endpoint**
**Severity:** 🔴 CRITICAL  
**Location:** Backend - [ReactApiController.java](EKART/src/main/java/com/example/ekart/controller/ReactApiController.java#L2385)  
**Issue:** `vendorUpdateProduct` doesn't handle gstRate updates

**Current Code (Line 2386-2406):**
```java
if (body.containsKey("name"))        p.setName((String) body.get("name"));
if (body.containsKey("description")) p.setDescription((String) body.get("description"));
if (body.containsKey("price"))       p.setPrice(Double.parseDouble(body.get("price").toString()));
// ❌ Missing: if (body.containsKey("gstRate"))
```

**Fix:**
```java
if (body.containsKey("gstRate")) {
    Object gstVal = body.get("gstRate");
    if (gstVal != null && !gstVal.toString().isBlank()) {
        try {
            double gst = Double.parseDouble(gstVal.toString());
            p.setGstRate(gst);
        } catch (NumberFormatException e) { }
    }
}
```

---

### **4. CSV Upload GST Rate Field Not Parsed**
**Severity:** 🔴 CRITICAL  
**Location:** Backend - [ReactApiController.java](EKART/src/main/java/com/example/ekart/controller/ReactApiController.java#L2428)  
**Issue:** `vendorUploadCsv` doesn't extract or set gstRate from CSV

**Current Code (Line 2428-2520):**
```java
String name = getCell(cells, idx.get("name"));
String desc = getCell(cells, idx.get("description"));
String priceStr = getCell(cells, idx.get("price"));
String mrpStr = getCell(cells, idx.get("mrp"));
// ❌ Missing: String gstStr = getCell(cells, idx.get("gstrate"));
```

**Then later:**
```java
p.setMrp(mrp); 
p.setCategory(category);
p.setStock(stock);
// ❌ Missing: p.setGstRate(gst);
```

**Fix:** Add gstRate parsing like mrp:
```java
String gstStr = getCell(cells, idx.get("gstrate"));
Double gst = (gstStr == null || gstStr.isBlank()) ? null : Double.parseDouble(gstStr);
// Then in product creation:
if (gst != null) p.setGstRate(gst);
```

---

### **5. Missing Stock Alerts Endpoint**
**Severity:** 🔴 CRITICAL  
**Location:** Backend - [ReactApiController.java](EKART/src/main/java/com/example/ekart/controller/ReactApiController.java)  
**Issue:** Frontend calls `/vendor/stock-alerts` endpoint but it's **NOT implemented** in backend

**Frontend Call (Line 43):**
```javascript
api("/vendor/stock-alerts")
```

**Backend Search Result:** Line 4715-4754 shows the endpoint BUT it's under `/api/react/vendor/` path

**Available Endpoints:**
- `GET /api/react/vendor/stock-alerts` (Line 4718) ✅ EXISTS
- `POST /api/react/vendor/stock-alerts/{id}/acknowledge` (Line 4754) ✅ EXISTS

**Issue:** Path mismatch (see Issue #1 above)

---

### **6. Missing Vendor Categories Endpoint**
**Severity:** 🟠 MAJOR  
**Location:** Backend - [ReactApiController.java](EKART/src/main/java/com/example/ekart/controller/ReactApiController.java)  
**Issue:** Frontend calls `/vendor/categories` but backend doesn't have this endpoint

**Frontend Call (Line 618):**
```javascript
api("/vendor/categories").then(d => { 
    if (d.success && d.categories) setCategories(d.categories); 
});
```

**Backend:** No endpoint found for retrieving categories for vendor  
**Fix:** Add endpoint:
```java
@GetMapping("/vendor/categories")
public ResponseEntity<Map<String, Object>> getVendorCategories() {
    Map<String, Object> res = new HashMap<>();
    List<Category> categories = categoryRepository.findAll(); // or filtered
    res.put("success", true);
    res.put("categories", categories);
    return ResponseEntity.ok(res);
}
```

---

### **7. File Upload Support Missing in Product Add/Update**
**Severity:** 🟠 MAJOR  
**Location:** Backend - [ReactApiController.java](EKART/src/main/java/com/example/ekart/controller/ReactApiController.java#L2355)  
**Issue:** Frontend sends multipart FormData but backend expects JSON @RequestBody

**Frontend Code (Line 642-653):**
```javascript
const fd = new FormData();
fd.append("image", mainImage);      // File upload
fd.append("extraImages", f);        // Files
fd.append("video", video);          // File
d = await api(`/vendor/products/add`, { method: "POST", body: fd });
```

**Backend Signature (Line 2356-2357):**
```java
@PostMapping("/vendor/products/add")
public ResponseEntity<Map<String, Object>> vendorAddProduct(
    @RequestHeader("X-Vendor-Id") int vendorId, 
    @RequestBody Map<String, Object> body) {  // ❌ @RequestBody for JSON, not multipart!
```

**Fix:** Change to accept multipart:
```java
@PostMapping("/vendor/products/add")
public ResponseEntity<Map<String, Object>> vendorAddProduct(
    @RequestHeader("X-Vendor-Id") int vendorId,
    @RequestParam("name") String name,
    @RequestParam("description") String description,
    @RequestParam("price") double price,
    @RequestParam(required=false) Double mrp,
    @RequestParam("stock") int stock,
    @RequestParam("category") String category,
    @RequestParam(required=false) Integer stockAlertThreshold,
    @RequestParam(required=false) String allowedPinCodes,
    @RequestParam(required=false) Double gstRate,
    @RequestParam(required=false) MultipartFile image,
    @RequestParam(required=false) MultipartFile[] extraImages,
    @RequestParam(required=false) MultipartFile video) {
    // ... process files with CloudinaryHelper
}
```

---

## 🟡 MAJOR ISSUES

### **8. Missing Product Vendor Relationship in Add/Update Endpoints**
**Severity:** 🟠 MAJOR  
**Location:** Backend - [ReactApiController.java](EKART/src/main/java/com/example/ekart/controller/ReactApiController.java#L2365)  
**Issue:** The `vendorAddProduct` endpoint uses `@RequestBody` and expects vendor data from request body, but should extract vendor from header

**Current Implementation:** Products are assigned to vendor but code is inconsistent

**Affected Endpoints:**
- `POST /api/react/vendor/products/add` 
- `PUT /api/react/vendor/products/{id}/update`

---

### **9. Vendor Profile Update Path Issue**
**Severity:** 🟠 MAJOR  
**Location:** Frontend - [VendorApp.jsx](ekart-frontend/src/pages/VendorApp.jsx#L1061)  
**Issue:** Frontend calls `/vendor/profile/update` but backend uses `/api/react/vendor/profile/update`

**Frontend (Line 1061):**
```javascript
const d = await api("/vendor/profile/update", { method: "PUT", body: JSON.stringify(form) });
```

**Backend (Line 4506):**
```java
@PutMapping("/vendor/profile/update")
```

---

### **10. Storefront Update Endpoint Path Issue**
**Severity:** 🟠 MAJOR  
**Location:** Frontend - [VendorApp.jsx](ekart-frontend/src/pages/VendorApp.jsx#L950)  
**Issue:** Frontend calls `/vendor/storefront/update` but backend path is `/api/react/vendor/storefront/update`

**Frontend (Line 950):**
```javascript
const d = await api("/vendor/storefront/update", { method: "PUT", body: JSON.stringify(form) });
```

---

### **11. Stock Alert Acknowledgment Endpoint Not Matching**
**Severity:** 🟠 MAJOR  
**Location:** Frontend - [VendorApp.jsx](ekart-frontend/src/pages/VendorApp.jsx#L1037)  
**Issue:** Path mismatch for acknowledge endpoint

**Frontend (Line 1037):**
```javascript
const d = await api(`/vendor/stock-alerts/${id}/acknowledge`, { method: "POST" });
```

---

### **12. Missing Product Approval Status Display**
**Severity:** 🟠 MAJOR  
**Location:** Frontend - [VendorApp.jsx](ekart-frontend/src/pages/VendorApp.jsx#L1015)  
**Issue:** Table displays `p.approved` but backend might not return this field consistently

**Frontend Code (Line 1015-1018):**
```javascript
<span style={{ ...vs.badge, background: p.approved ? "#22c55e" : "#f59e0b" }}>
    {p.approved ? "Approved" : "Pending"}
</span>
```

**Backend DTO:** [Product.java](EKART/src/main/java/com/example/ekart/dto/Product.java) has `approved` field but needs to verify all API responses include it

---

## 🟢 WARNINGS & MINOR ISSUES

### **13. CSV Sample File Path Issue**
**Severity:** 🟢 LOW  
**Location:** Frontend - [VendorApp.jsx](ekart-frontend/src/pages/VendorApp.jsx#L580)  
**Issue:** References `/sample-product-upload.csv` which may not exist

```javascript
<a href="/sample-product-upload.csv">Download sample CSV</a>
```

**Fix:** Ensure file exists at `src/main/resources/static/sample-product-upload.csv`

---

### **14. Missing Error Handling in File Upload**
**Severity:** 🟢 LOW  
**Location:** Frontend - [VendorApp.jsx](ekart-frontend/src/pages/VendorApp.jsx#L556)  
**Issue:** FileReader error handling could be more robust

```javascript
reader.onerror = (e) => setError('Failed to read file');  // Generic error
```

---

### **15. Copy Vendor ID Button Uses Wrong Field**
**Severity:** 🟢 LOW  
**Location:** Frontend - [VendorApp.jsx](ekart-frontend/src/pages/VendorApp.jsx#L945)  
**Issue:** Should ideally copy `vendorCode` not `id`

```javascript
navigator.clipboard.writeText(String(profile?.id || ""))  // Should be vendorCode
```

---

## 📋 QUICK FIX CHECKLIST

- [ ] **CRITICAL:** Update all frontend API endpoints from `/vendor/` to `/api/react/vendor/`
- [ ] **CRITICAL:** Add `gstRate` field handling in `vendorAddProduct` method
- [ ] **CRITICAL:** Add `gstRate` field handling in `vendorUpdateProduct` method  
- [ ] **CRITICAL:** Add `gstRate` parsing in `vendorUploadCsv` method
- [ ] **CRITICAL:** Implement `/vendor/categories` endpoint
- [ ] **CRITICAL:** Convert product endpoints to accept multipart FormData (image/video uploads)
- [ ] **MAJOR:** Verify vendor profile update endpoint JSON serialization
- [ ] **MAJOR:** Test stock alerts acknowledge endpoint
- [ ] **MAJOR:** Add sample CSV file to static resources
- [ ] **MINOR:** Improve error handling in file uploads
- [ ] **MINOR:** Fix copy vendor ID to use `vendorCode` instead of `id`

---

## 📊 VENDOR FEATURES CHECKLIST

### Frontend Features:
- ✅ Dashboard with stats
- ✅ Products management (add/edit/delete)
- ✅ CSV bulk upload
- ✅ Orders view & mark as packed
- ✅ Sales report (daily/weekly/monthly)
- ✅ Stock alerts
- ✅ Store front customization
- ✅ Vendor profile & security
- ✅ Change password
- ✅ OAuth linking (Google, GitHub, Facebook, Instagram)

### Backend Endpoints Available:
- ✅ `/api/react/vendor/stats` - GET vendor statistics
- ✅ `/api/react/vendor/products` - GET vendor products
- ✅ `/api/react/vendor/orders` - GET vendor orders
- ✅ `/api/react/vendor/orders/{id}/mark-packed` - POST mark order packed
- ✅ `/api/react/vendor/products/add` - POST add product (❌ needs multipart fix)
- ✅ `/api/react/vendor/products/{id}/update` - PUT update product (❌ needs multipart fix)
- ✅ `/api/react/vendor/products/{id}/delete` - DELETE product
- ✅ `/api/react/vendor/products/upload-csv` - POST CSV upload (❌ missing gstRate)
- ✅ `/api/react/vendor/sales-report` - GET sales report
- ✅ `/api/react/vendor/profile` - GET vendor profile
- ✅ `/api/react/vendor/profile/update` - PUT update profile
- ✅ `/api/react/vendor/profile/change-password` - PUT change password
- ✅ `/api/react/vendor/storefront/update` - PUT update storefront
- ✅ `/api/react/vendor/stock-alerts` - GET stock alerts
- ✅ `/api/react/vendor/stock-alerts/{id}/acknowledge` - POST acknowledge alert
- ❌ `/api/react/vendor/categories` - MISSING endpoint

---

## 🎯 TESTING RECOMMENDATIONS

1. **Test API Paths:** Verify all frontend → backend API calls execute correctly
2. **Test File Uploads:** Verify image/video uploads work with Cloudinary
3. **Test GST Handling:** Verify GST rates are saved and retrieved correctly
4. **Test CSV Import:** Try importing CSV with all fields including gstRate
5. **Test Stock Alerts:** Verify alerts trigger when stock falls below threshold
6. **Test OAuth:** Verify OAuth linking works for all 4 providers

