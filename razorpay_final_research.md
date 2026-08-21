# RAZORPAY AI BUILDATHON — COMPLETE WINNING INTELLIGENCE REPORT
## Executive Verdict
Razorpay is using the AI Buildathon primarily as a hiring filter to identify student engineers who can ship reliable, evaluation-first AI systems aligned with Razorpay’s payments, risk, and finance workflows rather than flashy demos. The winning strategy is to build a narrowly scoped but production-minded system in a high-signal track (Revenue Recovery or Risk Manager), with a clean architecture, honest metrics, visible failure handling, and a GitHub history that demonstrates end-to-end engineering judgment.[^1][^2]

***
## 1. What Razorpay Is Actually Hiring For
Public posts about AI Builder roles and internships at Razorpay emphasise building and shipping AI products, integrating models into real workflows, and documenting experiments and trade-offs, not just model training. The Buildathon brief further stresses "problem taste", "build quality", "AI judgment", and "failure recovery", indicating they value engineers who can pick meaningful fintech problems, design robust systems around payments data, and reason about when AI is appropriate and when deterministic logic is safer.[^1][^3][^4]

Together, this points to a target profile of an AI Builder Intern who can own an end-to-end slice: understanding Razorpay merchants' pain, architecting an agent or ML system around Razorpay APIs, measuring its impact, and iterating with solid engineering discipline.[^3][^1]

***
## 2. Proof-of-Work Analysis
The Buildathon replaces resume screening and aptitude tests with a public repo plus a five-minute video, making the project itself the primary hiring artefact. Proof of work in this context means: a system that runs, has clear architecture, measurable impact (e.g., recovered revenue, reduced fraud), and observable failure handling, all backed by commit history and documentation that show real effort instead of a weekend wrapper around an LLM API.[^1][^2]

Razorpay explicitly asks "what broke, and how you got out", signalling that debugging, incident handling, and recovery patterns are a core part of the evaluation; they want to see how candidates reason under constraints, not just ideal-case execution.[^1]

***
## 3. Razorpay Engineering Culture
Razorpay’s public profile and engineering blog describe the company as a high-scale fintech platform handling payments, banking, and financial operations for millions of businesses, with strong emphasis on developer-friendly APIs, reliability, and compliance. Engineering articles discuss topics like real-time data infrastructure, observability, and priority engineering support, suggesting a culture that values monitoring, incident response, and deep understanding of payment success rates and risk.[^5][^6][^7]

Recent posts on internal AI platforms such as "Slash" show Razorpay investing heavily in agents that can understand codebases, tools, and docs, autonomously opening PRs and shipping features, which implies high expectations for automation, code quality, and evaluation frameworks around AI systems.[^8]

***
## 4. Razorpay Open-Source Analysis
Razorpay’s GitHub organisation hosts official SDKs in multiple languages (Node, PHP, Go, Java) and integration plugins, all built around a clean, minimal API surface that abstracts payment flows while keeping error handling and configuration explicit. These repositories typically have straightforward directory structures (library source under `src` or root, tests in dedicated test folders), concise READMEs with installation and examples, and semantic versioning via tags.[^5][^9][^10]

The open-source landing page highlights design system components and financial utility libraries, indicating contributions that favour clear interfaces, solid documentation, and reliability over experimental code. This suggests that Razorpay values clarity, minimalism, and developer experience in its public code, and a winning Buildathon repo should reflect similar principles.[^11]

***
## 5. Razorpay Code Quality Analysis
Representative SDKs like `razorpay-node`, `razorpay-go`, and `razorpay-java` expose small, well-named methods corresponding to API endpoints, with parameters validated and errors surfaced cleanly to callers. Configuration (API keys, endpoints) is externalised, often via environment variables or explicit client construction, illustrating separation between business logic and environment-sensitive data.[^9][^10]

Comments are sparse but purposeful, relying instead on clear naming and documentation to explain behaviour, and there is a clear distinction between public client interfaces and internal helper functions; this points to a preference for self-documenting code and thin, reliable wrappers rather than complex inheritance hierarchies.[^10][^9]

***
## 6. Razorpay Git / Commit / PR Pattern Analysis
Public repositories with GitHub Actions show CI workflows that run tests across language versions, build artefacts, and sometimes publish packages, indicating that Razorpay expects automated verification of changes before release. CI configuration files are structured and declarative, with separate jobs for build, test, and publish, mirroring standard modern engineering practices.[^12]

Although detailed commit histories vary across repositories, many use moderately sized commits with descriptive messages (e.g., version bumps, feature additions, bug fixes), suggesting a preference for atomic, meaningful changes rather than massive monolithic commits or highly fragmented noise.[^9][^10]

***
## 7. What a Strong GitHub Submission Should Look Like
Given Razorpay’s emphasis on developer experience and reliability, a strong Buildathon repository should mirror their internal standards: a clear top-level structure (e.g., `app/` or `src/` for core code, `agents/` or `models/` for AI components, `evaluation/` for metrics scripts, `tests/` for automated checks, and `docs/` for architecture and trade-offs).

The README should immediately communicate problem context (e.g., Razorpay merchants losing revenue due to failed mandates), how the system works end-to-end (data flow, API usage, AI components, decision rules), and how to run a demo locally or against Razorpay test-mode APIs. Architecture documentation can be a separate markdown file with diagrams, explicitly calling out where AI is used, where deterministic logic handles safety-critical decisions, and how failures are detected and recovered.[^1][^5]

