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
        return new UserDataDto(userData.Data);
    }

    public async Task<UserDataDto> SetAsync(int userId, UserDataDto model, CancellationToken ct = default)
    {
        var userData = await GetUserDataAsync(userId, ct);
        userData.Data = model.Data;
        userData.Modified = timeProvider.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);

        return new UserDataDto(userData.Data);
    }

    private async Task<UserData> GetUserDataAsync(int userId, CancellationToken ct)
    {
        // a deactivated user keeps a valid token until it expires, so check the user too
        var userData = await db.UserDatas
            .FirstOrDefaultAsync(d => d.UserId == userId && d.User.IsActive, ct);

        return userData ?? throw new MrMetisException("userNotFound");
    }
}
