package com.example.backend.config;

import com.example.backend.model.Apartment;
import com.example.backend.repository.ApartmentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final ApartmentRepository apartmentRepository;

    public DataSeeder(ApartmentRepository apartmentRepository) {
        this.apartmentRepository = apartmentRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (apartmentRepository.count() == 0) {
            apartmentRepository
                    .save(new Apartment("1", 1, 150000.0, "For Sale", "Cosy 1-bedroom apartment with a view"));
            apartmentRepository.save(new Apartment("2", 1, 155000.0, "Sold", "Renovated 1-bedroom apartment"));
            apartmentRepository.save(new Apartment("3", 2, 200000.0, "For Sale", "Spacious 2-bedroom apartment"));
            apartmentRepository.save(new Apartment("4", 2, 210000.0, "Reserved", "Luxury 2-bedroom apartment"));
            apartmentRepository.save(new Apartment("5", 3, 300000.0, "For Sale", "Penthouse with private terrace"));
            System.out.println("Data seeded!");
        }
    }
}
