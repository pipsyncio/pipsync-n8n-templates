# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-08-25

### Changed

- update CI to current Node and official GitHub Action majors
- tighten the optional n8n import smoke script and product handoff

## [0.1.0] - 2026-08-25

### Added

- local TradingView-shaped paper/sandbox payload validator with explicit live
  rejection and no downstream execution
- synthetic-first read-only `GET /signals` summary for optional Telegram or
  Slack notification
- synthetic-first scheduled health, usage, and report catalog monitor with a
  configurable utilization threshold
- disabled external nodes, credential-free exports, synthetic fixtures, SVG
  flow diagrams, setup and security documentation
- deterministic built-in Node.js workflow validation, secret scanning, tests,
  and CI

[Unreleased]: https://github.com/pipsyncio/pipsync-n8n-templates/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/pipsyncio/pipsync-n8n-templates/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/pipsyncio/pipsync-n8n-templates/releases/tag/v0.1.0
