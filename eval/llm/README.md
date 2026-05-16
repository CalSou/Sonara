# LLM / RAG eval (placeholder)

Sonara does **not** ship an LLM or retrieval pipeline yet (`src/lib/ai/mock.ts` is procedural audio).

When you add:

- A doc-grounded copilot (`docs/*.md`, README), or
- NL → structured `GenerateOptions`, or
- An agent that chains tools,

then add here:

- `datasets/qa.jsonl` — `{question, expected_answer_contains[], source_doc_paths[]}`
- `runners/rag.eval.ts` — call your route or provider, score with Ragas / DeepEval **or** LangSmith datasets.

Keep LangSmith as an **optional tracer** on the provider implementation; avoid adopting LangChain orchestration unless it pays for itself.

See `langsmith.placeholder.ts` for the intended integration seam.
