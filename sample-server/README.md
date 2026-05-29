# sample-server

**Optional.** Mock REST API for the template `list_employees` MCP tool.

- `GET http://127.0.0.1:9000/employees/list` — 10 sample users
- Run: `pnpm dev:sample` or `pnpm dev:all`

Comment out `registerListEmployeesTool` in `mcp-server/tools/index.ts` if you do not use this.

Full guide: [docs/GUIDE.md § Sample server](../docs/GUIDE.md#10-optional-sample-server)
