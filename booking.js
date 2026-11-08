const form = document.getElementById('booking-form');
const statusLine = document.getElementById('form-status');
const submitButton = document.getElementById('submit-button');
const successState = document.getElementById('success-state');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  if (data.get('website')) return; // honeypot spam check
  const services = data.getAll('services');
  if (!services.length) {
    statusLine.textContent = 'Please select at least one area you would like to explore, or choose “I’m not sure yet”.';
    statusLine.classList.add('error');
    form.querySelector('.service-fieldset').scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  const endpoint = window.MTD_CONFIG?.bookingEndpoint || '';
  if (!endpoint || endpoint.includes('PASTE_GOOGLE_APPS_SCRIPT')) {
    statusLine.textContent = 'The enquiry form is ready, but its secure response destination still needs to be connected. Please contact the site administrator before accepting enquiries.';
    statusLine.classList.add('error');
    return;
  }
  const payload = {
    name: String(data.get('name') || '').trim(),
    email: String(data.get('email') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    contactPreference: data.get('contactPreference'),
    services,
    message: String(data.get('message') || '').trim(),
    preferredTime: data.get('preferredTime'),
    consent: data.get('consent') === 'on',
    submittedAt: new Date().toISOString()
  };
  submitButton.disabled = true;
  submitButton.textContent = 'Sending…';
  statusLine.textContent = 'Sending your enquiry securely…';
  statusLine.classList.remove('error');
  try {
    // Apps Script accepts text/plain as a simple cross-origin request; no-cors
    // prevents a browser preflight. The Apps Script response is opaque by design.
    await fetch(endpoint, {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(payload)});
    form.hidden = true;
    successState.hidden = false;
    successState.scrollIntoView({behavior:'smooth',block:'center'});
  } catch (error) {
    statusLine.textContent = 'We could not send your enquiry just now. Please try again or contact Ankita on WhatsApp.';
    statusLine.classList.add('error');
    submitButton.disabled = false;
    submitButton.innerHTML = 'Send my enquiry <span>↗</span>';
  }
});
