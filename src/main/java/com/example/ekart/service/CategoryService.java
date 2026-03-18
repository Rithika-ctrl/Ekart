package com.example.ekart.service;

import com.example.ekart.dto.Category;
import com.example.ekart.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    /** All parent categories with their sub-categories eagerly loaded */
    public List<Category> getParentCategories() {
        return categoryRepository.findByParentTrueOrderByDisplayOrderAsc();
    }

    /** All sub-categories (for product add/edit dropdown) */
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