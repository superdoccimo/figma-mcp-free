# Blog Outline: Why one Figma access path is not enough

Draft status: claims must be checked against the current README and official Figma documentation before publication.

## Hook

A small Figma MCP repository accumulated stars and forks without active promotion. The signal was not simply “people want a free clone of Dev Mode.” Developers need practical ways to move design context into AI coding tools without wasting API calls or exposing credentials.

## The actual problem

- REST is useful for URLs, CI, headless jobs, and remote automation.
- REST limits vary by endpoint, seat, plan, and resource location.
- Repeated full-file reads are a poor default.
- A Figma Plugin can see the open selection without a PAT or REST request.
- Plugin automation becomes risky if it transmits automatically or quietly adds write access.

## Project answer

`figma-mcp-free` uses two explicit read backends:

1. quota-aware REST with batching, cache, deduplication, timeout, and diagnostics;
2. an authenticated, loopback-only Local Plugin Bridge that sends a selection only after **Capture & Send**.

Both feed the same compact inspector, Design Token exporter, and starter-code generator.

## What makes the story credible

- existing MCP tool compatibility is preserved;
- credentials are kept out of model-visible schemas;
- the bridge is memory-only and read-only;
- Node.js 18, 20, and 22 CI covers security and package checks;
- CodeQL and dependency review are enabled;
- fork intelligence already recovered a real PAT-permission improvement and preserved contributor credit.

## Honest limitations

- not an official Figma product;
- not the official `get_design_context` output;
- not a complete Dev Mode replacement;
- no Figma write operations;
- starter code still needs project-specific review.

## Closing thesis

The durable OSS advantage is not pretending every vendor feature can be copied for free. It is designing a transparent workflow that uses the right boundary for each job and leaves users with inspectable code, tests, and portable operations.
