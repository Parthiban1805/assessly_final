# In core/variation_agent.py

from typing import List, Dict
import concurrent.futures
from langchain_groq import ChatGroq

# Import the new prompt and the new Pydantic model
from .prompts import (
    NUMERIC_VARIATION_PROMPT,
    CONCEPTUAL_VARIATION_PROMPT,
)
# Import QuizVariation, NOT QuizQuestion, for the agent's internal work
from .models import QuizVariation

class QuestionVariationAgent:
    """
    An agent dedicated to creating unique variations of existing questions.
    It intelligently handles numeric and conceptual questions.
    """
    def __init__(self, groq_api_key: str):
        self.llm = ChatGroq(model="llama3-70b-8192", temperature=0.7, api_key=groq_api_key)

    # --- KEY CHANGE: These methods now return a QuizVariation model ---
    def _create_numeric_variation(self, base_question: Dict) -> QuizVariation:
        """Generates a variation for a numeric question."""
        chain = NUMERIC_VARIATION_PROMPT | self.llm.with_structured_output(QuizVariation)
        return chain.invoke({
            "original_question": base_question['question'],
            "correct_answer": base_question['answer']
        })

    def _create_conceptual_variation(self, base_question: Dict) -> QuizVariation:
        """Generates a re-contextualized, scenario-based variation."""
        chain = CONCEPTUAL_VARIATION_PROMPT | self.llm.with_structured_output(QuizVariation)
        return chain.invoke({
            "original_question": base_question['question'],
            "original_options": base_question['options'],
            "correct_answer": base_question['answer']
        })

    def _determine_question_type(self, question: Dict) -> str:
        """Determines if a question is numeric or conceptual using a simple heuristic."""
        if any(char.isdigit() for char in str(question.get('answer', ''))):
            return "numeric"
        for option in question.get('options', []):
            if any(char.isdigit() for char in str(option)):
                return "numeric"
        return "conceptual"

    def generate_variations_for_question(self, base_question: Dict, num_variations: int) -> List[Dict]:
        """Creates a set of unique variations, ensuring tags are inherited."""
        question_type = self._determine_question_type(base_question)
        target_func = self._create_numeric_variation if question_type == "numeric" else self._create_conceptual_variation

        variations = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=num_variations) as executor:
            futures = [executor.submit(target_func, base_question) for _ in range(num_variations)]
            
            for future in concurrent.futures.as_completed(futures):
                try:
                    # The result from the LLM is a QuizVariation object (no tag)
                    variation_model = future.result()
                    variation_dict = variation_model.dict()
                    
                    # --- >>> THIS IS THE CORE OF THE FIX <<< ---
                    # Manually inherit the tag from the base question.
                    # This guarantees the tag is always correct.
                    variation_dict["tags"] = base_question.get("tags", "Untagged")
                    
                    # Also inherit the mark
                    variation_dict["mark"] = base_question.get("mark", 1)
                    
                    variations.append(variation_dict)
                except Exception as e:
                    print(f"Failed to generate a variation for '{base_question['question']}': {e}")
        
        return variations