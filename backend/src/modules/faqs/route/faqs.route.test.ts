import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { container } from '@/common/di/container';
import type { Hono } from 'hono';
import { Faq } from '../domain/faq.entity';
import { FaqsController } from './faqs.controller';

describe('FAQs API Routing & Controller', () => {
  let app: Hono;

  const mockCreateFaq = mock(() => Promise.resolve({} as any));
  const mockUpdateFaq = mock(() => Promise.resolve({} as any));
  const mockPublishFaq = mock(() => Promise.resolve({} as any));
  const mockArchiveFaq = mock(() => Promise.resolve({} as any));
  const mockDeleteFaq = mock(() => Promise.resolve());
  const mockGetFaq = mock(() => Promise.resolve({} as any));
  const mockListFaqs = mock(() => Promise.resolve({ items: [], total: 0 } as any));

  const mockFaqService = {
    createFaq: mockCreateFaq,
    updateFaq: mockUpdateFaq,
    publishFaq: mockPublishFaq,
    archiveFaq: mockArchiveFaq,
    deleteFaq: mockDeleteFaq,
    getFaq: mockGetFaq,
    listFaqs: mockListFaqs,
  };

  const mockController = new FaqsController(mockFaqService as any);

  const sampleFaqProps = {
    id: '019f4bc4-f550-7d52-bba4-3b6258b55701',
    question: 'Where is Hoang Su Phi located?',
    answer: 'It is a mountainous district in Ha Giang province, Vietnam.',
    category: 'Geography',
    displayOrder: 1,
    status: 'DRAFT' as const,
    createdBy: '00000000-0000-0000-0000-000000000001',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    (globalThis as any).setupAuthSpy();
    container.reset();
    container.register('FaqsController', mockController);

    const { createApp } = await import('../../../app');
    app = createApp();

    mockCreateFaq.mockClear();
    mockUpdateFaq.mockClear();
    mockPublishFaq.mockClear();
    mockArchiveFaq.mockClear();
    mockDeleteFaq.mockClear();
    mockGetFaq.mockClear();
    mockListFaqs.mockClear();
  });

  describe('Faq Route integrations', () => {
    test('POST /api/v1/faqs - Create Success', async () => {
      const faq = Faq.rehydrate(sampleFaqProps);
      mockCreateFaq.mockImplementation(() => Promise.resolve(faq));

      const res = await app.request('/api/v1/faqs', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: 'Where is Hoang Su Phi located?',
          answer: 'It is a mountainous district in Ha Giang province, Vietnam.',
          category: 'Geography',
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe(faq.id);
      expect(json.question).toBe(faq.question);
    });

    test('POST /api/v1/faqs - Validation 400', async () => {
      const res = await app.request('/api/v1/faqs', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: '',
          answer: '',
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('VAL_001');
    });

    test('PATCH /api/v1/faqs/:id - Update Success', async () => {
      const faq = Faq.rehydrate(sampleFaqProps);
      const updated = Faq.rehydrate({ ...sampleFaqProps, question: 'Updated Question' });
      mockUpdateFaq.mockImplementation(() => Promise.resolve(updated));

      const res = await app.request(`/api/v1/faqs/${faq.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: 'Updated Question',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.question).toBe('Updated Question');
    });

    test('GET /api/v1/faqs/:id - Get Success', async () => {
      const faq = Faq.rehydrate(sampleFaqProps);
      mockGetFaq.mockImplementation(() => Promise.resolve(faq));

      const res = await app.request(`/api/v1/faqs/${faq.id}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(faq.id);
    });

    test('DELETE /api/v1/faqs/:id - Delete Success', async () => {
      mockDeleteFaq.mockImplementation(() => Promise.resolve());

      const res = await app.request(`/api/v1/faqs/${sampleFaqProps.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(204);
    });

    test('POST /api/v1/faqs/:id/publish - Publish Success', async () => {
      const faq = Faq.rehydrate(sampleFaqProps);
      mockPublishFaq.mockImplementation(() => Promise.resolve(faq));

      const res = await app.request(`/api/v1/faqs/${faq.id}/publish`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });

    test('POST /api/v1/faqs/:id/archive - Archive Success', async () => {
      const faq = Faq.rehydrate(sampleFaqProps);
      mockArchiveFaq.mockImplementation(() => Promise.resolve(faq));

      const res = await app.request(`/api/v1/faqs/${faq.id}/archive`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
      });

      expect(res.status).toBe(200);
    });
  });
});
