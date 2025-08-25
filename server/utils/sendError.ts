export function sendError(res: import('express').Response, status: number, message: string, details?: any) {
  // Log error for debugging
  console.error(`API Error ${status}: ${message}`, details ? JSON.stringify(details) : '');
  
  // Ensure we always send JSON, never HTML
  res.setHeader('Content-Type', 'application/json');
  res.status(status).json({ 
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && details ? { details } : {})
  });
}
