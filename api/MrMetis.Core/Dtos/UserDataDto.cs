namespace MrMetis.Core.Dtos;

/// <summary>
/// The client sends only the data, the server answers with the usage too
/// </summary>
public record UserDataDto(string? Data, StorageUsage? Usage = null);
