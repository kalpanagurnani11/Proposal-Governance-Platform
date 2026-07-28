using System;
using System.Threading.Tasks;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Services
{
    public interface IAuditLogService
    {
        Task LogAsync(int? userId, string username, string action, string? entityName, int? entityId, string? details, string? ipAddress);
    }

    public class AuditLogService : IAuditLogService
    {
        private readonly GovernanceDbContext _context;

        public AuditLogService(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(int? userId, string username, string action, string? entityName, int? entityId, string? details, string? ipAddress)
        {
            var audit = new AuditLog
            {
                UserId = userId,
                Username = username,
                Action = action,
                EntityName = entityName,
                EntityId = entityId,
                Details = details,
                IpAddress = string.IsNullOrWhiteSpace(ipAddress) ? "127.0.0.1" : ipAddress,
                CreatedAt = DateTime.UtcNow
            };

            await _context.AuditLogs.AddAsync(audit);
            await _context.SaveChangesAsync();
        }
    }
}
