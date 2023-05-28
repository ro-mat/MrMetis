using System.Threading.Tasks;
using MrMetis.Core.Dtos;
using MrMetis.Core.Entities;
using MrMetis.Core.Exceptions;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Interfaces.Base;
using MrMetis.Core.Specifications;

namespace MrMetis.Core.Services;

public class UserDataService : IUserDataService
{
    private readonly IAsyncRepository<User> _userRepository;

    public UserDataService(IAsyncRepository<User> userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserDataDto> GetAsync(int userId)
    {
        var user = await _userRepository.GetAsync(new UserSpecification(userId));
        if (user is null)
        {
            throw new MrMetisException("userNotFound");
        }

        if (user.UserData is null)
        {
            user.UserData = new UserData();
            await _userRepository.UpdateAsync(user);
        }

        return new UserDataDto(user.UserData);
    }

    public async Task<UserDataDto> SetAsync(int userId, UserDataDto model)
    {
        var user = await _userRepository.GetAsync(new UserSpecification(userId));
        if (user is null)
        {
            throw new MrMetisException("userNotFound");
        }

        if (user.UserData is null)
        {
            user.UserData = new UserData();
        }

        user.UserData.Data = model.Data;

        await _userRepository.UpdateAsync(user);

        return new UserDataDto(user.UserData);
    }

    public async Task DeleteAsync(int userId)
    {
        var user = await _userRepository.GetAsync(new UserSpecification(userId));
        if (user is null)
        {
            throw new MrMetisException("userNotFound");
        }

        if (user.UserData is null)
        {
            throw new MrMetisException("userDataNotFound");
        }

        await _userRepository.UpdateAsync(user);
    }
}