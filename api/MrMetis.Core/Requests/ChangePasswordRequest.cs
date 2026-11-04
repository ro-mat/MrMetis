namespace MrMetis.Core.Requests;

/// <summary>
/// Both passwords are the client's auth keys, the wrapped key is the same data key wrapped with the new password
/// </summary>
public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword,
    string Salt,
    int Iterations,
    string WrappedKey);
