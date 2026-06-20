# EW and Calories

A static, GitHub Pages-ready web app for tracking EW details, calories, water, weight, and nutrition goals.

## What it does

- Saves data in the user's web browser with `localStorage`
- No login
- No accounts
- No backend
- EW tracker with:
  - EW start/end dates
  - EW prediction
  - "EW is coming" reminder
  - ovulation estimate
  - fertile-window estimate
  - symptoms
  - mood
  - cramps
  - flow
  - notes
- Calorie counter with:
  - manual food entry
  - calories
  - protein/carbs/fat
  - meal type
  - small starter food suggestion list
  - API-ready structure for a searchable food database later
- Goals:
  - calories
  - water
  - weight
  - protein
  - carbs
  - fat
  - EW reminder window
- Export:
  - JSON backup
  - EW CSV
  - food CSV
  - weight CSV
- Import JSON backup
- Clear local browser data

## Privacy model

This is a browser-only app. It does not send data to a server.

Important limitation: browser storage is not encrypted. Do not use this on a shared/public device if the data is private.

## Medical disclaimer

EW predictions, ovulation estimates, fertile-window estimates, calorie goals, water goals, weight goals, and macro goals are informational only and are not medical advice.

## Files

- `index.html` — app structure
- `styles.css` — pink floral styling
- `app.js` — app behavior and local storage
- `README.md` — setup notes

## How to host on GitHub Pages

1. Create a new GitHub repository.
2. Upload these files to the root of the repository:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. Go to the repository's **Settings**.
4. Open **Pages**.
5. Choose **Deploy from a branch**.
6. Select the `main` branch and the root folder `/`.
7. Save.
8. Open the GitHub Pages URL after the deployment finishes.

GitHub Pages can publish from a branch and either the repository root `/` or `/docs` folder.

## Engineering notes

This app is intentionally dependency-free so it works on GitHub Pages without a build step.

Future database/API integration point:
- Replace or extend the `starterFoods` array in `app.js`
- Add an API search function
- Use the selected API result to populate the existing food form
