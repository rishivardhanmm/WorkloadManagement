from django.urls import path

from .views import (
    WorkloadAllocationListCreateView,
    WorkloadAllocationDetailView,
    ResearchRoleListView,
    AdminRoleListView,
)

urlpatterns = [
    path("allocations/", WorkloadAllocationListCreateView.as_view()),
    path("allocations/<int:pk>/", WorkloadAllocationDetailView.as_view()),
    path("research-roles/", ResearchRoleListView.as_view()),
    path("admin-roles/", AdminRoleListView.as_view()),
]