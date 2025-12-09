# AI Tutor: Locally Processed Multimedia Learning

**AI Tutor** is a full-stack educational platform designed to run entirely on the user's device. It leverages **Compact Large Language Models (LLMs)** to process heterogeneous multimedia content—including text, PDFs, images, audio, and video—without ever sending data to the cloud.

The system implements **Retrieval-Augmented Generation (RAG)** to transform static learning materials into an interactive knowledge base, capable of generating explanations, quizzes, and tests in real-time.

---

### **Table of Contents**

- [Visual Overview](#-visual-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Multimedia Processing Pipeline](#-multimedia-processing-pipeline)
- [Tech Stack](#-tech-stack)
- [Installation & Setup](#-installation--setup)
- [Future Roadmap](#-future-roadmap)
- [License](#-license)

---

### **Visual Overview**

> *The AI Tutor interface showing the chat panel, file upload module, and real-time SSE streaming.*

<img width="1680" height="924" alt="Screenshot 2025-11-18 at 17 55 06" src="https://github.com/user-attachments/assets/ccd49fe0-eef8-4155-b24f-e735cb0dd5e0" />
<br>
<img width="1677" height="904" alt="Screenshot 2025-11-18 at 17 29 58" src="https://github.com/user-attachments/assets/1328696e-9592-4e93-9f4d-9a74b8f09c46" />
<br>
<img width="1680" height="923" alt="Screenshot 2025-11-19 at 15 10 56" src="https://github.com/user-attachments/assets/90d72ee5-2dea-46a8-ade5-37a88995bc9c" />
<br>
<img width="1680" height="923" alt="Screenshot 2025-11-19 at 12 39 46" src="https://github.com/user-attachments/assets/fa8db1c7-f73a-4fff-861e-71127a2b6182" />

---

### **Key Features**

* **Privacy-First Architecture:** All data processing (OCR, transcription, embedding) happens locally. No external APIs are used, ensuring data ownership.
* **Multimodal Ingestion:**
    * **Text/PDF:** Parsed and segmented for semantic search.
    * **Images:** Analyzed by vision-capable models (LLaVA) to extract descriptions.
    * **Audio/Video:** Transcribed offline using **whisper.cpp** and processed via **FFmpeg**.
* **RAG-Powered Intelligence:** Answers are grounded strictly in the uploaded materials via an in-memory embedding store, preventing AI hallucinations.
* **Interactive Learning Modes:**
    * **Explanation Mode:** Ask open-ended questions about your materials.
    * **Testing Mode:** Automatically generate **Multiple Choice (MCQ)** or **Open-Ended** questions to test your knowledge.
* **Real-Time Streaming:** Uses Server-Sent Events (SSE) to stream AI responses token-by-token for a responsive UI.

---

### **System Architecture**

The project is divided into four logical layers to ensure scalability and modularity:

#### 1. Backend Layer (Spring Boot)
Handles REST endpoints, session management, and asynchronous task orchestration.
* **`ChatAPI`**: Manages chat sessions and SSE streaming.
* **`FileUploadController`**: Detects file types and delegates processing.
* **`ChatAiService`**: The core logic integrating LangChain4j with Ollama.

#### 2. AI & RAG Layer
Integrates local models. A text-based LLM (e.g., Llama 3) handles reasoning, while a vision model handles image analysis.
* **LangChain4j**: Java bindings for LLMs and embedding stores.
* **Ollama**: Local model orchestration runtime.

#### 3. Multimedia Processing Layer
Converts all inputs into a unified text representation.
* **PDF/Text**: Parsed via Java libraries.
* **Audio/Video**: Processed via external tools (`whisper.cpp`, `ffmpeg`).

#### 4. Frontend Layer
A lightweight, single-page interface using **ES6 JavaScript** and **Webpack**. It communicates via REST for control and SSE for data streaming.

---

### **Tech Stack**

* **Backend:** Java 17, Spring Boot 3, Maven
* **AI Orchestration:** LangChain4j, Ollama
* **Models:** Llama 3 (Text), LLaVA (Vision)
* **Media Tools:** FFmpeg, whisper.cpp
* **Database:** In-Memory Embedding Store, H2/JPA (Metadata)
* **Frontend:** HTML5, CSS3, Vanilla JS

---
### Installation & Setup

1.  **Prerequisites:**
    Ensure **Java 17**, **Maven**, **FFmpeg**, and **Ollama** are installed on your machine.
    > *Note:* You must pull the necessary models in Ollama (e.g., `ollama pull llama3`, `ollama pull llava`).

2.  **Configuration:**
    Configure your local paths for FFmpeg and Whisper models in the `application.properties` file.

3.  **Build and Run:**
    ```bash
    mvn clean install
    mvn spring-boot:run
    ```

---

### Future Roadmap

* **Dockerization:** Containerize the entire application (Backend + Ollama) for one-click deployment.
* **Persistent Vector Store:** Migrate from In-Memory embeddings to a vector database like ChromaDB or PGVector for long-term knowledge retention.
* **Voice Interface:** Add text-to-speech (TTS) to allow the AI Tutor to speak answers back to the user.
* **Summarization Mode:** Add a dedicated mode to generate concise summaries of long video lectures.

---

### License

This project is owned by **Adazhii Kristina**.