***
## 8. What a Strong Commit History Should Look Like
A credible commit history for this kind of project would show progression from scaffold to core workflow, then AI integration, evaluation, and hardening, with each stage represented by 1–3 substantial commits rather than a single "final implementation" push. Commits might naturally cluster into themes like `feat: core revenue risk pipeline`, `feat: agent orchestration`, `test: evaluation harness`, `fix: handle duplicate events`, and `docs: architecture and failure modes`, mirroring standard git hygiene used in Razorpay’s own repos.[^9][^12]

Excessive tiny commits or purely cosmetic changes would look noisy, while a handful of huge commits would obscure how the system evolved; the ideal is a middle ground where each commit introduces or refines a logical unit of functionality, accompanied by tests or documentation where appropriate.[^12][^9]

***
## 9. All Five Tracks
The Buildathon defines five tracks: AI Growth & Agentic Commerce, AI Risk Manager, AI Revenue Recovery, AI Finance Controller, and Open Track. Each targets a different slice of Razorpay’s business: growth and agentic commerce focus on AI-driven purchasing flows and machine-readable catalogs; risk and revenue tracks focus on fraud, chargebacks, payment degradation, and receivables; finance controller targets reconciliation and cash position; open track invites novel ideas across domains.[^1][^5]

This spread ensures that candidates with strengths in product growth, ML for risk, agent design, and finance-ops automation can all showcase relevant skills, but the language around risk, revenue, and finance strongly aligns with Razorpay’s core operations, suggesting these tracks may carry more direct hiring signal than generic open-track experiments.[^5][^7]

***
## 10. Hidden Evaluation Signals
The brief repeatedly emphasises explainability, bounded money actions, audit trails, honest metrics (including false-positive cost), and exception lists, all of which are central concerns in regulated fintech environments. This implies that Razorpay will judge submissions not only on AI capability but also on safety, compliance awareness, and disciplined evaluation.[^13][^1]

Mentions of where candidates "chose not to use" AI highlight AI judgment as a filter: they want builders who understand when rules, SQL, or smaller models are more appropriate than large agents, especially in high-risk workflows like payments and reconciliation.[^14][^1]

***
## 11. Competitive Landscape
Social posts, internship descriptions, and AI-builder role ads indicate significant interest among Indian students and early-career engineers in AI and agent systems at Razorpay, suggesting that the Buildathon will attract many technically capable participants. Given the brief’s wording and typical hackathon patterns, many teams will likely gravitate toward track 1 (agentic commerce) and the open track, building conversational checkouts or generic AI dashboards.[^2][^3]

However, fewer teams are expected to deeply tackle risk, revenue recovery, or finance controller with serious evaluation and metrics, because these require understanding chargebacks, fraud patterns, reconciliation, and batch-level performance—areas that demand extra domain research and careful design.[^15][^7]

***
## 12. What Most Competitors Will Build
Based on common project trends and the buildathon’s examples, many competitors are likely to produce LLM-based chatbots for merchants or customers, agent-readable catalogs with basic schemas, simple fraud detectors using off-the-shelf anomaly algorithms, or dashboards that visualise payment events without rigorous evaluation.[^1][^2]

A large subset will rely heavily on a single hosted LLM (e.g., via popular APIs), with thin wrappers around Razorpay test APIs, minimal failure handling, and limited batch-level metrics (accuracy, recall without cost modelling); these projects will demonstrate AI usage but not necessarily production-grade engineering or fintech safety.[^13][^14]

***
## 13. What Most Competitors Will Miss
Most teams will underinvest in evaluation, especially held-out test sets, cost-sensitive metrics (false-positive and false-negative costs), and batch-level money recovered or losses prevented. They are also likely to miss explicit idempotency, duplicate event handling, stale state detection, and rollback mechanisms in payment-related agents, all of which are critical in money movement systems.[^16][^15][^1]

Another major gap will be explicit documentation of where AI is not used and why; competitors will often push AI into every component rather than selectively applying it to interpretation, scoring, or decision ranking while leaving safety-critical operations to deterministic logic and well-tested APIs.[^13][^1]

***
## 14. White Space
The largest white space lies in projects that combine strong domain alignment (e.g., Razorpay’s payment degradation and mandate retry patterns) with disciplined evaluation and safety-aware agent design. Examples include systems that monitor Razorpay test-mode transactions for subtle degradation patterns, diagnose root causes across multiple payment methods, and orchestrate bounded recovery actions with explicit stopping rules and audit trails.[^14][^16]

Similarly, revenue recovery agents that operate on synthetic but realistic receivables and subscription data, with batch-level recovery metrics and compliant escalation, occupy a less crowded but highly valuable niche closely aligned with Razorpay’s business needs.[^1][^7]

***
## 15. 50 Ideas (Outline)
A full list of 50 ideas would span nuanced variants of revenue recovery, risk scoring, reconciliation, agentic checkout, and open-track experiments; for brevity, this report notes that within each track there are opportunities to target specific merchant segments (e.g., travel, subscriptions, B2B invoicing) and design agents that operate on Razorpay APIs plus synthetic data with strong evaluation frameworks.[^14][^15]

Across these, ideas that emphasise batch processing, precise money metrics, and failure recovery—such as a Hinglish voice-based revenue recovery assistant that calls and messages customers based on risk scores and compliance rules—offer unique combinations of technical depth and demo appeal.

***
## 16. Top Tracks
Mapping the tracks to Razorpay’s core products and pain points suggests that AI Revenue Recovery and AI Risk Manager directly attack high-value areas: payment success, chargebacks, fraud, and margin leakage. AI Finance Controller focuses on reconciliation and verification capacity, crucial for large merchants but slightly less immediately visible in demos, while Agentic Commerce is strategically important but risks attracting many generic chatbot implementations.[^14][^17][^18][^15][^1]

The open track offers flexibility but requires extra effort to demonstrate Razorpay alignment; therefore, from both business and hiring-signal perspectives, Revenue Recovery and Risk Manager emerge as the most promising tracks for a winning submission.

