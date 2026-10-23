
package com.kolifish.customer.service;

import com.kolifish.customer.entity.Customer;
import com.kolifish.customer.entity.Order;
import com.kolifish.customer.entity.OrderItem;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class WhatsAppService {

    private static final Logger log =
            LoggerFactory.getLogger(WhatsAppService.class);

    private final RestClient restClient;

    @Value("${whatsapp.phone-number-id}")
    private String phoneNumberId;

    @Value("${whatsapp.access-token}")
    private String accessToken;

    @Value("${whatsapp.graph-api-version}")
    private String graphApiVersion;

    @Value("${whatsapp.processing-template}")
    private String processingTemplate;

    @Value("${whatsapp.completed-template}")
    private String completedTemplate;

    @Value("${whatsapp.template-language:en_US}")
    private String templateLanguage;

    public WhatsAppService(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder.build();
    }

    // Processing notification
    public boolean sendProcessingMessage(Order order) {
        return sendOrderStatusMessage(order, processingTemplate);
    }

    // Completed / delivered notification
    public boolean sendCompletedMessage(Order order) {
        return sendOrderStatusMessage(order, completedTemplate);
    }

    // Prepare and send an order status notification
    private boolean sendOrderStatusMessage(
            Order order,
            String templateName) {

        if (order == null) {
            log.warn("WhatsApp notification skipped: order is null.");
            return false;
        }

        if (phoneNumberId == null || phoneNumberId.isBlank()
                || accessToken == null || accessToken.isBlank()
                || graphApiVersion == null || graphApiVersion.isBlank()) {

            log.error("WhatsApp configuration is incomplete.");
            return false;
        }

        if (templateName == null || templateName.isBlank()) {
            log.error("WhatsApp template name is missing.");
            return false;
        }

        Customer customer = order.getCustomer();

        if (customer == null) {
            log.warn(
                    "WhatsApp notification skipped: customer is null for order {}.",
                    order.getId()
            );
            return false;
        }

        String phone = normalizeIndianPhoneNumber(customer.getPhone());

        if (phone == null) {
            log.warn(
                    "WhatsApp notification skipped: invalid phone for order {}.",
                    order.getId()
            );
            return false;
        }

        String customerName = customer.getName();

        if (customerName == null || customerName.isBlank()) {
            customerName = "Customer";
        }

        String orderItems = buildOrderItems(order);
        String amount = formatAmount(order.getTotalAmount());

        List<Map<String, Object>> parameters = new ArrayList<>();

        // {{1}} Customer name
        parameters.add(textParameter(customerName));

        // {{2}} Fish names, quantities, and item subtotals
        parameters.add(textParameter(orderItems));

        // {{3}} Total order amount
        parameters.add(textParameter(amount));

        log.info(
                "Preparing WhatsApp notification: order={}, template={}",
                order.getId(),
                templateName
        );

        return sendTemplateMessage(
                phone,
                templateName,
                parameters,
                order.getId()
        );
    }

    // Send WhatsApp Cloud API request
    private boolean sendTemplateMessage(
            String phone,
            String templateName,
            List<Map<String, Object>> parameters,
            Long orderId) {

        String url = "https://graph.facebook.com/"
                + graphApiVersion
                + "/"
                + phoneNumberId
                + "/messages";

        Map<String, Object> language = new HashMap<>();
        language.put("code", templateLanguage);

        Map<String, Object> template = new HashMap<>();
        template.put("name", templateName);
        template.put("language", language);

        Map<String, Object> bodyComponent = new HashMap<>();
        bodyComponent.put("type", "body");
        bodyComponent.put("parameters", parameters);

        template.put("components", List.of(bodyComponent));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("messaging_product", "whatsapp");
        requestBody.put("recipient_type", "individual");
        requestBody.put("to", phone);
        requestBody.put("type", "template");
        requestBody.put("template", template);

        try {
            Map<?, ?> response = restClient
                    .post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            // Log the complete API response for diagnosis
            log.info(
                    "WhatsApp API full response for order {}: {}",
                    orderId,
                    response
            );

            if (response != null
                    && response.get("messages") instanceof List<?> messages
                    && !messages.isEmpty()) {

                Object firstMessage = messages.get(0);

                if (firstMessage instanceof Map<?, ?> message) {
                    Object messageId = message.get("id");
                    Object messageStatus = message.get("message_status");

                    log.info(
                            "WhatsApp result: order={}, template={}, messageId={}, status={}",
                            orderId,
                            templateName,
                            messageId,
                            messageStatus
                    );

                    if (messageId != null) {
                        log.info(
                                "WhatsApp API accepted the request for order {}. "
                                        + "Delivery is not yet confirmed.",
                                orderId
                        );

                        return true;
                    }
                }
            }

            log.error(
                    "WhatsApp API response did not contain a valid message ID "
                            + "for order {}.",
                    orderId
            );

            return false;

        } catch (RestClientResponseException e) {

            log.error(
                    "WhatsApp API error for order {}. HTTP status: {}. Response: {}",
                    orderId,
                    e.getStatusCode(),
                    e.getResponseBodyAsString()
            );

            return false;

        } catch (Exception e) {

            log.error(
                    "WhatsApp request failed for order {}: {}",
                    orderId,
                    e.getMessage(),
                    e
            );

            return false;
        }
    }

    // Build summary of all fish in the order
    private String buildOrderItems(Order order) {

        if (order.getItems() == null || order.getItems().isEmpty()) {
            return "Order details unavailable";
        }

        List<String> descriptions = new ArrayList<>();

        for (OrderItem item : order.getItems()) {

            if (item == null) {
                continue;
            }

            String productName = "Fish";

            if (item.getProduct() != null
                    && item.getProduct().getName() != null
                    && !item.getProduct().getName().isBlank()) {

                productName = item.getProduct().getName();
            }

            String quantity = formatQuantity(item.getQuantity());
            String subtotal = formatAmount(item.getSubtotal());

            descriptions.add(
                    productName
                            + " x " + quantity
                            + " - Rs. " + subtotal
            );
        }

        if (descriptions.isEmpty()) {
            return "Order details unavailable";
        }

        return String.join("; ", descriptions);
    }

    // Format quantity
    private String formatQuantity(Double quantity) {

        if (quantity == null) {
            return "0";
        }

        if (quantity % 1 == 0) {
            return String.valueOf(quantity.longValue());
        }

        return String.format(Locale.US, "%s", quantity);
    }

    // Format amount
    private String formatAmount(Double amount) {

        if (amount == null) {
            return "0.00";
        }

        return String.format(Locale.US, "%.2f", amount);
    }

    // Create a WhatsApp text parameter
    private Map<String, Object> textParameter(String value) {

        Map<String, Object> parameter = new HashMap<>();

        parameter.put("type", "text");
        parameter.put("text", value == null ? "" : value);

        return parameter;
    }

    // Normalize Indian mobile numbers
    private String normalizeIndianPhoneNumber(String phone) {

        if (phone == null || phone.isBlank()) {
            return null;
        }

        String digits = phone.replaceAll("\\D", "");

        // Example: 9823920339 -> 919823920339
        if (digits.length() == 10) {

            if (!digits.matches("[6-9][0-9]{9}")) {
                return null;
            }

            return "91" + digits;
        }

        // Example: 09823920339 -> 919823920339
        if (digits.length() == 11 && digits.startsWith("0")) {

            String mobile = digits.substring(1);

            if (!mobile.matches("[6-9][0-9]{9}")) {
                return null;
            }

            return "91" + mobile;
        }

        // Already in Indian international format
        if (digits.length() == 12 && digits.startsWith("91")) {

            String mobile = digits.substring(2);

            if (!mobile.matches("[6-9][0-9]{9}")) {
                return null;
            }

            return digits;
        }

        return null;
    }
}
