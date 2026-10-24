import { defineConfig, devices } from "@playwright/test";

// Rejoue les parcours sur le site en ligne, avec ses en-têtes de sécurité (CSP). Supabase reste simulé.
export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results/prod",
  reporter: [["list"]],
  use: { baseURL: "https://arbre.skdigital.fr" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
});