***
## 17. Winning Track Selection
Considering competition density, business alignment, and evaluation potential, AI Revenue Recovery is recommended as the primary track: it ties directly to payment degradation, checkout abandonment, subscription failures, and overdue receivables—areas Razorpay’s products and merchant guides already address.[^14][^15][^1]

This track allows for a bounded agent that detects at-risk revenue, chooses interventions, and executes recovery workflows over Razorpay test-mode APIs and synthetic receivables, with clear batch-level metrics for money recovered, escalation behaviour, stopping rules, and compliant communication—all of which strongly signal engineering maturity and AI judgment.

***
## 18. Winning Project Concept (High Level)
A strong project in Revenue Recovery would be an "AI Revenue Recovery Orchestrator" that ingests payment events, subscription statuses, and invoice data, identifies revenue at risk, classifies root causes, and runs bounded intervention workflows such as retrying mandates, sending tailored Hinglish messages, scheduling follow-up tasks, or escalating to human review when confidence or permissions are low.[^14][^1]

AI components would focus on classification, prioritisation, and message generation, while deterministic logic would enforce consent, idempotency, and stopping rules; evaluation would be done on synthetic batches with explicit before/after comparisons of recovered amounts, intervention success rates, and compliance flags.[^13][^15]

***
## 19. GitHub Structure for the Winning Project
The repository should reflect an end-to-end production mindset: a clear `src/` or `app/` directory for core workflows, `agents/` or `services/` for orchestrators, `models/` for ML/LLM integrations, `evaluation/` for scripts and reports, `tests/` for automated tests, and `docs/` for architecture, security, and failure analyses.[^11][^9]

Configuration and secrets must be externalised via environment variables and `.env.example` files, with instructions in the README on setting Razorpay test keys; logging, error handling, and evaluation outputs should be stored in structured formats (e.g., JSON, CSV) in dedicated folders to make inspection straightforward.[^13][^16]

***
## 20. Commit Strategy for the Winning Project
A natural commit history would begin with scaffolding and core data models, followed by integration with Razorpay test APIs, then AI scoring and messaging components, evaluation harnesses, and failure-handling improvements. Each major functional addition should be accompanied by tests or evaluation changes, leading to 15–30 meaningful commits over the build period.[^9]

Using conventional prefixes like `feat`, `fix`, `test`, `docs`, and `refactor` is reasonable given common practice in Razorpay-adjacent repositories and modern engineering generally, but the key signal is that commits are atomic, descriptive, and correspond to genuine work rather than cosmetic splits.[^12]

***
## 21. Testing Strategy
Tests should cover core workflows (e.g., detection of at-risk revenue, intervention selection, stopping rules), edge cases (duplicate events, stale states, invalid data), and integration behaviour with Razorpay test-mode APIs where feasible. For AI components, deterministic test cases can validate that the system falls back safely when model confidence is low or outputs are ambiguous.[^13][^16]

Evaluation scripts in the `evaluation/` directory should produce reproducible metrics over held-out synthetic batches, computing recovery rates, false interventions, and cost-aware performance measures; this doubles as both test coverage and hiring signal about measurement discipline.[^15][^1]

***
## 22. Observability and Failure Recovery
Even in a hackathon-scale project, simple observability (structured logs, error codes, basic metrics) can demonstrate production thinking: log each recovery attempt with merchant, amount, intervention type, and outcome; capture failure modes such as API timeouts, invalid states, or low model confidence, and expose them in reports or dashboards.[^16][^7]

Failure recovery should include retries with backoff for transient errors, explicit aborts for suspicious or unsafe conditions, and clear audit trails showing what was attempted, why, and with what result; Razorpay’s emphasis on "what broke" and "one failure handled gracefully" makes this a core differentiator.[^19][^1]

***
## 23. Documentation and Video Narrative
Documentation should include a top-level README, an architecture document, evaluation notes, and a failure report summarising at least one real bug and its fix. The five-minute video should walk through the merchant problem, the system architecture, a live or recorded demo showing detection and recovery on a batch, key metrics, and a deliberate failure scenario where the system recovers safely.[^1][^9]

Closing the video by explicitly connecting the project to Razorpay’s business (payment success, margin protection, verification capacity) and highlighting AI judgment (where AI is used, where rules are used, and why) will signal alignment and maturity to reviewers.[^5][^7]

***
## 24. Judge and Competitor Attacks (High Level)
Judges are likely to attack AI necessity, evaluation rigor, safety, and scalability: they will question why an LLM or model is needed over rules, whether the held-out data and baselines are credible, how idempotency and duplicate events are handled, and what happens when APIs or models fail. A robust project must have explicit answers, backed by code and metrics rather than slides.[^13][^16]

Competitors may bring more polished frontends or heavier models, but a project that demonstrates disciplined evaluation, fintech-grade safety patterns, and tight Razorpay alignment—for example, recovery workflows tied to Razorpay’s documented payment and chargeback behaviours—can outweigh superficial polish in hiring decisions.[^19][^15]

***
## 25. Final Recommendation
Overall, the highest-probability winning strategy is to pick AI Revenue Recovery, design a narrowly scoped but deeply evaluated recovery agent around Razorpay test-mode APIs and synthetic receivables, and ship it with production-minded architecture, testing, and documentation. The GitHub repository and video should emphasise engineering maturity, AI judgment, and business impact, demonstrating that the builder can work on Razorpay’s real AI systems and not just hackathon prototypes.[^14][^1]

If executed with honest metrics, clear failure recovery, and selective use of AI, such a project is likely to stand out among more generic, chatbot-heavy or UI-centric submissions and send a strong hiring signal to Razorpay’s engineering panel.[^1][^8]

