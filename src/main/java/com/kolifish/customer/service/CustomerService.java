package com.kolifish.customer.service;

import com.kolifish.customer.entity.Area;
import com.kolifish.customer.entity.Customer;
import com.kolifish.customer.repository.AreaRepository;
import com.kolifish.customer.repository.CustomerRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final AreaRepository areaRepository;

    public CustomerService(
            CustomerRepository customerRepository,
            AreaRepository areaRepository) {

        this.customerRepository = customerRepository;
        this.areaRepository = areaRepository;
    }

    // =========================
    // CREATE CUSTOMER
    // =========================

    public Customer createCustomer(Customer customer) {

        if (customer.getArea() != null &&
                customer.getArea().getId() != null) {

            Area area = areaRepository.findById(
                    customer.getArea().getId()
            ).orElseThrow(() ->
                    new RuntimeException("Area not found")
            );

            customer.setArea(area);
        }

        return customerRepository.save(customer);
    }


    // =========================
    // GET ALL CUSTOMERS
    // =========================

    public List<Customer> getAllCustomers() {

        return customerRepository.findAll();
    }


    // =========================
    // GET CUSTOMER BY ID
    // =========================

    public Optional<Customer> getCustomerById(Long id) {

        return customerRepository.findById(id);
    }


    // =========================
    // UPDATE CUSTOMER
    // =========================

    public Customer updateCustomer(
            Long id,
            Customer customerDetails) {

        Customer customer =
                customerRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Customer not found"
                                )
                        );


        customer.setName(
                customerDetails.getName()
        );

        customer.setPhone(
                customerDetails.getPhone()
        );

        customer.setEmail(
                customerDetails.getEmail()
        );

        customer.setAddress(
                customerDetails.getAddress()
        );


        // Update Area
        if (customerDetails.getArea() != null &&
                customerDetails.getArea().getId() != null) {

            Area area =
                    areaRepository.findById(
                                    customerDetails
                                            .getArea()
                                            .getId()
                            )
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Area not found"
                                    )
                            );

            customer.setArea(area);

        } else {

            customer.setArea(null);
        }


        return customerRepository.save(customer);
    }


    // =========================
    // DELETE CUSTOMER
    // =========================

    public void deleteCustomer(Long id) {

        if (!customerRepository.existsById(id)) {

            throw new RuntimeException(
                    "Customer not found"
            );
        }

        customerRepository.deleteById(id);
    }
}