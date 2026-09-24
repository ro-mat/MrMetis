namespace MrMetis.Core.Responses;

public record AuthenticationResult(bool Success, string? Token, IReadOnlyList<string> Errors)
{
    public static AuthenticationResult Succeeded(string token) => new(true, token, []);

    public static AuthenticationResult Failed(string error) => new(false, null, [error]);
}
