package com.example.ekart.dto;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
<<<<<<< HEAD
import java.io.Serializable;

@Entity
public class Item implements Serializable {
=======
import lombok.Data;
import java.io.Serializable;

@Data
@Entity
public class Item implements Serializable{
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
	private static final long serialVersionUID = 1L;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private int id;

	private String name;
	private String description;
	private double price;
	private String category;
	private int quantity;
	private String imageLink;
<<<<<<< HEAD
	private Integer productId;

=======

	// 🔥 Track which product this item came from (for stock alerts)
	private Integer productId; // nullable for backward compatibility

	// 🔥 THIS IS THE MOST IMPORTANT FIX
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
	@ManyToOne
	@JoinColumn(name = "cart_id")
	private Cart cart;

<<<<<<< HEAD
	public int getId() { return id; }
	public void setId(int id) { this.id = id; }
	public String getName() { return name; }
	public void setName(String name) { this.name = name; }
	public String getDescription() { return description; }
	public void setDescription(String description) { this.description = description; }
	public double getPrice() { return price; }
	public void setPrice(double price) { this.price = price; }
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
=======
	// (Getters & setters kept — Lombok already covers them)
}
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
