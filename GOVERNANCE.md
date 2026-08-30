# Governance

## Project scope

`figma-mcp-free` provides community-maintained, read-oriented tooling around Figma data, MCP clients, design-token extraction and starter code generation.

The project is not affiliated with or endorsed by Figma. Product names and trademarks belong to their respective owners.

## Maintainers

The repository owner is the final maintainer for releases, security decisions and changes to the project's public compatibility contract.

Maintainers are expected to:

- review evidence and tests rather than accept feature claims at face value
- preserve attribution when adopting work from forks
- keep ordinary contributor CI secret-free
- separate read and write capabilities
- document breaking changes
- avoid publishing packages or releases from unreviewed pull requests

Additional maintainers may be added after sustained, high-quality contribution and a clear agreement on security and release responsibilities.

## Decision process

Small backward-compatible fixes can be decided in a pull request.

The following changes should begin with an issue or RFC-style proposal:

- new backend or network listener
- authentication or token storage changes
- write capability
- MCP tool removal or incompatible schema change
- configuration precedence change
- package publication or ownership change
- persistent storage of Figma data
- collection of telemetry

A proposal should explain the problem, alternatives, compatibility, security boundary, tests, migration and rollback.

## Compatibility policy

Public CLI commands, machine-readable output, MCP tool names and schemas, exported package APIs, token formats and configuration precedence are compatibility surfaces.

Prefer additive changes. A removal or rename requires:

1. deprecation notice
2. migration documentation
3. changelog entry
4. test coverage for the migration path
5. a version change appropriate to the impact

## Security authority

A maintainer may delay or reject a feature that adds an unbounded listener, hidden write behavior, secret exposure, arbitrary execution, unsafe default, or unverifiable package publication.

This is not a reason to block safe research, prototypes on isolated branches, architecture proposals or tests. It is a release boundary.

## Forks and attribution

Forks are part of the contribution ecosystem. Unique commits should be reviewed for usefulness, security, license and current compatibility.

When code or a substantial design originates in a fork, upstream must preserve attribution through commit history, co-authorship, PR references, or another clear record.

Fork popularity alone does not determine adoption. The deciding factors are user value, correctness, safety, tests and maintenance cost.

## Conduct

Project participation follows [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Technical disagreement is expected. Personal attacks, harassment and deliberate attribution removal are not accepted.

## Releases

Publishing is an external side effect and requires maintainer approval. See [docs/releasing.md](docs/releasing.md).
