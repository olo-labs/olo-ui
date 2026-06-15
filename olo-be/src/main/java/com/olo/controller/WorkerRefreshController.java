package com.olo.controller;

import com.olo.dto.WorkerRefreshResponse;
import com.olo.service.WorkerRefreshService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/worker")
public class WorkerRefreshController {

    private final WorkerRefreshService workerRefreshService;

    public WorkerRefreshController(WorkerRefreshService workerRefreshService) {
        this.workerRefreshService = workerRefreshService;
    }

    /**
     * Writes a new token to the worker refresh Redis key so olo-worker reloads configuration and queues.
     */
    @PostMapping("/refresh")
    public ResponseEntity<WorkerRefreshResponse> refresh() {
        String value = workerRefreshService.signalRefresh();
        return ResponseEntity.ok(new WorkerRefreshResponse(workerRefreshService.refreshKey(), value));
    }
}
