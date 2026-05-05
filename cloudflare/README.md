# Cloudflare Edge Worker

Worker: `primerkakoles-edge`

Production routes:

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

The frontend auto-enables same-origin edge calls on `app.primerkakoles.ru`.

Local development falls back to direct Supabase unless `VITE_EDGE_URL` is set.
To test the production Worker from local dev, set:

```env
VITE_EDGE_URL=https://app.primerkakoles.ru
```
