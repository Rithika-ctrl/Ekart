package com.example.ekart.service;

/**
 * Thrown when the initial admin bootstrap process fails
 * (e.g. database write error during first-run setup).
 */
public class AdminBootstrapException extends RuntimeException {

    public AdminBootstrapException(String message) {
        super(message);
    }

    public AdminBootstrapException(String message, Throwable cause) {
        super(message, cause);
    }
}