package com.olo.controller;



import org.springframework.core.io.ClassPathResource;

import org.springframework.core.io.Resource;

import org.springframework.http.MediaType;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RestController;



import java.io.IOException;



/**

 * Serves the merged extension catalog copied from olo-core {@code dist/catalog/catalog.json} at build time.

 * Editor-only metadata — no Java implementation types required on the frontend.

 */

@RestController

@RequestMapping("/api/v1/catalog")

public class ExtensionCatalogController {



    private static final String CATALOG_FILE = "static/catalog/catalog.json";



    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)

    public ResponseEntity<Resource> catalog() throws IOException {

        return serve();

    }



    @GetMapping(value = "/catalog.json", produces = MediaType.APPLICATION_JSON_VALUE)

    public ResponseEntity<Resource> catalogFile() throws IOException {

        return serve();

    }



    private static ResponseEntity<Resource> serve() throws IOException {

        Resource resource = new ClassPathResource(CATALOG_FILE);

        if (!resource.exists()) {

            return ResponseEntity.notFound().build();

        }

        return ResponseEntity.ok()

                .contentType(MediaType.APPLICATION_JSON)

                .body(resource);

    }

}


