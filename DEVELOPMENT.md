# Development

## Local development

The client works on its own in demo mode. Registration, login and persistent data need the API and a SQL Server database.

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 24](https://nodejs.org/)
- Docker or Podman, used to run SQL Server. With Podman, either install `podman-compose`, or enable the Docker-compatible socket for the `docker-compose` provider: `systemctl --user enable --now podman.socket`

### 1. Start the database

From the repository root:

```sh
docker compose up -d   # or: podman compose up -d
```

This starts SQL Server 2022 on `localhost:1433`, with its data kept in the `mrmetis-sql` volume.

### 2. Run the API

```sh
dotnet dev-certs https                 # once; the certificate doesn't need to be trusted
dotnet run --project api/MrMetis.Api
```

On startup the API (in the `Development` environment) creates the `mrmetis-local` database, applies migrations and seeds the invitation code **`local-dev`**. Codes are single-use, so a fresh one is seeded whenever no unused code is left, for example after the next restart. The API listens on `https://localhost:5001`. If it can't reach SQL Server within about a minute, it stops with an error.

### 3. Run the client

```sh
cd web
npm install
npm start
```

Open http://localhost:3000 and register with invitation code `local-dev`. The Vite dev server forwards `/api` to the API, so you don't need to trust a certificate or configure CORS.

### Reset or stop

```sh
docker compose down      # stop; data is kept
docker compose down -v   # stop and delete the database
```

### Troubleshooting

- **SQL Server exits with `Error 87 (The parameter is incorrect)` opening `master.mdf`**: the volume sits on a filesystem that doesn't support `O_DIRECT`, such as an ecryptfs-encrypted home directory with rootless Podman. Put the data on another filesystem by creating a `.env` file in the repository root (it is git-ignored):

  ```sh
  mkdir -p /var/tmp/mrmetis-sql && chmod 777 /var/tmp/mrmetis-sql
  echo "MSSQL_DATA=/var/tmp/mrmetis-sql" > .env
  ```

  Any directory outside the encrypted home works. Many distributions delete files in `/var/tmp` that haven't been used for about 30 days.

- Migrations and schema changes: see [api/MrMetis.Infrastructure/README.md](api/MrMetis.Infrastructure/README.md).

## QA and production

Every push to `main` runs [deploy-qa.yml](.github/workflows/deploy-qa.yml): it runs the API tests, builds the `mrmetis-web` and `mrmetis-api` images to GHCR, then calls the home server's deploy receiver (`ro-mat/homeserver-infra`, `deployer/`) with the job's GitHub OIDC token, which starts that build in `/srv/apps/mrmetis-qa`. The site is https://mrmetis-qa.romkats.eu. Each published pre-release is also deployed there, and production (https://mrmetis.eu, `/srv/apps/mrmetis-prod`) runs the latest full release, see [Releasing](#releasing). The footer and `/api/version` show which release a site runs, or `dev` for a build from main.

One-time setup:

- GitHub: set the `DEPLOY_URL` variable (`https://deploy.romkats.eu`). Limit the `qa` environment to branch `main` and tags `v*`, and the `production` environment to tags `v*`. Give each environment an `APP_URL` variable with its site's URL (`https://mrmetis-qa.romkats.eu`, `https://mrmetis.eu`); the deploy jobs link to it and smoke-test it. Add a tag ruleset so that only you can create `v*` tags, because the deploy receiver trusts them. Create the labels `enhancement` and `bug`, which sort the release notes ([.github/release.yml](.github/release.yml)).
- Home server: the receiver's `apps.json` allows `mrmetis-qa` from `refs/heads/main` and `refs/tags/v*` (environment `qa`), and `mrmetis-prod` from `refs/tags/v*` (environment `production`). Cloudflare routes `mrmetis.eu` through the tunnel to Traefik, like the QA hostname.

`compose.yml` and `.env` live on the server in `/srv/apps/mrmetis-qa` and `/srv/apps/mrmetis-prod`; each `.env` holds `TAG` (the receiver updates it on each deploy) and its own secrets:

- `MSSQL_SA_PASSWORD`, `DB_APP_PASSWORD`: SQL Server passwords. They need upper case, lower case and digits, and must not contain `;` or `'`, for example `openssl rand -base64 32 | tr -d '/+='`
- `JWT_SECRET`: at least 32 characters, for example `openssl rand -hex 32`

On the first start the API creates the database (`mrmetis-qa`, or `mrmetis` in production) and its login, and migrations run on every start. To change `DB_APP_PASSWORD` later, change the login's password in SQL Server too. Invitation codes are not seeded outside Development; add one on the server (for production, use `/srv/apps/mrmetis-prod` and `-d mrmetis`):

```sh
cd /srv/apps/mrmetis-qa
docker compose exec db sh -c '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d mrmetis-qa \
  -Q "INSERT INTO dbo.InvitationCodes (Code, IsActive, Created, Modified) VALUES (N'\''my-code'\'', 1, SYSUTCDATETIME(), SYSUTCDATETIME())"'
```

## Releasing

Releases are GitHub releases tagged `vX.Y.Z`:

1. **Prepare.** Run Actions → [prepare-release](.github/workflows/prepare-release.yml) on `main`. It creates a draft pre-release with the next minor version (for example `v0.9.0` after `v0.8.x`) and notes generated from the merged PRs. To use another version, type it into the run's `version` field, or change the tag in the draft before publishing. Edit the notes as you like.
2. **Publish as pre-release.** [release.yml](.github/workflows/release.yml) builds that commit with the version, deploys it to QA, and creates the branch `release/vX.Y` from it.
3. **Promote.** After testing on QA, edit the release, untick *Set as a pre-release* and save. release.yml deploys the images QA tested to production. A release published directly as a full release, without being a pre-release first, isn't deployed.

**Fixing a release:** merge the fix into `release/vX.Y`, then run prepare-release on that branch. It suggests the next patch (`vX.Y.1`), and the rest is the same as above. Bring the fix to `main` too, with a PR or a cherry-pick.

**Rollback:** open the release.yml run of an earlier release's promotion and re-run its `deploy-prod` job, or set `TAG` in `/srv/apps/mrmetis-prod/.env` to that release's commit and run `docker compose up -d`. Migrations aren't undone, so keep them compatible with the previous release.
