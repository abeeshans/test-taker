import os
from dotenv import load_dotenv
from gemini_utils import GeminiClient
import unittest
from unittest.mock import MagicMock, patch

# Load env vars
load_dotenv()

class TestGeminiClient(unittest.TestCase):
    @patch('gemini_utils.genai')
    def test_generate_questions(self, mock_genai):
        # Mock the model and response
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_response = MagicMock()
        mock_response.text = '''
        {
            "sets": [
                {
                    "questions": [
                        {
                            "id": "1",
                            "text": "What is 2+2?",
                            "options": ["3", "4", "5", "6"],
                            "correctAnswer": 1,
                            "explanation": "Math."
                        }
                    ]
                }
            ]
        }
        '''
        mock_model.generate_content.return_value = mock_response
        
        # Mock file upload
        mock_file = MagicMock()
        mock_file.name = "test_file"
        mock_file.state.name = "ACTIVE"
        mock_genai.upload_file.return_value = mock_file
        mock_genai.get_file.return_value = mock_file
        
        # Initialize client
        # We need to ensure GEMINI_API_KEY is set or mocked
        with patch.dict(os.environ, {"GEMINI_API_KEY": "fake_key"}):
            client = GeminiClient()
            
            questions = client.generate_questions(
                file_path="dummy.pdf",
                mime_type="application/pdf",
                num_questions=1,
                difficulty="Simple"
            )
            
            self.assertEqual(len(questions), 1)
            self.assertEqual(questions[0]['text'], "What is 2+2?")
            self.assertEqual(questions[0]['correctAnswer'], 1)

if __name__ == '__main__':
    unittest.main()
