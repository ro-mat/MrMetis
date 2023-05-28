using System.Collections.Generic;

namespace MrMetis.Core.Responses;

public class AuthFailedResponse
{
    public IEnumerable<string> Errors { get; set; }
}