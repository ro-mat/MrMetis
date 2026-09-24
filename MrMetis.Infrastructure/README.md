## DB

### Introduction

The db is created by running api, which creates and migrates the db on startup. Locally the SQL Server itself runs in a container, see "Local development" in the [root README](../README.md).
All other (meant also for test/prod environments, not just local) tables/views/data is created by EF Core migrations when running the database update command.

### Changing schema/data

Schema and data changes are managed by changing entities in the project.
Once all changes in code are done, the dev should follow these instructions:

0. Once per clone, install the `dotnet ef` tool from the repo's tool manifest: `dotnet tool restore`
1. In a terminal, open MrMetis folder.
2. Set environment: `$Env:ASPNETCORE_ENVIRONMENT = "Development"` (PowerShell) or `export ASPNETCORE_ENVIRONMENT=Development` (bash/zsh)
3. Create migration (replace MIGRATION_NAME with a short description in pascal case, for example: ActivityTypeValuesChange):
   `dotnet ef migrations add MIGRATION_NAME --startup-project .\MrMetis.Api --project .\MrMetis.Infrastructure --context MrMetisContext`
4. If migration was successful, but you get errors and fix them in entities, remove the last migration: `dotnet ef migrations remove --startup-project .\MrMetis.Api --project .\MrMetis.Infrastructure --context MrMetisContext`,
   fix any errors and run the add migration command again.
5. Some errors you'll need to fix by changing the migration file itself (in .\MrMetis.Infrastructure\Migrations)

   On Linux/macOS use forward slashes in the commands, e.g. `--startup-project ./MrMetis.Api --project ./MrMetis.Infrastructure`.
6. To update local database you have two options:
   a. Run the api (Visual Studio or `dotnet run --project MrMetis.Api`), which will apply the new migration on startup
   b. Manually run `dotnet ef database update --startup-project .\MrMetis.Api --project .\MrMetis.Infrastructure --context MrMetisContext`

### Remove last migration and create new if source classes for db are changed

If migration hasn't been applied to db, skip to point 2. Otherwise, it has to be removed first from db. For that, db must be "updated" to previous successful migration `dotnet ef database update PREVIOUS_MIGRATION_NAME --startup-project .\MrMetis.Api --project .\MrMetis.Infrastructure --context MrMetisContext`

For example: `dotnet ef database update 20230410145134_SeedData --startup-project .\MrMetis.Api --project .\MrMetis.Infrastructure --context MrMetisContext`

Then the migration can be removed `dotnet ef migrations remove --startup-project .\MrMetis.Api --project .\MrMetis.Infrastructure --context MrMetisContext`
