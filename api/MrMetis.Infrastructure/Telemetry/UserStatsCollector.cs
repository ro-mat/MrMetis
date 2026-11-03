using System.Diagnostics.Metrics;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MrMetis.Infrastructure.Contexts;

namespace MrMetis.Infrastructure.Telemetry;

/// <summary>
/// Counts users and their stored data every few minutes and exposes the numbers as gauges,
/// so a metrics export never queries the database
/// </summary>
public sealed class UserStatsCollector : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<UserStatsCollector> _logger;

    // null until the first count, the gauges report nothing instead of zeros
    private volatile UserStats? _stats;

    public UserStatsCollector(
        IServiceScopeFactory scopeFactory,
        MrMetisMetrics metrics,
        TimeProvider timeProvider,
        ILogger<UserStatsCollector> logger)
    {
        _scopeFactory = scopeFactory;
        _timeProvider = timeProvider;
        _logger = logger;

        var meter = metrics.Meter;
        meter.CreateObservableGauge("mrmetis.users", () => Observe(s => s.Users), "{user}",
            "Active users");
        meter.CreateObservableGauge("mrmetis.users.with_data", () => Observe(s => s.UsersWithData), "{user}",
            "Active users who saved any data");
        meter.CreateObservableGauge("mrmetis.users.by_storage_limit", () => Observe(s => s.ByLimitMegabytes, "limit_mb"), "{user}",
            "Active users by their storage limit in megabytes");
        meter.CreateObservableGauge("mrmetis.users.by_storage_usage", () => Observe(s => s.ByUsage, "bucket"), "{user}",
            "Active users by how much of their storage limit they use");
        meter.CreateObservableGauge("mrmetis.storage.used", () => Observe(s => s.StorageUsedBytes), "By",
            "Encrypted data stored by all active users");
        meter.CreateObservableGauge("mrmetis.invitation_codes.unused", () => Observe(s => s.UnusedInvitationCodes), "{code}",
            "Invitation codes that can still be used");
    }

    public static async Task<UserStats> LoadAsync(MrMetisContext db, CancellationToken ct = default)
    {
        // the data is base64, so characters are bytes
        var users = await db.Users
            .Select(u => new UserStorage(u.StorageLimitBytes, u.UserData.Data == null ? 0 : u.UserData.Data.Length))
            .ToListAsync(ct);
        var unusedCodes = await db.InvitationCodes.CountAsync(ct);

        return UserStats.From(users, unusedCodes);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval, _timeProvider);
        do
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<MrMetisContext>();
                _stats = await LoadAsync(db, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // keep the last numbers, the next tick tries again
                _logger.LogWarning(ex, "Counting user stats failed");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private IEnumerable<Measurement<long>> Observe(Func<UserStats, long> value) =>
        _stats is { } stats ? [new Measurement<long>(value(stats))] : [];

    private IEnumerable<Measurement<long>> Observe(Func<UserStats, IReadOnlyDictionary<string, long>> values, string tag) =>
        _stats is { } stats
            ? values(stats).Select(x => new Measurement<long>(x.Value, new KeyValuePair<string, object?>(tag, x.Key)))
            : [];
}

public record UserStorage(long LimitBytes, long UsedBytes);

public record UserStats(
    long Users,
    long UsersWithData,
    long StorageUsedBytes,
    long UnusedInvitationCodes,
    IReadOnlyDictionary<string, long> ByLimitMegabytes,
    IReadOnlyDictionary<string, long> ByUsage)
{
    public const string Empty = "empty";

    /// <summary>
    /// Share of the user's own limit in use, upper bounds in percent
    /// </summary>
    public static readonly IReadOnlyList<(string Bucket, int UpToPercent)> UsageBuckets =
    [
        ("0-25%", 25),
        ("25-50%", 50),
        ("50-75%", 75),
        ("75-90%", 90),
        ("90-100%", int.MaxValue)
    ];

    public static UserStats From(IReadOnlyCollection<UserStorage> users, long unusedInvitationCodes)
    {
        var byLimit = users
            .GroupBy(u => (u.LimitBytes / (1024 * 1024)).ToString(CultureInfo.InvariantCulture))
            .ToDictionary(g => g.Key, g => (long)g.Count());

        // every bucket is reported, also when empty, so charts keep their categories
        var byUsage = new Dictionary<string, long> { [Empty] = 0 };
        foreach (var (bucket, _) in UsageBuckets)
        {
            byUsage[bucket] = 0;
        }

        foreach (var user in users)
        {
            byUsage[UsageBucket(user)]++;
        }

        return new UserStats(
            users.Count,
            users.Count(u => u.UsedBytes > 0),
            users.Sum(u => u.UsedBytes),
            unusedInvitationCodes,
            byLimit,
            byUsage);
    }

    private static string UsageBucket(UserStorage user)
    {
        if (user.UsedBytes == 0)
        {
            return Empty;
        }

        var percent = user.LimitBytes > 0 ? user.UsedBytes * 100.0 / user.LimitBytes : 100;
        return UsageBuckets.First(b => percent < b.UpToPercent).Bucket;
    }
}
