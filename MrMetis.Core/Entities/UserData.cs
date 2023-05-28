using MrMetis.Core.Entities.Base;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Interfaces.Base;

namespace MrMetis.Core.Entities;

public class UserData : BaseUserEntity
{
    public string Data { get; set; }
}