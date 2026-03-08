package com.example.ekart.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.ekart.dto.Banner;

public interface BannerRepository extends JpaRepository<Banner, Integer> {

    /**
     * Find only active banners for display on home page
     */
<<<<<<< HEAD
    List<Banner> findByActiveTrueOrderByDisplayOrderAsc();
=======
    List<Banner> findByIsActiveTrueOrderByDisplayOrderAsc();
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57

    /**
     * Find all banners ordered by display order
     */
    List<Banner> findAllByOrderByDisplayOrderAsc();
}
