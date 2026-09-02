package com.kolifish.customer.service;


import com.kolifish.customer.entity.Area;
import com.kolifish.customer.repository.AreaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AreaService {

    private final AreaRepository areaRepository;

    public AreaService(AreaRepository areaRepository) {
        this.areaRepository = areaRepository;
    }

    // Create area
    public Area createArea(Area area) {
        return areaRepository.save(area);
    }

    // Get all areas
    public List<Area> getAllAreas() {
        return areaRepository.findAll();
    }

    // Get area by ID
    public Area getAreaById(Long id) {
        return areaRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Area not found"));
    }

    // Update area
    public Area updateArea(Long id, Area areaDetails) {

        Area area = areaRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Area not found"));

        area.setName(areaDetails.getName());

        return areaRepository.save(area);
    }

    // Delete area
    public void deleteArea(Long id) {
        areaRepository.deleteById(id);
    }
}