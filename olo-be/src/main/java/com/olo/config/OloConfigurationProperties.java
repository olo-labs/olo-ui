package com.olo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Folder of workflow preset JSON files ({@code olo-configuration/default/*.json}).
 * Point at a Drive-synced directory to edit cloud-backed presets.
 */
@ConfigurationProperties(prefix = "olo.configuration")
public class OloConfigurationProperties {

    /** Absolute or workspace-relative path to the configuration folder. */
    private String directory = "../../olo-mono/olo-definition/olo-configuration/default";

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
