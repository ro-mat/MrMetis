using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MrMetis.Core.Entities;
using MrMetis.Core.Options;
using MrMetis.Infrastructure.Contexts;

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

    /// <summary>
    /// Saves the entity and detaches it, so the code under test loads it fresh
    /// </summary>
    protected async Task SeedAsync(object entity)
    {
        Db.Add(entity);
        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();
    }

    protected async Task<User> AddUserAsync(string email, string password, string? salt = null)
    {
        var created = DateTime.UtcNow.AddDays(-1);
        var user = new User
        {
            Email = email,
            Password = password,
            Salt = salt,
            UserData = new UserData { IsActive = true, Created = created },
            IsActive = true,
            Created = created
        };
        await SeedAsync(user);
        return user;
    }
}
