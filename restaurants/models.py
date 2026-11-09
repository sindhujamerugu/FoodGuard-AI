from django.conf import settings
from django.db import models


class Restaurant(models.Model):
    """
    Represents a food establishment registered on FoodGuard AI.

    Ownership rules
    ---------------
    - The owner must have role = RESTAURANT_USER (enforced at the
      serializer/view layer, not the DB layer, so admin can reassign
      if needed).
    - on_delete=PROTECT prevents accidental deletion of a user who still
      owns a restaurant.  Admins must transfer or remove restaurants
      before deleting a RESTAURANT_USER account.

    Verification
    ------------
    - is_verified is controlled only by REVIEWER / ADMIN roles.
    - RESTAURANT_USER may never set is_verified=True on their own record.

    Multilingual
    ------------
    - name, description, address are stored as-entered (original language
      preserved).  A future TranslationService layer will produce
      localised versions without overwriting these originals.
    """

    name = models.CharField(max_length=255, verbose_name="restaurant name")

    description = models.TextField(
        blank=True,
        default="",
        verbose_name="description",
    )

    address = models.TextField(verbose_name="address")

    city = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="city",
    )

    state = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name="state",
    )

    pincode = models.CharField(max_length=10, verbose_name="pincode")

    contact_email = models.EmailField(
        blank=True,
        default="",
        verbose_name="contact email",
    )

    contact_phone = models.CharField(
        max_length=20,
        blank=True,
        default="",
        verbose_name="contact phone",
    )

    class ClaimStatus(models.TextChoices):
        UNCLAIMED = "UNCLAIMED", "Unclaimed"
        PENDING = "PENDING", "Pending Approval"
        CLAIMED = "CLAIMED", "Claimed"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="owned_restaurants",
        verbose_name="owner",
    )

    claimed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="claimed_restaurants",
        verbose_name="claimed by",
        help_text="Restaurant user who has requested ownership pending review.",
    )

    claim_status = models.CharField(
        max_length=20,
        choices=ClaimStatus.choices,
        default=ClaimStatus.UNCLAIMED,
        db_index=True,
        verbose_name="claim status",
    )

    is_verified = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="verified",
        help_text="Set by a Reviewer or Admin after platform verification.",
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="active",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "restaurant"
        verbose_name_plural = "restaurants"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["city"], name="restaurant_city_idx"),
            models.Index(fields=["state"], name="restaurant_state_idx"),
            models.Index(fields=["is_verified"], name="restaurant_verified_idx"),
            models.Index(fields=["is_active"], name="restaurant_active_idx"),
            models.Index(fields=["claim_status"], name="restaurant_claim_idx"),
        ]

    def save(self, *args, **kwargs) -> None:
        if self.owner_id is not None:
            self.claim_status = self.ClaimStatus.CLAIMED
        elif self.claimed_by_id is not None:
            self.claim_status = self.ClaimStatus.PENDING
        else:
            self.claim_status = self.ClaimStatus.UNCLAIMED
        super().save(*args, **kwargs)

    @property
    def is_claimed(self) -> bool:
        return self.owner_id is not None

    def __str__(self) -> str:
        return f"{self.name} ({self.city}, {self.state})"
