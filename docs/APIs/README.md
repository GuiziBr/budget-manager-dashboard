# API Documentation

One file per backend resource, mirroring the API this frontend consumes. Add the conventions below as they are confirmed.

## Conventions

- Base URL: `NEXT_PUBLIC_API_URL`.
- Bodies are JSON. Errors return a JSON `message` field, which `ApiError` exposes.
- Paginated lists take `offset` and `limit` and return the total in the `x-total-count` header.
