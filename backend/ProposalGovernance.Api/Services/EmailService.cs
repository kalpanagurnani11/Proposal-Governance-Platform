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
        Task<IEnumerable<MockEmail>> GetSentEmailsAsync();
    }

    public class MockEmail
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
                emails.Insert(0, new MockEmail
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
                Console.WriteLine($"Error sending mock email: {ex.Message}");
            }
        }

        public async Task<IEnumerable<MockEmail>> GetSentEmailsAsync()
        {
            return await LoadEmailsInternal();
        }

        private async Task<List<MockEmail>> LoadEmailsInternal()
        {
            if (!File.Exists(_filePath))
            {
                return new List<MockEmail>();
            }

            try
            {
                var json = await File.ReadAllTextAsync(_filePath);
                return JsonSerializer.Deserialize<List<MockEmail>>(json) ?? new List<MockEmail>();
            }
            catch
            {
                return new List<MockEmail>();
            }
        }
    }
}
