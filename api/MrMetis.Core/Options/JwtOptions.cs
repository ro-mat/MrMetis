using System.ComponentModel.DataAnnotations;

namespace MrMetis.Core.Options;

public class JwtOptions
{
    public const string SectionName = "Authentication:Jwt";

    // HMAC-SHA256 needs a key of at least 256 bits
    [Required, MinLength(32)]
    public string Secret { get; set; } = null!;

    [Required]
    public string Issuer { get; set; } = null!;

    [Required]
    public string Audience { get; set; } = null!;

    [Range(1, int.MaxValue)]
    public int ExpirationMinutes { get; set; } = 120;
}
