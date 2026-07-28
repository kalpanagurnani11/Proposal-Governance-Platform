using StartupFunding.Domain.Entities;

namespace StartupFunding.Domain.Interfaces;

public interface INotificationRepository
{
    Task<IEnumerable<Notification>> GetByUserIdAsync(int userId);
    Task AddAsync(Notification notification);
    Task UpdateAsync(Notification notification);
}
