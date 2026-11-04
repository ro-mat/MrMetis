using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.Metrics.Testing;
using MrMetis.Api.Extensions;
using MrMetis.Core.Dtos;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Requests;
using MrMetis.Core.Responses;
using MrMetis.Infrastructure.Telemetry;

namespace MrMetis.Test;

/// <summary>
/// The whole API pipeline with a stub identity service, so no database is needed
/// </summary>
public class RateLimitingTests
{
    private const string Header = "CF-Connecting-IP";

    private static readonly UserLoginRequest LoginBody = new("email@email.com", "password");

    private readonly List<WebApplicationFactory<Program>> _factories = [];

    [TearDown]
    public async Task TearDown()
    {
        foreach (var factory in _factories)
        {
            await factory.DisposeAsync();
        }

        _factories.Clear();
    }

    [Test]
    public async Task Login_OverTheLimit_ShouldBeRefusedWithRetryAfter()
    {
        var (client, factory) = Create();

        Assert.That((await Login(client)).StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        Assert.That((await Login(client)).StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        var refused = await Login(client);

        Assert.That(refused.StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests));
        Assert.That(refused.Headers.RetryAfter?.Delta, Is.GreaterThan(TimeSpan.Zero).And.LessThanOrEqualTo(TimeSpan.FromSeconds(60)));
        var body = await refused.Content.ReadFromJsonAsync<AuthFailedResponse>();
        Assert.That(body?.Errors, Is.EqualTo(new[] { RateLimiting.RejectedError }));
        Assert.That(RateLimitedTotals(factory)["credentials"], Is.EqualTo(1));
    }

    [Test]
    public async Task Credentials_ShouldShareOneBudgetAcrossLoginRegisterAndRecovery()
    {
        var (client, _) = Create();

        await Login(client);
        await client.PostAsJsonAsync("/api/identity/recover/start", new RecoveryStartRequest("email@email.com", "key"));

        Assert.That((await client.PostAsJsonAsync("/api/identity/register",
                new UserRegistrationRequest("email@email.com", "password", null, "salt", 1, "wrapped"))).StatusCode,
            Is.EqualTo(HttpStatusCode.TooManyRequests));
        Assert.That((await client.PostAsJsonAsync("/api/identity/recover",
                new RecoverRequest("email@email.com", "key", "new", "salt", 1, "wrapped", new RecoveryMaterial("a", "b")))).StatusCode,
            Is.EqualTo(HttpStatusCode.TooManyRequests));
    }

    [Test]
    public async Task Prelogin_ShouldHaveItsOwnBudget()
    {
        var (client, _) = Create();
        await Login(client);
        await Login(client);
        Assert.That((await Login(client)).StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests));

        var prelogin = await client.PostAsJsonAsync("/api/identity/prelogin", new PreloginRequest("email@email.com"));

        Assert.That(prelogin.StatusCode, Is.EqualTo(HttpStatusCode.OK));
    }

    [Test]
    public async Task ClientIpHeader_WhenConfigured_ShouldGiveEachClientItsOwnBudget()
    {
        var (client, _) = Create(new() { ["RateLimiting:ClientIpHeader"] = Header });

        await Login(client, "203.0.113.1");
        await Login(client, "203.0.113.1");

        Assert.That((await Login(client, "203.0.113.1")).StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests));
        Assert.That((await Login(client, "203.0.113.2")).StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task ClientIpHeader_WhenNotConfigured_ShouldBeIgnored()
    {
        var (client, _) = Create();

        await Login(client, "203.0.113.1");
        await Login(client, "203.0.113.2");

        // a made-up header doesn't buy a fresh budget
        Assert.That((await Login(client, "203.0.113.3")).StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests));
    }

    [Test]
    public async Task Account_ShouldCountPerUser()
    {
        var (client, factory) = Create();
        var alice = Token(factory, 1, "alice@email.com");
        var bob = Token(factory, 2, "bob@email.com");

        Assert.That((await ChangePassword(client, alice)).StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That((await ChangePassword(client, alice)).StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That((await ChangePassword(client, alice)).StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests));

        // the same policy covers creating a recovery key
        var setRecovery = new HttpRequestMessage(HttpMethod.Post, "/api/identity/recovery")
        {
            Content = JsonContent.Create(new SetRecoveryRequest("password", new RecoveryMaterial("a", "b")))
        };
        setRecovery.Headers.Authorization = new AuthenticationHeaderValue("Bearer", alice);
        Assert.That((await client.SendAsync(setRecovery)).StatusCode, Is.EqualTo(HttpStatusCode.TooManyRequests));

        Assert.That((await ChangePassword(client, bob)).StatusCode, Is.EqualTo(HttpStatusCode.OK));
        Assert.That(RateLimitedTotals(factory)["account"], Is.EqualTo(2));
    }

    [Test]
    public async Task Disabled_ShouldNeverRefuse()
    {
        var (client, _) = Create(new() { ["RateLimiting:Enabled"] = "false" });

        for (var i = 0; i < 5; i++)
        {
            Assert.That((await Login(client)).StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        }
    }

    [Test]
    public async Task UnlimitedEndpoints_ShouldNotBeRefused()
    {
        var (client, factory) = Create();
        var token = Token(factory, 1, "alice@email.com");

        for (var i = 0; i < 5; i++)
        {
            var keys = new HttpRequestMessage(HttpMethod.Get, "/api/identity/keys");
            keys.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            Assert.That((await client.SendAsync(keys)).StatusCode, Is.EqualTo(HttpStatusCode.OK));
        }
    }

    [TestCase("203.0.113.1", "203.0.113.1")]
    [TestCase("203.0.113.1, 10.0.0.1", "203.0.113.1")]
    [TestCase("", "198.51.100.7")]
    public void ClientKey_ShouldPreferTheHeader(string headerValue, string expected)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("198.51.100.7");
        context.Request.Headers[Header] = headerValue;

        Assert.That(RateLimiting.ClientKey(context, Header), Is.EqualTo(expected));
    }

    [Test]
    public void ClientKey_WithoutHeaderOrConnectionIp_ShouldStillGiveAKey()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers[Header] = "203.0.113.1";

        Assert.That(RateLimiting.ClientKey(context, null), Is.EqualTo("unknown"));
    }

