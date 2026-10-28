import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'TraceForge Local MCP Sandbox Server',
    version: '1.0.0',
    protocolVersion: '2024-11-05',
    status: 'healthy',
    mode: 'preview_sandbox',
    supportedMethods: ['tools/list', 'tools/call', 'ping'],
    description: 'Local simulated MCP endpoint for testing and validating replay connections without external networks.',
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { method, params, id = 1 } = body;

    if (method === 'ping') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { status: 'pong', timestamp: new Date().toISOString() },
      });
    }

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'fetch_ticket',
              description: 'Retrieve support ticket details and customer audit history',
              inputSchema: {
                type: 'object',
                properties: {
                  ticket_id: { type: 'string' },
                  include_audit_trail: { type: 'boolean' },
                },
                required: ['ticket_id'],
              },
            },
            {
              name: 'search_articles',
              description: 'Query knowledge base articles for troubleshooting',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  category: { type: 'string' },
                },
                required: ['query'],
              },
            },
          ],
        },
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'fetch_ticket') {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: args.ticket_id || 'TCK-8921',
                  status: 'escalated',
                  priority: 'P1-Critical',
                  customer: {
                    name: 'Acme Corp (Enterprise Tier)',
                    contact: 'alice@acme.corp',
                    arr: '$120,000',
                  },
                  subject: 'Billing sync failure with Stripe connector',
                  sla_breach_in_minutes: 38,
                }),
              },
            ],
          },
        });
      }

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                acknowledged: true,
                tool: toolName,
                receivedArgs: args,
                executionTimestamp: new Date().toISOString(),
              }),
            },
          ],
        },
      });
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: `Parse error: ${err.message}`,
        },
      },
      { status: 400 }
    );
  }
}
