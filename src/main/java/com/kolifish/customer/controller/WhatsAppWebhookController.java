package com.kolifish.customer.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/whatsapp/webhook")
public class WhatsAppWebhookController {

    @Value("${whatsapp.webhook.verify-token}")
    private String verifyToken;

    /*
     * Meta uses this GET request to verify your webhook.
     */
    @GetMapping
    public ResponseEntity<String> verifyWebhook(
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.verify_token", required = false) String token,
            @RequestParam(name = "hub.challenge", required = false) String challenge) {

        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            return ResponseEntity.ok(challenge);
        }

        return ResponseEntity.status(403).body("Verification failed");
    }

    /*
     * Meta sends WhatsApp events here.
     */
    @PostMapping
    public ResponseEntity<String> receiveWebhook(
            @RequestBody String payload) {

        System.out.println("========== WHATSAPP WEBHOOK ==========");
        System.out.println(payload);
        System.out.println("======================================");

        return ResponseEntity.ok("EVENT_RECEIVED");
    }
}