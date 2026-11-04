using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using MrMetis.Core.Options;
using MrMetis.Core.Responses;
using MrMetis.Infrastructure.Telemetry;

namespace MrMetis.Api.Extensions;

public static class RateLimitPolicies
{
    public const string Credentials = "credentials";
    public const string Prelogin = "prelogin";
    public const string Account = "account";
}

/// <summary>
/// In-memory limits for the endpoints that check secrets, against guessing and against the slow password hash
/// being used to load the server. Each policy counts on its own.
/// </summary>
public static class RateLimiting
{
    public const string RejectedError = "tooManyRequests";

    public static WebApplicationBuilder AddRateLimits(this WebApplicationBuilder builder)
    {
        builder.Services.AddOptions<RateLimitOptions>()
            .BindConfiguration(RateLimitOptions.SectionName)
            .Validate(options => options.IsValid(), "RateLimiting limits and windows must be positive")
            .ValidateOnStart();

        builder.Services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(RateLimitPolicies.Credentials,
                context => Partition(context, o => o.Credentials, (c, o) => ClientKey(c, o.ClientIpHeader)));
            options.AddPolicy(RateLimitPolicies.Prelogin,
                context => Partition(context, o => o.Prelogin, (c, o) => ClientKey(c, o.ClientIpHeader)));
            // runs before authorization, so a request without a valid token counts against its IP
            options.AddPolicy(RateLimitPolicies.Account,
                context => Partition(context, o => o.Account, (c, o) =>
                    c.User.GetUserId() is { } userId ? $"user:{userId}" : ClientKey(c, o.ClientIpHeader)));
            options.OnRejected = OnRejectedAsync;
        });

        return builder;
    }

    /// <summary>
    /// The client's IP: the first address in the configured header, else the connection's
    /// </summary>
    public static string ClientKey(HttpContext context, string? header)
    {
        if (!string.IsNullOrEmpty(header)
            && context.Request.Headers[header].ToString().Split(',')[0].Trim() is { Length: > 0 } fromHeader)
        {
            return fromHeader;
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static RateLimitPartition<string> Partition(
        HttpContext context,
        Func<RateLimitOptions, PolicyLimit> limitOf,
        Func<HttpContext, RateLimitOptions, string> keyOf)
    {
        var options = context.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value;
        if (!options.Enabled)
        {
            return RateLimitPartition.GetNoLimiter(string.Empty);
        }

        // fixed windows tell when the next one starts, which becomes Retry-After (sliding ones don't)
        var limit = limitOf(options);
        return RateLimitPartition.GetFixedWindowLimiter(keyOf(context, options), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = limit.PermitLimit,
            Window = TimeSpan.FromSeconds(limit.WindowSeconds),
            QueueLimit = 0
        });
    }

    // the same body as other failed identity requests, so the client shows it like any error code
    private static async ValueTask OnRejectedAsync(OnRejectedContext context, CancellationToken ct)
    {
        var http = context.HttpContext;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            http.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        }

        var policy = http.GetEndpoint()?.Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName ?? "unknown";
        http.RequestServices.GetRequiredService<MrMetisMetrics>().RateLimited(policy);

        await http.Response.WriteAsJsonAsync(new AuthFailedResponse([RejectedError]), ct);
    }
}
