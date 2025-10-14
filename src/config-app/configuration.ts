import { Config } from './config.interface';

export default (): Config => {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      apiEndpoint: process.env.OPENAI_API_ENDPOINT || '',
    },
    claudeai: {
      apiKey: process.env.CALUDEAI_API_KEY || '',
      apiEndpoint: process.env.OPENAI_API_ENDPOINT || '',
    },
    app: {
      port: parseInt(process.env.PORT || '3000', 10),
      environment: process.env.NODE_ENV || 'development',
    },
  };
};
