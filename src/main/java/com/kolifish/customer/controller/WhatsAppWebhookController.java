
package com.kolifish.customer.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/whatsapp/webhook")
public class WhatsAppWebhookController {

    private static final Logger log =
            LoggerFactory.getLogger(WhatsAppWebhookController.class);

    @Value("${whatsapp.webhook.verify-token}")
    private String verifyToken;

    // Meta uses this GET request to verify the webhook.
    @GetMapping
    public ResponseEntity<String> verifyWebhook(
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.verify_token", required = false) String token,
            @RequestParam(name = "hub.challenge", required = false) String challenge) {

        if ("subscribe".equals(mode)
                && verifyToken != null
                && verifyToken.equals(token)
                && challenge != null) {

            log.info("WhatsApp webhook verification successful.");
            return ResponseEntity.ok(challenge);
        }

        log.warn("WhatsApp webhook verification failed.");
        return ResponseEntity.status(403).body("Verification failed");
    }

    // Meta sends delivery statuses and incoming messages here.
    @PostMapping
    public ResponseEntity<String> receiveWebhook(
            @RequestBody String payload) {

        log.info("========== WHATSAPP WEBHOOK RECEIVED ==========");
        log.info("Webhook payload: {}", payload);

        if (payload.contains("\"statuses\"")) {
            if (payload.contains("\"status\":\"failed\"")) {
                log.error("WhatsApp message status is FAILED. Check the payload above for error details.");
            } else if (payload.contains("\"status\":\"delivered\"")) {
                log.info("WhatsApp message was DELIVERED.");
            } else if (payload.contains("\"status\":\"read\"")) {
                log.info("WhatsApp message was READ.");
            } else if (payload.contains("\"status\":\"sent\"")) {
                log.info("WhatsApp message was SENT.");
            }
        }

        log.info("========== END WHATSAPP WEBHOOK ==========");

        return ResponseEntity.ok("EVENT_RECEIVED");
    }
}
