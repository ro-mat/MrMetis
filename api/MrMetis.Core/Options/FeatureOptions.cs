namespace MrMetis.Core.Options;

/// <summary>
/// Switches for functionality that is only on in some environments; the client reads them from /api/features
/// </summary>
public class FeatureOptions
{
    public const string SectionName = "Features";

    /// <summary>
    /// Registration needs an invitation code
    /// </summary>
    public bool InvitationCode { get; set; }

    /// <summary>
    /// The client shows the raw data editor
    /// </summary>
    public bool RawData { get; set; }
}
