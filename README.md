# govee

Dockerized Django backend environment with current stable runtime images.

## Stack

- Python `3.13` (`python:3.13-slim`)
- Django `5.x` (installed from `requirements.txt`)
- SQLite `3` (file-based database)
- Gunicorn `23.x`
- WhiteNoise `6.x` (static files in Docker)
- React `18.x` + Vite `5.x`
- Bun `1.x` (frontend runtime/package manager)

## Quick start

1. Start services:

	```bash
	docker compose up --build
	```

	This startup runs migrations and `collectstatic` automatically.
	With `DJANGO_DEBUG=True`, backend code changes in `./backend` hot-reload automatically.

2. Open health endpoint:

	- http://localhost:8000/health/

3. Open frontend:

	- http://localhost:5173/

	For production stack (Gunicorn backend + Nginx frontend), run:

	```bash
	cp .env.prod.example .env.prod
	```

	Then update `DJANGO_SECRET_KEY` and `DJANGO_ALLOWED_HOSTS` in `.env.prod`, and run:

	```bash
	docker compose -f docker-compose.prod.yml up --build
	```

	Then open:

	- http://localhost:8080/

4. (Optional) Create superuser:

	```bash
	docker compose exec backend python manage.py createsuperuser
	```

5. Open admin:

	- http://localhost:8000/admin/

The frontend runs in a separate `frontend` service and hot-reloads from `./frontend`.

## Environment config

- `.env` is included for local development defaults.
- `.env.example` is a template you can copy/adjust for other environments.
- `.env.prod.example` is a production template (`.env.prod` is used by `docker-compose.prod.yml`).
- SQLite is persisted in Docker volume `sqlite_data` at `/data/db.sqlite3`.

Important variables:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `SQLITE_PATH`

For Docker dev with Vite proxy, ensure `DJANGO_ALLOWED_HOSTS` includes `backend` (and/or `govee-backend`).

## Useful commands

Run all tests (backend + frontend):

```bash
make test
```

Run Docker integration smoke test (frontend proxy -> backend):

```bash
make smoke
```

Run backend tests:

```bash
make test-backend
```

Run frontend tests:

```bash
make test-frontend
```

Read Govee H5075 data over Bluetooth (host machine):

```bash
python backend/manage.py read_h5075 --timeout 12
```

Target one sensor by MAC and print JSON:

```bash
python backend/manage.py read_h5075 --mac AA:BB:CC:DD:EE:FF --json
```

Read Govee H5075 data from Docker backend container:

```bash
docker compose exec backend python manage.py read_h5075 --timeout 12
```

Docker BLE passthrough is enabled by mounting `/var/run/dbus` and `/dev/bus/usb` into the backend service. On Linux host, ensure Bluetooth is enabled and `bluetoothd` is running.

Stop and remove containers:

```bash
docker compose down
```

Stop and remove containers + database volume:

```bash
docker compose down -v
```