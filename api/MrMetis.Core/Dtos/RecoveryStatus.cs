namespace MrMetis.Core.Dtos;

/// <summary>
/// When the current recovery key was created, null when the user has none
/// </summary>
public record RecoveryStatus(DateTime? Created);
