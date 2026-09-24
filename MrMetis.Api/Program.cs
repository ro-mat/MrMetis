using MrMetis.Api.Endpoints;
using MrMetis.Api.Extensions;
using MrMetis.Infrastructure;
using MrMetis.Infrastructure.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.AddInfrastructure();
builder.AddApiServices();

var app = builder.Build();

if (app.Environment.IsDevelopmentOrTest())
{
    await app.InitializeDatabaseAsync();
}

app.UseApiPipeline();

app.MapIdentityEndpoints();
app.MapUserDataEndpoints();
app.MapHealthChecks("/health");
app.MapSpaFallback();

app.Run();
