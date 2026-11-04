namespace MrMetis.Core.Responses;

public record AuthenticationResult(bool Success, string? Token, string? WrappedKey, IReadOnlyList<string> Errors, bool HasRecoveryKey = false)
{
    public static AuthenticationResult Succeeded(string token, string wrappedKey, bool hasRecoveryKey) =>
        new(true, token, wrappedKey, [], hasRecoveryKey);

    /// <summary>
    /// For changes of an already authenticated user, nothing new to hand out
    /// </summary>
    public static AuthenticationResult Succeeded() => new(true, null, null, []);

    public static AuthenticationResult Failed(string error) => new(false, null, null, [error]);
}
