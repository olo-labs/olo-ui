package com.olo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.olo.config.OloConfigurationProperties;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@Service
public class WorkflowConfigurationService {

    private final OloConfigurationProperties properties;
    private final ObjectMapper mapper = new ObjectMapper();

    public WorkflowConfigurationService(OloConfigurationProperties properties) {
        this.properties = properties;
    }

    public Path configurationRoot() {
        Path root = properties.resolvedDirectory();
        if (!Files.isDirectory(root)) {
            throw new IllegalStateException("Configuration directory not found: " + root);
        }
        return root;
    }

    public List<WorkflowSummary> listWorkflows() throws IOException {
        Path root = configurationRoot();
        List<WorkflowSummary> summaries = new ArrayList<>();
        try (Stream<Path> files = Files.list(root)) {
            files.filter(path -> path.getFileName().toString().endsWith(".json"))
                    .sorted(Comparator.comparing(path -> path.getFileName().toString()))
                    .forEach(path -> {
                        try {
                            JsonNode document = mapper.readTree(path.toFile());
                            String id = textOrNull(document, "id");
                            String label = textOrNull(document, "label");
                            summaries.add(new WorkflowSummary(path.getFileName().toString(), id, label));
                        } catch (IOException e) {
                            throw new IllegalStateException("Failed to read " + path, e);
                        }
                    });
        }
        return summaries;
    }

    public JsonNode readWorkflow(String fileName) throws IOException {
        Path file = resolveFile(fileName);
        return mapper.readTree(file.toFile());
    }

    public WorkflowSummary writeWorkflow(String fileName, JsonNode document) throws IOException {
        if (document == null || !document.isObject()) {
            throw new IllegalArgumentException("workflow document must be a JSON object");
        }
        String id = textOrNull(document, "id");
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("workflow id is required");
        }
        String targetName = sanitizeFileName(fileName != null && !fileName.isBlank() ? fileName : id + ".json");
        Path file = resolveFile(targetName);
        Files.createDirectories(file.getParent());
        mapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), document);
        return new WorkflowSummary(targetName, id, textOrNull(document, "label"));
    }

    public void deleteWorkflow(String fileName) throws IOException {
        Files.deleteIfExists(resolveFile(fileName));
    }

    private Path resolveFile(String fileName) throws IOException {
        String safe = sanitizeFileName(fileName);
        Path root = configurationRoot();
        Path resolved = root.resolve(safe).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("invalid file name");
        }
        return resolved;
    }

    private static String sanitizeFileName(String fileName) {
        String trimmed = fileName.trim().replace('\\', '/');
        int slash = trimmed.lastIndexOf('/');
        if (slash >= 0) {
            trimmed = trimmed.substring(slash + 1);
        }
        if (!trimmed.endsWith(".json")) {
            trimmed = trimmed + ".json";
        }
        if (!trimmed.matches("[A-Za-z0-9._-]+\\.json")) {
            throw new IllegalArgumentException("invalid workflow file name");
        }
        return trimmed;
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value != null && value.isTextual() ? value.asText() : null;
    }

    public record WorkflowSummary(String fileName, String id, String label) {}
}
