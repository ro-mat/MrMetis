using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MrMetis.Core;
using MrMetis.Core.Dtos;
using MrMetis.Core.Entities;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Requests;
using MrMetis.Core.Options;
using MrMetis.Core.Responses;
using MrMetis.Infrastructure.Contexts;
using MrMetis.Infrastructure.Telemetry;

namespace MrMetis.Infrastructure.Services;

public class IdentityService(
    MrMetisContext db,
    IOptions<JwtOptions> jwtOptions,
    IOptions<StorageOptions> storageOptions,
    IOptionsMonitor<FeatureOptions> featureOptions,
    ITokenService tokenService,
    IPasswordHasher<User> passwordHasher,
    MrMetisMetrics metrics,
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

    public async Task<AuthenticationResult> RegisterAsync(string email, string password, string? invitationCode, KeyMaterial keys, RecoveryMaterial? recovery = null, CancellationToken ct = default)
    {
        var result = await RegisterUserAsync(email, password, invitationCode, keys, recovery, ct);
        metrics.Registration(result.Success ? MrMetisMetrics.Success : result.Errors[0]);
        return result;
    }

    public async Task<AuthenticationResult> LoginAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);
        if (user is null || !await VerifyPasswordAsync(user, password, ct))
        {
            metrics.Login(success: false);
            return AuthenticationResult.Failed("failedLogin");
        }

        metrics.Login(success: true);
        return Succeeded(user);
    }

    public async Task<KeyMaterial?> GetKeysAsync(int userId, CancellationToken ct = default) =>
        await db.Users
            .Where(x => x.Id == userId)
            .Select(x => new KeyMaterial(x.KdfSalt, x.KdfIterations, x.WrappedKey))
            .FirstOrDefaultAsync(ct);

    public async Task<AuthenticationResult> ChangePasswordAsync(int userId, string currentPassword, string newPassword, KeyMaterial keys, CancellationToken ct = default)
    {
        var result = await ChangeUserPasswordAsync(userId, currentPassword, newPassword, keys, ct);
        metrics.PasswordChange(result.Success ? MrMetisMetrics.Success : result.Errors[0]);
        return result;
    }

    private async Task<AuthenticationResult> ChangeUserPasswordAsync(int userId, string currentPassword, string newPassword, KeyMaterial keys, CancellationToken ct)
    {
        if (!IsValid(keys))
        {
            return AuthenticationResult.Failed("kdfInvalid");
        }

        var user = await db.Users.FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null || !await VerifyPasswordAsync(user, currentPassword, ct))
        {
            return AuthenticationResult.Failed("failedLogin");
        }

        // the data key stays the same, only how it is wrapped changes, so the user data needs no re-encryption
        user.Password = passwordHasher.HashPassword(user, newPassword);
        user.KdfSalt = keys.Salt;
        user.KdfIterations = keys.Iterations;
        user.WrappedKey = keys.WrappedKey;
        user.Modified = timeProvider.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);

        return AuthenticationResult.Succeeded();
    }

    public async Task<RecoveryStatus> GetRecoveryStatusAsync(int userId, CancellationToken ct = default) =>
        new(await db.Users
            .Where(x => x.Id == userId)
            .Select(x => x.RecoveryCreated)
            .FirstOrDefaultAsync(ct));

    public async Task<AuthenticationResult> SetRecoveryAsync(int userId, string currentPassword, RecoveryMaterial recovery, CancellationToken ct = default)
    {
        var result = await SetUserRecoveryAsync(userId, currentPassword, recovery, ct);
        metrics.RecoverySet(result.Success ? MrMetisMetrics.Success : result.Errors[0]);
        return result;
    }

    public async Task<string?> StartRecoveryAsync(string email, string recoveryKey, CancellationToken ct = default)
    {
        var user = await FindByRecoveryKeyAsync(email, recoveryKey, ct);
        if (user is null)
        {
            metrics.Recovery("recoveryFailed");
        }

        return user?.RecoveryWrappedKey;
    }

    public async Task<AuthenticationResult> RecoverAsync(RecoverRequest request, CancellationToken ct = default)
    {
        var result = await RecoverUserAsync(request, ct);
        metrics.Recovery(result.Success ? MrMetisMetrics.Success : result.Errors[0]);
        return result;
    }

    private async Task<AuthenticationResult> SetUserRecoveryAsync(int userId, string currentPassword, RecoveryMaterial recovery, CancellationToken ct)
    {
        if (!IsValid(recovery))
        {
            return AuthenticationResult.Failed("recoveryInvalid");
        }

        var user = await db.Users.FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null || !await VerifyPasswordAsync(user, currentPassword, ct))
        {
            return AuthenticationResult.Failed("failedLogin");
        }

        // replaces the previous key, which stops working
        SetRecovery(user, recovery);
        user.Modified = user.RecoveryCreated;
        await db.SaveChangesAsync(ct);

        return AuthenticationResult.Succeeded();
    }

    // The flow is stateless: the recovery key is checked again here instead of handing out a token after the lookup
    private async Task<AuthenticationResult> RecoverUserAsync(RecoverRequest request, CancellationToken ct)
    {
        var keys = new KeyMaterial(request.Salt, request.Iterations, request.WrappedKey);
        if (!IsValid(keys) || !IsValid(request.NewRecovery))
        {
            return AuthenticationResult.Failed("kdfInvalid");
        }

        var user = await FindByRecoveryKeyAsync(request.Email, request.RecoveryKey, ct);
        if (user is null)
        {
            return AuthenticationResult.Failed("recoveryFailed");
        }

        // the same data key wrapped for the new password, and a new recovery key as the old one has been used
        user.Password = passwordHasher.HashPassword(user, request.NewPassword);
        user.KdfSalt = keys.Salt;
        user.KdfIterations = keys.Iterations;
        user.WrappedKey = keys.WrappedKey;
        SetRecovery(user, request.NewRecovery);
        user.Modified = user.RecoveryCreated;
        await db.SaveChangesAsync(ct);

        return Succeeded(user);
    }

    // an unknown email, a user without a recovery key and a wrong key all look the same to the caller
    private async Task<User?> FindByRecoveryKeyAsync(string email, string recoveryKey, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);
        if (user?.RecoveryAuthHash is null)
        {
            return null;
        }

        return passwordHasher.VerifyHashedPassword(user, user.RecoveryAuthHash, recoveryKey) == PasswordVerificationResult.Failed
            ? null
            : user;
    }

    private void SetRecovery(User user, RecoveryMaterial recovery)
    {
        user.RecoveryAuthHash = passwordHasher.HashPassword(user, recovery.AuthKey);
        user.RecoveryWrappedKey = recovery.WrappedKey;
        user.RecoveryCreated = timeProvider.GetUtcNow().UtcDateTime;
    }

    private AuthenticationResult Succeeded(User user) =>
        AuthenticationResult.Succeeded(tokenService.CreateToken(user.Id, user.Email), user.WrappedKey, user.RecoveryAuthHash is not null);

    private async Task<AuthenticationResult> RegisterUserAsync(string email, string password, string? invitationCode, KeyMaterial keys, RecoveryMaterial? recovery, CancellationToken ct)
    {
        if (!IsValid(keys) || (recovery is not null && !IsValid(recovery)))
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
        if (recovery is not null)
        {
            SetRecovery(user, recovery);
            user.RecoveryCreated = now;
        }

        db.Users.Add(user);

        // soft delete, the code can be used only once
        if (code is not null)
        {
            code.IsActive = false;
            code.Modified = now;
        }

        await db.SaveChangesAsync(ct);

        return Succeeded(user);
    }

    // null too, as the request body may leave it out
    private static bool IsValid(RecoveryMaterial? recovery) =>
        recovery is not null && !string.IsNullOrWhiteSpace(recovery.AuthKey) && !string.IsNullOrWhiteSpace(recovery.WrappedKey);

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
