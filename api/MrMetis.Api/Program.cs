using MrMetis.Api.Endpoints;
using MrMetis.Api.Extensions;
using MrMetis.Infrastructure;
using MrMetis.Infrastructure.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.AddInfrastructure();
builder.AddApiServices();

var app = builder.Build();

if (app.Environment.IsDevelopment() || app.Environment.IsQa() || app.Environment.IsProduction())
{
    await app.InitializeDatabaseAsync();
}

app.UseApiPipeline();

app.MapIdentityEndpoints();
app.MapUserDataEndpoints();
app.MapVersionEndpoints();
app.MapHealthChecks("/health");
app.MapSpaFallback();

app.Run();
