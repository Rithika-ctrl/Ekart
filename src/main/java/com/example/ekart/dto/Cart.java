package com.example.ekart.dto;

import java.util.ArrayList;
import java.util.List;
<<<<<<< HEAD
=======

>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
<<<<<<< HEAD
import java.io.Serializable;

=======
import lombok.Data;
import java.io.Serializable;

@Data
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
@Entity
public class Cart implements Serializable {
	private static final long serialVersionUID = 1L;

	@Id
	@GeneratedValue
	private int id;

<<<<<<< HEAD
	@OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
	private List<Item> items = new ArrayList<>();

	public int getId() { return id; }
	public void setId(int id) { this.id = id; }
	public List<Item> getItems() { return items; }
	public void setItems(List<Item> items) { this.items = items; }
=======
	@OneToMany(
    mappedBy = "cart",
    cascade = CascadeType.ALL,
    fetch = FetchType.EAGER
)
private List<Item> items = new ArrayList<>();
>>>>>>> 613c85671990addeef77db0b6e52a990f48f2f57
}