package com.example.ekart.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.ekart.dto.Banner;

public interface BannerRepository extends JpaRepository<Banner, Integer> {

    /**
     * Find only active banners for display on home page
     */
    List<Banner> findByActiveTrueOrderByDisplayOrderAsc();

    /**
     * Find all banners ordered by display order
     */
    List<Banner> findAllByOrderByDisplayOrderAsc();
}
