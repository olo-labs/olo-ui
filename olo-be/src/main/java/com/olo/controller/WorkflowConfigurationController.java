package com.olo.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.olo.service.WorkflowConfigurationService;
import com.olo.service.WorkflowConfigurationService.WorkflowSummary;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Read/write {@code olo-configuration} workflow JSON (local folder or Drive-synced path).
 */
@RestController
@RequestMapping("/api/v1/configuration/workflows")
public class WorkflowConfigurationController {

    private final WorkflowConfigurationService workflows;

    public WorkflowConfigurationController(WorkflowConfigurationService workflows) {
        this.workflows = workflows;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public List<WorkflowSummary> list() throws IOException {
        return workflows.listWorkflows();
    }

    @GetMapping(value = "/{fileName}", produces = MediaType.APPLICATION_JSON_VALUE)
    public JsonNode read(@PathVariable String fileName) throws IOException {
        return workflows.readWorkflow(fileName);
    }

    @PutMapping(value = "/{fileName}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public WorkflowSummary write(@PathVariable String fileName, @RequestBody JsonNode document) throws IOException {
        return workflows.writeWorkflow(fileName, document);
    }

    @DeleteMapping("/{fileName}")
    public ResponseEntity<Void> delete(@PathVariable String fileName) throws IOException {
        workflows.deleteWorkflow(fileName);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/meta/root", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> root() {
        return Map.of("directory", workflows.configurationRoot().toString());
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
    }

    @org.springframework.web.bind.annotation.ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> unavailable(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", ex.getMessage()));
    }
}
