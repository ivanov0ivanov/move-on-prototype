/**
 * Goal templates: the single source of truth for goal copy, icons and step configs.
 * `first` is the ≤60 s step done before registration; `daily` is the ~2 min step offered on Home;
 * `offline` describes how a real-world step can be confirmed (imitated integrations).
 */

const WORDS_FIRST = [
  { en: 'unwind', ipa: '/ʌnˈwaɪnd/', ua: 'розслабитися', ex: 'Reading helps me unwind after work.', exUa: 'Читання допомагає мені розслабитися після роботи.' },
  { en: 'commute', ipa: '/kəˈmjuːt/', ua: 'дорога на роботу', ex: 'My commute takes forty minutes.', exUa: 'Дорога на роботу займає сорок хвилин.' },
  { en: 'habit', ipa: '/ˈhæbɪt/', ua: 'звичка', ex: 'Small habits are easier to keep.', exUa: 'Маленьких звичок легше дотримуватися.' },
  { en: 'catch up', ipa: '/kætʃ ʌp/', ua: 'надолужити', ex: 'I need to catch up on sleep.', exUa: 'Мені треба надолужити сон.' },
  { en: 'steady', ipa: '/ˈstedi/', ua: 'рівний, стабільний', ex: 'Slow but steady progress.', exUa: 'Повільний, але стабільний прогрес.' },
];

const WORDS_DAILY = [
  { en: 'schedule', ipa: '/ˈʃedjuːl/', ua: 'розклад', ex: 'My schedule is full this week.', exUa: 'Цього тижня мій розклад заповнений.' },
  { en: 'postpone', ipa: '/pəʊstˈpəʊn/', ua: 'відкладати', ex: "Let's not postpone it again.", exUa: 'Не відкладаймо це знову.' },
  { en: 'reliable', ipa: '/rɪˈlaɪəbl/', ua: 'надійний', ex: 'She is a reliable colleague.', exUa: 'Вона надійна колега.' },
  { en: 'break', ipa: '/breɪk/', ua: 'перерва', ex: 'Take a short break.', exUa: 'Зроби коротку перерву.' },
  { en: 'keep up', ipa: '/kiːp ʌp/', ua: 'встигати', ex: "It's hard to keep up with emails.", exUa: 'Важко встигати з листами.' },
];

const CARD_HINT = 'Торкнись картки, щоб побачити переклад.';

