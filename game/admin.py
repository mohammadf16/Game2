# game/admin.py - Enhanced with User System

from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count, Avg
from .models import (
    Question, DecoyQuestion, GameRoom, Player, 
    GameRound, PlayerAnswer, Vote, GameEvent,
    UserProfile, GameHistory, Achievement, UserAchievement
)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = [
        'username', 'avatar_display', 'total_games', 'total_wins', 'win_rate_display',
        'total_score', 'experience_level', 'last_active'
    ]
    list_filter = ['gender', 'preferred_category', 'created_at']
    search_fields = ['user__username', 'user__email', 'user__first_name', 'user__last_name']
    readonly_fields = [
        'total_games', 'total_wins', 'total_imposter_wins', 'total_detective_wins',
        'total_score', 'win_rate', 'imposter_win_rate', 'detective_win_rate',
        'average_score_per_game', 'total_playtime_minutes', 'consecutive_wins',
        'best_win_streak', 'rank', 'created_at', 'last_active'
    ]
    
    fieldsets = (
        ('User Info', {
            'fields': ('user', 'avatar', 'gender', 'bio')
        }),
        ('Game Statistics', {
            'fields': (
                'total_games', 'total_wins', 'total_imposter_wins', 'total_detective_wins',
                'total_score', 'win_rate', 'imposter_win_rate', 'detective_win_rate',
                'average_score_per_game', 'consecutive_wins', 'best_win_streak', 'rank'
            ),
            'classes': ('collapse',)
        }),
        ('Preferences', {
            'fields': ('preferred_category', 'preferred_difficulty', 'preferred_game_size')
        }),
        ('Metadata', {
            'fields': ('created_at', 'last_active', 'last_game_played'),
            'classes': ('collapse',)
        })
    )
    
    def username(self, obj):
        return obj.user.username
    username.short_description = 'Username'
    username.admin_order_field = 'user__username'
    
    def avatar_display(self, obj):
        avatar_emoji = dict(UserProfile.AVATAR_CHOICES).get(obj.avatar, '🕵️')
        return format_html('<span style="font-size: 20px;">{}</span>', avatar_emoji)
    avatar_display.short_description = 'Avatar'
    
    def win_rate_display(self, obj):
        color = 'green' if obj.win_rate >= 50 else 'orange' if obj.win_rate >= 30 else 'red'
        return format_html(
            '<span style="color: {};">{:.1f}%</span>',
            color, obj.win_rate
        )
    win_rate_display.short_description = 'Win Rate'
    win_rate_display.admin_order_field = 'win_rate'
    
    actions = ['update_statistics']
    
    def update_statistics(self, request, queryset):
        for profile in queryset:
            profile.update_statistics()
        self.message_user(request, f'Updated statistics for {queryset.count()} profiles.')
    update_statistics.short_description = 'Update statistics for selected profiles'


@admin.register(GameHistory)
class GameHistoryAdmin(admin.ModelAdmin):
    list_display = [
        'player_username', 'room_name', 'role', 'won_display', 'points_earned',
        'voting_accuracy_display', 'played_at'
    ]
    list_filter = ['role', 'won', 'played_at', 'room__difficulty_level']
    search_fields = ['player__user__username', 'room__name']
    date_hierarchy = 'played_at'
    
    def player_username(self, obj):
        return obj.player.user.username
    player_username.short_description = 'Player'
    player_username.admin_order_field = 'player__user__username'
    
    def room_name(self, obj):
        return obj.room.name
    room_name.short_description = 'Room'
    room_name.admin_order_field = 'room__name'
    
    def won_display(self, obj):
        return format_html(
            '<span style="color: {};">{}</span>',
            'green' if obj.won else 'red',
            '✅ Won' if obj.won else '❌ Lost'
        )
    won_display.short_description = 'Result'
    won_display.admin_order_field = 'won'
    
    def voting_accuracy_display(self, obj):
        accuracy = obj.voting_accuracy
        color = 'green' if accuracy >= 70 else 'orange' if accuracy >= 50 else 'red'
        return format_html(
            '<span style="color: {};">{:.1f}%</span>',
            color, accuracy
        )
    voting_accuracy_display.short_description = 'Voting Accuracy'


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ['icon_display', 'name', 'category', 'requirement_display', 'points_reward', 'is_active']
    list_filter = ['category', 'requirement_type', 'is_active', 'is_hidden']
    search_fields = ['name', 'description']
    
    def icon_display(self, obj):
        return format_html('<span style="font-size: 20px;">{}</span>', obj.icon)
    icon_display.short_description = 'Icon'
    
    def requirement_display(self, obj):
        return f"{obj.requirement_description} ({obj.requirement_value})"
    requirement_display.short_description = 'Requirement'


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = [
        'user_username', 'achievement_name', 'progress_display', 'completion_status', 'earned_at'
    ]
    list_filter = ['is_completed', 'achievement__category', 'earned_at']
    search_fields = ['user__user__username', 'achievement__name']
    
    def user_username(self, obj):
        return obj.user.user.username
    user_username.short_description = 'User'
    user_username.admin_order_field = 'user__user__username'
    
    def achievement_name(self, obj):
        return f"{obj.achievement.icon} {obj.achievement.name}"
    achievement_name.short_description = 'Achievement'
    
    def progress_display(self, obj):
        progress = obj.progress_percentage
        bar_width = int(progress * 2)  # Scale to 200px max
        return format_html(
            '<div style="width: 200px; background-color: #f0f0f0; border-radius: 10px;">'
            '<div style="width: {}px; height: 20px; background-color: #4CAF50; border-radius: 10px; text-align: center; line-height: 20px; color: white; font-size: 12px;">'
            '{:.1f}%</div></div>',
            bar_width, progress
        )
    progress_display.short_description = 'Progress'
    
    def completion_status(self, obj):
        if obj.is_completed:
            return format_html('<span style="color: green;">✅ Completed</span>')
        else:
            return format_html('<span style="color: orange;">📊 In Progress</span>')
    completion_status.short_description = 'Status'


