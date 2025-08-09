# game/urls.py - Simplified URLs without DRF

from django.urls import path
from . import views

app_name = 'game'

urlpatterns = [
    # Authentication endpoints (keep the existing working ones)
    path('api/auth/register/', views.register_user, name='register'),
    path('api/auth/login/', views.login_user, name='login'),
    path('api/auth/logout/', views.logout_user, name='logout'),
    
    # User profile endpoints (keep the existing working ones)
    path('api/profile/', views.user_profile, name='user_profile'),
    path('api/profile/statistics/', views.user_statistics, name='user_statistics'),
    path('api/profile/history/', views.user_game_history, name='user_game_history'),
    
    # Leaderboard endpoints (keep the existing working ones)
    path('api/leaderboard/', views.leaderboard, name='leaderboard'),
    
    # Room management endpoints - NEW SIMPLE VERSIONS
    path('api/rooms/', views.list_rooms, name='list_rooms'),
    path('api/rooms/create/', views.create_room, name='create_room'),
    path('api/rooms/join-by-code/', views.join_room_by_code, name='join_room_by_code'),
    path('api/rooms/<uuid:room_id>/', views.get_room, name='get_room'),
    path('api/rooms/<uuid:room_id>/join/', views.join_room, name='join_room'),
    path('api/rooms/<uuid:room_id>/leave/', views.leave_room, name='leave_room'),
    
    # Future game endpoints (placeholders)
    path('api/rooms/<uuid:room_id>/toggle-ready/', views.toggle_ready, name='toggle_ready'),
    path('api/rooms/<uuid:room_id>/start/', views.start_game, name='start_game'),
    path('api/rooms/<uuid:room_id>/next-round/', views.continue_to_next_round, name='continue_to_next_round'),
    path('api/rooms/<uuid:room_id>/round/', views.get_current_round, name='get_current_round'),
    path('api/rooms/<uuid:room_id>/round/<int:round_number>/submit-answer/', views.submit_answer, name='submit_answer'),
    path('api/rooms/<uuid:room_id>/round/<int:round_number>/vote/', views.submit_vote, name='submit_vote'),
]