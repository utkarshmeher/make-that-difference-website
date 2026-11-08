MAKE THAT DIFFERENCE — WEBSITE STARTER (V5)

What's included:
- Homepage: approved Version 1 design, including Ankita's portrait.
- inner-resonance/: approved frequency listening experience, with Shiva artwork displayed in its full 16:9 landscape composition.
- booking.html: a branded on-site enquiry page. Visitors can select services, share contact details and optionally describe what they are looking for.
- google-apps-script/Code.gs: creates a Google Form and linked response spreadsheet, then receives website enquiries and saves them as Google Form responses.

LOCAL PREVIEW (Windows):
1. Extract this ZIP into a folder, e.g. Documents\MakeThatDifferenceWebsite.
2. Open that folder in File Explorer.
3. Click the address bar, type cmd, press Enter.
4. Run: python -m http.server 8000
5. Open http://localhost:8000
6. Test the booking page at http://localhost:8000/booking.html

CONNECT THE BOOKING FORM BACKEND BEFORE ACCEPTING REAL ENQUIRIES:
1. Open https://script.google.com/ while signed into the Google account that should own Ankita's enquiry records.
2. Create a New project.
3. Open google-apps-script/Code.gs from this ZIP, copy its complete contents into the Apps Script editor, and save.
4. From the function dropdown, select setupBookingForm and click Run. Approve Google's permissions. Run this only once; it creates the Google Form and linked response spreadsheet.
5. In Apps Script, open Deploy > New deployment > select type Web app.
6. Set Execute as: Me. Set Who has access: Anyone. Deploy and authorize if prompted.
7. Copy the Web app URL ending in /exec.
8. Open site-config.js and replace PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE with that URL, keeping the quotation marks.
9. Save and redeploy the static website to Cloudflare Pages.
10. Submit a test enquiry and confirm it appears in the linked Google Form responses / spreadsheet.

IMPORTANT:
- The on-site booking page is built, but submissions will not be stored until the Apps Script deployment URL is added to site-config.js.
- The website uses a simple cross-origin POST to the Apps Script web app. The page displays a thank-you state after sending; always verify the first test submission in the response spreadsheet before sharing the booking page publicly.
- Keep the Apps Script deployment URL private to the website configuration; do not post it publicly.
- Review the form wording, privacy notice, contact number and professional credentials with Ankita before launch.
- This is an enquiry form, not an emergency or crisis-support channel.
