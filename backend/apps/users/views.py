from datetime import timedelta
import json
import random
from urllib import request as urllib_request

from django.conf import settings
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import User
from .serializers import UserSerializer


def send_email_via_resend(to_email: str, subject: str, text: str):
    payload = {
        "from": "noreply@riteshmitharwal.co.uk",
        "to": [to_email],
        "subject": subject,
        "text": text,
    }

    req = urllib_request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "workload-management/1.0",
        },
        method="POST",
    )

    with urllib_request.urlopen(req) as response:
        response.read()


def generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class CaseInsensitiveTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = (attrs.get("username") or "").strip()
        if username:
            matched = User.objects.filter(username__iexact=username).first()
            if matched:
                attrs["username"] = matched.username
        return super().validate(attrs)


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CaseInsensitiveTokenObtainPairSerializer


class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


class VerifyEmailCodeSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6)


class ForgotPasswordRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Username is required.")
        return value


class ForgotPasswordVerifySerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    code = serializers.CharField(max_length=6)

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Username is required.")
        return value


class ForgotPasswordResetSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(max_length=128)
    confirm_password = serializers.CharField(max_length=128)

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Username is required.")
        return value

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not any(ch.islower() for ch in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not any(ch.isupper() for ch in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not any(ch.isdigit() for ch in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(max_length=128)
    new_password = serializers.CharField(max_length=128)
    confirm_password = serializers.CharField(max_length=128)

    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not any(ch.islower() for ch in value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not any(ch.isupper() for ch in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not any(ch.isdigit() for ch in value):
            raise serializers.ValidationError("Password must contain at least one number.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs


class SendVerificationCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user: User = request.user

        if not user.email:
            return Response(
                {"detail": "This account does not have an email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.must_verify_email:
            return Response(
                {"detail": "This account does not require first-time email verification."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = generate_otp()
        user.email_verification_code = code
        user.email_verification_expires_at = timezone.now() + timedelta(minutes=10)
        user.save(update_fields=["email_verification_code", "email_verification_expires_at"])

        send_email_via_resend(
            to_email=user.email,
            subject="Your Workload Management verification code",
            text=(
                f"Hello {user.username},\n\n"
                f"Your verification code is: {code}\n\n"
                f"This code will expire in 10 minutes."
            ),
        )

        return Response({"detail": "Verification code sent."}, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user: User = request.user
        serializer = VerifyEmailCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not user.must_verify_email:
            return Response(
                {"detail": "This account is already verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submitted_code = serializer.validated_data["code"].strip()

        if not user.email_verification_code:
            return Response(
                {"detail": "No verification code has been issued yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.email_verification_expires_at or user.email_verification_expires_at < timezone.now():
            return Response(
                {"detail": "Verification code has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if submitted_code != user.email_verification_code:
            return Response(
                {"detail": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_email_verified = True
        user.must_verify_email = False
        user.email_verification_code = ""
        user.email_verification_expires_at = None
        user.save(
            update_fields=[
                "is_email_verified",
                "must_verify_email",
                "email_verification_code",
                "email_verification_expires_at",
            ]
        )

        return Response({"detail": "Email verified successfully."}, status=status.HTTP_200_OK)


class ForgotPasswordRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        user = User.objects.filter(username__iexact=username).first()

        if not user or user.role != User.Role.ACADEMIC:
            return Response(
                {"detail": "If the account is eligible, a reset code has been sent."},
                status=status.HTTP_200_OK,
            )

        if not user.email:
            return Response(
                {"detail": "This account does not have an email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = generate_otp()
        user.password_reset_code = code
        user.password_reset_expires_at = timezone.now() + timedelta(minutes=10)
        user.save(update_fields=["password_reset_code", "password_reset_expires_at"])

        send_email_via_resend(
            to_email=user.email,
            subject="Your Workload Management password reset code",
            text=(
                f"Hello {user.username},\n\n"
                f"Your password reset code is: {code}\n\n"
                f"This code will expire in 10 minutes."
            ),
        )

        return Response(
            {"detail": "If the account is eligible, a reset code has been sent."},
            status=status.HTTP_200_OK,
        )


class ForgotPasswordResendView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        user = User.objects.filter(username__iexact=username).first()

        if not user or user.role != User.Role.ACADEMIC:
            return Response(
                {"detail": "If the account is eligible, a reset code has been sent."},
                status=status.HTTP_200_OK,
            )

        if not user.email:
            return Response(
                {"detail": "This account does not have an email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        code = generate_otp()
        user.password_reset_code = code
        user.password_reset_expires_at = timezone.now() + timedelta(minutes=10)
        user.save(update_fields=["password_reset_code", "password_reset_expires_at"])

        send_email_via_resend(
            to_email=user.email,
            subject="Your Workload Management password reset code",
            text=(
                f"Hello {user.username},\n\n"
                f"Your password reset code is: {code}\n\n"
                f"This code will expire in 10 minutes."
            ),
        )

        return Response(
            {"detail": "If the account is eligible, a reset code has been sent."},
            status=status.HTTP_200_OK,
        )


class ForgotPasswordVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        code = serializer.validated_data["code"].strip()

        user = User.objects.filter(username__iexact=username).first()

        if not user or user.role != User.Role.ACADEMIC:
            return Response(
                {"detail": "Invalid username or reset request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.password_reset_code:
            return Response(
                {"detail": "No reset code has been issued for this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.password_reset_expires_at or user.password_reset_expires_at < timezone.now():
            return Response(
                {"detail": "Reset code has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if code != user.password_reset_code:
            return Response(
                {"detail": "Invalid reset code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"detail": "OTP verified successfully."}, status=status.HTTP_200_OK)


class ForgotPasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        code = serializer.validated_data["code"].strip()
        new_password = serializer.validated_data["new_password"]

        user = User.objects.filter(username__iexact=username).first()

        if not user or user.role != User.Role.ACADEMIC:
            return Response(
                {"detail": "Invalid username or reset request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.password_reset_code:
            return Response(
                {"detail": "No reset code has been issued for this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.password_reset_expires_at or user.password_reset_expires_at < timezone.now():
            return Response(
                {"detail": "Reset code has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if code != user.password_reset_code:
            return Response(
                {"detail": "Invalid reset code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.password_reset_code = ""
        user.password_reset_expires_at = None
        user.save(update_fields=["password", "password_reset_code", "password_reset_expires_at"])

        return Response({"detail": "Password reset successful."}, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user: User = request.user

        if user.role != User.Role.ACADEMIC:
            return Response(
                {"detail": "Only academic users can change password here."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        current_password = serializer.validated_data["current_password"]
        new_password = serializer.validated_data["new_password"]

        if not user.check_password(current_password):
            return Response(
                {"current_password": ["Current password is incorrect."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)