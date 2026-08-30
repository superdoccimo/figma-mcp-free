# Why figma-mcp-free exists

Figma designs are increasingly used as implementation inputs for AI coding tools, but no single access path fits every workflow.

A REST workflow is useful for URLs, CI, headless jobs, and remote machines. It also has endpoint, seat, plan, and resource-specific limits, so repeated full-file reads can be expensive or unavailable.

A Figma Plugin can inspect the design currently open in the editor without a Personal Access Token or a REST call. It requires Figma Desktop and should not silently transmit the user's selection.

`figma-mcp-free` exists to combine those two realities without blurring their boundaries.

## What the project provides

- quota-aware REST reads with batching, cache, deduplication, timeout, and diagnostics;
- an explicit-capture, authenticated, loopback-only Local Plugin Bridge;
- compact selected-layer context for AI coding clients;
- W3C-style Design Token extraction;
- React, Vue, Svelte, and HTML starter generation;
- fork intelligence that finds useful downstream commits without modifying forks;
- tests and GitHub workflows that enforce credential, plugin, dependency, package, and portability boundaries.

## What the project does not claim

- It is not an official Figma product.
- It is not a complete replacement for Figma Dev Mode.
- Its inspector is not Figma's official `get_design_context` tool.
- Generated code is a starter implementation, not a pixel-perfect compiler guarantee.
- The current tools do not write to Figma.
- “Free” does not mean unlimited Figma API capacity.

## Why read-only matters

Reading design context and writing design objects have very different risk profiles. Keeping the default project read-only makes its behavior easier to inspect, test, fork, and trust.

A future write-capable extension must be a separate, explicit feature with narrow permissions and post-write verification. It must not be hidden behind the current read tool names.

## Why forks matter

A fork is often an unspoken bug report or feature request. Someone who changes the code has already supplied executable evidence about what was missing.

The repository therefore audits forks read-only, preserves contributor provenance, and treats downstream work as a product-discovery signal. It never pushes or merges into another person's fork automatically.

## Project position

The durable value of `figma-mcp-free` is not an argument against one vendor. It is a reusable open workflow:

```text
observe the design
  -> minimize external calls
  -> keep credentials outside model inputs
  -> transform context into a stable schema
  -> generate a reviewable starter implementation
  -> verify with tests
  -> return useful fork improvements upstream
```

That workflow can remain useful even as Figma plans, APIs, official MCP capabilities, and AI clients change.
