using System.Threading.Tasks;
using MrMetis.Core.Dtos;

namespace MrMetis.Core.Interfaces;

public interface IUserDataService
{
    Task<UserDataDto> GetAsync(int userId);
    Task<UserDataDto> SetAsync(int userId, UserDataDto userData);
    Task DeleteAsync(int userId);
}