@admin.register(GameRoom)
class GameRoomAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'host_username', 'status_display', 'player_count_display', 'difficulty_level',
        'is_private', 'room_code', 'created_at'
    ]
    list_filter = ['status', 'difficulty_level', 'is_private', 'created_at']
    search_fields = ['name', 'host__username', 'room_code']
    readonly_fields = ['id', 'room_code', 'created_at', 'started_at', 'finished_at', 'last_activity']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'description', 'host', 'room_code')
        }),
        ('Settings', {
            'fields': (
                'is_private', 'password', 'max_players', 'min_players', 'total_rounds',
                'difficulty_level', 'category_preference', 'auto_start', 'allow_rejoining', 'spectators_allowed'
            )
        }),
        ('Timing', {
            'fields': ('discussion_time', 'voting_time', 'results_time')
        }),
        ('Game State', {
            'fields': ('status', 'current_round'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'started_at', 'finished_at', 'last_activity'),
            'classes': ('collapse',)
        })
    )
    
    def host_username(self, obj):
        return obj.host.username
    host_username.short_description = 'Host'
    host_username.admin_order_field = 'host__username'
    
    def status_display(self, obj):
        colors = {
            'waiting': 'blue',
            'in_progress': 'green',
            'finished': 'gray',
            'paused': 'orange',
            'cancelled': 'red'
        }
        return format_html(
            '<span style="color: {};">{}</span>',
            colors.get(obj.status, 'black'),
            obj.get_status_display()
        )
    status_display.short_description = 'Status'
    status_display.admin_order_field = 'status'
    
    def player_count_display(self, obj):
        current = obj.player_count
        total = obj.total_player_count
        max_players = obj.max_players
        color = 'green' if current >= obj.min_players else 'red'
        return format_html(
            '<span style="color: {};">{}/{} (max: {})</span>',
            color, current, total, max_players
        )
    player_count_display.short_description = 'Players'


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = [
        'nickname', 'user_username', 'room_name', 'score', 'connection_status',
        'is_host', 'session_voting_accuracy_display', 'joined_at'
    ]
    list_filter = ['is_connected', 'is_host', 'is_ready', 'joined_at']
    search_fields = ['nickname', 'user__username', 'room__name']
    
    def user_username(self, obj):
        return obj.user.username
    user_username.short_description = 'Username'
    user_username.admin_order_field = 'user__username'
    
    def room_name(self, obj):
        return obj.room.name
    room_name.short_description = 'Room'
    room_name.admin_order_field = 'room__name'
    
    def connection_status(self, obj):
        if obj.is_connected:
            return format_html('<span style="color: green;">🟢 Connected</span>')
        else:
            return format_html('<span style="color: red;">🔴 Disconnected</span>')
    connection_status.short_description = 'Status'
    
    def session_voting_accuracy_display(self, obj):
        accuracy = obj.session_voting_accuracy
        if accuracy == 0:
            return '-'
        color = 'green' if accuracy >= 70 else 'orange' if accuracy >= 50 else 'red'
        return format_html(
            '<span style="color: {};">{:.1f}%</span>',
            color, accuracy
        )
    session_voting_accuracy_display.short_description = 'Session Accuracy'


