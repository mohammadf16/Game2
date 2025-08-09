# management/commands/create_test_user.py
# فایل این را در game/management/commands/ ایجاد کنید

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from game.models import UserProfile


class Command(BaseCommand):
    help = 'Create a test user for development'

    def handle(self, *args, **options):
        # Delete existing test user if exists
        User.objects.filter(username='testuser').delete()
        
        # Create test user
        user = User.objects.create_user(
            username='testuser1',
            email='test1@example.com',
            password='testpass123',
            first_name='Test1',
            last_name='User'
        )
        
        # Create profile - Remove the experience_level assignment
        profile = UserProfile.objects.create(
            user=user,
            avatar='detective_1',
            gender='prefer_not_say',
            bio='Test user for development'
        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created test user:\n'
                f'Username: testuser1\n'
                f'Password: testpass123\n'
                f'Email: test1@example.com'
            )
        )