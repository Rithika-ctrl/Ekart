package com.example.ekart.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.ekart.dto.Item;

public interface ItemRepository extends JpaRepository<Item, Integer> {
    // This allows you to find all "Happy Happy" items in all carts
    List<Item> findByName(String name);
}