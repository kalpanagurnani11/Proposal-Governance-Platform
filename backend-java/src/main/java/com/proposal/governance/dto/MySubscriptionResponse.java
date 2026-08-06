package com.proposal.governance.dto;

import java.time.LocalDateTime;

public class MySubscriptionResponse {
    private Boolean hasActive;
    private UserSubscriptionData data;

    public MySubscriptionResponse() {}

    public MySubscriptionResponse(Boolean hasActive, UserSubscriptionData data) {
        this.hasActive = hasActive;
        this.data = data;
    }

    public Boolean getHasActive() { return hasActive; }
    public void setHasActive(Boolean hasActive) { this.hasActive = hasActive; }
    public UserSubscriptionData getData() { return data; }
    public void setData(UserSubscriptionData data) { this.data = data; }

    public static MySubscriptionResponseBuilder builder() { return new MySubscriptionResponseBuilder(); }

    public static class MySubscriptionResponseBuilder {
        private Boolean hasActive;
        private UserSubscriptionData data;

        public MySubscriptionResponseBuilder hasActive(Boolean hasActive) { this.hasActive = hasActive; return this; }
        public MySubscriptionResponseBuilder data(UserSubscriptionData data) { this.data = data; return this; }
        public MySubscriptionResponse build() { return new MySubscriptionResponse(hasActive, data); }
    }

    public static class UserSubscriptionData {
        private Integer id;
        private Integer subscriptionId;
        private String status;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private SubscriptionPlanResponse subscription;

        public UserSubscriptionData() {}

        public UserSubscriptionData(Integer id, Integer subscriptionId, String status, LocalDateTime startDate, LocalDateTime endDate, SubscriptionPlanResponse subscription) {
            this.id = id;
            this.subscriptionId = subscriptionId;
            this.status = status;
            this.startDate = startDate;
            this.endDate = endDate;
            this.subscription = subscription;
        }

        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }
        public Integer getSubscriptionId() { return subscriptionId; }
        public void setSubscriptionId(Integer subscriptionId) { this.subscriptionId = subscriptionId; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public LocalDateTime getStartDate() { return startDate; }
        public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
        public LocalDateTime getEndDate() { return endDate; }
        public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
        public SubscriptionPlanResponse getSubscription() { return subscription; }
        public void setSubscription(SubscriptionPlanResponse subscription) { this.subscription = subscription; }

        public static UserSubscriptionDataBuilder builder() { return new UserSubscriptionDataBuilder(); }

        public static class UserSubscriptionDataBuilder {
            private Integer id;
            private Integer subscriptionId;
            private String status;
            private LocalDateTime startDate;
            private LocalDateTime endDate;
            private SubscriptionPlanResponse subscription;

            public UserSubscriptionDataBuilder id(Integer id) { this.id = id; return this; }
            public UserSubscriptionDataBuilder subscriptionId(Integer subscriptionId) { this.subscriptionId = subscriptionId; return this; }
            public UserSubscriptionDataBuilder status(String status) { this.status = status; return this; }
            public UserSubscriptionDataBuilder startDate(LocalDateTime startDate) { this.startDate = startDate; return this; }
            public UserSubscriptionDataBuilder endDate(LocalDateTime endDate) { this.endDate = endDate; return this; }
            public UserSubscriptionDataBuilder subscription(SubscriptionPlanResponse subscription) { this.subscription = subscription; return this; }
            public UserSubscriptionData build() { return new UserSubscriptionData(id, subscriptionId, status, startDate, endDate, subscription); }
        }
    }
}
