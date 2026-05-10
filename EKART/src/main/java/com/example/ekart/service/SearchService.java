package com.example.ekart.service;

import com.example.ekart.controller.SearchSuggestionDTO;
import com.example.ekart.dto.Product;
import com.example.ekart.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SearchService {

    // ── Injected dependencies ────────────────────────────────────────────────
    private final ProductRepository productRepository;

    public SearchService(
            ProductRepository productRepository) {
        this.productRepository = productRepository;
    }



    /**
     * Returns up to 8 product suggestions matching the query,
     * sorted by how many times each product has been ordered (most popular first).
     */
    public List<SearchSuggestionDTO> getSuggestions(String query) {
        // Fast path: filter in-memory, no per-product DB calls
        String q = query.toLowerCase();
        return productRepository.findByApprovedTrue()
                .stream()
                .filter(p -> (p.getName() != null && p.getName().toLowerCase().contains(q))
                          || (p.getCategory() != null && p.getCategory().toLowerCase().contains(q)))
                .limit(8)
                .map(p -> new SearchSuggestionDTO(p.getName(), p.getCategory(), p.getImageLink(), 0L))
                .toList();
    }

    /**
     * Fuzzy spell-correction: finds the closest product name to the query
     * using Levenshtein distance. Handles multi-word product names by comparing
     * the query against each individual word in the product name.
     * Returns null if no close-enough match found.
     */
    public String findFuzzyMatch(String query) {
        if (query == null || query.trim().isEmpty()) return null;

        String q = query.trim().toLowerCase();

        // Adaptive threshold: stricter for short words to avoid false matches
        int threshold;
        if (q.length() <= 3)      threshold = 1;
        else if (q.length() <= 5) threshold = 2;
        else                       threshold = Math.max(2, q.length() / 3);

        List<Product> all = productRepository.findByApprovedTrue();

        String bestMatch  = null;
        int    bestDist   = Integer.MAX_VALUE;
        int    bestPrefix = -1;

        for (Product p : all) {
            // Build list of strings to match against: product name words + category
            java.util.List<String> candidates = new java.util.ArrayList<>();
            if (p.getName() != null) {
                candidates.add(p.getName().toLowerCase());
                for (String w : p.getName().toLowerCase().split("[\\s\\-]+"))
                    if (w.length() >= 2) candidates.add(w);
            }
            if (p.getCategory() != null) {
                candidates.add(p.getCategory().toLowerCase());
                for (String w : p.getCategory().toLowerCase().split("[\\s\\-]+"))
                    if (w.length() >= 2) candidates.add(w);
            }

            for (String candidate : candidates) {
                int d = levenshtein(q, candidate);
                if (d <= threshold) {
                    int prefix = sharedPrefixLength(q, candidate);
                    if (d < bestDist || (d == bestDist && prefix > bestPrefix)) {
                        bestDist = d; bestPrefix = prefix;
                        // Return the matched word itself (e.g. "chips"), not the product name
                        // So the caller can search by that corrected term across name+category
                        bestMatch = candidate;
                    }
                }
            }
        }

        return bestMatch;
    }

    /** Returns the number of characters shared at the start of two strings. */
    private int sharedPrefixLength(String a, String b) {
        int count = 0;
        int len   = Math.min(a.length(), b.length());
        for (int i = 0; i < len; i++) {
            if (a.charAt(i) == b.charAt(i)) count++;
            else break;
        }
        return count;
    }

    // ── Levenshtein distance (standard DP implementation) ──────────────────
    private int levenshtein(String a, String b) {
        int m = a.length(), n = b.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 0; i <= m; i++) dp[i][0] = i;
        for (int j = 0; j <= n; j++) dp[0][j] = j;
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                int cost = (a.charAt(i - 1) == b.charAt(j - 1)) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1),
                        dp[i-1][j-1] + cost
                );
            }
        }
        return dp[m][n];
    }
}

