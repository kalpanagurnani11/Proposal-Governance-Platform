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
        private const string GeminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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

            var systemPrompt = $@"You are an expert AI Startup Advisor helping a founder on InnovAura, a proposal governance and startup investment platform.
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
                Console.WriteLine($"[AiAssistant] Gemini error: {ex.Message}");
                return GenerateFallbackResponse(userPrompt);
            }
        }

        private static string GenerateFallbackResponse(string prompt)
        {
            var p = prompt.ToLower().Trim();

            // ── STARTUP IDEAS ─────────────────────────────────────────────────
            if (p.Contains("startup idea") || p.Contains("business idea") || p.Contains("what should i build") || p.Contains("suggest idea"))
                return "**🚀 High-Potential Startup Ideas for 2026**\n\n**1. AI-Powered Legal Assistant for SMEs**\n   Draft contracts, compliance checklists, and legal notices automatically. Target: 60M+ Indian SMEs without legal teams.\n\n**2. Rural Agri-Fintech Platform**\n   Micro-credit + crop insurance + market price discovery for farmers via WhatsApp/USSD. Huge government grant potential.\n\n**3. B2B SaaS for MSME Compliance**\n   Automate GST, TDS, EPF, ESI filings. Subscription model, recurring revenue, 0 churn.\n\n**4. Healthcare Last-Mile Diagnostics**\n   Portable AI diagnostic kits for Tier-3 cities and villages. Partner with ASHA workers.\n\n**5. EdTech for Vernacular Skill Courses**\n   Vocational training in regional languages (Hindi, Tamil, Marathi) with job placement guarantee.\n\n**💡 Evaluation Framework**\n- Market Size > ₹1000 Cr TAM\n- Regulatory tailwinds (look for PLI schemes, Digital India programs)\n- Network effect potential\n- Asset-light, high-margin model\n\nWhich sector interests you most? I can deep-dive into any of these.";

            // ── FUNDRAISING / CAPITAL ─────────────────────────────────────────
            if (p.Contains("fund") || p.Contains("raise") || p.Contains("capital") || p.Contains("investment") || p.Contains("money") || p.Contains("seed") || p.Contains("series a"))
                return "**💰 Fundraising Strategy Guide**\n\n**Stage 1 – Pre-Seed (₹10L–₹50L)**\n- Sources: Friends & Family, Angel Networks (Mumbai Angels, Indian Angel Network), Govt schemes (Startup India Seed Fund)\n- What you need: Working prototype, 2-3 paying customers, clear problem statement\n\n**Stage 2 – Seed Round (₹50L–₹3Cr)**\n- Sources: Marquee angels, micro-VCs (Venture Catalysts, 100X.VC, Titan Capital)\n- What you need: Product-Market Fit signals, MoM growth of 15%+, cohort retention data\n\n**Stage 3 – Series A (₹5Cr–₹30Cr)**\n- Sources: Institutional VCs (Sequoia Surge, Accel, Elevation Capital)\n- What you need: ₹1Cr+ ARR, strong unit economics (LTV:CAC > 3:1), scalable GTM\n\n**📋 Immediate Action Items:**\n1. Build a 10-slide pitch deck (Problem → Solution → Market → Traction → Team → Ask)\n2. Create a data room: financials, cap table, customer contracts\n3. Warm intro > cold email — leverage LinkedIn, alumni networks\n4. Update your proposal on this platform with verified financials to boost Trust Score\n\nWhat stage are you currently at?";

            // ── BUSINESS MODEL / REVENUE ──────────────────────────────────────
            if (p.Contains("business model") || p.Contains("revenue model") || p.Contains("monetize") || p.Contains("pricing") || p.Contains("unit economics") || p.Contains("ltv") || p.Contains("cac"))
                return "**📊 Business Model Optimization**\n\n**Proven Revenue Models for Indian Startups:**\n\n| Model | Best For | Avg Margin |\n|-------|----------|------------|\n| SaaS Subscription | B2B software | 70-80% |\n| Marketplace (GMV %) | B2B/B2C commerce | 15-25% |\n| Freemium → Paid | Consumer apps | 60-75% |\n| Transaction Fee | Fintech, payments | 0.5-2% |\n| D2C + Subscription | FMCG, health | 40-60% |\n\n**Unit Economics Checklist:**\n- **CAC** (Customer Acquisition Cost): Total marketing spend ÷ new customers\n- **LTV** (Lifetime Value): ARPU × Gross Margin × Avg customer lifespan\n- **LTV:CAC ratio**: Should be > 3:1 for investor confidence\n- **Payback period**: Should be < 18 months for SaaS\n\n**⚡ Quick Wins:**\n1. Add an annual plan with 20% discount — improves cash flow and reduces churn\n2. Introduce upsell tiers (Basic → Pro → Enterprise)\n3. Track Net Revenue Retention (NRR) — should be > 100% for SaaS\n\nShare your current model and I can give specific improvement suggestions.";

            // ── PITCH DECK / INVESTOR PRESENTATION ───────────────────────────
            if (p.Contains("pitch") || p.Contains("deck") || p.Contains("presentation") || p.Contains("slide"))
                return "**🎯 Investor-Ready Pitch Deck Framework**\n\n**The 10-Slide Structure:**\n\n1. **Cover** — Company name, tagline, contact\n2. **Problem** — Real pain, backed by data (market research, surveys)\n3. **Solution** — Your product demo / screenshot / prototype\n4. **Market Size** — TAM → SAM → SOM with credible sources\n5. **Business Model** — How you make money, pricing, margins\n6. **Traction** — Revenue, users, growth rate, key metrics\n7. **Go-To-Market** — Customer acquisition strategy, sales motion\n8. **Competition** — Competitive matrix showing your differentiation\n9. **Team** — Why YOU are the right team to solve this\n10. **The Ask** — Funding amount, use of funds, 18-month milestones\n\n**🚫 Common Mistakes:**\n- Too much text on slides (use visuals and numbers)\n- Underestimating competition (investors want realism)\n- Vague 'use of funds' (be specific: 40% hiring, 35% marketing, 25% product)\n- No clear ask or exit strategy\n\n**✅ Pro Tips:**\n- Lead with a story/customer quote, not features\n- Use ₹ figures, not percentages alone\n- Practice the 3-minute elevator version\n\nWould you like me to review a specific section of your pitch?";

            // ── MARKET ANALYSIS / OPPORTUNITY ────────────────────────────────
            if (p.Contains("market") || p.Contains("industry") || p.Contains("opportunity") || p.Contains("tam") || p.Contains("competition") || p.Contains("competitor"))
                return "**🌏 Market Analysis Framework**\n\n**How to Size Your Market (TAM/SAM/SOM):**\n\n- **TAM** (Total Addressable Market): Everyone who could theoretically buy your product\n- **SAM** (Serviceable Addressable Market): Segment you can realistically reach with your GTM\n- **SOM** (Serviceable Obtainable Market): What you'll realistically capture in 3-5 years\n\n**Example for an EdTech startup:**\n- TAM: 250M learners in India = ₹3,00,000 Cr\n- SAM: Urban + semi-urban English/Hindi speakers with smartphones = ₹30,000 Cr\n- SOM: Target 0.1% = ₹300 Cr in 5 years\n\n**Competitive Analysis Template:**\n| Feature | You | Competitor A | Competitor B |\n|---------|-----|---------|----------|\n| Price | ✅ Lower | ❌ Higher | ✅ Similar |\n| Speed | ✅ Faster | ✅ Similar | ❌ Slower |\n| Regional | ✅ Vernacular | ❌ English only | ❌ English only |\n\n**🔍 Your Moat (Defensibility):**\n- Network effects (more users = more value)\n- Proprietary data or IP\n- Switching costs (integrations, workflows)\n- Brand and community\n\nTell me your specific market and I'll give tailored competitive insights.";

            // ── PROPOSAL / DESCRIPTION IMPROVEMENT ───────────────────────────
            if (p.Contains("proposal") || p.Contains("description") || p.Contains("improve") || p.Contains("review") || p.Contains("suggest") || p.Contains("feedback") || p.Contains("summary"))
                return "**📝 Proposal Improvement Framework**\n\n**Strong Proposal Structure:**\n\n1. **Executive Summary** (3-4 sentences)\n   - What problem do you solve?\n   - Who is your target customer?\n   - What is your unfair advantage?\n\n2. **Problem Statement**\n   - Quantify the pain (e.g., 'SMEs waste 40 hours/month on manual GST filing')\n   - Use customer quotes if available\n   - Show market validation (surveys, interviews)\n\n3. **Solution**\n   - Describe your product/service clearly\n   - Explain the 'aha' moment for customers\n   - Include any proprietary technology\n\n4. **Business Model**\n   - Revenue streams and pricing\n   - Current revenue or pilot results\n   - Path to profitability\n\n5. **Team**\n   - Relevant domain expertise\n   - Previous startup experience\n   - Advisory board\n\n**🎯 Investor-Specific Improvements:**\n- Add specific numbers: MoM growth, pilot revenue, customer count\n- Include 3-year financial projections with assumptions\n- Mention any IP filings, govt registrations, or certifications\n- Highlight government grants or subsidies you qualify for\n\nPaste your current description and I'll give specific line-by-line feedback.";

            // ── TEAM / HIRING ─────────────────────────────────────────────────
            if (p.Contains("team") || p.Contains("co-founder") || p.Contains("hire") || p.Contains("talent") || p.Contains("employee"))
                return "**👥 Building Your Founding Team**\n\n**The Ideal Founding Team Composition:**\n\n- **The Hacker** (CTO/Technical): Builds the product\n- **The Hustler** (CEO/Business): Sells and leads\n- **The Designer** (CPO/Product): Makes it beautiful and usable\n\n**Finding Co-Founders:**\n- IIT/IIM alumni networks and hackathons\n- AngelList Co-Founder matching\n- Startup India community\n- LinkedIn with 'open to co-founding' filter\n\n**Early Hires Priority (Post-Seed):**\n1. Head of Sales / Business Development\n2. Senior Full-Stack Developer\n3. Growth / Marketing Lead\n4. Customer Success Manager\n\n**Equity Split Guidelines:**\n- Equal split among 2-3 co-founders is often cleanest\n- Use 4-year vesting with 1-year cliff for all co-founders\n- Reserve 10-15% ESOP pool before Series A\n- Document everything in a Founders Agreement\n\n**⚡ Culture Tips:**\n- Define your values early (speed, customer obsession, transparency)\n- Weekly team retrospectives from Day 1\n- Transparent salary bands to avoid future conflicts";

            // ── LEGAL / COMPLIANCE / REGISTRATION ────────────────────────────
            if (p.Contains("legal") || p.Contains("register") || p.Contains("company") || p.Contains("gst") || p.Contains("compliance") || p.Contains("patent") || p.Contains("ip") || p.Contains("trademark"))
                return "**⚖️ Legal & Compliance Roadmap for Indian Startups**\n\n**Step 1 – Company Registration (Month 1)**\n- Incorporate as Private Limited Company (recommended for fundraising)\n- Register via MCA portal (mca.gov.in) — ₹7,000–₹15,000 through CA\n- Get PAN, TAN, and DSC for all directors\n\n**Step 2 – Startup India Recognition**\n- Register at startupindia.gov.in\n- Get DPIIT recognition for tax benefits (3-year income tax exemption)\n- Access to Startup India Fund of Funds\n\n**Step 3 – GST Registration**\n- Mandatory if turnover > ₹20L (services) or ₹40L (goods)\n- Recommended early for B2B credibility\n\n**Step 4 – IP Protection**\n- **Trademark**: Register your brand name + logo (~₹4,500/class)\n- **Patent**: File provisional patent for technical innovations (~₹1,600 for startups)\n- **Copyright**: Auto-protected, but register code/content for disputes\n\n**Step 5 – Employment Compliance**\n- PF (EPF) + ESI registration if hiring >10/20 employees\n- Standard employment agreements with IP assignment clauses\n- NDAs for all contractors and early hires\n\n**📋 Monthly Compliance Checklist:**\n- GST returns (GSTR-1, GSTR-3B)\n- TDS deposits and quarterly returns\n- ROC annual filings (AOC-4, MGT-7)";

            // ── PRODUCT / MVP ─────────────────────────────────────────────────
            if (p.Contains("product") || p.Contains("mvp") || p.Contains("feature") || p.Contains("roadmap") || p.Contains("build") || p.Contains("develop"))
                return "**🛠️ Product & MVP Development Strategy**\n\n**The Lean Startup MVP Approach:**\n\n1. **Problem Interviews** (Week 1-2)\n   - Talk to 20+ potential customers before writing a single line of code\n   - Find the ONE most painful problem they face\n\n2. **Define MVP Scope** (Week 3)\n   - List all features → ruthlessly cut to the 3 that prove your core hypothesis\n   - A spreadsheet + email can be your first 'MVP'\n\n3. **Build & Ship** (Week 4-8)\n   - Use no-code tools to validate faster (Bubble, Glide, Webflow)\n   - Target: 5 paying customers before building V2\n\n**📊 Product Metrics to Track:**\n- **Activation Rate**: % of signups who reach the 'aha moment'\n- **D7/D30 Retention**: % of users active after 7/30 days\n- **NPS Score**: Would users recommend you? (>50 is excellent)\n- **Feature Adoption**: Which features drive retention vs. are unused?\n\n**🚀 Tech Stack Recommendations for Startups:**\n- **Full-Stack**: Next.js + Node.js + PostgreSQL (fast iteration)\n- **Mobile**: React Native (single codebase for iOS + Android)\n- **AI/ML**: Python FastAPI + Hugging Face models\n- **Infrastructure**: Start on Vercel/Railway, migrate to AWS when needed\n\nShare your product idea and I'll suggest the right tech stack and MVP scope.";

            // ── TRUST SCORE / VERIFICATION ────────────────────────────────────
            if (p.Contains("trust score") || p.Contains("verify") || p.Contains("verification") || p.Contains("credibility") || p.Contains("due diligence"))
                return "**🛡️ Trust Score & Verification Guide**\n\n**What is the Trust Score?**\nThe platform's Trust Score is a composite credibility rating (0–100) computed from:\n- ✅ KYC and founder identity verification\n- ✅ Business registration documents (CIN, GST, PAN)\n- ✅ Audited financial statements\n- ✅ Patent filings and IP status\n- ✅ Reviewer due diligence reports\n- ✅ Previous funding history\n\n**How to Improve Your Trust Score:**\n1. Complete founder KYC with Aadhaar + PAN\n2. Upload DPIIT Startup India Certificate\n3. Submit CA-certified financial statements\n4. File at least provisional patent if you have technical IP\n5. Get verified by 2+ platform reviewers\n6. Link your company CIN and GST registration\n\n**For Investors — Reading Trust Scores:**\n- **80-100**: High credibility, verified documents, strong reviewer ratings\n- **60-79**: Moderate verification, proceed with standard due diligence\n- **40-59**: Limited verification, request additional documents\n- **Below 40**: Exercise caution, independent verification recommended\n\n**Due Diligence Checklist:**\n☐ Verify MCA filings at mca.gov.in\n☐ Check for litigation history on eCourts portal\n☐ Validate GST returns via GSTIN lookup\n☐ Review team LinkedIn profiles for domain expertise";

            // ── GENERIC / GREETING ────────────────────────────────────────────
            var lines = new[]
            {
                "startup ideas", "fundraising strategy", "business model review",
                "pitch deck improvement", "market analysis", "proposal feedback",
                "team building", "legal & compliance", "product MVP planning", "trust score improvement"
            };
            return $"**🤖 AI Startup Advisor — Ready to Help!**\n\nHello! I can assist you with a wide range of startup and investment topics. Here's what you can ask me:\n\n{string.Join("\n", lines.Select((l, i) => $"{i+1}. **{l}**"))}\n\n**Sample Questions You Can Ask:**\n- \"What startup ideas are trending in India right now?\"\n- \"How do I raise my first ₹50L seed round?\"\n- \"Review my proposal and suggest improvements\"\n- \"What legal steps do I need to register my startup?\"\n- \"How do I improve my pitch deck?\"\n- \"Explain my Trust Score and how to increase it\"\n\nJust type your question and I'll give you detailed, actionable advice! 💡";
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
