package com.kolifish.customer.service;

import com.kolifish.customer.dto.OrderRequest;
import com.kolifish.customer.entity.Customer;
import com.kolifish.customer.entity.Order;
import com.kolifish.customer.entity.OrderItem;
import com.kolifish.customer.entity.Product;
import com.kolifish.customer.repository.CustomerRepository;
import com.kolifish.customer.repository.OrderRepository;
import com.kolifish.customer.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;

    public OrderService(
            OrderRepository orderRepository,
            CustomerRepository customerRepository,
            ProductRepository productRepository) {

        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
    }


    // =========================================================
    // CREATE ORDER
    // =========================================================

    public Order createOrder(OrderRequest request) {

        // Validate customer
        if (request.getCustomerId() == null) {
            throw new RuntimeException("Customer ID is required");
        }

        Customer customer = customerRepository
                .findById(request.getCustomerId())
                .orElseThrow(() ->
                        new RuntimeException("Customer not found"));


        // Validate product
        if (request.getProductId() == null) {
            throw new RuntimeException("Product ID is required");
        }

        Product product = productRepository
                .findById(request.getProductId())
                .orElseThrow(() ->
                        new RuntimeException("Product not found"));


        // Validate quantity
        if (request.getQuantity() == null ||
                request.getQuantity() <= 0) {

            throw new RuntimeException(
                    "Quantity must be greater than zero");
        }


        // Create order
        Order order = new Order();

        order.setCustomer(customer);

        if (request.getStatus() != null &&
                !request.getStatus().isBlank()) {

            order.setStatus(request.getStatus());

        } else {

            order.setStatus("PENDING");
        }


        // Create order item
        OrderItem item = new OrderItem();

        item.setOrder(order);
        item.setProduct(product);
        item.setQuantity(request.getQuantity());


        // Always use price from database
        double unitPrice = product.getPrice();

        double subtotal =
                request.getQuantity() * unitPrice;

        item.setUnitPrice(unitPrice);
        item.setSubtotal(subtotal);


        // Add item to order
        order.getItems().add(item);

        order.setTotalAmount(subtotal);


        // Save
        return orderRepository.save(order);
    }


    // =========================================================
    // GET ALL ORDERS
    // =========================================================

    public List<Order> getAllOrders() {

        return orderRepository.findAll();
    }


    // =========================================================
    // GET ORDER BY ID
    // =========================================================

    public Order getOrderById(Long id) {

        return orderRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Order not found"));
    }


    // =========================================================
    // UPDATE ORDER
    // =========================================================

    public Order updateOrder(Long id, OrderRequest request) {

        // Find existing order
        Order order = orderRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Order not found"));


        // -----------------------------------------------------
        // Validate customer
        // -----------------------------------------------------

        if (request.getCustomerId() == null) {
            throw new RuntimeException("Customer ID is required");
        }

        Customer customer = customerRepository
                .findById(request.getCustomerId())
                .orElseThrow(() ->
                        new RuntimeException("Customer not found"));

        order.setCustomer(customer);


        // -----------------------------------------------------
        // Validate product
        // -----------------------------------------------------

        if (request.getProductId() == null) {
            throw new RuntimeException("Product ID is required");
        }

        Product product = productRepository
                .findById(request.getProductId())
                .orElseThrow(() ->
                        new RuntimeException("Product not found"));


        // -----------------------------------------------------
        // Validate quantity
        // -----------------------------------------------------

        if (request.getQuantity() == null ||
                request.getQuantity() <= 0) {

            throw new RuntimeException(
                    "Quantity must be greater than zero");
        }


        // -----------------------------------------------------
        // Get existing order item
        // -----------------------------------------------------

        OrderItem item;

        if (order.getItems() == null ||
                order.getItems().isEmpty()) {

            item = new OrderItem();

            item.setOrder(order);

            order.getItems().add(item);

        } else {

            // Currently one product per order
            item = order.getItems().get(0);
        }


        // -----------------------------------------------------
        // Update product and quantity
        // -----------------------------------------------------

        item.setProduct(product);

        item.setQuantity(request.getQuantity());


        // -----------------------------------------------------
        // Get latest product price from database
        // -----------------------------------------------------

        double unitPrice = product.getPrice();

        double subtotal =
                request.getQuantity() * unitPrice;

        item.setUnitPrice(unitPrice);

        item.setSubtotal(subtotal);


        // -----------------------------------------------------
        // Update order total
        // -----------------------------------------------------

        order.setTotalAmount(subtotal);


        // -----------------------------------------------------
        // Update status
        // -----------------------------------------------------

        if (request.getStatus() != null &&
                !request.getStatus().isBlank()) {

            order.setStatus(request.getStatus());

        } else {

            order.setStatus("PENDING");
        }


        // -----------------------------------------------------
        // Save updated order
        // -----------------------------------------------------

        return orderRepository.save(order);
    }


    // =========================================================
    // DELETE ORDER
    // =========================================================

    public void deleteOrder(Long id) {

        if (!orderRepository.existsById(id)) {

            throw new RuntimeException(
                    "Order not found");
        }

        orderRepository.deleteById(id);
    }
}

