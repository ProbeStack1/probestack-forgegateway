/**
 * Local static fixtures for the API Testing source picker.
 *
 * Per product requirement, the Microservice / Apigee Proxy / Kong
 * collection lists shown on the Test page are NOT fetched from ForgeQ.
 * They live here so the page stays self-contained — only the actual
 * "Send" call (executed via testingService.executeAdhoc) hits ForgeQ.
 *
 * Shape:
 *   {
 *     id: string,           // unique within the source tab
 *     name: string,         // display name
 *     baseUrl: string,      // used to build absolute request URLs
 *     endpoints: Endpoint[]
 *   }
 *
 * Endpoint:
 *   {
 *     id, path, method, name, description,
 *     defaultParams:  [{ key, value, enabled }],
 *     defaultHeaders: [{ key, value, enabled }],
 *     authType:       'none' | 'bearer' | 'basic',
 *     defaultBody:    string | null,
 *   }
 */

export const SOURCE_COLLECTIONS = {
  microservice: [
    {
      id: 'ms-user',
      name: 'User Management Service',
      baseUrl: 'https://api.example.com/users',
      endpoints: [
        {
          id: 'ms-user-1', path: '/', method: 'GET', name: 'List users',
          description: 'Paginated list of users.',
          defaultParams: [
            { key: 'page',  value: '1',  enabled: true },
            { key: 'limit', value: '10', enabled: true },
          ],
          defaultHeaders: [{ key: 'Accept', value: 'application/json', enabled: true }],
          authType: 'none', defaultBody: null,
        },
        {
          id: 'ms-user-2', path: '/:id', method: 'GET', name: 'Get user by id',
          description: 'Fetch a single user.',
          defaultParams: [], defaultHeaders: [], authType: 'none', defaultBody: null,
        },
        {
          id: 'ms-user-3', path: '/', method: 'POST', name: 'Create user',
          description: 'Create a new user account.',
          defaultParams: [],
          defaultHeaders: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          authType: 'bearer',
          defaultBody: JSON.stringify({ name: 'New User', email: 'new@example.com', role: 'user' }, null, 2),
        },
        {
          id: 'ms-user-4', path: '/:id', method: 'PUT', name: 'Update user',
          description: 'Update a user record.',
          defaultParams: [],
          defaultHeaders: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          authType: 'bearer',
          defaultBody: JSON.stringify({ name: 'Updated Name', role: 'admin' }, null, 2),
        },
        {
          id: 'ms-user-5', path: '/:id', method: 'DELETE', name: 'Delete user',
          description: 'Remove a user.',
          defaultParams: [], defaultHeaders: [], authType: 'bearer', defaultBody: null,
        },
      ],
    },
    {
      id: 'ms-payment',
      name: 'Payment Service',
      baseUrl: 'https://api.example.com/payments',
      endpoints: [
        {
          id: 'ms-pay-1', path: '/transactions', method: 'GET', name: 'List transactions',
          description: 'Transactions history.',
          defaultParams: [
            { key: 'from', value: '2024-01-01', enabled: true },
            { key: 'to',   value: '2024-12-31', enabled: true },
          ],
          defaultHeaders: [], authType: 'bearer', defaultBody: null,
        },
        {
          id: 'ms-pay-2', path: '/charge', method: 'POST', name: 'Create charge',
          description: 'Process a payment charge.',
          defaultParams: [],
          defaultHeaders: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          authType: 'bearer',
          defaultBody: JSON.stringify({ amount: 49.99, currency: 'USD', source: 'tok_visa' }, null, 2),
        },
      ],
    },
    {
      id: 'ms-inventory',
      name: 'Inventory Service',
      baseUrl: 'https://api.example.com/inventory',
      endpoints: [
        {
          id: 'ms-inv-1', path: '/products', method: 'GET', name: 'List products',
          description: 'Products with stock counts.',
          defaultParams: [{ key: 'inStock', value: 'true', enabled: true }],
          defaultHeaders: [], authType: 'none', defaultBody: null,
        },
      ],
    },
  ],

  'apigee-proxy': [
    {
      id: 'apg-orders',
      name: 'orders-proxy-v1',
      baseUrl: 'https://api.acme-apigee.net/orders/v1',
      endpoints: [
        {
          id: 'apg-orders-1', path: '/', method: 'GET', name: 'List orders',
          description: 'Search orders by status.',
          defaultParams: [{ key: 'status', value: 'completed', enabled: true }],
          defaultHeaders: [{ key: 'X-Apikey', value: '<your-api-key>', enabled: true }],
          authType: 'none', defaultBody: null,
        },
        {
          id: 'apg-orders-2', path: '/:id', method: 'GET', name: 'Get order',
          description: 'Fetch an order by id.',
          defaultParams: [], defaultHeaders: [], authType: 'none', defaultBody: null,
        },
      ],
    },
    {
      id: 'apg-catalog',
      name: 'catalog-proxy-v2',
      baseUrl: 'https://api.acme-apigee.net/catalog/v2',
      endpoints: [
        {
          id: 'apg-cat-1', path: '/items', method: 'GET', name: 'List items',
          description: 'List catalog items.',
          defaultParams: [], defaultHeaders: [], authType: 'none', defaultBody: null,
        },
      ],
    },
  ],

  kong: [
    {
      id: 'kong-auth',
      name: 'auth-service',
      baseUrl: 'https://api.acme-kong.io/auth',
      endpoints: [
        {
          id: 'kong-auth-1', path: '/login', method: 'POST', name: 'Login',
          description: 'Exchange credentials for a token.',
          defaultParams: [],
          defaultHeaders: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          authType: 'none',
          defaultBody: JSON.stringify({ username: 'jane', password: '••••' }, null, 2),
        },
        {
          id: 'kong-auth-2', path: '/refresh', method: 'POST', name: 'Refresh token',
          description: 'Refresh an access token.',
          defaultParams: [],
          defaultHeaders: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          authType: 'bearer',
          defaultBody: JSON.stringify({ refreshToken: '...' }, null, 2),
        },
      ],
    },
    {
      id: 'kong-billing',
      name: 'billing-service',
      baseUrl: 'https://api.acme-kong.io/billing',
      endpoints: [
        {
          id: 'kong-bill-1', path: '/invoices', method: 'GET', name: 'List invoices',
          description: 'Customer invoices.',
          defaultParams: [{ key: 'customerId', value: 'cust_123', enabled: true }],
          defaultHeaders: [], authType: 'bearer', defaultBody: null,
        },
      ],
    },
  ],
};

export const SOURCE_TABS = [
  { id: 'microservice', label: 'Microservice' },
  { id: 'apigee-proxy', label: 'Apigee Proxy' },
  { id: 'kong',         label: 'Kong'         },
];
