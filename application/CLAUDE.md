# Ship Studio Project

This is a Next.js 14+ project with Tailwind CSS. You're helping a **non-developer** build a website. Keep explanations simple and jargon-free.

---

## Environment: Ship Studio App

You are running inside the **Ship Studio app**, which handles the development environment automatically.

**Important things to know:**
- The dev server is **already running** - you don't need to start it
- The user sees a live preview of their site in the app
- You don't need to run `npm run dev` or any server commands
- Changes to files are reflected automatically in the preview

**If the user says they can't see their site or the preview isn't working:**
> "Try clicking the **Projects** button in the top right corner to go back to the project list, then reopen your project. This restarts the preview."

---

## FIRST: Check for Onboarding

**Before doing anything else**, check if `SITE.md` exists.

- If `SITE.md` **does NOT exist**: Run the `/onboarding` skill immediately to learn about their business and create a personalized plan.
- If `SITE.md` **exists**: Read it to understand the project before making changes.

---

## Your Skills

You have specialized skills in `.claude/skills/`. **Use them constantly:**

| Skill | When to Use | Invocable |
|-------|-------------|-----------|
| **onboarding** | New project setup, no SITE.md exists | `/onboarding` |
| **page-remake** | User provides URL to remake/rebuild/recreate | `/page-remake` |
| **brand-identity** | Choosing colors, fonts, visual direction | Auto |
| **copywriting** | Writing any text for the site | Auto |
| **marketing-site-design** | Planning page layouts, sections | Auto |
| **sanity-cms** | User wants editable content/CMS | `/sanity-cms` |
| **documentation-writer** | After EVERY code change - update SITE.md | Auto |
| **react-nextjs-expert** | Writing any React/Next.js code | Auto |
| **frontend-design** | Creating any visual component | Auto |
| **animations** | Adding micro-interactions and motion | Auto |
| **react-best-practices** | Performance optimization | Auto |

### Workflow for Every Build Task

1. Check `SITE.md` for brand personality and preferences
2. Use `marketing-site-design` to plan section architecture
3. Use `brand-identity` to select colors/fonts (follow design principles)
4. Use `copywriting` to write specific, human-sounding text
5. Use `frontend-design` + `react-nextjs-expert` for implementation
6. Use `documentation-writer` to update SITE.md after changes

---

## Human-First Design Principles

Great design feels intentional and distinctive. These guidelines help create sites that stand out and feel memorable.

### The Goal

Sites should feel:
- **Intentional** - Every choice has a reason
- **Distinctive** - Not a copy of common patterns
- **Memorable** - Something visitors remember
- **Human** - Warm and approachable

### Typography Guidance

Common fonts like Inter, Roboto, and system fonts work well but are everywhere. For distinction, explore alternatives:

**Modern & Clean:**
- Space Grotesk + DM Sans
- Outfit + Source Sans 3
- Sora + Nunito

**Elegant & Refined:**
- Playfair Display + Lato
- Cormorant Garamond + Montserrat
- Fraunces + Work Sans

**Warm & Approachable:**
- Poppins + Nunito Sans
- Quicksand + Open Sans
- Comfortaa + Mulish

These aren't rules—they're starting points. The right font depends on the brand.

### Color Guidance

**Think twice about these common defaults:**
- `#3B82F6` (Tailwind blue-500) as primary accent - it's everywhere
- Purple-to-blue gradients on white backgrounds - very common
- Pure black `#000000` on pure white `#FFFFFF` - can feel harsh

**Consider instead:**
- Off-black (`#1C1917`) on off-white (`#FAFAF9`) for softer contrast
- Custom accent colors that reflect the brand's personality
- The 60-30-10 rule: 60% dominant, 30% secondary, 10% accent

### Layout Guidance

**Common patterns to use thoughtfully:**
- 3-column feature grids with generic icons - try alternatives like 2-column, asymmetric, or bento layouts
- Centered everything - vary alignment for visual interest
- Equal spacing throughout - vary spacing for rhythm

**Background patterns that feel dated:**
- Abstract blob SVGs
- Wave section dividers
- Gradient mesh backgrounds

Alternatives: geometric shapes, grain textures, solid colors with intentional variation, or high-quality photography.

### Writing Guidance

**Overused words to consider alternatives for:**
revolutionize, leverage, synergy, cutting-edge, seamless, empower, game-changer, next-generation, best-in-class, world-class, unlock, elevate, transform, streamline, robust, scalable, innovative, disrupt, holistic, ecosystem, paradigm, optimize, dynamic, curated, bespoke

**Instead:** Be specific. Use numbers. Focus on outcomes. Write like a human talking to another human.

---

## CRITICAL: Maintain Documentation

**You MUST keep documentation updated.** This is essential for non-technical users.

### Files to Maintain

