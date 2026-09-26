namespace MrMetis.Core.Entities;

public class User
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string Password { get; set; }

    /// <summary>
    /// Client-side key derivation salt, base64
    /// </summary>
    public required string KdfSalt { get; set; }

    /// <summary>
    /// Client-side PBKDF2 iterations, see <see cref="Kdf"/>
    /// </summary>
    public int KdfIterations { get; set; }

    /// <summary>
    /// The data key, encrypted by the client with a key derived from the password
    /// </summary>
    public required string WrappedKey { get; set; }

    public virtual UserData UserData { get; set; } = null!;

    public bool IsActive { get; set; }
    public DateTime Created { get; set; }
    public DateTime? Modified { get; set; }
}
