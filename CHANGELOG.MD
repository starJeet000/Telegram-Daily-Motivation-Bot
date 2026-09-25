# CHANGELOG.md

## [1.6.0] - 2026-09-25

### Added

- **Advanced Scheduling Options:** Engineered support for optional Midday (1 PM), Evening (6 PM), and Weekly (Sunday 7 PM) automated dispatches alongside the default morning broadcast.
- **Interactive Schedule Management:** Implemented the `/schedule` command, enabling users and groups to independently toggle their personalized delivery timeframes on the fly.
- **Time-Contextual AI Prompts:** Upgraded the `brain.js` generation logic to dynamically inject time-of-day contextual instructions into the Gemini prompt (e.g., driving morning momentum vs. prompting evening reflection).
- **Database Schema Migration:** Updated the data manager to seamlessly append a nested `schedule` configuration object to all new and legacy user profiles without data loss.

## [1.5.0] - 2026-09-25

### Added

- **Multi-User & Group Chat Support:** Shifted database primary keys from `userId` to `chatId`, seamlessly enabling group chat compatibility and shared state management.
- **Subscription Management:** Added `/subscribe` and `/unsubscribe` commands to allow users and groups to easily opt in or out of automated dispatches.
- **Broadcast Orchestration:** Refactored the daily cron job to dynamically loop through all active subscribers and generate uniquely personalized AI payloads for each chat.
- **Rate Limit Protection:** Implemented a non-blocking 2-second transmission buffer during mass broadcasts to strictly adhere to Telegram's API rate limits.

## [1.4.0] - 2026-09-25

### Added

- **Multi-Language Support:** Updated `quotes.json` and fallback generator to seamlessly provide localized fallback quotes matching the user's `/set_language` preference.
- **Dynamic Configuration Management:** Engineered a real-time `config.json` system controlling `maxRetries`, `enableAnalytics`, and `fallbackQuoteMode`.
- **Runtime Admin Controls:** Added `/config` and `/set_config` admin commands to tweak system parameters on the fly without requiring a Node server restart.

## [1.3.0] - 2026-09-25

### Added

- **Administrative Infrastructure:** Created `admin.js` router featuring `/admin_stats`, `/admin_users`, and `/admin_broadcast` commands.
- **Role-Based Access Control:** Hardened admin routes with a strict identity check against the environment `adminChatId`.
- **Automated Database Maintenance:** Engineered an `archiveInactiveUsers` cleanup function.
- **Secondary Cron Job:** Scheduled a midnight execution for the database cleanup to automatically flag and archive users dormant for >30 days.
- **Environment Documentation:** Added `.env.example` for developer onboarding.

## [1.2.1] - 2026-09-25

### Added

- **UI Enhancements:** Added dynamic streak counters and randomized contextual emojis (🔥💪⚡🎯) to all daily dispatches and `/motivate` payloads.
- **On-Demand Recall:** Implemented the `/today` command to instantly fetch the most recently generated quote from the daily history.

## [1.2.0] - 2026-09-25

### Changed

- **Architectural Overhaul:** Refactored the monolithic `index.js` into a scalable, professional Node.js project structure using ES6 modules.
- **Separation of Concerns:** Decoupled Telegram routing (`commands.js`, `actions.js`) from AI generation logic (`brain.js`) and file I/O operations (`dataManager.js`).
- **Configuration Management:** Centralized environment variables and validation into `env.js`.
- **Database Organization:** Moved all local storage files (`users.json`, `quotes.json`, `logs-*.json`) out of the root directory and into a dedicated `database/` folder.

## [1.1.0] - 2026-09-25

### Added

- **Interactive Commands:** Added `/motivate`, `/help`, `/history`, and `/stats` commands for two-way user engagement.
- **Personalization:** Users can now set custom tones (`/set_tone`) and languages (`/set_language`), dynamically altering the Gemini AI prompt.
- **Telemetry System:** Implemented a monthly rotating JSON logging system to track response times, api success rates, and user interactions.
- **Resilience Engine:** Added exponential backoff retry logic (30s -> 2m) for Gemini API rate limits/failures.
- **Admin Alerts:** The bot now automatically sends API failure diagnostics directly to the admin's Telegram chat.
- **Centralized Data:** Abstracted fallback quotes into a metadata-rich `quotes.json` file and user data into `users.json`.
- **Feedback Loop:** Added inline keyboard buttons (👍/👎) to generated quotes to track user resonance.
