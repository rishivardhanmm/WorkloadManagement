from datetime import timedelta
import json
import random
from urllib import request as urllib_request

from django.conf import settings
from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import User
from .serializers import UserSerializer


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]


class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


class VerifyEmailCodeSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6)


class SendVerificationCodeView(APIView):
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

        code = f"{random.randint(0, 999999):06d}"
        user.email_verification_code = code
        user.email_verification_expires_at = timezone.now() + timedelta(minutes=10)
        user.save(update_fields=["email_verification_code", "email_verification_expires_at"])

        payload = {
            "from": "noreply@riteshmitharwal.co.uk",
            "to": [user.email],
            "subject": "Your Workload Management verification code",
            "text": (
                f"Hello {user.username},\n\n"
                f"Your verification code is: {code}\n\n"
                f"This code will expire in 10 minutes."
            ),
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

        return Response({"detail": "Verification code sent."}, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
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