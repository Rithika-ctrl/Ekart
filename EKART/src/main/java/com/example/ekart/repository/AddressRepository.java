package com.example.ekart.repository;

import com.example.ekart.dto.Address;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AddressRepository extends JpaRepository<Address, Integer> {
}