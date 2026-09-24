
using Microsoft.AspNetCore.Builder;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using MrMetis.Infrastructure.Contexts;
using System.Data;
using NLog;
using System.Threading.Tasks;
using System;
using MrMetis.Core.Entities;
using MrMetis.Core.Extensions;

namespace MrMetis.Infrastructure.Helpers;

public static class CustomDataSeeder
{
    private const int ServerUpAttempts = 30;
    private const int MigrateAttempts = 10;
    private const string LocalInvitationCode = "local-dev";

    private static Logger _logger;
    /// <summary>
    /// Creates local database, schema and users
    /// </summary>
    /// <param name="app"></param>
    /// <returns></returns>
    public static async Task CreateDummyDatabaseAndSchema(this IApplicationBuilder app, string setupCs, string connectionString, string envName)
    {
        _logger = LogManager.Setup().LoadConfigurationFromFile($"nlog.{envName}.config").GetCurrentClassLogger();

        if (string.IsNullOrEmpty(setupCs))
        {
            _logger.Error("Setup connection string cannot be null or empty!");
            return;
        }

        if (string.IsNullOrEmpty(connectionString))
        {
            _logger.Error("Connection string cannot be null or empty!");
            return;
        }

        if (string.IsNullOrEmpty(envName))
        {
            _logger.Error("Environment name cannot be null or empty!");
            return;
        }

        var contextOptions = new DbContextOptionsBuilder<MrMetisContext>()
            .UseSqlServer(connectionString)
            .Options;

        var masterSetupCs = setupCs.SetNewDatabase();
        await WaitForServer(masterSetupCs);

        using var connection = new SqlConnection(setupCs);
        if (!await DbExists(connection))
        {
            _logger.Info("Creating db");
            await CreateDB(masterSetupCs, setupCs.GetFieldValue("Initial Catalog"), envName);

            _logger.Info("Creating schema");
            await CreateSchema(setupCs, connectionString);
        }

        _logger.Info("Migrating");

        using var context = new MrMetisContext(contextOptions);
        await Migrate(context);

        if (envName == "Development")
        {
            await SeedInvitationCode(context);
        }

        _logger.Info("Db setup completed!");
    }

    private static async Task WaitForServer(string connectionString)
    {
        for (var attempt = 1; attempt <= ServerUpAttempts; attempt++)
        {
            if (await IsServerUp(connectionString))
            {
                return;
            }

            await Task.Delay(1000);
        }

        throw new InvalidOperationException(
            $"SQL Server at '{connectionString.GetFieldValue("Server")}' is not reachable. " +
            "For local development start it with `podman compose up -d db` (or `docker compose up -d db`).");
    }

    private static async Task SeedInvitationCode(MrMetisContext context)
    {
        if (await context.InvitationCodes.AnyAsync())
        {
            return;
        }

        _logger.Info($"Seeding invitation code '{LocalInvitationCode}'");
        // set the audit fields MrMetisRepository would, IsActive is used by the global query filter
        var now = DateTime.UtcNow;
        context.InvitationCodes.Add(new InvitationCode
        {
            Code = LocalInvitationCode,
            IsActive = true,
            Created = now,
            Modified = now,
        });
        await context.SaveChangesAsync();
    }

    private static async Task<bool> IsServerUp(string connectionString)
    {
        using var connection = new SqlConnection(connectionString);
        try
        {
            await connection.OpenAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.Warn($"Waiting for SQL Server: {ex.Message}");
            return false;
        }
        finally
        {
            if (connection.State == ConnectionState.Open)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> DbExists(SqlConnection connection)
    {
        try
        {
            await connection.OpenAsync();
        }
        catch
        {
            // the pool caches the failed open, which would break the setup commands that follow
            SqlConnection.ClearPool(connection);
            return false;
        }
        finally
        {
            if (connection.State == ConnectionState.Open)
            {
                await connection.CloseAsync();
            }
        }

        return true;
    }

    private static async Task CreateDB(string masterConnectionString, string databaseName, string envName)
    {
        switch (envName)
        {
            case "Development":
                await RunCommand(
                    masterConnectionString,
                    $"create database [{databaseName}]"
                );
                break;
            case "Test":
                await RunCommand(
                    masterConnectionString,
                    "create database [mrmetis-test]"
                );
                break;
        }
    }

    private static async Task RunCommand(string connectionString, string commandString)
    {
        using var connection = new SqlConnection(connectionString);

        var str = commandString;
        var command = connection.CreateCommand();
        command.CommandText = str;
        try
        {
            await connection.OpenAsync();
            await command.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.Error(ex);
        }
        finally
        {
            if (connection.State == ConnectionState.Open)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task CreateSchema(string setupCs, string connectionString)
    {
        var userName = connectionString.GetFieldValue("User ID");
        var password = connectionString.GetFieldValue("Password");

        // try to create logins and roles. These might exist even if db was deleted, so they're in their own little try-catch block.
        await RunCommand(setupCs,
            $@"
            CREATE LOGIN [{userName}] WITH PASSWORD=N'{password}'");

        await RunCommand(setupCs,
            $@"
            CREATE USER [{userName}] FOR LOGIN [{userName}] WITH DEFAULT_SCHEMA=[dbo]

            CREATE ROLE [MRMETIS_DEV_ROLE] AUTHORIZATION [dbo]");

        await RunCommand(setupCs,
            $@"
            -- Ensure role membership is correct
            EXEC sp_addrolemember N'MRMETIS_DEV_ROLE ', N'{userName}'

            -- Allow users to create tables, views, procedures in Developer_Schema
            GRANT CREATE TABLE TO [MRMETIS_DEV_ROLE]

            GRANT CREATE VIEW TO [MRMETIS_DEV_ROLE]

            GRANT CREATE PROCEDURE TO [MRMETIS_DEV_ROLE]

            GRANT CREATE FUNCTION TO [MRMETIS_DEV_ROLE]
        ");
        await RunCommand(setupCs,
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
        ");
    }

    public static async Task Migrate(MrMetisContext context)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await context.Database.MigrateAsync();
                return;
            }
            catch (SqlException e) when (attempt < MigrateAttempts)
            {
                _logger.Error(e);
                await Task.Delay(2000);
            }
        }
    }
}
