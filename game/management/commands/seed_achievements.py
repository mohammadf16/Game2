# game/management/commands/seed_achievements.py

from django.core.management.base import BaseCommand
from game.models import Achievement


class Command(BaseCommand):
    help = 'Seed the database with achievements for Phase 1'

    def handle(self, *args, **options):
        self.stdout.write('Seeding achievements...')
        
        # Clear existing achievements
        Achievement.objects.all().delete()
        
        achievements_data = [
            # Gameplay Achievements
            {
                'name': 'First Steps',
                'description': 'Play your first game of Number Hunt',
                'icon': '👶',
                'category': 'milestone',
                'requirement_type': 'count',
                'requirement_value': 1,
                'requirement_description': 'Play 1 game',
                'points_reward': 10,
            },
            {
                'name': 'Getting Started',
                'description': 'Play 5 games',
                'icon': '🎮',
                'category': 'milestone',
                'requirement_type': 'count',
                'requirement_value': 5,
                'requirement_description': 'Play 5 games',
                'points_reward': 25,
            },
            {
                'name': 'Regular Player',
                'description': 'Play 25 games',
                'icon': '🎯',
                'category': 'milestone',
                'requirement_type': 'count',
                'requirement_value': 25,
                'requirement_description': 'Play 25 games',
                'points_reward': 50,
            },
            {
                'name': 'Dedicated Gamer',
                'description': 'Play 100 games',
                'icon': '🏆',
                'category': 'milestone',
                'requirement_type': 'count',
                'requirement_value': 100,
                'requirement_description': 'Play 100 games',
                'points_reward': 100,
            },
            {
                'name': 'Number Hunt Master',
                'description': 'Play 500 games',
                'icon': '👑',
                'category': 'milestone',
                'requirement_type': 'count',
                'requirement_value': 500,
                'requirement_description': 'Play 500 games',
                'points_reward': 250,
            },
            
            # Skill Achievements - Detective
            {
                'name': 'Sharp Eye',
                'description': 'Achieve 70% voting accuracy over 10 games',
                'icon': '🕵️',
                'category': 'skill',
                'requirement_type': 'percentage',
                'requirement_value': 70,
                'requirement_description': '70% voting accuracy (min 10 games)',
                'points_reward': 40,
            },
            {
                'name': 'Sherlock Holmes',
                'description': 'Achieve 85% voting accuracy over 25 games',
                'icon': '🔍',
                'category': 'skill',
                'requirement_type': 'percentage',
                'requirement_value': 85,
                'requirement_description': '85% voting accuracy (min 25 games)',
                'points_reward': 75,
            },
            {
                'name': 'Perfect Detective',
                'description': 'Get all votes correct in a single game with 5+ rounds',
                'icon': '🎯',
                'category': 'skill',
                'requirement_type': 'single_game',
                'requirement_value': 1,
                'requirement_description': 'Perfect voting in one game (5+ rounds)',
                'points_reward': 60,
            },
            
            # Skill Achievements - Imposter
            {
                'name': 'Sneaky',
                'description': 'Win as imposter 5 times',
                'icon': '😈',
                'category': 'skill',
                'requirement_type': 'count',
                'requirement_value': 5,
                'requirement_description': 'Win 5 times as imposter',
                'points_reward': 30,
            },
            {
                'name': 'Master of Deception',
                'description': 'Win as imposter 25 times',
                'icon': '🎭',
                'category': 'skill',
                'requirement_type': 'count',
                'requirement_value': 25,
                'requirement_description': 'Win 25 times as imposter',
                'points_reward': 80,
            },
            {
                'name': 'Ghost',
                'description': 'Win 5 games as imposter in a row',
                'icon': '👻',
                'category': 'skill',
                'requirement_type': 'streak',
                'requirement_value': 5,
                'requirement_description': 'Win 5 imposter games in a row',
                'points_reward': 100,
            },
            {
                'name': 'Invisible',
                'description': 'Win 10 games as imposter in a row',
                'icon': '🫥',
                'category': 'skill',
                'requirement_type': 'streak',
                'requirement_value': 10,
                'requirement_description': 'Win 10 imposter games in a row',
                'points_reward': 200,
            },
            
            # Win Streak Achievements
            {
                'name': 'On a Roll',
                'description': 'Win 3 games in a row',
                'icon': '🔥',
                'category': 'skill',
                'requirement_type': 'streak',
                'requirement_value': 3,
                'requirement_description': 'Win 3 games in a row',
                'points_reward': 35,
            },
            {
                'name': 'Hot Streak',
                'description': 'Win 5 games in a row',
                'icon': '⚡',
                'category': 'skill',
                'requirement_type': 'streak',
                'requirement_value': 5,
                'requirement_description': 'Win 5 games in a row',
                'points_reward': 65,
            },
            {
                'name': 'Unstoppable',
                'description': 'Win 10 games in a row',
                'icon': '🌟',
                'category': 'skill',
                'requirement_type': 'streak',
                'requirement_value': 10,
                'requirement_description': 'Win 10 games in a row',
                'points_reward': 150,
            },
            
            # Social Achievements
            {
                'name': 'Host with the Most',
                'description': 'Host 10 games',
                'icon': '🏠',
                'category': 'social',
                'requirement_type': 'count',
                'requirement_value': 10,
                'requirement_description': 'Host 10 games',
                'points_reward': 40,
            },
            {
                'name': 'Party Organizer',
                'description': 'Host 50 games',
                'icon': '🎉',
                'category': 'social',
                'requirement_type': 'count',
                'requirement_value': 50,
                'requirement_description': 'Host 50 games',
                'points_reward': 100,
            },
            {
                'name': 'Social Butterfly',
                'description': 'Play with 25 different players',
                'icon': '🦋',
                'category': 'social',
                'requirement_type': 'special_condition',
                'requirement_value': 25,
                'requirement_description': 'Play with 25 different players',
                'points_reward': 50,
            },
            
            # Score Achievements
            {
                'name': 'High Scorer',
                'description': 'Reach 1000 total points',
                'icon': '💯',
                'category': 'milestone',
                'requirement_type': 'count',
                'requirement_value': 1000,
                'requirement_description': 'Reach 1000 total points',
                'points_reward': 50,
            },
            {
                'name': 'Point Master',
                'description': 'Reach 5000 total points',
                'icon': '💎',
                'category': 'milestone',
                'requirement_type': 'count',
                'requirement_value': 5000,
                'requirement_description': 'Reach 5000 total points',
                'points_reward': 150,
            },
            {
                'name': 'Legend',
                'description': 'Reach 10000 total points',
                'icon': '🌟',
                'category': 'milestone',
                'requirement_type': 'count',
                'requirement_value': 10000,
                'requirement_description': 'Reach 10000 total points',
                'points_reward': 300,
            },
            
            # Special Achievements
            {
                'name': 'Early Adopter',
                'description': 'One of the first 100 players to register',
                'icon': '🚀',
                'category': 'special',
                'requirement_type': 'special_condition',
                'requirement_value': 100,
                'requirement_description': 'Register within first 100 users',
                'points_reward': 75,
                'is_hidden': True,
            },
            {
                'name': 'Night Owl',
                'description': 'Play 10 games between midnight and 6 AM',
                'icon': '🦉',
                'category': 'special',
                'requirement_type': 'special_condition',
                'requirement_value': 10,
                'requirement_description': 'Play 10 games between midnight-6AM',
                'points_reward': 30,
            },
            {
                'name': 'Marathon Player',
                'description': 'Play for 3+ hours in a single session',
                'icon': '⏰',
                'category': 'special',
                'requirement_type': 'special_condition',
                'requirement_value': 1,
                'requirement_description': 'Play 3+ hours in one session',
                'points_reward': 40,
            },
            {
                'name': 'Lucky Number',
                'description': 'Answer with the number 7 and be correct 7 times',
                'icon': '🍀',
                'category': 'special',
                'requirement_type': 'special_condition',
                'requirement_value': 7,
                'requirement_description': 'Answer 7 correctly seven times',
                'points_reward': 77,
                'is_hidden': True,
            },
        ]
        
        # Create achievements
        for achievement_data in achievements_data:
            Achievement.objects.create(**achievement_data)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {len(achievements_data)} achievements'
            )
        )


