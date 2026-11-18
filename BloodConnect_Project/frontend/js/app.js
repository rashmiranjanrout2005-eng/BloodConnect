const COMPATIBILITY = {
  'O-': { receiveFrom: ['O-'], donateTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] },
  'O+': { receiveFrom: ['O-', 'O+'], donateTo: ['O+', 'A+', 'B+', 'AB+'] },
  'A-': { receiveFrom: ['O-', 'A-'], donateTo: ['A-', 'A+', 'AB-', 'AB+'] },
  'A+': { receiveFrom: ['O-', 'O+', 'A-', 'A+'], donateTo: ['A+', 'AB+'] },
  'B-': { receiveFrom: ['O-', 'B-'], donateTo: ['B-', 'B+', 'AB-', 'AB+'] },
  'B+': { receiveFrom: ['O-', 'O+', 'B-', 'B+'], donateTo: ['B+', 'AB+'] },
  'AB-': { receiveFrom: ['O-', 'A-', 'B-', 'AB-'], donateTo: ['AB-', 'AB+'] },
  'AB+': { receiveFrom: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], donateTo: ['AB+'] }
};

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

let currentUser = null;
let authMode = 'login';
const authModal = document.getElementById('authModal');

function updateAuthUI() {
  const accountBtn = document.getElementById('accountBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  accountBtn.textContent = currentUser ? currentUser.name : 'Log in / Sign up';
  accountBtn.title = currentUser ? currentUser.email : 'Log in or create an account';
  logoutBtn.hidden = !currentUser;
}

function openAuthModal() {
  authModal.classList.add('open');
  document.getElementById('authEmail').focus();
}

function requireLogin() {
  if (currentUser) return true;
  showToast('Please log in or create an account to continue.');
  openAuthModal();
  return false;
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === 'register';
  document.getElementById('authTitle').textContent = isRegister ? 'Create your account' : 'Log in to BloodConnect';
  document.getElementById('authSubtitle').textContent = isRegister
    ? 'Create an account to register as a donor and manage blood requests.'
    : 'Log in to find donors and manage your requests.';
  document.getElementById('authNameGroup').hidden = !isRegister;
  document.getElementById('authName').required = isRegister;
  document.getElementById('authPassword').autocomplete = isRegister ? 'new-password' : 'current-password';
  document.getElementById('authSubmitBtn').textContent = isRegister ? 'Create account' : 'Log in';
  document.getElementById('authModeBtn').textContent = isRegister
    ? 'Already registered? Log in'
    : 'New here? Create an account';
}

// Navigation Tabs
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

    const filterBar = document.getElementById('globalFilterBar');
    filterBar.style.display = (btn.dataset.tab === 'feed' || btn.dataset.tab === 'donors') ? 'flex' : 'none';
  });
});

// Modal Controls
const modal = document.getElementById('requestModal');
document.getElementById('openRequestModalBtn').onclick = () => {
  if (requireLogin()) modal.classList.add('open');
};
document.getElementById('closeRequestModalBtn').onclick = () => modal.classList.remove('open');
document.getElementById('accountBtn').addEventListener('click', () => {
  if (currentUser) showToast(`Signed in as ${currentUser.email}`);
  else {
    setAuthMode('login');
    openAuthModal();
  }
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await BloodAPI.logout();
    currentUser = null;
    updateAuthUI();
    await loadDashboardData();
    showToast('You have been logged out.');
  } catch (error) {
    showToast(error.message);
  }
});
document.getElementById('closeAuthModalBtn').onclick = () => authModal.classList.remove('open');
document.getElementById('authModeBtn').addEventListener('click', () => {
  setAuthMode(authMode === 'login' ? 'register' : 'login');
});
window.onclick = (event) => {
  if (event.target === modal) modal.classList.remove('open');
  if (event.target === authModal) authModal.classList.remove('open');
};

