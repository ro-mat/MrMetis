namespace MrMetis.Core.Responses;

/// <summary>
/// What the client needs to derive its keys from the password
/// </summary>
public record PreloginResponse(string Salt, int Iterations);
