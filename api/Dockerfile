FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# restore first, so the package layer is cached until a project file changes
COPY Directory.Build.props Directory.Packages.props ./
COPY MrMetis.Core/MrMetis.Core.csproj MrMetis.Core/
COPY MrMetis.Infrastructure/MrMetis.Infrastructure.csproj MrMetis.Infrastructure/
COPY MrMetis.Api/MrMetis.Api.csproj MrMetis.Api/
RUN dotnet restore MrMetis.Api/MrMetis.Api.csproj

COPY . .
# the release tag, e.g. v0.8.0, passed in by release.yml; shown by GET /api/version
ARG APP_VERSION=dev
RUN dotnet publish MrMetis.Api/MrMetis.Api.csproj -c Release -o /app --no-restore -p:InformationalVersion=$APP_VERSION

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "MrMetis.Api.dll"]
