package com.example.ekart.repository;
import java.util.Optional;

import com.example.ekart.dto.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, Integer> {
    Optional<Coupon> findByCode(String code);
    List<Coupon> findAllByOrderByIdDesc();
    List<Coupon> findByActiveTrue();
}
