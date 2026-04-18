from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.academics.models import Academic
from apps.modules.models import Module
from apps.years.models import AcademicYear


class WorkloadAllocation(models.Model):
    academic = models.ForeignKey(
        Academic,
        on_delete=models.CASCADE,
        related_name="workload_allocations",
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name="workload_allocations",
    )
    teaching_hours = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    research_hours = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    admin_hours = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_allocations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "allocations_workloadallocation"
        unique_together = [["academic", "academic_year"]]
        ordering = ["academic_year", "academic"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(teaching_hours__gte=0)
                & models.Q(research_hours__gte=0)
                & models.Q(admin_hours__gte=0),
                name="allocations_hours_non_negative",
            )
        ]

    def __str__(self):
        return f"{self.academic} - {self.academic_year}"


class TeachingAllocationItem(models.Model):
    workload_allocation = models.ForeignKey(
        WorkloadAllocation,
        on_delete=models.CASCADE,
        related_name="teaching_items",
    )
    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name="teaching_items",
    )
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("100"))
    calculated_hours = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))

    class Meta:
        db_table = "allocations_teachingallocationitem"
        ordering = ["module__name"]
        unique_together = [["workload_allocation", "module"]]

    def __str__(self):
        return f"{self.workload_allocation} - {self.module} ({self.percentage}%)"


class ResearchRole(models.Model):
    name = models.CharField(max_length=255)
    department = models.ForeignKey(
        "departments.Department",
        on_delete=models.CASCADE,
        related_name="research_roles",
    )
    expected_hours = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "allocations_researchrole"
        ordering = ["name"]
        unique_together = [["department", "name"]]

    def __str__(self):
        return self.name


class ResearchAllocationItem(models.Model):
    workload_allocation = models.ForeignKey(
        WorkloadAllocation,
        on_delete=models.CASCADE,
        related_name="research_items",
    )
    research_role = models.ForeignKey(
        ResearchRole,
        on_delete=models.CASCADE,
        related_name="allocation_items",
    )
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("100"))
    calculated_hours = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))

    class Meta:
        db_table = "allocations_researchallocationitem"
        ordering = ["research_role__name"]
        unique_together = [["workload_allocation", "research_role"]]

    def __str__(self):
        return f"{self.workload_allocation} - {self.research_role} ({self.percentage}%)"


class AdminRole(models.Model):
    name = models.CharField(max_length=255)
    department = models.ForeignKey(
        "departments.Department",
        on_delete=models.CASCADE,
        related_name="admin_roles",
    )
    expected_hours = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "allocations_adminrole"
        ordering = ["name"]
        unique_together = [["department", "name"]]

    def __str__(self):
        return self.name


class AdminAllocationItem(models.Model):
    workload_allocation = models.ForeignKey(
        WorkloadAllocation,
        on_delete=models.CASCADE,
        related_name="admin_items",
    )
    admin_role = models.ForeignKey(
        AdminRole,
        on_delete=models.CASCADE,
        related_name="allocation_items",
    )
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("100"))
    calculated_hours = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))

    class Meta:
        db_table = "allocations_adminallocationitem"
        ordering = ["admin_role__name"]
        unique_together = [["workload_allocation", "admin_role"]]

    def __str__(self):
        return f"{self.workload_allocation} - {self.admin_role} ({self.percentage}%)"