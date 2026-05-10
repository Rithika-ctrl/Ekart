package com.example.ekart.controller;

import com.example.ekart.helper.EmailSender;
import com.example.ekart.repository.*;
import com.example.ekart.service.AdminAccountService;
import com.example.ekart.service.OtpService;
import org.springframework.stereotype.Component;

/**
 * Groups all repository and service dependencies for {@link FlutterApiController}
 * into a single injectable component, reducing the constructor parameter count
 * to satisfy SonarQube S107 (max 7 constructor parameters).
 */
@Component
public class FlutterApiDependencies {

    public final CustomerRepository               customerRepository;
    public final VendorRepository                 vendorRepository;
    public final ProductRepository                productRepository;
    public final OrderRepository                  orderRepository;
    public final ItemRepository                   itemRepository;
    public final WishlistRepository               wishlistRepository;
    public final ReviewRepository                 reviewRepository;
    public final RefundRepository                 refundRepository;
    public final StockAlertRepository             stockAlertRepository;
    public final BannerRepository                 bannerRepository;
    public final BackInStockRepository            backInStockRepository;
    public final DeliveryBoyRepository            deliveryBoyRepository;
    public final WarehouseRepository              warehouseRepository;
    public final TrackingEventLogRepository       trackingEventLogRepository;
    public final DeliveryOtpRepository            deliveryOtpRepository;
    public final WarehouseChangeRequestRepository warehouseChangeRequestRepository;
    public final EmailSender                      emailSender;
    public final CouponRepository                 couponRepository;
    public final AdminAccountService              adminAccountService;
    public final OtpService                       otpService;

    public FlutterApiDependencies(
            CustomerRepository               customerRepository,
            VendorRepository                 vendorRepository,
            ProductRepository                productRepository,
            OrderRepository                  orderRepository,
            ItemRepository                   itemRepository,
            WishlistRepository               wishlistRepository,
            ReviewRepository                 reviewRepository,
            RefundRepository                 refundRepository,
            StockAlertRepository             stockAlertRepository,
            BannerRepository                 bannerRepository,
            BackInStockRepository            backInStockRepository,
            DeliveryBoyRepository            deliveryBoyRepository,
            WarehouseRepository              warehouseRepository,
            TrackingEventLogRepository       trackingEventLogRepository,
            DeliveryOtpRepository            deliveryOtpRepository,
            WarehouseChangeRequestRepository warehouseChangeRequestRepository,
            EmailSender                      emailSender,
            CouponRepository                 couponRepository,
            AdminAccountService              adminAccountService,
            OtpService                       otpService) {
        this.customerRepository               = customerRepository;
        this.vendorRepository                 = vendorRepository;
        this.productRepository                = productRepository;
        this.orderRepository                  = orderRepository;
        this.itemRepository                   = itemRepository;
        this.wishlistRepository               = wishlistRepository;
        this.reviewRepository                 = reviewRepository;
        this.refundRepository                 = refundRepository;
        this.stockAlertRepository             = stockAlertRepository;
        this.bannerRepository                 = bannerRepository;
        this.backInStockRepository            = backInStockRepository;
        this.deliveryBoyRepository            = deliveryBoyRepository;
        this.warehouseRepository              = warehouseRepository;
        this.trackingEventLogRepository       = trackingEventLogRepository;
        this.deliveryOtpRepository            = deliveryOtpRepository;
        this.warehouseChangeRequestRepository = warehouseChangeRequestRepository;
        this.emailSender                      = emailSender;
        this.couponRepository                 = couponRepository;
        this.adminAccountService              = adminAccountService;
        this.otpService                       = otpService;
    }
}