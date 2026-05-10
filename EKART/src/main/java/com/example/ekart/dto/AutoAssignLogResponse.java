package com.example.ekart.dto;

import java.util.List;

public class AutoAssignLogResponse {

    private final boolean success;
    private final String message;
    private final List<AutoAssignLogItem> logs;
    private final int maxConcurrent;

    private AutoAssignLogResponse(boolean success, String message, List<AutoAssignLogItem> logs, int maxConcurrent) {
        this.success = success;
        this.message = message;
        this.logs = logs;
        this.maxConcurrent = maxConcurrent;
    }

    public static AutoAssignLogResponse success(List<AutoAssignLogItem> logs, int maxConcurrent) {
        return new AutoAssignLogResponse(true, null, List.copyOf(logs), maxConcurrent);
    }

    public static AutoAssignLogResponse failure(String message) {
        return new AutoAssignLogResponse(false, message, List.of(), 0);
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public List<AutoAssignLogItem> getLogs() { return logs; }
    public int getMaxConcurrent() { return maxConcurrent; }
}