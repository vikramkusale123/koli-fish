package com.kolifish.customer.service;

import com.kolifish.customer.dto.OrderItemRequest;
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


        // Validate items
        if (request.getItems() == null ||
                request.getItems().isEmpty()) {

            throw new RuntimeException(
                    "At least one product is required");
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


        double orderTotal = 0.0;


        // =====================================================
        // CREATE ORDER ITEMS
        // =====================================================

        for (OrderItemRequest itemRequest : request.getItems()) {

            // Validate product
            if (itemRequest.getProductId() == null) {

                throw new RuntimeException(
                        "Product ID is required");
            }

            Product product = productRepository
                    .findById(itemRequest.getProductId())
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Product not found"));


            // Validate quantity
            if (itemRequest.getQuantity() == null ||
                    itemRequest.getQuantity() <= 0) {

                throw new RuntimeException(
                        "Quantity must be greater than zero");
            }


            // Create order item
            OrderItem item = new OrderItem();

            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(itemRequest.getQuantity());


            // Always use price from database
            double unitPrice = product.getPrice();

            double subtotal =
                    itemRequest.getQuantity() * unitPrice;

            item.setUnitPrice(unitPrice);
            item.setSubtotal(subtotal);


            // Add item to order
            order.getItems().add(item);


            // Add to order total
            orderTotal += subtotal;
        }


        // Set final order total
        order.setTotalAmount(orderTotal);


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

    public Order updateOrder(
            Long id,
            OrderRequest request) {

        // Find existing order
        Order order = orderRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Order not found"));


        // -----------------------------------------------------
        // Validate customer
        // -----------------------------------------------------

        if (request.getCustomerId() == null) {

            throw new RuntimeException(
                    "Customer ID is required");
        }

        Customer customer = customerRepository
                .findById(request.getCustomerId())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Customer not found"));

        order.setCustomer(customer);


        // -----------------------------------------------------
        // Validate items
        // -----------------------------------------------------

        if (request.getItems() == null ||
                request.getItems().isEmpty()) {

            throw new RuntimeException(
                    "At least one product is required");
        }


        // -----------------------------------------------------
        // Remove old items
        // -----------------------------------------------------

        order.getItems().clear();


        double orderTotal = 0.0;


        // =====================================================
        // CREATE UPDATED ORDER ITEMS
        // =====================================================

        for (OrderItemRequest itemRequest : request.getItems()) {

            // Validate product
            if (itemRequest.getProductId() == null) {

                throw new RuntimeException(
                        "Product ID is required");
            }

            Product product = productRepository
                    .findById(itemRequest.getProductId())
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Product not found"));


            // Validate quantity
            if (itemRequest.getQuantity() == null ||
                    itemRequest.getQuantity() <= 0) {

                throw new RuntimeException(
                        "Quantity must be greater than zero");
            }


            // Create new order item
            OrderItem item = new OrderItem();

            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(itemRequest.getQuantity());


            // Get latest product price
            double unitPrice = product.getPrice();

            double subtotal =
                    itemRequest.getQuantity() * unitPrice;

            item.setUnitPrice(unitPrice);
            item.setSubtotal(subtotal);


            // Add item
            order.getItems().add(item);


            // Add subtotal to order total
            orderTotal += subtotal;
        }


        // -----------------------------------------------------
        // Update order total
        // -----------------------------------------------------

        order.setTotalAmount(orderTotal);


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
