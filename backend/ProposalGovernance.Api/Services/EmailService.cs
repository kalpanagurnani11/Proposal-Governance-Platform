using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace ProposalGovernance.Api.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
        Task<IEnumerable<SandboxEmail>> GetSentEmailsAsync();
    }

    public class SandboxEmail
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string ToEmail { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }

    public class EmailService : IEmailService
    {
        private readonly string _filePath;

        public EmailService()
        {
            // Place it in the root scratch directory so frontend can also access it easily or via backend api
            _filePath = Path.Combine(Directory.GetCurrentDirectory(), "emails.json");
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                var emails = await LoadEmailsInternal();
                emails.Insert(0, new SandboxEmail
                {
                    ToEmail = toEmail,
                    Subject = subject,
                    Body = body,
                    SentAt = DateTime.UtcNow
                });

                // Keep only last 50 emails
                if (emails.Count > 50)
                {
                    emails = emails.GetRange(0, 50);
                }

                var json = JsonSerializer.Serialize(emails, new JsonSerializerOptions { WriteIndented = true });
                await File.WriteAllTextAsync(_filePath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending sandbox email: {ex.Message}");
            }
        }

        public async Task<IEnumerable<SandboxEmail>> GetSentEmailsAsync()
        {
            return await LoadEmailsInternal();
        }

        private async Task<List<SandboxEmail>> LoadEmailsInternal()
        {
            if (!File.Exists(_filePath))
            {
                return new List<SandboxEmail>();
            }

            try
            {
                var json = await File.ReadAllTextAsync(_filePath);
                return JsonSerializer.Deserialize<List<SandboxEmail>>(json) ?? new List<SandboxEmail>();
            }
            catch
            {
                return new List<SandboxEmail>();
            }
        }
    }
}
