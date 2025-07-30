from typing import List, Literal, Optional, Union
# from langchain_core.pydantic_v1 import BaseModel, Field
from pydantic import BaseModel, Field
from typing import Dict

class QuizQuestion(BaseModel):
    """A single multiple-choice question with its answer and topic tag."""
    question: str = Field(description="The multiple-choice question text.")
    options: List[str] = Field(description="A list of 4 possible options for the question.")
    answer: str = Field(description="The correct answer, which must be one of the provided options.")
    tags: str = Field(description="The specific topic or concept the question is about, e.g., 'Data Types'.")

class TopicList(BaseModel):
    """A list of key topics extracted from a document."""
    topics: List[str] = Field(description="A list of 5-10 distinct, important topics found in the text.")
    
class TopicExtractionDecision(BaseModel):
    """
    A decision model to determine if the user provided specific topics
    or if topics need to be extracted from the document.
    """
    extract_topics: bool = Field(...)
    topics: Optional[List[str]] = Field(...)


# --- NEW MODEL FOR QUESTION CLASSIFICATION ---
class QuestionType(BaseModel):
    """Defines the type of a question for variation generation."""
    q_type: Literal["numeric", "statement", "text"] = Field(
        description="The classification of the question. 'numeric' for math/calculations. 'statement' for conceptual, scenario-based, or 'which of these is true' questions. 'text' for simple definition-based questions."
    )

class QuizVariation(BaseModel):
    """A variation of a question, containing only the question, options, and answer."""
    question: str = Field(description="The new, rephrased, or re-contextualized question text.")
    options: List[str] = Field(description="The new list of 4 plausible options for the variation.")
    answer: str = Field(description="The correct answer for the new variation.")
    
class ChatCommand(BaseModel):
    """The command parsed from the user's chat message."""
    command: Literal[
        "generate_questions",
        "generate_variations",
        "view_quiz",
        "edit_quiz",
        "confirm",
        "finalize",
        "reset",
        "greet",
        "unknown"
    ] = Field(description="The specific action the user wants to take.")
    
    parameters: Optional[Dict[str, Union[int, str]]] = Field(
        None,
        description="Any parameters extracted from the prompt, like the number of questions to generate. E.g., {'num_questions': 10}"
    )