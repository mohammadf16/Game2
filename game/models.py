# game/models.py - Fixed UserProfile model

from django.utils import timezone
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid
import random
import string

class Question(models.Model):
    """Questions for the Number Hunt game"""
    CATEGORY_CHOICES = [
        ('lifestyle', 'Lifestyle & Habits'),
        ('preferences', 'Preferences & Opinions'),
        ('experiences', 'Experiences'),
        ('hypothetical', 'Hypothetical'),
        ('general', 'General'),
    ]
    
    text = models.TextField(help_text="The main question text")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    min_answer = models.IntegerField(default=1, help_text="Minimum expected answer")
    max_answer = models.IntegerField(default=20, help_text="Maximum expected answer")
    difficulty = models.IntegerField(default=1, choices=[(1, 'Easy'), (2, 'Medium'), (3, 'Hard')])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.text[:50]}..."
    
    class Meta:
        ordering = ['category', 'difficulty']


class DecoyQuestion(models.Model):
    """Decoy questions for imposters"""
    text = models.TextField(help_text="The decoy question text")
    min_answer = models.IntegerField(default=1)
    max_answer = models.IntegerField(default=20)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"Decoy: {self.text[:30]}..."


class GameRoom(models.Model):
    """Game room where players gather - Enhanced version"""
    
    STATUS_CHOICES = [
        ('waiting', 'Waiting for Players'),
        ('in_progress', 'Game in Progress'),
        ('finished', 'Game Finished'),
        ('paused', 'Game Paused'),
        ('cancelled', 'Game Cancelled'),
    ]
    
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy (1-2)'),
        ('medium', 'Medium (2-3)'),
        ('hard', 'Hard (3-4)'),
        ('expert', 'Expert (4-5)'),
        ('mixed', 'Mixed Difficulty'),
    ]
    
    # Basic Info
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(max_length=500, blank=True, null=True)
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_games')
    
    # Room Settings
    is_private = models.BooleanField(default=False)
    room_code = models.CharField(max_length=6, unique=True, blank=True)
    password = models.CharField(max_length=50, blank=True, null=True)
    
    # Game Configuration
    max_players = models.IntegerField(default=8, validators=[MinValueValidator(3), MaxValueValidator(12)])
    min_players = models.IntegerField(default=3, validators=[MinValueValidator(3)])
    total_rounds = models.IntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(20)])
    difficulty_level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='mixed')
    category_preference = models.CharField(max_length=20, blank=True, null=True)
    
    # Advanced Settings
    auto_start = models.BooleanField(default=False)
    allow_rejoining = models.BooleanField(default=True)
    spectators_allowed = models.BooleanField(default=False)
    discussion_time = models.IntegerField(default=180, help_text="Discussion time in seconds")
    voting_time = models.IntegerField(default=60, help_text="Voting time in seconds")
    results_time = models.IntegerField(default=30, help_text="Results display time in seconds")
    
    # Game State
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    current_round = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.room_code:
            self.room_code = self.generate_room_code()
        super().save(*args, **kwargs)
    
    def generate_room_code(self):
        """Generate a unique 6-character room code"""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if not GameRoom.objects.filter(room_code=code).exists():
                return code
    
    def __str__(self):
        return f"Room: {self.name} ({self.status})"
    
    @property
    def player_count(self):
        return self.players.filter(is_connected=True).count()
    
    @property
    def total_player_count(self):
        return self.players.count()
    

    def can_start(self):
        """Check if the game can be started"""
        if self.status != 'waiting':
            return False
        
        connected_players = self.players.filter(is_connected=True)
        
        # Check minimum player count
        if connected_players.count() < self.min_players:
            return False
        
        # Check maximum player count
        if connected_players.count() > self.max_players:
            return False
        
        # Check if all connected players are ready
        ready_players = connected_players.filter(is_ready=True)
        if ready_players.count() != connected_players.count():
            return False
        
        # Must have at least one player
        if connected_players.count() == 0:
            return False
        
        return True
    
    def can_join(self):
        return (self.status in ['waiting'] and 
                self.total_player_count < self.max_players)
    
    def is_full(self):
        return self.total_player_count >= self.max_players
    
    def get_winners(self):
        """Get the winning players from the last completed game"""
        if self.status != 'finished':
            return []
        
        last_round = self.rounds.filter(status='finished').order_by('-round_number').first()
        if not last_round:
            return []
        
        # Determine winners based on the last round outcome
        if hasattr(last_round, 'imposter_caught') and last_round.imposter_caught:
            # Detectives won
            return [p for p in self.players.all() if p not in [last_round.imposter]]
        else:
            # Imposter won
            return [last_round.imposter]


