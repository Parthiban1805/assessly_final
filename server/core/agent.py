# In core/agent.py

import os
import tempfile
from typing import List
import concurrent.futures

from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq
# CORRECT: Using Google's embedding model as per Strategy 1
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Import the models and new prompts
from .models import QuizQuestion, TopicList
from .prompts import (
    TOPIC_EXTRACTION_PROMPT,
    QUESTION_GENERATION_PROMPT,
    TOPIC_DECISION_PROMPT,
    TopicExtractionDecision
)

class QuizGenerationAgent:
    def __init__(self, groq_api_key: str, google_api_key: str):
        self.llm = ChatGroq(model="llama3-70b-8192", temperature=0.1, api_key=groq_api_key)
        # CORRECT: Initializing Google embeddings
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=google_api_key
        )

    def _load_and_split_document(self, file_path: str) -> List:
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        return text_splitter.split_documents(documents)

    def _create_vector_store_retriever(self, documents: List):
        vector_store = FAISS.from_documents(documents, self.embeddings)
        return vector_store.as_retriever()

    def _extract_key_topics(self, document_text: str, num_topics: int) -> List[str]:
        chain = TOPIC_EXTRACTION_PROMPT | self.llm.with_structured_output(TopicList)
        response = chain.invoke({"document_text": document_text, "num_topics": num_topics})
        return response.topics

    def _generate_question_for_topic(self, topic: str, retriever) -> QuizQuestion:
        relevant_docs = retriever.invoke(topic)
        context_text = "\n\n".join([doc.page_content for doc in relevant_docs])
        chain = QUESTION_GENERATION_PROMPT | self.llm.with_structured_output(QuizQuestion)
        return chain.invoke({"topic": topic, "context": context_text})

    def generate_quiz_parallel(self, file_path: str, user_prompt: str, num_questions: int, progress_callback=None) -> List[dict]:
        """Orchestrates quiz generation based on user's prompt (with parallel execution)."""
        if progress_callback: progress_callback("Step 1/4: Reading and embedding document (using Google AI)...", 0.1)

        docs = self._load_and_split_document(file_path)
        retriever = self._create_vector_store_retriever(docs)
        full_document_text = " ".join([doc.page_content for doc in docs])

        if progress_callback: progress_callback("Step 2/4: Analyzing your request for topics...", 0.25)
        
        decision_chain = TOPIC_DECISION_PROMPT | self.llm.with_structured_output(TopicExtractionDecision)
        decision = decision_chain.invoke({
            "user_prompt": user_prompt,
            "document_summary": full_document_text[:2000]
        })

        topics = []
        if decision.extract_topics or not decision.topics:
            if progress_callback: progress_callback("Step 3/4: Auto-detecting key topics from the document...", 0.4)
            topics = self._extract_key_topics(full_document_text, num_questions)
        else:
            if progress_callback: progress_callback("Step 3/4: Using your specified topics...", 0.4)
            topics = decision.topics
            num_questions = len(topics)
            if progress_callback: progress_callback(f"Generating {num_questions} questions for your topics...", 0.5)

        if not topics:
            raise ValueError("Could not determine any topics for question generation. Please try a different prompt or check the document content.")

        if progress_callback: progress_callback(f"Step 4/4: Generating {num_questions} questions in parallel...", 0.5)

        generated_questions = []
        max_concurrent_workers = 3

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_concurrent_workers) as executor:
            future_to_topic = {executor.submit(self._generate_question_for_topic, topic, retriever): topic for topic in topics}
            
            completed_count = 0
            for future in concurrent.futures.as_completed(future_to_topic):
                topic = future_to_topic[future]
                try:
                    question_model = future.result()
                    question_dict = question_model.dict()
                    question_dict["mark"] = 1
                    generated_questions.append(question_dict)
                    completed_count += 1

                    if progress_callback:
                        progress = 0.5 + (0.5 * completed_count / num_questions)
                        progress_callback(f"Generated question {completed_count}/{num_questions}...", min(progress, 0.99))

                except Exception as exc:
                    # This print statement is very helpful for debugging, keep it!
                    print(f'Topic "{topic}" generated an exception: {exc}')
                    # You could optionally add a user-facing warning here
                    # e.g., st.warning(f"Could not generate a question for '{topic}' due to an API error.")

        # NEW: Check if all questions were generated
        if len(generated_questions) < num_questions:
             print(f"Warning: {num_questions} questions were requested, but only {len(generated_questions)} could be generated due to API errors.")


        return generated_questions