package com.example.ekart.controller;

import com.example.ekart.model.Policy;
import com.example.ekart.repository.PolicyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.example.ekart.service.AuditLogService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/policies")
public class PolicyController {

    private static final Logger logger = LoggerFactory.getLogger(PolicyController.class);

    // ── Injected dependencies ────────────────────────────────────────────────
    private final PolicyRepository policyRepository;
    private final AuditLogService auditLogService;

    public PolicyController(
            PolicyRepository policyRepository,
            AuditLogService auditLogService) {
        this.policyRepository = policyRepository;
        this.auditLogService = auditLogService;
    }




    @GetMapping
    public List<Policy> getAllPolicies() {
        List<Policy> policies = policyRepository.findAll();
        logger.info("[GET] /api/policies - {} policies returned", policies.size());
        for (Policy p : policies) {
            logger.info("Policy: id={}, title={}, slug={}, category={}, author={}, lastUpdated={}",
                p.getId(), p.getTitle(), p.getSlug(), p.getCategory(), p.getAuthorAdminId(), p.getLastUpdated());
        }
        return policies;
    }

    @GetMapping("/{slug}")
    public Policy getPolicyBySlug(@PathVariable String slug) {
        Policy policy = policyRepository.findBySlug(slug).orElse(null);
        logger.info("[GET] /api/policies/{} - {}", slug, policy != null ? "FOUND" : "NOT FOUND");
        return policy;
    }

    @PostMapping
    public Policy createPolicy(@RequestBody Policy policy) {
        logger.info("[POST] /api/policies - Incoming: title={}, slug={}, category={}, author={}",
            policy.getTitle(), policy.getSlug(), policy.getCategory(), policy.getAuthorAdminId());
        policy.setLastUpdated(LocalDateTime.now());
        Policy saved = policyRepository.save(policy);
        logger.info("[POST] /api/policies - Saved: id={}, title={}, slug={}",
            saved.getId(), saved.getTitle(), saved.getSlug());
        auditLogService.logPolicyAction("CREATED", saved.getTitle(), saved.getAuthorAdminId());
        return saved;
    }

    @PutMapping("/{slug}")
    public Policy updatePolicy(@PathVariable String slug, @RequestBody Policy policy) {
        logger.info("[PUT] /api/policies/{} - Incoming: title={}, slug={}, category={}, author={}",
            slug, policy.getTitle(), policy.getSlug(), policy.getCategory(), policy.getAuthorAdminId());
        Optional<Policy> existing = policyRepository.findBySlug(slug);
        if (existing.isPresent()) {
            Policy p = existing.get();
            p.setTitle(policy.getTitle());
            p.setContent(policy.getContent());
            p.setCategory(policy.getCategory());
            p.setLastUpdated(LocalDateTime.now());
            p.setAuthorAdminId(policy.getAuthorAdminId());
            Policy updated = policyRepository.save(p);
            logger.info("[PUT] /api/policies/{} - Updated: id={}, title={}, slug={}",
                slug, updated.getId(), updated.getTitle(), updated.getSlug());
            auditLogService.logPolicyAction("UPDATED", updated.getTitle(), updated.getAuthorAdminId());
            return updated;
        }
        logger.warn("[PUT] /api/policies/{} - Policy not found", slug);
        return null;
    }

    @DeleteMapping("/{slug}")
    public void deletePolicy(@PathVariable String slug) {
        logger.info("[DELETE] /api/policies/{}", slug);
        Optional<Policy> existing = policyRepository.findBySlug(slug);
        if (existing.isPresent()) {
            Policy p = existing.get();
            policyRepository.deleteBySlug(slug);
            logger.info("[DELETE] /api/policies/{} - Deleted: id={}, title={}", slug, p.getId(), p.getTitle());
            auditLogService.logPolicyAction("DELETED", p.getTitle(), p.getAuthorAdminId());
        } else {
            policyRepository.deleteBySlug(slug);
            logger.warn("[DELETE] /api/policies/{} - Not found in DB, but deleteBySlug called", slug);
        }
    }
}