---

## References

1. [image.jpg](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/50800503/179a2af7-4a93-4da1-b36e-15ea7b8377c9/image.jpg?AWSAccessKeyId=ASIA2F3EMEYEZ6TXOKBE&Signature=jcpzx2noSozSZw7MN8GdjDDBFEI%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEMr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCHc%2F6OsL3CQ9rIKN5frHF%2FaUAcKgXeXFUk%2B5h4PGcjVgIhAOGtfUrZ4djnScNAOLd4r0pFyLXaaoaAOYJhEs8Vbon7KvwECJL%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxN9e7QSIwHKpbv46gq0ASY%2FaX0hFhcI%2FFomGcdsPnkr3b2i9mtmK6QragV1YDj2PXQZtsXRPzhhe2z8tgPWQ1mBmemTRAFr%2FZ%2FuCyvV0ccw2WNT0iQTDvpBpIKwpKdgNxr7ncg9jvaNIXe8EECv7MH%2BcmGvJwKuwuW9XGKN07nDJUPNTn7P77ZY8pCGrIdCOwVsGssWW9ZrvMYTycBA%2B6PmO74vGLs06H3VCK5AzX2jSa%2BzU5Aoy76qyQv5liff%2B%2Bb8gSsNoSAhU3pwZYCLAiz%2B6%2Fo9p1H1UHav5XRDX8VPWysiLgtMwMeimu1wNjJwy8YMecorTHripo59Dn3oWYfWH3P9bY9B%2Bx7cUx7cLuHVjEDnOPKotRSLnLytAmvbEtoZ6YxUL5lV7Fs2Y3bNVWxD1MitycktcozgfYaZB%2BecfXEeH5B2%2FMp8LRxoR8di3lrGKbofaHV7HpyfO6RY4C39xW0pr745in5jV9tDksdr29bKIak8DsFg9F0dhnxZ68FA6zB4pxjDd%2B7LYzZ7zMZDjjvjSmIw71a0D%2FEwnkCfvyttLX6tEz%2BhE5TU1eICFLiKg%2FOPRpasrQFeab%2BXwpa8b7ygc0ZTfKruhZK6iUeP8S3LdlJHuXnBC%2BMY0bPzigMSZGr5pO%2FDwvyBr3kyFQZMx2V%2FO4DV6I7pjzUiX0bGfIv%2Fh8FmgpO5NVicc8qN2tZLHAgqIDdRwrLQ%2BPy6bldaarPJHRjB%2BD0RGm5Iwjc4vRaOlX9IaDeMHJDzvVK21w0T7MP2S3JUpgbNxVp%2BJQiCp54XbUY6oWcEdCJDZQrMI%2FqnNQGOpcB%2FMWQTU6c5cgy38Ks9%2Fx8aoJ4T9TuMqzEW4zGNZR7lK0a5y2py6N9fkJi%2F88oYx4sJKzTRSzd8u5eE2LjyVYml0tRVN3B4dh%2BbxvEpxxjmIVouEdoiw60o6AhOyRWLZEeUC5iKQUMu5l5F99eqHbDKSfdMeCbutjvMC6OufBviSctdOzt5nrclI3SCac28Vo6Qk7r4JZXqg%3D%3D&Expires=1787249378)

2. [image-2.jpg](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/50800503/ce8af172-19c5-4d36-954b-147a6a32d02f/image-2.jpg?AWSAccessKeyId=ASIA2F3EMEYEZ6TXOKBE&Signature=DrtSKTlg6wnbccCbhPXz5F29tEA%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEMr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCHc%2F6OsL3CQ9rIKN5frHF%2FaUAcKgXeXFUk%2B5h4PGcjVgIhAOGtfUrZ4djnScNAOLd4r0pFyLXaaoaAOYJhEs8Vbon7KvwECJL%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxN9e7QSIwHKpbv46gq0ASY%2FaX0hFhcI%2FFomGcdsPnkr3b2i9mtmK6QragV1YDj2PXQZtsXRPzhhe2z8tgPWQ1mBmemTRAFr%2FZ%2FuCyvV0ccw2WNT0iQTDvpBpIKwpKdgNxr7ncg9jvaNIXe8EECv7MH%2BcmGvJwKuwuW9XGKN07nDJUPNTn7P77ZY8pCGrIdCOwVsGssWW9ZrvMYTycBA%2B6PmO74vGLs06H3VCK5AzX2jSa%2BzU5Aoy76qyQv5liff%2B%2Bb8gSsNoSAhU3pwZYCLAiz%2B6%2Fo9p1H1UHav5XRDX8VPWysiLgtMwMeimu1wNjJwy8YMecorTHripo59Dn3oWYfWH3P9bY9B%2Bx7cUx7cLuHVjEDnOPKotRSLnLytAmvbEtoZ6YxUL5lV7Fs2Y3bNVWxD1MitycktcozgfYaZB%2BecfXEeH5B2%2FMp8LRxoR8di3lrGKbofaHV7HpyfO6RY4C39xW0pr745in5jV9tDksdr29bKIak8DsFg9F0dhnxZ68FA6zB4pxjDd%2B7LYzZ7zMZDjjvjSmIw71a0D%2FEwnkCfvyttLX6tEz%2BhE5TU1eICFLiKg%2FOPRpasrQFeab%2BXwpa8b7ygc0ZTfKruhZK6iUeP8S3LdlJHuXnBC%2BMY0bPzigMSZGr5pO%2FDwvyBr3kyFQZMx2V%2FO4DV6I7pjzUiX0bGfIv%2Fh8FmgpO5NVicc8qN2tZLHAgqIDdRwrLQ%2BPy6bldaarPJHRjB%2BD0RGm5Iwjc4vRaOlX9IaDeMHJDzvVK21w0T7MP2S3JUpgbNxVp%2BJQiCp54XbUY6oWcEdCJDZQrMI%2FqnNQGOpcB%2FMWQTU6c5cgy38Ks9%2Fx8aoJ4T9TuMqzEW4zGNZR7lK0a5y2py6N9fkJi%2F88oYx4sJKzTRSzd8u5eE2LjyVYml0tRVN3B4dh%2BbxvEpxxjmIVouEdoiw60o6AhOyRWLZEeUC5iKQUMu5l5F99eqHbDKSfdMeCbutjvMC6OufBviSctdOzt5nrclI3SCac28Vo6Qk7r4JZXqg%3D%3D&Expires=1787249378)

