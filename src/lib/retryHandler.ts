export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) break;

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed: ${lastError.message}. Retrying in ${Math.round(delay)}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
