# game/urls.py - Enhanced with User System URLs

from django.urls import path, include
from . import views

app_name = 'game'

urlpatterns = [
    # Authentication endpoints
    path('api/auth/register/', views.register_user, name='register'),
    path('api/auth/login/', views.login_user, name='login'),
    path('api/auth/logout/', views.logout_user, name='logout'),
    
    # User profile endpoints
    path('api/profile/', views.user_profile, name='user_profile'),
    path('api/profile/statistics/', views.user_statistics, name='user_statistics'),
    path('api/profile/history/', views.user_game_history, name='user_game_history'),
    
    # Leaderboard endpoints
    path('api/leaderboard/', views.leaderboard, name='leaderboard'),
    
    # Enhanced room management
    path('api/rooms/', views.list_rooms, name='list_rooms'),
    path('api/rooms/create/', views.create_room, name='create_room'),
    path('api/rooms/join-by-code/', views.join_room_by_code, name='join_room_by_code'),
    path('api/rooms/<uuid:room_id>/', views.get_room, name='get_room'),
    path('api/rooms/<uuid:room_id>/join/', views.join_room, name='join_room'),
    path('api/rooms/<uuid:room_id>/leave/', views.leave_room, name='leave_room'),
    path('api/rooms/<uuid:room_id>/settings/', views.update_room_settings, name='update_room_settings'),
    path('api/rooms/<uuid:room_id>/toggle-ready/', views.toggle_ready, name='toggle_ready'),
    path('api/rooms/<uuid:room_id>/start/', views.start_game, name='start_game'),
    
    # Game flow endpoints (enhanced with authentication)
    path('api/rooms/<uuid:room_id>/current-round/', views.get_current_round, name='get_current_round'),
    path('api/rooms/<uuid:room_id>/submit-answer/', views.submit_answer, name='submit_answer'),
    path('api/rooms/<uuid:room_id>/start-voting/', views.start_voting, name='start_voting'),
    path('api/rooms/<uuid:room_id>/submit-vote/', views.submit_vote, name='submit_vote'),
    path('api/rooms/<uuid:room_id>/results/', views.get_round_results, name='get_round_results'),
    path('api/rooms/<uuid:room_id>/continue/', views.continue_to_next_round, name='continue_to_next_round'),
    path('api/rooms/<uuid:room_id>/events/', views.get_game_events, name='get_game_events'),
]