# game/management/commands/update_user_statistics.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from game.models import UserProfile


class Command(BaseCommand):
    help = 'Update user statistics for all profiles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            nargs='+',
            type=str,
            help='Specific usernames to update (optional)',
        )

    def handle(self, *args, **options):
        if options['users']:
            profiles = UserProfile.objects.filter(user__username__in=options['users'])
            self.stdout.write(f'Updating statistics for {len(options["users"])} specified users...')
        else:
            profiles = UserProfile.objects.all()
            self.stdout.write('Updating statistics for all users...')
        
        updated_count = 0
        for profile in profiles:
            try:
                profile.update_statistics()
                updated_count += 1
                if updated_count % 100 == 0:
                    self.stdout.write(f'Updated {updated_count} profiles...')
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error updating {profile.user.username}: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated statistics for {updated_count} users')
        )


# game/management/commands/cleanup_old_rooms.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from game.models import GameRoom


class Command(BaseCommand):
    help = 'Clean up old finished and inactive game rooms'

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Delete finished rooms older than X hours (default: 24)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        hours = options['hours']
        dry_run = options['dry_run']
        
        cutoff_time = timezone.now() - timedelta(hours=hours)
        
        # Find finished rooms older than cutoff
        finished_rooms = GameRoom.objects.filter(
            status='finished',
            finished_at__lt=cutoff_time
        )
        
        # Find inactive waiting rooms (no activity for 2+ hours)
        inactive_cutoff = timezone.now() - timedelta(hours=2)
        inactive_rooms = GameRoom.objects.filter(
            status='waiting',
            last_activity__lt=inactive_cutoff
        )
        
        rooms_to_delete = finished_rooms | inactive_rooms
        
        if dry_run:
            self.stdout.write(f'DRY RUN - Would delete {rooms_to_delete.count()} rooms:')
            for room in rooms_to_delete:
                self.stdout.write(f'  - {room.name} ({room.status}) - {room.last_activity}')
        else:
            count = rooms_to_delete.count()
            rooms_to_delete.delete()
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {count} old rooms')
            )


