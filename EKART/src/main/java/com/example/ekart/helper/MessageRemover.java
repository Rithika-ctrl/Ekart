package com.example.ekart.helper;

import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpSession;

@Component
public class MessageRemover {
    private static final String K_FAILURE = "failure";

    public String remove() {
        try {
            ServletRequestAttributes servletAttributes = (ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes();

            if (servletAttributes == null) return "";

            HttpSession session = servletAttributes.getRequest().getSession(false);

            if (session == null) return "";

            session.removeAttribute("success");
            session.removeAttribute(K_FAILURE);

        } catch (Exception e) {
            // Non-critical session attribute removal — suppressed to prevent page crashes
            if (e.getMessage() != null) { org.slf4j.LoggerFactory.getLogger(MessageRemover.class).trace("Session cleanup error: {}", e.getMessage()); }
        }
        return "";
    }
}