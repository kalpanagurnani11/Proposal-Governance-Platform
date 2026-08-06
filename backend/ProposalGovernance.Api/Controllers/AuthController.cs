using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ProposalGovernance.Api.Models;
using ProposalGovernance.Api.Repositories;
using ProposalGovernance.Api.Services;
using ProposalGovernance.Api.Validators;

namespace ProposalGovernance.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly ITokenService _tokenService;
        private readonly IPatentVerificationService _patentVerificationService;

        public AuthController(IUserRepository userRepository, ITokenService tokenService, IPatentVerificationService patentVerificationService)
        {
            _userRepository = userRepository;
            _tokenService = tokenService;
            _patentVerificationService = patentVerificationService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(request.Username) || !ValidationHelpers.IsValidUsername(request.Username))
                return BadRequest(new { message = "Username must be 3-50 characters long and contain only letters, numbers, underscores, or hyphens." });

            if (string.IsNullOrWhiteSpace(request.Email) || !ValidationHelpers.IsValidEmail(request.Email))
                return BadRequest(new { message = "Please provide a valid email address." });

            if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length < 2)
                return BadRequest(new { message = "Full Name must be at least 2 characters long." });

            if (string.IsNullOrWhiteSpace(request.ContactNumber) || !ValidationHelpers.IsValidContactNumber(request.ContactNumber))
                return BadRequest(new { message = "Valid Contact Number (10-15 digits, e.g. +91 98123 45678) is required." });

            if (!ValidationHelpers.IsValidPassword(request.Password, out string passwordError))
                return BadRequest(new { message = passwordError });

            var existingUser = await _userRepository.GetByUsernameAsync(request.Username.Trim());
            if (existingUser != null)
                return BadRequest(new { message = "Username is already taken." });

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // Restrict roles to valid ones
            var role = request.Role;
            if (role != UserRoles.Admin && role != UserRoles.Reviewer && role != UserRoles.Founder && role != UserRoles.Investor)
            {
                role = UserRoles.Founder; // default fallback
            }

            var newUser = new User
            {
                Username = request.Username.Trim(),
                PasswordHash = passwordHash,
                Role = role,
                FullName = request.FullName.Trim(),
                Email = request.Email.Trim(),
                ContactNumber = request.ContactNumber.Trim(),
                Department = request.Department,
                PatentId = request.PatentId,
                PatentVerificationStatus = string.IsNullOrWhiteSpace(request.PatentId) ? null : "Unverified"
            };

            if (!string.IsNullOrWhiteSpace(request.PatentId))
            {
                var verificationResult = await _patentVerificationService.VerifyPatentAsync(request.PatentId);
                if (verificationResult.IsValid)
                {
                    newUser.PatentVerificationStatus = "Verified";
                    newUser.PatentDetailsJson = System.Text.Json.JsonSerializer.Serialize(new {
                        RecordType = verificationResult.RecordType ?? "GrantedPatent",
                        Authority  = verificationResult.Authority,
                        Title      = verificationResult.Title,
                        Abstract   = verificationResult.Abstract,
                        Inventors  = verificationResult.Inventors,
                        IssueDate  = verificationResult.IssueDate,
                        ApplicationStatus = verificationResult.ApplicationStatus,
                        PublicationDate   = verificationResult.PublicationDate,
                        ApplicationNumber = verificationResult.ApplicationNumber,
                        Status     = verificationResult.RecordType == "Application" ? "Pending Application" : "Granted"
                    });
                }
                else
                {
                    newUser.PatentVerificationStatus = "VerificationFailed";
                    newUser.PatentDetailsJson = System.Text.Json.JsonSerializer.Serialize(new {
                        Error = verificationResult.ErrorMessage ?? "Could not verify patent ID."
                    });
                }
            }

            await _userRepository.AddAsync(newUser);
            await _userRepository.SaveChangesAsync();

            return Ok(new { message = "Registration successful." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userRepository.GetByUsernameAsync(request.Username);
            if (user == null)
                return Unauthorized(new { message = "Invalid username or password." });

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
                return Unauthorized(new { message = "Invalid username or password." });

            var token = _tokenService.CreateToken(user);

            return Ok(new AuthResponse
            {
                Token = token,
                Id = user.Id,
                Username = user.Username,
                Role = user.Role,
                FullName = user.FullName,
                Email = user.Email,
                ContactNumber = user.ContactNumber,
                Department = user.Department,
                PatentId = user.PatentId,
                PatentVerificationStatus = user.PatentVerificationStatus,
                PatentDetailsJson = user.PatentDetailsJson
            });
        }

        [HttpPost("verify-patent")]
        public async Task<IActionResult> VerifyPatent([FromBody] VerifyPatentRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _userRepository.GetByIdAsync(request.UserId);
            if (user == null)
                return NotFound(new { message = "User not found." });

            if (string.IsNullOrWhiteSpace(request.PatentId))
            {
                user.PatentId = null;
                user.PatentVerificationStatus = null;
                user.PatentDetailsJson = null;
                await _userRepository.SaveChangesAsync();
                return Ok(new { 
                    message = "Patent ID removed.",
                    patentId = (string?)null,
                    patentVerificationStatus = (string?)null,
                    patentDetailsJson = (string?)null
                });
            }

            user.PatentId = request.PatentId;
            user.PatentVerificationStatus = "Unverified";
            await _userRepository.SaveChangesAsync();

            var verificationResult = await _patentVerificationService.VerifyPatentAsync(request.PatentId);
            if (verificationResult.IsValid)
            {
                user.PatentVerificationStatus = "Verified";
                user.PatentDetailsJson = System.Text.Json.JsonSerializer.Serialize(new {
                    RecordType = verificationResult.RecordType ?? "GrantedPatent",
                    Authority  = verificationResult.Authority,
                    Title      = verificationResult.Title,
                    Abstract   = verificationResult.Abstract,
                    Inventors  = verificationResult.Inventors,
                    IssueDate  = verificationResult.IssueDate,
                    ApplicationStatus = verificationResult.ApplicationStatus,
                    PublicationDate   = verificationResult.PublicationDate,
                    ApplicationNumber = verificationResult.ApplicationNumber,
                    Status     = verificationResult.RecordType == "Application" ? "Pending Application" : "Granted"
                });
            }
            else
            {
                user.PatentVerificationStatus = "VerificationFailed";
                user.PatentDetailsJson = System.Text.Json.JsonSerializer.Serialize(new {
                    Error = verificationResult.ErrorMessage ?? "Could not verify patent ID."
                });
            }

            await _userRepository.SaveChangesAsync();

            return Ok(new {
                message = verificationResult.IsValid ? "Patent verified successfully." : "Patent verification failed.",
                patentId = user.PatentId,
                patentVerificationStatus = user.PatentVerificationStatus,
                patentDetailsJson = user.PatentDetailsJson
            });
        }
    }

    public class RegisterRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // "Admin", "Reviewer", "Submitter"
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string ContactNumber { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string? PatentId { get; set; }
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string ContactNumber { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string? PatentId { get; set; }
        public string? PatentVerificationStatus { get; set; }
        public string? PatentDetailsJson { get; set; }
    }

    public class VerifyPatentRequest
    {
        public int UserId { get; set; }
        public string? PatentId { get; set; }
    }
}
