from django.contrib import admin

from .models import (
    WorkloadAllocation,
    TeachingAllocationItem,
    ResearchRole,
    ResearchAllocationItem,
    AdminRole,
    AdminAllocationItem,
)


class TeachingAllocationItemInline(admin.TabularInline):
    model = TeachingAllocationItem
    extra = 0


class ResearchAllocationItemInline(admin.TabularInline):
    model = ResearchAllocationItem
    extra = 0


class AdminAllocationItemInline(admin.TabularInline):
    model = AdminAllocationItem
    extra = 0


@admin.register(WorkloadAllocation)
class WorkloadAllocationAdmin(admin.ModelAdmin):
    list_display = (
        "academic",
        "academic_year",
        "teaching_hours",
        "research_hours",
        "admin_hours",
        "created_by",
        "updated_at",
    )
    list_filter = ("academic_year", "academic__department")
    search_fields = ("academic__full_name", "notes")
    inlines = [
        TeachingAllocationItemInline,
        ResearchAllocationItemInline,
        AdminAllocationItemInline,
    ]


@admin.register(ResearchRole)
class ResearchRoleAdmin(admin.ModelAdmin):
    list_display = ("name", "department", "expected_hours", "is_active")
    list_filter = ("department", "is_active")
    search_fields = ("name",)


@admin.register(ResearchAllocationItem)
class ResearchAllocationItemAdmin(admin.ModelAdmin):
    list_display = ("workload_allocation", "research_role", "percentage", "calculated_hours")
    list_filter = ("research_role__department", "workload_allocation__academic_year")


@admin.register(AdminRole)
class AdminRoleAdmin(admin.ModelAdmin):
    list_display = ("name", "department", "expected_hours", "is_active")
    list_filter = ("department", "is_active")
    search_fields = ("name",)


@admin.register(AdminAllocationItem)
class AdminAllocationItemAdmin(admin.ModelAdmin):
    list_display = ("workload_allocation", "admin_role", "percentage", "calculated_hours")
    list_filter = ("admin_role__department", "workload_allocation__academic_year")