using MrMetis.Core.Dtos;

namespace MrMetis.Core.Requests;

/// <summary>
/// Creates or replaces the recovery key, the current password is the client's auth key
/// </summary>
public record SetRecoveryRequest(string CurrentPassword, RecoveryMaterial Recovery);
