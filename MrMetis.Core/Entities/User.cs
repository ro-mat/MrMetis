using MrMetis.Core.Entities.Base;

namespace MrMetis.Core.Entities;

public class User : BaseEntity
{
    public required string Email { get; set; }
    public required string Password { get; set; }

    /// <summary>
    /// Only set for users whose password still uses the legacy <see cref="Helpers.HashHelper"/> hash
    /// </summary>
    public string? Salt { get; set; }

    public int UserDataId { get; set; }
    public UserData UserData { get; set; } = null!;
}
