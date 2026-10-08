namespace MrMetis.Core.Responses;

public record AuthFailedResponse(IReadOnlyList<string> Errors);
