# Security Policy

## Reporting

Do not open a public issue containing sensitive information. If private information is found before submission, stop publication, remove the artifact, regenerate affected evidence, and rotate any exposed secret through the owning system.

## Data Classification

| Class | Examples | Publication |
|---|---|---|
| Public | This documentation, synthetic mockups | Allowed after review |
| Internal | Private repository structure, commit history | Describe only in generalized form |
| Confidential | Source code, schemas, operational records | Prohibited |
| Secret | Credentials, tokens, private keys | Prohibited; rotate if exposed |

## Required Response

1. Stop the submission or update.
2. Identify every derived artifact, including screenshots and video.
3. Remove and regenerate affected artifacts from synthetic inputs.
4. Run the strict package checker.
5. Perform a fresh human review before publication.

Blur is not accepted as the primary protection for confidential records. Use synthetic data.
