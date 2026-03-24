package com.example.ekart.repository;

import com.example.ekart.dto.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Integer> {

    /** Get all top-level parent categories ordered by displayOrder */
    List<Category> findByParentTrueOrderByDisplayOrderAsc();

    /** Get all sub-categories for a given parent */
    List<Category> findByParentCategoryOrderByDisplayOrderAsc(Category parent);

    /** Find a sub-category by its name (used for product add/edit dropdown) */
    Category findByNameAndParentFalse(String name);
}