document.getElementById('authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = document.getElementById('authSubmitBtn');
  submitButton.disabled = true;
  const credentials = {
    email: document.getElementById('authEmail').value,
    password: document.getElementById('authPassword').value
  };
  try {
    const result = authMode === 'register'
      ? await BloodAPI.register({ ...credentials, name: document.getElementById('authName').value })
      : await BloodAPI.login(credentials);
    currentUser = result.user;
    updateAuthUI();
    authModal.classList.remove('open');
    event.target.reset();
    showToast(authMode === 'register' ? 'Your account was created successfully.' : 'Welcome back.');
    await loadDashboardData();
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

// Load Requests & Donors
async function loadDashboardData() {
  if (!currentUser) {
    document.getElementById('requestsList').innerHTML = '<p>Log in to view live blood requests.</p>';
    document.getElementById('donorsList').innerHTML = '<p>Log in to find registered donors.</p>';
    document.getElementById('statOpenRequests').textContent = '0';
    document.getElementById('statTotalDonors').textContent = '0';
    return;
  }

  const bloodGroup = document.getElementById('filterBloodGroup').value;
  const city = document.getElementById('filterCity').value.trim();
  const onlyAvailable = document.getElementById('onlyAvailableCheck').checked;

  try {
    const [requests, donors] = await Promise.all([
      BloodAPI.getRequests(bloodGroup, city),
      BloodAPI.getDonors(bloodGroup, city, onlyAvailable)
    ]);

    renderRequests(requests);
    renderDonors(donors);

    const openCount = requests.filter(r => r.status === 'OPEN').length;
    document.getElementById('statOpenRequests').textContent = openCount;
    document.getElementById('statTotalDonors').textContent = donors.length;
  } catch (err) {
    console.error(err);
    showToast(err.message);
  }
}

function renderRequests(requests) {
  const container = document.getElementById('requestsList');
  if (!requests.length) {
    container.innerHTML = '<p>No matching blood requests found.</p>';
    return;
  }

  container.innerHTML = requests.map(req => {
    const isFulfilled = req.status === 'FULFILLED';
    const badgeClass = isFulfilled ? 'tag-FULFILLED' : `tag-${req.urgency}`;
    const badgeText = isFulfilled ? 'FULFILLED' : req.urgency;
    const cleanPhone = req.contactPhone.replace(/\D/g, '');
    const patientName = escapeHtml(req.patientName);
    const hospital = escapeHtml(req.hospital);
    const city = escapeHtml(req.city);
    const bloodGroup = escapeHtml(req.bloodGroup);
    const contactPhone = escapeHtml(req.contactPhone);

    return `
      <div class="card">
        <div>
          <div class="card-top">
            <div class="blood-badge">${bloodGroup}</div>
            <span class="tag ${escapeHtml(badgeClass)}">${escapeHtml(badgeText)}</span>
          </div>
          <h4 class="card-title" style="margin-top:12px;">${patientName} (${req.units} Unit${req.units > 1 ? 's' : ''})</h4>
          <div class="card-meta">
            <span>🏥 ${hospital}</span>
            <span>📍 ${city}</span>
            <span>📞 ${contactPhone}</span>
          </div>
        </div>
        <div class="card-actions">
          <a href="tel:${cleanPhone}" class="action-btn btn-call">Call</a>
          <a href="https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello, I saw your Blood Connect request for ${req.bloodGroup} blood at ${req.hospital}.`)}" target="_blank" rel="noopener noreferrer" class="action-btn btn-wa">WhatsApp</a>
          ${!isFulfilled && req.ownedByCurrentUser ? `<button onclick="markFulfilled('${escapeHtml(req._id)}')" class="action-btn btn-fulfill">Mark Fulfilled</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderDonors(donors) {
  const container = document.getElementById('donorsList');
  if (!donors.length) {
    container.innerHTML = '<p>No matching donors registered yet.</p>';
    return;
  }

  container.innerHTML = donors.map(donor => {
    const cleanPhone = donor.phone.replace(/\D/g, '');
    const name = escapeHtml(donor.name);
    const bloodGroup = escapeHtml(donor.bloodGroup);
    const city = escapeHtml(donor.city);
    const phone = escapeHtml(donor.phone);
    return `
      <div class="card">
        <div>
          <div class="card-top">
            <div class="blood-badge">${bloodGroup}</div>
            <span class="tag ${donor.available ? 'tag-AVAILABLE' : 'tag-UNAVAILABLE'}">
              ${donor.available ? 'AVAILABLE' : 'UNAVAILABLE'}
            </span>
          </div>
          <h4 class="card-title" style="margin-top:12px;">${name} (${donor.age} yrs)</h4>
          <div class="card-meta">
            <span>📍 ${city}</span>
            <span>📞 ${phone}</span>
          </div>
        </div>
        <div class="card-actions">
          <a href="tel:${cleanPhone}" class="action-btn btn-call">Call Donor</a>
          <a href="https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hi ${donor.name}, we urgently need ${donor.bloodGroup} blood in ${donor.city}. Are you available to donate?`)}" target="_blank" rel="noopener noreferrer" class="action-btn btn-wa">WhatsApp</a>
          ${donor.ownedByCurrentUser ? `<button onclick="toggleAvailability('${escapeHtml(donor._id)}')" class="action-btn btn-fulfill">Toggle Status</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Actions
async function markFulfilled(id) {
  try {
    await BloodAPI.fulfillRequest(id);
    showToast('Request marked as fulfilled!');
    loadDashboardData();
  } catch (err) {
    showToast(err.message);
  }
}

async function toggleAvailability(id) {
  try {
    await BloodAPI.toggleDonorAvailability(id);
    showToast('Donor availability updated!');
    loadDashboardData();
  } catch (err) {
    showToast(err.message);
  }
}

// Form Submissions
document.getElementById('donorForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!requireLogin()) return;
  const payload = {
    name: document.getElementById('donorName').value,
    bloodGroup: document.getElementById('donorBloodGroup').value,
    city: document.getElementById('donorCity').value,
    phone: document.getElementById('donorPhone').value,
    age: Number(document.getElementById('donorAge').value)
  };
  try {
    await BloodAPI.registerDonor(payload);
    e.target.reset();
    showToast('Thank you! You are now registered as a donor.');
    loadDashboardData();
    document.querySelector('[data-tab="donors"]').click();
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!requireLogin()) return;
  const payload = {
    patientName: document.getElementById('reqPatientName').value,
    bloodGroup: document.getElementById('reqBloodGroup').value,
    units: Number(document.getElementById('reqUnits').value),
    hospital: document.getElementById('reqHospital').value,
    city: document.getElementById('reqCity').value,
    urgency: document.getElementById('reqUrgency').value,
    contactPhone: document.getElementById('reqPhone').value
  };
  try {
    const result = await BloodAPI.createRequest(payload);
    e.target.reset();
    modal.classList.remove('open');
    if (result.emailDelivery.status === 'failed') {
      showToast(`${result.emailDelivery.message} ${result.emailDelivery.recipientCount} alert(s) were delivered before the failure.`);
    } else if (result.emailDelivery.status === 'no-matching-donors') {
      showToast('Request published. No matching available donors were found for email alerts.');
    } else {
      showToast(`Request published. Email alerts sent to ${result.emailDelivery.recipientCount} matching donor(s).`);
    }
    loadDashboardData();
    document.querySelector('[data-tab="feed"]').click();
  } catch (err) {
    showToast(err.message);
  }
});

// Filter Listeners
document.getElementById('applyFilterBtn').addEventListener('click', loadDashboardData);
document.getElementById('onlyAvailableCheck').addEventListener('change', loadDashboardData);

// Compatibility Guide Setup
function initCompatibilityGuide() {
  const btnContainer = document.getElementById('compatButtons');
  const groups = Object.keys(COMPATIBILITY);

  groups.forEach((group, idx) => {
    const btn = document.createElement('button');
    btn.className = `compat-btn ${idx === 0 ? 'active' : ''}`;
    btn.textContent = group;
    btn.onclick = () => {
      document.querySelectorAll('.compat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showCompatibility(group);
    };
    btnContainer.appendChild(btn);
  });

  showCompatibility(groups[0]);
}

function showCompatibility(group) {
  const info = COMPATIBILITY[group];
  document.getElementById('compatResult').innerHTML = `
    <div><strong>Blood Group ${group} Can Receive From:</strong> ${info.receiveFrom.join(', ')}</div>
    <div><strong>Blood Group ${group} Can Donate To:</strong> ${info.donateTo.join(', ')}</div>
  `;
}

// Initial Load
initCompatibilityGuide();
setAuthMode('login');
updateAuthUI();
BloodAPI.getCurrentUser()
  .then((result) => {
    currentUser = result.user;
    updateAuthUI();
  })
  .catch((error) => {
    if (!error.message.toLowerCase().includes('log in')) console.error(error);
  })
  .finally(loadDashboardData);
