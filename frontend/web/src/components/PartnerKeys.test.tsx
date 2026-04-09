/**
 * PartnerKeys integration tests — complete CRUD flow
 * Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PartnerKeys from './PartnerKeys';

// --- Mock data ---

const mockPartners = [
  {
    id: 'partner-abc123',
    name: 'Acme Corp',
    org_namespace: 'acme_corp',
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'partner-def456',
    name: 'Beta Inc',
    org_namespace: 'beta_inc',
    status: 'active',
    created_at: '2024-02-20T12:00:00Z',
  },
];

// Helper: build a mock fetch that handles multiple routes
function buildMockFetch(overrides?: {
  getPartners?: object;
  postPartner?: object;
  deletePartner?: object;
}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const method = (init?.method ?? 'GET').toUpperCase();

    // Reject any matchgpt calls
    if (typeof url === 'string' && url.includes('/api/matchgpt')) {
      throw new Error('Unexpected call to /api/matchgpt');
    }

    if (url === '/api/kbdb/admin/partners' && method === 'GET') {
      return new Response(
        JSON.stringify(overrides?.getPartners ?? { partners: mockPartners }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url === '/api/kbdb/admin/partners' && method === 'POST') {
      return new Response(
        JSON.stringify(
          overrides?.postPartner ?? {
            partner_id: 'partner-new001',
            api_key: 'pk_live_testkey123',
          },
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (typeof url === 'string' && url.startsWith('/api/kbdb/admin/partners/') && method === 'DELETE') {
      return new Response(
        JSON.stringify(
          overrides?.deletePartner ?? {
            partner_id: url.split('/').pop(),
            status: 'revoked',
          },
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ error: `Unhandled: ${method} ${url}` }), { status: 404 });
  });
}

describe('PartnerKeys', () => {
  let mockFetch: ReturnType<typeof buildMockFetch>;

  beforeEach(() => {
    mockFetch = buildMockFetch();
    vi.stubGlobal('fetch', mockFetch);
    // Default: confirm dialogs return true
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- Test 1: Load list ---
  it('calls GET /api/kbdb/admin/partners on mount and displays partners', async () => {
    render(<PartnerKeys />);

    // Wait for partners to appear
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    // Confirm GET was called
    const getCalls = mockFetch.mock.calls.filter(
      ([url, init]) => url === '/api/kbdb/admin/partners' && (!init?.method || init.method === 'GET'),
    );
    expect(getCalls.length).toBeGreaterThanOrEqual(1);

    // Both partners should be visible
    expect(screen.getByText('Beta Inc')).toBeInTheDocument();
  });

  // --- Test 2: Create ---
  it('calls POST /api/kbdb/admin/partners with correct body and displays one-time api_key', async () => {
    const user = userEvent.setup();
    render(<PartnerKeys />);

    // Wait for initial load
    await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument());

    // Open create form
    await user.click(screen.getByText('+ 新增 Partner'));

    // Fill in the form
    await user.type(screen.getByPlaceholderText('e.g. Acme Corp'), 'Test Partner');
    await user.type(screen.getByPlaceholderText('e.g. acme_corp'), 'test_partner');

    // Submit
    await user.click(screen.getByRole('button', { name: '建立' }));

    // Wait for the one-time api_key to appear
    await waitFor(() => {
      expect(screen.getByText('pk_live_testkey123')).toBeInTheDocument();
    });

    // Confirm POST was called with correct body
    const postCalls = mockFetch.mock.calls.filter(
      ([url, init]) => url === '/api/kbdb/admin/partners' && init?.method === 'POST',
    );
    expect(postCalls.length).toBe(1);

    const [, postInit] = postCalls[0];
    const body = JSON.parse(postInit!.body as string) as { name: string; org_namespace: string };
    expect(body.name).toBe('Test Partner');
    expect(body.org_namespace).toBe('test_partner');

    // One-time key banner should be visible
    expect(screen.getByText('API Key 已建立')).toBeInTheDocument();
  });

  // --- Test 3: Revoke ---
  it('calls DELETE /api/kbdb/admin/partners/:id after confirm', async () => {
    const user = userEvent.setup();
    render(<PartnerKeys />);

    // Wait for partners to load
    await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument());

    // Click the first Revoke button
    const revokeButtons = screen.getAllByRole('button', { name: '撤銷' });
    await user.click(revokeButtons[0]);

    // Confirm DELETE was called for the first partner
    await waitFor(() => {
      const deleteCalls = mockFetch.mock.calls.filter(
        ([url, init]) =>
          typeof url === 'string' &&
          url.startsWith('/api/kbdb/admin/partners/') &&
          init?.method === 'DELETE',
      );
      expect(deleteCalls.length).toBe(1);
      expect(deleteCalls[0][0]).toBe('/api/kbdb/admin/partners/partner-abc123');
    });
  });

  // --- Test 4: No matchgpt calls ---
  it('makes no fetch calls to /api/matchgpt during load, create, and revoke', async () => {
    const user = userEvent.setup();
    render(<PartnerKeys />);

    // Wait for load
    await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument());

    // Create
    await user.click(screen.getByText('+ 新增 Partner'));
    await user.type(screen.getByPlaceholderText('e.g. Acme Corp'), 'No Matchgpt');
    await user.type(screen.getByPlaceholderText('e.g. acme_corp'), 'no_matchgpt');
    await user.click(screen.getByRole('button', { name: '建立' }));
    await waitFor(() => expect(screen.getByText('pk_live_testkey123')).toBeInTheDocument());

    // Revoke
    const revokeButtons = screen.getAllByRole('button', { name: '撤銷' });
    await user.click(revokeButtons[0]);
    await waitFor(() => {
      const deleteCalls = mockFetch.mock.calls.filter(
        ([url, init]) => typeof url === 'string' && url.startsWith('/api/kbdb/admin/partners/') && init?.method === 'DELETE',
      );
      expect(deleteCalls.length).toBe(1);
    });

    // Assert no matchgpt calls at all
    const matchgptCalls = mockFetch.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.includes('/api/matchgpt'),
    );
    expect(matchgptCalls).toHaveLength(0);
  });
});
