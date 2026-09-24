using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;
using MrMetis.Core;

namespace MrMetis.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static string? GetEmail(this ClaimsPrincipal user) =>
        user.FindFirstValue(JwtRegisteredClaimNames.Email);

    public static int? GetUserId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(MrMetisClaims.UserId), out var id) ? id : null;
}
