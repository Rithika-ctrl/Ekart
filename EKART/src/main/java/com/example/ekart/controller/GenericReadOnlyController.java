package com.example.ekart.controller;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class GenericReadOnlyController {

    private final Map<String, JpaRepository<?, ?>> repositories;

    public GenericReadOnlyController(Map<String, JpaRepository<?, ?>> repositories) {
        this.repositories = repositories;
    }

    private JpaRepository<?, ?> findRepo(String name) {
        String lower = name.toLowerCase();
        for (Map.Entry<String, JpaRepository<?, ?>> e : repositories.entrySet()) {
            String key = e.getKey().toLowerCase();
            if (key.equals(lower) || key.equals(lower + "repository") || key.equals(lower + "repo")) {
                return e.getValue();
            }
            // try interface simple name (proxy classes may implement repository interface)
            try {
                Class[] interfaces = e.getValue().getClass().getInterfaces();
                if (interfaces != null && interfaces.length > 0) {
                    String iface = interfaces[0].getSimpleName().toLowerCase();
                    if (iface.equals(lower) || iface.equals(lower + "repository")) return e.getValue();
                }
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    @GetMapping("/{entity}")
    public ResponseEntity<Object> list(@PathVariable String entity) {
        JpaRepository<?, ?> repo = findRepo(entity);
        if (repo == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Repository not found: " + entity);
        return ResponseEntity.ok(repo.findAll());
    }

    @GetMapping("/{entity}/{id}")
    @SuppressWarnings("ALL")
    public ResponseEntity<Object> getOne(@PathVariable String entity, @PathVariable String id) {
        JpaRepository<?, ?> repo = findRepo(entity);
        if (repo == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Repository not found: " + entity);
        Object key = parseId(id);
        try {
            // Use raw type to avoid generic type mismatch warnings
            @SuppressWarnings("rawtypes")
            JpaRepository rawRepo = repo;
            //noinspection unchecked
            @SuppressWarnings("unchecked")
            Object result = rawRepo.findById(key).orElse(null);
            if (result != null) return ResponseEntity.ok(result);
        } catch (ClassCastException ignored) {
            // try fallback by attempting other numeric types
            try {
                Object altKey = tryOtherIdTypes(id);
                @SuppressWarnings("rawtypes")
                JpaRepository rawRepo = repo;
                //noinspection unchecked
                @SuppressWarnings("unchecked")
                Object result = rawRepo.findById(altKey).orElse(null);
                if (result != null) return ResponseEntity.ok(result);
            } catch (Exception ignored2) {
            }
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Not found");
    }

    private Object parseId(String id) {
        try { return Long.valueOf(id); } catch (Exception ignored) { /* optional field — use default if missing or malformed */ }
        try { return Integer.valueOf(id); } catch (Exception ignored) { /* optional field — use default if missing or malformed */ }
        return id;
    }

    private Object tryOtherIdTypes(String id) {
        try { return Integer.valueOf(id); } catch (Exception ignored) { /* optional field — use default if missing or malformed */ }
        try { return Long.valueOf(id); } catch (Exception ignored) { /* optional field — use default if missing or malformed */ }
        return id;
    }
}