# Keep existing admin classes but enhance them
@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['text_preview', 'category', 'difficulty', 'answer_range', 'usage_stats', 'is_active']
    list_filter = ['category', 'difficulty', 'is_active']
    search_fields = ['text']
    list_editable = ['is_active']
    
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Question Text'
    
    def answer_range(self, obj):
        return f"{obj.min_answer} - {obj.max_answer}"
    answer_range.short_description = 'Answer Range'
    
    def usage_stats(self, obj):
        # Count how many times this question was used
        usage_count = obj.gameround_set.count()
        return f"Used {usage_count} times"
    usage_stats.short_description = 'Usage'


@admin.register(DecoyQuestion)
class DecoyQuestionAdmin(admin.ModelAdmin):
    list_display = ['text_preview', 'answer_range', 'usage_stats', 'is_active']
    list_filter = ['is_active']
    search_fields = ['text']
    list_editable = ['is_active']
    
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Question Text'
    
    def answer_range(self, obj):
        return f"{obj.min_answer} - {obj.max_answer}"
    answer_range.short_description = 'Answer Range'
    
    def usage_stats(self, obj):
        usage_count = obj.gameround_set.count()
        return f"Used {usage_count} times"
    usage_stats.short_description = 'Usage'


@admin.register(GameRound)
class GameRoundAdmin(admin.ModelAdmin):
    list_display = [
        'room_name', 'round_number', 'question_preview', 'imposter_name',
        'status', 'answer_count', 'vote_count', 'started_at'
    ]
    list_filter = ['status', 'started_at', 'question__category']
    search_fields = ['room__name', 'question__text']
    
    def room_name(self, obj):
        return obj.room.name
    room_name.short_description = 'Room'
    
    def question_preview(self, obj):
        return obj.question.text[:30] + '...' if len(obj.question.text) > 30 else obj.question.text
    question_preview.short_description = 'Question'
    
    def imposter_name(self, obj):
        return obj.imposter.nickname
    imposter_name.short_description = 'Imposter'
    
    def answer_count(self, obj):
        return obj.answers.count()
    answer_count.short_description = 'Answers'
    
    def vote_count(self, obj):
        return obj.votes.count()
    vote_count.short_description = 'Votes'


@admin.register(PlayerAnswer)
class PlayerAnswerAdmin(admin.ModelAdmin):
    list_display = ['player_name', 'room_name', 'round_number', 'answer', 'is_imposter_answer', 'submitted_at']
    list_filter = ['submitted_at', 'round__question__category']
    search_fields = ['player__nickname', 'round__room__name']
    
    def player_name(self, obj):
        return obj.player.nickname
    player_name.short_description = 'Player'
    
    def room_name(self, obj):
        return obj.round.room.name
    room_name.short_description = 'Room'
    
    def round_number(self, obj):
        return obj.round.round_number
    round_number.short_description = 'Round'
    
    def is_imposter_answer(self, obj):
        is_imposter = obj.player == obj.round.imposter
        return format_html(
            '<span style="color: {};">{}</span>',
            'red' if is_imposter else 'green',
            '🎭 Imposter' if is_imposter else '🕵️ Detective'
        )
    is_imposter_answer.short_description = 'Role'


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ['voter_name', 'accused_name', 'room_name', 'round_number', 'was_correct', 'submitted_at']
    list_filter = ['submitted_at', 'round__room__difficulty_level']
    search_fields = ['voter__nickname', 'accused__nickname', 'round__room__name']
    
    def voter_name(self, obj):
        return obj.voter.nickname
    voter_name.short_description = 'Voter'
    
    def accused_name(self, obj):
        return obj.accused.nickname
    accused_name.short_description = 'Accused'
    
    def room_name(self, obj):
        return obj.round.room.name
    room_name.short_description = 'Room'
    
    def round_number(self, obj):
        return obj.round.round_number
    round_number.short_description = 'Round'
    
    def was_correct(self, obj):
        correct = obj.accused == obj.round.imposter
        return format_html(
            '<span style="color: {};">{}</span>',
            'green' if correct else 'red',
            '✅ Correct' if correct else '❌ Incorrect'
        )
    was_correct.short_description = 'Accuracy'


@admin.register(GameEvent)
class GameEventAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'room_name', 'player_name', 'timestamp']
    list_filter = ['event_type', 'timestamp']
    search_fields = ['room__name', 'player__nickname']
    readonly_fields = ['timestamp']
    
    def room_name(self, obj):
        return obj.room.name
    room_name.short_description = 'Room'
    
    def player_name(self, obj):
        return obj.player.nickname if obj.player else '-'
    player_name.short_description = 'Player'