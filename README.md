# BREAKING BANK — Sheffield FinTech × Sheffield Ethical Hacking Society (ShefESH)
## FINAL HARD EDITION — university-level competitive investigation

This is the revised 7-round Node.js multiplayer game based on the existing Vaultbreak V9 host-guide edition, preserving its host controls, fictional evidence terminal, investigations, incident bulletins, optional verification, investment decisions, team scoring, and Sheffield FinTech logo.

### Seven genuinely tougher investigations
1. **Supplier Takeover: Header Forensics** — SPF/DKIM/DMARC alignment, forged reply-to domain, payment-authorisation thresholds; verification: £86,400 above dual-approval threshold.
2. **Transaction Laundering: Network Analysis** — payment graph, no double-counting of internal hops, external cash-out; verification: 69.16% cash-out.
3. **Privilege Escalation: Effective Permissions** — nested IAM groups and inherited production permissions; verification: 3 distinct privileges.
4. **Compromised Admin: Incident Timeline** — precise incident timestamps, queued export, containment vs evidence preservation; verification: 280 seconds.
5. **API Exploit: Broken Object Authorisation** — BOLA/IDOR, scoped access, breach-rate calculation; verification: 32.43%.
6. **Bank Run: Liquidity Stress and Cyber Risk** — funding line, settlement outflows and minimum buffer; verification: £1.0m shortfall.
7. **Boardroom: Risk-Adjusted Remediation** — costed control portfolio, expected loss reduction, uncertainty; verification: £350,000 net expected benefit.

### How to run
Install Node.js 22 or later. No npm packages need to be downloaded. Set HOST_PASSWORD in the environment as below, or copy .env.example to .env and choose your own organiser password.

Windows Command Prompt:

    set HOST_PASSWORD=YourPrivatePassword
    npm start

Open http://localhost:3000 on the host. Other players use http://HOST_LAN_IP:3000 from the same reachable network. Test campus Wi-Fi isolation before the event.

### Host guide
The host can privately inspect correct options, evidence files, verification answers and rationale through the Host Guide panel. The host controls each round, can inject scenario updates, reveal results and start the next mission.

### Difficulty and scoring
- Players must open at least **two different evidence files** and select an incident-response action before submitting.
- Each mission has a difficult, independently scored numerical or technical verification challenge (up to **100 bonus points**).
- Evidence review, pinned evidence, incident-response decision and detailed written reasoning contribute to the score.
- The original speed bonus was removed to discourage rapid guessing.
- The game uses simulated financial outcomes; they are educational estimates, not investment advice.
- A recommended event duration is 85–100 minutes: 5-minute briefing, seven 10-minute missions, 10–20-minute debrief. Shorten rounds if needed.

**Important:** This game uses a simulated, read-only evidence terminal. It does not provide a real OS shell, exploit environment, or production bank access. All evidence is fictional.


### Simplified player flow
New rooms start with optional tools **off**. Players wait in the lobby, then complete three steps: review at least two evidence files, work through three branching incident decisions, and select a finding. Selecting a finding does not submit it: **Submit case** locks the team's response and finding. Submitted and timed-out teams wait for the host's reveal; results show the correct finding, explanation and team points.

The organiser can enable **Optional tools** in Event controls before a mission or after a reveal. The switch applies to every team and stays locked during a live mission. It enables evidence pins, verification, financial defence, case notes and the advanced terminal. Clues and the glossary remain available in the basic flow. Optional actions are also gated on the server. Mission content, answers, financial scenarios and existing point values are retained. UI bonus descriptions now match the existing scoring: verification 100, pins up to 30, and a case note of at least 80 characters 20.

### Gameplay checks
Start a disposable local server, then run `TEST_HOST_PASSWORD=your-test-password node tests/gameplay.mjs`. The test defaults to `http://localhost:3101`; set `TEST_BASE_URL` to use a different port. It creates its own test room and checks all seven missions, both optional-tool modes, host authorisation, live settings locks, required evidence/response gates, submission locks, bonus scoring and expiry. No external packages are required.

### Branching incident decisions
The original evidence browser is retained. After reviewing evidence, teams make three incident decisions. Each committed action produces an operations update; continuing opens the next situation based on that choice. Decisions are stored per team on the server and cannot be undone. A final finding unlocks once all three outcomes have been reviewed. The existing final response and finding scoring remains in place. Run `node tests/branches.mjs` to check all 84 complete mission paths.
