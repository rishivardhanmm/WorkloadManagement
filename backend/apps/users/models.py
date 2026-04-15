from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        ACADEMIC = "ACADEMIC", "Academic"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.ACADEMIC,
    )

    # Email verification flow
    is_email_verified = models.BooleanField(default=False)
    must_verify_email = models.BooleanField(default=False)
    email_verification_code = models.CharField(max_length=6, blank=True, default="")
    email_verification_expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "auth_user"