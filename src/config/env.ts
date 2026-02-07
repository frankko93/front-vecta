// Environment configuration
// For local development, create a .env.local file with these variables

export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3080",
  API_VERSION: process.env.NEXT_PUBLIC_API_VERSION || "v1",
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;

export const isDevelopment = ENV.NODE_ENV === "development";
export const isProduction = ENV.NODE_ENV === "production";
