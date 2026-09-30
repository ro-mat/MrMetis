namespace MrMetis.Core.Dtos;

/// <summary>
/// Size of the user's encrypted data and how much they may store
/// </summary>
public record StorageUsage(long UsedBytes, long LimitBytes);
