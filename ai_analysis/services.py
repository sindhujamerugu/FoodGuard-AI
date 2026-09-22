"""
FoodGuard AI — AI Analysis Service Abstraction.

Architecture
------------
AIAnalysisService is a clean abstraction layer that separates the view
from any analysis implementation.  The current implementation is a
deterministic mock; it will be replaced by a real visual model without
changing the view or serializer layers.

Language independence
---------------------
All internal results use structured data (risk, concerns, confidence).
A future TranslationService will convert `message` into the user's
preferred_language without altering the stored originals.

Terminology
-----------
Results are a PRELIMINARY VISUAL ASSESSMENT only.
They do NOT constitute:
  - scientific food-safety certification
  - proof of contamination
  - evidence of restaurant wrongdoing

No external APIs.  No ML training.  No datasets.  No OCR.
"""

from django.utils import timezone

from food_reports.models import FoodReport
from ai_analysis.models import AIAnalysis


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class AnalysisError(Exception):
    """Raised when an analysis cannot proceed."""


# ---------------------------------------------------------------------------
# Mock result constant
# ---------------------------------------------------------------------------

# This result is intentionally generic and non-committal.
# It clearly signals mock mode so no one mistakes it for a real prediction.
_MOCK_RESULT = {
    "food": "unknown",
    "risk": AIAnalysis.Risk.HUMAN_REVIEW,
    "confidence": 0.0,
    "concerns": ["uncertain"],
    "message": (
        "AI analysis is currently running in mock mode. "
        "A real visual model will be integrated in a future release. "
        "This result is NOT a scientific food-safety determination."
    ),
    "model_name": "mock-foodguard-ai",
    "model_version": "0.1.0",
}


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class AIAnalysisService:
    """
    Abstraction layer for food-report AI analysis.

    Usage
    -----
    service = AIAnalysisService()
    analysis = service.analyze_food_report(food_report)

    The service always upserts (update-or-create) the AIAnalysis record so
    repeated calls update the existing row rather than inserting duplicates.

    Replacing the implementation
    ----------------------------
    To swap in a real model, subclass this service or replace the
    `_run_analysis` method.  The view and serializers do not need to change.
    """

    def analyze_food_report(self, food_report: FoodReport) -> AIAnalysis:
        """
        Run analysis on a FoodReport.

        Steps
        -----
        1. Validate the report has an image.
        2. Set status to PROCESSING.
        3. Run the analysis backend (currently mock).
        4. Persist the result (upsert).
        5. Return the AIAnalysis instance.

        Raises AnalysisError if the report has no image.
        """
        self._validate(food_report)

        # Mark as processing — persists immediately so GET analysis
        # during a long-running real job would show PROCESSING.
        analysis, _ = AIAnalysis.objects.update_or_create(
            food_report=food_report,
            defaults={
                "status": AIAnalysis.Status.PROCESSING,
            },
        )

        try:
            result = self._run_analysis(food_report)
            analysis.status = AIAnalysis.Status.COMPLETED
            analysis.risk = result["risk"]
            analysis.confidence = result["confidence"]
            analysis.concerns = result["concerns"]
            analysis.message = result["message"]
            analysis.model_name = result["model_name"]
            analysis.model_version = result["model_version"]
            analysis.analyzed_at = timezone.now()
            analysis.save()
        except Exception as exc:
            analysis.status = AIAnalysis.Status.FAILED
            analysis.message = f"Analysis failed: {exc}"
            analysis.save()
            raise AnalysisError(str(exc)) from exc

        return analysis

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _validate(self, food_report: FoodReport) -> None:
        """Raise AnalysisError if the report is not ready for analysis."""
        if not food_report.image:
            raise AnalysisError(
                "This food report does not have an attached image. "
                "Please upload an image before requesting AI analysis."
            )

    def _run_analysis(self, food_report: FoodReport) -> dict:
        """
        Execute the analysis and return a structured result dict.

        Current implementation: deterministic mock.
        Future implementation: replace with real visual model call.

        The returned dict must contain:
            food, risk, confidence, concerns, message,
            model_name, model_version
        """
        return _MOCK_RESULT.copy()
