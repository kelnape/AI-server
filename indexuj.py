import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

SLOZKA_S_PDF = "znalosti"
CESTA_K_DATABAZE = "chroma_db"

def main():
    print(f"📚 Začínám číst PDF soubory ve složce '{SLOZKA_S_PDF}'...")
    
    # 1. Načtení všech PDF ze složky
    if not os.path.exists(SLOZKA_S_PDF) or not os.listdir(SLOZKA_S_PDF):
        print(f"❌ Složka '{SLOZKA_S_PDF}' je prázdná nebo neexistuje. Přidejte nějaká PDF.")
        return

    loader = PyPDFDirectoryLoader(SLOZKA_S_PDF)
    dokumenty = loader.load()
    print(f"✅ Načteno {len(dokumenty)} stran z PDF dokumentů.")

    # 2. Rozsekání na menší kousky (chunks), aby se to vešlo AI do paměti
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    rozsekane_texty = text_splitter.split_documents(dokumenty)
    print(f"✂️ Texty rozsekány na {len(rozsekane_texty)} menších odstavců.")

    # 3. Převod textu na čísla (embeddingy) a uložení do databáze Chroma
    print("🧠 Začínám vytvářet vektorovou databázi (to může chvíli trvat)...")
    embeddings = OpenAIEmbeddings() # Využívá váš existující API klíč
    
    # Pokud už databáze existuje, smažeme ji a vytvoříme znovu, ať tam nejsou duplicity
    if os.path.exists(CESTA_K_DATABAZE):
        import shutil
        shutil.rmtree(CESTA_K_DATABAZE)
        
    db = Chroma.from_documents(
        rozsekane_texty, 
        embeddings, 
        persist_directory=CESTA_K_DATABAZE
    )
    db.persist() # Uložení na disk
    
    print(f"🎉 HOTOVO! Databáze uložena do složky '{CESTA_K_DATABAZE}'.")
    print("Váš KELNAPE Tým teď může z těchto dokumentů čerpat znalosti!")

if __name__ == "__main__":
    main()
