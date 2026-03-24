package com.example.ekart.controller;

import com.example.ekart.model.Policy;
import com.example.ekart.repository.PolicyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class PolicyControllerTest {
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private PolicyRepository policyRepository;
    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setup() {
        policyRepository.deleteAll();
    }

    @Test
    void testCreateAndGetPolicy() throws Exception {
        Policy policy = new Policy();
        policy.setTitle("Test Policy");
        policy.setContent("Test content");
        policy.setCategory("General");
        policy.setSlug("test-policy");
        policy.setLastUpdated(LocalDateTime.now());
        policy.setAuthorAdminId("admin1");

        // Create
        mockMvc.perform(post("/api/policies")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(policy)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Policy"));

        // Get
        mockMvc.perform(get("/api/policies/test-policy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Test Policy"));
    }

    @Test
    void testUpdatePolicy() throws Exception {
        Policy policy = new Policy();
        policy.setTitle("Policy");
        policy.setContent("Content");
        policy.setCategory("General");
        policy.setSlug("policy-1");
        policy.setLastUpdated(LocalDateTime.now());
        policy.setAuthorAdminId("admin1");
        policy = policyRepository.save(policy);

        policy.setTitle("Updated Policy");
        mockMvc.perform(put("/api/policies/policy-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(policy)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Policy"));
    }

    @Test
    void testDeletePolicy() throws Exception {
        Policy policy = new Policy();
        policy.setTitle("Delete Policy");
        policy.setContent("Content");
        policy.setCategory("General");
        policy.setSlug("delete-policy");
        policy.setLastUpdated(LocalDateTime.now());
        policy.setAuthorAdminId("admin1");
        policyRepository.save(policy);

        mockMvc.perform(delete("/api/policies/delete-policy"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/policies/delete-policy"))
                .andExpect(status().isOk())
                .andExpect(content().string(""));
    }
}
