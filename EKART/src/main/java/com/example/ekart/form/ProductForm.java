package com.example.ekart.form;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Form POJO for add-product and update-product endpoints.
 * <p>
 * Replaces the {@code @Entity Product} as a Spring MVC model-attribute parameter,
 * fixing SonarQube java:S4684 (persistent entity used as request body).
 * Only contains fields the vendor is allowed to submit via the HTML form.
 * Sensitive/server-managed fields (approved, vendor, imageLink stored URLs)
 * are intentionally absent.
 */
public class ProductForm {

    /** Populated from the hidden {@code id} field — used only on update. */
    private int id;

    private String name;
    private String description;
    private double price;
    private Double mrp;
    private Double gstRate;
    private String category;
    private int    stock;
    private Integer stockAlertThreshold;
    private String allowedPinCodes;

    // ── Media uploads (transient — never persisted directly) ────────────────
    private MultipartFile       image;
    private List<MultipartFile> extraImages;
    private MultipartFile       video;

    // ── Getters & Setters ───────────────────────────────────────────────────

    public int     getId()                                 { return id; }
    public void    setId(int id)                           { this.id = id; }

    public String  getName()                               { return name; }
    public void    setName(String name)                    { this.name = name; }

    public String  getDescription()                        { return description; }
    public void    setDescription(String description)      { this.description = description; }

    public double  getPrice()                              { return price; }
    public void    setPrice(double price)                  { this.price = price; }

    public Double  getMrp()                                { return mrp; }
    public void    setMrp(Double mrp)                     { this.mrp = mrp; }

    public Double  getGstRate()                            { return gstRate; }
    public void    setGstRate(Double gstRate)              { this.gstRate = gstRate; }

    public String  getCategory()                           { return category; }
    public void    setCategory(String category)            { this.category = category; }

    public int     getStock()                              { return stock; }
    public void    setStock(int stock)                     { this.stock = stock; }

    public Integer getStockAlertThreshold()                { return stockAlertThreshold; }
    public void    setStockAlertThreshold(Integer t)       { this.stockAlertThreshold = t; }

    public String  getAllowedPinCodes()                    { return allowedPinCodes; }
    public void    setAllowedPinCodes(String pins)         { this.allowedPinCodes = pins; }

    public MultipartFile       getImage()                  { return image; }
    public void                setImage(MultipartFile f)   { this.image = f; }

    public List<MultipartFile> getExtraImages()            { return extraImages; }
    public void                setExtraImages(List<MultipartFile> l) { this.extraImages = l; }

    public MultipartFile       getVideo()                  { return video; }
    public void                setVideo(MultipartFile f)   { this.video = f; }
}