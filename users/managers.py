from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    """
    Custom manager for the User model.
    Email is the unique identifier — no username field.
    """

    def create_user(self, email, password=None, **extra_fields):
        """
        Create and return a regular user with a hashed password.
        Role defaults to CUSTOMER; callers may not bypass this via extra_fields
        for public registration (enforced at the serializer layer).
        """
        if not email:
            raise ValueError("An email address is required.")

        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # Django hashing — never raw storage
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and return a superuser.
        Superusers always have is_staff=True, is_superuser=True, role=ADMIN.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        # Import here to avoid circular import at module level
        from users.models import User

        extra_fields.setdefault("role", User.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)
