import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/local-retention-kit/",
  plugins: [react()],
});
