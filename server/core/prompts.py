from langchain_core.prompts import ChatPromptTemplate
# NEW: Import Pydantic models needed for this new prompt
from typing import List, Optional
from langchain_core.pydantic_v1 import BaseModel, Field


class TopicExtractionDecision(BaseModel):
    """
    A decision model to determine if the user provided specific topics
    or if topics need to be extracted from the document.
    """
    extract_topics: bool = Field(
        description="Set to True if the user did NOT specify topics and they must be extracted from the text. Set to False if the user explicitly listed topics."
    )
    topics: Optional[List[str]] = Field(
        None,
        description="A list of topics explicitly mentioned by the user. Should be null or empty if extract_topics is True."
    )

# --- NEW: Prompt to make the decision ---
TOPIC_DECISION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an intelligent assistant helping to create a quiz. Your task is to analyze the user's request and the document's content summary to decide on the topics for the quiz questions. "
            "You **MUST** format your output as a JSON object that strictly adheres to the provided `TopicExtractionDecision` Pydantic model. "
            "Do not add any introductory text, markdown formatting, or explanations. Your entire response must be ONLY the raw JSON object."
            "\n\n**Decision Logic:**\n"
            "1. Read the user's prompt carefully.\n"
            "2. If the user explicitly lists topics (e.g., 'generate questions on pointers and memory management'), set `extract_topics` to `False` and populate the `topics` list with the user's topics.\n"
            "3. If the user makes a general request (e.g., 'generate 10 questions' or 'create a quiz on important topics'), set `extract_topics` to `True` and leave the `topics` list empty or null."
        ),
        (
            "user",
            "**User's Prompt:**\n"
            "'{user_prompt}'\n\n"
            "**Document Content Summary:**\n"
            "'{document_summary}'"
        )
    ]
)


# --- UPDATED TOPIC EXTRACTION PROMPT ---
TOPIC_EXTRACTION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert curriculum developer. Your task is to identify the most important, **conceptually distinct**, and testable topics from the provided text. "
            "Follow these strict rules for the topics you generate:\n"
            "1. **DIVERSITY IS CRITICAL:** The topics MUST be distinct and cover different concepts. Do NOT provide overlapping topics like 'Operating System Function' and 'Kernel Function' if they test the same core idea. Find truly different areas.\n"
            "2. **FORMATTING:** Each topic must be a concise, 1-3 word noun phrase suitable for a tag. Examples: 'Kernel Architecture', 'Process Management', 'Linux History', 'Multiprocessor Systems'.\n"
            "3. **NO QUESTIONS:** Do not format topics as questions (e.g., avoid 'What is Linux').\n"
            "4. **OUTPUT JSON ONLY:** You MUST format your output as a JSON object that strictly adheres to the provided `TopicList` Pydantic model. Do not add any introductory text."
        ),
        (
            "user",
            "Please analyze the following document text and identify {num_topics} distinct key topics.\n\n"
            "Document Text:\n"
            "---BEGIN DOCUMENT---\n"
            "{document_text}\n"
            "---END DOCUMENT---",
        ),
    ]
)

# --- UPDATED QUESTION GENERATION PROMPT ---
QUESTION_GENERATION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert quiz creator. Your goal is to create a single, high-quality multiple-choice question for the given **Topic** using the **Provided Context**. "
            "Your main objective is to create a question that tests a **unique aspect** of the topic, avoiding generic or repetitive questions."
            "\n\nFollow these rules:\n"
            "1. **UNIQUE ANGLE:** Do not ask a generic question. Find a specific detail or nuance in the context related to the topic and formulate a question around it.\n"
            "   - Bad Example (generic): If topic is 'Kernel', don't ask 'What is a kernel?'.\n"
            "   - Good Example (specific): If topic is 'Kernel' and context mentions its specific interaction with the shell, ask 'How does the shell interact with the kernel in a Linux system?'.\n"
            "2. **CONTEXT-BOUND:** The question must be answerable using *only* the **Provided Context**.\n"
            "3. **JSON OUTPUT ONLY:** You MUST format your output as a JSON object that strictly adheres to the `QuizQuestion` Pydantic model. Do not add any preamble."
        ),
        (
            "user",
            "**Topic:** {topic}\n\n"
            "**Provided Context:**\n"
            "---BEGIN CONTEXT---\n"
            "{context}\n"
            "---END CONTEXT---",
        ),
    ]
)
TEXT_VARIATION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert at rephrasing questions. Your task is to take an original definition-based question and generate a new, distinct version by changing the wording and sentence structure significantly."
            "\n\n**Rules:**\n"
            "1.  **Rephrase the Question:** Change the vocabulary and sentence structure. Do not change the core concept.\n"
            "2.  **Preserve the Correct Answer:** The rephrased question MUST still have the exact same correct answer.\n"
            "3.  **Generate New Distractors:** Create new, plausible incorrect options.\n"
            "4.  **JSON OUTPUT ONLY:** You MUST format your output as a JSON object that strictly adheres to the `QuizQuestion` Pydantic model."
        ),
        (
            "user",
            "Generate a new variation for the following question:\n"
            "**Original Question:** '{original_question}'\n"
            "**Original Options:** {original_options}\n"
            "**Correct Answer:** '{correct_answer}'"
        ),
    ]
)

