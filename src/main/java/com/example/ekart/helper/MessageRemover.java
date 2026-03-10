package com.example.ekart.helper;

import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpSession;

@Component
public class MessageRemover {

    public String remove() {
        try {
            ServletRequestAttributes servletAttributes = (ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes();

            if (servletAttributes == null) return "";

            HttpSession session = servletAttributes.getRequest().getSession(false);

            if (session == null) return "";

            session.removeAttribute("success");
            session.removeAttribute("failure");

        } catch (Exception e) {
            // silently ignore — never let this crash a page
        }
        return "";
    }
}