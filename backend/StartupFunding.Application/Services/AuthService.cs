using StartupFunding.Application.DTOs.Auth;
using StartupFunding.Application.Interfaces;
using StartupFunding.Domain.Entities;
using StartupFunding.Domain.Interfaces;

namespace StartupFunding.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;

    public AuthService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<string> LoginAsync(LoginDto loginDto)
    {
        var user = await _userRepository.GetByUsernameAsync(loginDto.Username);
        if (user == null || user.PasswordHash != loginDto.Password) // Simple plain comparison for placeholder
        {
            throw new Exception("Invalid username or password");
        }
        return "fake-jwt-token-for-user-" + user.Username;
    }

    public async Task RegisterAsync(RegisterDto registerDto)
    {
        var user = new User
        {
            Username = registerDto.Username,
            PasswordHash = registerDto.Password,
            Role = registerDto.Role
        };
        await _userRepository.AddAsync(user);
    }
}
