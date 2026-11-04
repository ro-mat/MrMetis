using MrMetis.Core.Dtos;

namespace MrMetis.Core.Requests;

/// <summary>
/// Sets a new password with the recovery key and replaces the recovery key, which is shown to the user once used.
/// The recovery key and the new password are the client's auth keys
/// </summary>
public record RecoverRequest(
    string Email,
    string RecoveryKey,
    string NewPassword,
    string Salt,
    int Iterations,
    string WrappedKey,
    RecoveryMaterial NewRecovery);
