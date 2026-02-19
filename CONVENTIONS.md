# Coding Conventions

- TypeScript strict mode, no `any`.
- All Notion operations must go through `src/lib/notion/dataProvider.ts`.
- UI uses component composition; keep page files thin.
- Keep data models in `src/lib/types` and keep field names stable.
- No hardcoded secrets; token and DB IDs come from settings storage.
