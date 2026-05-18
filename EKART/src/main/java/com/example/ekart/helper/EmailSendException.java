package com.example.ekart.helper;

/**
 * Thrown when an email (OTP, order confirmation, etc.) cannot be sent.
 * Replaces generic {@link RuntimeException} throws in {@link EmailSender}
 * to satisfy java:S112 (no generic exception types).
 */
public class EmailSendException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public EmailSendException(String message) {
        super(message);
    }

    public EmailSendException(String message, Throwable cause) {
        super(message, cause);
    }
}