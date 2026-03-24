package com.example.ekart.reporting;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;

import jakarta.persistence.EntityManagerFactory;
import java.util.HashMap;
import java.util.Map;

/**
 * ============================================================
 *  DECOUPLED REPORTING DATABASE CONFIGURATION
 * ============================================================
 *  Main DB     → MySQL (Railway)   — live transactional data
 *  Reporting DB → H2 file          — analytics / sales data only
 *
 *  Design:
 *   - Completely separate persistence unit ("reporting")
 *   - ReportingService is the ONLY class that reads/writes here
 *   - Zero reporting queries hit the main MySQL DB
 *   - Auto-creates sales_record table on first startup
 *   - Safe for Railway deployment: no AUTO_SERVER mode
 * ============================================================
 */
@Configuration
@EnableJpaRepositories(
    basePackages = "com.example.ekart.reporting",
    entityManagerFactoryRef = "reportingEntityManagerFactory",
    transactionManagerRef   = "reportingTransactionManager"
)
public class ReportingDataSourceConfig {

    // ── Read from application.properties (with safe defaults) ─────────────

    @Value("${reporting.datasource.url:jdbc:h2:file:./ekart_reporting_db;DB_CLOSE_ON_EXIT=FALSE;DB_CLOSE_DELAY=-1}")
    private String url;

    @Value("${reporting.datasource.username:sa}")
    private String username;

    @Value("${reporting.datasource.password:}")
    private String password;

    @Value("${reporting.datasource.driver-class-name:org.h2.Driver}")
    private String driverClassName;

    // ── Beans ──────────────────────────────────────────────────────────────

    @Bean(name = "reportingDataSource")
    public DataSource reportingDataSource() {
        return DataSourceBuilder.create()
            .driverClassName(driverClassName)
            .url(url)
            .username(username)
            .password(password)
            .build();
    }

    @Bean(name = "reportingEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean reportingEntityManagerFactory(
            @Qualifier("reportingDataSource") DataSource dataSource) {

        LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(dataSource);
        factory.setPackagesToScan("com.example.ekart.reporting");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        factory.setPersistenceUnitName("reporting");

        Map<String, Object> props = new HashMap<>();
        props.put("hibernate.dialect",            "org.hibernate.dialect.H2Dialect");
        props.put("hibernate.hbm2ddl.auto",       "update");   // auto-creates/updates sales_record table
        props.put("hibernate.show_sql",            "false");
        props.put("hibernate.format_sql",          "false");
        // Connection pool settings — prevents stale connections
        props.put("hibernate.connection.pool_size", "2");
        props.put("hibernate.c3p0.min_size",        "1");
        props.put("hibernate.c3p0.max_size",        "3");
        props.put("hibernate.c3p0.timeout",         "300");
        factory.setJpaPropertyMap(props);

        return factory;
    }

    @Bean(name = "reportingTransactionManager")
    public JpaTransactionManager reportingTransactionManager(
            @Qualifier("reportingEntityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }
}