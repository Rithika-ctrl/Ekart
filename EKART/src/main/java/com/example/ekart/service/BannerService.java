package com.example.ekart.service;
import java.util.Optional;

import java.util.List;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;

import com.example.ekart.dto.Banner;
import com.example.ekart.helper.CloudinaryHelper;
import org.springframework.web.multipart.MultipartFile;
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

    private static final String REDIRECT_ADMIN_LOGIN = "redirect:/admin/login";
    private static final String REDIRECT_ADMIN_CONTENT = "redirect:/admin/content";
    private static final String LOGIN_FIRST = "Login First";

    // ── Injected dependencies ────────────────────────────────────────────────
    private final BannerRepository bannerRepository;
    private final CloudinaryHelper cloudinaryHelper;

    public BannerService(
            BannerRepository bannerRepository,
            CloudinaryHelper cloudinaryHelper) {
        this.bannerRepository = bannerRepository;
        this.cloudinaryHelper = cloudinaryHelper;
    }




    /**
     * Get active banners for the pre-login landing page (home.html)
     */
    public List<Banner> getHomeBanners() {
        return bannerRepository.findByActiveTrueAndShowOnHomeTrueOrderByDisplayOrderAsc();
    }

    /**
     * Get active banners for the customer home page after login (customer-home.html)
     */
    @Cacheable("banners-home")
    public List<Banner> getCustomerHomeBanners() {
        return bannerRepository.findByActiveTrueAndShowOnCustomerHomeTrueOrderByDisplayOrderAsc();
    }

    /**
     * Get all active banners — legacy method, kept for compatibility
     */
    public List<Banner> getActiveBanners() {
        return bannerRepository.findByActiveTrueOrderByDisplayOrderAsc();
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
            session.setAttribute("failure", LOGIN_FIRST);
            return REDIRECT_ADMIN_LOGIN;
        }

        map.put("banners", getAllBanners());
        map.put("activeBannerCount", bannerRepository.findByActiveTrueOrderByDisplayOrderAsc().size());
        map.put("totalBannerCount", bannerRepository.count());
        return "admin-content.html";
    }

    /**
     * Add a new banner with file upload — uploads image to Cloudinary first
     */
    public String addBannerWithUpload(String title, MultipartFile imageFile, String linkUrl, HttpSession session) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", LOGIN_FIRST);
            return REDIRECT_ADMIN_LOGIN;
        }
        if (title == null || title.trim().isEmpty()) {
            session.setAttribute("failure", "Banner title is required");
            return REDIRECT_ADMIN_CONTENT;
        }
        if (imageFile == null || imageFile.isEmpty()) {
            session.setAttribute("failure", "Please select an image file");
            return REDIRECT_ADMIN_CONTENT;
        }
        try {
            String imageUrl = cloudinaryHelper.saveBannerToCloudinary(imageFile);
            Banner banner = new Banner();
            banner.setTitle(title.trim());
            banner.setImageUrl(imageUrl);
            banner.setLinkUrl(linkUrl != null ? linkUrl.trim() : "");
            banner.setActive(true);
            banner.setDisplayOrder((int) bannerRepository.count());
            bannerRepository.save(banner);
            session.setAttribute("success", "Banner " + title.trim() + " uploaded and added successfully!");
        } catch (Exception e) {
            session.setAttribute("failure", "Image upload failed: " + e.getMessage());
        }
        return REDIRECT_ADMIN_CONTENT;
    }

    /**
     * Add a new banner
     */
    public String addBanner(String title, String imageUrl, String linkUrl, HttpSession session) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", LOGIN_FIRST);
            return REDIRECT_ADMIN_LOGIN;
        }

        if (title == null || title.trim().isEmpty()) {
            session.setAttribute("failure", "Banner title is required");
            return REDIRECT_ADMIN_CONTENT;
        }

        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            session.setAttribute("failure", "Image URL is required");
            return REDIRECT_ADMIN_CONTENT;
        }

        Banner banner = new Banner();
        banner.setTitle(title.trim());
        banner.setImageUrl(imageUrl.trim());
        banner.setLinkUrl(linkUrl != null ? linkUrl.trim() : "");
        banner.setActive(true);
        banner.setDisplayOrder((int) bannerRepository.count());

        bannerRepository.save(banner);
        session.setAttribute("success", "Banner added successfully");
        return REDIRECT_ADMIN_CONTENT;
    }

    /**
     * Toggle banner active status
     */
    public String toggleBanner(int id, HttpSession session) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", LOGIN_FIRST);
            return REDIRECT_ADMIN_LOGIN;
        }

        Optional<Banner> optBanner = bannerRepository.findById(id);
        if (optBanner.isEmpty()) {
            session.setAttribute("failure", "Banner not found");
            return REDIRECT_ADMIN_CONTENT;
        }

        Banner banner = optBanner.get();
        banner.setActive(!banner.isActive());
        bannerRepository.save(banner);

        String status = banner.isActive() ? "activated" : "deactivated";
        session.setAttribute("success", "Banner \"" + banner.getTitle() + "\" " + status);
        return REDIRECT_ADMIN_CONTENT;
    }

    /**
     * Delete a banner
     */
    public String deleteBanner(int id, HttpSession session) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", LOGIN_FIRST);
            return REDIRECT_ADMIN_LOGIN;
        }

        Optional<Banner> optBanner = bannerRepository.findById(id);
        if (optBanner.isEmpty()) {
            session.setAttribute("failure", "Banner not found");
            return REDIRECT_ADMIN_CONTENT;
        }

        bannerRepository.deleteById(id);
        session.setAttribute("success", "Banner deleted successfully");
        return REDIRECT_ADMIN_CONTENT;
    }

    /**
     * Toggle whether banner shows on the landing page (home.html)
     */
    public String toggleShowOnHome(int id, HttpSession session) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", LOGIN_FIRST);
            return REDIRECT_ADMIN_LOGIN;
        }
        bannerRepository.findById(id).ifPresent(b -> {
            b.setShowOnHome(!b.isShowOnHome());
            bannerRepository.save(b);
        });
        return REDIRECT_ADMIN_CONTENT;
    }

    /**
     * Toggle whether banner shows on the customer home page (customer-home.html)
     */
    public String toggleShowOnCustomerHome(int id, HttpSession session) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", LOGIN_FIRST);
            return REDIRECT_ADMIN_LOGIN;
        }
        bannerRepository.findById(id).ifPresent(b -> {
            b.setShowOnCustomerHome(!b.isShowOnCustomerHome());
            bannerRepository.save(b);
        });
        return REDIRECT_ADMIN_CONTENT;
    }

    /**
     * Update banner details
     */
    public String updateBanner(int id, String title, String imageUrl, String linkUrl, HttpSession session) {
        if (session.getAttribute("admin") == null) {
            session.setAttribute("failure", LOGIN_FIRST);
            return REDIRECT_ADMIN_LOGIN;
        }

        Optional<Banner> optBanner = bannerRepository.findById(id);
        if (optBanner.isEmpty()) {
            session.setAttribute("failure", "Banner not found");
            return REDIRECT_ADMIN_CONTENT;
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
        return REDIRECT_ADMIN_CONTENT;
    }
}

