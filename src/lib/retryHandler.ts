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

      const msg = String(error?.message || error);
      const isRateLimit = error?.status === 429 || msg.includes('429') || msg.includes('上限');
      const isTimeout = msg.includes('timed out') || msg.includes('timeout') || error?.status === 408;
      
      // Longer delay for rate limits and timeouts (base 5s instead of 1s)
      const actualBase = (isRateLimit || isTimeout) ? 5000 : baseDelay;
      const delay = actualBase * Math.pow(2, attempt) + Math.random() * 1000;
      
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed: ${msg}. Retrying in ${Math.round(delay)}ms... ${isRateLimit ? '(Rate Limit)' : isTimeout ? '(Timeout)' : ''}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
