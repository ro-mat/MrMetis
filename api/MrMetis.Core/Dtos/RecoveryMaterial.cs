namespace MrMetis.Core.Dtos;

/// <summary>
/// A recovery key as the server sees it: the auth key derived from it, and the data key wrapped with it
/// </summary>
public record RecoveryMaterial(string AuthKey, string WrappedKey);
