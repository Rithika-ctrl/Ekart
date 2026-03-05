package com.example.ekart.controller;

public class SearchSuggestionDTO {
    private String productName;
    private String category;
    private String imageLink;
    private Long purchaseCount;

    public SearchSuggestionDTO() {}
    public SearchSuggestionDTO(String productName, String category, String imageLink, Long purchaseCount) {
        this.productName = productName;
        this.category = category;
        this.imageLink = imageLink;
        this.purchaseCount = purchaseCount;
    }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getImageLink() { return imageLink; }
    public void setImageLink(String imageLink) { this.imageLink = imageLink; }
    public Long getPurchaseCount() { return purchaseCount; }
    public void setPurchaseCount(Long purchaseCount) { this.purchaseCount = purchaseCount; }
}