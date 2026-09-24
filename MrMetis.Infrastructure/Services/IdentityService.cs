using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using MrMetis.Core;
using MrMetis.Core.Entities;
using MrMetis.Core.Helpers;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Options;
using MrMetis.Core.Responses;
using MrMetis.Infrastructure.Contexts;

namespace MrMetis.Infrastructure.Services;

public class IdentityService(
    MrMetisContext db,
    IOptions<JwtOptions> jwtOptions,
    IPasswordHasher<User> passwordHasher,
    TimeProvider timeProvider) : IIdentityService
{
    private readonly JwtOptions _jwt = jwtOptions.Value;

    public async Task<AuthenticationResult> RegisterAsync(string email, string password, string invitationCode, CancellationToken ct = default)
    {
        var code = await db.InvitationCodes.FirstOrDefaultAsync(x => x.Code == invitationCode, ct);
        if (code is null)
        {
            return AuthenticationResult.Failed("codeInvalid");
        }

        if (await db.Users.AnyAsync(x => x.Email == email, ct))
        {
            return AuthenticationResult.Failed("emailExists");
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var user = new User
        {
            Email = email,
            Password = string.Empty,
            UserData = new UserData
            {
                IsActive = true,
                Created = now,
                Modified = now
            },
            IsActive = true,
            Created = now,
            Modified = now
        };
        user.Password = passwordHasher.HashPassword(user, password);
        db.Users.Add(user);

        // soft delete, the code can be used only once
        code.IsActive = false;
        code.Modified = now;

        await db.SaveChangesAsync(ct);

        return AuthenticationResult.Succeeded(CreateToken(user));
    }

    public async Task<AuthenticationResult> LoginAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);
        if (user is null || !await VerifyPasswordAsync(user, password, ct))
        {
            return AuthenticationResult.Failed("failedLogin");
        }

        return AuthenticationResult.Succeeded(CreateToken(user));
    }

    private async Task<bool> VerifyPasswordAsync(User user, string password, CancellationToken ct)
    {
        bool rehash;
        if (user.Salt is not null)
        {
            if (!HashHelper.Verify(password, user.Salt, user.Password))
            {
                return false;
            }

            rehash = true;
        }
        else
        {
            var result = passwordHasher.VerifyHashedPassword(user, user.Password, password);
            if (result == PasswordVerificationResult.Failed)
            {
                return false;
            }

            rehash = result == PasswordVerificationResult.SuccessRehashNeeded;
        }

        if (rehash)
        {
            user.Password = passwordHasher.HashPassword(user, password);
            user.Salt = null;
            user.Modified = timeProvider.GetUtcNow().UtcDateTime;
            await db.SaveChangesAsync(ct);
        }

        return true;
    }

    private string CreateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(MrMetisClaims.UserId, user.Id.ToString())
            ]),
            Expires = timeProvider.GetUtcNow().UtcDateTime.AddMinutes(_jwt.ExpirationMinutes),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience
        };

        return new JsonWebTokenHandler().CreateToken(tokenDescriptor);
    }
}
