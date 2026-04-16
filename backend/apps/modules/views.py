from django.db.models import Q
from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView,
    DestroyAPIView,
)

from apps.users.permissions import IsAdminRole

from .models import Module, Eligibility, ModuleTeachingAllocation
from .serializers import (
    ModuleSerializer,
    EligibilitySerializer,
    ModuleTeachingAllocationSerializer,
)

MODULE_ORDERING_FIELDS = {"name", "code", "credit_hours"}


class ModuleListCreateView(ListCreateAPIView):
    serializer_class = ModuleSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = Module.objects.select_related("department").all()
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(code__icontains=search)
            )

        ordering = self.request.query_params.get("ordering", "name")
        if ordering in MODULE_ORDERING_FIELDS:
            qs = qs.order_by(ordering)
        return qs


class ModuleDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Module.objects.select_related("department").all()
    serializer_class = ModuleSerializer
    permission_classes = [IsAdminRole]


class EligibilityListCreateView(ListCreateAPIView):
    serializer_class = EligibilitySerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = Eligibility.objects.select_related(
            "academic",
            "academic__department",
            "module",
            "module__department",
        ).all()

        academic = self.request.query_params.get("academic")
        if academic:
            qs = qs.filter(academic_id=academic)

        module = self.request.query_params.get("module")
        if module:
            qs = qs.filter(module_id=module)

        return qs


class EligibilityDestroyView(DestroyAPIView):
    queryset = Eligibility.objects.all()
    permission_classes = [IsAdminRole]


class ModuleTeachingAllocationListCreateView(ListCreateAPIView):
    serializer_class = ModuleTeachingAllocationSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = ModuleTeachingAllocation.objects.select_related(
            "module",
            "module__department",
            "academic",
            "academic__department",
            "academic_year",
        ).all()

        module = self.request.query_params.get("module")
        if module:
            qs = qs.filter(module_id=module)

        academic = self.request.query_params.get("academic")
        if academic:
            qs = qs.filter(academic_id=academic)

        academic_year = self.request.query_params.get("academic_year")
        if academic_year:
            qs = qs.filter(academic_year_id=academic_year)

        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(module__department_id=department)

        return qs.order_by("module__name", "academic__full_name")


class ModuleTeachingAllocationDetailView(RetrieveUpdateDestroyAPIView):
    queryset = ModuleTeachingAllocation.objects.select_related(
        "module",
        "module__department",
        "academic",
        "academic__department",
        "academic_year",
    ).all()
    serializer_class = ModuleTeachingAllocationSerializer
    permission_classes = [IsAdminRole]