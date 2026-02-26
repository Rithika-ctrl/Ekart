package com.example.ekart.dto;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import lombok.Data;

@Data
@Entity
public class Cart {

	@Id
	@GeneratedValue
	private int id;

	@OneToMany(
    mappedBy = "cart",
    cascade = CascadeType.ALL,
    fetch = FetchType.EAGER
)
private List<Item> items = new ArrayList<>();
}