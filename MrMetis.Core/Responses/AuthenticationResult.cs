using System.Collections.Generic;

namespace MrMetis.Core.Responses;

public class AuthenticationResult
{
    public string Token { get; set; } = null;
    public bool Success { get; set; }
    public IEnumerable<string> Errors { get; set; }
}