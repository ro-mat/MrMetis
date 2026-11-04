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

    /// <summary>
    /// Hash of the auth key derived from the recovery key, null when the user has no recovery key
    /// </summary>
    public string? RecoveryAuthHash { get; set; }

    /// <summary>
    /// The same data key, encrypted by the client with a key derived from the recovery key
    /// </summary>
    public string? RecoveryWrappedKey { get; set; }

    public DateTime? RecoveryCreated { get; set; }

    /// <summary>
    /// How much encrypted data the user may store, fixed at registration
    /// </summary>
    public long StorageLimitBytes { get; set; }

    public virtual UserData UserData { get; set; } = null!;

    public bool IsActive { get; set; }
    public DateTime Created { get; set; }
    public DateTime? Modified { get; set; }
}
