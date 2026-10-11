using Microsoft.Extensions.Hosting;

namespace MrMetis.Infrastructure.Extensions;

public static class HostEnvironmentExtensions
{
    public static bool IsTest(this IHostEnvironment environment) => environment.IsEnvironment("Test");

    public static bool IsQa(this IHostEnvironment environment) => environment.IsEnvironment("QA");

    public static bool IsDevelopmentOrTest(this IHostEnvironment environment) =>
        environment.IsDevelopment() || environment.IsTest();
}
