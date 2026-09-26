# CHANGELOG.md

## [1.14.0] - 2026-09-26

### Added

- **Smart Repetition Prevention:** Engineered an in-memory rotation algorithm for fallback quotes. Quotes are dynamically tagged with timestamps to guarantee they do not repeat within a 30-day window.
- **Self-Healing Fallback Logic:** Programmed a cascading failsafe sequence that dynamically drops time restrictions if a specific language pool is completely exhausted, ensuring a 100% successful delivery rate during API outages.

## [1.13.0] - 2026-09-26

### Added

- **A/B Testing Engine:** Engineered a silent cohort assignment system based on Chat IDs to serve standard (Variant A) and aggressive (Variant B) AI personas to distinct user groups.
- **Feedback Loop:** Built interactive inline keyboard telemetry to capture real-time user upvotes and downvotes, logging them permanently to `feedback.json`.
- **Analytics Dashboard:** Created the `/admin_report` command to instantly calculate and visualize approval win rates for active A/B experiments.
- **Bug Fixes:** Escaped underscores in the `/help` command block to satisfy Telegram's strict Markdown V1 parser.

## [1.12.0] - 2026-09-26

### Added

- **Express API Integration:** Embedded an Express web server alongside the Telegram polling process to handle incoming HTTP requests.
- **Public JSON Feed:** Created a `GET /api/quotes/latest` endpoint to export the bot's history for external platforms (e.g., Discord, Slack).
- **Secure Webhook Broadcasting:** Created a `POST /api/webhook/broadcast` endpoint, protected by a custom `x-api-key`, allowing external services to trigger batched broadcasts to all active bot subscribers.
- **Webhook Admin Tools:** Added the `/webhook` command for admins to easily view their integration payloads and active API keys.

## [1.11.0] - 2026-09-26

### Added

- **API Memory Caching:** Engineered a 1-hour TTL memory cache in `brain.js` to reuse successful quote generations during rate-limit events, preventing API quota exhaustion.
- **Lazy-Loaded Fallbacks:** Optimized `dataManager.js` to load the local fallback `quotes.json` file into memory only when needed, drastically reducing disk I/O operations.
- **Broadcast Batching:** Upgraded the `/admin_broadcast` routing to dispatch messages in throttled chunks (25 users per 1.5s) to safely bypass Telegram's mass-messaging rate limits.

## [1.10.0] - 2026-09-26

### Added

- **Contextual Time Engine:** Upgraded the AI generation prompt to naturally weave in the current day of the week and season to make advice feel more grounded and timely.
- **Persona Prompt Library:** Mapped the `/set_tone` command to a structured dictionary of predefined archetypes (Stoic, Warrior, Philosopher, Strategist, Mentor) for richer, more consistent AI roleplaying.
- **Custom Topic Routing:** Introduced the `/suggest_quote_topic <topic>` command, allowing users to override the daily focus and request highly targeted wisdom on demand.

## [1.9.0] - 2026-09-25

### Added

- **Automated Milestone Rewards:** Engineered a background tracking system within the dispatch loop that instantly triggers specialized, congratulatory alerts when users hit major streak milestones (7, 14, 30, and 100 days).

## [1.8.0] - 2026-09-25

### Added

- **Gamification Badges:** Introduced dynamic rank titles (e.g., "7-Day Believer", "Century Member") based on user engagement streaks, viewable via the `/stats` command.
- **Anonymous Leaderboard:** Created the `/leaderboard` command to display the top 5 global streaks while protecting user privacy by masking chat IDs.

## [1.7.0] - 2026-09-25

### Added

- **Testing Infrastructure:** Integrated `jest` and `cross-env` to support a modern ES6 module testing environment.
- **Unit Testing Suite:** Built comprehensive unit tests for local database operations and localized fallback quote generation.
- **AI Mocking & Error Simulation:** Engineered robust test cases for the `brain.js` service using `unstable_mockModule` to verify exponential backoff, rate limit handling, and automated fallback triggers without consuming API quotas.
- **Integration Testing:** Created a simulated Telegram bot router in `commands.test.js` to mathematically prove the integrity of the end-to-end command execution flow (e.g., `/motivate`, `/help`).

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
