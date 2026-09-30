using System.Text;
using Microsoft.EntityFrameworkCore;
using MrMetis.Core.Dtos;
using MrMetis.Core.Entities;
using MrMetis.Core.Exceptions;
using MrMetis.Core.Interfaces;
using MrMetis.Infrastructure.Contexts;

namespace MrMetis.Infrastructure.Services;

public class UserDataService(MrMetisContext db, TimeProvider timeProvider) : IUserDataService
{
    public async Task<UserDataDto> GetAsync(int userId, CancellationToken ct = default)
    {
        var userData = await GetUserDataAsync(userId, ct);
        return new UserDataDto(userData.Data, Usage(userData.Data, userData.User));
    }

    public async Task<UserDataDto> SetAsync(int userId, UserDataDto model, CancellationToken ct = default)
    {
        var userData = await GetUserDataAsync(userId, ct);

        var usage = Usage(model.Data, userData.User);
        if (usage.UsedBytes > usage.LimitBytes)
        {
            throw new MrMetisException("storageLimitExceeded");
        }

        userData.Data = model.Data;
        userData.Modified = timeProvider.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);

        // the client has the data already, sending it back is a waste
        return new UserDataDto(null, usage);
    }

    // only the encrypted data counts; it is base64, so characters are bytes
    private static StorageUsage Usage(string? data, User user) =>
        new(Encoding.UTF8.GetByteCount(data ?? string.Empty), user.StorageLimitBytes);

    private async Task<UserData> GetUserDataAsync(int userId, CancellationToken ct)
    {
        // a deactivated user keeps a valid token until it expires, so check the user too
        var userData = await db.UserDatas
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.UserId == userId && d.User.IsActive, ct);

        return userData ?? throw new MrMetisException("userNotFound");
    }
}
