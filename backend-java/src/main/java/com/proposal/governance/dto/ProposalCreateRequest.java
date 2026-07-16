package com.proposal.governance.dto;

import java.math.BigDecimal;

public class ProposalCreateRequest {
    private String title;
    private String description;
    private BigDecimal requestedAmount;
    private String supportingDocumentPath;
    private String startupName;
    private String problemStatement;
    private String proposedStatement;
    private BigDecimal equityOffered;
    private String businessModel;
    private String teamDetails;
    private String demoVideoUrl;

    public ProposalCreateRequest() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }

    public String getSupportingDocumentPath() { return supportingDocumentPath; }
    public void setSupportingDocumentPath(String supportingDocumentPath) { this.supportingDocumentPath = supportingDocumentPath; }

    public String getStartupName() { return startupName; }
    public void setStartupName(String startupName) { this.startupName = startupName; }

    public String getProblemStatement() { return problemStatement; }
    public void setProblemStatement(String problemStatement) { this.problemStatement = problemStatement; }

    public String getProposedStatement() { return proposedStatement; }
    public void setProposedStatement(String proposedStatement) { this.proposedStatement = proposedStatement; }

    public BigDecimal getEquityOffered() { return equityOffered; }
    public void setEquityOffered(BigDecimal equityOffered) { this.equityOffered = equityOffered; }

    public String getBusinessModel() { return businessModel; }
    public void setBusinessModel(String businessModel) { this.businessModel = businessModel; }

    public String getTeamDetails() { return teamDetails; }
    public void setTeamDetails(String teamDetails) { this.teamDetails = teamDetails; }

    public String getDemoVideoUrl() { return demoVideoUrl; }
    public void setDemoVideoUrl(String demoVideoUrl) { this.demoVideoUrl = demoVideoUrl; }
}
