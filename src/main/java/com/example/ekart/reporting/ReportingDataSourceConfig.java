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
 *  Main DB     -> MySQL (ekart / Railway)   — live transactional data
 *  Reporting DB -> H2 file (ekart_reporting_db) — analytics / sales data
 *
 *  The reporting DB is a separate persistence unit.
 *  It is written to only via ReportingService.recordOrder()
 *  and read from by ReportingService analytics methods.
 *  Zero reporting queries hit the main MySQL DB.
 * ============================================================
 */
@Configuration
@EnableJpaRepositories(
    basePackages = "com.example.ekart.reporting",
    entityManagerFactoryRef = "reportingEntityManagerFactory",
    transactionManagerRef = "reportingTransactionManager"
)
public class ReportingDataSourceConfig {

    @Value("${reporting.datasource.url:jdbc:h2:file:./ekart_reporting_db;AUTO_SERVER=TRUE}")
    private String url;

    @Value("${reporting.datasource.username:sa}")
    private String username;

    @Value("${reporting.datasource.password:}")
    private String password;

    @Value("${reporting.datasource.driver-class-name:org.h2.Driver}")
    private String driverClassName;

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
        props.put("hibernate.dialect", "org.hibernate.dialect.H2Dialect");
        props.put("hibernate.hbm2ddl.auto", "update");   // auto-creates sales_record table
        props.put("hibernate.show_sql", "false");
        factory.setJpaPropertyMap(props);

        return factory;
    }

    @Bean(name = "reportingTransactionManager")
    public JpaTransactionManager reportingTransactionManager(
            @Qualifier("reportingEntityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }
}