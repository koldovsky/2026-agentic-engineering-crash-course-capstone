# Security and Sanitization

## Publication Policy

This submission intentionally excludes:

- application source code and patches;
- database/table/column inventories;
- production identifiers or record values;
- organization-only URLs and network topology;
- credentials, tokens, cookies, connection strings, and environment files;
- private Git remote information;
- screenshots containing personal or operational data.

## Safe Evidence

The following may be published after review:

- generalized requirements and acceptance criteria;
- descriptions of the agent workflow;
- test counts and generic command shape;
- sanitized screenshots populated with synthetic values;
- the public verification skill and package checker;
- a video that shows behavior without exposing code or real records.

## Synthetic Data Policy

Synthetic data is preferred over blur or pixelation. Redaction may miss a field, preserve recognizable shapes, appear briefly during transitions, or be partially reversible. The included mockup uses invented process names, identifiers, counts, and timestamps and does not derive values from the private application.

Use blur only as a secondary defense for unavoidable browser chrome or incidental UI. Never use it to make real records safe enough for publication.

## Screenshot Checklist

Before adding an image, verify that it contains none of the following:

- names, email addresses, document numbers, or internal IDs;
- hostnames, ports, repository URLs, branch names, or filesystem paths;
- browser bookmarks, notifications, terminal history, or account avatars;
- exception details containing payload values;
- source code beyond generic commands approved for publication.

## Video Checklist

- Use a clean browser profile or crop the browser chrome.
- Use synthetic data for every operational record; use blur only for incidental non-data chrome when cropping is impossible.
- Do not open private configuration, secrets, Git remotes or proprietary source. Only reviewed public fixture/control files may be shown.
- Prefer showing the behavior, test summary, and these public artifacts.
- Review the complete exported video once before sharing the link.
