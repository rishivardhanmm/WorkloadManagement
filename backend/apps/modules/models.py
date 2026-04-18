from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum

from apps.departments.models import Department
from apps.academics.models import Academic


class Module(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="modules",
    )
    credit_hours = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "modules_module"
        ordering = ["name"]

    def __str__(self):
        return f"{self.code} - {self.name}" if self.code else self.name


class Eligibility(models.Model):
    academic = models.ForeignKey(
        Academic,
        on_delete=models.CASCADE,
        related_name="eligibilities",
    )
    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name="eligibilities",
    )

    class Meta:
        db_table = "modules_eligibility"
        unique_together = [["academic", "module"]]

    def __str__(self):
        return f"{self.academic} -> {self.module}"


class ModuleTeachingAllocation(models.Model):
    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name="teaching_allocations",
    )
    academic = models.ForeignKey(
        Academic,
        on_delete=models.CASCADE,
        related_name="module_teaching_allocations",
    )
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    academic_year = models.ForeignKey(
        "years.AcademicYear",
        on_delete=models.CASCADE,
        related_name="module_teaching_allocations",
    )

    class Meta:
        db_table = "modules_module_teaching_allocation"
        unique_together = [["module", "academic", "academic_year"]]

    def clean(self):
        existing = ModuleTeachingAllocation.objects.filter(
            module=self.module,
            academic_year=self.academic_year,
        )

        if self.pk:
            existing = existing.exclude(pk=self.pk)

        total = existing.aggregate(total=Sum("percentage"))["total"] or 0
        total += self.percentage

        if total > 100:
            raise ValidationError(
                f"Total allocation for this module in this academic year exceeds 100%. Current total: {total}%"
            )

        if self.academic.department_id != self.module.department_id:
            raise ValidationError(
                "Academic and module must belong to the same department."
            )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.module} - {self.academic} - {self.percentage}%"