1. **`SITE.md`** - The main documentation file. Update EVERY time you make changes:
   ```markdown
   # [Site Name]

   > [One-sentence tagline]

   ## Brand Identity
   - Personality: [from onboarding]
   - Colors: [what we're using]
   - Fonts: [what we're using]

   ## Pages
   - **Homepage** (`/`) - [description of what's on it]
   - **About** (`/about`) - [description]

   ## Components
   - **Navbar** - [what it contains, how to customize]
   - **Footer** - [what it contains]

   ## Recent Changes
   - [Date]: Added hero section with [description]
   - [Date]: Created contact page

   ## How to Customize
   - To change colors: [simple instructions]
   - To add a new page: [simple instructions]
   ```

2. **Create `SITE.md` immediately** if it doesn't exist (via onboarding).

3. **Update `SITE.md` after EVERY change** - no exceptions.

4. **Use simple language** - Say "the main page" not "the root route". Say "the navigation bar at the top" not "the header component".

---

## Project Structure

```
app/
├── layout.tsx       # The wrapper around all pages (has <html>, <body>)
├── page.tsx         # Homepage - EDIT THIS for the main page
├── globals.css      # Global styles + Tailwind
└── [folders]/page.tsx  # Other pages (about/, contact/, etc.)
components/          # Reusable pieces (Navbar, Footer, etc.) - create if needed
public/              # Images and static files
lib/                 # Helper functions (Sanity client, etc.)
sanity/              # CMS configuration (if added via /sanity-cms)
```

---

## Rules for Building

### DO:
- Run `/onboarding` for new projects without SITE.md
- Check SITE.md before every task for brand context
- Use skills for visual decisions and code patterns
- Edit `app/page.tsx` for the homepage
- Use Tailwind CSS classes for ALL styling
- Create a `components/` folder for reusable pieces
- Put images in `public/` folder
- Update `SITE.md` after every change
- Explain what you did in simple terms
- Make intentional, distinctive design choices

### DON'T:
- NEVER create `.html` files - this is React/Next.js
- NEVER create separate `.css` files - use Tailwind
- NEVER use `<script>` tags - this is React
- NEVER leave the user confused about what changed
- NEVER use technical jargon without explaining it
- NEVER skip updating SITE.md

---

## File-Based Routing

Each folder in `app/` becomes a page:
- `app/page.tsx` → Homepage (yoursite.com)
- `app/about/page.tsx` → About page (yoursite.com/about)
- `app/contact/page.tsx` → Contact page (yoursite.com/contact)
- `app/pricing/page.tsx` → Pricing page (yoursite.com/pricing)

---

## Example: Creating a New Page

If the user asks for an "About" page:

1. Check `SITE.md` for brand personality
2. Use `marketing-site-design` skill to plan sections
3. Use `brand-identity` skill for visual consistency
4. Create `app/about/page.tsx` using `react-nextjs-expert` patterns
5. Write copy using `copywriting` skill guidelines
6. **Update `SITE.md`** using `documentation-writer` skill
7. Tell the user: "I created an About page. You can see it by going to /about in the preview."

---

## After Every Task

1. Make the requested changes (using your skills, following design principles)
2. Update `SITE.md` with what changed
3. Tell the user what you did in plain English
4. Let them know how to see the changes

---

## Adding CMS (When Requested)

When the user wants to edit content themselves, run the `/sanity-cms` skill. This will:
1. Set up Sanity CMS in the project
2. Create schemas for editable content
3. Connect the frontend to fetch CMS data
4. Give them a friendly editing dashboard

The `.mcp.json` file is already configured for Sanity. User authenticates via OAuth when first using Sanity tools.

---

## Remember

The user is NOT a developer. They're using Ship Studio to build a website without coding knowledge. Your job is to:

1. **Onboard them properly** (if no SITE.md)
2. **Build what they ask for** (using your skills)
3. **Make it feel distinctive and intentional** (not generic)
4. **Keep everything documented** so they understand their site
5. **Explain things simply**
6. **Make them feel confident** about their project

**Always use your skills. Always follow design principles. Always update SITE.md.**

## Действующее поручение и данные

Владелец разрешил автономное выполнение всех оставшихся S02–S14 по docs/TZ_v1-extracted.txt. Прежнее требование отдельной команды на этап отменено. Визуальное совпадение с исходным сайтом отложено пользователем; не возвращаться к нему без нового указания и не объявлять порог 99.5% выполненным.

Читайте SITE.md, docs/ARCHITECTURE.md и docs/RUNBOOK.md. Единственный текущий отчёт — .shipstudio/migration.json. PostgreSQL является текущим источником опубликованного каталога и заявок; content/exported-pages и исходные ZIP — архивы и доказательства происхождения. Не перезаписывать первичные ZIP, не затирать editor_modified импортом, не публиковать неподтверждённые цены/условия и тестовые fixtures.

Проект уже использует Next.js 16.3.8 и собственный кабинет с PostgreSQL. Не добавлять другую CMS из старых общих рекомендаций. Действующие стили общего каталога — app/globals.css, локальный Inter, фон #f7f7f3, текст #202620, акцент #c7f265, контейнер 1200 px; исходные computed-токены сохранены как исторические.

