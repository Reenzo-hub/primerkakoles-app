# Cloudflare Edge Worker (Archive)

This Worker was prepared as an experiment for proxying Supabase through Cloudflare.
It is not the current production solution for users in Russia: enabling Cloudflare proxy
for `app.primerkakoles.ru` made the site unavailable for part of the audience.

Current production proxy: `https://api.primerkakoles.ru` on VPS/Nginx.

Worker: `primerkakoles-edge`

Historical routes:

- `app.primerkakoles.ru/api/*`
- `app.primerkakoles.ru/media/*`

Required Worker secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Worker source:

- `cloudflare/primerkakoles-edge.js`

## Endpoints

- `GET /api/profile` - authenticated profile and generation balance.
- `GET /api/gallery` - public gallery list.
- `GET /api/my-generations` - authenticated user's generation list.
- `GET /media/storage/v1/object/...` - proxied Supabase Storage object.

## Frontend

The frontend currently uses `VITE_EDGE_URL=https://api.primerkakoles.ru` for the
Nginx proxy. Do not use the Cloudflare routes as production instructions unless
the infrastructure decision changes.

Local development falls back to direct Supabase unless `VITE_EDGE_URL` is set.
To test this archived Worker from local dev, set:

```env
VITE_EDGE_URL=https://app.primerkakoles.ru
```
