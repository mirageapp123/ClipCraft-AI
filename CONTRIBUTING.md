# Contributing to ClipCraft AI

Thank you for helping improve ClipCraft AI. First-time open-source contributors are welcome.

By participating in this project, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Good ways to start

Look for issues labeled:

- `good first issue` for small, well-scoped changes
- `help wanted` for tasks where maintainer guidance is available
- `documentation` for guides and copy improvements
- `localization` for translation work
- `testing` for browser, device, and workflow coverage

Comment on an issue before starting a larger change. This avoids duplicated work and gives maintainers a chance to clarify the expected result.

If you are unsure where to begin, open a discussion or an issue at
<https://github.com/mirageapp123/ClipCraft-AI/issues> and describe the area you would like to work on.

## Development setup

Requirements:

- Node.js 20 or newer
- npm
- A modern Chromium browser (Chrome or Edge recommended)
- WebGPU-capable hardware for the heaviest browser AI workflows (optional)
- Git

Fork and clone the repository:

```bash
git clone https://github.com/<your-username>/ClipCraft-AI.git
cd ClipCraft-AI
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

The first AI workflow may download model files. Later runs reuse the browser cache. Model downloads are large; avoid clearing browser storage while testing AI features.

## Making a change

1. Fork the repository and create a focused branch from the latest default branch.
2. Make one clear change per pull request.
3. Keep existing behavior outside the stated scope.
4. Add or update tests when behavior changes.
5. Check the desktop and mobile experience for user-facing changes.
6. Run the relevant validation commands.
7. Open a pull request explaining what changed and how you tested it.

Keep pull requests small when possible. A focused pull request is easier to review and is especially helpful for a first contribution.

## Coding practices

- Match the existing structure, naming, and style of the files you touch.
- Prefer small, composable React components and hooks over large rewrites.
- Do not introduce new dependencies unless they are necessary and justified in the pull request.
- Keep browser AI work off the main thread where the existing architecture uses workers.
- Do not add secrets, API keys, tokens, or private media to the repository.
- Do not change authentication or environment configuration as part of an unrelated change.
- Preserve existing license headers, attribution comments, and third-party notices.
- Avoid unrelated formatting or refactoring in a feature or bug-fix pull request.

## Validation

Run the complete repository check before opening a pull request:

```bash
npm run check
```

During development you can run individual checks:

```bash
npm run lint
npm run typecheck
npm run build
```

If your change is documentation-only, describe what you reviewed manually instead. If a check cannot run in your environment, say so in the pull request.

## User interface contributions

When changing visible behavior:

- Test at a desktop viewport.
- Test at a `412 × 915` mobile viewport.
- Keep controls keyboard accessible where applicable.
- Avoid introducing untranslated user-facing text.
- Include before-and-after screenshots or a short recording in the pull request.

## Localization contributions

Keep the meaning consistent across languages rather than translating words in isolation. Reuse existing translation keys when possible, and include the interface language you tested in the pull request.

## Reporting bugs and performance results

Include:

- Browser name and version
- Operating system
- Device or GPU when relevant
- Exact steps to reproduce
- Expected and actual behavior
- Console errors, screenshots, or recordings when available

Do not include private media, access tokens, personal information, or other sensitive data in issues or test files.

## Pull request guidelines

A pull request should:

- Link the related issue when one exists.
- Explain the user-visible or technical outcome.
- List the validation performed.
- Avoid unrelated formatting or refactoring.
- Preserve existing behavior outside the stated scope.
- Keep the original copyright and license notices intact.

Use the repository pull request template and complete every applicable checklist item.

## License of contributions

By contributing, you agree that your contribution will be licensed under the repository's [MIT License](LICENSE). You confirm that you have the right to submit the contribution and that it does not violate any third-party license or copyright.

The project is based on the MIT-licensed Timeline Studio codebase. Original copyright notices must remain in distributions of the code.
