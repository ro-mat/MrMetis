### Description

Personal finance tool to help plan your budget in a secure way.

### Closed beta

Currently the project status is in closed beta (registration via invitation code only), but you can pull it and run it locally.

### Local development

The client works on its own in demo mode. Registration, login and persistent data need the API and a SQL Server database.

#### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 24](https://nodejs.org/)
- Docker or Podman, used to run SQL Server. With Podman, either install `podman-compose`, or enable the Docker-compatible socket for the `docker-compose` provider: `systemctl --user enable --now podman.socket`

#### 1. Start the database

From the repository root:

```sh
docker compose up -d   # or: podman compose up -d
```

This starts SQL Server 2022 on `localhost:1433`, with its data kept in the `mrmetis-sql` volume.

#### 2. Run the API

```sh
dotnet dev-certs https                 # once; the certificate doesn't need to be trusted
dotnet run --project api/MrMetis.Api
```

On startup the API (in the `Development` environment) creates the `mrmetis-local` database, applies migrations and seeds the invitation code **`local-dev`**. Codes are single-use, so a fresh one is seeded whenever no unused code is left, for example after the next restart. The API listens on `https://localhost:5001`. If it can't reach SQL Server within about a minute, it stops with an error.

#### 3. Run the client

```sh
cd web
npm install
npm start
```

Open http://localhost:3000 and register with invitation code `local-dev`. The Vite dev server forwards `/api` to the API, so you don't need to trust a certificate or configure CORS.

#### Reset or stop

```sh
docker compose down      # stop; data is kept
docker compose down -v   # stop and delete the database
```

#### Troubleshooting

- **SQL Server exits with `Error 87 (The parameter is incorrect)` opening `master.mdf`**: the volume sits on a filesystem that doesn't support `O_DIRECT`, such as an ecryptfs-encrypted home directory with rootless Podman. Put the data on another filesystem by creating a `.env` file in the repository root (it is git-ignored):

  ```sh
  mkdir -p /var/tmp/mrmetis-sql && chmod 777 /var/tmp/mrmetis-sql
  echo "MSSQL_DATA=/var/tmp/mrmetis-sql" > .env
  ```

  Any directory outside the encrypted home works. Many distributions delete files in `/var/tmp` that haven't been used for about 30 days.

- Migrations and schema changes: see [api/MrMetis.Infrastructure/README.md](api/MrMetis.Infrastructure/README.md).

### QA environment

Every push to `main` runs [deploy-qa.yml](.github/workflows/deploy-qa.yml): it runs the API tests, builds the `mrmetis-web` and `mrmetis-api` images to GHCR, and the self-hosted runner on the home server starts [deploy/compose.yml](deploy/compose.yml) in `/srv/apps/mrmetis-qa`. The site is https://mrmetis-qa.romkats.eu.

One-time setup in GitHub, Settings → Environments → `qa`, add these secrets:

- `MSSQL_SA_PASSWORD`, `DB_APP_PASSWORD`: SQL Server passwords. They need upper case, lower case and digits, and must not contain `;` or `'`, for example `openssl rand -base64 32 | tr -d '/+='`
- `JWT_SECRET`: at least 32 characters, for example `openssl rand -hex 32`

On the first start the API creates the `mrmetis-qa` database and its login, and migrations run on every start. To change `DB_APP_PASSWORD` later, change the login's password in SQL Server too. Invitation codes are not seeded in QA; add one on the server:

```sh
cd /srv/apps/mrmetis-qa
docker compose exec db sh -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d mrmetis-qa \
  -Q "INSERT INTO dbo.InvitationCodes (Code, IsActive, Created, Modified) VALUES (N'\''my-code'\'', 1, SYSUTCDATETIME(), SYSUTCDATETIME())"'
```

### Contributing

Feel free to leave a bug report, improvement suggestion or request new functionality here in [issues](https://github.com/ro-mat/MrMetis/issues).
