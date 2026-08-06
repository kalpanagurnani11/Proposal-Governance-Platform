using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Repositories
{
    public interface IProposalRepository
    {
        Task<Proposal?> GetByIdAsync(int id);
        Task<IEnumerable<Proposal>> GetAllAsync();
        Task<PagedResult<Proposal>> GetPagedAsync(int page, int pageSize);
        Task<IEnumerable<Proposal>> GetBySubmitterIdAsync(int submitterId);
        Task<PagedResult<Proposal>> GetPagedBySubmitterIdAsync(int submitterId, int page, int pageSize);
        Task AddAsync(Proposal proposal);
        Task<bool> SaveChangesAsync();
    }

    public class ProposalRepository : IProposalRepository
    {
        private readonly GovernanceDbContext _context;

        public ProposalRepository(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task<Proposal?> GetByIdAsync(int id)
        {
            return await _context.Proposals
                .Include(p => p.Submitter)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<IEnumerable<Proposal>> GetAllAsync()
        {
            return await _context.Proposals
                .Include(p => p.Submitter)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<PagedResult<Proposal>> GetPagedAsync(int page, int pageSize)
        {
            var p = page <= 0 ? 1 : page;
            var ps = pageSize <= 0 ? 10 : pageSize;

            var query = _context.Proposals.Include(p => p.Submitter).OrderByDescending(p => p.CreatedAt);
            var count = await query.CountAsync();
            var items = await query.Skip((p - 1) * ps).Take(ps).ToListAsync();

            return new PagedResult<Proposal>(items, count, p, ps);
        }

        public async Task<IEnumerable<Proposal>> GetBySubmitterIdAsync(int submitterId)
        {
            return await _context.Proposals
                .Include(p => p.Submitter)
                .Where(p => p.SubmitterId == submitterId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<PagedResult<Proposal>> GetPagedBySubmitterIdAsync(int submitterId, int page, int pageSize)
        {
            var p = page <= 0 ? 1 : page;
            var ps = pageSize <= 0 ? 10 : pageSize;

            var query = _context.Proposals
                .Include(p => p.Submitter)
                .Where(prop => prop.SubmitterId == submitterId)
                .OrderByDescending(prop => prop.CreatedAt);

            var count = await query.CountAsync();
            var items = await query.Skip((p - 1) * ps).Take(ps).ToListAsync();

            return new PagedResult<Proposal>(items, count, p, ps);
        }

        public async Task AddAsync(Proposal proposal)
        {
            await _context.Proposals.AddAsync(proposal);
        }

        public async Task<bool> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
