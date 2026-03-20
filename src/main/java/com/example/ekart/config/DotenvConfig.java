package com.example.ekart.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * Loads .env file BEFORE Spring resolves @Value annotations.
 * Uses EnvironmentPostProcessor (runs at bootstrap) instead of @PostConstruct
 * (which ran too late — other beans with @Value were already initialised with fallback values).
 *
 * Registration: src/main/resources/META-INF/spring.factories must contain:
 *   org.springframework.boot.env.EnvironmentPostProcessor=com.example.ekart.config.DotenvConfig
 */
public class DotenvConfig implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment,
                                       SpringApplication application) {
        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();

        Map<String, Object> props = new HashMap<>();
        dotenv.entries().forEach(e -> props.put(e.getKey(), e.getValue()));

        // Add with lowest priority so application.properties can still override
        environment.getPropertySources()
                   .addLast(new MapPropertySource("dotenvProperties", props));
    }
}
