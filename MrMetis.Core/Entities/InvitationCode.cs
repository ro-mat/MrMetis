using MrMetis.Core.Entities.Base;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Interfaces.Base;

namespace MrMetis.Core.Entities;

public class InvitationCode : BaseEntity, IAggregateRoot
{
    public string Code { get; set; }
}