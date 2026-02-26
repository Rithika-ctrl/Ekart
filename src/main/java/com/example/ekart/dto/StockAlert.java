package com.example.ekart.dto;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.Data;

@Data
@Entity
public class StockAlert {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private int id;
	
	@ManyToOne
	private Product product;
	
	@ManyToOne
	private Vendor vendor;
	
	private int stockLevel;
	private LocalDateTime alertTime;
	private boolean emailSent;
	private boolean acknowledged; // vendor has seen the alert
	
	private String message; // alert message details
}
