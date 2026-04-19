package com.example.ekart.repository;
import java.util.Optional;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.ekart.dto.SalesReport;
import com.example.ekart.dto.Vendor;

public interface SalesReportRepository extends JpaRepository<SalesReport, Integer> {

	// Get all saved reports for a vendor
	List<SalesReport> findByVendorOrderByReportDateDesc(Vendor vendor);

	// Get reports by type for a vendor (DAILY / WEEKLY / MONTHLY)
	List<SalesReport> findByVendorAndReportTypeOrderByReportDateDesc(Vendor vendor, String reportType);

	// Check if a report already exists for a vendor + type + date
	// (so we don't duplicate on page refresh)
	Optional<SalesReport> findByVendorAndReportTypeAndReportDate(
		Vendor vendor, String reportType, LocalDate reportDate
	);
}
