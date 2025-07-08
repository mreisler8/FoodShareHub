import { apiRequest } from '../../../client/src/lib/queryClient';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('apiRequest function', () => {
    it('should make GET request', async () => {
      const mockResponse = { data: 'test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const result = await apiRequest('/api/test');

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should make POST request with body', async () => {
      const mockResponse = { id: 1, name: 'Created' };
      const requestBody = { name: 'New Item' };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const result = await apiRequest('/api/items', {
        method: 'POST',
        body: requestBody
      });

      expect(fetch).toHaveBeenCalledWith('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle PUT request', async () => {
      const mockResponse = { id: 1, name: 'Updated' };
      const requestBody = { name: 'Updated Item' };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const result = await apiRequest('/api/items/1', {
        method: 'PUT',
        body: requestBody
      });

      expect(fetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle DELETE request', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const result = await apiRequest('/api/items/1', {
        method: 'DELETE'
      });

      expect(fetch).toHaveBeenCalledWith('/api/items/1', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(result).toEqual({ success: true });
    });

    it('should handle HTTP errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Resource not found' })
      });

      await expect(apiRequest('/api/nonexistent')).rejects.toThrow('Resource not found');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiRequest('/api/test')).rejects.toThrow('Network error');
    });

    it('should handle validation errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ 
          error: 'Validation failed',
          details: {
            name: 'Name is required',
            email: 'Invalid email format'
          }
        })
      });

      await expect(apiRequest('/api/invalid', {
        method: 'POST',
        body: { name: '', email: 'invalid' }
      })).rejects.toThrow('Validation failed');
    });

    it('should handle server errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      });

      await expect(apiRequest('/api/server-error')).rejects.toThrow('Server error');
    });

    it('should handle authentication errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Not authenticated' })
      });

      await expect(apiRequest('/api/protected')).rejects.toThrow('Not authenticated');
    });

    it('should handle authorization errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Access denied' })
      });

      await expect(apiRequest('/api/forbidden')).rejects.toThrow('Access denied');
    });

    it('should handle malformed JSON responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); },
        text: async () => 'Invalid JSON response',
        headers: new Headers({ 'content-type': 'application/json' })
      });

      await expect(apiRequest('/api/malformed')).rejects.toThrow('Invalid JSON');
    });

    it('should handle non-JSON responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Not JSON'); },
        text: async () => 'Plain text response',
        headers: new Headers({ 'content-type': 'text/plain' })
      });

      const result = await apiRequest('/api/text');
      expect(result).toBe('Plain text response');
    });

    it('should handle empty responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('No content'); },
        text: async () => '',
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const result = await apiRequest('/api/empty');
      expect(result).toBe('');
    });

    it('should handle query parameters', async () => {
      const mockResponse = { data: 'filtered' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const result = await apiRequest('/api/items?filter=active&limit=10');

      expect(fetch).toHaveBeenCalledWith('/api/items?filter=active&limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle custom headers', async () => {
      const mockResponse = { data: 'test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' })
      });

      const result = await apiRequest('/api/test', {
        headers: {
          'Authorization': 'Bearer token',
          'X-Custom-Header': 'custom-value'
        }
      });

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token',
          'X-Custom-Header': 'custom-value'
        }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle timeout', async () => {
      jest.useFakeTimers();
      
      (fetch as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const requestPromise = apiRequest('/api/slow');
      
      jest.advanceTimersByTime(10000);
      
      await expect(requestPromise).rejects.toThrow();
      
      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should preserve error details', async () => {
      const errorResponse = {
        error: 'Validation failed',
        details: {
          name: 'Name is required',
          email: 'Invalid email format'
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => errorResponse
      });

      try {
        await apiRequest('/api/invalid');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.details).toEqual(errorResponse.details);
      }
    });

    it('should handle generic error messages', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({})
      });

      await expect(apiRequest('/api/generic-error')).rejects.toThrow('Internal Server Error');
    });
  });
});