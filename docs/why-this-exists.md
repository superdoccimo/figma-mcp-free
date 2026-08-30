# Why This Exists

Figma-to-code workflows often begin with a simple promise: give an AI tool access to a design and generate implementation context. The difficult part appears after the first successful demo.

Real workflows need to answer:

- How many API calls were actually made?
- Were identical requests duplicated?
- Can multiple selected nodes be fetched together?
- What happens when a limit is short-lived versus plan-related?
- Can a contributor fork run CI without upstream secrets?
- Is generated output deterministic enough to review?
- Does adding a local plugin silently add write or network risk?

`figma-mcp-free` exists to keep those boundaries explicit.

The current REST backend is useful for headless automation and works without an editor plugin, but it is read-only and subject to Figma's current access rules. The client therefore batches nodes, coalesces duplicate reads, uses a bounded memory cache, exposes request statistics and can enforce a local request budget.

The project also treats forks as evidence. A unique fork commit can reveal a missing feature even when no issue was opened. Read-only fork auditing and attribution rules make that evidence usable without taking ownership away from the original author.

A future local Figma Plugin bridge is a valid direction, but it must ship as a complete safety boundary. Loopback binding, session authentication, bounded messages, explicit capabilities and real tests come before a compatibility claim.

The goal is not to imitate every official feature. It is to provide a transparent, inspectable and community-maintained workflow whose limitations are honest and whose components can improve independently.
