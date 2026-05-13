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

    private final PolicyRepository policyRepository;
    private final AuditLogService auditLogService;

    public PolicyController(
            PolicyRepository policyRepository,
            AuditLogService auditLogService) {
        this.policyRepository = policyRepository;
        this.auditLogService = auditLogService;
    }

    public static class PolicyDTO {
        private String title;
        private String content;
        private String slug;
        private String category;
        private Integer authorAdminId;

        public String getTitle()           { return title; }
        public void   setTitle(String v)   { this.title = v; }
        public String getContent()         { return content; }
        public void   setContent(String v) { this.content = v; }
        public String getSlug()            { return slug; }
        public void   setSlug(String v)    { this.slug = v; }
        public String getCategory()        { return category; }
        public void   setCategory(String v){ this.category = v; }
        public Integer getAuthorAdminId()          { return authorAdminId; }
        public void    setAuthorAdminId(Integer v)  { this.authorAdminId = v; }
    }

    @GetMapping
    public List<Policy> getAllPolicies() {
        List<Policy> policies = policyRepository.findAll();
        logger.info("[GET] /api/policies - {} policies returned", policies.size());
        for (Policy p : policies) {
            logger.info("Policy: id={}, title={}, slug={}, category={}, author={}, lastUpdated={}",
                p.getId(), sanitizeForLog(p.getTitle()), sanitizeForLog(p.getSlug()),
                sanitizeForLog(p.getCategory()), p.getAuthorAdminId(), p.getLastUpdated());
        }
        return policies;
    }

    @GetMapping("/{slug}")
    public Policy getPolicyBySlug(@PathVariable String slug) {
        Policy policy = policyRepository.findBySlug(slug).orElse(null);
        logger.info("[GET] /api/policies/{} - {}", sanitizeForLog(slug), policy != null ? "FOUND" : "NOT FOUND");
        return policy;
    }

    @PostMapping
    public Policy createPolicy(@RequestBody PolicyDTO dto) {
        logger.info("[POST] /api/policies - Incoming: title={}, slug={}, category={}, author={}",
            sanitizeForLog(dto.getTitle()), sanitizeForLog(dto.getSlug()),
            sanitizeForLog(dto.getCategory()), dto.getAuthorAdminId());
        Policy policy = toEntity(dto);
        Policy savedPolicy = savePolicyWithAudit("CREATED", policy);
        logger.info("[POST] /api/policies - Saved: id={}, title={}, slug={}",
            savedPolicy.getId(), sanitizeForLog(savedPolicy.getTitle()), sanitizeForLog(savedPolicy.getSlug()));
        return savedPolicy;
    }

    @PutMapping("/{slug}")
    public Policy updatePolicy(@PathVariable String slug, @RequestBody PolicyDTO dto) {
        logger.info("[PUT] /api/policies/{} - Incoming: title={}, slug={}, category={}, author={}",
            sanitizeForLog(slug), sanitizeForLog(dto.getTitle()), sanitizeForLog(dto.getSlug()),
            sanitizeForLog(dto.getCategory()), dto.getAuthorAdminId());
        Optional<Policy> existingPolicy = policyRepository.findBySlug(slug);
        if (existingPolicy.isPresent()) {
            Policy updatedPolicy = copyPolicyChanges(existingPolicy.get(), dto);
            logger.info("[PUT] /api/policies/{} - Updated: id={}, title={}, slug={}",
                sanitizeForLog(slug), updatedPolicy.getId(),
                sanitizeForLog(updatedPolicy.getTitle()), sanitizeForLog(updatedPolicy.getSlug()));
            auditLogService.logPolicyAction("UPDATED", updatedPolicy.getTitle(), String.valueOf(updatedPolicy.getAuthorAdminId()));
            return updatedPolicy;
        }
        logger.warn("[PUT] /api/policies/{} - Policy not found", sanitizeForLog(slug));
        return null;
    }

    @DeleteMapping("/{slug}")
    public void deletePolicy(@PathVariable String slug) {
        logger.info("[DELETE] /api/policies/{}", sanitizeForLog(slug));
        Optional<Policy> existingPolicy = policyRepository.findBySlug(slug);
        if (existingPolicy.isPresent()) {
            Policy policyToDelete = existingPolicy.get();
            policyRepository.deleteBySlug(slug);
            logger.info("[DELETE] /api/policies/{} - Deleted: id={}, title={}",
                sanitizeForLog(slug), policyToDelete.getId(), sanitizeForLog(policyToDelete.getTitle()));
            auditLogService.logPolicyAction("DELETED", policyToDelete.getTitle(), String.valueOf(policyToDelete.getAuthorAdminId()));
        } else {
            policyRepository.deleteBySlug(slug);
            logger.warn("[DELETE] /api/policies/{} - Not found in DB, but deleteBySlug called", sanitizeForLog(slug));
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Policy toEntity(PolicyDTO dto) {
        Policy policy = new Policy();
        policy.setTitle(dto.getTitle());
        policy.setContent(dto.getContent());
        policy.setSlug(dto.getSlug());
        policy.setCategory(dto.getCategory());
        policy.setAuthorAdminId(String.valueOf(dto.getAuthorAdminId()));
        return policy;
    }

    private Policy savePolicyWithAudit(String action, Policy policy) {
        policy.setLastUpdated(LocalDateTime.now());
        Policy savedPolicy = policyRepository.save(policy);
        auditLogService.logPolicyAction(action, savedPolicy.getTitle(), String.valueOf(savedPolicy.getAuthorAdminId()));
        return savedPolicy;
    }

    private Policy copyPolicyChanges(Policy targetPolicy, PolicyDTO dto) {
        targetPolicy.setTitle(dto.getTitle());
        targetPolicy.setContent(dto.getContent());
        targetPolicy.setCategory(dto.getCategory());
        targetPolicy.setLastUpdated(LocalDateTime.now());
        targetPolicy.setAuthorAdminId(String.valueOf(dto.getAuthorAdminId()));
        return policyRepository.save(targetPolicy);
    }

    /**
     * Strips newlines and carriage returns from user-supplied strings before
     * passing them to the logger, preventing log-injection (javasecurity:S5145).
     */
    private static String sanitizeForLog(String value) {
        if (value == null) return "(null)";
        return value.replaceAll("[\r\n]", "_");
    }
}
