# VAULTBREAK V9 — Organiser Answer Key & Button Previews

This version retains the Sheffield FinTech logo and the SHEFFIELD FINTECH × ETHICAL HACKING branding throughout.

## New organiser-only tools

1. **Mission answer guide:** Choose any of the seven missions from the organiser dashboard. Review the correct multiple-choice finding (letter and full text), explanation, correct incident-response action, optional forensic verification answer, simulated evidence files and both intelligence bulletins.
2. **Action preview:** Select Start Mission / Next, Release Next Intelligence, Lock & Reveal, Finish Game, or Open Projector in the preview strip to see what it will do, whether it is available now, and any irreversible effects. Previewing does **not** trigger an action.
3. **Live context:** The preview reports the next mission title, current intelligence release count and number of submitted teams when relevant.

The answer key is returned only by a host-authenticated endpoint (`/api/host-guide`) and is not included in the participant or projector state. Keep the host password and host browser private. Avoid projecting the host dashboard; use the dedicated projector window.

## Run

Install Node.js LTS on the host, extract the ZIP, open Command Prompt in the folder containing `server.js` and run:

    set HOST_PASSWORD=YourLongPrivateEventPassword
    npm start

Open http://localhost:3000 . Players join using a reachable host address and room code. No `npm install` required.

Note: Game state is in memory and resets on server restart. Test connectivity on the actual event network.
