# Ekart Frontend (React + Vite)

React frontend for the Ekart Spring Boot backend.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Backend
Make sure your Spring Boot backend is running on port 8080.
The Vite dev server proxies /api requests to http://localhost:8080.

## Features

### Customer
- Browse & search products with category filter
- Product detail with reviews + star ratings
- Add to cart, adjust quantities, remove items
- Place orders (COD) with address selection
- Order history with tracking status + cancel
- Wishlist toggle
- Profile: edit name/mobile, manage addresses, change password

### Vendor
- Dashboard with revenue, orders, stock stats
- Full product CRUD (add, edit, delete)
- Order management view
- Stock alert acknowledgement
- Profile management

### Admin
- Platform overview with stats
- Product approval / rejection
- Order status management (all statuses)
- Customer activation/deactivation
- Vendor activation/deactivation

## API Base
All API calls go to: http://localhost:8080/api/flutter/*
