from rest_framework import serializers

from apps.departments.serializers import DepartmentSerializer
from apps.academics.serializers import AcademicSerializer
from apps.years.serializers import AcademicYearSerializer

from .models import Module, Eligibility, ModuleTeachingAllocation


class ModuleSerializer(serializers.ModelSerializer):
    department_detail = DepartmentSerializer(source="department", read_only=True)

    class Meta:
        model = Module
        fields = [
            "id",
            "code",
            "name",
            "department",
            "department_detail",
            "credit_hours",
            "is_active",
            "created_at",
            "updated_at",
        ]


class EligibilitySerializer(serializers.ModelSerializer):
    academic_detail = AcademicSerializer(source="academic", read_only=True)
    module_detail = ModuleSerializer(source="module", read_only=True)

    class Meta:
        model = Eligibility
        fields = ["id", "academic", "academic_detail", "module", "module_detail"]

    def validate(self, attrs):
        academic = attrs.get("academic")
        module = attrs.get("module")

        if not academic.is_active:
            raise serializers.ValidationError(
                {"academic": "Academic must be active to be assigned eligibility."}
            )

        if not module.is_active:
            raise serializers.ValidationError(
                {"module": "Module must be active to be assigned in eligibility."}
            )

        if academic.department_id != module.department_id:
            raise serializers.ValidationError(
                "Academic and module must belong to the same department."
            )

        return attrs


class ModuleTeachingAllocationSerializer(serializers.ModelSerializer):
    module_detail = ModuleSerializer(source="module", read_only=True)
    academic_detail = AcademicSerializer(source="academic", read_only=True)
    academic_year_detail = AcademicYearSerializer(source="academic_year", read_only=True)

    class Meta:
        model = ModuleTeachingAllocation
        fields = [
            "id",
            "module",
            "module_detail",
            "academic",
            "academic_detail",
            "academic_year",
            "academic_year_detail",
            "percentage",
        ]

    def validate(self, attrs):
        module = attrs.get("module", getattr(self.instance, "module", None))
        academic = attrs.get("academic", getattr(self.instance, "academic", None))
        academic_year = attrs.get("academic_year", getattr(self.instance, "academic_year", None))

        if academic and not academic.is_active:
            raise serializers.ValidationError(
                {"academic": "Academic must be active to receive module allocation."}
            )

        if module and not module.is_active:
            raise serializers.ValidationError(
                {"module": "Module must be active to receive teaching allocations."}
            )

        if module and academic and academic.department_id != module.department_id:
            raise serializers.ValidationError(
                "Academic and module must belong to the same department."
            )

        if module and academic:
            if not Eligibility.objects.filter(module=module, academic=academic).exists():
                raise serializers.ValidationError(
                    "Academic must be eligible for this module before allocation."
                )

        return attrs