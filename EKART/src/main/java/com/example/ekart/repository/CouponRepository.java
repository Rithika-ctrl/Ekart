package com.example.ekart.repository;

import com.example.ekart.dto.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, Integer> {
    Optional<Coupon> findByCode(String code);
    List<Coupon> findAllByOrderByIdDesc();
    List<Coupon> findByActiveTrue();
}