# game/management/commands/create_sample_data.py

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from game.models import UserProfile, GameRoom, Player
from faker import Faker
import random


class Command(BaseCommand):
    help = 'Create sample data for development and testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=10,
            help='Number of sample users to create',
        )
        parser.add_argument(
            '--rooms',
            type=int,
            default=5,
            help='Number of sample rooms to create',
        )

    def handle(self, *args, **options):
        fake = Faker()
        
        # Create sample users
        self.stdout.write('Creating sample users...')
        users_created = 0
        
        for i in range(options['users']):
            username = fake.user_name()
            # Ensure unique username
            counter = 1
            original_username = username
            while User.objects.filter(username=username).exists():
                username = f"{original_username}{counter}"
                counter += 1
            
            try:
                user = User.objects.create_user(
                    username=username,
                    email=fake.email(),
                    first_name=fake.first_name(),
                    last_name=fake.last_name(),
                    password='password123'
                )
                
                # Create profile with random data
                profile = UserProfile.objects.create(
                    user=user,
                    avatar=random.choice([choice[0] for choice in UserProfile.AVATAR_CHOICES]),
                    gender=random.choice([choice[0] for choice in UserProfile.GENDER_CHOICES]),
                    bio=fake.text(max_nb_chars=200) if random.random() > 0.5 else '',
                    preferred_category=random.choice(['lifestyle', 'preferences', 'experiences', 'hypothetical', 'general']),
                    preferred_difficulty=round(random.uniform(1.5, 4.5), 1),
                    preferred_game_size=random.randint(4, 8)
                )
                
                # Add some random statistics
                profile.total_games = random.randint(5, 100)
                profile.total_wins = random.randint(0, profile.total_games)
                profile.total_score = random.randint(100, 2000)
                profile.games_hosted = random.randint(0, 20)
                profile.update_statistics()
                
                users_created += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating user {username}: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Created {users_created} sample users')
        )
        
        # Create sample rooms
        self.stdout.write('Creating sample rooms...')
        users = list(User.objects.all())
        rooms_created = 0
        
        for i in range(options['rooms']):
            try:
                host = random.choice(users)
                room = GameRoom.objects.create(
                    name=fake.catch_phrase(),
                    description=fake.text(max_nb_chars=300) if random.random() > 0.6 else '',
                    host=host,
                    is_private=random.random() > 0.7,
                    max_players=random.choice([4, 6, 8, 10]),
                    total_rounds=random.choice([3, 5, 7]),
                    difficulty_level=random.choice(['easy', 'medium', 'hard', 'mixed']),
                    category_preference=random.choice([None, 'lifestyle', 'preferences', 'experiences']),
                )
                
                # Add host as player
                Player.objects.create(
                    user=host,
                    room=room,
                    nickname=host.username,
                    is_host=True,
                    is_ready=True
                )
                
                # Add random additional players
                num_additional_players = random.randint(0, min(4, room.max_players - 1))
                available_users = [u for u in users if u != host]
                additional_players = random.sample(available_users, num_additional_players)
                
                for player_user in additional_players:
                    Player.objects.create(
                        user=player_user,
                        room=room,
                        nickname=player_user.username,
                        is_ready=random.random() > 0.3
                    )
                
                rooms_created += 1
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error creating room: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Created {rooms_created} sample rooms')
        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Sample data creation complete!\n'
                f'- {users_created} users created\n'
                f'- {rooms_created} rooms created\n'
                f'Login with any username and password "password123"'
            )
        )