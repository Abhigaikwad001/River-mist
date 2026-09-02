try {
  process.loadEnvFile();
} catch (e) {
  // Ignore if .env doesn't exist
}
