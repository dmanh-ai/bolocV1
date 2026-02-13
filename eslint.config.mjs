import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // Allow explicit any for now (too many to fix at once)
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "warn",

    // React rules
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",

    // Next.js rules
    "@next/next/no-img-element": "warn",

    // Critical rules - keep enabled
    "no-debugger": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "prefer-const": "warn",
    "no-fallthrough": "warn",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "venv/**", "python_api/**"]
}];

export default eslintConfig;
