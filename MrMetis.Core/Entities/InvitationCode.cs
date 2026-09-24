namespace MrMetis.Core.Entities;

public class InvitationCode
{
    public int Id { get; set; }
    public required string Code { get; set; }

    public bool IsActive { get; set; }
    public DateTime Created { get; set; }
    public DateTime? Modified { get; set; }
}
