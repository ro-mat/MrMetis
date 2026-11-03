using System.Diagnostics.Metrics;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.Metrics.Testing;
using Microsoft.Extensions.Options;
using MrMetis.Core.Entities;
using MrMetis.Core.Options;
using MrMetis.Infrastructure.Contexts;
using MrMetis.Infrastructure.Telemetry;

namespace MrMetis.Test;

/// <summary>
/// Gives every test a fresh in-memory SQLite database and its own metrics
/// </summary>
public abstract class DbTestBase
{
    private SqliteConnection _connection = null!;
    private DbContextOptions<MrMetisContext> _options = null!;
    private ServiceProvider _metricsProvider = null!;

    protected MrMetisContext Db { get; private set; } = null!;

    protected MrMetisMetrics Metrics { get; private set; } = null!;

    [SetUp]
    public void SetUpDatabase()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<MrMetisContext>()
            .UseSqlite(_connection)
            .Options;

        Db = CreateContext();
        Db.Database.EnsureCreated();

        _metricsProvider = new ServiceCollection().AddMetrics().BuildServiceProvider();
        Metrics = new MrMetisMetrics(_metricsProvider.GetRequiredService<IMeterFactory>());
    }

    [TearDown]
    public void TearDownDatabase()
    {
        Db.Dispose();
        _connection.Dispose();
        _metricsProvider.Dispose();
    }

    /// <summary>
    /// A separate context on the same database, to check what was actually saved
    /// </summary>
    protected MrMetisContext CreateContext() =>
        new(_options, Options.Create(new DatabaseOptions { ConnectionString = "unused" }));

    /// <summary>
    /// Current totals of one of the result counters of <see cref="MrMetisMetrics"/>, by result
    /// </summary>
    protected IReadOnlyDictionary<string, long> CounterTotals(string instrumentName)
    {
        using var collector = new MetricCollector<long>(Metrics.Meter, instrumentName);
        collector.RecordObservableInstruments();
        return collector.GetMeasurementSnapshot().ToDictionary(m => (string)m.Tags["result"]!, m => m.Value);
    }

    /// <summary>
    /// Saves the entity and detaches it, so the code under test loads it fresh
    /// </summary>
    protected async Task SeedAsync(object entity)
    {
        Db.Add(entity);
        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();
    }

    protected async Task<User> AddUserAsync(string email, string password, long storageLimitBytes = 1000)
    {
        var created = DateTime.UtcNow.AddDays(-1);
        var user = new User
        {
            Email = email,
            Password = password,
            KdfSalt = "salt",
            WrappedKey = "wrapped",
            StorageLimitBytes = storageLimitBytes,
            UserData = new UserData { IsActive = true, Created = created },
            IsActive = true,
            Created = created
        };
        await SeedAsync(user);
        return user;
    }
}
