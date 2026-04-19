from django.urls import path

from .views import (
    WorkloadAllocationListCreateView,
    WorkloadAllocationDetailView,
    ResearchRoleListCreateView,
    ResearchRoleDetailView,
    AdminRoleListCreateView,
    AdminRoleDetailView,
)

urlpatterns = [
    path("allocations/", WorkloadAllocationListCreateView.as_view()),
    path("allocations/<int:pk>/", WorkloadAllocationDetailView.as_view()),
    path("research-roles/", ResearchRoleListCreateView.as_view()),
    path("research-roles/<int:pk>/", ResearchRoleDetailView.as_view()),
    path("admin-roles/", AdminRoleListCreateView.as_view()),
    path("admin-roles/<int:pk>/", AdminRoleDetailView.as_view()),
]