import os
import traceback
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# Načtení .env souboru
load_dotenv()

PERSIST_DIRECTORY = "db/chroma_db"

def get_vector_db():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ CHYBA: OPENAI_API_KEY nebyl v .env nalezen!")
        return None
    
    try:
        # Zkontrolujeme, zda složka existuje
        if not os.path.exists("db"):
            os.makedirs("db")
            
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        db = Chroma(
            persist_directory=PERSIST_DIRECTORY,
            embedding_function=embeddings,
            collection_name="agent_memory"
        )
        return db
    except Exception as e:
        print(f"❌ KRITICKÁ CHYBA při startu ChromaDB: {e}")
        traceback.print_exc()
        return None

def search_memory(query: str, k: int = 3):
    db = get_vector_db()
    if not db: 
        return ""
    try:
        docs = db.similarity_search(query, k=k)
        if not docs: return ""
        context = "\n--- 🧠 NALEZENÉ SOUVISLOSTI A UKÁZKY KÓDU Z TVÉ PAMĚTI ---\n"
        for i, doc in enumerate(docs):
            # Přidáno jasné oddělení bloků, aby se v tom Expert vyznal
            context += f"[Vzpomínka {i+1}]:\n{doc.page_content}\n{'-'*40}\n"
        return context
    except Exception as e:
        print(f"⚠️ Paměť: Chyba při vyhledávání: {e}")
        return ""
