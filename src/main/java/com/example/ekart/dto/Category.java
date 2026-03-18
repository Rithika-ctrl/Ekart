package com.example.ekart.dto;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Category entity — two-level hierarchy:
 *   Parent category  (e.g. "Food & Beverages")
 *   └── Sub-category (e.g. "Chips", "Chocolates")  ← these are what products belong to
 *
 * Products store the sub-category name in their existing `category` String field.
 * This entity maps sub-category names to parent categories for the UI.
 */
@Entity
@Table(name = "category")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    /** Display name — e.g. "Food & Beverages" (parent) or "Chips" (sub) */
    @Column(nullable = false, length = 100)
    private String name;

    /** Emoji shown on the category card in the UI */
    @Column(length = 10)
    private String emoji = "📦";

    /** Display order — lower = shown first */
    private int displayOrder = 0;

    /** True = this is a top-level parent category.
     *  False = this is a sub-category belonging to a parent. */
    private boolean parent = false;

    /** For sub-categories: which parent they belong to.
     *  Null for parent categories. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parentCategory;

    /** For parent categories: list of their sub-categories */
    @OneToMany(mappedBy = "parentCategory", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @OrderBy("displayOrder ASC")
    private List<Category> subCategories = new ArrayList<>();

    // ── Getters & Setters ─────────────────────────────────────────────────

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
    public boolean isParent() { return parent; }
    public void setParent(boolean parent) { this.parent = parent; }
    public Category getParentCategory() { return parentCategory; }
    public void setParentCategory(Category parentCategory) { this.parentCategory = parentCategory; }
    public List<Category> getSubCategories() { return subCategories; }
    public void setSubCategories(List<Category> subCategories) { this.subCategories = subCategories; }
}