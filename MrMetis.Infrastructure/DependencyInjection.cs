using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using MrMetis.Core.Entities;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Options;
using MrMetis.Infrastructure.Contexts;
using MrMetis.Infrastructure.Extensions;
using MrMetis.Infrastructure.Services;

namespace MrMetis.Infrastructure;

public static class DependencyInjection
{
    public static IHostApplicationBuilder AddInfrastructure(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;

        services.AddOptions<DatabaseOptions>()
            .BindConfiguration(DatabaseOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddOptions<JwtOptions>()
            .BindConfiguration(JwtOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddSingleton(TimeProvider.System);

        var enableSensitiveDataLogging = builder.Environment.IsDevelopmentOrTest();
        services.AddDbContext<MrMetisContext>((sp, options) =>
        {
            var database = sp.GetRequiredService<IOptions<DatabaseOptions>>().Value;
            options
                .UseSqlServer(database.ConnectionString, sql => sql.CommandTimeout(database.CommandTimeout))
                .EnableSensitiveDataLogging(enableSensitiveDataLogging);
        });

        services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<IUserDataService, UserDataService>();
        services.AddScoped<DatabaseInitializer>();

        services.AddHealthChecks()
            .AddDbContextCheck<MrMetisContext>();

        return builder;
    }
}
