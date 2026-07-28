using System;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;
using ProposalGovernance.Api.Services;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/ai-assistant")]
    public class AiAssistantController : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly ISubscriptionService _subscriptionService;
        private readonly HttpClient _httpClient;
        private readonly string _geminiApiKey;
        private const string GeminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

        public AiAssistantController(
            GovernanceDbContext context,
            ISubscriptionService subscriptionService,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration)
        {
            _context = context;
            _subscriptionService = subscriptionService;
            _httpClient = httpClientFactory.CreateClient();
            _geminiApiKey = configuration["Gemini:ApiKey"] ?? string.Empty;
        }

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        private string GetUserRole() => User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        // ── POST /api/ai-assistant/founder ────────────────────────────────────
        [HttpPost("founder")]
        public async Task<IActionResult> FounderChat([FromBody] AiChatRequest request)
        {
            var userId = GetUserId();

            // Check premium gate
            if (!await _subscriptionService.HasPremiumAsync(userId))
                return StatusCode(403, new { message = "Premium subscription required to access the AI Startup Assistant." });

            // Check AI is enabled in config
            var aiEnabled = await _subscriptionService.GetConfigValueAsync("AIAssistantEnabled");
            if (aiEnabled?.ToLower() == "false")
                return StatusCode(503, new { message = "AI Assistant is currently disabled by administrator." });

            // Build context from user's proposals
            var proposals = await _context.Proposals
                .Where(p => p.SubmitterId == userId)
                .Take(3)
                .Select(p => new { p.Title, p.Description, p.StartupName, p.RequestedAmount, p.Status })
                .ToListAsync();

            var systemPrompt = $@"You are an expert AI Startup Advisor helping a founder on a business proposal governance platform.
Your role is to assist founders with:
- Reviewing and improving startup proposals
- Suggesting improvements to business models  
- Reviewing pitch decks and improving proposal descriptions
- Creating investor-ready summaries
- Suggesting fundraising strategies
- Identifying proposal weaknesses
- Suggesting target investor categories
- Identifying market opportunities
- Helping prepare for investor meetings
- Answering startup-related questions

The founder has these proposals on the platform:
{JsonSerializer.Serialize(proposals)}

Be specific, actionable, and professional. Format your response clearly with sections if needed. 
Max 600 words. Start directly with your advice — no preamble.";

            var response = await CallGeminiAsync(systemPrompt, request.Prompt);

            // Log AI interaction
            await LogAiInteraction(userId, "Submitter", request.Prompt, response);

            return Ok(new { response, timestamp = DateTime.UtcNow });
        }

        // ── POST /api/ai-assistant/investor ───────────────────────────────────
        [HttpPost("investor")]
        public async Task<IActionResult> InvestorChat([FromBody] AiChatRequest request)
        {
            var userId = GetUserId();

            if (!await _subscriptionService.HasPremiumAsync(userId))
                return StatusCode(403, new { message = "Premium subscription required to access the AI Investment Assistant." });

            var aiEnabled = await _subscriptionService.GetConfigValueAsync("AIAssistantEnabled");
            if (aiEnabled?.ToLower() == "false")
                return StatusCode(503, new { message = "AI Assistant is currently disabled by administrator." });

            // Get market context — top proposals on the platform
            var topProposals = await _context.Proposals
                .Where(p => p.Status == "Submitted" || p.Status == "Approved" || p.Status == "FundAllocated")
                .Take(5)
                .Select(p => new { p.Title, p.StartupName, p.Industry, p.RequestedAmount, p.EquityOffered, p.Status })
                .ToListAsync();

            var systemPrompt = $@"You are an expert AI Investment Analyst on a startup investment governance platform.
Your role is to assist investors with:
- Recommending startups based on investor preferences
- Comparing different startups and their proposals
- Explaining startup business models clearly
- Explaining reviewer reports and due diligence findings
- Analyzing investment risks (market, technical, regulatory, financial)
- Explaining Trust Scores and what they mean for investment safety
- Explaining Patent Status and IP protection
- Suggesting investment opportunities and portfolio strategies
- Highlighting startup strengths and weaknesses
- Answering investment-related questions

Current startups on the platform for context:
{JsonSerializer.Serialize(topProposals)}

Be analytical, data-focused, and professional. Give specific investment insights.
Max 600 words. Start directly with your analysis — no preamble.";

            var response = await CallGeminiAsync(systemPrompt, request.Prompt);

            await LogAiInteraction(userId, "Investor", request.Prompt, response);

            return Ok(new { response, timestamp = DateTime.UtcNow });
        }

        // ── GET /api/ai-assistant/logs (Admin only) ───────────────────────────
        [HttpGet("logs")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var query = _context.AIAssistantLogs
                .Include(l => l.User)
                .OrderByDescending(l => l.CreatedAt);

            var total = await query.CountAsync();
            var logs = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(l => new
                {
                    l.Id,
                    l.UserId,
                    userName = l.User!.FullName,
                    l.UserRole,
                    l.Prompt,
                    responseSummary = l.ResponseSummary != null && l.ResponseSummary.Length > 150
                        ? l.ResponseSummary.Substring(0, 150) + "..."
                        : l.ResponseSummary,
                    l.CreatedAt
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, logs });
        }

        // ── Gemini API Call ───────────────────────────────────────────────────
        private async Task<string> CallGeminiAsync(string systemPrompt, string userPrompt)
        {
            if (string.IsNullOrWhiteSpace(_geminiApiKey))
                return GenerateFallbackResponse(userPrompt);

            try
            {
                var payload = new
                {
                    contents = new[]
                    {
                        new { role = "user", parts = new[] { new { text = $"{systemPrompt}\n\nUser Question: {userPrompt}" } } }
                    },
                    generationConfig = new { temperature = 0.7, maxOutputTokens = 800 }
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var url = $"{GeminiEndpoint}?key={_geminiApiKey}";

                var httpResponse = await _httpClient.PostAsync(url, content);
                var responseBody = await httpResponse.Content.ReadAsStringAsync();

                if (!httpResponse.IsSuccessStatusCode)
                {
                    Console.WriteLine($"[AiAssistant] API Error: {responseBody}");
                    return $"**⚠️ Gemini API Error**\n\nThe API request failed with status code {httpResponse.StatusCode}.\n\nDetails: {responseBody}";
                }

                using var doc = JsonDocument.Parse(responseBody);
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString() ?? "No response generated.";

                return text;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AiAssistant] Exception: {ex.Message}");
                return $"**⚠️ Error Parsing Response**\n\nThere was an internal error parsing the Gemini response: {ex.Message}";
            }
        }

        private static string GenerateFallbackResponse(string prompt)
        {
            return "**⚠️ Gemini API Key Required**\n\nI am currently running in offline mock mode because the Gemini API Key is missing.\n\nTo enable the real AI assistant, please open `backend/ProposalGovernance.Api/appsettings.json` and add your Google Gemini API key to the `\"Gemini\": { \"ApiKey\": \"YOUR_KEY_HERE\" }` section. You can get a free key from Google AI Studio (aistudio.google.com).";
        }

        private async Task LogAiInteraction(int userId, string role, string prompt, string response)
        {
            try
            {
                var log = new AIAssistantLog
                {
                    UserId = userId,
                    UserRole = role,
                    Prompt = prompt.Length > 2000 ? prompt.Substring(0, 2000) : prompt,
                    ResponseSummary = response.Length > 500 ? response.Substring(0, 500) : response,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.AIAssistantLogs.AddAsync(log);
                await _context.SaveChangesAsync();
            }
            catch { /* Non-critical — don't fail the request if logging fails */ }
        }
    }

    public class AiChatRequest
    {
        public string Prompt { get; set; } = string.Empty;
        public string? Context { get; set; } // Optional extra context from frontend
    }
}
