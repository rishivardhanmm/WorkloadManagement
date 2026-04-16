from django.urls import path
from .views import (
    ChangePasswordView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    ForgotPasswordRequestView,
    ForgotPasswordResendView,
    ForgotPasswordResetView,
    ForgotPasswordVerifyView,
    MeView,
    SendVerificationCodeView,
    VerifyEmailView,
)

urlpatterns = [
    path("login", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("me", MeView.as_view(), name="me"),
    path("send-verification-code", SendVerificationCodeView.as_view(), name="send_verification_code"),
    path("verify-email", VerifyEmailView.as_view(), name="verify_email"),
    path("forgot-password/request", ForgotPasswordRequestView.as_view(), name="forgot_password_request"),
    path("forgot-password/resend", ForgotPasswordResendView.as_view(), name="forgot_password_resend"),
    path("forgot-password/verify", ForgotPasswordVerifyView.as_view(), name="forgot_password_verify"),
    path("forgot-password/reset", ForgotPasswordResetView.as_view(), name="forgot_password_reset"),
    path("change-password", ChangePasswordView.as_view(), name="change_password"),
]