const form = document.getElementById('booking-form');
const statusLine = document.getElementById('form-status');
const submitButton = document.getElementById('submit-button');
const successState = document.getElementById('success-state');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  const data = new FormData(form);

  // Honeypot spam protection
  if (data.get('website')) return;

  const services = data.getAll('services');

  if (!services.length) {
    statusLine.textContent =
      'Please select at least one area you would like to explore, or choose "I’m not sure yet".';

    statusLine.classList.add('error');

    form.querySelector('.service-fieldset').scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    return;
  }

  const endpoint = window.MTD_CONFIG?.bookingEndpoint || '';

  if (!endpoint || endpoint.includes('PASTE_GOOGLE_APPS_SCRIPT')) {
    statusLine.textContent =
      'The booking system is not connected yet. Please contact Ankita directly.';

    statusLine.classList.add('error');
    return;
  }

  // Match the field names expected by Google Apps Script
  const payload = {
    name: String(data.get('name') || '').trim(),
    email: String(data.get('email') || '').trim(),
    mobile: String(data.get('phone') || '').trim(),
    contactMethod: String(data.get('contactPreference') || ''),
    services: services,
    message: String(data.get('message') || '').trim(),
    preferredTime: String(data.get('preferredTime') || ''),
    consent: data.get('consent') === 'on',
    submittedAt: new Date().toISOString()
  };

  if (!payload.name || !payload.email || !payload.mobile) {
    statusLine.textContent =
      'Please complete your name, email and phone number.';

    statusLine.classList.add('error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Sending…';

  statusLine.textContent = 'Sending your enquiry…';
  statusLine.classList.remove('error');

  try {
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    form.hidden = true;
    successState.hidden = false;

    successState.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

  } catch (error) {

    statusLine.textContent =
      'We could not send your enquiry just now. Please try again or contact Ankita on WhatsApp.';

    statusLine.classList.add('error');

    submitButton.disabled = false;
    submitButton.innerHTML = 'Send my enquiry <span>↗</span>';
  }
});