package com.example.ekart.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

/**
 * Loads environment variables from .env file into System properties
 * This allows Spring to use ${ENV_VAR} placeholders in application.properties
 */
@Configuration
public class DotenvConfig {

    @PostConstruct
    public void postConstruct() {
        Dotenv dotenv = Dotenv.configure()
                .ignoreIfMissing()
                .load();

        // Load all .env variables into System properties
        dotenv.entries().forEach(entry -> {
            System.setProperty(entry.getKey(), entry.getValue());
        });

        System.out.println("✅ .env file loaded successfully");
    }
}
