import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => HttpResponse.json([{ id: '1', name: 'Alice', email: 'a@a.com' }])),
];
