using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MrMetis.Core.Options;
using MrMetis.Infrastructure.Contexts;
using MrMetis.Infrastructure.Interceptors;

namespace MrMetis.Test;

/// <summary>
/// Gives every test a fresh in-memory SQLite database
/// </summary>
public abstract class DbTestBase
{
    private SqliteConnection _connection = null!;
    private DbContextOptions<MrMetisContext> _options = null!;

    protected MrMetisContext Db { get; private set; } = null!;

    [SetUp]
    public void SetUpDatabase()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<MrMetisContext>()
            .UseSqlite(_connection)
            .AddInterceptors(new AuditInterceptor(TimeProvider.System))
            .Options;

        Db = CreateContext();
        Db.Database.EnsureCreated();
    }

    [TearDown]
    public void TearDownDatabase()
    {
        Db.Dispose();
        _connection.Dispose();
    }

    /// <summary>
    /// A separate context on the same database, to check what was actually saved
    /// </summary>
    protected MrMetisContext CreateContext() =>
        new(_options, Options.Create(new DatabaseOptions { ConnectionString = "unused" }));
}
