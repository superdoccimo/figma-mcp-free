# Launch and Release Checklist

This checklist separates repository readiness from external publication. Completing source work does not authorize npm publication, a GitHub Release, a Figma Community submission, or a public announcement.

## Repository readiness

- [x] MIT license
- [x] English and Japanese README
- [x] architecture, quickstart, troubleshooting, security, contributing, changelog, roadmap, and canonical requirements
- [x] issue and pull-request templates
- [x] package repository, homepage, bugs, keywords, files, exports, engines, and publish metadata
- [x] fork provenance policy and read-only fork intelligence
- [x] recommended GitHub repository settings documented
- [ ] GitHub About description and topics applied in repository settings
- [ ] default branch ruleset applied after required check names stabilize
- [ ] obsolete temporary development branches removed

## Functional readiness

### REST mode

- [x] URL parsing and node-ID normalization
- [x] file, frame, component, and node reads
- [x] multiple-node batching
- [x] bounded memory cache and explicit refresh
- [x] in-flight request deduplication
- [x] timeout and Retry-After handling
- [x] rate-limit metadata diagnostics
- [x] compact selection inspection
- [x] token export
- [x] React, Vue, Svelte, and HTML starter generation

### Local Plugin Bridge

- [x] loopback-only authenticated server
- [x] one memory-only snapshot
- [x] bounded body and selection counts
- [x] explicit-capture Figma development plugin
- [x] no credential persistence in plugin UI
- [x] no Figma write tools
- [x] bridge CLI
- [x] PAT-free current-selection MCP tools
- [x] model-visible schemas exclude bridge credentials
- [ ] real Figma Desktop end-to-end capture recorded on Windows
- [ ] real Figma Desktop end-to-end capture recorded on macOS or Linux, when available

## Verification readiness

- [x] Node.js 18, 20, and 22 CI matrix
- [x] build and TypeScript typecheck
- [x] unit and fixture tests
- [x] REST status, retry, cache, batching, timeout, and deduplication tests
- [x] PAT redaction and POSIX permission tests
- [x] bridge authentication, lifecycle, body-limit, selection-limit, and timeout tests
- [x] MCP schema compatibility and secret-exclusion tests
- [x] offline smoke tests
- [x] secret pattern scan
- [x] fork-portability scan
- [x] Local Plugin integrity scan
- [x] package tarball content validation
- [x] CodeQL workflow
- [x] dependency-review workflow
- [ ] main branch CodeQL result reviewed after merge
- [ ] real Figma design golden fixtures reviewed for private-content safety

## Package release readiness

- [ ] final package names and ownership confirmed
- [ ] version policy selected
- [ ] clean install tested outside the monorepo
- [ ] tarballs inspected on Linux and Windows
- [ ] npm provenance-capable workflow designed and reviewed
- [ ] release notes generated from changelog
- [ ] rollback procedure documented
- [ ] compromised-token and compromised-package response documented
- [ ] human approval obtained
- [ ] publish performed

## Figma Community readiness

- [ ] development plugin tested with a Figma-issued ID
- [ ] plugin name, icon, description, and screenshots prepared
- [ ] manifest reviewed against current official Figma documentation
- [ ] production `networkAccess` decision reviewed
- [ ] privacy statement prepared
- [ ] support route confirmed
- [ ] review submission approved by the owner
- [ ] publication performed

The checked-in development template currently permits only development loopback endpoints and declares no production network domain. Community publication may require a different reviewed network configuration.

## Public announcement readiness

- [ ] public claims checked against the current README and official Figma documentation
- [ ] no “complete Dev Mode replacement” or “unlimited API” claim
- [ ] demo uses synthetic or approved public design content
- [ ] installation path matches the actual published state
- [ ] limitations and read-only boundary shown clearly
- [ ] announcement approved by the owner

## Post-release monitoring

- [ ] verify package and plugin install paths from a clean machine
- [ ] monitor setup failures and 401/403/429 reports
- [ ] review CodeQL and Dependabot alerts
- [ ] review weekly fork-intelligence reports
- [ ] measure batch usage and REST-call reduction
- [ ] turn repeated support issues into doctor checks, tests, and documentation
- [ ] preserve contributor credit for fork-originated fixes