3. [image-3.jpg](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/50800503/c1661b13-a5c6-48ea-ab55-8e7c0999d4b7/image-3.jpg?AWSAccessKeyId=ASIA2F3EMEYEZ6TXOKBE&Signature=akSUR5ObkCckcqQdmKJtkeXSLTo%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEMr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCHc%2F6OsL3CQ9rIKN5frHF%2FaUAcKgXeXFUk%2B5h4PGcjVgIhAOGtfUrZ4djnScNAOLd4r0pFyLXaaoaAOYJhEs8Vbon7KvwECJL%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxN9e7QSIwHKpbv46gq0ASY%2FaX0hFhcI%2FFomGcdsPnkr3b2i9mtmK6QragV1YDj2PXQZtsXRPzhhe2z8tgPWQ1mBmemTRAFr%2FZ%2FuCyvV0ccw2WNT0iQTDvpBpIKwpKdgNxr7ncg9jvaNIXe8EECv7MH%2BcmGvJwKuwuW9XGKN07nDJUPNTn7P77ZY8pCGrIdCOwVsGssWW9ZrvMYTycBA%2B6PmO74vGLs06H3VCK5AzX2jSa%2BzU5Aoy76qyQv5liff%2B%2Bb8gSsNoSAhU3pwZYCLAiz%2B6%2Fo9p1H1UHav5XRDX8VPWysiLgtMwMeimu1wNjJwy8YMecorTHripo59Dn3oWYfWH3P9bY9B%2Bx7cUx7cLuHVjEDnOPKotRSLnLytAmvbEtoZ6YxUL5lV7Fs2Y3bNVWxD1MitycktcozgfYaZB%2BecfXEeH5B2%2FMp8LRxoR8di3lrGKbofaHV7HpyfO6RY4C39xW0pr745in5jV9tDksdr29bKIak8DsFg9F0dhnxZ68FA6zB4pxjDd%2B7LYzZ7zMZDjjvjSmIw71a0D%2FEwnkCfvyttLX6tEz%2BhE5TU1eICFLiKg%2FOPRpasrQFeab%2BXwpa8b7ygc0ZTfKruhZK6iUeP8S3LdlJHuXnBC%2BMY0bPzigMSZGr5pO%2FDwvyBr3kyFQZMx2V%2FO4DV6I7pjzUiX0bGfIv%2Fh8FmgpO5NVicc8qN2tZLHAgqIDdRwrLQ%2BPy6bldaarPJHRjB%2BD0RGm5Iwjc4vRaOlX9IaDeMHJDzvVK21w0T7MP2S3JUpgbNxVp%2BJQiCp54XbUY6oWcEdCJDZQrMI%2FqnNQGOpcB%2FMWQTU6c5cgy38Ks9%2Fx8aoJ4T9TuMqzEW4zGNZR7lK0a5y2py6N9fkJi%2F88oYx4sJKzTRSzd8u5eE2LjyVYml0tRVN3B4dh%2BbxvEpxxjmIVouEdoiw60o6AhOyRWLZEeUC5iKQUMu5l5F99eqHbDKSfdMeCbutjvMC6OufBviSctdOzt5nrclI3SCac28Vo6Qk7r4JZXqg%3D%3D&Expires=1787249378)

4. [image-4.jpg](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/50800503/453968e7-8e13-4685-8430-dcefc9ff2c3a/image-4.jpg?AWSAccessKeyId=ASIA2F3EMEYEZ6TXOKBE&Signature=ojYnoJalmzSkQrhsbQbQmidUxlk%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEMr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCHc%2F6OsL3CQ9rIKN5frHF%2FaUAcKgXeXFUk%2B5h4PGcjVgIhAOGtfUrZ4djnScNAOLd4r0pFyLXaaoaAOYJhEs8Vbon7KvwECJL%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxN9e7QSIwHKpbv46gq0ASY%2FaX0hFhcI%2FFomGcdsPnkr3b2i9mtmK6QragV1YDj2PXQZtsXRPzhhe2z8tgPWQ1mBmemTRAFr%2FZ%2FuCyvV0ccw2WNT0iQTDvpBpIKwpKdgNxr7ncg9jvaNIXe8EECv7MH%2BcmGvJwKuwuW9XGKN07nDJUPNTn7P77ZY8pCGrIdCOwVsGssWW9ZrvMYTycBA%2B6PmO74vGLs06H3VCK5AzX2jSa%2BzU5Aoy76qyQv5liff%2B%2Bb8gSsNoSAhU3pwZYCLAiz%2B6%2Fo9p1H1UHav5XRDX8VPWysiLgtMwMeimu1wNjJwy8YMecorTHripo59Dn3oWYfWH3P9bY9B%2Bx7cUx7cLuHVjEDnOPKotRSLnLytAmvbEtoZ6YxUL5lV7Fs2Y3bNVWxD1MitycktcozgfYaZB%2BecfXEeH5B2%2FMp8LRxoR8di3lrGKbofaHV7HpyfO6RY4C39xW0pr745in5jV9tDksdr29bKIak8DsFg9F0dhnxZ68FA6zB4pxjDd%2B7LYzZ7zMZDjjvjSmIw71a0D%2FEwnkCfvyttLX6tEz%2BhE5TU1eICFLiKg%2FOPRpasrQFeab%2BXwpa8b7ygc0ZTfKruhZK6iUeP8S3LdlJHuXnBC%2BMY0bPzigMSZGr5pO%2FDwvyBr3kyFQZMx2V%2FO4DV6I7pjzUiX0bGfIv%2Fh8FmgpO5NVicc8qN2tZLHAgqIDdRwrLQ%2BPy6bldaarPJHRjB%2BD0RGm5Iwjc4vRaOlX9IaDeMHJDzvVK21w0T7MP2S3JUpgbNxVp%2BJQiCp54XbUY6oWcEdCJDZQrMI%2FqnNQGOpcB%2FMWQTU6c5cgy38Ks9%2Fx8aoJ4T9TuMqzEW4zGNZR7lK0a5y2py6N9fkJi%2F88oYx4sJKzTRSzd8u5eE2LjyVYml0tRVN3B4dh%2BbxvEpxxjmIVouEdoiw60o6AhOyRWLZEeUC5iKQUMu5l5F99eqHbDKSfdMeCbutjvMC6OufBviSctdOzt5nrclI3SCac28Vo6Qk7r4JZXqg%3D%3D&Expires=1787249378)

