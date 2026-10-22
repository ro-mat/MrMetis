using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using MrMetis.Core.Options;

namespace MrMetis.Api.Endpoints;

public static class FeatureEndpoints
{
    // appsettings changes show up without a restart, at most this late
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
    private const string CacheKey = "features";

    public static IEndpointRouteBuilder MapFeatureEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/features", Get)
            .WithTags("Features");

        return app;
    }

    private static Ok<FeatureOptions> Get(IOptionsMonitor<FeatureOptions> features, IMemoryCache cache) =>
        TypedResults.Ok(cache.GetOrCreate(CacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            return features.CurrentValue;
        })!);
}
