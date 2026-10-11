namespace MrMetis.Core.Responses;

public record AuthenticationResult(bool Success, string? Token, string? WrappedKey, IReadOnlyList<string> Errors)
{
    public static AuthenticationResult Succeeded(string token, string wrappedKey) => new(true, token, wrappedKey, []);

    public static AuthenticationResult Failed(string error) => new(false, null, null, [error]);
}
