/**
 * LangSmith integration seam (not wired).
 *
 * When an LLM provider exists:
 * 1. Install `@langchain/langsmith` (or LangSmith SDK for JS).
 * 2. Set `LANGCHAIN_API_KEY` / project in CI secrets only.
 * 3. Wrap the provider's `generate` / `invoke` with tracing.
 * 4. Point LangSmith evaluators at datasets exported from `eval/llm/datasets/`.
 *
 * Do not import this file from the Next.js app bundle.
 */
export const LANGSMITH_PLACEHOLDER = true;
