import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { ignores: ["dist/**"] },
  tseslint.configs.recommended,
  {
    extends: [pluginReact.configs.flat.recommended],
    settings: {
      react: {
      version: 'detect',
      }
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
    }
  }
]);
