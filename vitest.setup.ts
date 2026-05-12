import "@testing-library/jest-dom/vitest";

process.env.PUBLISH_TOKEN_KEY ??= Buffer.alloc(32, 7).toString("base64");
