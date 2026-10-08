using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MrMetis.Core.Entities;
using MrMetis.Core.Options;
using MrMetis.Infrastructure.Contexts;
using MrMetis.Infrastructure.Extensions;

namespace MrMetis.Infrastructure;

/// <summary>
/// Creates the database, its login and role if missing, applies migrations and seeds local data.
/// Only meant for Development and Test environments.
/// </summary>
public class DatabaseInitializer(
    MrMetisContext context,
    IOptions<DatabaseOptions> databaseOptions,
    IHostEnvironment environment,
    TimeProvider timeProvider,
    ILogger<DatabaseInitializer> logger)
{
    private const int ServerUpAttempts = 30;
    private const int MigrateAttempts = 10;
    private const string LocalInvitationCode = "local-dev";

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        var connectionString = databaseOptions.Value.ConnectionString;
        var setupConnectionString = databaseOptions.Value.SetupConnectionString;
        if (string.IsNullOrEmpty(setupConnectionString))
        {
            logger.LogError("Setup connection string cannot be null or empty!");
            return;
        }

        var setup = new SqlConnectionStringBuilder(setupConnectionString);
        var master = new SqlConnectionStringBuilder(setupConnectionString) { InitialCatalog = "master" };
        await WaitForServer(master, ct);

        if (!await DbExists(setup.ConnectionString, ct))
        {
            logger.LogInformation("Creating db");
            await CreateDb(master.ConnectionString, setup.InitialCatalog, ct);

            logger.LogInformation("Creating schema");
            await CreateSchema(setup.ConnectionString, new SqlConnectionStringBuilder(connectionString), ct);
        }

        logger.LogInformation("Migrating");
        await Migrate(ct);

        if (environment.IsDevelopment())
        {
            await SeedInvitationCode(ct);
        }

        logger.LogInformation("Db setup completed!");
    }

    private async Task WaitForServer(SqlConnectionStringBuilder master, CancellationToken ct)
    {
        for (var attempt = 1; attempt <= ServerUpAttempts; attempt++)
        {
            if (await IsServerUp(master.ConnectionString, ct))
            {
                return;
            }

            await Task.Delay(1000, ct);
        }

        throw new InvalidOperationException(
            $"SQL Server at '{master.DataSource}' is not reachable. " +
            "For local development start it with `podman compose up -d db` (or `docker compose up -d db`).");
    }

    private async Task SeedInvitationCode(CancellationToken ct)
    {
        if (await context.InvitationCodes.AnyAsync(ct))
        {
            return;
        }

        logger.LogInformation("Seeding invitation code '{InvitationCode}'", LocalInvitationCode);
        var now = timeProvider.GetUtcNow().UtcDateTime;
        context.InvitationCodes.Add(new InvitationCode
        {
            Code = LocalInvitationCode,
            IsActive = true,
            Created = now,
            Modified = now
        });
        await context.SaveChangesAsync(ct);
    }

    private async Task<bool> IsServerUp(string connectionString, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        try
        {
            await connection.OpenAsync(ct);
            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning("Waiting for SQL Server: {Message}", ex.Message);
            return false;
        }
    }

    private static async Task<bool> DbExists(string connectionString, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        try
        {
            await connection.OpenAsync(ct);
            return true;
        }
        catch
        {
            // the pool caches the failed open, which would break the setup commands that follow
            SqlConnection.ClearPool(connection);
            return false;
        }
    }

    private async Task CreateDb(string masterConnectionString, string databaseName, CancellationToken ct)
    {
        var name = environment.IsTest() ? "mrmetis-test" : databaseName;
        await RunCommand(masterConnectionString, $"create database [{name}]", ct);
    }

    private async Task RunCommand(string connectionString, string commandText, CancellationToken ct)
    {
        await using var connection = new SqlConnection(connectionString);
        await using var command = connection.CreateCommand();
        command.CommandText = commandText;
        try
        {
            await connection.OpenAsync(ct);
            await command.ExecuteNonQueryAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Setup command failed");
        }
    }

    private async Task CreateSchema(string setupConnectionString, SqlConnectionStringBuilder app, CancellationToken ct)
    {
        var userName = app.UserID;
        var password = app.Password;

        // try to create logins and roles. These might exist even if db was deleted, so they're in their own little try-catch block.
        await RunCommand(setupConnectionString,
            $@"
            CREATE LOGIN [{userName}] WITH PASSWORD=N'{password}'", ct);

        await RunCommand(setupConnectionString,
            $@"
            CREATE USER [{userName}] FOR LOGIN [{userName}] WITH DEFAULT_SCHEMA=[dbo]

            CREATE ROLE [MRMETIS_DEV_ROLE] AUTHORIZATION [dbo]", ct);

        await RunCommand(setupConnectionString,
            $@"
            -- Ensure role membership is correct
            EXEC sp_addrolemember N'MRMETIS_DEV_ROLE ', N'{userName}'

            -- Allow users to create tables, views, procedures in Developer_Schema
            GRANT CREATE TABLE TO [MRMETIS_DEV_ROLE]

            GRANT CREATE VIEW TO [MRMETIS_DEV_ROLE]

            GRANT CREATE PROCEDURE TO [MRMETIS_DEV_ROLE]

            GRANT CREATE FUNCTION TO [MRMETIS_DEV_ROLE]
        ", ct);
        await RunCommand(setupConnectionString,
            $@"
            -- Apply permissions to schemas
            GRANT CREATE SCHEMA TO [MRMETIS_DEV_ROLE]

            GRANT ALTER ON SCHEMA::[dbo] TO [MRMETIS_DEV_ROLE]

            GRANT CONTROL ON SCHEMA::[dbo] TO [MRMETIS_DEV_ROLE]

            GRANT EXECUTE ON SCHEMA::[dbo] TO [MRMETIS_DEV_ROLE]

            GRANT DELETE ON SCHEMA::[dbo] TO [MRMETIS_DEV_ROLE]

            GRANT INSERT ON SCHEMA::[dbo] TO [MRMETIS_DEV_ROLE]

            GRANT SELECT ON SCHEMA::[dbo] TO [MRMETIS_DEV_ROLE]

            GRANT UPDATE ON SCHEMA::[dbo] TO [MRMETIS_DEV_ROLE]

            GRANT REFERENCES ON SCHEMA::[dbo] TO [MRMETIS_DEV_ROLE]
            
            -- Allow user to connect to database
            GRANT CONNECT TO [{userName}]
        ", ct);
    }

    private async Task Migrate(CancellationToken ct)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await context.Database.MigrateAsync(ct);
                return;
            }
            catch (SqlException ex) when (attempt < MigrateAttempts)
            {
                logger.LogError(ex, "Migration attempt {Attempt} failed", attempt);
                await Task.Delay(2000, ct);
            }
        }
    }
}
