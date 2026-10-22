using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using MrMetis.Core;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Options;

namespace MrMetis.Infrastructure.Services;

public class TokenService(IOptions<JwtOptions> jwtOptions, TimeProvider timeProvider) : ITokenService
{
    private readonly JwtOptions _jwt = jwtOptions.Value;

    public string CreateToken(int userId, string email)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Email, email),
                new Claim(MrMetisClaims.UserId, userId.ToString())
            ]),
            Expires = timeProvider.GetUtcNow().UtcDateTime.AddMinutes(_jwt.ExpirationMinutes),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience
        };

        return new JsonWebTokenHandler().CreateToken(tokenDescriptor);
    }
}
