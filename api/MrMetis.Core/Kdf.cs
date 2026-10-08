namespace MrMetis.Core;

/// <summary>
/// Client-side key derivation settings. The server only stores them, it never derives keys itself
/// </summary>
public static class Kdf
{
    // OWASP recommendation for PBKDF2-HMAC-SHA256
    public const int MinIterations = 600_000;

    public const int SaltBytes = 16;
}
