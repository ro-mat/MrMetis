using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using MrMetis.Core.Entities;
using MrMetis.Core.Helpers;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Interfaces.Base;
using MrMetis.Core.Responses;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace MrMetis.Core.Services;

public class IdentityService : IIdentityService
{
    private readonly IConfiguration _configuration;
    private readonly IAsyncRepository<User> _userRepository;
    private readonly IAsyncRepository<InvitationCode> _invitationCodeRepository;

    public IdentityService(IConfiguration configuration, IAsyncRepository<User> userRepository, IAsyncRepository<InvitationCode> invitationCodeRepository)
    {
        _configuration = configuration;
        _userRepository = userRepository;
        _invitationCodeRepository = invitationCodeRepository;
    }

    public async Task<AuthenticationResult> RegisterAsync(string email, string password, string invitationCode)
    {
        var code = await _invitationCodeRepository.GetAsync(x => x.Code == invitationCode);
        if (code == null)
        {
            return new AuthenticationResult
            {
                Errors = new[] { "codeInvalid" }
            };
        }

        var existingUser = await _userRepository.GetAsync(x => x.Email == email);
        if (existingUser is not null)
        {
            return new AuthenticationResult
            {
                Errors = new[] { "emailExists" }
            };
        }

        var userData = new UserData();

        var hashModel = HashHelper.HashString(password);
        var newUser = new User
        {
            Email = email,
            Password = hashModel.Hash,
            Salt = hashModel.Salt,
            UserData = new UserData()
        };

        var createdUser = await _userRepository.AddAsync(newUser);
        if (createdUser == null)
        {
            return new AuthenticationResult
            {
                Errors = new[] { "failedUserCreate" }
            };
        }

        await _invitationCodeRepository.DeleteAsync(code);

        var token = CreateToken(createdUser);
        return new AuthenticationResult
        {
            Success = true,
            Token = token
        };
    }

    public async Task<AuthenticationResult> LoginAsync(string email, string password)
    {
        var userModel = await _userRepository.GetAsync(x => x.Email == email);
        if (userModel == null)
        {
            return new AuthenticationResult
            {
                Errors = new[] { "failedLogin" }
            };
        }

        var hash = HashHelper.HashString(password, userModel.Salt).Hash;
        if (hash != userModel.Password)
        {
            return new AuthenticationResult
            {
                Errors = new[] { "failedLogin" }
            };
        }

        var token = CreateToken(userModel);
        return new AuthenticationResult
        {
            Success = true,
            Token = token
        };
    }

    private string CreateToken(User userModel)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_configuration["Authentication:Jwt:Secret"]);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                    new Claim(JwtRegisteredClaimNames.Sub, userModel.Email),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                    new Claim(JwtRegisteredClaimNames.Email, userModel.Email),
                    new Claim("id", userModel.Id.ToString())
                }),
            Expires = DateTime.UtcNow.AddHours(2),
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
            Issuer = _configuration["Authentication:Jwt:Issuer"],
            Audience = _configuration["Authentication:Jwt:Audience"]
        };

        var securityToken = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(securityToken);
    }
}