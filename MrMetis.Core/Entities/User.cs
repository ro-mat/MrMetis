using MrMetis.Core.Entities.Base;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Interfaces.Base;

namespace MrMetis.Core.Entities;

public class User : BaseEntity, IAggregateRoot
{
    public string Email { get; set; }
    public string Password { get; set; }
    public string Salt { get; set; }

    public int UserDataId { get; set; }
    public virtual UserData UserData { get; set; }
}