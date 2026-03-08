package com.example.ekart.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
<<<<<<< HEAD
import jakarta.persistence.*;

@Entity
public class SalesReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;
    @ManyToOne private Vendor vendor;
    private String reportType;
    private LocalDate reportDate;
    private double totalRevenue;
    private int totalOrders;
    private int totalItemsSold;
    private double avgOrderValue;
    private LocalDateTime generatedAt;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public Vendor getVendor() { return vendor; }
    public void setVendor(Vendor vendor) { this.vendor = vendor; }
    public String getReportType() { return reportType; }
    public void setReportType(String reportType) { this.reportType = reportType; }
    public LocalDate getReportDate() { return reportDate; }
    public void setReportDate(LocalDate reportDate) { this.reportDate = reportDate; }
    public double getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(double totalRevenue) { this.totalRevenue = totalRevenue; }
    public int getTotalOrders() { return totalOrders; }
    public void setTotalOrders(int totalOrders) { this.totalOrders = totalOrders; }
    public int getTotalItemsSold() { return totalItemsSold; }
    public void setTotalItemsSold(int totalItemsSold) { this.totalItemsSold = totalItemsSold; }
    public double getAvgOrderValue() { return avgOrderValue; }
    public void setAvgOrderValue(double avgOrderValue) { this.avgOrderValue = avgOrderValue; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt = generatedAt; }
=======

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
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
}