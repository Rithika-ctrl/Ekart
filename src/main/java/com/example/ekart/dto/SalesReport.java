package com.example.ekart.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.Data;

@Data
@Entity
public class SalesReport {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private int id;

	@ManyToOne
	private Vendor vendor;

	// Report type: "DAILY", "WEEKLY", "MONTHLY"
	private String reportType;

	// The date this report covers (start of day/week/month)
	private LocalDate reportDate;

	// Aggregated values
	private double totalRevenue;
	private int totalOrders;
	private int totalItemsSold;
	private double avgOrderValue;

	// When this report record was generated
	private LocalDateTime generatedAt;
}