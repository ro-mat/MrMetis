using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MrMetis.Api.Authentication;
using MrMetis.Api.ExceptionHandling;
using MrMetis.Core.Options;
using MrMetis.Infrastructure.Telemetry;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace MrMetis.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static WebApplicationBuilder AddApiServices(this WebApplicationBuilder builder)
    {
        builder.AddCorsPolicy();
        builder.AddJwtAuthentication();
        builder.AddRateLimits();
        builder.AddTelemetry();

        builder.Services.AddMemoryCache();
        builder.Services.AddProblemDetails();
        builder.Services.AddExceptionHandler<MrMetisExceptionHandler>();
        builder.Services.AddOpenApi();

        return builder;
    }

    public static WebApplicationBuilder AddCorsPolicy(this WebApplicationBuilder builder)
    {
        var origins = builder.Configuration.GetSection("Settings:Cors").Get<string[]>() ?? [];

        builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
            .WithOrigins(origins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .WithExposedHeaders(TokenRefresh.HeaderName)));

        return builder;
    }

    public static WebApplicationBuilder AddJwtAuthentication(this WebApplicationBuilder builder)
    {
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer();

        builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((options, jwtOptions) =>
            {
                var jwt = jwtOptions.Value;

                // keep the token's claim names ("email", "id") instead of mapping them to ClaimTypes URIs
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateLifetime = true
                };
            });

        builder.Services.AddAuthorization();

        return builder;
    }

    /// <summary>
    /// Sends traces, metrics and logs over OTLP. Endpoint, service name and resource attributes come from
    /// the OTEL_* environment variables; without OTEL_EXPORTER_OTLP_ENDPOINT (local development) nothing is sent
    /// and the user stats aren't counted.
    /// </summary>
    public static WebApplicationBuilder AddTelemetry(this WebApplicationBuilder builder)
    {
        if (string.IsNullOrEmpty(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]))
        {
            return builder;
        }

        builder.Services.AddHostedService<UserStatsCollector>();

        builder.Services.AddOpenTelemetry()
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation(options =>
                    // health probes from the deploy smoke test would only add noise
                    options.Filter = context => !context.Request.Path.StartsWithSegments("/health"))
                .AddHttpClientInstrumentation())
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation()
                .AddMeter(MrMetisMetrics.MeterName))
            .WithLogging()
            .UseOtlpExporter();

        return builder;
    }
}
