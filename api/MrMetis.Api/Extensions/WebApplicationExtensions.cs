using Microsoft.Extensions.FileProviders;
using MrMetis.Infrastructure;

namespace MrMetis.Api.Extensions;

public static class WebApplicationExtensions
{
    // the built client is copied here by the pipeline
    private const string SpaRootPath = "front";

    public static async Task InitializeDatabaseAsync(this WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var initializer = scope.ServiceProvider.GetRequiredService<DatabaseInitializer>();
        await initializer.InitializeAsync(app.Lifetime.ApplicationStopping);
    }

    public static WebApplication UseApiPipeline(this WebApplication app)
    {
        app.UseExceptionHandler();

        if (!app.Environment.IsDevelopment())
        {
            app.UseHsts();
        }

        app.UseHttpsRedirection();

        if (GetSpaFileOptions(app) is { } spaFiles)
        {
            app.UseStaticFiles(spaFiles);
        }

        app.UseCors();
        app.UseAuthentication();
        app.UseAuthorization();

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        return app;
    }

    /// <summary>
    /// Serves the client's index.html for every non-API route that didn't match a file, outside Development
    /// </summary>
    public static WebApplication MapSpaFallback(this WebApplication app)
    {
        if (GetSpaFileOptions(app) is not { } spaFiles)
        {
            return app;
        }

        app.MapFallback("/api/{**path}", () => Results.NotFound());
        app.MapFallbackToFile("index.html", spaFiles);

        return app;
    }

    private static StaticFileOptions? GetSpaFileOptions(WebApplication app)
    {
        var root = Path.Combine(app.Environment.ContentRootPath, SpaRootPath);
        if (app.Environment.IsDevelopment() || !Directory.Exists(root))
        {
            return null;
        }

        return new StaticFileOptions { FileProvider = new PhysicalFileProvider(root) };
    }
}
