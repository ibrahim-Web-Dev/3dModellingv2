package com.example.backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "apartments")
public class Apartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String number; // Apartment number (e.g., "1A", "2B")
    private int floor;
    private double price;
    private String status; // For Sale, Sold, Reserved
    private String description;

    // Default constructor
    public Apartment() {
    }

    public Apartment(String number, int floor, double price, String status, String description) {
        this.number = number;
        this.floor = floor;
        this.price = price;
        this.status = status;
        this.description = description;
    }
}
