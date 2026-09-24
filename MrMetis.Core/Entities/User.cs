namespace MrMetis.Core.Entities;

public class User
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string Password { get; set; }

    /// <summary>
    /// Only set for users whose password still uses the legacy <see cref="Helpers.HashHelper"/> hash
    /// </summary>
    public string? Salt { get; set; }

    public virtual UserData UserData { get; set; } = null!;

    public bool IsActive { get; set; }
    public DateTime Created { get; set; }
    public DateTime? Modified { get; set; }
}
