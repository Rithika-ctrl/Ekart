package com.example.ekart.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;

import com.example.ekart.dto.Banner;
import com.example.ekart.repository.BannerRepository;

import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;

/**
 * Service for managing promotional banners.
 * Handles CRUD operations and activation/deactivation of banners.
 */
@Service
@Transactional
public class BannerService {

    @Autowired
    private BannerRepository bannerRepository;

    /**
     * Get all active banners for home page display
     */
    public List<Banner> getActiveBanners() {
<<<<<<< HEAD
        return bannerRepository.findByActiveTrueOrderByDisplayOrderAsc();
=======
        return bannerRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
    }

    /**
     * Get all banners (for admin content management)
     */
    public List<Banner> getAllBanners() {
        return bannerRepository.findAllByOrderByDisplayOrderAsc();
    }

    /**
     * Load admin content management page
     */
    public String loadContentPage(HttpSession session, ModelMap map) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/admin/login";
        }

        map.put("banners", getAllBanners());
<<<<<<< HEAD
        map.put("activeBannerCount", bannerRepository.findByActiveTrueOrderByDisplayOrderAsc().size());
=======
        map.put("activeBannerCount", bannerRepository.findByIsActiveTrueOrderByDisplayOrderAsc().size());
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
        map.put("totalBannerCount", bannerRepository.count());
        return "admin-content.html";
    }

    /**
     * Add a new banner
     */
    public String addBanner(String title, String imageUrl, String linkUrl, HttpSession session) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/admin/login";
        }

        if (title == null || title.trim().isEmpty()) {
            session.setAttribute("failure", "Banner title is required");
            return "redirect:/admin/content";
        }

        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            session.setAttribute("failure", "Image URL is required");
            return "redirect:/admin/content";
        }

        Banner banner = new Banner();
        banner.setTitle(title.trim());
        banner.setImageUrl(imageUrl.trim());
        banner.setLinkUrl(linkUrl != null ? linkUrl.trim() : "");
        banner.setActive(true);
        banner.setDisplayOrder((int) bannerRepository.count());

        bannerRepository.save(banner);
        session.setAttribute("success", "Banner added successfully");
        return "redirect:/admin/content";
    }

    /**
     * Toggle banner active status
     */
    public String toggleBanner(int id, HttpSession session) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/admin/login";
        }

        Optional<Banner> optBanner = bannerRepository.findById(id);
        if (optBanner.isEmpty()) {
            session.setAttribute("failure", "Banner not found");
            return "redirect:/admin/content";
        }

        Banner banner = optBanner.get();
        banner.setActive(!banner.isActive());
        bannerRepository.save(banner);

        String status = banner.isActive() ? "activated" : "deactivated";
        session.setAttribute("success", "Banner \"" + banner.getTitle() + "\" " + status);
        return "redirect:/admin/content";
    }

    /**
     * Delete a banner
     */
    public String deleteBanner(int id, HttpSession session) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/admin/login";
        }

        Optional<Banner> optBanner = bannerRepository.findById(id);
        if (optBanner.isEmpty()) {
            session.setAttribute("failure", "Banner not found");
            return "redirect:/admin/content";
        }

        bannerRepository.deleteById(id);
        session.setAttribute("success", "Banner deleted successfully");
        return "redirect:/admin/content";
    }

    /**
     * Update banner details
     */
    public String updateBanner(int id, String title, String imageUrl, String linkUrl, HttpSession session) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", "Login First");
            return "redirect:/admin/login";
        }

        Optional<Banner> optBanner = bannerRepository.findById(id);
        if (optBanner.isEmpty()) {
            session.setAttribute("failure", "Banner not found");
            return "redirect:/admin/content";
        }

        Banner banner = optBanner.get();
        if (title != null && !title.trim().isEmpty()) {
            banner.setTitle(title.trim());
        }
        if (imageUrl != null && !imageUrl.trim().isEmpty()) {
            banner.setImageUrl(imageUrl.trim());
        }
        banner.setLinkUrl(linkUrl != null ? linkUrl.trim() : "");

        bannerRepository.save(banner);
        session.setAttribute("success", "Banner updated successfully");
        return "redirect:/admin/content";
    }
<<<<<<< HEAD
}
=======
}
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
