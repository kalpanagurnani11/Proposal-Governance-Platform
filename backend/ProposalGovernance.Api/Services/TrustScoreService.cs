using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Services
{
    public interface ITrustScoreService
    {
        Task<StartupTrustScore> ComputeTrustScoreAsync(int proposalId);
    }

    public class TrustScoreService : ITrustScoreService
    {
        private readonly GovernanceDbContext _context;

        public TrustScoreService(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task<StartupTrustScore> ComputeTrustScoreAsync(int proposalId)
        {
            var proposal = await _context.Proposals
                .Include(p => p.Submitter)
                .FirstOrDefaultAsync(p => p.Id == proposalId);

            if (proposal == null)
            {
                throw new ArgumentException("Proposal not found.");
            }

            int score = 20; // Base score

            // 1. Founder Verification Score (max 40)
            int founderPoints = 0;
            var fVerification = await _context.FounderVerifications
                .FirstOrDefaultAsync(fv => fv.UserId == proposal.SubmitterId && fv.Status == "Verified");
            if (fVerification != null)
            {
                if (fVerification.VerificationLevel == "Business")
                {
                    founderPoints = 40;
                }
                else if (fVerification.VerificationLevel == "Verified")
                {
                    founderPoints = 25;
                }
                else if (fVerification.VerificationLevel == "Basic")
                {
                    founderPoints = 10;
                }
            }
            else
            {
                // Check basic user state
                if (proposal.Submitter != null)
                {
                    // If verified patent is on profile, give some credit
                    if (proposal.Submitter.PatentVerificationStatus == "Verified")
                    {
                        founderPoints = 15;
                    }
                    else if (proposal.Submitter.PatentVerificationStatus == "Unverified")
                    {
                        founderPoints = 5;
                    }
                }
            }
            score += founderPoints;

            // 2. Startup Verification Score (max 20)
            int startupPoints = 0;
            var sVerification = await _context.StartupVerifications
                .FirstOrDefaultAsync(sv => sv.StartupId == proposalId);
            if (sVerification != null)
            {
                if (sVerification.OverallStatus == "Verified")
                {
                    startupPoints = 20;
                }
                else if (sVerification.OverallStatus == "Pending")
                {
                    startupPoints = 5;
                }
            }
            score += startupPoints;

            // 3. Reviewer Due Diligence Score (max 20)
            int ddPoints = 0;
            var ddReport = await _context.DueDiligenceReports
                .Where(dd => dd.StartupId == proposalId)
                .OrderByDescending(dd => dd.CreatedAt)
                .FirstOrDefaultAsync();

            if (ddReport != null)
            {
                // average of scores (each out of 10)
                double avg = (ddReport.InnovationScore + ddReport.MarketPotentialScore + ddReport.FeasibilityScore + 
                              ddReport.TeamStrengthScore + ddReport.FinancialReadinessScore + ddReport.RiskAssessmentScore + 
                              ddReport.PatentStrengthScore + ddReport.IpStrengthScore) / 8.0;
                
                // Scale out of 20
                ddPoints = (int)Math.Round(avg * 2);
            }
            else
            {
                // Try fallback to normal proposal Review entity
                var standardReview = await _context.Reviews
                    .Where(r => r.ProposalId == proposalId)
                    .OrderByDescending(r => r.SubmittedAt)
                    .FirstOrDefaultAsync();
                
                if (standardReview != null)
                {
                    double avg = (standardReview.FeasibilityScore + standardReview.StrategicScore + 
                                  standardReview.RiskScore + standardReview.RoiScore) / 4.0;
                    ddPoints = (int)Math.Round(avg * 1.5); // Max 15 points
                }
            }
            score += ddPoints;

            // 4. Patent Verification Status (max 15)
            int patentPoints = 0;
            var patentInfo = await _context.StartupPatentInfos
                .FirstOrDefaultAsync(sp => sp.StartupId == proposalId);

            if (patentInfo != null)
            {
                if (patentInfo.VerificationStatus == "Verified")
                {
                    patentPoints = 15;
                }
                else if (patentInfo.VerificationStatus == "Pending")
                {
                    patentPoints = 8;
                }
            }
            score += patentPoints;

            // 5. Patent Risk Level (impacts up to +5 or -15)
            int riskPoints = 0;
            var patentRisk = await _context.PatentCheckResults
                .FirstOrDefaultAsync(pr => pr.StartupId == proposalId);

            if (patentRisk != null)
            {
                if (patentRisk.PatentRiskLevel == "Low")
                {
                    riskPoints = 5;
                }
                else if (patentRisk.PatentRiskLevel == "Medium")
                {
                    riskPoints = 0;
                }
                else if (patentRisk.PatentRiskLevel == "High")
                {
                    riskPoints = -15;
                }
            }
            score += riskPoints;

            // Ensure bounds [0, 100]
            score = Math.Clamp(score, 0, 100);

            // Determine level
            string level = "Moderate";
            if (score >= 80) level = "Excellent";
            else if (score >= 60) level = "Good";
            else if (score >= 40) level = "Moderate";
            else level = "High Risk";

            // Details breakdown
            var breakdown = new
            {
                BaseScore = 20,
                FounderVerificationPoints = founderPoints,
                StartupVerificationPoints = startupPoints,
                DueDiligencePoints = ddPoints,
                PatentVerificationPoints = patentPoints,
                PatentRiskPoints = riskPoints,
                FounderStatus = fVerification?.VerificationLevel ?? "Unverified",
                StartupStatus = sVerification?.OverallStatus ?? "Unverified",
                PatentStatus = patentInfo?.VerificationStatus ?? "Unverified",
                PatentRiskLevel = patentRisk?.PatentRiskLevel ?? "NoPatentCheck"
            };

            var trustRecord = await _context.StartupTrustScores
                .FirstOrDefaultAsync(ts => ts.StartupId == proposalId);

            if (trustRecord == null)
            {
                trustRecord = new StartupTrustScore
                {
                    StartupId = proposalId,
                    TrustScore = score,
                    TrustLevel = level,
                    LastUpdated = DateTime.UtcNow,
                    BreakdownJson = JsonSerializer.Serialize(breakdown)
                };
                await _context.StartupTrustScores.AddAsync(trustRecord);
            }
            else
            {
                trustRecord.TrustScore = score;
                trustRecord.TrustLevel = level;
                trustRecord.LastUpdated = DateTime.UtcNow;
                trustRecord.BreakdownJson = JsonSerializer.Serialize(breakdown);
            }

            await _context.SaveChangesAsync();
            return trustRecord;
        }
    }
}
