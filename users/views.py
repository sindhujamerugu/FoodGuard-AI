from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from users.serializers import (
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UserResponseSerializer,
)


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/

    Public endpoint. Creates a CUSTOMER account.
    Never accepts role, is_staff, or is_superuser from the client.
    Never returns a password or hash.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        user = serializer.save()
        response_data = UserResponseSerializer(user).data
        # Return only the registration-relevant subset
        return Response(
            {
                "id": response_data["id"],
                "email": response_data["email"],
                "first_name": response_data["first_name"],
                "last_name": response_data["last_name"],
                "phone": response_data["phone"],
                "role": response_data["role"],
                "preferred_language": response_data["preferred_language"],
                "date_joined": response_data["date_joined"],
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/v1/auth/login/

    Public endpoint. Returns access + refresh tokens plus user info.
    Returns HTTP 401 for invalid credentials.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(
                serializer.errors, status=status.HTTP_401_UNAUTHORIZED
            )

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "preferred_language": user.preferred_language,
            },
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    """
    GET /api/v1/auth/profile/

    JWT required. Returns full profile — never password.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        serializer = UserResponseSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/

    JWT required. Blacklists the supplied refresh token so it can no
    longer be used to obtain new access tokens.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = LogoutSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {"detail": "Successfully logged out."},
            status=status.HTTP_200_OK,
        )


# Re-export simplejwt's TokenRefreshView under our URL namespace
# so tests and API clients only need to know /api/v1/auth/token/refresh/
TokenRefreshView = TokenRefreshView
