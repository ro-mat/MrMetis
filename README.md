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
dotnet run --project MrMetis.Api
```

On startup the API (in the `Development` environment) creates the `mrmetis-local` database, applies migrations and seeds the invitation code **`local-dev`**. Codes are single-use, so a fresh one is seeded whenever no unused code is left, for example after the next restart. The API listens on `https://localhost:5001`. If it can't reach SQL Server within about a minute, it stops with an error.

#### 3. Run the client

```sh
cd MrMetis.Client
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

- Migrations and schema changes: see [MrMetis.Infrastructure/README.md](MrMetis.Infrastructure/README.md).

### Contributing

Feel free to leave a bug report, improvement suggestion or request new functionality here in [issues](https://github.com/ro-mat/MrMetis/issues).
