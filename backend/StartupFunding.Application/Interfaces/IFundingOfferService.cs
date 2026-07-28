using StartupFunding.Application.DTOs.FundingOffer;

namespace StartupFunding.Application.Interfaces;

public interface IFundingOfferService
{
    Task CreateOfferAsync(CreateOfferDto dto, int investorId);
}
