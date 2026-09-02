package com.kolifish.customer.controller;


import com.kolifish.customer.entity.Area;
import com.kolifish.customer.service.AreaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/areas")
public class AreaController {

    private final AreaService areaService;

    public AreaController(AreaService areaService) {
        this.areaService = areaService;
    }

    // Create area
    @PostMapping
    public ResponseEntity<Area> createArea(
            @RequestBody Area area) {

        return ResponseEntity.ok(
                areaService.createArea(area)
        );
    }

    // Get all areas
    @GetMapping
    public ResponseEntity<List<Area>> getAllAreas() {

        return ResponseEntity.ok(
                areaService.getAllAreas()
        );
    }

    // Get area by ID
    @GetMapping("/{id}")
    public ResponseEntity<Area> getAreaById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                areaService.getAreaById(id)
        );
    }

    // Update area
    @PutMapping("/{id}")
    public ResponseEntity<Area> updateArea(
            @PathVariable Long id,
            @RequestBody Area area) {

        return ResponseEntity.ok(
                areaService.updateArea(id, area)
        );
    }

    // Delete area
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArea(
            @PathVariable Long id) {

        areaService.deleteArea(id);

        return ResponseEntity.noContent().build();
    }
}