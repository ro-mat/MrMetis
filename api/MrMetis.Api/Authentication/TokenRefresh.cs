using MrMetis.Api.Extensions;
using MrMetis.Core.Interfaces;

namespace MrMetis.Api.Authentication;

/// <summary>
/// Rolling tokens: every successful authenticated request gets a fresh token back in a header, so a session
/// only expires after ExpirationMinutes without requests.
/// </summary>
public static class TokenRefresh
{
    public const string HeaderName = "X-Refreshed-Token";

    public static WebApplication UseTokenRefresh(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            if (context.User.GetUserId() is { } userId && context.User.GetEmail() is { } email)
            {
                context.Response.OnStarting(() =>
                {
                    if (context.Response.StatusCode is >= 200 and < 300)
                    {
                        var tokenService = context.RequestServices.GetRequiredService<ITokenService>();
                        context.Response.Headers[HeaderName] = tokenService.CreateToken(userId, email);
                    }

                    return Task.CompletedTask;
                });
            }

            await next();
        });

        return app;
    }
}
