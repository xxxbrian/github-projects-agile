import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { execSync } from 'child_process';

function getGitCommitHash() {
  try {
    const full = execSync('git rev-parse HEAD').toString().trim();
    return full.slice(0, 7); // first 7 characters
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return 'unknown'; // fallback if no git
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __COMMIT_HASH__: JSON.stringify(getGitCommitHash()),
  },
})
