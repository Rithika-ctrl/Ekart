package com.example.ekart.dto;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Data;

@Data
@Entity
public class Item {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private int id;

	private String name;
	private String description;
	private double price;
	private String category;
	private int quantity;
	private String imageLink;

	// 🔥 Track which product this item came from (for stock alerts)
	private Integer productId; // nullable for backward compatibility

	// 🔥 THIS IS THE MOST IMPORTANT FIX
	@ManyToOne
	@JoinColumn(name = "cart_id")
	private Cart cart;

	// (Getters & setters kept — Lombok already covers them)
}
