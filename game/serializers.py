# game/serializers.py - Enhanced with User System

from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import (
    Question, DecoyQuestion, GameRoom, Player, 
    GameRound, PlayerAnswer, Vote, GameEvent,
    UserProfile, GameHistory, Achievement, UserAchievement
)

class UserSerializer(serializers.ModelSerializer):
    profile_avatar = serializers.CharField(source='profile.avatar', read_only=True, default='detective_1')
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'date_joined', 'profile_avatar']



class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    rank = serializers.ReadOnlyField()
    experience_level = serializers.ReadOnlyField()
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'avatar', 'gender', 'bio',
            'total_games', 'total_wins', 'total_imposter_wins', 'total_detective_wins',
            'total_score', 'win_rate', 'imposter_win_rate', 'detective_win_rate',
            'average_score_per_game', 'total_playtime_minutes', 'games_hosted',
            'consecutive_wins', 'best_win_streak', 'preferred_category',
            'preferred_difficulty', 'preferred_game_size', 'rank', 'experience_level',
            'created_at', 'last_active', 'last_game_played'
        ]
        read_only_fields = [
            'total_games', 'total_wins', 'total_imposter_wins', 'total_detective_wins',
            'total_score', 'win_rate', 'imposter_win_rate', 'detective_win_rate',
            'average_score_per_game', 'total_playtime_minutes', 'games_hosted',
            'consecutive_wins', 'best_win_streak', 'rank', 'experience_level',
            'created_at', 'last_active', 'last_game_played'
        ]


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    avatar = serializers.CharField(required=False)
    gender = serializers.CharField(required=False)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password_confirm', 'avatar', 'gender']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return data
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value
    
    def create(self, validated_data):
        # Remove profile-specific data
        avatar = validated_data.pop('avatar', 'detective_1')
        gender = validated_data.pop('gender', 'prefer_not_say')
        validated_data.pop('password_confirm')
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Create profile
        UserProfile.objects.create(
            user=user,
            avatar=avatar,
            gender=gender
        )
        
        return user


class UserLoginSerializer(serializers.Serializer):
    username_or_email = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, data):
        username_or_email = data.get('username_or_email')
        password = data.get('password')
        
        if username_or_email and password:
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
            
            if user:
                if not user.is_active:
                    raise serializers.ValidationError("User account is disabled")
                data['user'] = user
            else:
                raise serializers.ValidationError("Invalid login credentials")
        else:
            raise serializers.ValidationError("Must include username/email and password")
        
        return data


class GameHistorySerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)
    voting_accuracy = serializers.ReadOnlyField()
    
    class Meta:
        model = GameHistory
        fields = [
            'id', 'room_name', 'role', 'won', 'points_earned', 'performance_score',
            'total_rounds', 'rounds_as_imposter', 'rounds_as_detective',
            'correct_votes', 'total_votes', 'voting_accuracy',
            'game_duration_minutes', 'player_count', 'played_at'
        ]


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = [
            'id', 'name', 'description', 'icon', 'category',
            'requirement_type', 'requirement_value', 'requirement_description',
            'points_reward', 'badge_reward', 'is_hidden'
        ]


class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)
    progress_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = UserAchievement
        fields = [
            'achievement', 'progress_value', 'progress_percentage',
            'is_completed', 'earned_at'
        ]


class PlayerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    session_voting_accuracy = serializers.ReadOnlyField()
    can_rejoin = serializers.ReadOnlyField()
    
    class Meta:
        model = Player
        fields = [
            'id', 'user', 'nickname', 'score', 'is_connected', 'is_ready', 'is_host',
            'rounds_won', 'rounds_as_imposter', 'rounds_as_detective',
            'correct_votes_session', 'total_votes_session', 'session_voting_accuracy',
            'joined_at', 'last_seen', 'can_rejoin'
        ]


class GameRoomSerializer(serializers.ModelSerializer):
    host = UserSerializer(read_only=True)
    players = PlayerSerializer(many=True, read_only=True)
    player_count = serializers.ReadOnlyField()
    total_player_count = serializers.ReadOnlyField()
    can_start = serializers.ReadOnlyField()
    can_join = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()
    winners = serializers.SerializerMethodField()
    
    class Meta:
        model = GameRoom
        fields = [
            'id', 'name', 'description', 'host', 'is_private', 'room_code',
            'max_players', 'min_players', 'total_rounds', 'difficulty_level',
            'category_preference', 'auto_start', 'allow_rejoining', 'spectators_allowed',
            'discussion_time', 'voting_time', 'results_time', 'status', 'current_round',
            'created_at', 'started_at', 'finished_at', 'last_activity',
            'players', 'player_count', 'total_player_count', 'can_start', 'can_join', 'is_full', 'winners'
        ]
        read_only_fields = ['id', 'room_code', 'created_at', 'started_at', 'finished_at', 'last_activity']
    
    def get_winners(self, obj):
        winners = obj.get_winners()
        return PlayerSerializer(winners, many=True).data


class GameRoomCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = GameRoom
        fields = [
            'name', 'description', 'is_private', 'password', 'max_players', 'min_players',
            'total_rounds', 'difficulty_level', 'category_preference', 'auto_start',
            'allow_rejoining', 'spectators_allowed', 'discussion_time', 'voting_time', 'results_time'
        ]
    
    def validate_max_players(self, value):
        if value < 3 or value > 12:
            raise serializers.ValidationError("Max players must be between 3 and 12")
        return value
    
    def validate_min_players(self, value):
        if value < 3:
            raise serializers.ValidationError("Min players must be at least 3")
        return value
    
    def validate(self, data):
        if data.get('min_players', 3) > data.get('max_players', 8):
            raise serializers.ValidationError("Min players cannot be greater than max players")
        return data


class JoinRoomSerializer(serializers.Serializer):
    nickname = serializers.CharField(max_length=50)
    password = serializers.CharField(required=False, allow_blank=True)
    
    def validate_nickname(self, value):
        # Check for profanity or inappropriate content
        inappropriate_words = ['admin', 'moderator', 'bot', 'system']
        if value.lower() in inappropriate_words:
            raise serializers.ValidationError("This nickname is not allowed")
        return value


class JoinByCodeSerializer(serializers.Serializer):
    room_code = serializers.CharField(max_length=6)
    nickname = serializers.CharField(max_length=50)
    password = serializers.CharField(required=False, allow_blank=True)
    
    def validate_room_code(self, value):
        value = value.upper()
        try:
            room = GameRoom.objects.get(room_code=value)
            if not room.can_join():
                raise serializers.ValidationError("Cannot join this room")
        except GameRoom.DoesNotExist:
            raise serializers.ValidationError("Room not found")
        return value


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ['id', 'text', 'category', 'difficulty', 'min_answer', 'max_answer']


class DecoyQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecoyQuestion
        fields = ['id', 'text', 'min_answer', 'max_answer']


class PlayerAnswerSerializer(serializers.ModelSerializer):
    player = PlayerSerializer(read_only=True)
    
    class Meta:
        model = PlayerAnswer
        fields = ['id', 'player', 'answer', 'submitted_at']


class VoteSerializer(serializers.ModelSerializer):
    voter = PlayerSerializer(read_only=True)
    accused = PlayerSerializer(read_only=True)
    
    class Meta:
        model = Vote
        fields = ['id', 'voter', 'accused', 'submitted_at']


class GameRoundSerializer(serializers.ModelSerializer):
    question = QuestionSerializer(read_only=True)
    decoy_question = DecoyQuestionSerializer(read_only=True)
    imposter = PlayerSerializer(read_only=True)
    answers = PlayerAnswerSerializer(many=True, read_only=True)
    votes = VoteSerializer(many=True, read_only=True)
    
    class Meta:
        model = GameRound
        fields = [
            'id', 'round_number', 'question', 'decoy_question', 
            'imposter', 'status', 'started_at', 'discussion_started_at',
            'voting_started_at', 'finished_at', 'answers', 'votes'
        ]


class GameEventSerializer(serializers.ModelSerializer):
    player = PlayerSerializer(read_only=True)
    
    class Meta:
        model = GameEvent
        fields = ['id', 'event_type', 'player', 'data', 'timestamp']


class SubmitAnswerSerializer(serializers.Serializer):
    answer = serializers.IntegerField()
    
    def validate_answer(self, value):
        if value < 0:
            raise serializers.ValidationError("Answer must be a positive number")
        if value > 10000:
            raise serializers.ValidationError("Answer is too large")
        return value


class SubmitVoteSerializer(serializers.Serializer):
    accused_player_id = serializers.IntegerField()


class LeaderboardSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    rank = serializers.ReadOnlyField()
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'avatar', 'total_games', 'total_wins', 'total_score',
            'win_rate', 'imposter_win_rate', 'detective_win_rate',
            'best_win_streak', 'rank', 'experience_level'
        ]


class UserStatsSerializer(serializers.Serializer):
    """Comprehensive user statistics"""
    profile = UserProfileSerializer(read_only=True)
    recent_games = GameHistorySerializer(many=True, read_only=True)
    achievements = UserAchievementSerializer(many=True, read_only=True)
    
    # Calculated stats
    games_this_week = serializers.IntegerField(read_only=True)
    games_this_month = serializers.IntegerField(read_only=True)
    favorite_role = serializers.CharField(read_only=True)
    most_played_category = serializers.CharField(read_only=True)
    
    # Performance trends
    recent_performance = serializers.ListField(read_only=True)
    win_rate_trend = serializers.CharField(read_only=True)


class RoomSettingsUpdateSerializer(serializers.Serializer):
    """For updating room settings by host"""
    discussion_time = serializers.IntegerField(min_value=30, max_value=600, required=False)
    voting_time = serializers.IntegerField(min_value=15, max_value=300, required=False)
    results_time = serializers.IntegerField(min_value=10, max_value=120, required=False)
    allow_rejoining = serializers.BooleanField(required=False)
    spectators_allowed = serializers.BooleanField(required=False)
    category_preference = serializers.CharField(max_length=20, required=False, allow_blank=True)
    difficulty_level = serializers.ChoiceField(choices=GameRoom.DIFFICULTY_CHOICES, required=False)