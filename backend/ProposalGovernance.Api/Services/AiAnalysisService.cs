using System;
using System.Threading.Tasks;

namespace ProposalGovernance.Api.Services
{
    public class AiAnalysisResult
    {
        public int FeasibilityScore { get; set; }
        public int StrategicScore { get; set; }
        public int RiskScore { get; set; } // 1-10, 10 is lowest risk, 1 is highest risk
        public int RoiScore { get; set; }
        public decimal SuggestedBudget { get; set; }
        public string Summary { get; set; } = string.Empty;
        public string RiskAssessment { get; set; } = string.Empty;
        public string RoiAnalysis { get; set; } = string.Empty;
        public string Recommendation { get; set; } = string.Empty; // "Approve", "Conditional Approve", "Reject"
    }

    public interface IAiAnalysisService
    {
        Task<AiAnalysisResult> AnalyzeProposalAsync(string title, string description, decimal requestedAmount);
    }

    public class AiAnalysisService : IAiAnalysisService
    {
        public Task<AiAnalysisResult> AnalyzeProposalAsync(string title, string description, decimal requestedAmount)
        {
            // Seed a Random generator with a hash of the title to ensure consistency for the same proposal
            int titleHash = title.GetHashCode();
            var rand = new Random(titleHash);

            string contentLower = (title + " " + description).ToLower();

            // Default scores
            int feasibility = rand.Next(6, 9);
            int strategic = rand.Next(6, 9);
            int risk = rand.Next(5, 8); // 10 = low risk, 1 = high risk
            int roi = rand.Next(6, 9);

            // Apply heuristics based on keywords
            if (contentLower.Contains("ai") || contentLower.Contains("gpu") || contentLower.Contains("learning") || contentLower.Contains("intelligence"))
            {
                strategic += 2;
                roi += 1;
                risk -= 1; // AI is riskier
                feasibility -= 1; // AI requires specialized skills
            }

            if (contentLower.Contains("marketing") || contentLower.Contains("campaign") || contentLower.Contains("ad") || contentLower.Contains("brand"))
            {
                feasibility += 1; // Highly feasible
                risk += 1; // Lower risk
                roi -= 1; // ROI harder to track immediately
            }

            if (contentLower.Contains("infrastructure") || contentLower.Contains("cloud") || contentLower.Contains("server") || contentLower.Contains("migration"))
            {
                feasibility -= 1; // Requires migration effort
                strategic += 1; // Core infrastructure is strategically important
                risk += 1; // Infrastructural investments have predictable risk profiles
            }

            if (contentLower.Contains("legacy") || contentLower.Contains("old") || contentLower.Contains("replace"))
            {
                risk -= 1; // Upgrading legacy systems has compatibility risks
                feasibility -= 1;
            }

            // Adjust by budget size
            if (requestedAmount > 1000000)
            {
                risk -= 2; // High budget = High financial risk
                strategic += 1; // High budget usually implies strategic shift
            }
            else if (requestedAmount < 100000)
            {
                risk += 1; // Low budget = Low risk
                feasibility += 1; // Simpler to execute
            }

            // Bound scores to 1-10
            feasibility = Math.Clamp(feasibility, 1, 10);
            strategic = Math.Clamp(strategic, 1, 10);
            risk = Math.Clamp(risk, 1, 10);
            roi = Math.Clamp(roi, 1, 10);

            // Suggested budget
            decimal suggestedBudget = requestedAmount;
            if (risk < 5)
            {
                // Reduce budget recommendation for high risk projects
                suggestedBudget = requestedAmount * 0.85m;
            }
            else if (roi > 8 && strategic > 8)
            {
                // Fully fund or recommend full funding
                suggestedBudget = requestedAmount;
            }
            else if (feasibility < 5)
            {
                // Reduce budget for projects with execution challenges
                suggestedBudget = requestedAmount * 0.75m;
            }

            // Rounded budget
            suggestedBudget = Math.Round(suggestedBudget, 2);

            // Recommendation
            int overallScore = (feasibility + strategic + risk + roi) / 4;
            string recommendation;
            string summary;
            string riskAssessment;
            string roiAnalysis;

            if (overallScore >= 8)
            {
                recommendation = "Approve";
                summary = $"Highly recommended project. Demonstrates strong alignment with corporate goals and excellent ROI prospects. Technical feasibility is high and execution risk is well managed.";
            }
            else if (overallScore >= 6)
            {
                recommendation = "Conditional Approve";
                summary = $"Recommended with conditions. The project has potential but shows minor execution challenges or elevated risks. Recommend funding at a adjusted rate of {suggestedBudget:C0} (requested: {requestedAmount:C0}).";
            }
            else
            {
                recommendation = "Reject";
                summary = $"Not recommended for funding in its current form. The proposal exhibits high execution risk (Risk score: {risk}/10) or low alignment with strategic core objectives. Suggest rewriting or restructuring.";
            }

            // Risk Assessment text
            if (risk <= 4)
            {
                riskAssessment = "HIGH RISK. Project budget exceeds safe limits for this domain or involves cutting-edge technology. Mitigation plan must include proof of concept and phased deliverables.";
            }
            else if (risk <= 7)
            {
                riskAssessment = "MODERATE RISK. Normal operational risk. Standard project management oversight is sufficient.";
            }
            else
            {
                riskAssessment = "LOW RISK. Highly structured project with predictable outcomes and well-understood dependencies.";
            }

            // ROI Assessment text
            if (roi >= 8)
            {
                roiAnalysis = "EXCELLENT ROI. Direct revenue enablement or high-value cost savings predicted within the first 12 months.";
            }
            else if (roi >= 5)
            {
                roiAnalysis = "AVERAGE ROI. Strategic utility is clear but direct monetary returns may take 18-24 months to materialize.";
            }
            else
            {
                roiAnalysis = "LOW ROI. Financial return is weak; the project should be justified strictly on compliance, safety, or basic infrastructure grounds.";
            }

            var result = new AiAnalysisResult
            {
                FeasibilityScore = feasibility,
                StrategicScore = strategic,
                RiskScore = risk,
                RoiScore = roi,
                SuggestedBudget = suggestedBudget,
                Summary = summary,
                RiskAssessment = riskAssessment,
                RoiAnalysis = roiAnalysis,
                Recommendation = recommendation
            };

            return Task.FromResult(result);
        }
    }
}
