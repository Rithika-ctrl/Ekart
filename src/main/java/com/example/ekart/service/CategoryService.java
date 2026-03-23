/**
 * File: CategoryService.java
 * Description: Service for category lookup, caching, and parent/child relationships.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.service;

import com.example.ekart.dto.Category;
import com.example.ekart.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    /** All parent categories with their sub-categories eagerly loaded */
    @Cacheable("categories-parent")
    public List<Category> getParentCategories() {
        return categoryRepository.findByParentTrueOrderByDisplayOrderAsc();
    }

    /** All sub-categories (for product add/edit dropdown) */
    @Cacheable("categories-sub")
    public List<Category> getAllSubCategories() {
        return categoryRepository.findAll().stream()
            .filter(c -> !c.isParent())
            .sorted((a, b) -> {
                // Group by parent first, then by displayOrder
                int parentCompare = Integer.compare(
                    a.getParentCategory() != null ? a.getParentCategory().getId() : 0,
                    b.getParentCategory() != null ? b.getParentCategory().getId() : 0
                );
                return parentCompare != 0 ? parentCompare : Integer.compare(a.getDisplayOrder(), b.getDisplayOrder());
            })
            .collect(java.util.stream.Collectors.toList());
    }
}