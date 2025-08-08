# game/views.py - Enhanced with User System and Authentication

from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from django.db.models import Q, Count, Avg, F, Case, When
from django.db import transaction
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import authentication_classes, permission_classes, api_view, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.pagination import PageNumberPagination
from datetime import timedelta
import random
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from django.http import JsonResponse
import json
import logging
from django.views.decorators.http import require_http_methods

from .models import (
    Question, DecoyQuestion, GameRoom, Player, 
    GameRound, PlayerAnswer, Vote, GameEvent,
    UserProfile, GameHistory, Achievement, UserAchievement
)
from .serializers import (
    GameRoomSerializer, GameRoomCreateSerializer, PlayerSerializer,
    GameRoundSerializer, JoinRoomSerializer, SubmitAnswerSerializer,
    SubmitVoteSerializer, QuestionSerializer, GameEventSerializer,
    UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer,
    GameHistorySerializer, AchievementSerializer, UserAchievementSerializer,
    JoinByCodeSerializer, LeaderboardSerializer, UserStatsSerializer,
    RoomSettingsUpdateSerializer
)



logger = logging.getLogger(__name__)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# Enhanced Authentication Views
@csrf_exempt
def register_user(request):
    """Register a new user with profile creation - Enhanced version"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'errors': {'general': ['Method not allowed']}}, status=405)
    
    try:
        data = json.loads(request.body)
        logger.info(f"Registration attempt for username: {data.get('username')}")
        
        # Validation
        errors = {}
        
        # Required fields
        required_fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                errors[field] = [f'{field.replace("_", " ").title()} is required']
        
        if errors:
            return JsonResponse({'success': False, 'errors': errors}, status=400)
        
        # Username validation
        username = data.get('username').strip()
        if len(username) < 3:
            errors['username'] = ['Username must be at least 3 characters long']
        elif len(username) > 30:
            errors['username'] = ['Username must be less than 30 characters']
        elif User.objects.filter(username=username).exists():
            errors['username'] = ['Username already exists']
        
        # Email validation
        email = data.get('email').strip()
        if User.objects.filter(email=email).exists():
            errors['email'] = ['Email already registered']
        
        # Password validation
        password = data.get('password')
        password_confirm = data.get('password_confirm')
        if len(password) < 8:
            errors['password'] = ['Password must be at least 8 characters long']
        elif password != password_confirm:
            errors['password_confirm'] = ['Passwords do not match']
        
        if errors:
            return JsonResponse({'success': False, 'errors': errors}, status=400)
        
        # Create user
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=data.get('first_name', '').strip(),
                last_name=data.get('last_name', '').strip(),
                password=password
            )
            
            # Create profile
            profile = UserProfile.objects.create(
                user=user,
                avatar=data.get('avatar', 'detective_1'),
                gender=data.get('gender', 'prefer_not_say'),
                bio=data.get('bio', '').strip()[:500]  # Limit bio length
            )
            
            # Create token
            token, created = Token.objects.get_or_create(user=user)
            
            # Check for early adopter achievement
            user_count = User.objects.count()
            if user_count <= 100:
                try:
                    achievement = Achievement.objects.get(name='Early Adopter')
                    UserAchievement.objects.get_or_create(
                        user=profile,
                        achievement=achievement,
                        defaults={'progress_value': 1, 'is_completed': True, 'earned_at': timezone.now()}
                    )
                except Achievement.DoesNotExist:
                    pass
        
        logger.info(f"User registered successfully: {username}")
        
        return JsonResponse({
            'success': True,
            'message': 'Registration successful! Welcome to Number Hunt!',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'token': token.key,
            'profile': {
                'avatar': profile.avatar,
                'total_games': profile.total_games,
                'total_score': profile.total_score,
                'win_rate': profile.win_rate,
                'experience_level': profile.experience_level,
                'rank': profile.rank,
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'errors': {'general': ['Invalid JSON data']}}, status=400)
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return JsonResponse({'success': False, 'errors': {'general': ['Registration failed. Please try again.']}}, status=500)


@csrf_exempt
def login_user(request):
    """Authenticate user and return token - Enhanced version"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'errors': {'general': ['Method not allowed']}}, status=405)
    
    try:
        data = json.loads(request.body)
        logger.info(f"Login attempt for: {data.get('username_or_email')}")
        
        username_or_email = data.get('username_or_email', '').strip()
        password = data.get('password', '')
        
        if not username_or_email or not password:
            return JsonResponse({
                'success': False, 
                'errors': {'general': ['Username/email and password are required']}
            }, status=400)
        
        # Try to find user by username or email
        user = None
        if '@' in username_or_email:
            try:
                user_obj = User.objects.get(email=username_or_email)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass
        else:
            user = authenticate(username=username_or_email, password=password)
        
        if not user:
            logger.warning(f"Failed login attempt for: {username_or_email}")
            return JsonResponse({
                'success': False, 
                'errors': {'general': ['Invalid login credentials']}
            }, status=400)
        
        if not user.is_active:
            return JsonResponse({
                'success': False, 
                'errors': {'general': ['User account is disabled']}
            }, status=400)
        
        # Create/get token
        token, created = Token.objects.get_or_create(user=user)
        
        # Update last active and login stats
        profile = user.profile
        profile.last_active = timezone.now()
        profile.save()
        
        logger.info(f"User logged in successfully: {user.username}")
        
        return JsonResponse({
            'success': True,
            'message': 'Login successful!',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'token': token.key,
            'profile': {
                'avatar': profile.avatar,
                'total_games': profile.total_games,
                'total_score': profile.total_score,
                'win_rate': profile.win_rate,
                'experience_level': profile.experience_level,
                'rank': profile.rank,
                'last_game_played': profile.last_game_played.isoformat() if profile.last_game_played else None,
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'errors': {'general': ['Invalid JSON data']}}, status=400)
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return JsonResponse({'success': False, 'errors': {'general': ['Login failed. Please try again.']}}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """Logout user and delete token"""
    try:
        logger.info(f"User logging out: {request.user.username}")
        request.user.auth_token.delete()
        return Response({'success': True, 'message': 'Successfully logged out'})
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return Response({'success': False, 'message': 'Error during logout'}, 
                       status=status.HTTP_400_BAD_REQUEST)


# Enhanced Profile Views
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get or update user profile"""
    profile = request.user.profile
    
    if request.method == 'GET':
        return Response(UserProfileSerializer(profile).data)
    
    elif request.method == 'PUT':
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Profile updated for user: {request.user.username}")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def user_statistics(request):
    """Get comprehensive user statistics - Fixed version"""
    profile = request.user.profile
    
    # Get recent games (don't slice yet)
    recent_games_query = GameHistory.objects.filter(player=profile).order_by('-played_at')
    
    # Achievements
    achievements = UserAchievement.objects.filter(user=profile).select_related('achievement')
    
    # Calculate additional stats
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Filter before slicing
    games_this_week = recent_games_query.filter(played_at__gte=week_ago).count()
    games_this_month = recent_games_query.filter(played_at__gte=month_ago).count()
    
    # Now get recent games (slice after filtering)
    recent_games = list(recent_games_query[:10])
    
    # Favorite role and category
    history = GameHistory.objects.filter(player=profile)
    role_counts = history.values('role').annotate(count=Count('role'))
    favorite_role = max(role_counts, key=lambda x: x['count'])['role'] if role_counts else 'detective'
    
    # Recent performance trend
    recent_performance = []
    for game in recent_games[:5]:
        recent_performance.append({
            'game_date': game.played_at.strftime('%Y-%m-%d'),
            'won': game.won,
            'role': game.role,
            'points': game.points_earned
        })
    
    # Win rate trend
    recent_wins = sum(1 for game in recent_games[:10] if game.won)
    win_rate_trend = "improving" if recent_wins >= 5 else "stable"
    
    # Serialize data
    achievements_data = []
    for ach in achievements:
        achievements_data.append({
            'achievement': {
                'name': ach.achievement.name,
                'description': ach.achievement.description,
                'icon': ach.achievement.icon,
                'category': ach.achievement.category,
                'points_reward': ach.achievement.points_reward
            },
            'progress_value': ach.progress_value,
            'progress_percentage': ach.progress_percentage,
            'is_completed': ach.is_completed,
            'earned_at': ach.earned_at.isoformat() if ach.earned_at else None
        })
    
    recent_games_data = []
    for game in recent_games:
        recent_games_data.append({
            'role': game.role,
            'won': game.won,
            'points_earned': game.points_earned,
            'total_rounds': game.total_rounds,
            'correct_votes': game.correct_votes,
            'total_votes': game.total_votes,
            'voting_accuracy': game.voting_accuracy,
            'played_at': game.played_at.isoformat()
        })
    
    data = {
        'profile': {
            'user': {
                'username': profile.user.username,
                'first_name': profile.user.first_name,
                'last_name': profile.user.last_name,
                'email': profile.user.email
            },
            'avatar': profile.avatar,
            'bio': profile.bio or '',
            'total_games': profile.total_games,
            'total_wins': profile.total_wins,
            'total_imposter_wins': profile.total_imposter_wins,
            'total_detective_wins': profile.total_detective_wins,
            'total_score': profile.total_score,
            'win_rate': profile.win_rate,
            'imposter_win_rate': profile.imposter_win_rate,
            'detective_win_rate': profile.detective_win_rate,
            'best_win_streak': profile.best_win_streak,
            'consecutive_wins': profile.consecutive_wins,
            'experience_level': profile.experience_level,
            'rank': profile.rank,
            'preferred_category': profile.preferred_category
        },
        'recent_games': recent_games_data,
        'achievements': achievements_data,
        'games_this_week': games_this_week,
        'games_this_month': games_this_month,
        'favorite_role': favorite_role,
        'recent_performance': recent_performance,
        'win_rate_trend': win_rate_trend,
    }
    
    return JsonResponse(data)


# Placeholder functions
@csrf_exempt
@require_http_methods(["POST"])
def leave_room(request, room_id):
    """Leave a game room"""
    user = check_auth(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        room = get_object_or_404(GameRoom, id=room_id)
        player = Player.objects.filter(user=user, room=room).first()
        
        if not player:
            return JsonResponse({'error': 'You are not in this room'}, status=404)
        
        # Create game event
        GameEvent.objects.create(
            room=room,
            event_type='player_left',
            player=player,
            data={'nickname': player.nickname}
        )
        
        # If player is host, transfer to another player or delete room
        if player.is_host and room.players.count() > 1:
            new_host = room.players.exclude(user=user).first()
            if new_host:
                new_host.is_host = True
                new_host.save()
                room.host = new_host.user
                room.save()
        elif player.is_host:
            # Last player leaving, delete room
            room.delete()
            return JsonResponse({'success': True, 'message': 'Left room and room deleted', 'room_deleted': True})
        
        player.delete()
        logger.info(f"Player {user.username} left room {room.name}")
        
        return JsonResponse({'success': True, 'message': 'Left room successfully'})
        
    except Exception as e:
        logger.error(f"Leave room error: {str(e)}")
        return JsonResponse({'error': 'Failed to leave room'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def toggle_ready(request, room_id):
    """Toggle player ready status"""
    user = check_auth(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        room = get_object_or_404(GameRoom, id=room_id)
        player = Player.objects.filter(user=user, room=room).first()
        
        if not player:
            return JsonResponse({'error': 'You are not in this room'}, status=404)
        
        player.is_ready = not player.is_ready
        player.save()
        
        logger.info(f"Player {user.username} {'ready' if player.is_ready else 'not ready'} in room {room.name}")
        
        return JsonResponse({
            'success': True, 
            'is_ready': player.is_ready,
            'message': f"You are now {'ready' if player.is_ready else 'not ready'}"
        })
        
    except Exception as e:
        logger.error(f"Toggle ready error: {str(e)}")
        return JsonResponse({'error': 'Failed to toggle ready status'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def start_game(request, room_id):
    """Start the game"""
    user = check_auth(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    return JsonResponse({'success': True, 'message': 'Game started'})


@csrf_exempt
@require_http_methods(["GET"])
def user_game_history(request):
    """Get user game history"""
    user = check_auth(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    return JsonResponse({
        'results': [],
        'count': 0,
        'next': None,
        'previous': None
    })


@csrf_exempt
@require_http_methods(["POST"])
def join_room_by_code(request):
    """Join a room using room code"""
    user = check_auth(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        data = json.loads(request.body)
        room_code = data.get('room_code', '').upper()
        nickname = data.get('nickname', '').strip()
        password = data.get('password', '')
        
        if not room_code or not nickname:
            return JsonResponse({'error': 'Room code and nickname are required'}, status=400)
        
        try:
            room = GameRoom.objects.get(room_code=room_code)
        except GameRoom.DoesNotExist:
            return JsonResponse({'error': 'Room not found'}, status=404)
        
        if not room.can_join():
            return JsonResponse({'error': 'Cannot join this room'}, status=400)
        
        # Check password
        if room.password and room.password != password:
            return JsonResponse({'error': 'Invalid room password'}, status=403)
        
        # Check if already in room
        existing_player = Player.objects.filter(user=user, room=room).first()
        if existing_player:
            if existing_player.can_rejoin():
                existing_player.reconnect()
                return JsonResponse({
                    'success': True,
                    'message': 'Rejoined room successfully',
                    'room': {
                        'id': str(room.id),
                        'name': room.name,
                        'room_code': room.room_code
                    }
                })
            else:
                return JsonResponse({'error': 'You are already in this room'}, status=400)
        
        # Create player
        player = Player.objects.create(
            user=user,
            room=room,
            nickname=nickname
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Joined room successfully',
            'room': {
                'id': str(room.id),
                'name': room.name,
                'room_code': room.room_code,
                'player_count': room.player_count,
                'max_players': room.max_players
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        logger.error(f"Join by code error: {str(e)}")
        return JsonResponse({'error': 'Failed to join room'}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def create_room(request):
    """Create a new game room"""
    user = check_auth(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        data = json.loads(request.body)
        
        room = GameRoom.objects.create(
            name=data.get('name', 'New Room'),
            description=data.get('description', ''),
            host=user,
            is_private=data.get('is_private', False),
            password=data.get('password', ''),
            max_players=int(data.get('max_players', 8)),
            min_players=3,
            total_rounds=int(data.get('total_rounds', 5)),
            difficulty_level=data.get('difficulty_level', 'mixed'),
            category_preference=data.get('category_preference', ''),
            discussion_time=int(data.get('discussion_time', 180)),
            voting_time=int(data.get('voting_time', 60)),
            allow_rejoining=data.get('allow_rejoining', True),
            spectators_allowed=data.get('spectators_allowed', False)
        )
        
        # Add host as player
        Player.objects.create(
            user=user,
            room=room,
            nickname=user.username,
            is_host=True,
            is_ready=True
        )
        
        # Update profile stats
        user.profile.games_hosted += 1
        user.profile.save()
        
        logger.info(f"Room created by {user.username}: {room.name}")
        
        return JsonResponse({
            'id': str(room.id),
            'name': room.name,
            'room_code': room.room_code,
            'player_count': room.player_count,
            'max_players': room.max_players,
            'status': room.status
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        logger.error(f"Create room error: {str(e)}")
        return JsonResponse({'error': 'Failed to create room'}, status=500)



# Enhanced Leaderboard Views
@api_view(['GET'])
@permission_classes([AllowAny])
def leaderboard(request):
    """Get global leaderboard"""
    leaderboard_type = request.query_params.get('type', 'score')
    
    if leaderboard_type == 'score':
        profiles = UserProfile.objects.filter(total_games__gte=5).order_by('-total_score')[:100]
    elif leaderboard_type == 'wins':
        profiles = UserProfile.objects.filter(total_games__gte=5).order_by('-total_wins')[:100]
    elif leaderboard_type == 'win_rate':
        profiles = UserProfile.objects.filter(total_games__gte=10).order_by('-win_rate')[:100]
    else:
        profiles = UserProfile.objects.filter(total_games__gte=5).order_by('-total_score')[:100]
    
    serializer = LeaderboardSerializer(profiles, many=True)
    return Response({
        'type': leaderboard_type,
        'leaderboard': serializer.data
    })


# Helper function for auth checking
def check_auth(request):
    """Check if user is authenticated via token"""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header.startswith('Token '):
        token_key = auth_header[6:]
        try:
            token = Token.objects.get(key=token_key)
            return token.user
        except Token.DoesNotExist:
            return None
    return None


@csrf_exempt
@require_http_methods(["GET"])
def list_rooms(request):
    """List all available game rooms"""
    try:
        show_private = request.GET.get('private', 'false').lower() == 'true'
        
        if show_private:
            rooms = GameRoom.objects.filter(
                status__in=['waiting', 'in_progress']
            ).order_by('-created_at')
        else:
            rooms = GameRoom.objects.filter(
                status__in=['waiting', 'in_progress'],
                is_private=False
            ).order_by('-created_at')
        
        rooms_data = []
        for room in rooms:
            rooms_data.append({
                'id': str(room.id),
                'name': room.name,
                'description': room.description or '',
                'host': {
                    'username': room.host.username,
                    'avatar': room.host.profile.avatar if hasattr(room.host, 'profile') else 'detective_1'
                },
                'is_private': room.is_private,
                'room_code': room.room_code,
                'max_players': room.max_players,
                'total_rounds': room.total_rounds,
                'difficulty_level': room.difficulty_level,
                'category_preference': room.category_preference or '',
                'discussion_time': room.discussion_time,
                'voting_time': room.voting_time,
                'status': room.status,
                'player_count': room.player_count,
                'can_join': room.can_join(),
            })
        
        return JsonResponse(rooms_data, safe=False)
        
    except Exception as e:
        logger.error(f"List rooms error: {str(e)}")
        return JsonResponse({'error': 'Failed to load rooms'}, status=500)



@csrf_exempt
@require_http_methods(["GET"])
def get_room(request, room_id):
    """Get room details"""
    try:
        room = get_object_or_404(GameRoom, id=room_id)
        
        players = []
        for player in room.players.all():
            players.append({
                'id': player.id,
                'nickname': player.nickname,
                'is_host': player.is_host,
                'is_ready': player.is_ready,
                'is_connected': player.is_connected,
                'score': player.score,
                'avatar': player.user.profile.avatar if hasattr(player.user, 'profile') else 'detective_1'
            })
        
        room_data = {
            'id': str(room.id),
            'name': room.name,
            'description': room.description or '',
            'host': {
                'username': room.host.username,
                'avatar': room.host.profile.avatar if hasattr(room.host, 'profile') else 'detective_1'
            },
            'is_private': room.is_private,
            'room_code': room.room_code,
            'max_players': room.max_players,
            'min_players': room.min_players,
            'total_rounds': room.total_rounds,
            'difficulty_level': room.difficulty_level,
            'category_preference': room.category_preference or '',
            'discussion_time': room.discussion_time,
            'voting_time': room.voting_time,
            'status': room.status,
            'current_round': room.current_round,
            'player_count': room.player_count,
            'players': players,
            'created_at': room.created_at.isoformat(),
            'can_join': room.can_join(),
            'can_start': room.can_start()
        }
        
        return JsonResponse(room_data)
        
    except Exception as e:
        logger.error(f"Get room error: {str(e)}")
        return JsonResponse({'error': 'Room not found'}, status=404)


@csrf_exempt
@require_http_methods(["POST"])
def join_room(request, room_id):
    """Join a specific game room"""
    user = check_auth(request)
    if not user:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    
    try:
        room = get_object_or_404(GameRoom, id=room_id)
        
        if not room.can_join():
            return JsonResponse({'error': 'Room is not accepting new players'}, status=400)
        
        data = json.loads(request.body)
        nickname = data.get('nickname', '').strip()
        password = data.get('password', '')
        
        if not nickname:
            return JsonResponse({'error': 'Nickname is required'}, status=400)
        
        # Check password for private rooms - FIX
        if room.password and len(room.password.strip()) > 0 and room.password != password:
            return JsonResponse({'error': 'Invalid room password'}, status=403)
        
        # Check if player already in room
        existing_player = Player.objects.filter(user=user, room=room).first()
        if existing_player:
            if existing_player.can_rejoin():
                existing_player.reconnect()
                return JsonResponse({
                    'success': True,
                    'message': 'Rejoined room successfully',
                    'room': {
                        'id': str(room.id),
                        'name': room.name,
                        'room_code': room.room_code,
                        'player_count': room.player_count,
                        'max_players': room.max_players,
                        'status': room.status,
                        'host': room.host.username,
                        'description': room.description or '',
                        'difficulty_level': room.difficulty_level,
                        'total_rounds': room.total_rounds,
                        'discussion_time': room.discussion_time,
                        'voting_time': room.voting_time,
                        'players': [
                            {
                                'id': p.id,
                                'nickname': p.nickname,
                                'is_host': p.is_host,
                                'is_ready': p.is_ready,
                                'is_connected': p.is_connected,
                                'score': p.score,
                                'avatar': p.user.profile.avatar if hasattr(p.user, 'profile') else 'detective_1'
                            } for p in room.players.all()
                        ]
                    }
                })
            else:
                return JsonResponse({'error': 'You are already in this room'}, status=400)
        
        # Create player
        player = Player.objects.create(
            user=user,
            room=room,
            nickname=nickname
        )
        
        # Create game event
        GameEvent.objects.create(
            room=room,
            event_type='player_joined',
            player=player,
            data={'nickname': nickname}
        )
        
        logger.info(f"Player {user.username} joined room {room.name}")
        
        return JsonResponse({
            'success': True,
            'message': 'Joined room successfully',
            'room': {
                'id': str(room.id),
                'name': room.name,
                'room_code': room.room_code,
                'player_count': room.player_count + 1,  # Include new player
                'max_players': room.max_players,
                'status': room.status,
                'host': room.host.username,
                'description': room.description or '',
                'difficulty_level': room.difficulty_level,
                'total_rounds': room.total_rounds,
                'discussion_time': room.discussion_time,
                'voting_time': room.voting_time,
                'players': [
                    {
                        'id': p.id,
                        'nickname': p.nickname,
                        'is_host': p.is_host,
                        'is_ready': p.is_ready,
                        'is_connected': p.is_connected,
                        'score': p.score,
                        'avatar': p.user.profile.avatar if hasattr(p.user, 'profile') else 'detective_1'
                    } for p in room.players.all()
                ]
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON data'}, status=400)
    except Exception as e:
        logger.error(f"Join room error: {str(e)}")
        return JsonResponse({'error': f'Failed to join room: {str(e)}'}, status=500)



@csrf_exempt
@require_http_methods(["GET"])
def get_room(request, room_id):
    """Get room details"""
    try:
        room = get_object_or_404(GameRoom, id=room_id)
        
        players = []
        for player in room.players.all():
            players.append({
                'id': player.id,
                'nickname': player.nickname,
                'is_host': player.is_host,
                'is_ready': player.is_ready,
                'is_connected': player.is_connected,
                'score': player.score,
                'avatar': player.user.profile.avatar if hasattr(player.user, 'profile') else 'detective_1'
            })
        
        room_data = {
            'id': str(room.id),
            'name': room.name,
            'description': room.description or '',
            'host': {
                'username': room.host.username,
                'avatar': room.host.profile.avatar if hasattr(room.host, 'profile') else 'detective_1'
            },
            'is_private': room.is_private,
            'room_code': room.room_code,
            'max_players': room.max_players,
            'min_players': room.min_players,
            'total_rounds': room.total_rounds,
            'difficulty_level': room.difficulty_level,
            'category_preference': room.category_preference or '',
            'discussion_time': room.discussion_time,
            'voting_time': room.voting_time,
            'status': room.status,
            'current_round': room.current_round,
            'player_count': room.player_count,
            'players': players,
            'created_at': room.created_at.isoformat(),
            'can_join': room.can_join(),
            'can_start': room.can_start()
        }
        
        return JsonResponse(room_data)
        
    except Exception as e:
        logger.error(f"Get room error: {str(e)}")
        return JsonResponse({'error': 'Room not found'}, status=404)




@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_room_settings(request, room_id):
    """Update room settings (host only)"""
    room = get_object_or_404(GameRoom, id=room_id)
    
    # Check if user is the host
    if room.host != request.user:
        return Response({'error': 'Only the host can update room settings'}, status=status.HTTP_403_FORBIDDEN)
    
    if room.status != 'waiting':
        return Response({'error': 'Cannot update settings once game has started'}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = RoomSettingsUpdateSerializer(data=request.data)
    if serializer.is_valid():
        for field, value in serializer.validated_data.items():
            setattr(room, field, value)
        room.save()
        
        # Create game event
        GameEvent.objects.create(
            room=room,
            event_type='settings_updated',
            data={'updated_fields': list(serializer.validated_data.keys())}
        )
        
        return Response(GameRoomSerializer(room).data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





def start_round(room, round_number):
    """Start a new round (enhanced with user preferences)"""
    # Get questions based on room preferences
    question_filter = {'is_active': True}
    if room.category_preference:
        question_filter['category'] = room.category_preference
    
    if room.difficulty_level != 'mixed':
        difficulty_map = {
            'easy': 1.5,
            'medium': 2.5,
            'hard': 3.5,
            'expert': 4.5
        }
        target_difficulty = difficulty_map.get(room.difficulty_level, 2.5)
        # Find questions within 0.5 of target difficulty
        question_filter['difficulty__gte'] = target_difficulty - 0.5
        question_filter['difficulty__lte'] = target_difficulty + 0.5
    
    question = Question.objects.filter(**question_filter).order_by('?').first()
    decoy_question = DecoyQuestion.objects.filter(is_active=True).order_by('?').first()
    
    if not question or not decoy_question:
        raise ValueError("No questions available")
    
    # Select random imposter
    connected_players = list(room.players.filter(is_connected=True))
    imposter = random.choice(connected_players)
    
    # Create round
    game_round = GameRound.objects.create(
        room=room,
        round_number=round_number,
        question=question,
        decoy_question=decoy_question,
        imposter=imposter,
        status='answering'
    )
    
    # Create game event
    GameEvent.objects.create(
        room=room,
        event_type='round_started',
        data={
            'round_number': round_number,
            'question_id': question.id,
            'question_category': question.category,
            'imposter_id': imposter.id
        }
    )
    
    return game_round


# Keep existing game flow methods (get_current_round, submit_answer, etc.)
# but enhance them with proper user authentication and statistics tracking

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_round(request, room_id):
    """Get current round information"""
    room = get_object_or_404(GameRoom, id=room_id)
    
    if room.current_round == 0:
        return Response({'error': 'Game has not started'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify user is in the room
    try:
        player = Player.objects.get(user=request.user, room=room)
    except Player.DoesNotExist:
        return Response({'error': 'You are not in this room'}, status=status.HTTP_403_FORBIDDEN)
    
    game_round = get_object_or_404(GameRound, room=room, round_number=room.current_round)
    
    # Determine if player is imposter and get appropriate question
    is_imposter = (player == game_round.imposter)
    player_question = game_round.decoy_question if is_imposter else game_round.question
    
    data = GameRoundSerializer(game_round).data
    data['is_imposter'] = is_imposter
    data['player_question'] = QuestionSerializer(player_question).data if player_question else None
    data['player_info'] = PlayerSerializer(player).data
    
    return Response(data)





@api_view(['GET'])
@permission_classes([AllowAny])
def get_current_round(request, room_id):
    """Get current round information"""
    room = get_object_or_404(GameRoom, id=room_id)
    
    if room.current_round == 0:
        return Response({'error': 'Game has not started'}, status=status.HTTP_400_BAD_REQUEST)
    
    game_round = get_object_or_404(GameRound, room=room, round_number=room.current_round)
    
    # Get player info to determine if they're the imposter
    username = request.query_params.get('username')
    is_imposter = False
    player_question = None
    
    if username:
        try:
            user = User.objects.get(username=username)
            player = Player.objects.get(user=user, room=room)
            is_imposter = (player == game_round.imposter)
            player_question = game_round.decoy_question if is_imposter else game_round.question
        except (User.DoesNotExist, Player.DoesNotExist):
            pass
    
    data = GameRoundSerializer(game_round).data
    data['is_imposter'] = is_imposter
    data['player_question'] = QuestionSerializer(player_question).data if player_question else None
    
    return Response(data)


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_answer(request, room_id):
    """Submit answer for current round"""
    room = get_object_or_404(GameRoom, id=room_id)
    game_round = get_object_or_404(GameRound, room=room, round_number=room.current_round)
    
    if game_round.status != 'answering':
        return Response({'error': 'Not in answering phase'}, status=status.HTTP_400_BAD_REQUEST)
    
    username = request.data.get('username')
    if not username:
        return Response({'error': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(username=username)
        player = Player.objects.get(user=user, room=room)
    except (User.DoesNotExist, Player.DoesNotExist):
        return Response({'error': 'Player not found'}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = SubmitAnswerSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Create or update answer
    answer, created = PlayerAnswer.objects.update_or_create(
        round=game_round,
        player=player,
        defaults={'answer': serializer.validated_data['answer']}
    )
    
    # Mark player as having submitted answer
    player.has_submitted_answer = True
    player.save()
    
    # Create game event
    GameEvent.objects.create(
        room=room,
        event_type='answer_submitted',
        player=player,
        data={'answer': answer.answer}
    )
    
    # Check if all players have answered
    total_players = room.players.filter(is_connected=True).count()
    answered_players = game_round.answers.count()
    
    if answered_players >= total_players:
        # Move to discussion phase
        game_round.status = 'discussion'
        game_round.discussion_started_at = timezone.now()
        game_round.save()
        
        GameEvent.objects.create(
            room=room,
            event_type='discussion_started',
            data={
                'total_answers': answered_players,
                'question_text': game_round.question.text,
                'decoy_question_text': game_round.decoy_question.text
            }
        )
    
    return Response({'success': True, 'answer_id': answer.id})


@api_view(['POST'])
@permission_classes([AllowAny])
def start_voting(request, room_id):
    """Start voting phase"""
    room = get_object_or_404(GameRoom, id=room_id)
    game_round = get_object_or_404(GameRound, room=room, round_number=room.current_round)
    
    if game_round.status != 'discussion':
        return Response({'error': 'Not in discussion phase'}, status=status.HTTP_400_BAD_REQUEST)
    
    game_round.status = 'voting'
    game_round.voting_started_at = timezone.now()
    game_round.save()
    
    GameEvent.objects.create(
        room=room,
        event_type='voting_started',
        data={}
    )
    
    return Response({'success': True})


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_vote(request, room_id):
    """Submit vote for who is the imposter"""
    try:
        room = get_object_or_404(GameRoom, id=room_id)
        game_round = get_object_or_404(GameRound, room=room, round_number=room.current_round)
        
        if game_round.status != 'voting':
            return Response({'error': 'Not in voting phase'}, status=status.HTTP_400_BAD_REQUEST)
        
        username = request.data.get('username')
        if not username:
            return Response({'error': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(username=username)
            voter = Player.objects.get(user=user, room=room)
        except (User.DoesNotExist, Player.DoesNotExist):
            return Response({'error': 'Player not found'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = SubmitVoteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            accused = Player.objects.get(id=serializer.validated_data['accused_player_id'], room=room)
        except Player.DoesNotExist:
            return Response({'error': 'Accused player not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if voter == accused:
            return Response({'error': 'Cannot vote for yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update vote
        vote, created = Vote.objects.update_or_create(
            round=game_round,
            voter=voter,
            defaults={'accused': accused}
        )
        
        # Mark player as having voted
        voter.has_voted = True
        voter.save()
        
        # Create game event
        GameEvent.objects.create(
            room=room,
            event_type='vote_submitted',
            player=voter,
            data={'accused_id': accused.id}
        )
        
        # Check if all players have voted
        total_players = room.players.filter(is_connected=True).count()
        voted_players = game_round.votes.count()
        
        if voted_players >= total_players:
            # Calculate results and end round
            results = end_round(game_round)
            return Response({
                'success': True, 
                'vote_id': vote.id,
                'voting_complete': True,
                'results': results
            })
        
        return Response({'success': True, 'vote_id': vote.id, 'voting_complete': False})
    except Exception as e:
        # Ensure we always return JSON even in case of unexpected errors
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def end_round(game_round):
    """End the current round and calculate results"""
    room = game_round.room
    
    # Calculate vote results
    vote_counts = {}
    voter_choices = {}  # Track who voted for whom
    
    for vote in game_round.votes.all():
        accused_id = vote.accused.id
        vote_counts[accused_id] = vote_counts.get(accused_id, 0) + 1
        voter_choices[vote.voter.id] = {
            'voter_nickname': vote.voter.nickname,
            'accused_id': accused_id,
            'accused_nickname': vote.accused.nickname
        }
    
    # Find player with most votes
    most_voted_player = None
    imposter_caught = False
    
    if vote_counts:
        most_voted_id = max(vote_counts.keys(), key=lambda k: vote_counts[k])
        most_voted_player = Player.objects.get(id=most_voted_id)
        imposter_caught = (most_voted_player == game_round.imposter)
        
        # Advanced scoring system
        for player in room.players.filter(is_connected=True):
            if player == game_round.imposter:
                # Imposter scoring
                if not imposter_caught:
                    player.score += 3  # Bonus for successful deception
                # No penalty for being caught
            else:
                # Detective scoring
                player_vote = game_round.votes.filter(voter=player).first()
                if player_vote:
                    if imposter_caught and player_vote.accused == game_round.imposter:
                        # Correctly voted for imposter
                        player.score += 2
                    elif not imposter_caught and player_vote.accused != game_round.imposter:
                        # Correctly didn't vote for imposter (but imposter won)
                        player.score += 1
                    # No points for incorrect votes
            player.save()
    
    # Update round status
    game_round.status = 'results'
    game_round.finished_at = timezone.now()
    game_round.save()
    
    # Create detailed game event with results
    GameEvent.objects.create(
        room=room,
        event_type='round_ended',
        data={
            'round_number': game_round.round_number,
            'imposter_id': game_round.imposter.id,
            'imposter_nickname': game_round.imposter.nickname,
            'imposter_caught': imposter_caught,
            'most_voted_player_id': most_voted_player.id if most_voted_player else None,
            'most_voted_player_nickname': most_voted_player.nickname if most_voted_player else None,
            'vote_counts': vote_counts,
            'voter_choices': voter_choices,
            'total_votes': len(voter_choices)
        }
    )
    
    # Wait 10 seconds in results phase, then continue
    # This will be handled by frontend polling
    
    return {
        'imposter_caught': imposter_caught,
        'imposter': game_round.imposter,
        'most_voted_player': most_voted_player,
        'vote_counts': vote_counts,
        'voter_choices': voter_choices
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def continue_to_next_round(request, room_id):
    """Continue from results to next round or end game"""
    room = get_object_or_404(GameRoom, id=room_id)
    
    # Ensure we're in the results phase before continuing
    if room.status != 'in_progress':
        return Response({'error': 'Game is not in progress'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get the current round to make sure it's in results phase
    try:
        current_round = GameRound.objects.get(room=room, round_number=room.current_round)
        if current_round.status != 'results':
            return Response({'error': 'Current round is not in results phase'}, status=status.HTTP_400_BAD_REQUEST)
    except GameRound.DoesNotExist:
        return Response({'error': 'Current round not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if room.current_round >= room.total_rounds:
        # End game
        room.status = 'finished'
        room.finished_at = timezone.now()
        room.save()
        
        GameEvent.objects.create(
            room=room,
            event_type='game_ended',
            data={'final_scores': {p.nickname: p.score for p in room.players.all()}}
        )
        
        return Response({'game_ended': True, 'final_scores': {p.nickname: p.score for p in room.players.all()}})
    else:
        # Start next round
        room.current_round += 1
        room.save()

        # Reset player states for the new round
        for player in room.players.all():
            player.has_submitted_answer = False
            player.has_voted = False
            player.save()

        start_round(room, room.current_round)
        
        return Response({'next_round': room.current_round})


@api_view(['GET'])
@permission_classes([AllowAny])
def get_round_results(request, room_id):
    """Get detailed results for the current round"""
    room = get_object_or_404(GameRoom, id=room_id)
    game_round = get_object_or_404(GameRound, room=room, round_number=room.current_round)
    
    if game_round.status != 'results':
        return Response({'error': 'Round is not in results phase'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get the round end event for detailed results
    round_end_event = GameEvent.objects.filter(
        room=room,
        event_type='round_ended',
        data__round_number=room.current_round
    ).first()
    
    if not round_end_event:
        return Response({'error': 'Results not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get answers with player names
    answers_with_players = []
    for answer in game_round.answers.all():
        answers_with_players.append({
            'player_id': answer.player.id,
            'player_nickname': answer.player.nickname,
            'answer': answer.answer,
            'is_imposter': answer.player == game_round.imposter
        })
    
    return Response({
        'round_number': game_round.round_number,
        'question_text': game_round.question.text,
        'decoy_question_text': game_round.decoy_question.text,
        'answers_with_players': sorted(answers_with_players, key=lambda x: x['answer']),
        'results': round_end_event.data,
        'current_scores': {p.nickname: p.score for p in room.players.all()}
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_game_events(request, room_id):
    """Get recent game events"""
    room = get_object_or_404(GameRoom, id=room_id)
    events = room.events.all()[:20]  # Last 20 events
    serializer = GameEventSerializer(events, many=True)
    return Response(serializer.data)
