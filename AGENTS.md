# Repository guidance

## Production data migrations

- Keep every script created to migrate legacy or previously entered production data in this repository. Do not treat a migration as disposable after running it once; production systems may need it during deployment, recovery, or setup of another environment.
- Store migration scripts under `scripts/`, give them a descriptive name, and expose a clear command in `package.json` so an operator can run them against the configured production database.
- Document when and how to run each migration in `README.md` or the relevant deployment documentation, including any required ordering relative to application deployment.
- Make migrations safe to rerun where practical: target only records that still need migration and avoid duplicating generated records. If reruns are unsafe, add an explicit guard and document that limitation.
- Never run a production migration automatically as part of normal application startup. Keep it as an explicit operator action and report failures with a nonzero exit status.