class Player(models.Model):
    """Player in a game room - Enhanced version"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name='players')
    nickname = models.CharField(max_length=50)
    score = models.IntegerField(default=0)
    is_connected = models.BooleanField(default=True)
    is_ready = models.BooleanField(default=False)
    is_host = models.BooleanField(default=False)
    
    # Session stats
    rounds_won = models.IntegerField(default=0)
    rounds_as_imposter = models.IntegerField(default=0)
    rounds_as_detective = models.IntegerField(default=0)
    correct_votes_session = models.IntegerField(default=0)
    total_votes_session = models.IntegerField(default=0)
    
    # Connection info
    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    connection_id = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        unique_together = ['user', 'room']
        ordering = ['-score', '-joined_at']
    
    def __str__(self):
        return f"{self.nickname} in {self.room.name}"
    
    @property
    def session_voting_accuracy(self):
        """Calculate voting accuracy for current session"""
        return (self.correct_votes_session / self.total_votes_session) * 100 if self.total_votes_session > 0 else 0
    
    def disconnect(self):
        """Mark player as disconnected"""
        self.is_connected = False
        self.last_seen = timezone.now()
        self.save()
    
    def reconnect(self, connection_id=None):
        """Mark player as reconnected"""
        self.is_connected = True
        self.last_seen = timezone.now()
        if connection_id:
            self.connection_id = connection_id
        self.save()
    
    def can_rejoin(self):
        """Check if player can rejoin the room"""
        return (self.room.allow_rejoining and 
                self.room.status in ['waiting', 'in_progress', 'paused'] and
                (timezone.now() - self.last_seen).seconds < 3600)  # Within 1 hour


class GameRound(models.Model):
    """Individual round in a game"""
    STATUS_CHOICES = [
        ('setup', 'Setting Up'),
        ('answering', 'Players Answering'),
        ('discussion', 'Discussion Phase'),
        ('voting', 'Voting Phase'),
        ('results', 'Results Phase'),
        ('finished', 'Round Finished'),
    ]
    
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name='rounds')
    round_number = models.IntegerField()
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    decoy_question = models.ForeignKey(DecoyQuestion, on_delete=models.CASCADE)
    imposter = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='imposter_rounds')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='setup')
    started_at = models.DateTimeField(auto_now_add=True)
    discussion_started_at = models.DateTimeField(null=True, blank=True)
    voting_started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['room', 'round_number']
    
    def __str__(self):
        return f"Round {self.round_number} in {self.room.name}"


class PlayerAnswer(models.Model):
    """Player's answer in a round"""
    round = models.ForeignKey(GameRound, on_delete=models.CASCADE, related_name='answers')
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    answer = models.IntegerField()
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['round', 'player']
    
    def __str__(self):
        return f"{self.player.nickname}: {self.answer}"


class Vote(models.Model):
    """Player's vote for who they think is the imposter"""
    round = models.ForeignKey(GameRound, on_delete=models.CASCADE, related_name='votes')
    voter = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='votes_cast')
    accused = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='votes_received')
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['round', 'voter']
    
    def __str__(self):
        return f"{self.voter.nickname} votes {self.accused.nickname}"


class GameEvent(models.Model):
    """Events that happen during the game for logging/replay"""
    EVENT_TYPES = [
        ('player_joined', 'Player Joined'),
        ('player_left', 'Player Left'),
        ('game_started', 'Game Started'),
        ('round_started', 'Round Started'),
        ('answer_submitted', 'Answer Submitted'),
        ('discussion_started', 'Discussion Started'),
        ('voting_started', 'Voting Started'),
        ('vote_submitted', 'Vote Submitted'),
        ('round_ended', 'Round Ended'),
        ('game_ended', 'Game Ended'),
    ]
    
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    player = models.ForeignKey(Player, on_delete=models.CASCADE, null=True, blank=True)
    data = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.event_type} in {self.room.name}"


