using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
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
    IOptions<StorageOptions> storageOptions,
    IOptionsMonitor<FeatureOptions> featureOptions,
    ITokenService tokenService,
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

    public async Task<AuthenticationResult> RegisterAsync(string email, string password, string? invitationCode, KeyMaterial keys, CancellationToken ct = default)
    {
        if (!IsValid(keys))
        {
            return AuthenticationResult.Failed("kdfInvalid");
        }

        InvitationCode? code = null;
        if (featureOptions.CurrentValue.InvitationCode)
        {
            code = await db.InvitationCodes.FirstOrDefaultAsync(x => x.Code == invitationCode, ct);
            if (code is null)
            {
                return AuthenticationResult.Failed("codeInvalid");
            }
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
            StorageLimitBytes = storageOptions.Value.DefaultLimitBytes,
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
        if (code is not null)
        {
            code.IsActive = false;
            code.Modified = now;
        }

        await db.SaveChangesAsync(ct);

        return AuthenticationResult.Succeeded(tokenService.CreateToken(user.Id, user.Email), user.WrappedKey);
    }

    public async Task<AuthenticationResult> LoginAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);
        if (user is null || !await VerifyPasswordAsync(user, password, ct))
        {
            return AuthenticationResult.Failed("failedLogin");
        }

        return AuthenticationResult.Succeeded(tokenService.CreateToken(user.Id, user.Email), user.WrappedKey);
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
}
