using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using MrMetis.Api.Extensions;
using MrMetis.Core.Dtos;
using MrMetis.Core.Interfaces;

namespace MrMetis.Api.Endpoints;

public static class UserDataEndpoints
{
    public static IEndpointRouteBuilder MapUserDataEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/userdata")
            .WithTags("UserData")
            .RequireAuthorization();

        group.MapGet("", Get);
        group.MapPost("", Set);

        return app;
    }

    private static async Task<Results<Ok<UserDataDto>, UnauthorizedHttpResult>> Get(
        ClaimsPrincipal user, IUserDataService userDataService, CancellationToken ct)
    {
        if (user.GetUserId() is not { } userId)
        {
            return TypedResults.Unauthorized();
        }

        return TypedResults.Ok(await userDataService.GetAsync(userId, ct));
    }

    private static async Task<Results<Ok<UserDataDto>, UnauthorizedHttpResult>> Set(
        UserDataDto model, ClaimsPrincipal user, IUserDataService userDataService, CancellationToken ct)
    {
        if (user.GetUserId() is not { } userId)
        {
            return TypedResults.Unauthorized();
        }

        return TypedResults.Ok(await userDataService.SetAsync(userId, model, ct));
    }
}
