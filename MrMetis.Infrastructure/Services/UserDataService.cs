using Microsoft.EntityFrameworkCore;
using MrMetis.Core.Dtos;
using MrMetis.Core.Entities;
using MrMetis.Core.Exceptions;
using MrMetis.Core.Interfaces;
using MrMetis.Infrastructure.Contexts;

namespace MrMetis.Infrastructure.Services;

public class UserDataService(MrMetisContext db) : IUserDataService
{
    public async Task<UserDataDto> GetAsync(int userId, CancellationToken ct = default)
    {
        var user = await GetUserAsync(userId, ct);
        return new UserDataDto(user.UserData.Data);
    }

    public async Task<UserDataDto> SetAsync(int userId, UserDataDto model, CancellationToken ct = default)
    {
        var user = await GetUserAsync(userId, ct);
        user.UserData.Data = model.Data;
        await db.SaveChangesAsync(ct);

        return new UserDataDto(user.UserData.Data);
    }

    private async Task<User> GetUserAsync(int userId, CancellationToken ct)
    {
        var user = await db.Users
            .Include(u => u.UserData)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        return user ?? throw new MrMetisException("userNotFound");
    }
}
