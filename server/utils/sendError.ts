export function sendError(res: import('express').Response, status: number, message: string) {
  res.status(status).json({ error: message });
}
