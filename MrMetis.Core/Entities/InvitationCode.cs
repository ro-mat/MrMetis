using MrMetis.Core.Entities.Base;

namespace MrMetis.Core.Entities;

public class InvitationCode : BaseEntity
{
    public required string Code { get; set; }
}
