package com.example.ekart.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import com.example.ekart.model.Policy;
import com.example.ekart.repository.PolicyRepository;
import com.example.ekart.service.AuditLogService;

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
        Policy savedPolicy = savePolicyWithAudit("CREATED", policy);
        logger.info("[POST] /api/policies - Saved: id={}, title={}, slug={}",
            savedPolicy.getId(), savedPolicy.getTitle(), savedPolicy.getSlug());
        return savedPolicy;
    }

    @PutMapping("/{slug}")
    public Policy updatePolicy(@PathVariable String slug, @RequestBody Policy policy) {
        logger.info("[PUT] /api/policies/{} - Incoming: title={}, slug={}, category={}, author={}",
            slug, policy.getTitle(), policy.getSlug(), policy.getCategory(), policy.getAuthorAdminId());
        Optional<Policy> existingPolicy = policyRepository.findBySlug(slug);
        if (existingPolicy.isPresent()) {
            Policy updatedPolicy = copyPolicyChanges(existingPolicy.get(), policy);
            logger.info("[PUT] /api/policies/{} - Updated: id={}, title={}, slug={}",
                slug, updatedPolicy.getId(), updatedPolicy.getTitle(), updatedPolicy.getSlug());
            auditLogService.logPolicyAction("UPDATED", updatedPolicy.getTitle(), updatedPolicy.getAuthorAdminId());
            return updatedPolicy;
        }
        logger.warn("[PUT] /api/policies/{} - Policy not found", slug);
        return null;
    }

    @DeleteMapping("/{slug}")
    public void deletePolicy(@PathVariable String slug) {
        logger.info("[DELETE] /api/policies/{}", slug);
        Optional<Policy> existingPolicy = policyRepository.findBySlug(slug);
        if (existingPolicy.isPresent()) {
            Policy policyToDelete = existingPolicy.get();
            policyRepository.deleteBySlug(slug);
            logger.info("[DELETE] /api/policies/{} - Deleted: id={}, title={}", slug, policyToDelete.getId(), policyToDelete.getTitle());
            auditLogService.logPolicyAction("DELETED", policyToDelete.getTitle(), policyToDelete.getAuthorAdminId());
        } else {
            policyRepository.deleteBySlug(slug);
            logger.warn("[DELETE] /api/policies/{} - Not found in DB, but deleteBySlug called", slug);
        }
    }

    private Policy savePolicyWithAudit(String action, Policy policy) {
        policy.setLastUpdated(LocalDateTime.now());
        Policy savedPolicy = policyRepository.save(policy);
        auditLogService.logPolicyAction(action, savedPolicy.getTitle(), savedPolicy.getAuthorAdminId());
        return savedPolicy;
    }

    private Policy copyPolicyChanges(Policy targetPolicy, Policy sourcePolicy) {
        targetPolicy.setTitle(sourcePolicy.getTitle());
        targetPolicy.setContent(sourcePolicy.getContent());
        targetPolicy.setCategory(sourcePolicy.getCategory());
        targetPolicy.setLastUpdated(LocalDateTime.now());
        targetPolicy.setAuthorAdminId(sourcePolicy.getAuthorAdminId());
        return policyRepository.save(targetPolicy);
    }
}