NUMERIC_VARIATION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert in creating variations of numerical problems. Your task is to take an original problem, change all numerical values, and recalculate the answer and distractors."
            "\n\n**Rules:**\n"
            "1.  **Identify the Concept:** Understand the underlying formula (e.g., V=IR).\n"
            "2.  **Change the Numbers:** Change all numerical values in the question to new, reasonable random numbers.\n"
            "3.  **Recalculate Everything:** Based on the new numbers, calculate the new correct answer and plausible new distractors.\n"
            "4.  **JSON OUTPUT ONLY:** You MUST format your output as a JSON object that strictly adheres to the `QuizQuestion` Pydantic model."
        ),
        (
            "user",
            "Generate a new numerical variation for the following problem. The original correct answer was '{correct_answer}'.\n"
            "**Original Question:** '{original_question}'"
        ),
    ]
)

STATEMENT_VARIATION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a highly creative instructional designer. Your task is to take a conceptual or statement-based question and **completely re-contextualize it**. Instead of just rephrasing, you will create a new, practical scenario or a different framing that tests the exact same core principle."
            "\n\n**Rules:**\n"
            "1.  **Identify the Core Principle:** First, understand the fundamental fact or concept being tested.\n"
            "2.  **Create a New Scenario:** Invent a new, different real-world or theoretical scenario where this principle applies. For example, if the question is about data structures, create a mini story about a developer solving a problem.\n"
            "3.  **Formulate a New Question:** Frame a new question based on your new scenario.\n"
            "4.  **Ensure Conceptual Consistency:** The correct answer to your new question must correspond to the same core principle as the original correct answer.\n"
            "5.  **Generate New Distractors:** The new options and distractors should be relevant to your new scenario.\n"
            "6.  **JSON OUTPUT ONLY:** You MUST format your output as a JSON object that strictly adheres to the `QuizQuestion` Pydantic model."
            "\n\n**Example:**\n"
            "- **Original Question:** 'Which of the following statements is true about Python lists?'\n"
            "- **Original Answer:** 'They are mutable.'\n"
            "- **Your Re-contextualized Question:** 'A software developer is creating a shopping cart feature where items must be frequently added and removed from a collection. Which Python data structure is most suitable for this task due to its ability to be changed in-place?'\n"
            "- **Your New Answer:** 'list' (or a similar phrasing, still representing the mutable concept)."
        ),
        (
            "user",
            "Re-contextualize the following conceptual question:\n"
            "**Original Question:** '{original_question}'\n"
            "**Original Options:** {original_options}\n"
            "**Correct Answer:** '{correct_answer}'"
        ),
    ]
)

CONCEPTUAL_VARIATION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a master instructional designer creating scenario-based questions. Your primary goal is to take a core concept and build an entirely new, practical scenario around it."
            "\n\n**Rules:**\n"
            "1.  **The Immutable Answer:** The `correct_answer` provided is fixed. You MUST NOT change its text.\n"
            "2.  **Scenario Creation:** Invent a new, distinct scenario where the immutable correct answer is the logical solution.\n"
            "3.  **Question & Options:** Formulate a new question and new options relevant to your new scenario. The immutable correct answer MUST be in your new options list.\n"
            "4.  **DO NOT GENERATE TAGS:** The tag will be handled separately. Do not include a 'tags' field in your output.\n"
            "5.  **JSON OUTPUT ONLY:** You MUST format your output as a JSON object that strictly adheres to the `QuizVariation` Pydantic model."
        ),
        (
            "user",
            "Create a new scenario-based question variation for the following concept. The answer MUST remain '{correct_answer}'.\n"
            "**Original Question:** '{original_question}'\n"
            "**Immutable Correct Answer:** '{correct_answer}'"
        ),
    ]
)

# --- KEY CHANGE: This prompt also now uses the `QuizVariation` model ---
NUMERIC_VARIATION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert in creating variations of numerical problems. Your task is to take an original problem, change all numerical values, and recalculate the answer and plausible distractors. You MUST output a JSON object adhering to the `QuizVariation` model."
        ),
        (
            "user",
            "Generate a new numerical variation for this problem. The original correct answer was '{correct_answer}'.\n**Original Question:** '{original_question}'"
        ),
    ]
)
COMMAND_PARSER_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are the central command unit for an AI Quiz Factory. Your job is to interpret the user's latest message based on the entire conversation history and decide on the single, most appropriate action to take. "
            "You MUST respond ONLY with a JSON object that adheres to the `ChatCommand` Pydantic model."
            "\n\n**Conversation States & Available Commands:**\n"
            "- If the user just uploaded a file, their next command is likely `generate_questions`. Extract the number if they provide it.\n"
            "- If questions have just been generated, the user might `view_quiz`, `edit_quiz`, or `confirm` the base questions.\n"
            "- If base questions are confirmed, the user might `generate_variations`. Extract the number of variations.\n"
            "- If variations are generated, the user might `view_quiz` (for variations) or `edit_quiz` (for variations).\n"
            "- If the user wants to start over, the command is `reset`.\n"
            "- If the user says hello or thank you, the command is `greet`.\n"
            "- If the user wants to finish the whole process, the command is `finalize`.\n"
            "- If you cannot determine a clear action, use the `unknown` command."
        ),
        (
            "user",
            "Here is the conversation history (last messages are most recent):\n"
            "---BEGIN HISTORY---\n"
            "{chat_history}\n"
            "---END HISTORY---\n\n"
            "Based on this history, interpret the **user's latest message**:\n"
            "**Latest User Message:** '{user_input}'"
        ),
    ]
)
