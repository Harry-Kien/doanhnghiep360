// Test env: dùng store in-memory (không đụng .data/db.json) để tránh tranh chấp ổ đĩa
// giữa các worker và cô lập dữ liệu giữa các test.
process.env.DATA_STORE = "memory";

import "@testing-library/jest-dom/vitest";
