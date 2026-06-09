document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const userIdInput = document.getElementById('userIdInput');
  const btnClearUserId = document.getElementById('btnClearUserId');
  const passwordOutput = document.getElementById('passwordOutput');
  const btnRegenerate = document.getElementById('btnRegenerate');
  const btnCopyPasswordOnly = document.getElementById('btnCopyPasswordOnly');
  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');
  
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Tab Random Settings
  const passwordLength = document.getElementById('passwordLength');
  const lengthVal = document.getElementById('lengthVal');
  const includeUpper = document.getElementById('includeUpper');
  const includeLower = document.getElementById('includeLower');
  const includeNumbers = document.getElementById('includeNumbers');
  
  // Tab Leet Settings
  const leetPreset = document.getElementById('leetPreset');
  const customPhrase = document.getElementById('customPhrase');
  const btnConvert = document.getElementById('btnConvert');
  
  // Copy Template & Preview
  const btnCopyTemplate = document.getElementById('btnCopyTemplate');
  const templatePreview = document.getElementById('templatePreview');
  
  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  // --- State Variables ---
  let activeTab = 'tab-random'; // tab-random or tab-leet
  let currentPassword = '';
  
  // List of pre-defined password presets from user's request
  const presetsList = [
    'Pas5w0rD5g6',
    '5eL4ma7aN1',
    'k4caM47a000',
    'M3nvjU5ukseS',
    'P4sT113i54X1',
    '99i7Ub4nyaK',
    'Har1M4u5umv7',
    'k47aS4nD19',
    'P4st1m3n4n6',
    'm3Nan6pv45',
    'W1nN3r5xX'
  ];

  // --- Animated Background Canvas ---
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = window.innerWidth || 380;
  let height = canvas.height = window.innerHeight || 520;
  
  // Handle resize (though extension popups rarely resize, it is good practice)
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth || 380;
    height = canvas.height = window.innerHeight || 520;
  });
  
  const particles = [];
  const particleCount = 35;
  const colors = ['#FF003C', '#00F0FF', '#FFFFFF'];
  
  class Particle {
    constructor() {
      this.reset();
      this.y = Math.random() * height; // Distribute initially across screen
    }
    
    reset() {
      this.x = Math.random() * width;
      this.y = height + 10;
      this.size = Math.random() * 2 + 1; // 1px to 3px
      this.speedY = -(Math.random() * 0.8 + 0.3); // Drift upwards slowly (simulates falling downwards)
      this.speedX = (Math.random() * 0.4 - 0.2); // Small horizontal sway
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.alpha = Math.random() * 0.5 + 0.2; // 0.2 to 0.7 opacity
    }
    
    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      
      // Reset if off top or left/right
      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
      }
    }
    
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      
      // Draw square pixels (fits the retro comic glitch feel better than circles)
      ctx.fillRect(this.x, this.y, this.size, this.size);
      
      // Occasional glow for colored particles
      if (this.color !== '#FFFFFF' && Math.random() < 0.1) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
      }
      
      ctx.restore();
    }
  }
  
  // Initialize particles
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
  
  // Glitch horizontal line slices
  let glitchTimer = 0;
  
  function animateBackground() {
    ctx.clearRect(0, 0, width, height);
    
    // Draw & update particles
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    
    // Add random chromatic aberration horizontal slices
    glitchTimer++;
    if (glitchTimer % 140 === 0 || (glitchTimer % 200 === 0 && Math.random() < 0.5)) {
      const slices = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < slices; i++) {
        const sliceY = Math.random() * height;
        const sliceH = Math.random() * 2 + 1;
        const sliceW = Math.random() * (width * 0.5) + (width * 0.1);
        const sliceX = Math.random() * (width - sliceW);
        const sliceColor = Math.random() < 0.5 ? '#FF003C' : '#00F0FF';
        
        ctx.save();
        ctx.globalAlpha = Math.random() * 0.35 + 0.15;
        ctx.fillStyle = sliceColor;
        ctx.fillRect(sliceX, sliceY, sliceW, sliceH);
        ctx.restore();
      }
    }
    
    requestAnimationFrame(animateBackground);
  }
  
  // Start animation loop
  animateBackground();

  // --- Initialization & Local Storage ---
  // Load saved User ID from chrome storage or localStorage fallback
  const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  
  // Toggle clear button visibility
  function toggleClearButton() {
    if (userIdInput.value.trim() !== '') {
      btnClearUserId.style.display = 'flex';
    } else {
      btnClearUserId.style.display = 'none';
    }
  }

  if (isChromeExtension) {
    chrome.storage.local.get(['savedUserId'], (result) => {
      if (result.savedUserId) {
        userIdInput.value = result.savedUserId;
        updateTemplatePreview();
        toggleClearButton();
      }
    });
  } else {
    const saved = localStorage.getItem('savedUserId');
    if (saved) {
      userIdInput.value = saved;
      updateTemplatePreview();
      toggleClearButton();
    }
  }

  // Generate initial password
  generatePassword();

  // --- Event Listeners ---

  // User ID input listener
  userIdInput.addEventListener('input', () => {
    const userId = userIdInput.value;
    updateTemplatePreview();
    toggleClearButton();
    
    // Save to storage
    if (isChromeExtension) {
      chrome.storage.local.set({ savedUserId: userId });
    } else {
      localStorage.setItem('savedUserId', userId);
    }
  });

  // Clear User ID click listener
  btnClearUserId.addEventListener('click', () => {
    userIdInput.value = '';
    updateTemplatePreview();
    toggleClearButton();
    userIdInput.focus();
    
    // Save to storage
    if (isChromeExtension) {
      chrome.storage.local.set({ savedUserId: '' });
    } else {
      localStorage.setItem('savedUserId', '');
    }
  });

  // Tab Switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      document.getElementById(activeTab).classList.add('active');
      
      // Auto regenerate or select on tab change
      generatePassword();
    });
  });

  // Length slider sync
  passwordLength.addEventListener('input', () => {
    lengthVal.textContent = passwordLength.value;
    if (activeTab === 'tab-random') {
      generatePassword();
    }
  });

  // Random settings checkboxes
  [includeUpper, includeLower, includeNumbers].forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (activeTab === 'tab-random') {
        generatePassword();
      }
    });
  });

  // Leet preset select listener
  leetPreset.addEventListener('change', () => {
    if (activeTab === 'tab-leet') {
      generatePassword();
    }
  });

  // Custom Phrase convert listener
  btnConvert.addEventListener('click', () => {
    if (customPhrase.value.trim() !== '') {
      const converted = convertToLeetStyle(customPhrase.value);
      setPasswordOutput(converted);
    } else {
      showToast('Masukkan kata kustom terlebih dahulu!', true);
    }
  });

  customPhrase.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnConvert.click();
    }
  });

  // Generate buttons
  btnRegenerate.addEventListener('click', () => {
    // Add brief animation rotate class to the icon
    const svg = btnRegenerate.querySelector('svg');
    svg.style.transform = 'rotate(360deg)';
    svg.style.transition = 'transform 0.5s ease';
    
    generatePassword();
    
    setTimeout(() => {
      svg.style.transform = 'none';
      svg.style.transition = 'none';
    }, 500);
  });

  // Copy Buttons
  btnCopyPasswordOnly.addEventListener('click', () => {
    copyToClipboard(currentPassword, 'Password saja berhasil disalin!');
  });

  btnCopyTemplate.addEventListener('click', () => {
    const templateText = getTemplateText(userIdInput.value, currentPassword);
    copyToClipboard(templateText, 'Template lengkap berhasil disalin!');
  });

  // --- Functions ---

  // Main generator selector
  function generatePassword() {
    if (activeTab === 'tab-random') {
      const length = parseInt(passwordLength.value, 10);
      const pass = generateRandomAlphanumeric(length);
      setPasswordOutput(pass);
    } else {
      // Leet Preset Mode
      const selected = leetPreset.value;
      if (selected === 'random') {
        // Pick random preset
        const randIndex = Math.floor(Math.random() * presetsList.length);
        setPasswordOutput(presetsList[randIndex]);
      } else {
        setPasswordOutput(selected);
      }
    }
  }

  // Update DOM and state for new password
  function setPasswordOutput(pass) {
    currentPassword = pass;
    passwordOutput.value = pass;
    updateTemplatePreview();
    updateStrengthMeter(pass);
  }

  // Pure random alphanumeric generator
  function generateRandomAlphanumeric(length) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    
    let allowedChars = '';
    if (includeUpper.checked) allowedChars += uppercase;
    if (includeLower.checked) allowedChars += lowercase;
    if (includeNumbers.checked) allowedChars += numbers;
    
    // Fallback if none checked
    if (allowedChars === '') {
      allowedChars = uppercase + lowercase + numbers;
      includeUpper.checked = true;
      includeLower.checked = true;
      includeNumbers.checked = true;
    }
    
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * allowedChars.length);
      result += allowedChars[randomIndex];
    }
    
    return result;
  }

  // Custom Phrase Leet-speak Converter
  function convertToLeetStyle(phrase) {
    const leetMap = {
      'a': '4', 'A': '4',
      'e': '3', 'E': '3',
      'i': '1', 'I': '1',
      'o': '0', 'O': '0',
      's': '5', 'S': '5',
      't': '7', 'T': '7',
      'g': '6', 'G': '6',
      'b': '8', 'B': '8',
      'z': '2', 'Z': '2'
    };
    
    // Remove space to make a single compact password
    let clean = phrase.trim().replace(/\s+/g, '');
    let result = '';
    
    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      // Check if character has a leet replacement
      if (leetMap[char] !== undefined) {
        result += leetMap[char];
      } else {
        // Casing alternation
        if (i % 2 === 0) {
          result += char.toUpperCase();
        } else {
          result += char.toLowerCase();
        }
      }
    }
    
    // Make sure it meets minimum length of 8 and has numbers
    if (result.length < 8) {
      const extras = ['xX', '99', '5g6', '000', 'pv45', '7aN1'];
      const randExtra = extras[Math.floor(Math.random() * extras.length)];
      result += randExtra;
    }
    
    return result;
  }

  // Construct template string
  function getTemplateText(userId, password) {
    const uId = userId.trim();
    return `user id : ${uId}
password : ${password}
silakan di coba login dengan mengcopy paste data yang kami berikan ya bosku

NB : mohon tidak memberikan password / PIN anda kepada orang lain dan jagalah kerahasiaan ID anda. segala bentuk kehilangan chip karena adanya permainan tidak dapat dikembalikan dengan alasan apapun. kami sarankan untuk melakukan pergantian password secara berkala ya bosku.
terima kasih`;
  }

  // Update Live Preview box
  function updateTemplatePreview() {
    templatePreview.textContent = getTemplateText(userIdInput.value, currentPassword);
  }

  // Calculate & update strength indicator
  function updateStrengthMeter(password) {
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    if (hasUpper) strength += 1;
    if (hasLower) strength += 1;
    if (hasNumber) strength += 1;
    
    let barColor = '#FF003C'; // Red
    let label = 'Lemah';
    let width = '20%';
    
    if (strength <= 2) {
      barColor = '#FF003C';
      label = 'Lemah';
      width = '30%';
    } else if (strength === 3) {
      barColor = '#FF7B00'; // Orange
      label = 'Sedang';
      width = '55%';
    } else if (strength === 4) {
      barColor = '#00FF88'; // Bright Green
      label = 'Kuat';
      width = '80%';
    } else if (strength >= 5) {
      barColor = '#00F0FF'; // Cyan
      label = 'Sangat Kuat 🔥';
      width = '100%';
    }
    
    if (activeTab === 'tab-leet' && presetsList.includes(password)) {
      barColor = '#00F0FF';
      label = 'Preset Aman';
      width = '100%';
    }

    strengthBar.style.width = width;
    strengthBar.style.backgroundColor = barColor;
    strengthText.textContent = label;
    strengthText.style.color = barColor;
  }

  // Copy helper
  function copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast(successMessage);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Gagal menyalin text.', true);
      });
  }

  // Show Toast
  let toastTimeout;
  function showToast(message, isError = false) {
    clearTimeout(toastTimeout);
    
    toastMessage.textContent = message;
    if (isError) {
      toast.style.borderColor = '#FF003C';
      toast.querySelector('.toast-icon').style.color = '#FF003C';
    } else {
      toast.style.borderColor = '#00F0FF';
      toast.querySelector('.toast-icon').style.color = '#00F0FF';
    }
    
    toast.classList.add('show');
    
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }
});
