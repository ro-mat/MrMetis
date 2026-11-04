namespace MrMetis.Core.Options;

/// <summary>
/// Limits for the endpoints that check passwords or recovery keys, per client IP or per user
/// </summary>
public class RateLimitOptions
{
    public const string SectionName = "RateLimiting";

    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Header holding the client's IP, set by a proxy in front of the API (CF-Connecting-IP behind Cloudflare).
    /// Only set it where every request comes through that proxy, otherwise clients can pick their own IP.
    /// Without it the connection's IP is used.
    /// </summary>
    public string? ClientIpHeader { get; set; }

    /// <summary>
    /// Login, registration and recovery, per client IP
    /// </summary>
    public PolicyLimit Credentials { get; set; } = new() { PermitLimit = 10, WindowSeconds = 300 };

    /// <summary>
    /// The salt lookup before every login, per client IP
    /// </summary>
    public PolicyLimit Prelogin { get; set; } = new() { PermitLimit = 30, WindowSeconds = 300 };

    /// <summary>
    /// Password change and recovery key creation, which check the current password, per user
    /// </summary>
    public PolicyLimit Account { get; set; } = new() { PermitLimit = 5, WindowSeconds = 900 };

    public bool IsValid() => Credentials.IsValid() && Prelogin.IsValid() && Account.IsValid();
}

public class PolicyLimit
{
    public int PermitLimit { get; set; }

    public int WindowSeconds { get; set; }

    public bool IsValid() => PermitLimit > 0 && WindowSeconds > 0;
}
