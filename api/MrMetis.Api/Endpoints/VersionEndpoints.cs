using System.Reflection;

namespace MrMetis.Api.Endpoints;

public static class VersionEndpoints
{
    // set at publish time with -p:InformationalVersion=..., see the Dockerfile; .NET may append "+<commit>"
    private static readonly string Version =
        (typeof(VersionEndpoints).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "dev")
        .Split('+')[0];

    public static IEndpointRouteBuilder MapVersionEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/version", () => TypedResults.Ok(new { version = Version }))
            .WithTags("Version");

        return app;
    }
}
