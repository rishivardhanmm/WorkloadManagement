from decimal import Decimal

from rest_framework import serializers
from django.db.models import Sum

from apps.academics.serializers import AcademicSerializer
from apps.modules.models import Module
from apps.modules.serializers import ModuleSerializer
from apps.years.serializers import AcademicYearSerializer

from .models import (
    WorkloadAllocation,
    TeachingAllocationItem,
    ResearchRole,
    ResearchAllocationItem,
    AdminRole,
    AdminAllocationItem,
)
from .services import (
    calculate_total_hours,
    calculate_utilisation,
    calculate_difference,
    calculate_status,
)


class TeachingAllocationItemSerializer(serializers.ModelSerializer):
    module_detail = ModuleSerializer(source="module", read_only=True)

    class Meta:
        model = TeachingAllocationItem
        fields = [
            "id",
            "module",
            "module_detail",
            "percentage",
            "calculated_hours",
        ]


class TeachingAllocationItemWriteSerializer(serializers.Serializer):
    module = serializers.IntegerField()
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2)

    def validate_percentage(self, value):
        if value < 0:
            raise serializers.ValidationError("Percentage cannot be negative.")
        if value > 100:
            raise serializers.ValidationError("Percentage cannot exceed 100.")
        return value


class ResearchRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchRole
        fields = ["id", "name", "department", "expected_hours", "is_active"]


class ResearchAllocationItemSerializer(serializers.ModelSerializer):
    research_role_detail = ResearchRoleSerializer(source="research_role", read_only=True)

    class Meta:
        model = ResearchAllocationItem
        fields = [
            "id",
            "research_role",
            "research_role_detail",
            "percentage",
            "calculated_hours",
        ]


class ResearchAllocationItemWriteSerializer(serializers.Serializer):
    research_role = serializers.IntegerField()
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2)

    def validate_percentage(self, value):
        if value < 0:
            raise serializers.ValidationError("Percentage cannot be negative.")
        if value > 100:
            raise serializers.ValidationError("Percentage cannot exceed 100.")
        return value


class AdminRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminRole
        fields = ["id", "name", "department", "expected_hours", "is_active"]


class AdminAllocationItemSerializer(serializers.ModelSerializer):
    admin_role_detail = AdminRoleSerializer(source="admin_role", read_only=True)

    class Meta:
        model = AdminAllocationItem
        fields = [
            "id",
            "admin_role",
            "admin_role_detail",
            "percentage",
            "calculated_hours",
        ]


class AdminAllocationItemWriteSerializer(serializers.Serializer):
    admin_role = serializers.IntegerField()
    percentage = serializers.DecimalField(max_digits=5, decimal_places=2)

    def validate_percentage(self, value):
        if value < 0:
            raise serializers.ValidationError("Percentage cannot be negative.")
        if value > 100:
            raise serializers.ValidationError("Percentage cannot exceed 100.")
        return value


class WorkloadAllocationSerializer(serializers.ModelSerializer):
    academic_detail = AcademicSerializer(source="academic", read_only=True)
    academic_year_detail = AcademicYearSerializer(source="academic_year", read_only=True)
    teaching_items = TeachingAllocationItemSerializer(many=True, read_only=True)
    research_items = ResearchAllocationItemSerializer(many=True, read_only=True)
    admin_items = AdminAllocationItemSerializer(many=True, read_only=True)
    total_hours = serializers.SerializerMethodField()
    utilisation = serializers.SerializerMethodField()
    difference = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()

    class Meta:
        model = WorkloadAllocation
        fields = [
            "id",
            "academic",
            "academic_detail",
            "academic_year",
            "academic_year_detail",
            "teaching_hours",
            "research_hours",
            "admin_hours",
            "notes",
            "teaching_items",
            "research_items",
            "admin_items",
            "total_hours",
            "utilisation",
            "difference",
            "status",
            "created_by_username",
            "created_at",
            "updated_at",
        ]

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by_id else None

    def get_total_hours(self, obj):
        return calculate_total_hours(
            obj.teaching_hours,
            obj.research_hours,
            obj.admin_hours,
        )

    def get_utilisation(self, obj):
        total = calculate_total_hours(
            obj.teaching_hours,
            obj.research_hours,
            obj.admin_hours,
        )
        return round(
            calculate_utilisation(total, obj.academic.capacity_hours),
            2,
        )

    def get_difference(self, obj):
        total = calculate_total_hours(
            obj.teaching_hours,
            obj.research_hours,
            obj.admin_hours,
        )
        return float(calculate_difference(total, obj.academic.capacity_hours))

    def get_status(self, obj):
        total = calculate_total_hours(
            obj.teaching_hours,
            obj.research_hours,
            obj.admin_hours,
        )
        return calculate_status(total, obj.academic.capacity_hours)


