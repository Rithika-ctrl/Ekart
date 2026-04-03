// ========================================================================
// EKART React API Service - Client-side connector
// File: ekart-frontend/src/services/ekartApiService.js
// ========================================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ========================================================================
// CUSTOMER API
// ========================================================================

export const customerAPI = {
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/customers`);
        return response.json();
    },

    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/customers/${id}`);
        return response.json();
    },

    create: async (customerData) => {
        const response = await fetch(`${API_BASE_URL}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData)
        });
        return response.json();
    },

    login: async (email, password) => {
        const customers = await customerAPI.getAll();
        const customer = customers.find(c => c.email === email && c.password === password);
        return customer || null;
    }
};

// ========================================================================
// PRODUCT API
// ========================================================================

export const productAPI = {
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/products`);
        return response.json();
    },

    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/products/${id}`);
        return response.json();
    },

    search: async (query) => {
        const products = await productAPI.getAll();
        return products.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase())
        );
    }
};

// ========================================================================
// CATEGORY API
// ========================================================================

export const categoryAPI = {
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/categories`);
        return response.json();
    },

    getById: async (id) => {
        const response = await fetch(`${API_BASE_URL}/categories/${id}`);
        return response.json();
    },

    getParentCategories: async () => {
        const categories = await categoryAPI.getAll();
        return categories.filter(c => c.parent === true);
    },

    getSubcategories: async (parentId) => {
        const categories = await categoryAPI.getAll();
        return categories.filter(c => c.parent_id === parentId);
    }
};

// ========================================================================
// VENDOR API
// ========================================================================

export const vendorAPI = {
    getAll: async () => {
        const response = await fetch(`${API_BASE_URL}/vendors`);
        return response.json();
    }
};

// ========================================================================
// ORDER API
// ========================================================================

export const orderAPI = {
    getCustomerOrders: async (customerId) => {
        const response = await fetch(`${API_BASE_URL}/orders/customer/${customerId}`);
        return response.json();
    },

    create: async (orderData) => {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        return response.json();
    }
};

// ========================================================================
// CART API
// ========================================================================

export const cartAPI = {
    getItems: async (cartId) => {
        const response = await fetch(`${API_BASE_URL}/cart/${cartId}`);
        return response.json();
    },

    addItem: async (cartData) => {
        const response = await fetch(`${API_BASE_URL}/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cartData)
        });
        return response.json();
    }
};

// ========================================================================
// REVIEW API
// ========================================================================

export const reviewAPI = {
    getProductReviews: async (productId) => {
        const response = await fetch(`${API_BASE_URL}/reviews/${productId}`);
        return response.json();
    },

    addReview: async (reviewData) => {
        const response = await fetch(`${API_BASE_URL}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reviewData)
        });
        return response.json();
    }
};

// ========================================================================
// WISHLIST API
// ========================================================================

export const wishlistAPI = {
    getItems: async (customerId) => {
        const response = await fetch(`${API_BASE_URL}/wishlist/${customerId}`);
        return response.json();
    },

    addItem: async (wishlistData) => {
        const response = await fetch(`${API_BASE_URL}/wishlist/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wishlistData)
        });
        return response.json();
    }
};

// ========================================================================
// TEST CONNECTION
// ========================================================================

export const testConnection = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/test`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Database connection failed:', error);
        return null;
    }
};
