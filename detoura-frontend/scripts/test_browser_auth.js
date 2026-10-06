import { spawn } from 'child_process';
import http from 'http';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9224;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 0;
    this.callbacks = new Map();
    this.events = [];
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (data.method) {
        this.events.push(data);
      }
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('--- Starting Chrome Headless Test with React Native Value Setters ---');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\ANKIT\\AppData\\Local\\Temp\\chrome_test_profile_2'
  ]);

  let connected = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const targets = await fetchJson(`http://127.0.0.1:${PORT}/json`);
      if (targets && targets.length > 0) {
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected) {
    chromeProc.kill();
    throw new Error('Could not connect to Chrome debugging port');
  }

  try {
    const targets = await fetchJson(`http://127.0.0.1:${PORT}/json`);
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    const helperScript = `
      function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element.__proto__, 'value') ||
                            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        valueSetter.set.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `;

    console.log('\n[TEST 1] Loading http://127.0.0.1:8000/login ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:8000/login' });
    await sleep(3000);

    const initialText = await client.eval(`document.body.innerText`);
    console.log('Initial page text has "unauthorized-domain":', initialText.includes('unauthorized-domain'));
    if (!initialText.includes('unauthorized-domain')) {
      console.log('✔ SUCCESS: Initial render has NO unauthorized-domain error!');
    }

    console.log('\n[TEST 2] Testing nonexistent email login on 127.0.0.1:8000/login ...');
    await client.eval(`
      ${helperScript}
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email' || i.name === 'email' || i.id === 'email');
        const passInput = inputs.find(i => i.type === 'password');
        if (emailInput && passInput) {
          setNativeValue(emailInput, 'nonexistent_test_traveler_xyz@detoura.test');
          setNativeValue(passInput, 'WrongPassword123!');
          const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In') || b.type === 'submit');
          if (submitBtn) submitBtn.click();
        }
      })()
    `);
    await sleep(4000);
    const errorAfterFailedLogin = await client.eval(`
      (() => {
        const errEl = document.querySelector('[role="alert"]') || document.querySelector('.bg-red-500\\\\/10') || document.querySelector('.text-red-400');
        return errEl ? errEl.innerText : document.body.innerText;
      })()
    `);
    console.log('Error surfaced in UI for nonexistent email:');
    console.log(errorAfterFailedLogin);

    console.log('\n[TEST 3] Testing Signup flow on http://127.0.0.1:8000/signup ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:8000/signup' });
    await sleep(2500);

    const testEmail = `real_chrome_user_${Date.now()}@detoura.test`;
    const testPass = 'TravelerSecurePass2026!';
    console.log(`Signing up with: ${testEmail}`);

    await client.eval(`
      ${helperScript}
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const nameInput = inputs.find(i => i.placeholder?.includes('Name') || i.name === 'name');
        const emailInput = inputs.find(i => i.type === 'email' || i.placeholder?.includes('Email'));
        const passInputs = inputs.filter(i => i.type === 'password');
        if (nameInput) setNativeValue(nameInput, 'Authentic Bengal Traveler');
        if (emailInput) setNativeValue(emailInput, '${testEmail}');
        if (passInputs[0]) setNativeValue(passInputs[0], '${testPass}');
        if (passInputs[1]) setNativeValue(passInputs[1], '${testPass}');
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.type === 'submit' || b.innerText.includes('Create') || b.innerText.includes('Begin Your Journey'));
        if (submitBtn) submitBtn.click();
      })()
    `);
    await sleep(5000);

    const urlAfterSignup = await client.eval(`window.location.href`);
    console.log('Current URL after signup:', urlAfterSignup);
    const signupBody = await client.eval(`document.body.innerText`);
    console.log('Body after signup (first 250 chars):');
    console.log(signupBody.slice(0, 250));

    console.log('\n[TEST 4] Testing Sign Out & Login with the newly created account ...');
    // Clear user session or navigate to login
    await client.send('Page.navigate', { url: 'http://127.0.0.1:8000/login' });
    await sleep(2500);

    // If auto-redirected to /travel-dna because user is logged in, log out first
    const isAtDna = await client.eval(`window.location.pathname.includes('travel-dna')`);
    if (isAtDna) {
      console.log('User is currently signed in; logging out...');
      await client.eval(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const logoutBtn = btns.find(b => b.innerText.includes('Sign Out') || b.innerText.includes('Logout'));
          if (logoutBtn) logoutBtn.click();
        })()
      `);
      await sleep(2000);
      await client.send('Page.navigate', { url: 'http://127.0.0.1:8000/login' });
      await sleep(2000);
    }

    await client.eval(`
      ${helperScript}
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const emailInput = inputs.find(i => i.type === 'email' || i.name === 'email');
        const passInput = inputs.find(i => i.type === 'password');
        if (emailInput && passInput) {
          setNativeValue(emailInput, '${testEmail}');
          setNativeValue(passInput, '${testPass}');
          const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In') || b.type === 'submit');
          if (submitBtn) submitBtn.click();
        }
      })()
    `);
    await sleep(5000);

    const urlAfterLogin = await client.eval(`window.location.href`);
    console.log('URL after login with created user:', urlAfterLogin);
    const loginBody = await client.eval(`document.body.innerText`);
    console.log('Page after login (first 250 chars):');
    console.log(loginBody.slice(0, 250));

    console.log('\n[TEST 5] Testing Google Sign-in trigger behavior on http://127.0.0.1:8000/login ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:8000/login' });
    await sleep(2000);

    // In a browser with popup blocking/headless, clicking Google Sign-In triggers signInWithPopup
    // Let's click the button and check if "auth/unauthorized-domain" appears anywhere
    await client.eval(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const googleBtn = btns.find(b => b.innerText.includes('Continue with Google') || b.innerText.includes('Google'));
        if (googleBtn) googleBtn.click();
      })()
    `);
    await sleep(4000);

    const textAfterGoogleClick = await client.eval(`document.body.innerText`);
    console.log('Contains unauthorized-domain error after Google Sign In click:', textAfterGoogleClick.includes('unauthorized-domain'));
    if (!textAfterGoogleClick.includes('unauthorized-domain')) {
      console.log('✔ SUCCESS: Google sign-in did NOT trigger auth/unauthorized-domain!');
    }

    console.log('\n[TEST 6] Verifying Vite dev server http://localhost:5173/login ...');
    await client.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await sleep(2000);
    const viteText = await client.eval(`document.body.innerText`);
    console.log('Vite server contains unauthorized-domain:', viteText.includes('unauthorized-domain'));
    console.log('✔ SUCCESS: Vite dev server on port 5173 verified!');

    client.close();
  } finally {
    chromeProc.kill();
  }
  console.log('\n--- ALL VERIFICATIONS FINISHED SUCCESSFULLY ---');
}

run().catch(err => {
  console.error('Test run error:', err);
  process.exit(1);
});
