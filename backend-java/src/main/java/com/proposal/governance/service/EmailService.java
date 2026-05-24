package com.proposal.governance.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class EmailService {

    private final String filePath = System.getProperty("user.dir") + File.separator + "emails.json";
    private final ObjectMapper objectMapper;

    public EmailService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    public static class SandboxEmail {
        private String id = UUID.randomUUID().toString();
        private String toEmail = "";
        private String subject = "";
        private String body = "";
        private LocalDateTime sentAt = LocalDateTime.now();

        public SandboxEmail() {}

        public SandboxEmail(String toEmail, String subject, String body) {
            this.toEmail = toEmail;
            this.subject = subject;
            this.body = body;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getToEmail() { return toEmail; }
        public void setToEmail(String toEmail) { this.toEmail = toEmail; }
        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }
        public String getBody() { return body; }
        public void setBody(String body) { this.body = body; }
        public LocalDateTime getSentAt() { return sentAt; }
        public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
    }

    public void sendEmailAsync(String toEmail, String subject, String body) {
        try {
            List<SandboxEmail> emails = loadEmailsInternal();
            emails.add(0, new SandboxEmail(toEmail, subject, body));

            if (emails.size() > 50) {
                emails = emails.subList(0, 50);
            }

            objectMapper.writerWithDefaultPrettyPrinter().writeValue(new File(filePath), emails);
        } catch (Exception ex) {
            System.err.println("Error sending sandbox email: " + ex.getMessage());
        }
    }

    public List<SandboxEmail> getSentEmailsAsync() {
        return loadEmailsInternal();
    }

    private List<SandboxEmail> loadEmailsInternal() {
        File file = new File(filePath);
        if (!file.exists()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(file, new TypeReference<List<SandboxEmail>>() {});
        } catch (IOException e) {
            return new ArrayList<>();
        }
    }
}