# User Profile and Statistics - FIXED VERSION
class UserProfile(models.Model):
    """Extended user profile with game statistics and preferences"""
    
    AVATAR_CHOICES = [
        ('detective_1', '🕵️ Detective Classic'),
        ('detective_2', '👨‍💼 Business Detective'),
        ('detective_3', '👩‍💼 Lady Detective'),
        ('spy_1', '🕴️ Secret Agent'),
        ('spy_2', '👤 Mysterious Figure'),
        ('ninja_1', '🥷 Ninja'),
        ('robot_1', '🤖 Android'),
        ('alien_1', '👽 Alien'),
        ('ghost_1', '👻 Ghost'),
        ('wizard_1', '🧙‍♂️ Wizard'),
        ('witch_1', '🧙‍♀️ Witch'),
        ('pirate_1', '🏴‍☠️ Pirate'),
        ('superhero_1', '🦸‍♂️ Hero'),
        ('superhero_2', '🦸‍♀️ Heroine'),
        ('vampire_1', '🧛‍♂️ Vampire'),
    ]
    
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('non_binary', 'Non-binary'),
        ('prefer_not_say', 'Prefer not to say'),
    ]
    
    EXPERIENCE_CHOICES = [
        ('Rookie', 'Rookie'),
        ('Novice', 'Novice'),
        ('Experienced', 'Experienced'),
        ('Expert', 'Expert'),
        ('Master', 'Master'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.CharField(max_length=20, choices=AVATAR_CHOICES, default='detective_1')
    gender = models.CharField(max_length=15, choices=GENDER_CHOICES, default='prefer_not_say')
    bio = models.TextField(max_length=500, blank=True, null=True)
    
    # Store experience level as a field, not property
    experience_level = models.CharField(
        max_length=20,
        choices=EXPERIENCE_CHOICES,
        default='Rookie'
    )

    # Game Statistics
    total_games = models.IntegerField(default=0)
    total_wins = models.IntegerField(default=0)
    total_imposter_wins = models.IntegerField(default=0)
    total_detective_wins = models.IntegerField(default=0)
    total_score = models.IntegerField(default=0)
    
    # Performance Metrics
    win_rate = models.FloatField(default=0.0)
    imposter_win_rate = models.FloatField(default=0.0)
    detective_win_rate = models.FloatField(default=0.0)
    average_score_per_game = models.FloatField(default=0.0)
    
    # Engagement Metrics
    total_playtime_minutes = models.IntegerField(default=0)
    games_hosted = models.IntegerField(default=0)
    consecutive_wins = models.IntegerField(default=0)
    best_win_streak = models.IntegerField(default=0)
    
    # Preferences
    preferred_category = models.CharField(max_length=20, blank=True, null=True)
    preferred_difficulty = models.FloatField(default=2.5, validators=[MinValueValidator(1.0), MaxValueValidator(5.0)])
    preferred_game_size = models.IntegerField(default=6, validators=[MinValueValidator(3), MaxValueValidator(12)])
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)
    last_game_played = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-total_score', '-win_rate']
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    def save(self, *args, **kwargs):
        # Update experience level based on total games
        if self.total_games < 5:
            self.experience_level = 'Rookie'
        elif self.total_games < 25:
            self.experience_level = 'Novice'
        elif self.total_games < 100:
            self.experience_level = 'Experienced'
        elif self.total_games < 500:
            self.experience_level = 'Expert'
        else:
            self.experience_level = 'Master'
        super().save(*args, **kwargs)
    
    def update_statistics(self):
        """Update calculated statistics based on game history"""
        history = self.game_history.all()
        
        if history.exists():
            self.total_games = history.count()
            self.total_wins = history.filter(won=True).count()
            self.total_imposter_wins = history.filter(role='imposter', won=True).count()
            self.total_detective_wins = history.filter(role='detective', won=True).count()
            self.total_score = sum(h.points_earned for h in history)
            
            # Calculate rates
            self.win_rate = (self.total_wins / self.total_games) * 100 if self.total_games > 0 else 0
            
            imposter_games = history.filter(role='imposter').count()
            detective_games = history.filter(role='detective').count()
            
            self.imposter_win_rate = (self.total_imposter_wins / imposter_games) * 100 if imposter_games > 0 else 0
            self.detective_win_rate = (self.total_detective_wins / detective_games) * 100 if detective_games > 0 else 0
            
            self.average_score_per_game = self.total_score / self.total_games if self.total_games > 0 else 0
            
            # Calculate win streaks
            self._calculate_win_streaks(history.order_by('-played_at'))
            
            self.save()
    
    def _calculate_win_streaks(self, history):
        """Calculate current and best win streaks"""
        current_streak = 0
        best_streak = 0
        temp_streak = 0
        
        for game in history:
            if game.won:
                temp_streak += 1
                best_streak = max(best_streak, temp_streak)
                if current_streak == 0:  # First win in current streak calculation
                    current_streak = temp_streak
            else:
                temp_streak = 0
                current_streak = 0  # Reset current streak on loss
        
        self.consecutive_wins = current_streak
        self.best_win_streak = best_streak
    
    @property
    def rank(self):
        """Calculate player's global rank based on total score"""
        return UserProfile.objects.filter(total_score__gt=self.total_score).count() + 1


class GameHistory(models.Model):
    """Individual game records for players"""
    
    ROLE_CHOICES = [
        ('detective', 'Detective'),
        ('imposter', 'Imposter'),
    ]
    
    player = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='game_history')
    room = models.ForeignKey('GameRoom', on_delete=models.CASCADE, related_name='player_histories')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    won = models.BooleanField(default=False)
    points_earned = models.IntegerField(default=0)
    performance_score = models.FloatField(default=0.0)  # 0-10 scale
    
    # Game context
    total_rounds = models.IntegerField(default=0)
    rounds_as_imposter = models.IntegerField(default=0)
    rounds_as_detective = models.IntegerField(default=0)
    correct_votes = models.IntegerField(default=0)
    total_votes = models.IntegerField(default=0)
    
    # Metadata
    game_duration_minutes = models.IntegerField(default=0)
    player_count = models.IntegerField(default=0)
    played_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-played_at']
        unique_together = ['player', 'room']
    
    def __str__(self):
        return f"{self.player.user.username} - {self.role} - {'Won' if self.won else 'Lost'}"
    
    @property
    def voting_accuracy(self):
        """Calculate voting accuracy percentage"""
        return (self.correct_votes / self.total_votes) * 100 if self.total_votes > 0 else 0


