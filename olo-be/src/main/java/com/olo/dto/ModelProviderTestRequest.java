package com.olo.dto;

import java.util.Map;

public record ModelProviderTestRequest(
        String provider,
        String model,
        Map<String, Object> configuration
) {
}
