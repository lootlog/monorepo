import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  resolve: {
    alias: {
      components: path.resolve(__dirname, "./src/components"),
      config: path.resolve(__dirname, "./src/config"),
      constants: path.resolve(__dirname, "./src/constants"),
      contexts: path.resolve(__dirname, "./src/contexts"),
      enums: path.resolve(__dirname, "./src/enums"),
      eventEmitter: path.resolve(__dirname, "./src/eventEmitter"),
      hooks: path.resolve(__dirname, "./src/hooks"),
      i18n: path.resolve(__dirname, "./src/i18n"),
      layout: path.resolve(__dirname, "./src/layout"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      navigation: path.resolve(__dirname, "./src/navigation"),
      providers: path.resolve(__dirname, "./src/providers"),
      screens: path.resolve(__dirname, "./src/screens"),
      store: path.resolve(__dirname, "./src/store"),
      types: path.resolve(__dirname, "./src/types"),
      utils: path.resolve(__dirname, "./src/utils"),
    },
  },
  plugins: [react()],
  base: "/",
  // test: {
  //   globals: true,
  //   environment: "jsdom",
  //   setupFiles: ["./src/test/setup.ts"],
  // },
});
