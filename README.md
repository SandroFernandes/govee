# govee

Dockerized Django backend environment with current stable runtime images.

## Stack

- Python `3.13` (`python:3.13-slim`)
- Django `5.x` (installed from `requirements.txt`)
- SQLite `3` (file-based database)
- Gunicorn `23.x`
- WhiteNoise `6.x` (static files in Docker)

## Quick start

1. Start services:

	```bash
	docker compose up --build
	```

	This startup runs migrations and `collectstatic` automatically.
	With `DJANGO_DEBUG=True`, backend code changes in `./backend` hot-reload automatically.

2. Open health endpoint:

	- http://localhost:8000/health/

3. (Optional) Create superuser:

	```bash
	docker compose exec backend python manage.py createsuperuser
	```

4. Open admin:

	- http://localhost:8000/admin/

## Environment config

- `.env` is included for local development defaults.
- `.env.example` is a template you can copy/adjust for other environments.
- SQLite is persisted in Docker volume `sqlite_data` at `/data/db.sqlite3`.

Important variables:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `SQLITE_PATH`

## Useful commands

Stop and remove containers:

```bash
docker compose down
```

Stop and remove containers + database volume:

```bash
docker compose down -v
```