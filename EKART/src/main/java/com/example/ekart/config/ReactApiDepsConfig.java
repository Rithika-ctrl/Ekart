package com.example.ekart.config;

import com.example.ekart.controller.ReactApiController;
import com.example.ekart.helper.CloudinaryHelper;
import com.example.ekart.helper.DeliveryRefreshTokenUtil;
import com.example.ekart.helper.EmailSender;
import com.example.ekart.helper.JwtUtil;
import com.example.ekart.repository.*;
import com.example.ekart.service.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.Nullable;

/**
 * Registers ReactApiController.ReactApiDeps as a Spring-managed bean.
 *
 * ReactApiDeps is a parameter-object record defined as a nested type inside
 * ReactApiController. Spring's component scan does not reliably pick up
 * @Component on nested records, so we register it explicitly here instead.
 */
@Configuration
public class ReactApiDepsConfig {

    @Bean
    public ReactApiController.ReactApiDeps reactApiDeps(
            CustomerRepository customerRepository,
            VendorRepository vendorRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository,
            ItemRepository itemRepository,
            WishlistRepository wishlistRepository,
            ReviewRepository reviewRepository,
            ReviewImageRepository reviewImageRepository,
            RefundRepository refundRepository,
            RefundImageRepository refundImageRepository,
            OrderDisputeRepository orderDisputeRepository,
            AutoAssignLogRepository autoAssignLogRepository,
            CashSettlementRepository cashSettlementRepository,
            CloudinaryHelper cloudinaryHelper,
            CouponRepository couponRepository,
            AiAssistantService aiAssistantService,
            RefundService refundService,
            SocialAuthService socialAuthService,
            OAuthProviderValidator oAuthProviderValidator,
            StockAlertService stockAlertService,
            OtpService otpService,
            AdminAuthService adminAuthService,
            EmailSender emailSender,
            RazorpayService razorpayService,
            InvoiceService invoiceService,
            JwtUtil jwtUtil,
            DeliveryRefreshTokenUtil deliveryRefreshTokenUtil,
            DeliveryBoyRepository deliveryBoyRepository,
            WarehouseRepository warehouseRepository,
            WarehouseService warehouseService,
            WarehouseRoutingService warehouseRoutingService,
            WarehouseTransferService warehouseTransferService,
            DeliveryOtpRepository deliveryOtpRepository,
            WarehouseChangeRequestRepository warehouseChangeRequestRepository,
            TrackingEventLogRepository trackingEventLogRepository,
            BannerRepository bannerRepository,
            StockAlertRepository stockAlertRepository,
            @Nullable com.example.ekart.deprecation.ThymeleafDeprecationTracker deprecationTracker
    ) {
        return new ReactApiController.ReactApiDeps(
                customerRepository,
                vendorRepository,
                productRepository,
                orderRepository,
                itemRepository,
                wishlistRepository,
                reviewRepository,
                reviewImageRepository,
                refundRepository,
                refundImageRepository,
                orderDisputeRepository,
                autoAssignLogRepository,
                cashSettlementRepository,
                cloudinaryHelper,
                couponRepository,
                aiAssistantService,
                refundService,
                socialAuthService,
                oAuthProviderValidator,
                stockAlertService,
                otpService,
                adminAuthService,
                emailSender,
                razorpayService,
                invoiceService,
                jwtUtil,
                deliveryRefreshTokenUtil,
                deliveryBoyRepository,
                warehouseRepository,
                warehouseService,
                warehouseRoutingService,
                warehouseTransferService,
                deliveryOtpRepository,
                warehouseChangeRequestRepository,
                trackingEventLogRepository,
                bannerRepository,
                stockAlertRepository,
                deprecationTracker
        );
    }
}