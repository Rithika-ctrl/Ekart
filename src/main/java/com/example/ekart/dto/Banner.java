package com.example.ekart.dto;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

/**
 * Banner entity for promotional content on the home page.
 * Only banners with isActive=true are displayed to users.
 */
@Data
@Entity
public class Banner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String title;
    
    private String imageUrl;
    
    private String linkUrl;
    
    private boolean isActive = true;

    // Optional: display order for carousel
    private int displayOrder = 0;
}
