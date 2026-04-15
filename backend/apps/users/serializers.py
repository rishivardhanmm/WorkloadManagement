from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "is_active",
            "is_email_verified",
            "must_verify_email",
            "date_joined",
            "last_login",
        ]
        read_only_fields = [
            "id",
            "is_email_verified",
            "must_verify_email",
            "date_joined",
            "last_login",
        ]