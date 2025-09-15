# figma-mcp-free Suggested Commands

Note: These are suggested local commands to scaffold and work on the project. They are not executed automatically here.

## 0) Prereqs
- Node.js 18+ and pnpm installed
- Figma Personal Access Token ready (scoped for file read)

## 1) Bootstrap monorepo
```
pnpm init -y
pnpm add -w -D typescript tsx eslint prettier
```
- Add workspace config to `package.json`
```
# if jq is available
jq '. + {"private": true, "workspaces": ["packages/*"], "scripts": {"build": "pnpm -r build", "dev": "pnpm -r dev"}}' package.json > package.tmp && mv package.tmp package.json
```
- Base tsconfig
```
mkdir -p tsconfig && cat > tsconfig/base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "types": ["node"]
  }
}
EOF
```

## 2) Create packages skeleton
```
mkdir -p packages/{mcp-server,figma-client,design-tokens,code-generator,cli}
```

### packages/mcp-server
```
cd packages/mcp-server
pnpm init -y
pnpm add @modelcontextprotocol/sdk zod
pnpm add -D typescript tsx
cat > tsconfig.json << 'EOF'
{ "extends": "../../tsconfig/base.json", "compilerOptions": {"outDir": "dist"}, "include": ["src"] }
EOF
mkdir -p src && cat > src/index.ts << 'EOF'
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { Server } from "@modelcontextprotocol/sdk/server";

async function main() {
  const server = new Server({
    name: "figma-mcp-free",
    version: "0.1.0",
    tools: []
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => { console.error(err); process.exit(1); });
EOF
jq '. + {"type":"module","main":"dist/index.js","scripts":{"build":"tsc -p .","dev":"tsx src/index.ts"}}' package.json > package.tmp && mv package.tmp package.json
cd -
```

### packages/figma-client
```
cd packages/figma-client
pnpm init -y
pnpm add undici zod
pnpm add -D typescript
cat > tsconfig.json << 'EOF'
{ "extends": "../../tsconfig/base.json", "compilerOptions": {"outDir": "dist"}, "include": ["src"] }
EOF
mkdir -p src && cat > src/index.ts << 'EOF'
export interface FigmaClientOptions { token: string }
export class FigmaClient {
  constructor(private opts: FigmaClientOptions) {}
}
EOF
jq '. + {"type":"module","main":"dist/index.js","scripts":{"build":"tsc -p ."}}' package.json > package.tmp && mv package.tmp package.json
cd -
```

### packages/cli
```
cd packages/cli
pnpm init -y
pnpm add commander dotenv
pnpm add -D typescript tsx
cat > tsconfig.json << 'EOF'
{ "extends": "../../tsconfig/base.json", "compilerOptions": {"outDir": "dist"}, "include": ["src"] }
EOF
mkdir -p src && cat > src/index.ts << 'EOF'
#!/usr/bin/env node
import { Command } from "commander";
const program = new Command();
program
  .name("figma-mcp-free")
  .description("CLI for figma-mcp-free")
  .version("0.1.0");
program.command("init").action(async() => { console.log("Init wizard TBD"); });
program.parse();
EOF
jq '. + {"type":"module","bin":{"figma-mcp-free":"dist/index.js"},"scripts":{"build":"tsc -p .","dev":"tsx src/index.ts"}}' package.json > package.tmp && mv package.tmp package.json
cd -
```

## 3) Environment
```
export FIGMA_TOKEN=xxxxxxxx
```

## 4) Dev and build
```
pnpm install
pnpm -r build
pnpm --filter ./packages/mcp-server dev
```

