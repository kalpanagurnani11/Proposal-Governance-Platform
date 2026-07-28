using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Services
{
    public interface INdaService
    {
        Task<bool> HasAcceptedNdaAsync(int investorId, int proposalId);
        Task<NDAAgreement> AcceptNdaAsync(int investorId, int proposalId, string ipAddress);
    }

    public class NdaService : INdaService
    {
        private readonly GovernanceDbContext _context;

        public NdaService(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task<bool> HasAcceptedNdaAsync(int investorId, int proposalId)
        {
            return await _context.NDAAgreements
                .AnyAsync(nda => nda.InvestorId == investorId && nda.StartupId == proposalId);
        }

        public async Task<NDAAgreement> AcceptNdaAsync(int investorId, int proposalId, string ipAddress)
        {
            var existing = await _context.NDAAgreements
                .FirstOrDefaultAsync(nda => nda.InvestorId == investorId && nda.StartupId == proposalId);

            if (existing != null) return existing;

            var agreement = new NDAAgreement
            {
                InvestorId = investorId,
                StartupId = proposalId,
                AcceptedAt = DateTime.UtcNow,
                IpAddress = string.IsNullOrWhiteSpace(ipAddress) ? "127.0.0.1" : ipAddress,
                Version = "1.0"
            };

            await _context.NDAAgreements.AddAsync(agreement);
            await _context.SaveChangesAsync();
            return agreement;
        }
    }
}