# Achievement System
class Achievement(models.Model):
    """Available achievements players can earn"""
    
    CATEGORY_CHOICES = [
        ('gameplay', 'Gameplay'),
        ('social', 'Social'),
        ('skill', 'Skill'),
        ('milestone', 'Milestone'),
        ('special', 'Special'),
    ]
    
    REQUIREMENT_TYPES = [
        ('count', 'Count (reach X number)'),
        ('streak', 'Streak (X in a row)'),
        ('percentage', 'Percentage (X% success rate)'),
        ('single_game', 'Single Game Achievement'),
        ('special_condition', 'Special Condition'),
    ]
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50)  # Emoji or icon class
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    
    # Requirements
    requirement_type = models.CharField(max_length=20, choices=REQUIREMENT_TYPES)
    requirement_value = models.IntegerField()
    requirement_description = models.CharField(max_length=200)
    
    # Rewards
    points_reward = models.IntegerField(default=0)
    badge_reward = models.CharField(max_length=50, blank=True, null=True)
    
    # Metadata
    is_active = models.BooleanField(default=True)
    is_hidden = models.BooleanField(default=False)  # Hidden until unlocked
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['category', 'requirement_value']
    
    def __str__(self):
        return f"{self.icon} {self.name}"


class UserAchievement(models.Model):
    """Achievements earned by users"""
    
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    progress_value = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    earned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'achievement']
        ordering = ['-earned_at', '-created_at']
    
    def __str__(self):
        status = "✅" if self.is_completed else f"📊 {self.progress_value}/{self.achievement.requirement_value}"
        return f"{self.user.user.username} - {self.achievement.name} {status}"
    
    @property
    def progress_percentage(self):
        """Calculate progress as percentage"""
        return min((self.progress_value / self.achievement.requirement_value) * 100, 100) if self.achievement.requirement_value > 0 else 0
    
    def check_completion(self):
        """Check if achievement should be marked as completed"""
        if not self.is_completed and self.progress_value >= self.achievement.requirement_value:
            self.is_completed = True
            self.earned_at = timezone.now()
            # Award points to user profile
            self.user.total_score += self.achievement.points_reward
            self.user.save()
            self.save()
            return True
        return False