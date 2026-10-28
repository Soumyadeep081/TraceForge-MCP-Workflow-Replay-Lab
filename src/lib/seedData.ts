import { ComparisonConfig, WorkflowTrace } from '@/types/workflow';

export const DEFAULT_COMPARISON_CONFIG: ComparisonConfig = {
  ignoredFields: ['timestamp', 'created_at', 'updated_at', 'request_id', 'idempotency_key', 'session_id'],
  selectedPathsOnly: [],
  ignoreObjectKeyOrder: true,
  ignoreStringCase: false,
  numericTolerance: 0.001,
};

export const SEEDED_WORKFLOWS: WorkflowTrace[] = [
  {
    id: 'wf-support-ticket-triage',
    name: 'Support ticket triage',
    description: 'Triage customer support ticket #TCK-8921, fetch live ticket details via Zendesk MCP, query the internal KB for resolution steps, and formulate cited action.',
    tags: ['Customer Support', 'Zendesk MCP', 'Knowledge Base', 'SRE'],
    createdAt: '2026-10-28T09:00:00.000Z',
    updatedAt: '2026-10-28T09:15:00.000Z',
    lastRunAt: '2026-10-28T10:30:00.000Z',
    lastReplayStatus: 'passed',
    steps: [
      {
        id: 'step-1-user-query',
        type: 'user',
        timestamp: '2026-10-28T09:12:01.000Z',
        content: 'Summarize the newly escalated support ticket #TCK-8921 and recommend immediate next steps to resolve the customer blockage.',
      },
      {
        id: 'step-2-call-fetch-ticket',
        type: 'tool_call',
        timestamp: '2026-10-28T09:12:02.100Z',
        server: 'zendesk-mcp',
        tool: 'fetch_ticket',
        durationMs: 140,
        arguments: {
          ticket_id: 'TCK-8921',
          include_audit_trail: true,
          include_sla_status: true,
        },
      },
      {
        id: 'step-3-result-fetch-ticket',
        type: 'tool_result',
        timestamp: '2026-10-28T09:12:02.240Z',
        server: 'zendesk-mcp',
        tool: 'fetch_ticket',
        durationMs: 140,
        result: {
          id: 'TCK-8921',
          status: 'escalated',
          priority: 'P1-Critical',
          customer: {
            name: 'Acme Corp (Enterprise Tier)',
            contact: 'alice@acme.corp',
            arr: '$120,000',
            region: 'us-east-1',
          },
          created_at: '2026-10-28T09:10:00Z',
          subject: 'Billing sync failure with Stripe connector',
          details: 'Automatic subscription reconciliation is timing out with Stripe error 4022 (Invalid Webhook Secret hash mismatch). 42 customer accounts are blocked from checkout.',
          assigned_team: 'Tier-3 Support & Billing Ops',
          sla_breach_in_minutes: 38,
        },
      },
      {
        id: 'step-4-call-search-kb',
        type: 'tool_call',
        timestamp: '2026-10-28T09:12:03.000Z',
        server: 'kb-mcp',
        tool: 'search_articles',
        durationMs: 210,
        arguments: {
          query: 'Stripe webhook error 4022 signature mismatch reconciliation',
          category: 'integrations',
          limit: 3,
          min_relevance: 0.85,
        },
      },
      {
        id: 'step-5-result-search-kb',
        type: 'tool_result',
        timestamp: '2026-10-28T09:12:03.210Z',
        server: 'kb-mcp',
        tool: 'search_articles',
        durationMs: 210,
        result: {
          query: 'Stripe webhook error 4022 signature mismatch reconciliation',
          total_matches: 1,
          matched_articles: [
            {
              article_id: 'KB-404',
              title: 'Resolving Stripe Webhook Signature Mismatch (Error 4022)',
              category: 'Payment Gateways & Webhooks',
              relevance_score: 0.96,
              verified_by: 'Principal Integrations Architect',
              summary: 'Occurs when webhook secrets are rotated without re-authenticating the Stripe connector OAuth app.',
              resolution_steps: [
                'Navigate to Admin Console > Integrations > Stripe Settings',
                'Click "Force Secret Sync" to pull updated webhook endpoint secrets',
                'Trigger manual retry on queued idempotency keys via /reconcile-queue endpoint',
              ],
              estimated_recovery_seconds: 45,
            },
          ],
        },
      },
      {
        id: 'step-6-assistant-summary',
        type: 'assistant',
        timestamp: '2026-10-28T09:12:04.500Z',
        content: `### Support Ticket Triage: TCK-8921 (Acme Corp)

- **Customer**: Acme Corp (Enterprise Tier, ARR $120,000)
- **Severity**: P1-Critical (SLA breach in 38m, 42 checkout accounts blocked)
- **Root Cause**: Stripe Webhook Signature Mismatch (Error 4022). Occurs when webhook signing secrets are rotated out-of-band without re-synchronizing the integration OAuth credentials.

#### Recommended Action Plan (Per Verified Article KB-404):
1. **Force Secret Sync**: In Admin Console > Integrations > Stripe Settings, initiate **Force Secret Sync**.
2. **Flush Reconcile Queue**: Run a manual retry on queued idempotency keys via \`/reconcile-queue\` to unblock the 42 pending checkouts.
3. **Notify Customer**: Update Alice (alice@acme.corp) with an ETA of < 5 minutes for checkout restoration.`,
      },
    ],
  },
  {
    id: 'wf-github-pr-audit',
    name: 'GitHub PR security & dependency audit',
    description: 'Inspect Pull Request #412 for security vulnerabilities, AST breaking changes, and npm package integrity using GitHub MCP and Snyk MCP.',
    tags: ['Security', 'GitHub MCP', 'Snyk MCP', 'CI/CD'],
    createdAt: '2026-10-28T08:00:00.000Z',
    updatedAt: '2026-10-28T08:30:00.000Z',
    lastRunAt: '2026-10-28T11:15:00.000Z',
    lastReplayStatus: 'changed',
    steps: [
      {
        id: 'step-gh-1-user',
        type: 'user',
        timestamp: '2026-10-28T08:10:00.000Z',
        content: 'Check PR #412 in repo "org/core-api" for dependency vulnerabilities and breaking route changes.',
      },
      {
        id: 'step-gh-2-call-diff',
        type: 'tool_call',
        timestamp: '2026-10-28T08:10:01.000Z',
        server: 'github-mcp',
        tool: 'get_pull_request',
        durationMs: 180,
        arguments: {
          repo: 'org/core-api',
          pull_number: 412,
          include_files: true,
        },
      },
      {
        id: 'step-gh-3-res-diff',
        type: 'tool_result',
        timestamp: '2026-10-28T08:10:01.180Z',
        server: 'github-mcp',
        tool: 'get_pull_request',
        durationMs: 180,
        result: {
          number: 412,
          title: 'feat: upgrade auth jwt library to v9.1',
          branch: 'feat/auth-v9',
          author: 'dev-alex',
          files_changed: ['package.json', 'src/auth/jwt.ts', 'src/middleware/guard.ts'],
          additions: 48,
          deletions: 32,
        },
      },
      {
        id: 'step-gh-4-call-snyk',
        type: 'tool_call',
        timestamp: '2026-10-28T08:10:02.000Z',
        server: 'snyk-mcp',
        tool: 'scan_vulnerabilities',
        durationMs: 420,
        arguments: {
          target_manifest: 'package.json',
          deep_dependency_check: true,
          severity_threshold: 'medium',
        },
      },
      {
        id: 'step-gh-5-res-snyk',
        type: 'tool_result',
        timestamp: '2026-10-28T08:10:02.420Z',
        server: 'snyk-mcp',
        tool: 'scan_vulnerabilities',
        durationMs: 420,
        result: {
          vulnerabilities_found: 0,
          scanned_dependencies: 184,
          license_compliance: 'passed',
          risk_score: 'low',
        },
      },
      {
        id: 'step-gh-6-assistant',
        type: 'assistant',
        timestamp: '2026-10-28T08:10:03.200Z',
        content: 'PR #412 passed all security audits with 0 detected vulnerabilities in `jsonwebtoken` v9.1. AST signatures match current middleware expectations.',
      },
    ],
  },
  {
    id: 'wf-postgres-migration-audit',
    name: 'PostgreSQL schema migration safety audit',
    description: 'Verify non-blocking DDL changes and explain analyze performance impact on production database using Postgres MCP.',
    tags: ['Database', 'Postgres MCP', 'SRE', 'DDL Safety'],
    createdAt: '2026-10-28T07:00:00.000Z',
    updatedAt: '2026-10-28T07:45:00.000Z',
    lastRunAt: '2026-10-28T11:45:00.000Z',
    lastReplayStatus: 'failed',
    steps: [
      {
        id: 'step-pg-1-user',
        type: 'user',
        timestamp: '2026-10-28T07:15:00.000Z',
        content: 'Analyze proposed migration "20261028_add_customer_gin_index.sql" against production lock risks.',
      },
      {
        id: 'step-pg-2-tool-call',
        type: 'tool_call',
        timestamp: '2026-10-28T07:15:01.000Z',
        server: 'postgres-mcp',
        tool: 'analyze_ddl_lock',
        durationMs: 190,
        arguments: {
          sql: 'CREATE INDEX idx_customers_meta ON customers USING gin(metadata);',
          target_table: 'customers',
        },
      },
      {
        id: 'step-pg-3-error',
        type: 'error',
        timestamp: '2026-10-28T07:15:01.190Z',
        server: 'postgres-mcp',
        tool: 'analyze_ddl_lock',
        durationMs: 190,
        content: 'DDL Safety Violation: Table "customers" contains 14,200,000 rows. Plain CREATE INDEX will take an ACCESS EXCLUSIVE lock. Must use CREATE INDEX CONCURRENTLY.',
        result: {
          violation_type: 'ACCESS_EXCLUSIVE_LOCK_WARNING',
          table_row_count: 14200000,
          blocking_ddl: true,
          remediation: 'CREATE INDEX CONCURRENTLY idx_customers_meta ON customers USING gin(metadata);',
        },
      },
      {
        id: 'step-pg-4-assistant',
        type: 'assistant',
        timestamp: '2026-10-28T07:15:02.000Z',
        content: 'Migration rejected: Creating this GIN index without `CONCURRENTLY` will freeze customer queries for approximately 8 minutes on 14.2M rows. Update migration script with `CONCURRENTLY`.',
      },
    ],
  },
];

