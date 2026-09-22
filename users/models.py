from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from users.managers import UserManager


class User(AbstractUser):
    """
    FoodGuard AI custom user model.

    - Email is the unique login identifier (no username).
    - Roles control what the user can do in the system.
    - preferred_language drives multilingual output for notifications,
      AI explanations, complaint responses, and future TranslationService
      calls.  The field is stored here so every layer of the system can
      read it without a separate profile lookup.
    """

    # ------------------------------------------------------------------
    # Role choices
    # ------------------------------------------------------------------

    class Role(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        RESTAURANT_USER = "RESTAURANT_USER", "Restaurant User"
        REVIEWER = "REVIEWER", "Reviewer"
        ADMIN = "ADMIN", "Admin"

    # ------------------------------------------------------------------
    # Language choices
    # Stored as short BCP-47-style codes so a future TranslationService
    # can look them up without string manipulation.
    # ------------------------------------------------------------------

    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        TELUGU = "te", "Telugu"
        HINDI = "hi", "Hindi"
        TAMIL = "ta", "Tamil"
        KANNADA = "kn", "Kannada"
        MARATHI = "mr", "Marathi"

    # ------------------------------------------------------------------
    # Remove the inherited username field — email is the identifier.
    # ------------------------------------------------------------------

    username = None  # type: ignore[assignment]

    # ------------------------------------------------------------------
    # Core fields
    # ------------------------------------------------------------------

    email = models.EmailField(
        unique=True,
        db_index=True,
        verbose_name="email address",
    )

    first_name = models.CharField(max_length=150, blank=False)
    last_name = models.CharField(max_length=150, blank=False)

    phone = models.CharField(
        max_length=20,
        blank=True,
        default="",
        verbose_name="phone number",
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
        db_index=True,
        verbose_name="user role",
    )

    preferred_language = models.CharField(
        max_length=5,
        choices=Language.choices,
        default=Language.ENGLISH,
        verbose_name="preferred language",
        help_text=(
            "Controls the language used for notifications, AI explanations, "
            "and complaint responses delivered to this user."
        ),
    )

    # date_joined comes from AbstractUser; we add updated_at below.
    updated_at = models.DateTimeField(auto_now=True)

    # ------------------------------------------------------------------
    # Auth configuration
    # ------------------------------------------------------------------

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]  # used by createsuperuser

    objects = UserManager()

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["-date_joined"]

    def __str__(self) -> str:
        return f"{self.email} ({self.get_role_display()})"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def is_customer(self) -> bool:
        return self.role == self.Role.CUSTOMER

    def is_reviewer(self) -> bool:
        return self.role == self.Role.REVIEWER

    def is_admin_role(self) -> bool:
        """Distinct from Django's is_staff/is_superuser."""
        return self.role == self.Role.ADMIN

    def is_restaurant_user(self) -> bool:
        return self.role == self.Role.RESTAURANT_USER