class WorkloadAllocationWriteSerializer(serializers.ModelSerializer):
    teaching_items = TeachingAllocationItemWriteSerializer(many=True, required=False)
    research_items = ResearchAllocationItemWriteSerializer(many=True, required=False)
    admin_items = AdminAllocationItemWriteSerializer(many=True, required=False)

    class Meta:
        model = WorkloadAllocation
        fields = [
            "id",
            "academic",
            "academic_year",
            "teaching_hours",
            "research_hours",
            "admin_hours",
            "notes",
            "teaching_items",
            "research_items",
            "admin_items",
        ]

    def validate_research_hours(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Research hours cannot be negative.")
        return value

    def validate_admin_hours(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Admin hours cannot be negative.")
        return value

    def validate(self, attrs):
        academic = attrs.get("academic", getattr(self.instance, "academic", None))
        academic_year = attrs.get("academic_year", getattr(self.instance, "academic_year", None))
        teaching_items = attrs.get("teaching_items", None)
        research_items = attrs.get("research_items", None)
        admin_items = attrs.get("admin_items", None)

        if academic and academic_year:
            if WorkloadAllocation.objects.filter(
                academic=academic,
                academic_year=academic_year,
            ).exclude(pk=self.instance.pk if self.instance else None).exists():
                raise serializers.ValidationError(
                    "An allocation already exists for this academic and year."
                )

        if teaching_items is not None:
            seen_modules = set()

            for item in teaching_items:
                module_id = item["module"]
                percentage = Decimal(str(item["percentage"]))

                if module_id in seen_modules:
                    raise serializers.ValidationError(
                        {"teaching_items": "The same module cannot be added more than once in one allocation."}
                    )
                seen_modules.add(module_id)

                try:
                    module = Module.objects.select_related("department").get(pk=module_id)
                except Module.DoesNotExist:
                    raise serializers.ValidationError(
                        {"teaching_items": f"Module with id {module_id} does not exist."}
                    )

                if academic and module.department_id != academic.department_id:
                    raise serializers.ValidationError(
                        {"teaching_items": "Module and academic must belong to the same department."}
                    )

                existing_items = TeachingAllocationItem.objects.filter(
                    module_id=module_id,
                    workload_allocation__academic_year=academic_year,
                )

                if self.instance:
                    existing_items = existing_items.exclude(
                        workload_allocation=self.instance
                    )

                existing_total = existing_items.aggregate(total=Sum("percentage"))["total"] or Decimal("0")

                if existing_total + percentage > Decimal("100"):
                    raise serializers.ValidationError(
                        {
                            "teaching_items": (
                                f"Module '{module.name}' exceeds 100% allocation for this academic year. "
                                f"Existing total: {existing_total}%, attempted add: {percentage}%."
                            )
                        }
                    )

        if research_items is not None:
            seen_roles = set()

            for item in research_items:
                role_id = item["research_role"]

                if role_id in seen_roles:
                    raise serializers.ValidationError(
                        {"research_items": "The same research role cannot be added more than once in one allocation."}
                    )
                seen_roles.add(role_id)

                try:
                    role = ResearchRole.objects.select_related("department").get(pk=role_id)
                except ResearchRole.DoesNotExist:
                    raise serializers.ValidationError(
                        {"research_items": f"Research role with id {role_id} does not exist."}
                    )

                if academic and role.department_id != academic.department_id:
                    raise serializers.ValidationError(
                        {"research_items": "Research role and academic must belong to the same department."}
                    )

        if admin_items is not None:
            seen_roles = set()

            for item in admin_items:
                role_id = item["admin_role"]

                if role_id in seen_roles:
                    raise serializers.ValidationError(
                        {"admin_items": "The same admin role cannot be added more than once in one allocation."}
                    )
                seen_roles.add(role_id)

                try:
                    role = AdminRole.objects.select_related("department").get(pk=role_id)
                except AdminRole.DoesNotExist:
                    raise serializers.ValidationError(
                        {"admin_items": f"Admin role with id {role_id} does not exist."}
                    )

                if academic and role.department_id != academic.department_id:
                    raise serializers.ValidationError(
                        {"admin_items": "Admin role and academic must belong to the same department."}
                    )

        return attrs

    def _calculate_module_hours(self, module: Module, percentage: Decimal) -> Decimal:
        return Decimal(str(module.credit_hours)) * (percentage / Decimal("100"))

    def _calculate_research_hours(self, role: ResearchRole, percentage: Decimal) -> Decimal:
        return Decimal(str(role.expected_hours)) * (percentage / Decimal("100"))

    def _calculate_admin_hours(self, role: AdminRole, percentage: Decimal) -> Decimal:
        return Decimal(str(role.expected_hours)) * (percentage / Decimal("100"))

    def create(self, validated_data):
        teaching_items = validated_data.pop("teaching_items", [])
        research_items = validated_data.pop("research_items", [])
        admin_items = validated_data.pop("admin_items", [])

        validated_data["teaching_hours"] = Decimal("0")
        validated_data["research_hours"] = Decimal("0")
        validated_data["admin_hours"] = Decimal("0")

        allocation = WorkloadAllocation.objects.create(**validated_data)

        total_teaching = Decimal("0")
        for item in teaching_items:
            module = Module.objects.get(pk=item["module"])
            percentage = Decimal(str(item["percentage"]))
            calculated_hours = self._calculate_module_hours(module, percentage)

            TeachingAllocationItem.objects.create(
                workload_allocation=allocation,
                module=module,
                percentage=percentage,
                calculated_hours=calculated_hours,
            )
            total_teaching += calculated_hours

        total_research = Decimal("0")
        for item in research_items:
            role = ResearchRole.objects.get(pk=item["research_role"])
            percentage = Decimal(str(item["percentage"]))
            calculated_hours = self._calculate_research_hours(role, percentage)

            ResearchAllocationItem.objects.create(
                workload_allocation=allocation,
                research_role=role,
                percentage=percentage,
                calculated_hours=calculated_hours,
            )
            total_research += calculated_hours

        total_admin = Decimal("0")
        for item in admin_items:
            role = AdminRole.objects.get(pk=item["admin_role"])
            percentage = Decimal(str(item["percentage"]))
            calculated_hours = self._calculate_admin_hours(role, percentage)

            AdminAllocationItem.objects.create(
                workload_allocation=allocation,
                admin_role=role,
                percentage=percentage,
                calculated_hours=calculated_hours,
            )
            total_admin += calculated_hours

        allocation.teaching_hours = total_teaching
        allocation.research_hours = total_research if research_items else allocation.research_hours
        allocation.admin_hours = total_admin if admin_items else allocation.admin_hours
        allocation.save(update_fields=["teaching_hours", "research_hours", "admin_hours"])

        return allocation

    def update(self, instance, validated_data):
        teaching_items = validated_data.pop("teaching_items", None)
        research_items = validated_data.pop("research_items", None)
        admin_items = validated_data.pop("admin_items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if teaching_items is not None:
            instance.teaching_items.all().delete()

            total_teaching = Decimal("0")
            for item in teaching_items:
                module = Module.objects.get(pk=item["module"])
                percentage = Decimal(str(item["percentage"]))
                calculated_hours = self._calculate_module_hours(module, percentage)

                TeachingAllocationItem.objects.create(
                    workload_allocation=instance,
                    module=module,
                    percentage=percentage,
                    calculated_hours=calculated_hours,
                )
                total_teaching += calculated_hours

            instance.teaching_hours = total_teaching

        if research_items is not None:
            instance.research_items.all().delete()

            total_research = Decimal("0")
            for item in research_items:
                role = ResearchRole.objects.get(pk=item["research_role"])
                percentage = Decimal(str(item["percentage"]))
                calculated_hours = self._calculate_research_hours(role, percentage)

                ResearchAllocationItem.objects.create(
                    workload_allocation=instance,
                    research_role=role,
                    percentage=percentage,
                    calculated_hours=calculated_hours,
                )
                total_research += calculated_hours

            instance.research_hours = total_research

        if admin_items is not None:
            instance.admin_items.all().delete()

            total_admin = Decimal("0")
            for item in admin_items:
                role = AdminRole.objects.get(pk=item["admin_role"])
                percentage = Decimal(str(item["percentage"]))
                calculated_hours = self._calculate_admin_hours(role, percentage)

                AdminAllocationItem.objects.create(
                    workload_allocation=instance,
                    admin_role=role,
                    percentage=percentage,
                    calculated_hours=calculated_hours,
                )
                total_admin += calculated_hours

            instance.admin_hours = total_admin

        instance.save()
        return instance