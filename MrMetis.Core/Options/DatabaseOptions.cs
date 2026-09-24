using System.ComponentModel.DataAnnotations;

namespace MrMetis.Core.Options;

public class DatabaseOptions
{
    public const string SectionName = "Database";

    [Required]
    public string ConnectionString { get; set; } = null!;

    /// <summary>
    /// Connection string with rights to create the database and login, only used in Development/Test
    /// </summary>
    public string? SetupConnectionString { get; set; }

    public string Schema { get; set; } = "dbo";

    [Range(1, int.MaxValue)]
    public int CommandTimeout { get; set; } = 30;
}
