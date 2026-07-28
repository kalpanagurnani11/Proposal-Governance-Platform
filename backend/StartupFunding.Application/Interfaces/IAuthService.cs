using StartupFunding.Application.DTOs.Auth;

namespace StartupFunding.Application.Interfaces;

public interface IAuthService
{
    Task<string> LoginAsync(LoginDto loginDto);
    Task RegisterAsync(RegisterDto registerDto);
}
