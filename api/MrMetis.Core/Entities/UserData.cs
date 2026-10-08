namespace MrMetis.Core.Entities;

public class UserData
{
    public int Id { get; set; }
    public string? Data { get; set; }

    public int UserId { get; set; }
    public virtual User User { get; set; } = null!;

    public bool IsActive { get; set; }
    public DateTime Created { get; set; }
    public DateTime? Modified { get; set; }
}
