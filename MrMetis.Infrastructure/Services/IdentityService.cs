using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using MrMetis.Core;
using MrMetis.Core.Dtos;
using MrMetis.Core.Entities;
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

    public async Task<PreloginResponse> PreloginAsync(string email, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);

        // a stable made up salt for unknown emails, so the answer doesn't tell whether the email is registered
        return user is null
            ? new PreloginResponse(FakeSalt(email), Kdf.MinIterations)
            : new PreloginResponse(user.KdfSalt, user.KdfIterations);
    }

    public async Task<AuthenticationResult> RegisterAsync(string email, string password, string invitationCode, KeyMaterial keys, CancellationToken ct = default)
    {
        if (!IsValid(keys))
        {
            return AuthenticationResult.Failed("kdfInvalid");
        }

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
            KdfSalt = keys.Salt,
            KdfIterations = keys.Iterations,
            WrappedKey = keys.WrappedKey,
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

        return AuthenticationResult.Succeeded(CreateToken(user), user.WrappedKey);
    }

    public async Task<AuthenticationResult> LoginAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);
        if (user is null || !await VerifyPasswordAsync(user, password, ct))
        {
            return AuthenticationResult.Failed("failedLogin");
        }

        return AuthenticationResult.Succeeded(CreateToken(user), user.WrappedKey);
    }

    private static bool IsValid(KeyMaterial keys) =>
        keys.Iterations >= Kdf.MinIterations
        && !string.IsNullOrWhiteSpace(keys.WrappedKey)
        && IsBase64OfLength(keys.Salt, Kdf.SaltBytes);

    private static bool IsBase64OfLength(string value, int bytes)
    {
        var buffer = new byte[bytes + 1];
        return Convert.TryFromBase64String(value, buffer, out var written) && written == bytes;
    }

    private string FakeSalt(string email)
    {
        var key = Encoding.UTF8.GetBytes(_jwt.Secret);
        var hash = HMACSHA256.HashData(key, Encoding.UTF8.GetBytes($"prelogin:{email.Trim().ToLowerInvariant()}"));
        return Convert.ToBase64String(hash, 0, Kdf.SaltBytes);
    }

    private async Task<bool> VerifyPasswordAsync(User user, string password, CancellationToken ct)
    {
        var result = passwordHasher.VerifyHashedPassword(user, user.Password, password);
        if (result == PasswordVerificationResult.Failed)
        {
            return false;
        }

        // the hasher asks for this when its defaults get stronger
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.Password = passwordHasher.HashPassword(user, password);
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
