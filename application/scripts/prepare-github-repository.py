import json,shutil,re
from pathlib import Path
root=Path.cwd();out=root/'.shipstudio/github-publication';app=out/'application';app.mkdir(exist_ok=True)
for directory in ['app','components','lib','server','db','scripts','content','data','public','docs']:
 shutil.copytree(root/directory,app/directory,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
for name in ['package.json','package-lock.json','next.config.ts','tsconfig.json','tsconfig.build.json','next-env.d.ts','eslint.config.mjs','postcss.config.mjs','proxy.ts','Dockerfile','compose.yaml','.dockerignore','.env.example','.gitignore','SITE.md','CLAUDE.md','MIGRATION.md','EXPORT.md']:
 p=root/name
 if p.exists():shutil.copy2(p,app/name)
# CDP scripts depend on these tool sources; include no private reports or screenshots.
(app/'.shipstudio/fidelity').mkdir(parents=True,exist_ok=True)
for p in (root/'.shipstudio/fidelity').glob('*.mjs'):shutil.copy2(p,app/'.shipstudio/fidelity'/p.name)
(out/'.gitignore').write_text('site/assets/\nsite/fonts/\napplication/node_modules/\napplication/.data/\napplication/.next*/\napplication/.env*\n!application/.env.example\n*.tsbuildinfo\n.DS_Store\n')
(out/'README.md').write_text('''# Enduro Vietnam — публичная демонстрация

Открыть сайт: https://mansur4-jan.github.io/enduro-vietnam-showcase/ru/

- `site/` — публичные страницы для GitHub Pages, русский и английский контент.
- `application/` — полный Next.js-проект: главная, города, туры, аренда, CMS и серверные формы.
- 52 позиции аренды, 17 туров, реальные локальные фотографии и сохранённые адреса.

Pages — демонстрационный снимок. Бронирование осуществляется через Telegram/WhatsApp; серверные заявки и редактор работают только при запуске полного приложения. Фильтры и пагинация каталога работают по данным снимка. Новые правки приложения требуют повторного экспорта.

## Локальный запуск полного приложения

```sh
cd application
npm ci
npm run dev
```

Единая тема всех страниц — `application/content/shared/theme.css`; публичные проверочные отчёты находятся в `verification/`.

Приватная БД и ключи не входят в репозиторий. Для наполнения новой локальной БД:

```sh
npm run db:import
```

Это импорт публичного seed, не копия текущей приватной БД. Инструкции по импорту XLSX и production — в `application/docs/`. Главная доступна на `/ru`.

Публикация Pages выполняется workflow `.github/workflows/pages.yml`. Исходный домен и локальная рабочая версия не переключаются.
''')
workflow='''name: Publish showcase
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v6
      - uses: actions/configure-pages@v5
      - name: Add public media
        run: cp -R application/public/. site/
      - uses: actions/upload-pages-artifact@v4
        with:
          path: site
      - uses: actions/deploy-pages@v4
        id: deployment
'''
(out/'.github/workflows').mkdir(parents=True,exist_ok=True);(out/'.github/workflows/pages.yml').write_text(workflow)
(out/'verification').mkdir(exist_ok=True)
for name in ['unified-design-checks','unified-system-pages-checks','unified-tour-type-checks','github-showcase-export','github-showcase-checks','github-showcase-live-checks','public-route-checks','link-integrity-checks','seo-checks','ru-home-checks','rental-page-checks']:
 p=root/'.shipstudio'/(name+'.json')
 if p.exists():
  data=json.loads(p.read_text())
  if not data.get('errors'):shutil.copy2(p,out/'verification'/p.name)
patterns=[r'gh[opusr]_[A-Za-z0-9]{30,}',r'github_pat_[A-Za-z0-9_]{40,}',r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',r'AKIA[A-Z0-9]{16}',r'postgres(?:ql)?://[^\s:/]+:[^\s@]+@']
issues=[]
for p in out.rglob('*'):
 if '.git' in p.parts:continue
 if not p.is_file() or p.suffix.lower() in ['.avif','.webp','.jpg','.jpeg','.png','.gif','.woff','.woff2','.ico','.ttf','.eot','.otf','.zip']:continue
 try:s=p.read_text()
 except UnicodeDecodeError:continue
 if any(re.search(x,s.replace('${POSTGRES_PASSWORD}','')) for x in patterns):issues.append(str(p.relative_to(out)))
if issues:raise RuntimeError('Possible credentials in '+repr(issues))
print(json.dumps({'applicationPrepared':True,'credentialPatternsFound':0,'privateDatabaseIncluded':False}))
