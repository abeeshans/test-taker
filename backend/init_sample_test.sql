-- Migration: Add Sample Test for New Users
-- This creates a trigger that automatically adds the Sample Test.json
-- to every new user's dashboard when they sign up.

-- Step 1: Create function to insert sample test
CREATE OR REPLACE FUNCTION public.init_sample_test_for_user()
RETURNS TRIGGER AS $$
DECLARE
  sample_test_content JSONB;
BEGIN
  -- Sample Test content (from json/Sample Test.json)
  sample_test_content := '{
    "sets": [
      {
        "title": "A",
        "questions": [
          {
            "passage": "This question does not have a passage.",
            "question": "What is the capital city of France?",
            "options": ["London", "Berlin", "Madrid", "Paris"],
            "correctAnswer": "Paris"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "Which planet is known as the ''Red Planet''?",
            "options": ["Venus", "Mars", "Jupiter", "Saturn"],
            "correctAnswer": "Mars"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "What is the chemical symbol for water?",
            "options": ["O2", "CO2", "H2O", "NaCl"],
            "correctAnswer": "H2O"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "How many legs does a spider typically have?",
            "options": ["4", "6", "8", "10"],
            "correctAnswer": "8"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "Which of the following is the largest ocean on Earth?",
            "options": ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
            "correctAnswer": "Pacific Ocean"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "What is the opposite of ''Hot''?",
            "options": ["Warm", "Cold", "Wet", "Dry"],
            "correctAnswer": "Cold"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "Which animal is known as the fastest land animal?",
            "options": ["Lion", "Horse", "Cheetah", "Elephant"],
            "correctAnswer": "Cheetah"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "How many days are there in a standard year (not a leap year)?",
            "options": ["300", "365", "366", "400"],
            "correctAnswer": "365"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "What color do you get when you mix Red and Yellow?",
            "options": ["Green", "Purple", "Orange", "Brown"],
            "correctAnswer": "Orange"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "Which organ in the human body pumps blood?",
            "options": ["Brain", "Stomach", "Lungs", "Heart"],
            "correctAnswer": "Heart"
          }
        ]
      },
      {
        "title": "B",
        "questions": [
          {
            "passage": "This question does not have a passage.",
            "question": "What is the tallest mountain in the world?",
            "options": ["K2", "Mount Kilimanjaro", "Mount Everest", "Mount Fuji"],
            "correctAnswer": "Mount Everest"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "Who wrote the play ''Romeo and Juliet''?",
            "options": ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"],
            "correctAnswer": "William Shakespeare"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "What is the freezing point of water in degrees Celsius?",
            "options": ["0°C", "10°C", "32°C", "100°C"],
            "correctAnswer": "0°C"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "Which insect is known for making honey?",
            "options": ["Ant", "Fly", "Bee", "Mosquito"],
            "correctAnswer": "Bee"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "How many sides does a triangle have?",
            "options": ["2", "3", "4", "5"],
            "correctAnswer": "3"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "What is the largest mammal in the world?",
            "options": ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
            "correctAnswer": "Blue Whale"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "In which direction does the sun rise?",
            "options": ["North", "South", "East", "West"],
            "correctAnswer": "East"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "Which gas do humans need to breathe in to survive?",
            "options": ["Nitrogen", "Carbon Dioxide", "Helium", "Oxygen"],
            "correctAnswer": "Oxygen"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "What do herbivores primarily eat?",
            "options": ["Meat", "Plants", "Insects", "Fish"],
            "correctAnswer": "Plants"
          },
          {
            "passage": "This question does not have a passage.",
            "question": "Which planet is closest to the Sun?",
            "options": ["Venus", "Earth", "Mercury", "Mars"],
            "correctAnswer": "Mercury"
          }
        ]
      }
    ]
  }'::jsonb;

  -- Insert the sample test for the new user
  INSERT INTO public.tests (
    user_id,
    title,
    content,
    question_count,
    set_count,
    question_range
  ) VALUES (
    NEW.id,
    'Sample Test',
    sample_test_content,
    20, -- Total questions (10 in set A + 10 in set B)
    2,  -- 2 sets (A and B)
    '1-10' -- Question range for Set A
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger on auth.users
DROP TRIGGER IF EXISTS on_user_created_init_sample_test ON auth.users;

CREATE TRIGGER on_user_created_init_sample_test
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.init_sample_test_for_user();

-- Note: This trigger will run automatically whenever a new user signs up
-- via Google OAuth or any other authentication method.
