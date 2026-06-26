package com.olo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Folder of active workflow JSON under {@code olo-configuration/current-active}.
 * Scans recursively; presets may live in subfolders such as {@code agents/agent.json}.
 */
@ConfigurationProperties(prefix = "olo.configuration")
public class OloConfigurationProperties {

    /** Absolute or workspace-relative path to the active configuration folder. */
    private String directory = "../../olo-mono/olo-definition/olo-configuration/current-active";

    public String getDirectory() {
        return directory;
    }

    public void setDirectory(String directory) {
        this.directory = directory;
    }

    public Path resolvedDirectory() {
        return Paths.get(directory).toAbsolutePath().normalize();
    }
}