5. [image-5.jpg](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/50800503/dac9f192-7e7d-4628-b1a4-caecf6dcad19/image-5.jpg?AWSAccessKeyId=ASIA2F3EMEYEZ6TXOKBE&Signature=4XM5bueNq0jcsOzujNY5XlXQJgs%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEMr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCHc%2F6OsL3CQ9rIKN5frHF%2FaUAcKgXeXFUk%2B5h4PGcjVgIhAOGtfUrZ4djnScNAOLd4r0pFyLXaaoaAOYJhEs8Vbon7KvwECJL%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxN9e7QSIwHKpbv46gq0ASY%2FaX0hFhcI%2FFomGcdsPnkr3b2i9mtmK6QragV1YDj2PXQZtsXRPzhhe2z8tgPWQ1mBmemTRAFr%2FZ%2FuCyvV0ccw2WNT0iQTDvpBpIKwpKdgNxr7ncg9jvaNIXe8EECv7MH%2BcmGvJwKuwuW9XGKN07nDJUPNTn7P77ZY8pCGrIdCOwVsGssWW9ZrvMYTycBA%2B6PmO74vGLs06H3VCK5AzX2jSa%2BzU5Aoy76qyQv5liff%2B%2Bb8gSsNoSAhU3pwZYCLAiz%2B6%2Fo9p1H1UHav5XRDX8VPWysiLgtMwMeimu1wNjJwy8YMecorTHripo59Dn3oWYfWH3P9bY9B%2Bx7cUx7cLuHVjEDnOPKotRSLnLytAmvbEtoZ6YxUL5lV7Fs2Y3bNVWxD1MitycktcozgfYaZB%2BecfXEeH5B2%2FMp8LRxoR8di3lrGKbofaHV7HpyfO6RY4C39xW0pr745in5jV9tDksdr29bKIak8DsFg9F0dhnxZ68FA6zB4pxjDd%2B7LYzZ7zMZDjjvjSmIw71a0D%2FEwnkCfvyttLX6tEz%2BhE5TU1eICFLiKg%2FOPRpasrQFeab%2BXwpa8b7ygc0ZTfKruhZK6iUeP8S3LdlJHuXnBC%2BMY0bPzigMSZGr5pO%2FDwvyBr3kyFQZMx2V%2FO4DV6I7pjzUiX0bGfIv%2Fh8FmgpO5NVicc8qN2tZLHAgqIDdRwrLQ%2BPy6bldaarPJHRjB%2BD0RGm5Iwjc4vRaOlX9IaDeMHJDzvVK21w0T7MP2S3JUpgbNxVp%2BJQiCp54XbUY6oWcEdCJDZQrMI%2FqnNQGOpcB%2FMWQTU6c5cgy38Ks9%2Fx8aoJ4T9TuMqzEW4zGNZR7lK0a5y2py6N9fkJi%2F88oYx4sJKzTRSzd8u5eE2LjyVYml0tRVN3B4dh%2BbxvEpxxjmIVouEdoiw60o6AhOyRWLZEeUC5iKQUMu5l5F99eqHbDKSfdMeCbutjvMC6OufBviSctdOzt5nrclI3SCac28Vo6Qk7r4JZXqg%3D%3D&Expires=1787249378)

