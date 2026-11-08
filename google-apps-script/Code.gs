/**
 * Make That Difference — booking enquiry receiver
 *
 * 1) Run setupBookingForm() once from the Apps Script editor.
 * 2) It creates a Google Form and a linked response spreadsheet.
 * 3) Deploy this project as a Web app (execute as you; access: anyone).
 * 4) Copy the Web app URL into ../site-config.js as bookingEndpoint.
 */
function setupBookingForm() {
  const form = FormApp.create('Make That Difference — Session Enquiry');
  form.setDescription('Initial enquiry form for people interested in connecting with Ankita Mehta. Please do not use this form for emergencies.');
  form.setConfirmationMessage('Thank you for reaching out. Ankita will connect with you using your preferred contact method.');
  form.setCollectEmail(false);

  const name = form.addTextItem().setTitle('Your name').setRequired(true);
  const email = form.addTextItem().setTitle('Email address').setRequired(true);
  const phone = form.addTextItem().setTitle('Phone / WhatsApp number').setRequired(true);
  const contact = form.addMultipleChoiceItem().setTitle('Best way to reach you').setChoiceValues(['WhatsApp', 'Phone call', 'Email']).setRequired(true);
  const services = form.addCheckboxItem().setTitle('Services / areas of interest').setChoiceValues([
    'Individual Psychological Counselling',
    'Conscious Living & Personal Growth Coaching',
    'NLP-Based Coaching',
    'Emotional Well-being & Stress Management',
    'Corporate Workshops',
    'School, Parent & Educator Programmes',
    'Retreats, Group Programmes & Experiences',
    'Intuitive Tarot Guidance',
    "I'm not sure yet — I'd like to discuss"
  ]).setRequired(true);
  const message = form.addParagraphTextItem().setTitle('What would you like support with?');
  const preferred = form.addMultipleChoiceItem().setTitle('Preferred time to connect').setChoiceValues([
    'No preference', 'Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekends'
  ]).setRequired(true);
  form.addCheckboxItem().setTitle('Consent').setChoiceValues(['I agree that Ankita may contact me about this enquiry.']).setRequired(true);

  const spreadsheet = SpreadsheetApp.create('Make That Difference — Session Enquiries');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  PropertiesService.getScriptProperties().setProperties({
    BOOKING_FORM_ID: form.getId(),
    BOOKING_SHEET_ID: spreadsheet.getId()
  });

  Logger.log('Google Form (responses destination): ' + form.getPublishedUrl());
  Logger.log('Response spreadsheet: ' + spreadsheet.getUrl());
  Logger.log('Form editor: ' + form.getEditUrl());
}

function doPost(e) {
  try {
    const formId = PropertiesService.getScriptProperties().getProperty('BOOKING_FORM_ID');
    if (!formId) throw new Error('Booking form is not configured. Run setupBookingForm() first.');
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!payload.name || !payload.email || !payload.phone || !payload.consent) {
      throw new Error('Missing required enquiry details.');
    }
    if (!Array.isArray(payload.services) || payload.services.length === 0) {
      throw new Error('Please select at least one service.');
    }

    const form = FormApp.openById(formId);
    const items = form.getItems();
    const byTitle = {};
    items.forEach(item => byTitle[item.getTitle()] = item);
    const response = form.createResponse();
    response.withItemResponse(byTitle['Your name'].asTextItem().createResponse(String(payload.name).slice(0, 100)));
    response.withItemResponse(byTitle['Email address'].asTextItem().createResponse(String(payload.email).slice(0, 160)));
    response.withItemResponse(byTitle['Phone / WhatsApp number'].asTextItem().createResponse(String(payload.phone).slice(0, 30)));
    response.withItemResponse(byTitle['Best way to reach you'].asMultipleChoiceItem().createResponse(String(payload.contactPreference || 'WhatsApp')));
    response.withItemResponse(byTitle['Services / areas of interest'].asCheckboxItem().createResponse(payload.services.map(String)));
    response.withItemResponse(byTitle['What would you like support with?'].asParagraphTextItem().createResponse(String(payload.message || '').slice(0, 2000)));
    response.withItemResponse(byTitle['Preferred time to connect'].asMultipleChoiceItem().createResponse(String(payload.preferredTime || 'No preference')));
    response.withItemResponse(byTitle['Consent'].asCheckboxItem().createResponse(['I agree that Ankita may contact me about this enquiry.']));
    response.submit();
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error(err);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}
