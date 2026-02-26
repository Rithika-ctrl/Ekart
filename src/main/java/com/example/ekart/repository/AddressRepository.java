package com.example.ekart.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.ekart.dto.Address;

public interface AddressRepository extends JpaRepository<Address, Integer> {
}