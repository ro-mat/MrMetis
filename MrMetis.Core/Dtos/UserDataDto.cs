using MrMetis.Core.Entities;

namespace MrMetis.Core.Dtos;

public class UserDataDto
{
    public string Data { get; set; }

    public UserDataDto() { }

    public UserDataDto(UserData model)
    {
        Data = model.Data;
    }
}