
using Microsoft.AspNetCore.Builder;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using MrMetis.Infrastructure.Contexts;
using System.Data;
using NLog;
using System.Threading.Tasks;
using System;
using MrMetis.Core.Extensions;
using NLog.Web;

namespace MrMetis.Infrastructure.Helpers;

public static class CustomDataSeeder
{
    private static Logger _logger;
    /// <summary>
    /// Creates local database, schema and users
    /// </summary>
    /// <param name="app"></param>
    /// <returns></returns>
    public static async Task CreateDummyDatabaseAndSchema(this IApplicationBuilder app, string setupCs, string connectionString, string envName)
    {
        envName = "Test";
        _logger = NLogBuilder.ConfigureNLog($"nlog.{envName}.config").GetCurrentClassLogger();

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
        while (!await IsServerUp(masterSetupCs))
        {
            await Task.Delay(1000);
        }

        using var connection = new SqlConnection(setupCs);
        if (!await DbExists(connection))
        {
            _logger.Info("Creating db");
            await CreateDB(setupCs, envName);

            _logger.Info("Creating schema");
            await CreateSchema(setupCs, connectionString);
        }

        _logger.Info("Migrating");

        using var context = new MrMetisContext(contextOptions);
        Migrate(context);

        _logger.Info("Db setup completed!");
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
            _logger.Error(ex);
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

    private static async Task CreateDB(string connectionString, string envName)
    {
        switch (envName)
        {
            case "Development":
                await RunCommand(
                    connectionString,
                    @"
                    create database [mrmetis-local]
                    ON PRIMARY (
                        NAME=Test_data,
                        FILENAME = 'C:\localDB\mrmetis.mdf'
                    )
                    LOG ON (
                        NAME=Test_log,
                        FILENAME = 'C:\localDB\mrmetis_log.ldf'
                    )"
                );
                break;
            case "Test":
                await RunCommand(
                    connectionString,
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

    public static void Migrate(MrMetisContext context)
    {
        while (true)
        {
            try
            {
                context?.Database.Migrate();
                break;
            }
            catch (SqlException e)
            {
                _logger.Error(e);
            }

        }
    }
}