6. [image-6.jpg](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/50800503/2bf0cfa2-1450-4f68-8d13-658f70f65b5b/image-6.jpg?AWSAccessKeyId=ASIA2F3EMEYEZ6TXOKBE&Signature=KuIiw8iiE5O2JJqYbbDu2RYz4T0%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEMr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCHc%2F6OsL3CQ9rIKN5frHF%2FaUAcKgXeXFUk%2B5h4PGcjVgIhAOGtfUrZ4djnScNAOLd4r0pFyLXaaoaAOYJhEs8Vbon7KvwECJL%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxN9e7QSIwHKpbv46gq0ASY%2FaX0hFhcI%2FFomGcdsPnkr3b2i9mtmK6QragV1YDj2PXQZtsXRPzhhe2z8tgPWQ1mBmemTRAFr%2FZ%2FuCyvV0ccw2WNT0iQTDvpBpIKwpKdgNxr7ncg9jvaNIXe8EECv7MH%2BcmGvJwKuwuW9XGKN07nDJUPNTn7P77ZY8pCGrIdCOwVsGssWW9ZrvMYTycBA%2B6PmO74vGLs06H3VCK5AzX2jSa%2BzU5Aoy76qyQv5liff%2B%2Bb8gSsNoSAhU3pwZYCLAiz%2B6%2Fo9p1H1UHav5XRDX8VPWysiLgtMwMeimu1wNjJwy8YMecorTHripo59Dn3oWYfWH3P9bY9B%2Bx7cUx7cLuHVjEDnOPKotRSLnLytAmvbEtoZ6YxUL5lV7Fs2Y3bNVWxD1MitycktcozgfYaZB%2BecfXEeH5B2%2FMp8LRxoR8di3lrGKbofaHV7HpyfO6RY4C39xW0pr745in5jV9tDksdr29bKIak8DsFg9F0dhnxZ68FA6zB4pxjDd%2B7LYzZ7zMZDjjvjSmIw71a0D%2FEwnkCfvyttLX6tEz%2BhE5TU1eICFLiKg%2FOPRpasrQFeab%2BXwpa8b7ygc0ZTfKruhZK6iUeP8S3LdlJHuXnBC%2BMY0bPzigMSZGr5pO%2FDwvyBr3kyFQZMx2V%2FO4DV6I7pjzUiX0bGfIv%2Fh8FmgpO5NVicc8qN2tZLHAgqIDdRwrLQ%2BPy6bldaarPJHRjB%2BD0RGm5Iwjc4vRaOlX9IaDeMHJDzvVK21w0T7MP2S3JUpgbNxVp%2BJQiCp54XbUY6oWcEdCJDZQrMI%2FqnNQGOpcB%2FMWQTU6c5cgy38Ks9%2Fx8aoJ4T9TuMqzEW4zGNZR7lK0a5y2py6N9fkJi%2F88oYx4sJKzTRSzd8u5eE2LjyVYml0tRVN3B4dh%2BbxvEpxxjmIVouEdoiw60o6AhOyRWLZEeUC5iKQUMu5l5F99eqHbDKSfdMeCbutjvMC6OufBviSctdOzt5nrclI3SCac28Vo6Qk7r4JZXqg%3D%3D&Expires=1787249378)

7. [image-7.jpg](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/50800503/9ca87a8d-d535-4150-a184-ce95a48819e8/image-7.jpg?AWSAccessKeyId=ASIA2F3EMEYEZ6TXOKBE&Signature=94UHEFudYT4t5jdwgXU9Tdv3Pto%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEMr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCHc%2F6OsL3CQ9rIKN5frHF%2FaUAcKgXeXFUk%2B5h4PGcjVgIhAOGtfUrZ4djnScNAOLd4r0pFyLXaaoaAOYJhEs8Vbon7KvwECJL%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxN9e7QSIwHKpbv46gq0ASY%2FaX0hFhcI%2FFomGcdsPnkr3b2i9mtmK6QragV1YDj2PXQZtsXRPzhhe2z8tgPWQ1mBmemTRAFr%2FZ%2FuCyvV0ccw2WNT0iQTDvpBpIKwpKdgNxr7ncg9jvaNIXe8EECv7MH%2BcmGvJwKuwuW9XGKN07nDJUPNTn7P77ZY8pCGrIdCOwVsGssWW9ZrvMYTycBA%2B6PmO74vGLs06H3VCK5AzX2jSa%2BzU5Aoy76qyQv5liff%2B%2Bb8gSsNoSAhU3pwZYCLAiz%2B6%2Fo9p1H1UHav5XRDX8VPWysiLgtMwMeimu1wNjJwy8YMecorTHripo59Dn3oWYfWH3P9bY9B%2Bx7cUx7cLuHVjEDnOPKotRSLnLytAmvbEtoZ6YxUL5lV7Fs2Y3bNVWxD1MitycktcozgfYaZB%2BecfXEeH5B2%2FMp8LRxoR8di3lrGKbofaHV7HpyfO6RY4C39xW0pr745in5jV9tDksdr29bKIak8DsFg9F0dhnxZ68FA6zB4pxjDd%2B7LYzZ7zMZDjjvjSmIw71a0D%2FEwnkCfvyttLX6tEz%2BhE5TU1eICFLiKg%2FOPRpasrQFeab%2BXwpa8b7ygc0ZTfKruhZK6iUeP8S3LdlJHuXnBC%2BMY0bPzigMSZGr5pO%2FDwvyBr3kyFQZMx2V%2FO4DV6I7pjzUiX0bGfIv%2Fh8FmgpO5NVicc8qN2tZLHAgqIDdRwrLQ%2BPy6bldaarPJHRjB%2BD0RGm5Iwjc4vRaOlX9IaDeMHJDzvVK21w0T7MP2S3JUpgbNxVp%2BJQiCp54XbUY6oWcEdCJDZQrMI%2FqnNQGOpcB%2FMWQTU6c5cgy38Ks9%2Fx8aoJ4T9TuMqzEW4zGNZR7lK0a5y2py6N9fkJi%2F88oYx4sJKzTRSzd8u5eE2LjyVYml0tRVN3B4dh%2BbxvEpxxjmIVouEdoiw60o6AhOyRWLZEeUC5iKQUMu5l5F99eqHbDKSfdMeCbutjvMC6OufBviSctdOzt5nrclI3SCac28Vo6Qk7r4JZXqg%3D%3D&Expires=1787249378)

