# game/views.py - Enhanced with User System and Authentication

from django.shortcuts import render, get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from django.db.models import Q, Count, Avg, F, Case, When
from django.db import transaction
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.pagination import PageNumberPagination
from datetime import timedelta
import random

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


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# Authentication Views
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """Register a new user with profile creation"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'token': token.key,
            'profile': UserProfileSerializer(user.profile).data
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """Authenticate user and return token"""
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        # Update last active
        user.profile.last_active = timezone.now()
        user.profile.save()
        
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'token': token.key,
            'profile': UserProfileSerializer(user.profile).data
        })
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """Logout user and delete token"""
    try:
        request.user.auth_token.delete()
        return Response({'success': True, 'message': 'Successfully logged out'})
    except:
        return Response({'success': False, 'message': 'Error during logout'}, 
                       status=status.HTTP_400_BAD_REQUEST)


# Profile Views
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
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_statistics(request):
    """Get comprehensive user statistics"""
    profile = request.user.profile
    
    # Recent games
    recent_games = GameHistory.objects.filter(player=profile).order_by('-played_at')[:10]
    
    # Achievements
    achievements = UserAchievement.objects.filter(user=profile).select_related('achievement')
    
    # Calculate additional stats
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    games_this_week = recent_games.filter(played_at__gte=week_ago).count()
    games_this_month = recent_games.filter(played_at__gte=month_ago).count()
    
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
    
    data = {
        'profile': UserProfileSerializer(profile).data,
        'recent_games': GameHistorySerializer(recent_games, many=True).data,
        'achievements': UserAchievementSerializer(achievements, many=True).data,
        'games_this_week': games_this_week,
        'games_this_month': games_this_month,
        'favorite_role': favorite_role,
        'recent_performance': recent_performance,
        'win_rate_trend': win_rate_trend,
    }
    
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_game_history(request):
    """Get paginated game history"""
    profile = request.user.profile
    history = GameHistory.objects.filter(player=profile).order_by('-played_at')
    
    paginator = StandardResultsSetPagination()
    page = paginator.paginate_queryset(history, request)
    
    if page is not None:
        serializer = GameHistorySerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = GameHistorySerializer(history, many=True)
    return Response(serializer.data)


# Leaderboard Views
@api_view(['GET'])
@permission_classes([AllowAny])
def leaderboard(request):
    """Get global leaderboard"""
    leaderboard_type = request.query_params.get('type', 'score')  # score, wins, win_rate
    
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


# Enhanced Room Management
@api_view(['GET'])
@permission_classes([AllowAny])
def list_rooms(request):
    """List all available game rooms"""
    show_private = request.query_params.get('private', 'false').lower() == 'true'
    
    if show_private:
        rooms = GameRoom.objects.filter(
            status__in=['waiting', 'in_progress']
        ).order_by('-created_at')
    else:
        rooms = GameRoom.objects.filter(
            status__in=['waiting', 'in_progress'],
            is_private=False
        ).order_by('-created_at')
    
    serializer = GameRoomSerializer(rooms, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_room(request):
    """Create a new game room"""
    serializer = GameRoomCreateSerializer(data=request.data)
    if serializer.is_valid():
        room = serializer.save(host=request.user)
        
        # Automatically add host as a player
        Player.objects.create(
            user=request.user,
            room=room,
            nickname=request.user.username,
            is_host=True,
            is_ready=True
        )
        
        # Update profile stats
        request.user.profile.games_hosted += 1
        request.user.profile.save()
        
        # Create game event
        GameEvent.objects.create(
            room=room,
            event_type='room_created',
            data={'host': request.user.username, 'room_name': room.name}
        )
        
        return Response(GameRoomSerializer(room).data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_room_by_code(request):
    """Join a room using room code"""
    serializer = JoinByCodeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    room_code = serializer.validated_data['room_code'].upper()
    nickname = serializer.validated_data['nickname']
    password = serializer.validated_data.get('password', '')
    
    try:
        room = GameRoom.objects.get(room_code=room_code)
    except GameRoom.DoesNotExist:
        return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not room.can_join():
        return Response({'error': 'Cannot join this room'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check password for private rooms
    if room.password and room.password != password:
        return Response({'error': 'Invalid room password'}, status=status.HTTP_403_FORBIDDEN)
    
    # Check if player already in room
    existing_player = Player.objects.filter(user=request.user, room=room).first()
    if existing_player:
        if existing_player.can_rejoin():
            existing_player.reconnect()
            return Response({
                'success': True,
                'message': 'Rejoined room successfully',
                'player': PlayerSerializer(existing_player).data,
                'room': GameRoomSerializer(room).data
            })
        else:
            return Response({'error': 'You are already in this room'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create player
    player = Player.objects.create(
        user=request.user,
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
    
    return Response({
        'success': True,
        'message': 'Joined room successfully',
        'player': PlayerSerializer(player).data,
        'room': GameRoomSerializer(room).data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_room(request, room_id):
    """Get room details"""
    room = get_object_or_404(GameRoom, id=room_id)
    serializer = GameRoomSerializer(room)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_room(request, room_id):
    """Join a specific game room"""
    room = get_object_or_404(GameRoom, id=room_id)
    
    if not room.can_join():
        return Response({'error': 'Room is not accepting new players'}, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = JoinRoomSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    nickname = serializer.validated_data['nickname']
    password = serializer.validated_data.get('password', '')
    
    # Check password for private rooms
    if room.password and room.password != password:
        return Response({'error': 'Invalid room password'}, status=status.HTTP_403_FORBIDDEN)
    
    # Check if player already in room
    existing_player = Player.objects.filter(user=request.user, room=room).first()
    if existing_player:
        if existing_player.can_rejoin():
            existing_player.reconnect()
            return Response({
                'success': True,
                'message': 'Rejoined room successfully',
                'player': PlayerSerializer(existing_player).data
            })
        else:
            return Response({'error': 'You are already in this room'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create player
    player = Player.objects.create(
        user=request.user,
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
    
    return Response(PlayerSerializer(player).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def leave_room(request, room_id):
    """Leave a game room"""
    room = get_object_or_404(GameRoom, id=room_id)
    
    try:
        player = Player.objects.get(user=request.user, room=room)
        
        # Create game event
        GameEvent.objects.create(
            room=room,
            event_type='player_left',
            player=player,
            data={'nickname': player.nickname}
        )
        
        # If player is host, transfer to another player or delete room
        if player.is_host and room.players.count() > 1:
            new_host = room.players.exclude(user=request.user).first()
            if new_host:
                new_host.is_host = True
                new_host.save()
                room.host = new_host.user
                room.save()
        elif player.is_host:
            # Last player leaving, delete room
            room.delete()
            return Response({'success': True, 'message': 'Left room and room deleted'})
        
        player.delete()
        return Response({'success': True, 'message': 'Left room successfully'})
        
    except Player.DoesNotExist:
        return Response({'error': 'You are not in this room'}, status=status.HTTP_404_NOT_FOUND)


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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_ready(request, room_id):
    """Toggle player ready status"""
    room = get_object_or_404(GameRoom, id=room_id)
    
    try:
        player = Player.objects.get(user=request.user, room=room)
        player.is_ready = not player.is_ready
        player.save()
        
        return Response({
            'success': True,
            'is_ready': player.is_ready,
            'message': f"You are now {'ready' if player.is_ready else 'not ready'}"
        })
        
    except Player.DoesNotExist:
        return Response({'error': 'You are not in this room'}, status=status.HTTP_404_NOT_FOUND)


# Enhanced Game Flow (keeping existing logic but adding user tracking)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_game(request, room_id):
    """Start the game (host only)"""
    room = get_object_or_404(GameRoom, id=room_id)
    
    # Check if user is the host
    if room.host != request.user:
        return Response({'error': 'Only the host can start the game'}, status=status.HTTP_403_FORBIDDEN)
    
    if not room.can_start():
        return Response({'error': 'Cannot start game. Need proper player count and ready players.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if all players are ready (optional)
    if not room.auto_start:
        unready_players = room.players.filter(is_connected=True, is_ready=False)
        if unready_players.exists():
            return Response({
                'error': 'All players must be ready to start',
                'unready_players': [p.nickname for p in unready_players]
            }, status=status.HTTP_400_BAD_REQUEST)
    
    with transaction.atomic():
        room.status = 'in_progress'
        room.started_at = timezone.now()
        room.current_round = 1
        room.save()
        
        # Start first round
        start_round(room, 1)
        
        # Create game event
        GameEvent.objects.create(
            room=room,
            event_type='game_started',
            data={'player_count': room.player_count}
        )
    
    return Response(GameRoomSerializer(room).data)


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
