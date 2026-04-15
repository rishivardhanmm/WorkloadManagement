from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView, ListAPIView
from rest_framework.response import Response
from apps.users.permissions import IsAdminRole

from .models import Academic
from .serializers import AcademicSerializer
from apps.modules.models import Eligibility
from apps.modules.serializers import ModuleSerializer


class AcademicListCreateView(ListCreateAPIView):
    queryset = Academic.objects.select_related("department").all()
    serializer_class = AcademicSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = super().get_queryset()
        dept = self.request.query_params.get("dept")
        if dept:
            qs = qs.filter(department_id=dept)
        return qs


class AcademicDetailView(RetrieveUpdateDestroyAPIView):
    queryset = Academic.objects.select_related("department", "user").all()
    serializer_class = AcademicSerializer
    permission_classes = [IsAdminRole]

    def perform_destroy(self, instance):
        user = instance.user
        instance.delete()
        if user:
            user.delete()


class AcademicEligibleModulesView(ListAPIView):
    """GET /api/academics/:id/eligible-modules - modules this academic is eligible to teach."""
    permission_classes = [IsAdminRole]
    serializer_class = ModuleSerializer

    def list(self, request, *args, **kwargs):
        academic_id = kwargs["pk"]
        if not Academic.objects.filter(pk=academic_id).exists():
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        eligibilities = Eligibility.objects.filter(
            academic_id=academic_id
        ).select_related("module", "module__department")
        modules = [e.module for e in eligibilities]
        serializer = ModuleSerializer(modules, many=True)
        return Response(serializer.data)
