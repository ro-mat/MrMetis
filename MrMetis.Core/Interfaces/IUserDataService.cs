using MrMetis.Core.Dtos;

namespace MrMetis.Core.Interfaces;

public interface IUserDataService
{
    Task<UserDataDto> GetAsync(int userId, CancellationToken ct = default);
    Task<UserDataDto> SetAsync(int userId, UserDataDto userData, CancellationToken ct = default);
}
