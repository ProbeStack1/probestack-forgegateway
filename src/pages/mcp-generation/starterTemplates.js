/**
 * Pre-filled MCP server starter templates. Picking one populates
 * identity + capabilities + runtime + transport + auth so the user
 * can jump straight to Step 6 or tweak from a working baseline.
 *
 * Templates are intentionally minimal but realistic — each exercises
 * the most common MCP patterns (read tool + write tool + one resource).
 */
export const STARTER_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank canvas',
    desc: 'Start from scratch with sensible defaults.',
    accent: 'text-gray-300',
    spec: null,                               // keep current state
  },
  {
    id: 'github',
    name: 'GitHub Issues',
    desc: 'Read, create, and comment on issues. Bearer auth ready.',
    accent: 'text-[#ff5b1f]',
    spec: {
      identity: { displayName: 'GitHub Issues', slug: 'github-issues',
        summary: 'Read, create, and comment on GitHub issues from any MCP client.',
        description: 'A reference MCP server that wraps the GitHub Issues REST API.',
        category: 'Developer Tools', license: 'MIT', slugDirty: true },
      capabilities: {
        tools: [
          { name: 'get_issue', description: 'Fetch one issue by number.',
            inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, number: { type: 'integer' } }, required: ['owner', 'repo', 'number'] },
            outputType: 'structured-json', sideEffects: 'read-only' },
          { name: 'list_issues', description: 'List open issues for a repo.',
            inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, state: { type: 'string' } }, required: ['owner', 'repo'] },
            outputType: 'structured-json', sideEffects: 'read-only' },
          { name: 'comment_on_issue', description: 'Post a comment on an issue.',
            inputSchema: { type: 'object', properties: { owner: { type: 'string' }, repo: { type: 'string' }, number: { type: 'integer' }, body: { type: 'string' } }, required: ['owner', 'repo', 'number', 'body'] },
            outputType: 'structured-json', sideEffects: 'writes' },
        ],
        resources: [{ uriTemplate: 'repo://{owner}/{name}/issues', name: 'issues_list',
          description: 'All issues in a repo as a single feed.', mimeType: 'application/json', mode: 'dynamic' }],
        prompts: [{ name: 'summarize_issue', description: 'Summarise a GitHub issue for a non-technical audience.',
          arguments: [{ name: 'issue_number', description: 'Number of the issue', required: true }],
          template: 'Summarise issue #{{issue_number}} in 3 bullet points. Use plain English.' }],
      },
    },
  },
  {
    id: 'postgres',
    name: 'Postgres Read-Only',
    desc: 'Expose a Postgres database as safe read-only queries.',
    accent: 'text-cyan-300',
    spec: {
      identity: { displayName: 'Postgres Read-Only', slug: 'postgres-readonly',
        summary: 'Read-only SQL access to a Postgres database for LLMs.',
        description: 'Exposes describe / query / count tools with SQL whitelisting.',
        category: 'Database', license: 'MIT', slugDirty: true },
      capabilities: {
        tools: [
          { name: 'list_tables', description: 'List all user tables in the database.',
            inputSchema: { type: 'object', properties: {} }, outputType: 'structured-json', sideEffects: 'read-only' },
          { name: 'describe_table', description: 'Describe one table (columns, types, constraints).',
            inputSchema: { type: 'object', properties: { table: { type: 'string' } }, required: ['table'] },
            outputType: 'structured-json', sideEffects: 'read-only' },
          { name: 'run_select', description: 'Run a SELECT query. Rejects writes.',
            inputSchema: { type: 'object', properties: { sql: { type: 'string' }, limit: { type: 'integer' } }, required: ['sql'] },
            outputType: 'structured-json', sideEffects: 'read-only', implementationHint: '// 1. Parse sql, ensure it starts with SELECT\n// 2. cap with LIMIT ${limit || 100}\n// 3. run against pg pool' },
        ],
        resources: [], prompts: [],
      },
    },
  },
  {
    id: 'slack',
    name: 'Slack Messaging',
    desc: 'Send messages and read channel history.',
    accent: 'text-purple-300',
    spec: {
      identity: { displayName: 'Slack Bridge', slug: 'slack-bridge',
        summary: 'Send messages and read recent channel history via Slack.',
        description: 'Wraps chat.postMessage + conversations.history. Requires a bot token.',
        category: 'Communication', license: 'MIT', slugDirty: true },
      capabilities: {
        tools: [
          { name: 'send_message', description: 'Post a message to a Slack channel.',
            inputSchema: { type: 'object', properties: { channel: { type: 'string' }, text: { type: 'string' } }, required: ['channel', 'text'] },
            outputType: 'structured-json', sideEffects: 'writes' },
          { name: 'read_history', description: 'Read recent messages from a channel.',
            inputSchema: { type: 'object', properties: { channel: { type: 'string' }, limit: { type: 'integer' } }, required: ['channel'] },
            outputType: 'structured-json', sideEffects: 'read-only' },
        ],
        resources: [], prompts: [],
      },
    },
  },
  {
    id: 'web-scraper',
    name: 'Web Scraper',
    desc: 'Fetch and parse web pages as markdown.',
    accent: 'text-emerald-300',
    spec: {
      identity: { displayName: 'Web Scraper', slug: 'web-scraper',
        summary: 'Fetch URLs and convert them to clean markdown for LLMs.',
        description: 'Uses Turndown to produce LLM-friendly markdown from HTML.',
        category: 'AI', license: 'MIT', slugDirty: true },
      capabilities: {
        tools: [
          { name: 'fetch_url', description: 'Fetch a URL and return clean markdown.',
            inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
            outputType: 'markdown', sideEffects: 'read-only' },
          { name: 'extract_links', description: 'Extract all outbound links from a page.',
            inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
            outputType: 'structured-json', sideEffects: 'read-only' },
        ],
        resources: [], prompts: [],
      },
    },
  },
];
