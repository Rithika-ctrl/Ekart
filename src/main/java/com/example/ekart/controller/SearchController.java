/**
 * File: SearchController.java
 * Description: Controller exposing search endpoints for product suggestions.
 * Author: Sanjay E, Rithika K, B Venkatesh
 * Company: Preflex Solutions Pvt. Ltd.
 * Version: 1.0
 * Date: March 2026
 */
package com.example.ekart.controller;

import com.example.ekart.service.SearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    @Autowired
    private SearchService searchService;

    @GetMapping("/suggestions")
    public ResponseEntity<List<SearchSuggestionDTO>> getSuggestions(
            @RequestParam(value = "q", defaultValue = "") String query) {

        if (query.trim().length() < 1) {
            return ResponseEntity.ok(List.of());
        }

        List<SearchSuggestionDTO> suggestions = searchService.getSuggestions(query.trim());
        return ResponseEntity.ok(suggestions);
    }

    /** Returns fuzzy spelling correction for the given query, or empty string if none found. */
    @GetMapping("/fuzzy")
    public ResponseEntity<Map<String, String>> getFuzzy(
            @RequestParam(value = "q", defaultValue = "") String query) {

        if (query.trim().length() < 2) {
            return ResponseEntity.ok(Map.of("suggestion", ""));
        }

        String match = searchService.findFuzzyMatch(query.trim());
        String suggestion = (match != null && !match.equalsIgnoreCase(query.trim())) ? match : "";
        return ResponseEntity.ok(Map.of("suggestion", suggestion));
    }
}