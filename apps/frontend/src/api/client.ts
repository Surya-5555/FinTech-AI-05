const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export class ApiClient {
  static async get<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }
    return response.json();
  }

  static async post<T, B>(path: string, body: B): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }
    return response.json();
  }
}
