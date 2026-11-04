namespace MrMetis.Core.Requests;

/// <summary>
/// The recovery key is the auth key derived from it
/// </summary>
public record RecoveryStartRequest(string Email, string RecoveryKey);
