import config from "./playwright.config";

export default { ...config, testMatch: "**/*.capture.ts" };
