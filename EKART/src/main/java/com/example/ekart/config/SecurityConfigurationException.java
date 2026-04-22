package com.example.ekart.config;

/**
 * Thrown when the application's security filter chain cannot be configured.
 */
public class SecurityConfigurationException extends RuntimeException {

    public SecurityConfigurationException(String message) {
        super(message);
    }

    public SecurityConfigurationException(String message, Throwable cause) {
        super(message, cause);
    }
}