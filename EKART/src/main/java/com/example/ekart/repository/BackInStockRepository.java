package com.example.ekart.repository;

import com.example.ekart.dto.BackInStockSubscription;
import com.example.ekart.dto.Customer;
import com.example.ekart.dto.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BackInStockRepository extends JpaRepository<BackInStockSubscription, Integer> {

    /** All pending (not yet notified) subscriptions for a product — used when restocking */
    List<BackInStockSubscription> findByProductAndNotifiedFalse(Product product);

    /** Check if a specific customer is already subscribed to a product */
    boolean existsByCustomerAndProductAndNotifiedFalse(Customer customer, Product product);

    /** Find a specific subscription (for unsubscribe) */
    Optional<BackInStockSubscription> findByCustomerAndProduct(Customer customer, Product product);

    /** All subscriptions for a customer (for profile/account page) */
    List<BackInStockSubscription> findByCustomerAndNotifiedFalse(Customer customer);

    /** Count pending subscribers for a product — shown to admin/vendor */
    @Query("SELECT COUNT(s) FROM BackInStockSubscription s WHERE s.product = :product AND s.notified = false")
    long countPendingByProduct(@Param("product") Product product);
}