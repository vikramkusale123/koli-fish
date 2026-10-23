
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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

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

        String status = normalizeStatus(request.getStatus());

        Order order = new Order();
        order.setCustomer(customer);
        order.setStatus(status);
        order.setStockDeducted(false);

        double orderTotal = 0.0;

        List<OrderItem> newItems = new ArrayList<>();
        Map<Long, Double> newQuantities = new LinkedHashMap<>();

        for (OrderItemRequest itemRequest : request.getItems()) {

            validateItem(itemRequest);

            Product product = productRepository
                    .findById(itemRequest.getProductId())
                    .orElseThrow(() ->
                            new RuntimeException("Product not found"));

            validateProductPrice(product);

            double quantity = itemRequest.getQuantity();
            double unitPrice = product.getPrice();
            double subtotal = quantity * unitPrice;

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(quantity);
            item.setUnitPrice(unitPrice);
            item.setSubtotal(subtotal);

            newItems.add(item);

            newQuantities.merge(
                    product.getId(), quantity, Double::sum);

            orderTotal += subtotal;
        }

        // Deduct stock only when the new order starts as PROCESSING.
        if ("PROCESSING".equals(status)) {
            adjustStock(
                    Map.of(),
                    newQuantities
            );

            order.setStockDeducted(true);
        }

        order.getItems().addAll(newItems);
        order.setTotalAmount(orderTotal);

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
        String newStatus = normalizeStatus(request.getStatus());

        if (request.getCustomerId() == null) {
            throw new RuntimeException("Customer ID is required");
        }

        Customer customer = customerRepository
                .findById(request.getCustomerId())
                .orElseThrow(() ->
                        new RuntimeException("Customer not found"));

        validateItems(request.getItems());

        // Remember previous quantities before clearing order items.
        Map<Long, Double> oldQuantities = new LinkedHashMap<>();

        if (Boolean.TRUE.equals(order.getStockDeducted())) {
            for (OrderItem oldItem : order.getItems()) {

                if (oldItem.getProduct() == null
                        || oldItem.getProduct().getId() == null
                        || oldItem.getQuantity() == null) {
                    throw new RuntimeException(
                            "Existing order contains invalid stock information");
                }

                oldQuantities.merge(
                        oldItem.getProduct().getId(),
                        oldItem.getQuantity(),
                        Double::sum
                );
            }
        }

        List<OrderItem> newItems = new ArrayList<>();
        Map<Long, Double> newQuantities = new LinkedHashMap<>();
        double orderTotal = 0.0;

        for (OrderItemRequest itemRequest : request.getItems()) {

            validateItem(itemRequest);

            Product product = productRepository
                    .findById(itemRequest.getProductId())
                    .orElseThrow(() ->
                            new RuntimeException("Product not found"));

            validateProductPrice(product);

            double quantity = itemRequest.getQuantity();
            double unitPrice = product.getPrice();
            double subtotal = quantity * unitPrice;

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(quantity);
            item.setUnitPrice(unitPrice);
            item.setSubtotal(subtotal);

            newItems.add(item);

            newQuantities.merge(
                    product.getId(), quantity, Double::sum);

            orderTotal += subtotal;
        }

        boolean stockWasDeducted =
                Boolean.TRUE.equals(order.getStockDeducted());

        boolean shouldDeductStock =
                "PROCESSING".equals(newStatus);

        /*
         * Reconcile stock:
         *
         * Already deducted + still PROCESSING:
         * Restore old quantities, then deduct new quantities.
         *
         * Not deducted + now PROCESSING:
         * Deduct the new quantities.
         *
         * Already deducted + no longer PROCESSING:
         * Restore old quantities.
         *
         * Not deducted + not PROCESSING:
         * No stock change.
         */
        Map<Long, Double> quantitiesToRestore =
                stockWasDeducted ? oldQuantities : Map.of();

        Map<Long, Double> quantitiesToDeduct =
                shouldDeductStock ? newQuantities : Map.of();

        adjustStock(
                quantitiesToRestore,
                quantitiesToDeduct
        );

        // Keep the existing managed collection for orphanRemoval.
        order.getItems().clear();
        order.getItems().addAll(newItems);

        order.setCustomer(customer);
        order.setTotalAmount(orderTotal);
        order.setStatus(newStatus);
        order.setStockDeducted(shouldDeductStock);

        Order savedOrder = orderRepository.saveAndFlush(order);

        // Preserve the existing status-change WhatsApp behavior.
        sendWhatsAppNotification(
                savedOrder, oldStatus, newStatus);

        return savedOrder;
    }

    // =========================================================
    // ADJUST PRODUCT STOCK
    // =========================================================

    private void adjustStock(
            Map<Long, Double> quantitiesToRestore,
            Map<Long, Double> quantitiesToDeduct) {

        Set<Long> productIds = new LinkedHashSet<>();
        productIds.addAll(quantitiesToRestore.keySet());
        productIds.addAll(quantitiesToDeduct.keySet());

        Map<Long, Product> products = new LinkedHashMap<>();
        Map<Long, Double> finalQuantities = new LinkedHashMap<>();

        // Validate every resulting stock level before changing any.
        for (Long productId : productIds) {

            Product product = productRepository
                    .findById(productId)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Product not found: " + productId));

            Double currentStock = product.getStockQuantity();

            if (currentStock == null) {
                throw new RuntimeException(
                        "Stock quantity is not set for product: "
                                + product.getName()
                                + ". Please set its stock in kilograms first.");
            }

            double restore =
                    quantitiesToRestore.getOrDefault(productId, 0.0);

            double deduct =
                    quantitiesToDeduct.getOrDefault(productId, 0.0);

            double resultingStock = currentStock + restore - deduct;

            if (resultingStock < -0.000001) {
                throw new RuntimeException(
                        "Insufficient stock for "
                                + product.getName()
                                + ". Available after restoring previous order: "
                                + (currentStock + restore)
                                + " kg; required: "
                                + deduct
                                + " kg.");
            }

            // Avoid a tiny negative caused by floating-point rounding.
            if (resultingStock < 0) {
                resultingStock = 0.0;
            }

            products.put(productId, product);
            finalQuantities.put(productId, resultingStock);
        }

        // Apply the changes only after all products pass validation.
        for (Long productId : productIds) {
            Product product = products.get(productId);
            product.setStockQuantity(finalQuantities.get(productId));
        }

        // Products are managed JPA entities; save explicitly for clarity.
        if (!products.isEmpty()) {
            productRepository.saveAll(products.values());
            productRepository.flush();
        }
    }

    // =========================================================
    // DELETE ORDER
    // =========================================================

    @Transactional
    public void deleteOrder(Long id) {

        Order order = orderRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Order not found"));

        // Restore stock when deleting an order whose stock was deducted.
        if (Boolean.TRUE.equals(order.getStockDeducted())) {

            Map<Long, Double> quantitiesToRestore =
                    new LinkedHashMap<>();

            for (OrderItem item : order.getItems()) {

                if (item.getProduct() == null
                        || item.getProduct().getId() == null
                        || item.getQuantity() == null) {
                    throw new RuntimeException(
                            "Order contains invalid stock information");
                }

                quantitiesToRestore.merge(
                        item.getProduct().getId(),
                        item.getQuantity(),
                        Double::sum
                );
            }

            adjustStock(quantitiesToRestore, Map.of());
        }

        orderRepository.delete(order);
    }

    // =========================================================
    // VALIDATION
    // =========================================================

    private void validateItems(List<OrderItemRequest> items) {
        if (items == null || items.isEmpty()) {
            throw new RuntimeException(
                    "At least one product is required");
        }
    }

    private void validateItem(OrderItemRequest item) {

        if (item == null) {
            throw new RuntimeException("Order item is required");
        }

        if (item.getProductId() == null) {
            throw new RuntimeException("Product ID is required");
        }

        if (item.getQuantity() == null
                || !Double.isFinite(item.getQuantity())
                || item.getQuantity() <= 0) {
            throw new RuntimeException(
                    "Quantity must be a valid number greater than zero");
        }
    }

    private void validateProductPrice(Product product) {
        if (product.getPrice() == null
                || !Double.isFinite(product.getPrice())
                || product.getPrice() < 0) {
            throw new RuntimeException("Product price is invalid");
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