    // a limit of 2 per minute for every policy
    private (HttpClient Client, WebApplicationFactory<Program> Factory) Create(Dictionary<string, string?>? settings = null)
    {
        var all = new Dictionary<string, string?>
        {
            ["Authentication:Jwt:Secret"] = "rate-limiting-test-secret-at-least-32-bytes-long",
            ["Authentication:Jwt:Issuer"] = "test",
            ["Authentication:Jwt:Audience"] = "test",
            ["Database:ConnectionString"] = "unused, the identity service is a stub",
            ["RateLimiting:Credentials:PermitLimit"] = "2",
            ["RateLimiting:Credentials:WindowSeconds"] = "60",
            ["RateLimiting:Prelogin:PermitLimit"] = "2",
            ["RateLimiting:Prelogin:WindowSeconds"] = "60",
            ["RateLimiting:Account:PermitLimit"] = "2",
            ["RateLimiting:Account:WindowSeconds"] = "60"
        };
        foreach (var (key, value) in settings ?? [])
        {
            all[key] = value;
        }

        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            foreach (var (key, value) in all)
            {
                builder.UseSetting(key, value);
            }

            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IIdentityService>();
                services.AddScoped<IIdentityService, StubIdentityService>();
            });
        });
        _factories.Add(factory);

        return (factory.CreateClient(), factory);
    }

    private static Task<HttpResponseMessage> Login(HttpClient client, string? ip = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/identity/login") { Content = JsonContent.Create(LoginBody) };
        if (ip is not null)
        {
            request.Headers.Add(Header, ip);
        }

        return client.SendAsync(request);
    }

    private static Task<HttpResponseMessage> ChangePassword(HttpClient client, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/identity/password")
        {
            Content = JsonContent.Create(new ChangePasswordRequest("current", "new", "salt", 1, "wrapped"))
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client.SendAsync(request);
    }

    private static string Token(WebApplicationFactory<Program> factory, int userId, string email)
    {
        using var scope = factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<ITokenService>().CreateToken(userId, email);
    }

    private static IReadOnlyDictionary<string, long> RateLimitedTotals(WebApplicationFactory<Program> factory)
    {
        var metrics = factory.Services.GetRequiredService<MrMetisMetrics>();
        using var collector = new MetricCollector<long>(metrics.Meter, "mrmetis.rate_limited");
        collector.RecordObservableInstruments();
        return collector.GetMeasurementSnapshot().ToDictionary(m => (string)m.Tags["policy"]!, m => m.Value);
    }

    private sealed class StubIdentityService : IIdentityService
    {
        public Task<PreloginResponse> PreloginAsync(string email, CancellationToken ct = default) =>
            Task.FromResult(new PreloginResponse("salt", 1));

        public Task<AuthenticationResult> RegisterAsync(string email, string password, string? invitationCode, KeyMaterial keys,
            RecoveryMaterial? recovery = null, CancellationToken ct = default) =>
            Task.FromResult(AuthenticationResult.Failed("emailExists"));

        public Task<AuthenticationResult> LoginAsync(string email, string password, CancellationToken ct = default) =>
            Task.FromResult(AuthenticationResult.Failed("failedLogin"));

        public Task<KeyMaterial?> GetKeysAsync(int userId, CancellationToken ct = default) =>
            Task.FromResult<KeyMaterial?>(new KeyMaterial("salt", 1, "wrapped"));

        public Task<AuthenticationResult> ChangePasswordAsync(int userId, string currentPassword, string newPassword, KeyMaterial keys,
            CancellationToken ct = default) =>
            Task.FromResult(AuthenticationResult.Succeeded());

        public Task<RecoveryStatus> GetRecoveryStatusAsync(int userId, CancellationToken ct = default) =>
            Task.FromResult(new RecoveryStatus(null));

        public Task<AuthenticationResult> SetRecoveryAsync(int userId, string currentPassword, RecoveryMaterial recovery,
            CancellationToken ct = default) =>
            Task.FromResult(AuthenticationResult.Succeeded());

        public Task<string?> StartRecoveryAsync(string email, string recoveryKey, CancellationToken ct = default) =>
            Task.FromResult<string?>(null);

        public Task<AuthenticationResult> RecoverAsync(RecoverRequest request, CancellationToken ct = default) =>
            Task.FromResult(AuthenticationResult.Failed("recoveryFailed"));
    }
}
