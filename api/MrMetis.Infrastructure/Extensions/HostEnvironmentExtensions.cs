using Microsoft.Extensions.Hosting;

namespace MrMetis.Infrastructure.Extensions;

public static class HostEnvironmentExtensions
{
    public static bool IsQa(this IHostEnvironment environment) => environment.IsEnvironment("QA");
}
