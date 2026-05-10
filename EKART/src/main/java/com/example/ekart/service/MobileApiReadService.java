package com.example.ekart.service;
import java.util.Optional;

import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Order;
import com.example.ekart.dto.Wishlist;
import com.example.ekart.repository.CustomerRepository;
import com.example.ekart.repository.OrderRepository;
import com.example.ekart.repository.WishlistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MobileApiReadService {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final CustomerRepository customerRepository;
    private final WishlistRepository wishlistRepository;
    private final OrderRepository orderRepository;

    public MobileApiReadService(
            CustomerRepository customerRepository,
            WishlistRepository wishlistRepository,
            OrderRepository orderRepository) {
        this.customerRepository = customerRepository;
        this.wishlistRepository = wishlistRepository;
        this.orderRepository = orderRepository;
    }





    @Transactional(readOnly = true)
    public Customer findCustomerWithAddresses(int customerId) {
        return customerRepository.findWithAddressesById(customerId).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Wishlist> findWishlistWithProducts(Customer customer) {
        return wishlistRepository.findByCustomer(customer);
    }

    @Transactional(readOnly = true)
    public List<Order> findOrdersWithItems(Customer customer) {
        return orderRepository.findByCustomer(customer);
    }

    @Transactional(readOnly = true)
    public Optional<Order> findOrderWithItems(int orderId) {
        return orderRepository.findWithItemsById(orderId);
    }
}

