/**
 * Registration sheet, shown only AFTER the first step. Sign-in is imitated; data stays on the device.
 */
import { h, icon, openSheet, toast } from '../ui.js';
import { register } from '../state.js';

/**
 * @param {{onDone?: (registered: boolean) => void}} [opts]
 */
export function openRegister({ onDone } = {}) {
  let sheet;
  let busy = false;

  const nameInput = h('input', {
    class: 'input', id: 'reg-name', type: 'text', autocomplete: 'off', autocapitalize: 'words',
    enterkeyhint: 'done', maxlength: '24', placeholder: 'Імʼя', value: '',
  });
  // v2: always start empty, even if the browser tries to restore a previous value.
  nameInput.value = '';
  const emailInput = h('input', {
    class: 'input', id: 'reg-email', type: 'email', inputmode: 'email', autocomplete: 'email',
    autocapitalize: 'none', autocorrect: 'off', enterkeyhint: 'go', placeholder: 'name@example.com',
  });

  function finish(method, btn) {
    if (busy) return;
    busy = true;
    btn.classList.add('is-loading');
    setTimeout(() => {
      register(nameInput.value.trim(), method);
      sheet.close('done');
      toast('Прогрес збережено');
      onDone?.(true);
    }, 650);
  }

  const emailSave = h('button', { class: 'btn btn--primary', type: 'button' }, 'Зберегти через email');
  emailSave.addEventListener('click', () => finish('email', emailSave));
  const emailBox = h('div', { class: 'email-box' },
    h('label', { class: 'field-label', for: 'reg-email' }, 'Email'), emailInput, emailSave);
  emailBox.hidden = true;

  const apple = h('button', { class: 'btn btn--apple', type: 'button' }, icon('apple', 20), 'Продовжити з Apple');
  const google = h('button', { class: 'btn btn--google', type: 'button' }, icon('google', 20), 'Продовжити з Google');
  const email = h('button', { class: 'btn btn--outline', type: 'button' }, icon('mail', 20), 'Продовжити з email');
  apple.addEventListener('click', () => finish('apple', apple));
  google.addEventListener('click', () => finish('google', google));
  email.addEventListener('click', () => {
    email.hidden = true;
    emailBox.hidden = false;
    emailInput.focus();
  });

  const later = h('button', { class: 'btn btn--secondary', type: 'button' }, 'Пізніше');
  later.addEventListener('click', () => {
    sheet.close('later');
    onDone?.(false);
  });

  const content = h('div', { class: 'sheet-body' },
    h('h2', { class: 'h2' }, 'Збережемо твоє дерево'),
    h('p', { class: 'later-note' }, icon('lock', 16), 'Можна пізніше: без входу прогрес лишається на цьому телефоні.'),
    h('p', { class: 'sheet-sub' }, 'Вхід потрібен, щоб прогрес не загубився, якщо зміниш телефон. Пароль не потрібен.'),
    h('label', { class: 'field-label', for: 'reg-name' }, 'Як до тебе звертатися?'),
    nameInput,
    h('div', { class: 'auth-list' }, apple, google, email, emailBox),
    later,
    h('p', { class: 'proto-note' }, icon('info', 15), 'Прототип: вхід імітований, дані лишаються на цьому телефоні.'));

  sheet = openSheet({ content, label: 'Збереження прогресу' });
  return sheet;
}
