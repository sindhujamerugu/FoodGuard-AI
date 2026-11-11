"""
Management command: check_escalation_deadlines
===============================================

Finds every active OfficerComplaintAssignment whose effective deadline has
passed and escalates it to the next enabled level.

Usage
-----
    # Normal run (commits escalations)
    python manage.py check_escalation_deadlines

    # Dry run — preview without committing
    python manage.py check_escalation_deadlines --dry-run

    # Use short deadlines for development testing (override in EscalationLevel admin)
    # This command reads live deadline_at values, so setting a 1-day deadline in
    # admin is enough to trigger escalation the next day.

Scheduler integration
---------------------
No Celery or Redis is configured in this project. Run this command via:
  - Windows Task Scheduler  (schtasks /create ...)
  - A cron job on Linux/Mac (0 2 * * * python manage.py check_escalation_deadlines)
  - A Render.com scheduled job (add to render.yaml services as a cron type)
  - Manual execution during development

PROTOTYPE DISCLAIMER: Not an officially integrated government system.
"""

import logging

from django.core.management.base import BaseCommand

from food_safety_officers.services import process_overdue

logger = logging.getLogger("foodguard")


class Command(BaseCommand):
    help = (
        "Check all active OfficerComplaintAssignments for deadline expiry "
        "and escalate overdue ones to the next configured level. "
        "PROTOTYPE: not an officially integrated government system."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="Preview escalations without committing any changes.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        prefix  = "[DRY RUN] " if dry_run else ""

        self.stdout.write(
            self.style.WARNING(
                f"{prefix}Running escalation deadline check "
                "(PROTOTYPE — not an officially integrated government system)..."
            )
        )

        summary = process_overdue(dry_run=dry_run)

        self.stdout.write(f"{prefix}Checked  : {summary['checked']}")
        self.stdout.write(f"{prefix}Escalated: {summary['escalated']}")
        self.stdout.write(f"{prefix}Final lvl: {summary['final_level']}")
        self.stdout.write(f"{prefix}Skipped  : {summary['skipped']}")

        if summary["errors"]:
            self.stdout.write(
                self.style.ERROR(f"{prefix}Errors   : {summary['errors']}")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"{prefix}Errors   : 0")
            )

        if dry_run:
            self.stdout.write(
                self.style.WARNING("Dry run complete — no changes committed.")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS("Escalation check complete.")
            )
