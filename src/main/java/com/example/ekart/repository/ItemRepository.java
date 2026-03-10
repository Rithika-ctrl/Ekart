package com.example.ekart.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.ekart.dto.Item;

public interface ItemRepository extends JpaRepository<Item, Integer> {
    // Find cart items by product name (kept for legacy use)
    List<Item> findByName(String name);

    // ✅ FIX: Find cart items by productId — reliable even if product name changes
    List<Item> findByProductId(Integer productId);
}