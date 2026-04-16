from django.contrib import admin
from .models import Module, Eligibility, ModuleTeachingAllocation


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "department", "credit_hours", "is_active")


@admin.register(Eligibility)
class EligibilityAdmin(admin.ModelAdmin):
    list_display = ("academic", "module")


@admin.register(ModuleTeachingAllocation)
class ModuleTeachingAllocationAdmin(admin.ModelAdmin):
    list_display = ("module", "academic", "academic_year", "percentage")