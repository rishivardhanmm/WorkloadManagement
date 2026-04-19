from django.conf import settings
from django.db import models

from apps.departments.models import Department


class Academic(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="academic_profile",
    )
    full_name = models.CharField(max_length=255)
    email = models.EmailField(null=True, blank=True)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="academics",
    )
    capacity_hours = models.PositiveIntegerField(default=1500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "academics_academic"
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name
