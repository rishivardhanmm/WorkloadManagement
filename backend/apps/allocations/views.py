from django.db.models import Q
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from apps.users.permissions import IsAdminRole

from .models import WorkloadAllocation
from .serializers import WorkloadAllocationSerializer, WorkloadAllocationWriteSerializer


class WorkloadAllocationListCreateView(ListCreateAPIView):
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = WorkloadAllocation.objects.select_related(
            "academic",
            "academic__department",
            "academic_year",
            "created_by",
        ).prefetch_related(
            "teaching_items",
            "teaching_items__module",
            "teaching_items__module__department",
        )

        department = self.request.query_params.get("department")
        if department:
            qs = qs.filter(academic__department_id=department)

        academic = self.request.query_params.get("academic")
        if academic:
            qs = qs.filter(academic_id=academic)

        academic_year = self.request.query_params.get("academic_year")
        if academic_year:
            qs = qs.filter(academic_year_id=academic_year)

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(academic__full_name__icontains=search)
            )

        return qs.order_by("-updated_at", "academic__full_name")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WorkloadAllocationWriteSerializer
        return WorkloadAllocationSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        write_serializer = self.get_serializer(data=request.data)
        write_serializer.is_valid(raise_exception=True)
        self.perform_create(write_serializer)

        instance = write_serializer.instance
        read_serializer = WorkloadAllocationSerializer(instance, context=self.get_serializer_context())

        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class WorkloadAllocationDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminRole]
    queryset = WorkloadAllocation.objects.select_related(
        "academic",
        "academic__department",
        "academic_year",
        "created_by",
    ).prefetch_related(
        "teaching_items",
        "teaching_items__module",
        "teaching_items__module__department",
    )

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return WorkloadAllocationWriteSerializer
        return WorkloadAllocationSerializer

    def update(self, request, *args, **kwargs):
        partial = request.method == "PATCH"
        instance = self.get_object()

        write_serializer = self.get_serializer(instance, data=request.data, partial=partial)
        write_serializer.is_valid(raise_exception=True)
        self.perform_update(write_serializer)

        read_serializer = WorkloadAllocationSerializer(write_serializer.instance, context=self.get_serializer_context())
        return Response(read_serializer.data, status=status.HTTP_200_OK)