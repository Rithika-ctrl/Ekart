package com.example.ekart.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.ekart.dto.Banner;

public interface BannerRepository extends JpaRepository<Banner, Integer> {

    // Active banners for landing page (home.html)
    List<Banner> findByActiveTrueAndShowOnHomeTrueOrderByDisplayOrderAsc();

    // Active banners for customer home page (customer-home.html)
    List<Banner> findByActiveTrueAndShowOnCustomerHomeTrueOrderByDisplayOrderAsc();

    // All active banners (legacy — still used by getActiveBanners)
    List<Banner> findByActiveTrueOrderByDisplayOrderAsc();

    // All banners for admin panel
    List<Banner> findAllByOrderByDisplayOrderAsc();
}