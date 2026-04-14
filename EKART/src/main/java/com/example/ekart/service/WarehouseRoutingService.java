package com.example.ekart.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ekart.dto.Warehouse;
import com.example.ekart.repository.WarehouseRepository;

/**
 * LOCATION: src/main/java/com/example/ekart/service/WarehouseRoutingService.java
 *
 * Implements multi-warehouse routing for multi-city orders.
 * Key algorithm: Nearest-Hub (always move closer to destination)
 * 
 * Example flow for Delhi → Bangalore order:
 * 1. Start: Delhi Warehouse (source)
 * 2. Find nearest hub closer to destination
 * 3. Move to Hyderabad Warehouse (intermediate hub)
 * 4. Find next nearest hub closer to destination
 * 5. Move to Bangalore Warehouse (destination)
 * 6. Final: Delivery by local delivery boy
 * 
 * Distance calculated using Haversine formula (great-circle distance on Earth)
 */
@Service
@Transactional
public class WarehouseRoutingService {

    @Autowired
    private WarehouseRepository warehouseRepository;

    /**
     * Calculates the optimal warehouse route from source to destination.
     * Uses nearest-hub algorithm: always proceed through the closest warehouse
     * that is still closer to the destination than current position.
     *
     * @param sourceWarehouse Starting warehouse (vendor's location)
     * @param destinationWarehouse Target warehouse (closest to customer)
     * @return List of warehouses in optimal transfer order (including source and destination)
     */
    public List<Warehouse> calculateOptimalRoute(Warehouse sourceWarehouse, Warehouse destinationWarehouse) {
        List<Warehouse> route = new ArrayList<>();

        // Sanity checks
        if (sourceWarehouse == null || destinationWarehouse == null) {
            return route;
        }

        // Same warehouse = direct delivery (no transfers needed)
        if (sourceWarehouse.getId() == destinationWarehouse.getId()) {
            route.add(sourceWarehouse);
            return route;
        }

        // Start with source warehouse
        route.add(sourceWarehouse);
        Warehouse currentWarehouse = sourceWarehouse;

        // Calculate distance from source to destination
        double totalDistance = currentWarehouse.calculateDistanceTo(destinationWarehouse);

        // Use greedy algorithm: always pick nearest warehouse that's still closer to destination
        Set<Integer> visited = new HashSet<>();
        visited.add(currentWarehouse.getId());

        // Maximum 5 hops (to prevent infinite loops)
        int maxHops = 5;
        int hopCount = 0;

        while (hopCount < maxHops && currentWarehouse.getId() != destinationWarehouse.getId()) {
            // Get all warehouses that could be intermediate hubs
            List<Warehouse> allWarehouses = warehouseRepository.findAll();
            List<Warehouse> candidates = new ArrayList<>();

            // Filter: warehouse must be closer to destination than current position
            for (Warehouse wh : allWarehouses) {
                if (visited.contains(wh.getId())) {
                    continue;
                }
                if (wh.isActive() && hasValidCoordinates(wh)) {
                    double distToDest = wh.calculateDistanceTo(destinationWarehouse);
                    double currentDistToDest = currentWarehouse.calculateDistanceTo(destinationWarehouse);

                    // Warehouse must be moving us closer to destination (at least 10% closer)
                    if (distToDest < currentDistToDest * 0.9) {
                        candidates.add(wh);
                    }
                }
            }

            if (candidates.isEmpty()) {
                // No intermediate hub found; go directly to destination
                break;
            }

            // Pick the closest candidate (nearest-hub principle)
            Warehouse nextHub = candidates.stream()
                .min(Comparator.comparingDouble(currentWarehouse::calculateDistanceTo))
                .orElse(null);

            if (nextHub != null) {
                route.add(nextHub);
                visited.add(nextHub.getId());
                currentWarehouse = nextHub;
                hopCount++;
            } else {
                break;
            }
        }

        // Add destination if not already there
        if (route.get(route.size() - 1).getId() != destinationWarehouse.getId()) {
            route.add(destinationWarehouse);
        }

        return route;
    }