Не печатать пароли, bridge-key, recovery/invite ссылки или TOTP секреты. .data не включать в публичную передачу. В dev доставка отключена; реальные email/Telegram и удалённый выпуск считаются непроверенными до подтверждения на реальных получателях и сервере. Не считать Dockerfile доказательством развёртывания.

Применённые общие разделы: CMS, импорт, роли, формы, медиа, фильтры, SEO, проверка, резервирование, сервер и инженерная память из базы владельца. Конкретные факты и отчёты этого приложения хранятся только здесь.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Visual language — русская главная /ru

Уточнения владельца: фон обёртки логотипа при скролле прозрачный; hero не обрезает dropdown, а его media сохраняет overflow:hidden. Кнопки городов 42px. Desktop-аренда: сетка 430px, при высоте экрана до 750px — 380px. Эти изменения держать в content/homepage-ru/refinements.css. Таблица ориентира берёт утверждённые цены из базы; неподтверждённые активности показывать только «по запросу».

Городские RU-страницы используют общий CityPage и предоставленный refined-концепт Далата. Область .city-page: --orange #f15a24, --orange-dark #d94715, --pine #173d2a, --pine-dark #0c2418, --ink #151915, --text #303a33, --muted #566158, --line #dce2dc, --soft #f4f5f1, --cream #f3efe6; --max 1360px, --head 72/64px. Локальные Manrope/Unbounded из главной. Секции 72/58px в источнике, мобильные уточнения 48/40px; карточки 18–26px, pills 999px, фиксированная панель header и фото с градиентами. Исходные media queries 600/900/1250px; оглавление показывать только когда оно помещается сбоку от контейнера. Владелец попросил преимущественно реальные фото: выбор и provenance в content/city-pages/media.json, сток не подставлять вместо подтверждённых городских кадров. Не копировать людей, цены, длительность и ландшафт Далата во все города. Подробности: docs/CITY_PAGES.md.

Только /ru использует предоставленный content/homepage-ru/reference.html. Структура и исходник сохранены; body.html и styles.css генерирует scripts/prepare-ru-home.mjs. Все селекторы ограничены .ru-aggregator; не переносить этот дизайн на остальные страницы без поручения. Цвета --pine #153a27, --pine2 #0a2418, --orange #f15a24, --orange2 #ff7440, --ink #141714, --muted #6e766f, --warm #f3f2ec, --cream #ece9df, --line #d8ddd8. Локальные Manrope 400–800 и Unbounded 500–800; контейнер --max 1380px, отступы 32/20/14/12px, header 76/66px. Радиусы 5–10px, pills 999px; градиенты поверх фотографий, тени у плавающих действий. Media queries 520/820/1024/1100/1280px. Цветной логотип выводить без brightness/invert: исходный фильтр превращал его в белый прямоугольник. Не удалять будущие направления. Существующие предложения имеют ссылки в каталог, будущие открывают подбор. Контакты из content/homepage-ru/contacts.json: Telegram для связи отличается от канала, Google Maps только Далат; неизвестный Facebook не заменять вымышленным адресом. Формы /api/home-inquiries сохраняют общую заявку без привязки к выдуманному предложению. Отсутствующий MP4 заменён его исходным постером.

### Enduro tour detail / RU

Clean-blocks v4 source: `content/enduro-tours/reference-dalat-3h.html`; scoped `.enduro-tour`, generated styles via `node scripts/prepare-tour-styles.mjs`. Tokens: orange #f15a24; pine #173d2a; pine-dark #0d281b; ink #171717; text #262a26; muted #59605a; cream #f6f5f0; pale #e8efe9; line #dfe3dd. Container 1240px; gutters 48/32/24px, media queries 1250/900/600px. Header 74/64px, radii 10/16/20px, section padding 58/48/42px. Local Manrope UI and Bricolage Grotesque display 500–700; Russian glyphs use an explicit Manrope fallback. Preserve 13 ordered sections and real product data; no shared demo price, guide count, inclusions or video. Contract: docs/ENDURO_TOURS.md.

### Rental / RU

City landing source: `content/rentals/reference-dalat-v1.html`; scope `.rental-page`, renderer `components/rentals/`. Use homepage Manrope/Unbounded and tokens pine #153a27, pine-dark #0a2418, orange #f15a24, ink #141714, muted #6e766f, soft #f3f2ec, line #d8ddd8. Container min(1380px, viewport - 64px), mobile -24px; source breakpoints 640/980px; card radius 8px, button 5px, pills 999px; header 76/68px. Structure from rental reference, fonts/colors/buttons/gutters from main page per owner. Preserve server catalog filtering/pagination and all inventory IDs; do not replace the database with the seven example scooters. Full contract: docs/RENTAL_PAGES.md.
