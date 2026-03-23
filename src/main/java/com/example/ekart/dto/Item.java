/**
 * File: Item.java
 * Description: DTO for an item within an order or cart with quantity and price.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.dto;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.io.Serializable;

@Entity
public class Item implements Serializable {
	private static final long serialVersionUID = 1L;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private int id;

	private String name;
	private String description;
	/** Line total = unitPrice × quantity. Always equals unitPrice * quantity. */
	private double price;
	/** Unit price at time of adding to cart. Never changes when qty changes. */
	private double unitPrice;
	private String category;
	private int quantity;
	private String imageLink;
	private Integer productId;

	@ManyToOne
	@JoinColumn(name = "cart_id")
	private Cart cart;

	public int getId() { return id; }
	public void setId(int id) { this.id = id; }
	public String getName() { return name; }
	public void setName(String name) { this.name = name; }
	public String getDescription() { return description; }
	public void setDescription(String description) { this.description = description; }
	public double getPrice() { return price; }
	public void setPrice(double price) { this.price = price; }
	public double getUnitPrice() { return unitPrice; }
	public void setUnitPrice(double unitPrice) { this.unitPrice = unitPrice; }
	/** Convenience: always returns unitPrice × quantity as the authoritative line total. */
	public double getLineTotal() { return unitPrice * quantity; }
	public String getCategory() { return category; }
	public void setCategory(String category) { this.category = category; }
	public int getQuantity() { return quantity; }
	public void setQuantity(int quantity) { this.quantity = quantity; }
	public String getImageLink() { return imageLink; }
	public void setImageLink(String imageLink) { this.imageLink = imageLink; }
	public Integer getProductId() { return productId; }
	public void setProductId(Integer productId) { this.productId = productId; }
	public Cart getCart() { return cart; }
	public void setCart(Cart cart) { this.cart = cart; }
}