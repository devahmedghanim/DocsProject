# API (.NET 7) inside same project

This API replaces WebDAV writes with authenticated endpoints.

## What it does

- Token-based admin login/logout/status under `/api/auth/*`.
- Secure docs write endpoints under `/api/docs/*`.
- Keeps reading docs/media from `/data/*` and `/uploads/*` as before.
- Serves Angular static files from `wwwroot`.

## Endpoints

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/status`
- `POST /api/docs/media/upload` (authorized)
- `POST /api/docs/sections/save` (authorized)
- `POST /api/docs/guides/save` (authorized)
- `DELETE /api/docs/guides/{route}/{id}` (authorized)

## Single publish flow

1. Build Angular in project root:
   - `npm run build`
2. Publish API:
   - `dotnet publish API/NexusPms.Api.csproj -c Release -o ./publish`

`NexusPms.Api.csproj` automatically copies Angular output from `dist/DocsNexusPMS` into publish `wwwroot`.

## Authorization

- Login returns a JWT token.
- Send token in header: `Authorization: Bearer <token>`.
- Docs write endpoints under `/api/docs/*` require a valid token.

## IIS note

- Host the publish output as an ASP.NET Core site (with Hosting Bundle installed).
- No WebDAV required.
- Update `API/appsettings.json` admin username/password before production.
