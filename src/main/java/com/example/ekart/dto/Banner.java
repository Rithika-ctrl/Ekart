package com.example.ekart.dto;

<<<<<<< HEAD
import jakarta.persistence.*;

@Entity
public class Banner {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    private String title;
    private String imageUrl;
    private String linkUrl;
    private boolean active = true;
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
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}
=======
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
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
