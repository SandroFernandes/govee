from __future__ import annotations

from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from app.models import H5075HistorySyncState


class Command(BaseCommand):
    help = "Run read_h5075_history only when the sync interval has elapsed."

    JOB_NAME = "read_h5075_history"

    def add_arguments(self, parser) -> None:
        parser.add_argument("--days", type=int, default=4, help="Minimum days between successful runs.")
        parser.add_argument("--force", action="store_true", help="Run regardless of interval.")
        parser.add_argument("--start", type=str, default="480:00", help="Oldest point in the past as hhh:mm.")
        parser.add_argument("--end", type=str, default="0:00", help="Newest point in the past as hhh:mm.")
        parser.add_argument("--timeout", type=float, default=25.0, help="BLE command timeout in seconds.")
        parser.add_argument("--retries", type=int, default=3, help="Connection retries per device.")
        parser.add_argument("--mac", type=str, default="", help="Optional MAC filter.")
        parser.add_argument(
            "--name-contains",
            type=str,
            default="H5075",
            help="Name filter used when --mac is omitted.",
        )

    def handle(self, *args, **options) -> None:
        days = max(1, int(options["days"]))
        now = timezone.now()

        state, _ = H5075HistorySyncState.objects.get_or_create(job_name=self.JOB_NAME)
        due_at = state.last_success_at + timedelta(days=days) if state.last_success_at else None

        if not options["force"] and due_at is not None and now < due_at:
            remaining = due_at - now
            remaining_hours = max(0, int(remaining.total_seconds() // 3600))
            last_success = state.last_success_at or now
            self.stdout.write(
                f"Skip: last successful sync at {last_success.isoformat()} "
                f"(next due in ~{remaining_hours}h)"
            )
            return

        state.last_attempt_at = now
        state.last_status = "running"
        state.last_error = ""
        state.save(update_fields=["last_attempt_at", "last_status", "last_error", "updated_at"])

        command_args: list[str] = [
            "--start",
            options["start"],
            "--end",
            options["end"],
            "--timeout",
            str(options["timeout"]),
            "--retries",
            str(options["retries"]),
        ]

        mac = (options["mac"] or "").strip()
        if mac:
            command_args.extend(["--mac", mac])
        else:
            command_args.extend(["--name-contains", (options["name_contains"] or "H5075")])

        try:
            call_command("read_h5075_history", *command_args)
        except CommandError as exc:
            state.last_status = "error"
            state.last_error = str(exc)
            state.save(update_fields=["last_status", "last_error", "updated_at"])
            raise

        state.last_success_at = timezone.now()
        state.last_status = "success"
        state.last_error = ""
        state.save(update_fields=["last_success_at", "last_status", "last_error", "updated_at"])
        completed_at = state.last_success_at or timezone.now()

        self.stdout.write(f"History sync completed at {completed_at.isoformat()} (interval target: every {days} day(s))")
