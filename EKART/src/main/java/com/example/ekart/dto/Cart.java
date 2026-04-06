package com.example.ekart.dto;

import java.util.ArrayList;
import java.util.List;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import java.io.Serializable;

@Embeddable
public class Cart implements Serializable {
	private static final long serialVersionUID = 1L;

	@OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
	private List<Item> items = new ArrayList<>();

	public List<Item> getItems() { return items; }
	public void setItems(List<Item> items) { this.items = items; }
}