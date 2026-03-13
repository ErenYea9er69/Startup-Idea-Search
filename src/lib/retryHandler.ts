export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === maxRetries) break;

      const isRateLimit = error?.status === 429 || String(error?.message).includes('429') || String(error?.message).includes('上限');
      // Longer delay for rate limits (base 5s instead of 1s)
      const actualBase = isRateLimit ? 5000 : baseDelay;
      const delay = actualBase * Math.pow(2, attempt) + Math.random() * 1000;
      
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message || lastError}. Retrying in ${Math.round(delay)}ms... ${isRateLimit ? '(Rate Limit Detected)' : ''}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
