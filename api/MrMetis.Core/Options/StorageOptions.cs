using System.ComponentModel.DataAnnotations;

namespace MrMetis.Core.Options;

public class StorageOptions
{
    public const string SectionName = "Storage";

    /// <summary>
    /// Space for the encrypted data a new user gets, fixed for the user at registration
    /// </summary>
    [Range(1, int.MaxValue)]
    public int DefaultLimitMegabytes { get; set; } = 10;

    public long DefaultLimitBytes => DefaultLimitMegabytes * 1024L * 1024L;
}