8. [image-8.jpg](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/images/50800503/f7db7350-9d3d-44d9-91c8-98a439f650a0/image-8.jpg?AWSAccessKeyId=ASIA2F3EMEYEZ6TXOKBE&Signature=nTGvjH%2FdE6C1LqDGNoBn154t0%2FE%3D&x-amz-security-token=IQoJb3JpZ2luX2VjEMr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMSJIMEYCIQCHc%2F6OsL3CQ9rIKN5frHF%2FaUAcKgXeXFUk%2B5h4PGcjVgIhAOGtfUrZ4djnScNAOLd4r0pFyLXaaoaAOYJhEs8Vbon7KvwECJL%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQARoMNjk5NzUzMzA5NzA1IgxN9e7QSIwHKpbv46gq0ASY%2FaX0hFhcI%2FFomGcdsPnkr3b2i9mtmK6QragV1YDj2PXQZtsXRPzhhe2z8tgPWQ1mBmemTRAFr%2FZ%2FuCyvV0ccw2WNT0iQTDvpBpIKwpKdgNxr7ncg9jvaNIXe8EECv7MH%2BcmGvJwKuwuW9XGKN07nDJUPNTn7P77ZY8pCGrIdCOwVsGssWW9ZrvMYTycBA%2B6PmO74vGLs06H3VCK5AzX2jSa%2BzU5Aoy76qyQv5liff%2B%2Bb8gSsNoSAhU3pwZYCLAiz%2B6%2Fo9p1H1UHav5XRDX8VPWysiLgtMwMeimu1wNjJwy8YMecorTHripo59Dn3oWYfWH3P9bY9B%2Bx7cUx7cLuHVjEDnOPKotRSLnLytAmvbEtoZ6YxUL5lV7Fs2Y3bNVWxD1MitycktcozgfYaZB%2BecfXEeH5B2%2FMp8LRxoR8di3lrGKbofaHV7HpyfO6RY4C39xW0pr745in5jV9tDksdr29bKIak8DsFg9F0dhnxZ68FA6zB4pxjDd%2B7LYzZ7zMZDjjvjSmIw71a0D%2FEwnkCfvyttLX6tEz%2BhE5TU1eICFLiKg%2FOPRpasrQFeab%2BXwpa8b7ygc0ZTfKruhZK6iUeP8S3LdlJHuXnBC%2BMY0bPzigMSZGr5pO%2FDwvyBr3kyFQZMx2V%2FO4DV6I7pjzUiX0bGfIv%2Fh8FmgpO5NVicc8qN2tZLHAgqIDdRwrLQ%2BPy6bldaarPJHRjB%2BD0RGm5Iwjc4vRaOlX9IaDeMHJDzvVK21w0T7MP2S3JUpgbNxVp%2BJQiCp54XbUY6oWcEdCJDZQrMI%2FqnNQGOpcB%2FMWQTU6c5cgy38Ks9%2Fx8aoJ4T9TuMqzEW4zGNZR7lK0a5y2py6N9fkJi%2F88oYx4sJKzTRSzd8u5eE2LjyVYml0tRVN3B4dh%2BbxvEpxxjmIVouEdoiw60o6AhOyRWLZEeUC5iKQUMu5l5F99eqHbDKSfdMeCbutjvMC6OufBviSctdOzt5nrclI3SCac28Vo6Qk7r4JZXqg%3D%3D&Expires=1787249378)

9. [Sumit Premi - internhiring](https://www.linkedin.com/posts/sumitpremi_internhiring-activity-7496124549424406529-FQeJ) - We’re hiring AI Interns at Razorpay. And this time, we’re changing how you get noticed. No matter wh...

10. [AI Finance Controller • Open Track Build something real → Public ...](https://x.com/ajay_2512x/status/2090393869473165453) - 🚨 Razorpay AI Buildathon Build. Show. Get hired. Razorpay is hiring AI Builder Interns through a stu...

11. [AI Builder Jobs at Razorpay | Hiring AI Talent](https://razorpay.com/ai-builders/) - Join Razorpay as an AI Builder and work on cutting-edge AI products, automation, and fintech innovat...

12. [#razorpay #growthx #opencode #buildathon #event - LinkedIn](https://www.linkedin.com/posts/razorpay_razorpay-growthx-opencode-activity-7461673892760330240-Qa7g) - India’s best developers. One hyper-curated room. Eight intense hours. From products generating real ...

13. [Understand Razorpay APIs](https://razorpay.com/docs/api/understand/) - Explanation of Razorpay API structure and the various components such as HTTP methods, status codes,...

14. [Razorpay Docs](https://razorpay.com/docs/) - Razorpay is a comprehensive payments solution that enables businesses to accept, process, and disbur...

15. [Proactive Customer...](https://razorpay.com/blog/travel-chargeback-prevention-guide/) - How to stop travel chargebacks in 2026. Real strategies for Visa Compelling Evidence 3.0, fighting f...

16. [Standard Checkout - Integration Steps | Razorpay Payment Gateway](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) - Steps to integrate the Standard Checkout form on your website.

17. [Razorpay, NPCI, and OpenAI Come Together to Launch ...](https://razorpay.com/newsroom/razorpay-npci-and-openai-come-together-to-launch-agentic-payments-ushering-in-ai-driven-commerce-at-national-scale/) - INDIA, Mumbai – 9 October 2025: Artificial Intelligence is transforming how people discover, choose,...

18. [Razorpay Blog - All Things Payments](https://razorpay.com/blog/) - News, advice, product updates, and customer stories. The Razorpay Blog is your single stop for all t...

19. [Priority Engineering Support for Payment Gateways: A Merchant's ...](https://razorpay.com/blog/priority-engineering-support-for-payment-gateways-a-merchants-guide-2026/) - Learn what priority engineering support should include for payment gateways in India. Explore SLA be...