    /**
     * Finds the best warehouse to serve a given delivery PIN code.
     * Returns the warehouse with the most specific PIN code match.
     *
     * @param deliveryPinCode Customer's delivery PIN code
     * @return Optional containing the best warehouse, or empty if no match
     */
    public Optional<Warehouse> findWarehouseByPinCode(String deliveryPinCode) {
        if (deliveryPinCode == null || deliveryPinCode.isBlank()) {
            return Optional.empty();
        }

        List<Warehouse> allWarehouses = warehouseRepository.findAll();
        
        for (Warehouse wh : allWarehouses) {
            if (wh.isActive() && wh.serves(deliveryPinCode)) {
                return Optional.of(wh);
            }
        }

        return Optional.empty();
    }

    /**
     * Generates a user-friendly routing path string.
     * Example: "Delhi → Hyderabad → Bangalore"
     *
     * @param route List of warehouses in route order
     * @return Formatted routing path string
     */
    public String generateRoutingPathDisplay(List<Warehouse> route) {
        if (route == null || route.isEmpty()) {
            return "No route";
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < route.size(); i++) {
            sb.append(route.get(i).getCity());
            if (i < route.size() - 1) {
                sb.append(" → ");
            }
        }
        return sb.toString();
    }

    /**
     * Converts a route (list of warehouses) to comma-separated warehouse IDs.
     * Excludes the first (source) warehouse.
     * Example: If route is [WH-1, WH-2, WH-3], returns "2,3"
     *
     * @param route List of warehouses
     * @return Comma-separated warehouse IDs for intermediate and destination warehouses
     */
    public String convertRouteToWarehouseIds(List<Warehouse> route) {
        if (route == null || route.size() <= 1) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        // Skip first warehouse (source) and include rest
        for (int i = 1; i < route.size(); i++) {
            if (i > 1) {
                sb.append(",");
            }
            sb.append(route.get(i).getId());
        }
        return sb.toString();
    }

    /**
     * Validates if a warehouse has valid latitude and longitude coordinates.
     * Required for distance calculations.
     *
     * @param warehouse Warehouse to validate
     * @return true if warehouse has both lat and long coordinates
     */
    public boolean hasValidCoordinates(Warehouse warehouse) {
        return warehouse != null &&
               warehouse.getLatitude() != null &&
               warehouse.getLongitude() != null;
    }

    /**
     * Calculates distance between two PIN code locations.
     * Useful for estimating total delivery distance.
     * (Stub: in production, use Google Maps API or similar)
     *
     * @param fromWarehouse Starting warehouse
     * @param toWarehouse Destination warehouse
     * @return Distance in kilometers
     */
    public double calculateWarehouseDistance(Warehouse fromWarehouse, Warehouse toWarehouse) {
        if (fromWarehouse == null || toWarehouse == null) {
            return 0;
        }
        return fromWarehouse.calculateDistanceTo(toWarehouse);
    }

    /**
     * Gets all active warehouses sorted by city.
     * Used for admin dashboard and routing selection UI.
     *
     * @return List of active warehouses sorted by city name
     */
    public List<Warehouse> getAllActiveWarehouses() {
        List<Warehouse> warehouses = warehouseRepository.findAll();
        
        // Filter active warehouses and sort by city
        return warehouses.stream()
            .filter(Warehouse::isActive)
            .sorted(Comparator.comparing(Warehouse::getCity))
            .toList();
    }

    /**
     * Gets warehouses serving a specific state.
     * Used for regional inventory management.
     *
     * @param state State name
     * @return List of active warehouses in that state
     */
    public List<Warehouse> getWarehousesByState(String state) {
        if (state == null || state.isBlank()) {
            return Collections.emptyList();
        }

        List<Warehouse> allWarehouses = warehouseRepository.findAll();
        
        return allWarehouses.stream()
            .filter(w -> w.isActive() && state.equalsIgnoreCase(w.getState()))
            .sorted(Comparator.comparing(Warehouse::getCity))
            .toList();
    }
}
