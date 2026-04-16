from django.urls import path

from .views import (
    ModuleListCreateView,
    ModuleDetailView,
    EligibilityListCreateView,
    EligibilityDestroyView,
    ModuleTeachingAllocationListCreateView,
    ModuleTeachingAllocationDetailView,
)

urlpatterns = [
    path("modules", ModuleListCreateView.as_view(), name="module-list"),
    path("modules/<int:pk>", ModuleDetailView.as_view(), name="module-detail"),

    path("eligibility", EligibilityListCreateView.as_view(), name="eligibility-list"),
    path("eligibility/<int:pk>", EligibilityDestroyView.as_view(), name="eligibility-detail"),

    path(
        "module-teaching-allocations",
        ModuleTeachingAllocationListCreateView.as_view(),
        name="module-teaching-allocation-list",
    ),
    path(
        "module-teaching-allocations/<int:pk>",
        ModuleTeachingAllocationDetailView.as_view(),
        name="module-teaching-allocation-detail",
    ),
]