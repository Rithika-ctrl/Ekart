package com.example.ekart.reporting;

import org.springframework.context.annotation.Configuration;

/**
 * ============================================================
 *  DEPRECATED: REPORTING DATABASE CONFIGURATION
 * ============================================================
 *  CONSOLIDATED INTO MAIN DATABASE (April 6, 2026)
 * 
 *  Previously: SalesRecord stored in separate PostgreSQL DB (ekart_reporting)
 *  Now: SalesRecord consolidated into main ekart database
 *  
 *  Benefits:
 *   ✅ Unified queryability - can join with Order, Product, Vendor, Customer
 *   ✅ Simplified deployment - single database to manage
 *   ✅ Better data consistency - no sync issues between DBs
 *   ✅ Proper JPA relationships instead of primitive foreign keys
 *   ✅ Same performance - analytics queries still run efficiently
 * 
 *  MainDataSourceConfig now includes "com.example.ekart.reporting" package
 *  SalesRecordRepository uses main EntityManagerFactory
 * ============================================================
 */
@Configuration(proxyBeanMethods = false)
@Deprecated(since = "2.0", forRemoval = true)
public class ReportingDataSourceConfig {
    // This class is no longer used. All reporting functionality
    // is now integrated into the main database configuration.
}