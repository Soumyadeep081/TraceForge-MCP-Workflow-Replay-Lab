# TraceForge — MCP Workflow Replay Lab

**TraceForge** is a developer laboratory for recording, inspecting, deterministically replaying, and comparing LLM agent workflows that interact with MCP (Model Context Protocol) tools.

---

## Key Features

### 1. Workflow Library Dashboard
- Comprehensive dashboard listing saved agent workflows.
- Real-time status badges: `Passed` (green), `Changed` (amber), `Failed` (rose), and `Not Run`.
- Search across workflows by name, description, server name (`zendesk-mcp`, `kb-mcp`, `github-mcp`), or tool names.
- Quick filter tabs: `All`, `Passed`, `Changed`, `Failed`, `Not Run`.
- Actions: Replay, Open, Duplicate, Export JSON, and Delete.
- Seeded demo reset anytime with one click.

### 2. Timeline & Step Inspector
- Visual ordered timeline depicting user messages, assistant responses, MCP tool calls, tool results, and errors.
- Detailed step metadata: execution duration in ms, MCP server, tool name, timestamp.
- Syntax-highlighted, collapsible JSON viewer for tool arguments and results.
- **Side Panel Drawer**:
  - Full deep inspection of step data.
  - **Edit Step Mode**: Modify step type, server, tool, arguments, and result with client-side JSON schema validation.
  - Controls to reorder steps (move up/down) or delete steps.
  - Add new steps anywhere in the workflow.

### 3. Branch Replay (Fork & Replay from Any Step)
- **Branch from any Step**: Select any step in a recorded workflow to create an experimental replay branch diverging at that exact point.
- **Validated Mock Response & Argument Editor**: Edit tool arguments or replace the recorded tool result with custom mock responses with real-time JSON validation.
- **Side-by-Side Divergence View**:
  - Clear visual demarcation of the divergence point with a glowing ribbon.
  - Steps before divergence are inherited from baseline.
  - Downstream steps cascade with the modified mock data.
- **Cascading Impact Demonstration**:
  - Seeded Demo Branch: **"P3-Low Priority Ticket & Standard Queue"** modifies mock ticket priority in Step 3 from `P1-Critical` to `P3-Low`.
  - Shows how downstream KB query dynamically shifts from outage recovery to standard invoice receipts, and the assistant recommendation adjusts accordingly.
- **Persistent Branch Management**: Branches persist across page refreshes in `localStorage`, can be renamed, rerun, and deleted.
- **Simulation Transparency**: Clearly labeled as local deterministic mock replay; never implies unsolicited external MCP calls.

### 3. Replay Lab
- **Mock Replay (Local & Deterministic)**:
  - Immediate execution without external network requirements or paid API keys.
  - 4 interactive simulation scenarios:
    1. **Baseline Equivalent (Pass)**: Reproduces deterministic recorded behavior; 100% match.
    2. **Simulate Changed Result (Detect Regression)**: Modifies live responses (e.g. ticket priority, updated ARR, revised KB articles) to test regression detection.
    3. **Simulate Tool Failure (503 / Timeout)**: Simulates upstream MCP server connection reset / HTTP 503 error.
    4. **Simulate Latency Spike**: Simulates slow response times for performance monitoring.
- **Endpoint Preview (MCP Endpoint Sandbox)**:
  - Validates MCP endpoint configuration and message schemas locally.
  - Strictly prevents unprompted network calls; requests only dispatch upon explicit replay trigger.
  - Includes a built-in local JSON-RPC 2.0 sandbox endpoint (`/api/mcp-sandbox`).
- **Playback Speed**: Normal (1x), Fast (2x), and Instant (0ms).
- **Progress Animation**: Step-by-step indicator with real-time transition from pending to running to result.

### 4. Deep Comparison Engine & Diff Inspector
- Compares replayed results with recorded baseline results.
- **Comparison Rules Configuration**:
  - **Ignored Fields**: Exclude transient attributes such as `timestamp`, `created_at`, `request_id`, `idempotency_key`, `session_id`, `durationMs` from causing false regressions.
  - **Path Whitelist**: Restrict comparison to specific JSON dot paths (e.g., `customer.arr`, `status`).
  - **Ignore Object Key Order**: Recursively canonicalizes object key ordering before comparison.
  - **Ignore String Casing**: Case-insensitive matching.
  - **Numeric Tolerance Threshold**: Permissible epsilon for floating-point scores.
- **Visual JSON Diff Viewer**:
  - Split (side-by-side) and Diff List view.
  - Explicit badges for added (+), removed (-), and modified (~) values.
  - Copy diff report to clipboard.

### 5. Replay History & Regression Analytics
- Persistent run history stored in `localStorage`.
- Metrics overview:
  - Total Replay Runs
  - Pass Rate percentage with trend direction
  - Regressions Detected count
  - Average trace latency
- Visual recent runs distribution bar (color-coded pass/changed/fail blocks).
- Drill down into past runs to compare historical output against baseline.

### 6. Workflow Trace Import & Export
- Validates imported JSON workflow traces according to the required schema:
  ```json
  {
    "name": "string",
    "description": "string",
    "steps": [
      {
        "id": "string",
        "type": "user | assistant | tool_call | tool_result | error",
        "timestamp": "ISO-8601 string",
        "server": "optional string",
        "tool": "optional string",
        "arguments": "optional JSON value",
        "result": "optional JSON value",
        "durationMs": "optional number",
        "content": "optional string"
      }
    ]
  }
  ```
- Displays clear error feedback for missing fields or invalid step types.
- Downloadable `.json` export and copy-to-clipboard functionality.

---

## Seeded Workflows Included

1. **Support ticket triage** (Default Seeded Demo)
   - Step 1: User asks to summarize a new support ticket.
   - Step 2: Agent calls `zendesk-mcp:fetch_ticket` for ticket `#TCK-8921`.
   - Step 3: Tool returns ticket details (`customer`, `status`, `arr`, `details`).
   - Step 4: Agent calls `kb-mcp:search_articles` with query.
   - Step 5: Tool returns relevant knowledge base article (`KB-404`).
   - Step 6: Agent generates cited summary and recommended action plan.

2. **GitHub PR security & dependency audit**
   - Exercises `github-mcp:get_pull_request` and `snyk-mcp:scan_vulnerabilities`.

3. **PostgreSQL schema migration safety audit**
   - Exercises `postgres-mcp:analyze_ddl_lock` validating non-blocking DDL execution.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:3000 in your browser
```
