package com.example.ekart.service;

import com.example.ekart.dto.Category;
import com.example.ekart.repository.CategoryRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryService {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final CategoryRepository categoryRepository;

    public CategoryService(
            CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }



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
            .toList();
    }
}
