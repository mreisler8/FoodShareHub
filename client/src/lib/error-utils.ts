/**
 * Error handling utilities for consistent error processing
 */

export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const anyErr = err as any;
    return anyErr?.message || anyErr?.response?.data?.error || 'Something went wrong';
  }
  return 'Something went wrong';
}

export function isValidId(id: string | undefined): boolean {
  return !!(id && /^\d+$/.test(id));
}

export function parseNumericId(id: string | undefined): number | null {
  if (!isValidId(id)) return null;
  const parsed = parseInt(id!, 10);
  return isNaN(parsed) ? null : parsed;
}