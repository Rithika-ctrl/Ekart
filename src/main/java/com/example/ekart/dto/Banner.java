package com.example.ekart.dto;

import jakarta.persistence.*;

@Entity
public class Banner {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String linkUrl;

    // Master active toggle — if false, banner is hidden everywhere
    private boolean active = true;

    // Show on the pre-login landing page (home.html)
    @Column(columnDefinition = "boolean default true")
    private boolean showOnHome = true;

    // Show on the customer home page after login (customer-home.html)
    @Column(columnDefinition = "boolean default true")
    private boolean showOnCustomerHome = true;

    private int displayOrder = 0;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String linkUrl) { this.linkUrl = linkUrl; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isShowOnHome() { return showOnHome; }
    public void setShowOnHome(boolean showOnHome) { this.showOnHome = showOnHome; }
    public boolean isShowOnCustomerHome() { return showOnCustomerHome; }
    public void setShowOnCustomerHome(boolean showOnCustomerHome) { this.showOnCustomerHome = showOnCustomerHome; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}