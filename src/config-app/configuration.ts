import { Config } from './config.interface';

function validateProviderConfig() {
  const provider = process.env.AI_PROVIDER || 'gemini';

  const providerKeys = {
    gemini: process.env.GEMINI_API_KEY,
    // add more providers as required
  };

  if (!providerKeys[provider]) {
    throw new Error(
      `API key for selected provider '${provider}' is required. Please set the corresponding environment variable.`,
    );
  }
}

export default (): Config => {
  validateProviderConfig();

  const provider = process.env.AI_PROVIDER || 'gemini';

  return {
    aiProvider: {
      provider,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    },
    app: {
      port: parseInt(process.env.PORT || '3000', 10),
      environment: process.env.NODE_ENV || 'development',
    },
    codebase: {
      rootPath: process.env.CODEBASE_ROOT_PATH || './',
    },
  };
};