export const GOALS = [
  {
    id: 'english', name: 'Англійська', icon: 'english', tint: 'blue',
    first: { type: 'flashcards', title: '5 нових слів', meta: '5 нових слів · 60 с', hint: CARD_HINT, words: WORDS_FIRST },
    daily: { type: 'flashcards', title: 'Ще 5 слів', meta: '2 хв', hint: CARD_HINT, words: WORDS_DAILY },
    offline: { label: 'урок у Duolingo чи з викладачем', auto: 'Duolingo', found: 'Урок у Duolingo, 12 хв' },
  },
  {
    id: 'pilates', name: 'Пілатес', icon: 'pilates', tint: 'yellow',
    first: { type: 'countdown', title: 'Планка 30 секунд', meta: 'Планка 30 с', hint: 'Стань у планку на передпліччях. Спина рівна, дихай спокійно.', seconds: 30, pose: 'plank' },
    daily: {
      type: 'sequence', title: 'Планка і дві вправи', meta: '2 хв', hint: 'Три вправи по 30 секунд. Таймер перемкне сам.',
      moves: [{ name: 'Планка', seconds: 30, pose: 'plank' }, { name: 'Місток', seconds: 30, pose: 'bridge' }, { name: 'Котик-корова', seconds: 30, pose: 'cat' }],
    },
    offline: { label: 'заняття в студії', auto: 'Apple Health', found: 'Пілатес у студії, 50 хв' },
  },
  {
    id: 'reading', name: 'Читання', icon: 'reading', tint: 'green',
    first: { type: 'reading', title: 'Одна сторінка', meta: '1 сторінка · 60 с', hint: 'Прочитай сторінку тут або у своїй книжці.', seconds: 60 },
    daily: { type: 'reading', title: 'Дві сторінки', meta: '2 хв', hint: 'Дві сторінки тут або у своїй книжці.', seconds: 120 },
    offline: { label: 'читання своєї книжки', auto: 'Apple Books', found: 'Читання, 25 хв' },
  },
  {
    id: 'recovery', name: 'Відновлення', icon: 'recovery', tint: 'blue',
    first: { type: 'breathing', title: 'Дихання 4-4-6', meta: 'Дихання 4-4-6 · 3 цикли', hint: 'Вдих на 4, затримка на 4, видих на 6. Коло підкаже темп.', cycles: 3, pattern: [4, 4, 6] },
    daily: { type: 'breathing', title: 'Дихання 4-4-6', meta: '2 хв', hint: 'Пʼять спокійних циклів.', cycles: 5, pattern: [4, 4, 6] },
    offline: { label: 'прогулянка чи сон 7+ годин', auto: 'Apple Health', found: 'Прогулянка, 32 хв' },
  },
  {
    id: 'warmup', name: 'Розминка', icon: 'warmup', tint: 'yellow',
    first: {
      type: 'sequence', title: 'Три рухи', meta: '3 рухи · 45 с', hint: 'По 15 секунд на рух. Можна просто біля столу.',
      moves: [{ name: 'Кола плечима', seconds: 15, pose: 'shoulders' }, { name: 'Нахили голови', seconds: 15, pose: 'neck' }, { name: 'Потягнутися вгору', seconds: 15, pose: 'reach' }],
    },
    daily: {
      type: 'sequence', title: 'Пʼять рухів', meta: '2 хв', hint: 'По 20 секунд на рух.',
      moves: [
        { name: 'Кола плечима', seconds: 20, pose: 'shoulders' }, { name: 'Нахили голови', seconds: 20, pose: 'neck' },
        { name: 'Потягнутися вгору', seconds: 20, pose: 'reach' }, { name: 'Повороти корпусу', seconds: 20, pose: 'twist' },
        { name: 'Кроки на місці', seconds: 20, pose: 'march' },
      ],
    },
    offline: { label: 'розминка чи спорт', auto: 'Apple Health', found: 'Тренування, 20 хв' },
  },
  {
    id: 'custom', name: 'Своя ціль', icon: 'plus', tint: 'outline',
    first: { type: 'custom', title: 'Своя ціль', meta: 'Назви ціль і зроби перший крок', hint: 'Назви ціль. Потім 40 секунд на перший крок.', seconds: 40 },
    daily: { type: 'timer', title: 'Дві хвилини на ціль', meta: '2 хв', hint: 'Зроби маленький крок. Таймер поруч.', seconds: 120 },
    offline: { label: 'крок поза застосунком', auto: 'Apple Health', found: 'Активність, 15 хв' },
  },
];

/** @param {string} id */
export const getGoal = (id) => GOALS.find((g) => g.id === id) || GOALS[0];

/** Display name; the custom goal uses the title the person typed. */
export const goalName = (goal, state) => (goal.id === 'custom' && state.customTitle ? state.customTitle : goal.name);

/** Built-in page for the reading step (original text). */
export const READING_PAGE = [
  'Вечір починається не тоді, коли закриваєш ноутбук, а коли дозволяєш собі зупинитися. Перші хвилини після роботи найслизькіші: рука сама тягнеться до телефону, і стрічка обіцяє відпочинок, якого не дає.',
  'Можна інакше. Сісти біля вікна. Видихнути. Відкрити книжку на будь-якій сторінці й прочитати лише її. Одна сторінка нічого не вирішує, і саме тому її легко почати.',
  'А почате має дивну властивість: його хочеться продовжити. Не через силу, а з цікавості, що там далі. Так і рухаються речі, які ми довго відкладали. Не стрибком, а сторінкою, кроком, хвилиною.',
];
