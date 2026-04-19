package com.example.ekart.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;

@RestController
public class DbHealthController {

    @Autowired
    private DataSource dataSource;

    @GetMapping("/health/db")
    public ResponseEntity<Map<String, Object>> dbHealth() {
        Map<String, Object> res = new HashMap<>();
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("SELECT 1")) {

            boolean ok = rs.next();
            res.put("status", "UP");
            res.put("db", ok ? "OK" : "NO_RESULT");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("status", "DOWN");
            res.put("error", e.getMessage());
            return ResponseEntity.status(503).body(res);
        }
    }
}
