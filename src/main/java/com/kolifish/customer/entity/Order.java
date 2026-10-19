package com.kolifish.customer.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "order_date", nullable = false)
    private LocalDateTime orderDate;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount = 0.0;

    @Column(nullable = false)
    private String status = "PENDING";

    // WhatsApp notification tracking
    @Column(name = "processing_whatsapp_sent", nullable = false)
    private Boolean processingWhatsappSent = false;

    @Column(name = "completed_whatsapp_sent", nullable = false)
    private Boolean completedWhatsappSent = false;

    // Order items
    @OneToMany(
            mappedBy = "order",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<OrderItem> items = new ArrayList<>();

    public Order() {
    }

    @PrePersist
    protected void onCreate() {

        if (orderDate == null) {
            orderDate = LocalDateTime.now();
        }

        if (status == null || status.isBlank()) {
            status = "PENDING";
        }

        if (totalAmount == null) {
            totalAmount = 0.0;
        }

        if (processingWhatsappSent == null) {
            processingWhatsappSent = false;
        }

        if (completedWhatsappSent == null) {
            completedWhatsappSent = false;
        }
    }

    // Getters and setters

    public Long getId() {
        return id;
    }

    public Customer getCustomer() {
        return customer;
    }

    public void setCustomer(Customer customer) {
        this.customer = customer;
    }

    public LocalDateTime getOrderDate() {
        return orderDate;
    }

    public void setOrderDate(LocalDateTime orderDate) {
        this.orderDate = orderDate;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public void setItems(List<OrderItem> items) {
        this.items.clear();

        if (items != null) {
            for (OrderItem item : items) {
                item.setOrder(this);
                this.items.add(item);
            }
        }
    }

    public Boolean getProcessingWhatsappSent() {
        return processingWhatsappSent;
    }

    public void setProcessingWhatsappSent(Boolean processingWhatsappSent) {
        this.processingWhatsappSent = processingWhatsappSent;
    }

    public Boolean getCompletedWhatsappSent() {
        return completedWhatsappSent;
    }

    public void setCompletedWhatsappSent(Boolean completedWhatsappSent) {
        this.completedWhatsappSent = completedWhatsappSent;
    }
}