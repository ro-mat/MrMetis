using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using MrMetis.Api.Extensions;
using MrMetis.Core.Dtos;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Requests;
using MrMetis.Core.Responses;

namespace MrMetis.Api.Endpoints;

public static class IdentityEndpoints
{
    public static IEndpointRouteBuilder MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/identity").WithTags("Identity");

        group.MapGet("/me", Me).RequireAuthorization();
        group.MapPost("/prelogin", Prelogin);
        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        group.MapPost("/logout", Logout);

        return app;
    }

    private static Results<ContentHttpResult, BadRequest<string>> Me(ClaimsPrincipal user) =>
        user.GetEmail() is { } email
            ? TypedResults.Text(email)
            : TypedResults.BadRequest("identity not found :(");

    private static async Task<Ok<PreloginResponse>> Prelogin(
        PreloginRequest request, IIdentityService identityService, CancellationToken ct) =>
        TypedResults.Ok(await identityService.PreloginAsync(request.Email, ct));

    private static async Task<Results<Ok<AuthSuccessResponse>, BadRequest<AuthFailedResponse>>> Register(
        UserRegistrationRequest request, IIdentityService identityService, CancellationToken ct)
    {
        var keys = new KeyMaterial(request.Salt, request.Iterations, request.WrappedKey);
        var result = await identityService.RegisterAsync(request.Email, request.Password, request.InvitationCode, keys, ct);
        return ToResponse(result);
    }

    private static async Task<Results<Ok<AuthSuccessResponse>, BadRequest<AuthFailedResponse>>> Login(
        UserLoginRequest request, IIdentityService identityService, CancellationToken ct)
    {
        var result = await identityService.LoginAsync(request.Email, request.Password, ct);
        return ToResponse(result);
    }

    // tokens are stateless, the client drops its token
    private static Ok Logout() => TypedResults.Ok();

    private static Results<Ok<AuthSuccessResponse>, BadRequest<AuthFailedResponse>> ToResponse(AuthenticationResult result) =>
        result is { Success: true, Token: { } token, WrappedKey: { } wrappedKey }
            ? TypedResults.Ok(new AuthSuccessResponse(token, wrappedKey))
            : TypedResults.BadRequest(new AuthFailedResponse(result.Errors));
}
