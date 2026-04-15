from rest_framework import serializers
from apps.departments.serializers import DepartmentSerializer
from apps.users.models import User
from .models import Academic


class AcademicSerializer(serializers.ModelSerializer):
    department_detail = DepartmentSerializer(source="department", read_only=True)

    class Meta:
        model = Academic
        fields = [
            "id",
            "user",
            "full_name",
            "email",
            "department",
            "department_detail",
            "capacity_hours",
            "is_active",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {"user": {"read_only": True}}

    def create(self, validated_data):
        full_name = validated_data["full_name"]
        email = validated_data["email"]

        # Create login for the academic:
        # username = full name (with suffix if duplicate)
        # password = final username + "123"
        base_username = full_name.strip()
        username = base_username
        suffix = 1

        while User.objects.filter(username=username).exists():
            suffix += 1
            username = f"{base_username} {suffix}"

        user = User.objects.create(
            username=username,
            email=email,
            role=User.Role.ACADEMIC,
            is_email_verified=False,
            must_verify_email=True,
        )
        user.set_password(username + "123")
        user.save()

        validated_data["user"] = user
        return super().create(validated_data)