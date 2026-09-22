from rest_framework import serializers

from ai_analysis.models import AIAnalysis


class AIAnalysisSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for AIAnalysis results.

    Never exposes:
    - password or any user authentication fields
    - internal implementation details beyond model_name / model_version

    food_report is returned as the integer ID so the client can correlate
    without a full nested object.
    """

    food_report = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = AIAnalysis
        fields = [
            "id",
            "food_report",
            "status",
            "risk",
            "confidence",
            "concerns",
            "message",
            "analyzed_at",
            "model_name",
            "model_version",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
