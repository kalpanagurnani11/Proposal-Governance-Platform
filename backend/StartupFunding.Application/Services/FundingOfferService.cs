using StartupFunding.Application.DTOs.FundingOffer;
using StartupFunding.Application.Interfaces;

namespace StartupFunding.Application.Services;

public class FundingOfferService : IFundingOfferService
{
    public Task CreateOfferAsync(CreateOfferDto dto, int investorId)
    {
        // Simple stub
        return Task.CompletedTask;
    }
}