export const SEEDED_BRANCHES: import('@/types/workflow').ReplayBranch[] = [
  {
    id: 'branch-support-ticket-p3',
    name: 'P3-Low Priority Ticket & Standard Queue',
    workflowId: 'wf-support-ticket-triage',
    workflowName: 'Support ticket triage',
    divergedAtStepId: 'step-3-result-fetch-ticket',
    divergedAtStepIndex: 2,
    description: 'Branches from step 3 (fetch_ticket result), modifying ticket priority from P1-Critical to P3-Low. Shows how downstream KB query and assistant response adjust to standard resolution.',
    createdAt: '2026-10-28T10:00:00.000Z',
    updatedAt: '2026-10-28T10:05:00.000Z',
    lastReplayStatus: 'changed',
    modification: {
      stepId: 'step-3-result-fetch-ticket',
      stepIndex: 2,
      newResult: {
        id: 'TCK-8921',
        status: 'reopened_inquiry',
        priority: 'P3-Low',
        customer: {
          name: 'Acme Corp (Standard Invoicing)',
          contact: 'alice@acme.corp',
          arr: '$12,000',
          region: 'us-east-1',
        },
        created_at: '2026-10-28T09:10:00Z',
        subject: 'Invoice receipt styling and currency formatting inquiry',
        details: 'Customer inquired about custom PDF logo layout and VAT formatting on monthly receipt exports. No checkout or API outages.',
        assigned_team: 'Tier-1 Customer Billing',
        sla_breach_in_minutes: 1440,
      },
    },
    branchSteps: [
      {
        id: 'step-1-user-query',
        type: 'user',
        timestamp: '2026-10-28T09:12:01.000Z',
        content: 'Summarize the newly escalated support ticket #TCK-8921 and recommend immediate next steps to resolve the customer blockage.',
      },
      {
        id: 'step-2-call-fetch-ticket',
        type: 'tool_call',
        timestamp: '2026-10-28T09:12:02.100Z',
        server: 'zendesk-mcp',
        tool: 'fetch_ticket',
        durationMs: 140,
        arguments: {
          ticket_id: 'TCK-8921',
          include_audit_trail: true,
          include_sla_status: true,
        },
      },
      {
        id: 'step-3-result-fetch-ticket',
        type: 'tool_result',
        timestamp: '2026-10-28T09:12:02.240Z',
        server: 'zendesk-mcp',
        tool: 'fetch_ticket',
        durationMs: 135,
        result: {
          id: 'TCK-8921',
          status: 'reopened_inquiry',
          priority: 'P3-Low',
          customer: {
            name: 'Acme Corp (Standard Invoicing)',
            contact: 'alice@acme.corp',
            arr: '$12,000',
            region: 'us-east-1',
          },
          created_at: '2026-10-28T09:10:00Z',
          subject: 'Invoice receipt styling and currency formatting inquiry',
          details: 'Customer inquired about custom PDF logo layout and VAT formatting on monthly receipt exports. No checkout or API outages.',
          assigned_team: 'Tier-1 Customer Billing',
          sla_breach_in_minutes: 1440,
        },
      },
      {
        id: 'step-4-call-search-kb',
        type: 'tool_call',
        timestamp: '2026-10-28T09:12:03.000Z',
        server: 'kb-mcp',
        tool: 'search_articles',
        durationMs: 195,
        arguments: {
          query: 'Invoice receipt styling and currency formatting inquiry',
          category: 'billing-templates',
          limit: 3,
          min_relevance: 0.85,
        },
      },
      {
        id: 'step-5-result-search-kb',
        type: 'tool_result',
        timestamp: '2026-10-28T09:12:03.210Z',
        server: 'kb-mcp',
        tool: 'search_articles',
        durationMs: 195,
        result: {
          query: 'Invoice receipt styling and currency formatting inquiry',
          total_matches: 1,
          matched_articles: [
            {
              article_id: 'KB-112',
              title: 'Customizing Invoice Receipts and VAT Tax ID Layouts',
              category: 'Billing Templates',
              relevance_score: 0.94,
              verified_by: 'Billing Documentation Lead',
              summary: 'Instructions for configuring receipt logo branding and localized VAT IDs in account billing settings.',
              resolution_steps: [
                'Go to Admin Console > Billing & Invoicing > Branding',
                'Upload organization high-resolution PNG receipt logo',
                'Toggle "Display Tax ID / VAT Number" on monthly invoice template',
              ],
              estimated_recovery_seconds: 60,
            },
          ],
        },
      },
      {
        id: 'step-6-assistant-summary',
        type: 'assistant',
        timestamp: '2026-10-28T09:12:04.500Z',
        content: `### Support Ticket Triage: TCK-8921 (Acme Corp)

- **Customer**: Acme Corp (Standard Invoicing, ARR $12,000)
- **Severity**: P3-Low (Standard queue, 24-hour SLA window)
- **Inquiry**: Customizing PDF receipt formatting and VAT ID placement. No checkout or billing outages.

#### Recommended Action Plan (Per Verified Article KB-112):
1. **Configure Receipt Branding**: Direct Alice to **Billing & Invoicing > Branding** to update the receipt logo.
2. **Enable VAT Display**: Ensure the "Display Tax ID / VAT Number" toggle is active on invoice preferences.
3. **Close Ticket with Guide**: Respond with the standard self-serve documentation link. No emergency engineering escalation needed.`,
      },
    ],
  },
];

