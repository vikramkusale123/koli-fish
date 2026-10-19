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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class OrderService {

    private static final Logger log =
            LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final WhatsAppService whatsAppService;

    public OrderService(
            OrderRepository orderRepository,
            CustomerRepository customerRepository,
            ProductRepository productRepository,
            WhatsAppService whatsAppService) {

        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.whatsAppService = whatsAppService;
    }

    // =========================================================
    // CREATE ORDER
    // =========================================================

    @Transactional
    public Order createOrder(OrderRequest request) {

        if (request == null) {
            throw new RuntimeException("Order request is required");
        }

        if (request.getCustomerId() == null) {
            throw new RuntimeException("Customer ID is required");
        }

        Customer customer = customerRepository
                .findById(request.getCustomerId())
                .orElseThrow(() ->
                        new RuntimeException("Customer not found"));

        validateItems(request.getItems());

        Order order = new Order();
        order.setCustomer(customer);

        String status = normalizeStatus(request.getStatus());
        order.setStatus(status);

        double orderTotal = 0.0;

        for (OrderItemRequest itemRequest : request.getItems()) {

            if (itemRequest == null) {
                throw new RuntimeException("Order item is required");
            }

            if (itemRequest.getProductId() == null) {
                throw new RuntimeException("Product ID is required");
            }

            if (itemRequest.getQuantity() == null
                    || itemRequest.getQuantity() <= 0) {
                throw new RuntimeException(
                        "Quantity must be greater than zero");
            }

            Product product = productRepository
                    .findById(itemRequest.getProductId())
                    .orElseThrow(() ->
                            new RuntimeException("Product not found"));

            if (product.getPrice() == null || product.getPrice() < 0) {
                throw new RuntimeException(
                        "Product price is invalid");
            }

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(itemRequest.getQuantity());

            double unitPrice = product.getPrice();
            double subtotal = itemRequest.getQuantity() * unitPrice;

            item.setUnitPrice(unitPrice);
            item.setSubtotal(subtotal);

            order.getItems().add(item);
            orderTotal += subtotal;
        }

        order.setTotalAmount(orderTotal);

        // Save the order before sending the notification.
        Order savedOrder = orderRepository.saveAndFlush(order);

        sendWhatsAppNotification(savedOrder, null, status);

        return savedOrder;
    }

    // =========================================================
    // GET ALL ORDERS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    // =========================================================
    // GET ORDER BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Order getOrderById(Long id) {

        return orderRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Order not found"));
    }

    // =========================================================
    // UPDATE ORDER
    // =========================================================

    @Transactional
    public Order updateOrder(Long id, OrderRequest request) {

        if (request == null) {
            throw new RuntimeException("Order request is required");
        }

        Order order = orderRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Order not found"));

        String oldStatus = normalizeStatus(order.getStatus());

        if (request.getCustomerId() == null) {
            throw new RuntimeException("Customer ID is required");
        }

        Customer customer = customerRepository
                .findById(request.getCustomerId())
                .orElseThrow(() ->
                        new RuntimeException("Customer not found"));

        validateItems(request.getItems());

        order.setCustomer(customer);

        /*
         * Keep the existing managed collection.
         * orphanRemoval=true deletes removed items.
         */
        order.getItems().clear();

        double orderTotal = 0.0;

        for (OrderItemRequest itemRequest : request.getItems()) {

            if (itemRequest == null) {
                throw new RuntimeException("Order item is required");
            }

            if (itemRequest.getProductId() == null) {
                throw new RuntimeException("Product ID is required");
            }

            if (itemRequest.getQuantity() == null
                    || itemRequest.getQuantity() <= 0) {
                throw new RuntimeException(
                        "Quantity must be greater than zero");
            }

            Product product = productRepository
                    .findById(itemRequest.getProductId())
                    .orElseThrow(() ->
                            new RuntimeException("Product not found"));

            if (product.getPrice() == null || product.getPrice() < 0) {
                throw new RuntimeException(
                        "Product price is invalid");
            }

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(itemRequest.getQuantity());

            double unitPrice = product.getPrice();
            double subtotal = itemRequest.getQuantity() * unitPrice;

            item.setUnitPrice(unitPrice);
            item.setSubtotal(subtotal);

            order.getItems().add(item);
            orderTotal += subtotal;
        }

        order.setTotalAmount(orderTotal);

        String newStatus = normalizeStatus(request.getStatus());
        order.setStatus(newStatus);

        Order savedOrder = orderRepository.saveAndFlush(order);

        // Notify only if the status has changed.
        sendWhatsAppNotification(savedOrder, oldStatus, newStatus);

        return savedOrder;
    }

    // =========================================================
    // DELETE ORDER
    // =========================================================

    @Transactional
    public void deleteOrder(Long id) {

        if (!orderRepository.existsById(id)) {
            throw new RuntimeException("Order not found");
        }

        orderRepository.deleteById(id);
    }

    // =========================================================
    // VALIDATE ORDER ITEMS
    // =========================================================

    private void validateItems(List<OrderItemRequest> items) {

        if (items == null || items.isEmpty()) {
            throw new RuntimeException(
                    "At least one product is required");
        }
    }

    // =========================================================
    // WHATSAPP NOTIFICATION HANDLER
    // =========================================================

    private void sendWhatsAppNotification(
            Order order,
            String oldStatus,
            String newStatus) {

        if (order == null || newStatus == null) {
            return;
        }

        String normalizedNewStatus = normalizeStatus(newStatus);

        String normalizedOldStatus = oldStatus == null
                ? null
                : normalizeStatus(oldStatus);

        // Do not resend when an existing order's status is unchanged.
        if (normalizedOldStatus != null
                && normalizedOldStatus.equals(normalizedNewStatus)) {
            return;
        }

        try {

            if ("PROCESSING".equals(normalizedNewStatus)
                    && !Boolean.TRUE.equals(
                    order.getProcessingWhatsappSent())) {

                boolean accepted =
                        whatsAppService.sendProcessingMessage(order);

                if (accepted) {
                    order.setProcessingWhatsappSent(true);
                    orderRepository.saveAndFlush(order);

                    log.info(
                            "Processing WhatsApp API accepted message for order {}",
                            order.getId());
                }
            }

            if ("COMPLETED".equals(normalizedNewStatus)
                    && !Boolean.TRUE.equals(
                    order.getCompletedWhatsappSent())) {

                boolean accepted =
                        whatsAppService.sendCompletedMessage(order);

                if (accepted) {
                    order.setCompletedWhatsappSent(true);
                    orderRepository.saveAndFlush(order);

                    log.info(
                            "Completed WhatsApp API accepted message for order {}",
                            order.getId());
                }
            }

        } catch (Exception ex) {
            log.error(
                    "WhatsApp notification failed for order {}",
                    order.getId(),
                    ex);
        }
    }

    // =========================================================
    // NORMALIZE STATUS
    // =========================================================

    private String normalizeStatus(String status) {

        if (status == null || status.isBlank()) {
            return "PENDING";
        }

        return status.trim().toUpperCase(Locale.ROOT);
    }
}
