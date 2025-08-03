from django.core.management.base import BaseCommand
from game.models import Question, DecoyQuestion


class Command(BaseCommand):
    help = 'Seed the database with Number Hunt questions'

    def handle(self, *args, **options):
        self.stdout.write('Seeding questions...')
        
        # Clear existing questions
        Question.objects.all().delete()
        DecoyQuestion.objects.all().delete()
        
        # Main questions for detectives - Improved for better gameplay
        questions_data = [
            # Daily Life & Habits (Easy - numbers people can relate to)
            {"text": "How many hours do you sleep per night on average?", "category": "lifestyle", "min_answer": 4, "max_answer": 12, "difficulty": 1},
            {"text": "How many cups of coffee/tea do you drink daily?", "category": "lifestyle", "min_answer": 0, "max_answer": 8, "difficulty": 1},
            {"text": "How many times do you exercise per week?", "category": "lifestyle", "min_answer": 0, "max_answer": 7, "difficulty": 1},
            {"text": "How many hours do you spend on your phone daily?", "category": "lifestyle", "min_answer": 1, "max_answer": 12, "difficulty": 1},
            {"text": "How many meals do you eat per day?", "category": "lifestyle", "min_answer": 1, "max_answer": 6, "difficulty": 1},
            {"text": "How many meals do you eat per day?", "category": "lifestyle", "min_answer": 1, "max_answer": 6, "difficulty": 1},
            {"text": "How many times do you check your phone per hour?", "category": "lifestyle", "min_answer": 1, "max_answer": 20, "difficulty": 2},
            {"text": "How many different apps do you use daily?", "category": "lifestyle", "min_answer": 3, "max_answer": 25, "difficulty": 2},
            {"text": "How many hours do you work per day?", "category": "lifestyle", "min_answer": 4, "max_answer": 16, "difficulty": 1},
            {"text": "How many times do you eat out per week?", "category": "lifestyle", "min_answer": 0, "max_answer": 14, "difficulty": 1},
            
            # Preferences & Opinions (1-10 scale)
            {"text": "On a scale of 1-10, how much do you enjoy cooking?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "On a scale of 1-10, how organized are you?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "On a scale of 1-10, how much do you like spicy food?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "On a scale of 1-10, how introverted are you?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 2},
            {"text": "On a scale of 1-10, how much do you enjoy horror movies?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "On a scale of 1-10, how much do you like winter weather?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "On a scale of 1-10, how adventurous are you with food?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "On a scale of 1-10, how much do you enjoy public speaking?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 2},
            {"text": "On a scale of 1-10, how much do you like surprises?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "On a scale of 1-10, how competitive are you?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            
            # Experiences
            {"text": "How many different countries have you visited?", "category": "experiences", "min_answer": 0, "max_answer": 30, "difficulty": 2},
            {"text": "How many jobs have you had in your lifetime?", "category": "experiences", "min_answer": 0, "max_answer": 15, "difficulty": 2},
            {"text": "How many concerts have you attended?", "category": "experiences", "min_answer": 0, "max_answer": 50, "difficulty": 2},
            {"text": "How many different cities have you lived in?", "category": "experiences", "min_answer": 1, "max_answer": 10, "difficulty": 2},
            {"text": "How many languages can you speak conversationally?", "category": "experiences", "min_answer": 1, "max_answer": 8, "difficulty": 2},
            {"text": "How many times have you moved homes in your life?", "category": "experiences", "min_answer": 0, "max_answer": 20, "difficulty": 2},
            {"text": "How many different sports have you played?", "category": "experiences", "min_answer": 0, "max_answer": 15, "difficulty": 2},
            {"text": "How many times have you been on an airplane?", "category": "experiences", "min_answer": 0, "max_answer": 100, "difficulty": 3},
            {"text": "How many different musical instruments can you play?", "category": "experiences", "min_answer": 0, "max_answer": 8, "difficulty": 2},
            {"text": "How many marathons or half-marathons have you completed?", "category": "experiences", "min_answer": 0, "max_answer": 20, "difficulty": 3},
            
            # Hypothetical
            {"text": "How many years would you want to live if you could choose?", "category": "hypothetical", "min_answer": 50, "max_answer": 200, "difficulty": 2},
            {"text": "How many superpowers would you want to have?", "category": "hypothetical", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "How many hours would you spend in a time loop day?", "category": "hypothetical", "min_answer": 12, "max_answer": 48, "difficulty": 2},
            {"text": "How many people would you invite to your ideal dinner party?", "category": "hypothetical", "min_answer": 2, "max_answer": 20, "difficulty": 1},
            {"text": "How many wishes would you ask for from a genie?", "category": "hypothetical", "min_answer": 1, "max_answer": 100, "difficulty": 1},
            {"text": "How many months would you want to travel around the world?", "category": "hypothetical", "min_answer": 1, "max_answer": 24, "difficulty": 2},
            {"text": "How many pets would be ideal to have?", "category": "hypothetical", "min_answer": 0, "max_answer": 10, "difficulty": 1},
            {"text": "How many close friends is the perfect number to have?", "category": "hypothetical", "min_answer": 1, "max_answer": 20, "difficulty": 2},
            {"text": "How many days would you want your ideal vacation to last?", "category": "hypothetical", "min_answer": 3, "max_answer": 90, "difficulty": 2},
            {"text": "How many different careers would you want to try?", "category": "hypothetical", "min_answer": 1, "max_answer": 10, "difficulty": 2},
            
            # General/Mixed
            {"text": "How many pairs of shoes do you own?", "category": "general", "min_answer": 2, "max_answer": 50, "difficulty": 2},
            {"text": "How many tabs do you typically have open in your browser?", "category": "general", "min_answer": 1, "max_answer": 50, "difficulty": 2},
            {"text": "How many photos do you take per week on average?", "category": "general", "min_answer": 0, "max_answer": 100, "difficulty": 2},
            {"text": "How many different passwords do you use regularly?", "category": "general", "min_answer": 1, "max_answer": 20, "difficulty": 3},
            {"text": "How many streaming services do you subscribe to?", "category": "general", "min_answer": 0, "max_answer": 10, "difficulty": 1},
            {"text": "How many plants do you have in your home?", "category": "general", "min_answer": 0, "max_answer": 30, "difficulty": 2},
            {"text": "How many different pizza toppings do you usually order?", "category": "general", "min_answer": 1, "max_answer": 8, "difficulty": 1},
            {"text": "How many alarms do you set to wake up?", "category": "general", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "How many different grocery stores do you shop at regularly?", "category": "general", "min_answer": 1, "max_answer": 5, "difficulty": 1},
            {"text": "How many unread emails do you currently have?", "category": "general", "min_answer": 0, "max_answer": 1000, "difficulty": 3},
            
            # More Lifestyle
            {"text": "How many minutes does your morning routine take?", "category": "lifestyle", "min_answer": 10, "max_answer": 120, "difficulty": 2},
            {"text": "How many different TV shows are you currently watching?", "category": "lifestyle", "min_answer": 0, "max_answer": 15, "difficulty": 2},
            {"text": "How many times do you do laundry per month?", "category": "lifestyle", "min_answer": 2, "max_answer": 20, "difficulty": 2},
            {"text": "How many hours do you spend commuting per week?", "category": "lifestyle", "min_answer": 0, "max_answer": 20, "difficulty": 2},
            {"text": "How many different types of tea or coffee do you have at home?", "category": "lifestyle", "min_answer": 0, "max_answer": 20, "difficulty": 2},
            
            # More Preferences
            {"text": "On a scale of 1-10, how much do you enjoy cleaning?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "On a scale of 1-10, how much do you like trying new restaurants?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "On a scale of 1-10, how much do you enjoy shopping?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "On a scale of 1-10, how much do you like board games?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            {"text": "On a scale of 1-10, how much do you enjoy dancing?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 1},
            
            # More Experiences
            {"text": "How many different hobbies have you tried in your life?", "category": "experiences", "min_answer": 1, "max_answer": 30, "difficulty": 2},
            {"text": "How many weddings have you attended?", "category": "experiences", "min_answer": 0, "max_answer": 50, "difficulty": 2},
            {"text": "How many different schools have you attended?", "category": "experiences", "min_answer": 1, "max_answer": 10, "difficulty": 2},
            {"text": "How many times have you been to a museum this year?", "category": "experiences", "min_answer": 0, "max_answer": 20, "difficulty": 2},
            {"text": "How many different types of cuisine have you tried?", "category": "experiences", "min_answer": 3, "max_answer": 30, "difficulty": 2},
            
            # More Hypothetical
            {"text": "How many books would you want on a desert island?", "category": "hypothetical", "min_answer": 1, "max_answer": 50, "difficulty": 2},
            {"text": "How many hours per day would you want to work in your ideal job?", "category": "hypothetical", "min_answer": 2, "max_answer": 12, "difficulty": 2},
            {"text": "How many different countries would you visit if money wasn't an issue?", "category": "hypothetical", "min_answer": 5, "max_answer": 100, "difficulty": 2},
            {"text": "How many rooms would your dream house have?", "category": "hypothetical", "min_answer": 3, "max_answer": 20, "difficulty": 2},
            {"text": "How many different skills would you want to master?", "category": "hypothetical", "min_answer": 1, "max_answer": 15, "difficulty": 2},
            
            # More General
            {"text": "How many different apps do you have on your phone?", "category": "general", "min_answer": 10, "max_answer": 200, "difficulty": 3},
            {"text": "How many different board games do you own?", "category": "general", "min_answer": 0, "max_answer": 30, "difficulty": 2},
            {"text": "How many different types of snacks do you have at home right now?", "category": "general", "min_answer": 0, "max_answer": 20, "difficulty": 2},
            {"text": "How many different social media platforms do you use?", "category": "general", "min_answer": 0, "max_answer": 10, "difficulty": 1},
            {"text": "How many different subscription services do you pay for monthly?", "category": "general", "min_answer": 0, "max_answer": 15, "difficulty": 2},
            
            # Advanced/Tricky Questions
            {"text": "How many minutes do you spend brushing your teeth daily?", "category": "lifestyle", "min_answer": 1, "max_answer": 10, "difficulty": 2},
            {"text": "How many different routes do you know to get to work/school?", "category": "general", "min_answer": 1, "max_answer": 8, "difficulty": 2},
            {"text": "How many times do you say 'thank you' in a typical day?", "category": "general", "min_answer": 1, "max_answer": 50, "difficulty": 3},
            {"text": "How many different types of weather make you happy?", "category": "preferences", "min_answer": 1, "max_answer": 8, "difficulty": 2},
            {"text": "How many steps do you take on an average day (in thousands)?", "category": "lifestyle", "min_answer": 2, "max_answer": 20, "difficulty": 3},
            
            # Fun/Creative Questions
            {"text": "How many different colors can you name off the top of your head?", "category": "general", "min_answer": 5, "max_answer": 30, "difficulty": 2},
            {"text": "How many different animals would you want to pet in one day?", "category": "hypothetical", "min_answer": 1, "max_answer": 20, "difficulty": 1},
            {"text": "How many different ice cream flavors have you tried?", "category": "experiences", "min_answer": 3, "max_answer": 50, "difficulty": 2},
            {"text": "How many different ways can you make eggs?", "category": "general", "min_answer": 1, "max_answer": 10, "difficulty": 2},
            {"text": "How many different genres of music do you listen to?", "category": "preferences", "min_answer": 1, "max_answer": 15, "difficulty": 2},
            
            # Final batch to reach ~100
            {"text": "How many different video games have you played this year?", "category": "lifestyle", "min_answer": 0, "max_answer": 50, "difficulty": 2},
            {"text": "How many different types of transportation have you used?", "category": "experiences", "min_answer": 2, "max_answer": 15, "difficulty": 2},
            {"text": "How many different holiday traditions do you celebrate?", "category": "experiences", "min_answer": 1, "max_answer": 10, "difficulty": 2},
            {"text": "How many different ways do you like to relax?", "category": "preferences", "min_answer": 1, "max_answer": 10, "difficulty": 2},
            {"text": "How many different podcasts do you listen to regularly?", "category": "lifestyle", "min_answer": 0, "max_answer": 20, "difficulty": 2},
            {"text": "How many different types of exercise do you enjoy?", "category": "preferences", "min_answer": 0, "max_answer": 10, "difficulty": 1},
            {"text": "How many different ways do you communicate with friends daily?", "category": "lifestyle", "min_answer": 1, "max_answer": 8, "difficulty": 2},
            {"text": "How many different types of bread do you like?", "category": "preferences", "min_answer": 1, "max_answer": 15, "difficulty": 2},
            {"text": "How many different seasonal activities do you look forward to?", "category": "preferences", "min_answer": 1, "max_answer": 12, "difficulty": 2},
            {"text": "How many different ways do you procrastinate?", "category": "general", "min_answer": 1, "max_answer": 10, "difficulty": 2},
        ]
        
        # Create main questions
        for q_data in questions_data:
            Question.objects.create(**q_data)
        
        # Decoy questions for imposters
        decoy_questions = [
            {"text": "Pick a number between 1 and 10", "min_answer": 1, "max_answer": 10},
            {"text": "Choose a number between 1 and 20", "min_answer": 1, "max_answer": 20},
            {"text": "Select a number between 1 and 15", "min_answer": 1, "max_answer": 15},
            {"text": "Pick a number between 1 and 12", "min_answer": 1, "max_answer": 12},
            {"text": "Choose a number between 1 and 8", "min_answer": 1, "max_answer": 8},
            {"text": "Select a number between 2 and 25", "min_answer": 2, "max_answer": 25},
            {"text": "Pick a number between 3 and 30", "min_answer": 3, "max_answer": 30},
            {"text": "Choose a number between 1 and 50", "min_answer": 1, "max_answer": 50},
            {"text": "Select a number between 5 and 15", "min_answer": 5, "max_answer": 15},
            {"text": "Pick a number between 0 and 10", "min_answer": 0, "max_answer": 10},
            {"text": "Choose any number between 1 and 100", "min_answer": 1, "max_answer": 100},
            {"text": "Select a number between 1 and 7", "min_answer": 1, "max_answer": 7},
            {"text": "Pick a number between 2 and 12", "min_answer": 2, "max_answer": 12},
            {"text": "Choose a number between 1 and 25", "min_answer": 1, "max_answer": 25},
            {"text": "Select a number between 0 and 20", "min_answer": 0, "max_answer": 20},
        ]
        
        # Create decoy questions
        for dq_data in decoy_questions:
            DecoyQuestion.objects.create(**dq_data)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {len(questions_data)} main questions and {len(decoy_questions)} decoy questions'
            )
        )
