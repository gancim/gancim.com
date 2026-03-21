const CONVERSATIONS = [

  // ─── 6. Taxi ───────────────────────────────────────────────────────────────
  {
    id: 'taxi',
    icon: '🚕',
    title: { en: 'Taxi Ride', it: 'Corsa in Taxi' },
    subtitle: { en: 'Get in · Give directions · Pay', it: 'Sali · Dai indicazioni · Paga' },
    situation: {
      en: "You hail a taxi. You need to get to Shinjuku Station. You get in and the driver turns around.",
      it: "Fermi un taxi. Devi andare alla stazione di Shinjuku. Sali e l'autista si gira.",
    },
    start: 'driver-greet',
    nodes: {
      'driver-greet': {
        type: 'them',
        japanese: 'どちらまでですか？',
        romaji: 'Dochira made desu ka?',
        meaning: { en: 'Where to?', it: 'Dove andiamo?' },
        next: 'you-destination',
      },
      'you-destination': {
        type: 'you',
        prompt: { en: 'Tell the driver your destination', it: 'Di\' all\'autista dove vuoi andare' },
        hint: { en: 'Say [place] までお願いします ([place] made onegai shimasu) — to [place] please', it: 'Di\' [luogo] までお願いします — a [luogo] per favore' },
        model: { japanese: '新宿駅までお願いします', romaji: 'Shinjuku eki made onegai shimasu' },
        branches: [
          {
            keywords: ['新宿', 'shinjuku', '駅', 'eki', 'station', 'まで', 'made', 'お願い', 'onegai', 'ください', 'kudasai'],
            next: 'driver-ok',
          },
          {
            keywords: ['どこ', 'doko', 'where', 'address', '住所', 'jusho'],
            next: 'driver-ok',
          },
        ],
        fallback: 'driver-ok',
      },
      'driver-ok': {
        type: 'them',
        japanese: 'はい、わかりました。',
        romaji: 'Hai, wakarimashita.',
        meaning: { en: 'Yes, understood.', it: 'Sì, capito.' },
        next: 'narrator-ride',
        pause: 300,
      },
      'narrator-ride': {
        type: 'narrator',
        text: { en: 'The taxi drives through the city. As you approach, the driver speaks.', it: 'Il taxi attraversa la città. Mentre vi avvicinate, l\'autista parla.' },
        next: 'driver-arrive',
      },
      'driver-arrive': {
        type: 'them',
        japanese: 'こちらでよろしいですか？',
        romaji: 'Kochira de yoroshii desu ka?',
        meaning: { en: 'Is here alright?', it: 'Va bene qui?' },
        next: 'you-confirm-stop',
      },
      'you-confirm-stop': {
        type: 'you',
        prompt: { en: 'Confirm this is fine, or ask to go a bit further', it: 'Conferma che va bene, o chiedi di andare un po\' avanti' },
        hint: { en: 'Say はい、ここで大丈夫です (hai, koko de daijoubu desu) — yes, here is fine', it: 'Di\' はい、ここで大丈夫です — sì, qui va bene' },
        model: { japanese: 'はい、ここで大丈夫です', romaji: 'Hai, koko de daijoubu desu' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', 'ok', 'okay', '大丈夫', 'daijoubu', 'ここ', 'koko', 'いいです', 'いい', 'ii'],
            next: 'driver-fare',
          },
          {
            keywords: ['もう少し', 'mou sukoshi', 'ahead', 'further', 'もっと', 'motto', '前', 'mae'],
            next: 'driver-further',
          },
        ],
        fallback: 'driver-fare',
      },
      'driver-further': {
        type: 'them',
        japanese: 'かしこまりました。',
        romaji: 'Kashikomarimashita.',
        meaning: { en: 'Certainly.', it: 'Certo.' },
        next: 'driver-fare',
        pause: 400,
      },
      'driver-fare': {
        type: 'them',
        japanese: '千二百円になります。',
        romaji: 'Sen nihyaku en ni narimasu.',
        meaning: { en: 'That will be 1,200 yen.', it: 'Sono 1.200 yen.' },
        next: 'you-pay-taxi',
      },
      'you-pay-taxi': {
        type: 'you',
        prompt: { en: 'Pay the driver', it: 'Paga l\'autista' },
        hint: { en: 'Hand over money and say はい (hai) or カードで (kaado de) if paying by card', it: 'Dai i soldi e di\' はい o カードで per carta' },
        model: { japanese: 'はい、どうぞ', romaji: 'Hai, douzo' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', 'どうぞ', 'douzo', 'here', 'okay', 'カード', 'card', '現金', 'genkin', 'cash'],
            next: 'driver-thanks',
          },
        ],
        fallback: 'driver-thanks',
      },
      'driver-thanks': {
        type: 'them',
        japanese: 'ありがとうございました！',
        romaji: 'Arigatou gozaimashita!',
        meaning: { en: 'Thank you very much!', it: 'Grazie mille!' },
        next: 'end',
        pause: 200,
      },
      end: {
        type: 'end',
        message: { en: 'You navigated the taxi like a pro. 🚕', it: 'Hai gestito il taxi da professionista. 🚕' },
      },
    },
  },

  // ─── 7. Clinic Reception ───────────────────────────────────────────────────
  {
    id: 'clinic',
    icon: '🏥',
    title: { en: 'Clinic Visit', it: 'Visita Medica' },
    subtitle: { en: 'Register · Describe symptoms · Insurance', it: 'Registrati · Descrivi i sintomi · Assicurazione' },
    situation: {
      en: "You're not feeling well and have come to a local clinic. You approach the reception.",
      it: "Non ti senti bene e sei andato in una clinica locale. Ti avvicini alla reception.",
    },
    start: 'reception-greet',
    nodes: {
      'reception-greet': {
        type: 'them',
        japanese: 'いらっしゃいませ。本日は初めてですか？',
        romaji: 'Irasshaimase. Honjitsu wa hajimete desu ka?',
        meaning: { en: 'Welcome. Is this your first visit?', it: 'Benvenuto. È la prima volta qui?' },
        next: 'you-first-visit',
      },
      'you-first-visit': {
        type: 'you',
        prompt: { en: 'Is this your first visit?', it: 'È la prima volta qui?' },
        hint: { en: 'Say はい、初めてです (hai, hajimete desu) for first time, or いいえ (iie) if you\'ve been before', it: 'Di\' はい、初めてです per prima volta, o いいえ se sei già venuto' },
        model: { japanese: 'はい、初めてです', romaji: 'Hai, hajimete desu' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', '初めて', 'hajimete', 'first', 'prima'],
            next: 'reception-insurance',
          },
          {
            keywords: ['いいえ', 'no', 'また', 'mata', 'again', 'before', '二回', 'nikal'],
            next: 'reception-insurance',
          },
        ],
        fallback: 'reception-insurance',
      },
      'reception-insurance': {
        type: 'them',
        japanese: '保険証はお持ちですか？',
        romaji: 'Hokenshou wa omochi desu ka?',
        meaning: { en: 'Do you have your health insurance card?', it: 'Ha la tessera sanitaria?' },
        next: 'you-insurance',
      },
      'you-insurance': {
        type: 'you',
        prompt: { en: 'Do you have your health insurance card?', it: 'Ha la tessera sanitaria?' },
        hint: { en: 'Say はい、どうぞ (hai, douzo) if yes, or 持っていません (motte imasen) if you forgot it', it: 'Di\' はい、どうぞ se sì, o 持っていません se l\'hai dimenticata' },
        model: { japanese: 'はい、どうぞ', romaji: 'Hai, douzo' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', 'どうぞ', 'douzo', 'あります', 'arimasu', 'here', '持って', 'motte'],
            next: 'reception-form',
          },
          {
            keywords: ['ない', 'nai', 'ありません', 'arimasen', 'no', '忘れ', 'wasure', 'forgot', 'forgot'],
            next: 'no-insurance',
          },
        ],
        fallback: 'reception-form',
      },
      'no-insurance': {
        type: 'them',
        japanese: 'わかりました。本日は自費になりますが、よろしいですか？',
        romaji: 'Wakarimashita. Honjitsu wa jihi ni narimasu ga, yoroshii desu ka?',
        meaning: { en: 'Understood. Today\'s visit will be self-pay — is that okay?', it: 'Capito. Oggi dovrà pagare di tasca propria — va bene?' },
        next: 'you-accept-fee',
      },
      'you-accept-fee': {
        type: 'you',
        prompt: { en: 'Agree to the self-pay option', it: 'Accetta il pagamento autonomo' },
        hint: { en: 'Say はい、大丈夫です (hai, daijoubu desu) — yes, that\'s fine', it: 'Di\' はい、大丈夫です — sì, va bene' },
        model: { japanese: 'はい、大丈夫です', romaji: 'Hai, daijoubu desu' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', '大丈夫', 'daijoubu', 'ok', 'okay', 'わかりました', 'wakarimashita'],
            next: 'reception-form',
          },
        ],
        fallback: 'reception-form',
      },
      'reception-form': {
        type: 'them',
        japanese: 'こちらの用紙にご記入ください。',
        romaji: 'Kochira no youshi ni gokinyuu kudasai.',
        meaning: { en: 'Please fill in this form.', it: 'Compili questo modulo per favore.' },
        next: 'narrator-wait',
      },
      'narrator-wait': {
        type: 'narrator',
        text: { en: 'You fill out the form and sit down to wait. After a while, a doctor calls you in.', it: 'Compili il modulo e aspetti seduto. Dopo un po\', un medico ti chiama.' },
        next: 'doctor-greet',
      },
      'doctor-greet': {
        type: 'them',
        japanese: 'どうされましたか？',
        romaji: 'Dou saremashita ka?',
        meaning: { en: 'What seems to be the problem?', it: 'Qual è il problema?' },
        next: 'you-symptom',
      },
      'you-symptom': {
        type: 'you',
        prompt: { en: 'Describe your symptoms', it: 'Descrivi i tuoi sintomi' },
        hint: { en: 'Say 頭が痛いです (atama ga itai desu) for headache, or 熱があります (netsu ga arimasu) for fever', it: 'Di\' 頭が痛いです per mal di testa, o 熱があります per febbre' },
        model: { japanese: '頭が痛くて、熱があります', romaji: 'Atama ga itakute, netsu ga arimasu' },
        branches: [
          {
            keywords: ['頭', 'atama', 'head', '痛', 'itai', 'pain', 'hurt', '熱', 'netsu', 'fever', 'お腹', 'onaka', 'stomach', '喉', 'nodo', 'throat', '咳', 'seki', 'cough', '鼻', 'hana', 'nose'],
            next: 'doctor-since',
          },
          {
            keywords: ['気分', 'kibun', 'feel', 'sick', 'bad', 'わるい', 'warui', '具合', 'guai', 'ill'],
            next: 'doctor-since',
          },
        ],
        fallback: 'doctor-since',
      },
      'doctor-since': {
        type: 'them',
        japanese: 'いつからですか？',
        romaji: 'Itsu kara desu ka?',
        meaning: { en: 'Since when?', it: 'Da quando?' },
        next: 'you-since',
      },
      'you-since': {
        type: 'you',
        prompt: { en: 'Say since when you\'ve had symptoms', it: 'Di\' da quando hai i sintomi' },
        hint: { en: 'Say 昨日から (kinou kara) — since yesterday, or 今朝から (kesa kara) — since this morning', it: 'Di\' 昨日から — da ieri, o 今朝から — da stamattina' },
        model: { japanese: '昨日からです', romaji: 'Kinou kara desu' },
        branches: [
          {
            keywords: ['昨日', 'kinou', 'yesterday', '今朝', 'kesa', 'morning', '今日', 'kyou', 'today', '二日', '三日', 'days', '前', 'mae', 'ago', '週', 'shuu', 'week'],
            next: 'doctor-understood',
          },
        ],
        fallback: 'doctor-understood',
      },
      'doctor-understood': {
        type: 'them',
        japanese: 'わかりました。少し診てみますね。',
        romaji: 'Wakarimashita. Sukoshi mite mimasu ne.',
        meaning: { en: 'Understood. Let me take a look.', it: 'Capito. Do un\'occhiata.' },
        next: 'end',
        pause: 300,
      },
      end: {
        type: 'end',
        message: { en: 'You communicated your symptoms clearly. Stay healthy! 🏥', it: 'Hai comunicato i tuoi sintomi chiaramente. Stammi bene! 🏥' },
      },
    },
  },

  // ─── 8. Izakaya (Japanese Pub) ─────────────────────────────────────────────
  {
    id: 'izakaya',
    icon: '🍻',
    title: { en: 'Izakaya Night', it: 'Serata all\'Izakaya' },
    subtitle: { en: 'Order drinks · Food · Pay the bill', it: 'Ordina da bere · Cibo · Paga il conto' },
    situation: {
      en: "You and friends walk into a lively izakaya after work. The staff greets you loudly.",
      it: "Tu e i tuoi amici entrate in un izakaya animato dopo il lavoro. Il personale vi accoglie rumorosamente.",
    },
    start: 'staff-loud-greet',
    nodes: {
      'staff-loud-greet': {
        type: 'them',
        japanese: 'いらっしゃいませ！何名様ですか？',
        romaji: 'Irasshaimase! Nanmei-sama desu ka?',
        meaning: { en: 'Welcome! How many people?', it: 'Benvenuti! Quante persone?' },
        next: 'you-group-size',
      },
      'you-group-size': {
        type: 'you',
        prompt: { en: 'Say how many people are in your group', it: 'Di\' quante persone siete' },
        hint: { en: 'Say 三人です (sannin desu) for three, or 四人 (yonin) for four', it: 'Di\' 三人です (sannin desu) per tre, o 四人 (yonin) per quattro' },
        model: { japanese: '三人です', romaji: 'Sannin desu' },
        branches: [
          {
            keywords: ['ひとり', 'hitori', '一人', '1', 'one', 'ふたり', 'futari', '二人', '2', 'two', '三人', 'sannin', '3', 'three', '四人', 'yonin', '4', 'four', '五人', 'gonin', '5', 'five'],
            next: 'staff-seat',
          },
        ],
        fallback: 'staff-seat',
      },
      'staff-seat': {
        type: 'them',
        japanese: 'こちらへどうぞ！喫煙と禁煙、どちらがよろしいですか？',
        romaji: 'Kochira e douzo! Kitsuen to kinen, dochira ga yoroshii desu ka?',
        meaning: { en: 'Right this way! Smoking or non-smoking?', it: 'Da questa parte! Fumatori o non fumatori?' },
        next: 'you-smoking',
      },
      'you-smoking': {
        type: 'you',
        prompt: { en: 'Smoking or non-smoking?', it: 'Fumatori o non fumatori?' },
        hint: { en: 'Say 禁煙でお願いします (kinen de onegai shimasu) for non-smoking', it: 'Di\' 禁煙でお願いします (kinen de onegai shimasu) per non fumatori' },
        model: { japanese: '禁煙でお願いします', romaji: 'Kinen de onegai shimasu' },
        branches: [
          {
            keywords: ['禁煙', 'kinen', 'non-smoking', 'nonsmoking', 'no smoke', 'no smoking'],
            next: 'staff-drinks',
          },
          {
            keywords: ['喫煙', 'kitsuen', 'smoking', 'smoke', 'たばこ', 'tabako'],
            next: 'staff-drinks',
          },
        ],
        fallback: 'staff-drinks',
      },
      'staff-drinks': {
        type: 'them',
        japanese: 'お飲み物はいかがですか？とりあえずビールでよろしいですか？',
        romaji: 'Onomimono wa ikaga desu ka? Toriaezu biiru de yoroshii desu ka?',
        meaning: { en: 'What can I get you to drink? Shall I start you off with beer?', it: 'Cosa vi porto da bere? Vi porto delle birre intanto?' },
        next: 'you-drinks',
      },
      'you-drinks': {
        type: 'you',
        prompt: { en: 'Order drinks for the group', it: 'Ordina da bere per il gruppo' },
        hint: { en: 'Say とりあえず生ビールで (toriaezu nama biiru de) — draft beers to start', it: 'Di\' とりあえず生ビールで (toriaezu nama biiru de) — birre alla spina per iniziare' },
        model: { japanese: 'とりあえず生ビールを三つください', romaji: 'Toriaezu nama biiru wo mittsu kudasai' },
        branches: [
          {
            keywords: ['ビール', 'biiru', 'beer', '生', 'nama', 'draft', 'とりあえず', 'toriaezu', 'サワー', 'sawaa', 'sour', 'ハイボール', 'highball', 'ウーロン', 'oolong', '水', 'mizu', 'water'],
            next: 'staff-order-food',
          },
        ],
        fallback: 'staff-order-food',
      },
      'staff-order-food': {
        type: 'them',
        japanese: 'かしこまりました。お食事のご注文はいかがですか？',
        romaji: 'Kashikomarimashita. Oshokuji no gochuumon wa ikaga desu ka?',
        meaning: { en: 'Certainly! Would you like to order food?', it: 'Certo! Volete anche ordinare del cibo?' },
        next: 'you-food',
      },
      'you-food': {
        type: 'you',
        prompt: { en: 'Order some food', it: 'Ordina del cibo' },
        hint: { en: 'Try: 唐揚げと枝豆をください (karaage to edamame wo kudasai) — karaage and edamame please', it: 'Prova: 唐揚げと枝豆をください — karaage ed edamame per favore' },
        model: { japanese: '唐揚げと枝豆をお願いします', romaji: 'Karaage to edamame wo onegai shimasu' },
        branches: [
          {
            keywords: ['唐揚げ', 'karaage', '枝豆', 'edamame', '焼き鳥', 'yakitori', '刺身', 'sashimi', '餃子', 'gyoza', 'たこ焼き', 'takoyaki', '串', 'kushi', 'ください', 'kudasai', 'お願い'],
            next: 'narrator-enjoy',
          },
        ],
        fallback: 'narrator-enjoy',
      },
      'narrator-enjoy': {
        type: 'narrator',
        text: { en: 'Drinks and food arrive. You eat, drink, and chat. Hours pass. Time to go.', it: 'Arrivano da bere e da mangiare. Mangiate, bevete e chiacchierate. Passano ore. È ora di andare.' },
        next: 'you-bill-izakaya',
      },
      'you-bill-izakaya': {
        type: 'you',
        prompt: { en: 'Ask for the bill', it: 'Chiedi il conto' },
        hint: { en: 'Say すみません、お会計をお願いします (sumimasen, okaikei wo onegai shimasu)', it: 'Di\' すみません、お会計をお願いします' },
        model: { japanese: 'すみません、お会計をお願いします', romaji: 'Sumimasen, okaikei wo onegai shimasu' },
        branches: [
          {
            keywords: ['お会計', 'okaikei', '会計', 'kaikei', 'bill', 'check', 'pay', 'お勘定', '支払', '払'],
            next: 'staff-bill',
          },
          {
            keywords: ['すみません', 'sumimasen', 'excuse'],
            next: 'staff-bill',
          },
        ],
        fallback: 'staff-bill',
      },
      'staff-bill': {
        type: 'them',
        japanese: 'ありがとうございました！合計で六千三百円になります。',
        romaji: 'Arigatou gozaimashita! Goukei de rokusenhyaku sanjuu en ni narimasu.',
        meaning: { en: 'Thank you! The total is 6,300 yen.', it: 'Grazie! Il totale è 6.300 yen.' },
        next: 'staff-izakaya-bye',
        pause: 400,
      },
      'staff-izakaya-bye': {
        type: 'them',
        japanese: 'またのご来店をお待ちしております！',
        romaji: 'Mata no goraiten wo omachi shite orimasu!',
        meaning: { en: 'Come back and see us again!', it: 'Speriamo di rivedervi!' },
        next: 'end',
        pause: 200,
      },
      end: {
        type: 'end',
        message: { en: 'Kanpai! A perfect night out. 🍻', it: 'Kanpai! Una serata perfetta. 🍻' },
      },
    },
  },

  // ─── 9. Phone Call ─────────────────────────────────────────────────────────
  {
    id: 'phone-call',
    icon: '📞',
    title: { en: 'Phone Call', it: 'Telefonata' },
    subtitle: { en: 'Answer · Identify · Take a message', it: 'Rispondi · Presentati · Prendi un messaggio' },
    situation: {
      en: "Your phone rings. It's your landlord (大家さん). You don't recognize the number at first.",
      it: "Il tuo telefono squilla. È il tuo padrone di casa (大家さん). Non riconosci il numero all'inizio.",
    },
    start: 'you-answer',
    nodes: {
      'you-answer': {
        type: 'you',
        prompt: { en: 'Answer the phone', it: 'Rispondi al telefono' },
        hint: { en: 'Say もしもし (moshi moshi) — the standard Japanese phone greeting', it: 'Di\' もしもし (moshi moshi) — il saluto telefonico giapponese standard' },
        model: { japanese: 'もしもし', romaji: 'Moshi moshi' },
        branches: [
          {
            keywords: ['もしもし', 'moshi', 'hello', 'はい', 'hai', 'yes'],
            next: 'landlord-intro',
          },
        ],
        fallback: 'landlord-intro',
      },
      'landlord-intro': {
        type: 'them',
        japanese: 'もしもし、大家の田中と申しますが、山田さんのお電話でしょうか？',
        romaji: 'Moshi moshi, ooya no Tanaka to moushimasu ga, Yamada-san no odenwa deshou ka?',
        meaning: { en: 'Hello, this is Tanaka, your landlord. Is this Yamada-san?', it: 'Pronto, sono Tanaka, il padrone di casa. Parlo con il signor Yamada?' },
        next: 'you-confirm-self',
      },
      'you-confirm-self': {
        type: 'you',
        prompt: { en: 'Confirm it\'s you', it: 'Conferma che sei tu' },
        hint: { en: 'Say はい、そうです (hai, sou desu) — yes, that\'s right', it: 'Di\' はい、そうです (hai, sou desu) — sì, esatto' },
        model: { japanese: 'はい、そうです', romaji: 'Hai, sou desu' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', 'そうです', 'sou desu', 'そう', 'sou', 'わたし', 'watashi', 'i am', 'me'],
            next: 'landlord-reason',
          },
        ],
        fallback: 'landlord-reason',
      },
      'landlord-reason': {
        type: 'them',
        japanese: 'あ、よかった。来月の家賃のことでご連絡しました。',
        romaji: 'A, yokatta. Raigetsu no yachin no koto de gorenraku shimashita.',
        meaning: { en: 'Oh good. I\'m calling about next month\'s rent.', it: 'Oh bene. La chiamo riguardo all\'affitto del mese prossimo.' },
        next: 'you-acknowledge',
      },
      'you-acknowledge': {
        type: 'you',
        prompt: { en: 'Acknowledge and show you\'re listening', it: 'Riconosci e mostra che stai ascoltando' },
        hint: { en: 'Say はい (hai) or はい、わかりました (hai, wakarimashita) — yes, I understand', it: 'Di\' はい o はい、わかりました — sì, ho capito' },
        model: { japanese: 'はい、わかりました', romaji: 'Hai, wakarimashita' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', 'わかりました', 'wakarimashita', 'okay', 'ok', 'understood', 'capito'],
            next: 'landlord-info',
          },
        ],
        fallback: 'landlord-info',
      },
      'landlord-info': {
        type: 'them',
        japanese: '振込先が変わりましたので、新しい口座番号をお送りします。',
        romaji: 'Furikomi-saki ga kawarimashita node, atarashii kouza-bangou wo ookurishimasu.',
        meaning: { en: 'Our bank transfer details have changed, so I\'ll send you the new account number.', it: 'I dati per il bonifico sono cambiati, quindi le invierò il nuovo numero di conto.' },
        next: 'you-thanks-phone',
      },
      'you-thanks-phone': {
        type: 'you',
        prompt: { en: 'Thank them and confirm you\'ll wait for the message', it: 'Ringrazia e conferma che aspetterai il messaggio' },
        hint: { en: 'Say ありがとうございます。よろしくお願いします (arigatou gozaimasu. yoroshiku onegai shimasu)', it: 'Di\' ありがとうございます。よろしくお願いします' },
        model: { japanese: 'ありがとうございます。よろしくお願いします', romaji: 'Arigatou gozaimasu. Yoroshiku onegai shimasu' },
        branches: [
          {
            keywords: ['ありがとう', 'arigatou', 'thank', 'thanks', 'よろしく', 'yoroshiku', 'わかりました', 'wakarimashita', 'ok', 'okay'],
            next: 'landlord-bye',
          },
        ],
        fallback: 'landlord-bye',
      },
      'landlord-bye': {
        type: 'them',
        japanese: 'では、よろしくお願いします。失礼します。',
        romaji: 'Dewa, yoroshiku onegai shimasu. Shitsurei shimasu.',
        meaning: { en: 'Alright, thank you. Goodbye.', it: 'Bene, grazie. Arrivederci.' },
        next: 'end',
        pause: 200,
      },
      end: {
        type: 'end',
        message: { en: 'You handled a real phone call in Japanese. That\'s huge. 📞', it: 'Hai gestito una vera telefonata in giapponese. È un grande risultato. 📞' },
      },
    },
  },

  // ─── 10. Haircut ───────────────────────────────────────────────────────────
  {
    id: 'haircut',
    icon: '✂️',
    title: { en: 'Barber / Hair Salon', it: 'Barbiere / Parrucchiere' },
    subtitle: { en: 'Explain what you want · Length · Style', it: 'Spiega cosa vuoi · Lunghezza · Stile' },
    situation: {
      en: "You sit in the barber's chair. The stylist drapes a cape over you and asks what you'd like.",
      it: "Sei seduto sulla sedia del barbiere. Il parrucchiere ti mette il mantello e chiede cosa vuoi.",
    },
    start: 'stylist-greet',
    nodes: {
      'stylist-greet': {
        type: 'them',
        japanese: 'いらっしゃいませ。今日はどのようにしますか？',
        romaji: 'Irasshaimase. Kyou wa dono you ni shimasu ka?',
        meaning: { en: 'Welcome. What would you like done today?', it: 'Benvenuto. Cosa le facciamo oggi?' },
        next: 'you-style',
      },
      'you-style': {
        type: 'you',
        prompt: { en: 'Tell the stylist what you want', it: 'Di\' al parrucchiere cosa vuoi' },
        hint: { en: 'Say 少し短くしてください (sukoshi mijikaku shite kudasai) — a little shorter please', it: 'Di\' 少し短くしてください (sukoshi mijikaku shite kudasai) — un po\' più corto per favore' },
        model: { japanese: '少し短くしてください', romaji: 'Sukoshi mijikaku shite kudasai' },
        branches: [
          {
            keywords: ['短く', 'mijikaku', 'short', 'shorter', 'cut', 'カット', 'katto', '揃え', 'soroe', 'trim', '整え', 'totonoe'],
            next: 'stylist-how-much',
          },
          {
            keywords: ['長く', 'nagaku', 'long', 'longer', 'keep', 'そのまま', 'sono mama', 'same'],
            next: 'stylist-how-much',
          },
        ],
        fallback: 'stylist-how-much',
      },
      'stylist-how-much': {
        type: 'them',
        japanese: 'どのくらい切りますか？',
        romaji: 'Dono kurai kirimasu ka?',
        meaning: { en: 'How much would you like cut?', it: 'Quanto tagliamo?' },
        next: 'you-length',
      },
      'you-length': {
        type: 'you',
        prompt: { en: 'Indicate how much to cut', it: 'Indica quanto tagliare' },
        hint: { en: 'Say ２センチくらい (ni senchi kurai) — about 2 cm, or これくらい (kore kurai) — about this much', it: 'Di\' ２センチくらい — circa 2 cm, o これくらい — più o meno così' },
        model: { japanese: '２センチくらいお願いします', romaji: 'Ni senchi kurai onegai shimasu' },
        branches: [
          {
            keywords: ['センチ', 'senchi', 'cm', 'centimeter', 'これくらい', 'kore kurai', 'this much', 'ちょっと', 'chotto', 'little', 'すこし', 'sukoshi'],
            next: 'stylist-sides',
          },
        ],
        fallback: 'stylist-sides',
      },
      'stylist-sides': {
        type: 'them',
        japanese: 'サイドはいかがですか？',
        romaji: 'Saido wa ikaga desu ka?',
        meaning: { en: 'What about the sides?', it: 'E i lati?' },
        next: 'you-sides',
      },
      'you-sides': {
        type: 'you',
        prompt: { en: 'Describe what you want for the sides', it: 'Descrivi cosa vuoi per i lati' },
        hint: { en: 'Say 短めにしてください (mijikame ni shite kudasai) — make them shorter', it: 'Di\' 短めにしてください (mijikame ni shite kudasai) — più corti' },
        model: { japanese: '短めにしてください', romaji: 'Mijikame ni shite kudasai' },
        branches: [
          {
            keywords: ['短め', 'mijikame', 'short', 'shorter', 'same', 'そのまま', 'sono mama', '同じ', 'onaji', 'すっきり', 'sukkiri'],
            next: 'stylist-confirm',
          },
        ],
        fallback: 'stylist-confirm',
      },
      'stylist-confirm': {
        type: 'them',
        japanese: 'わかりました。では、始めますね。',
        romaji: 'Wakarimashita. Dewa, hajimemasu ne.',
        meaning: { en: 'Understood. Let\'s get started then.', it: 'Capito. Allora cominciamo.' },
        next: 'narrator-cutting',
      },
      'narrator-cutting': {
        type: 'narrator',
        text: { en: 'The stylist gets to work. After a while, they hold up a mirror.', it: 'Il parrucchiere inizia. Dopo un po\', ti mostra lo specchio.' },
        next: 'stylist-mirror',
      },
      'stylist-mirror': {
        type: 'them',
        japanese: 'いかがですか？',
        romaji: 'Ikaga desu ka?',
        meaning: { en: 'How does it look?', it: 'Com\'è?' },
        next: 'you-reaction',
      },
      'you-reaction': {
        type: 'you',
        prompt: { en: 'React to your haircut', it: 'Reagisci al tuo taglio' },
        hint: { en: 'Say いいですね (ii desu ne) — looks good!, or もう少し短く (mou sukoshi mijikaku) — a bit shorter please', it: 'Di\' いいですね (ii desu ne) — bello!, o もう少し短く — un po\' più corto' },
        model: { japanese: 'いいですね、ありがとうございます', romaji: 'Ii desu ne, arigatou gozaimasu' },
        branches: [
          {
            keywords: ['いいです', 'ii desu', 'good', 'great', 'perfect', 'nice', '大丈夫', 'daijoubu', 'ありがとう', 'arigatou', 'いいね', 'いい感じ'],
            next: 'stylist-done',
          },
          {
            keywords: ['もう少し', 'mou sukoshi', 'more', 'shorter', 'もっと', 'motto', '短く', 'mijikaku'],
            next: 'stylist-more',
          },
        ],
        fallback: 'stylist-done',
      },
      'stylist-more': {
        type: 'them',
        japanese: 'かしこまりました。',
        romaji: 'Kashikomarimashita.',
        meaning: { en: 'Certainly.', it: 'Certamente.' },
        next: 'stylist-done',
        pause: 300,
      },
      'stylist-done': {
        type: 'them',
        japanese: 'ありがとうございました！またのご来店をお待ちしております。',
        romaji: 'Arigatou gozaimashita! Mata no goraiten wo omachi shite orimasu.',
        meaning: { en: 'Thank you! We look forward to your next visit.', it: 'Grazie! Speriamo di rivederla.' },
        next: 'end',
        pause: 200,
      },
      end: {
        type: 'end',
        message: { en: 'Fresh cut, perfect Japanese. ✂️', it: 'Taglio perfetto, giapponese perfetto. ✂️' },
      },
    },
  },

  // ─── 1. Convenience Store ──────────────────────────────────────────────────
  {
    id: 'konbini',
    icon: '🏪',
    title: { en: 'Convenience Store', it: 'Konbini' },
    subtitle: { en: 'Points card · Bag · Payment', it: 'Carta punti · Sacchetto · Pagamento' },
    situation: {
      en: "You're buying a bento and a drink at 7-Eleven. You place your items on the counter.",
      it: "Stai comprando un bento e una bevanda al 7-Eleven. Metti gli articoli sul bancone.",
    },
    start: 'welcome',
    nodes: {
      welcome: {
        type: 'them',
        japanese: 'いらっしゃいませ。',
        romaji: 'Irasshaimase.',
        meaning: { en: 'Welcome!', it: 'Benvenuto!' },
        next: 'points-q',
        pause: 300,
      },
      'points-q': {
        type: 'them',
        japanese: 'ポイントカードはお持ちですか？',
        romaji: 'Pointo kaado wa omochi desu ka?',
        meaning: { en: 'Do you have a points card?', it: 'Ha una carta punti?' },
        next: 'you-points',
      },
      'you-points': {
        type: 'you',
        prompt: { en: 'Respond to the points card question', it: 'Rispondi alla domanda sulla carta punti' },
        hint: { en: 'Say はい (hai) for yes, or 大丈夫です (daijoubu desu) for "no thanks"', it: 'Di\' はい (hai) per sì, o 大丈夫です (daijoubu desu) per "no grazie"' },
        model: { japanese: '大丈夫です', romaji: 'Daijoubu desu' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', 'あります', 'arimasu', 'もってます', 'もっています', 'ある'],
            next: 'points-yes',
          },
          {
            keywords: ['いいえ', 'no', 'nai', 'ない', 'ありません', 'arimasen', '大丈夫', 'daijoubu', 'けっこう', 'kekkou', 'ないです'],
            next: 'bag-q',
          },
        ],
        fallback: 'bag-q',
      },
      'points-yes': {
        type: 'them',
        japanese: 'ありがとうございます。',
        romaji: 'Arigatou gozaimasu.',
        meaning: { en: 'Thank you!', it: 'Grazie!' },
        next: 'bag-q',
        pause: 300,
      },
      'bag-q': {
        type: 'them',
        japanese: '袋はご利用ですか？',
        romaji: 'Fukuro wa goriyou desu ka?',
        meaning: { en: 'Would you like a bag?', it: 'Vuole un sacchetto?' },
        next: 'you-bag',
      },
      'you-bag': {
        type: 'you',
        prompt: { en: 'Do you want a bag?', it: 'Vuole un sacchetto?' },
        hint: { en: 'Say 大丈夫です (daijoubu desu) for no, or ください (kudasai) for yes please', it: 'Di\' 大丈夫です per no, o ください per sì' },
        model: { japanese: '大丈夫です', romaji: 'Daijoubu desu' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', 'ください', 'kudasai', 'お願い', 'onegai', 'いります', 'irimasu'],
            next: 'bag-yes',
          },
          {
            keywords: ['いいえ', 'no', '大丈夫', 'daijoubu', 'いりません', 'irimasen', 'けっこう', 'kekkou', 'エコ', 'eco', 'いらない'],
            next: 'total',
          },
        ],
        fallback: 'total',
      },
      'bag-yes': {
        type: 'them',
        japanese: 'かしこまりました。',
        romaji: 'Kashikomarimashita.',
        meaning: { en: 'Certainly!', it: 'Certo!' },
        next: 'total',
        pause: 300,
      },
      total: {
        type: 'them',
        japanese: '五百三十円になります。',
        romaji: 'Gohyaku sanjuu en ni narimasu.',
        meaning: { en: 'That will be 530 yen.', it: 'Sono 530 yen.' },
        next: 'you-pay',
      },
      'you-pay': {
        type: 'you',
        prompt: { en: 'How would you like to pay?', it: 'Come vuole pagare?' },
        hint: { en: 'Say 現金で (genkin de) for cash, or スイカで (suika de) for IC card', it: 'Di\' 現金で (genkin de) per contanti, o スイカで (suika de) per carta' },
        model: { japanese: 'スイカで', romaji: 'Suika de' },
        branches: [
          {
            keywords: ['カード', 'card', 'suica', 'スイカ', 'pasmo', 'パスモ', 'ic', 'タッチ', 'touch', '電子'],
            next: 'pay-card',
          },
          {
            keywords: ['現金', 'genkin', 'cash', 'お金', 'okane', '円', 'yen', 'さつ', 'コイン'],
            next: 'pay-cash',
          },
        ],
        fallback: 'pay-card',
      },
      'pay-card': {
        type: 'them',
        japanese: 'こちらにタッチしてください。',
        romaji: 'Kochira ni taachi shite kudasai.',
        meaning: { en: 'Please tap here.', it: 'Tocchi qui per favore.' },
        next: 'bye',
        pause: 400,
      },
      'pay-cash': {
        type: 'them',
        japanese: 'ありがとうございます。',
        romaji: 'Arigatou gozaimasu.',
        meaning: { en: 'Thank you!', it: 'Grazie!' },
        next: 'bye',
        pause: 300,
      },
      bye: {
        type: 'them',
        japanese: 'ありがとうございました！またお越しください。',
        romaji: 'Arigatou gozaimashita! Mata okoshi kudasai.',
        meaning: { en: 'Thank you! Please come again!', it: 'Grazie! Torni presto!' },
        next: 'end',
        pause: 200,
      },
      end: {
        type: 'end',
        message: { en: 'You handled the konbini like a local! 🏪', it: 'Hai gestito il konbini come un locale! 🏪' },
      },
    },
  },

  // ─── 2. Ramen Restaurant ───────────────────────────────────────────────────
  {
    id: 'ramen',
    icon: '🍜',
    title: { en: 'Ramen Restaurant', it: 'Ristorante di Ramen' },
    subtitle: { en: 'Enter · Order · Ask for the bill', it: 'Entra · Ordina · Chiedi il conto' },
    situation: {
      en: "You push through the curtain (のれん) of a small ramen shop. The staff looks up.",
      it: "Entri spingendo la tenda (のれん) di una piccola ramen-ya. Il personale ti guarda.",
    },
    start: 'greet',
    nodes: {
      greet: {
        type: 'them',
        japanese: 'いらっしゃいませ！何名様ですか？',
        romaji: 'Irasshaimase! Nanmei-sama desu ka?',
        meaning: { en: 'Welcome! How many people?', it: 'Benvenuto! Quante persone?' },
        next: 'you-party',
      },
      'you-party': {
        type: 'you',
        prompt: { en: 'How many people are in your group?', it: 'Quante persone siete?' },
        hint: { en: 'Say ひとり (hitori) for one, or ふたり (futari) for two', it: 'Di\' ひとり (hitori) per uno, o ふたり (futari) per due' },
        model: { japanese: 'ひとりです', romaji: 'Hitori desu' },
        branches: [
          {
            keywords: ['ひとり', 'hitori', '一人', '一名', '1', 'one', 'いち', 'ichi'],
            next: 'seat-1',
          },
          {
            keywords: ['ふたり', 'futari', '二人', '二名', '2', 'two', 'に', 'ni'],
            next: 'seat-2',
          },
        ],
        fallback: 'seat-1',
      },
      'seat-1': {
        type: 'them',
        japanese: 'お一人様ですね。こちらへどうぞ。',
        romaji: 'Ohitori-sama desu ne. Kochira e douzo.',
        meaning: { en: 'Just one? Right this way.', it: 'Siete in uno? Prego, da questa parte.' },
        next: 'narrator-seated',
        pause: 400,
      },
      'seat-2': {
        type: 'them',
        japanese: 'お二人様ですね。こちらへどうぞ。',
        romaji: 'Ofutari-sama desu ne. Kochira e douzo.',
        meaning: { en: 'Two of you? Right this way.', it: 'Siete in due? Prego, da questa parte.' },
        next: 'narrator-seated',
        pause: 400,
      },
      'narrator-seated': {
        type: 'narrator',
        text: { en: 'You sit down. A menu is placed in front of you. A moment later, the staff returns.', it: 'Ti siedi. Un menù viene messo davanti a te. Poco dopo il personale ritorna.' },
        next: 'order-q',
      },
      'order-q': {
        type: 'them',
        japanese: 'ご注文はお決まりですか？',
        romaji: 'Gochuumon wa okimari desu ka?',
        meaning: { en: 'Have you decided on your order?', it: 'Ha scelto cosa ordinare?' },
        next: 'you-order',
      },
      'you-order': {
        type: 'you',
        prompt: { en: 'Order your ramen', it: 'Ordina il tuo ramen' },
        hint: { en: 'Try: 醤油ラーメンをひとつ (shoyu raamen wo hitotsu) — one soy sauce ramen', it: 'Prova: 醤油ラーメンをひとつ (shoyu raamen wo hitotsu)' },
        model: { japanese: '醤油ラーメンをひとつお願いします', romaji: 'Shoyu raamen wo hitotsu onegai shimasu' },
        branches: [
          {
            keywords: ['ラーメン', 'ramen', 'らーめん', '醤油', 'shoyu', '味噌', 'miso', '豚骨', 'tonkotsu', 'しお', '塩', 'shio', 'つけ麺', 'tsukemen'],
            next: 'order-confirm',
          },
          {
            keywords: ['まだ', 'mada', 'wait', '少し', 'sukoshi', 'ちょっと', 'chotto', '待って', '時間'],
            next: 'order-wait',
          },
        ],
        fallback: 'order-confirm',
      },
      'order-wait': {
        type: 'them',
        japanese: 'はい、もう少しお待ちください。',
        romaji: 'Hai, mou sukoshi omachi kudasai.',
        meaning: { en: 'Of course, take your time!', it: 'Certo, si prenda il tempo che vuole!' },
        next: 'order-q',
        pause: 500,
      },
      'order-confirm': {
        type: 'them',
        japanese: 'ありがとうございます。少々お待ちください。',
        romaji: 'Arigatou gozaimasu. Shoushou omachi kudasai.',
        meaning: { en: 'Thank you! Please wait a moment.', it: 'Grazie! Un momento per favore.' },
        next: 'narrator-food',
        pause: 400,
      },
      'narrator-food': {
        type: 'narrator',
        text: { en: "Your ramen arrives, steaming hot. You eat every last drop. Time to pay.", it: "Il tuo ramen arriva, fumante. Lo mangi fino all'ultima goccia. È ora di pagare." },
        next: 'you-bill',
      },
      'you-bill': {
        type: 'you',
        prompt: { en: 'Ask for the bill', it: 'Chiedi il conto' },
        hint: { en: 'Say すみません、お会計をお願いします (sumimasen, okaikei wo onegai shimasu)', it: 'Di\' すみません、お会計をお願いします' },
        model: { japanese: 'すみません、お会計をお願いします', romaji: 'Sumimasen, okaikei wo onegai shimasu' },
        branches: [
          {
            keywords: ['お会計', 'okaikei', '会計', 'kaikei', 'bill', 'check', 'pay', 'お勘定', '払', '支払'],
            next: 'bill-resp',
          },
          {
            keywords: ['すみません', 'sumimasen', 'excuse'],
            next: 'bill-resp',
          },
        ],
        fallback: 'bill-resp',
      },
      'bill-resp': {
        type: 'them',
        japanese: 'ありがとうございました。七百八十円です。',
        romaji: 'Arigatou gozaimashita. Nanahyaku hachijuu en desu.',
        meaning: { en: 'Thank you! That\'s 780 yen.', it: 'Grazie! Sono 780 yen.' },
        next: 'ramen-bye',
        pause: 400,
      },
      'ramen-bye': {
        type: 'them',
        japanese: 'またのご来店をお待ちしております！',
        romaji: 'Mata no goraiten wo omachi shite orimasu!',
        meaning: { en: 'We look forward to your next visit!', it: 'Speriamo di rivederla presto!' },
        next: 'end',
        pause: 200,
      },
      end: {
        type: 'end',
        message: { en: 'Perfect meal, perfect Japanese. 🍜', it: 'Pasto perfetto, giapponese perfetto. 🍜' },
      },
    },
  },

  // ─── 3. Train Station — IC Card Problem ────────────────────────────────────
  {
    id: 'station',
    icon: '🚃',
    title: { en: 'Train Station', it: 'Stazione' },
    subtitle: { en: 'IC card won\'t open the gate — ask for help', it: 'IC card bloccata — chiedi aiuto' },
    situation: {
      en: "Your IC card won't open the ticket gate. A red light flashes. You approach the staff booth.",
      it: "La tua IC card non apre il tornello. Lampeggia una luce rossa. Vai allo sportello.",
    },
    start: 'you-approach',
    nodes: {
      'you-approach': {
        type: 'you',
        prompt: { en: 'Get the staff\'s attention', it: 'Attira l\'attenzione del personale' },
        hint: { en: 'Say すみません (sumimasen) — excuse me', it: 'Di\' すみません (sumimasen) — scusi' },
        model: { japanese: 'すみません', romaji: 'Sumimasen' },
        branches: [
          {
            keywords: ['すみません', 'sumimasen', 'excuse', 'あの', 'ano', 'ちょっと', 'chotto', 'help'],
            next: 'staff-response',
          },
        ],
        fallback: 'staff-response',
      },
      'staff-response': {
        type: 'them',
        japanese: 'はい、どうされましたか？',
        romaji: 'Hai, dou saremashita ka?',
        meaning: { en: 'Yes, what happened?', it: 'Sì, cosa è successo?' },
        next: 'you-explain',
      },
      'you-explain': {
        type: 'you',
        prompt: { en: 'Explain your IC card isn\'t working', it: 'Spiega che la tua IC card non funziona' },
        hint: { en: 'Say ゲートが開きません (geeto ga akimasen) — the gate won\'t open', it: 'Di\' ゲートが開きません (geeto ga akimasen)' },
        model: { japanese: 'スイカが使えません', romaji: 'Suika ga tsukaemasen' },
        branches: [
          {
            keywords: ['カード', 'card', 'suica', 'スイカ', 'pasmo', 'パスモ', 'ゲート', 'gate', '開', '使えない', 'tsukaenai', '通れない', 'エラー', 'error', '壊'],
            next: 'staff-check',
          },
          {
            keywords: ['残高', 'zandaka', 'balance', 'charge', 'チャージ', '足りない', 'tarinai'],
            next: 'staff-diagnose',
          },
        ],
        fallback: 'staff-check',
      },
      'staff-check': {
        type: 'them',
        japanese: 'カードを見せていただけますか？',
        romaji: 'Kaado wo misete itadakemasu ka?',
        meaning: { en: 'Could I see your card?', it: 'Posso vedere la sua carta?' },
        next: 'you-hand',
      },
      'you-hand': {
        type: 'you',
        prompt: { en: 'Hand over your card', it: 'Passa la tua carta' },
        hint: { en: 'Say はい、どうぞ (hai, douzo) — here you go', it: 'Di\' はい、どうぞ (hai, douzo) — prego' },
        model: { japanese: 'はい、どうぞ', romaji: 'Hai, douzo' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', 'どうぞ', 'douzo', 'here', 'please', 'わかりました'],
            next: 'staff-diagnose',
          },
        ],
        fallback: 'staff-diagnose',
      },
      'staff-diagnose': {
        type: 'them',
        japanese: '残高が不足しているようです。',
        romaji: 'Zandaka ga fusoku shite iru you desu.',
        meaning: { en: 'It seems your balance is insufficient.', it: 'Sembra che il saldo sia insufficiente.' },
        next: 'staff-solution',
        pause: 400,
      },
      'staff-solution': {
        type: 'them',
        japanese: 'あちらのチャージ機でチャージできますよ。',
        romaji: 'Achira no chaaji-ki de chaaji dekimasu yo.',
        meaning: { en: 'You can top up at the charging machine over there.', it: 'Può ricaricare alla macchinetta là.' },
        next: 'you-thanks',
        pause: 300,
      },
      'you-thanks': {
        type: 'you',
        prompt: { en: 'Thank the staff', it: 'Ringrazia il personale' },
        hint: { en: 'Say ありがとうございます (arigatou gozaimasu)', it: 'Di\' ありがとうございます (arigatou gozaimasu)' },
        model: { japanese: 'ありがとうございます', romaji: 'Arigatou gozaimasu' },
        branches: [
          {
            keywords: ['ありがとう', 'arigatou', 'thank', 'thanks', 'どうも', 'doumo', 'わかりました', 'wakarimashita', 'ok', 'okay'],
            next: 'staff-bye',
          },
        ],
        fallback: 'end',
      },
      'staff-bye': {
        type: 'them',
        japanese: 'お気をつけて。',
        romaji: 'Oki wo tsukete.',
        meaning: { en: 'Take care!', it: 'Si faccia attenzione!' },
        next: 'end',
        pause: 200,
      },
      end: {
        type: 'end',
        message: { en: 'Problem solved! IC card recharged and gate open. 🚃', it: 'Problema risolto! IC card ricaricata e tornello aperto. 🚃' },
      },
    },
  },

  // ─── 4. Asking for Directions ──────────────────────────────────────────────
  {
    id: 'directions',
    icon: '🗺️',
    title: { en: 'Asking Directions', it: 'Chiedere la Strada' },
    subtitle: { en: 'Stop someone · Ask · Confirm', it: 'Ferma qualcuno · Chiedi · Conferma' },
    situation: {
      en: "You're lost and need the nearest convenience store. You spot someone walking by.",
      it: "Sei perso e cerchi il konbini più vicino. Vedi qualcuno che cammina.",
    },
    start: 'you-stop',
    nodes: {
      'you-stop': {
        type: 'you',
        prompt: { en: 'Stop someone to ask for directions', it: 'Ferma qualcuno per chiedere indicazioni' },
        hint: { en: 'Say すみません (sumimasen) — excuse me', it: 'Di\' すみません (sumimasen) — scusi' },
        model: { japanese: 'すみません', romaji: 'Sumimasen' },
        branches: [
          {
            keywords: ['すみません', 'sumimasen', 'excuse', 'あの', 'ano', 'ちょっと', 'chotto', 'help', 'ねえ'],
            next: 'passerby-yes',
          },
        ],
        fallback: 'passerby-yes',
      },
      'passerby-yes': {
        type: 'them',
        japanese: 'はい？',
        romaji: 'Hai?',
        meaning: { en: 'Yes?', it: 'Sì?' },
        next: 'you-ask',
      },
      'you-ask': {
        type: 'you',
        prompt: { en: 'Ask where the nearest convenience store is', it: 'Chiedi dov\'è il konbini più vicino' },
        hint: { en: 'Say 近くにコンビニはありますか？(chikaku ni konbini wa arimasu ka?)', it: 'Di\' 近くにコンビニはありますか？' },
        model: { japanese: '近くにコンビニはありますか？', romaji: 'Chikaku ni konbini wa arimasu ka?' },
        branches: [
          {
            keywords: ['コンビニ', 'konbini', 'convenience', 'store', 'セブン', 'seven', 'ローソン', 'lawson', 'ファミマ'],
            next: 'konbini-directions',
          },
          {
            keywords: ['駅', 'eki', 'station', 'train', '電車', 'densha'],
            next: 'station-directions',
          },
          {
            keywords: ['どこ', 'doko', 'where', 'ありますか', 'chikaku', '近く'],
            next: 'konbini-directions',
          },
        ],
        fallback: 'konbini-directions',
      },
      'konbini-directions': {
        type: 'them',
        japanese: 'コンビニですね。そこの角を右に曲がって、少し歩いたらありますよ。',
        romaji: 'Konbini desu ne. Soko no kado wo migi ni magatte, sukoshi aruitara arimasu yo.',
        meaning: { en: 'A convenience store? Turn right at that corner, walk a bit and you\'ll find one.', it: 'Un konbini? Giri a destra a quell\'angolo, cammini un po\' e lo trova.' },
        next: 'you-confirm',
        pause: 500,
      },
      'station-directions': {
        type: 'them',
        japanese: '駅ですか。まっすぐ行って、信号を左です。',
        romaji: 'Eki desu ka. Massugu itte, shingou wo hidari desu.',
        meaning: { en: 'The station? Go straight and turn left at the traffic light.', it: 'La stazione? Vada dritto e giri a sinistra al semaforo.' },
        next: 'you-confirm',
        pause: 400,
      },
      'you-confirm': {
        type: 'you',
        prompt: { en: 'Thank them and confirm you understood (or ask to repeat)', it: 'Ringrazia e conferma di aver capito' },
        hint: { en: 'Say わかりました、ありがとうございます (wakarimashita, arigatou gozaimasu)', it: 'Di\' わかりました、ありがとうございます' },
        model: { japanese: 'わかりました、ありがとうございます', romaji: 'Wakarimashita, arigatou gozaimasu' },
        branches: [
          {
            keywords: ['わかりました', 'wakarimashita', 'わかった', 'understood', 'ok', 'okay', 'ありがとう', 'arigatou', 'thank', 'thanks', 'どうも'],
            next: 'passerby-bye',
          },
          {
            keywords: ['もう一度', 'mouichido', 'again', 'repeat', 'もっとゆっくり', 'slowly', 'わからない', 'wakaranai'],
            next: 'repeat',
          },
        ],
        fallback: 'passerby-bye',
      },
      repeat: {
        type: 'them',
        japanese: 'じゃあ、ゆっくり言いますね。そこの角を右に曲がって、少し歩いたら見えますよ。',
        romaji: 'Jaa, yukkuri iimasu ne. Soko no kado wo migi ni magatte, sukoshi aruitara miemasu yo.',
        meaning: { en: "I'll say it slowly. Turn right at that corner, walk a bit and you'll see it.", it: "Lo dico piano. Giri a destra a quell'angolo, cammini un po' e lo vedrà." },
        next: 'passerby-bye',
        pause: 400,
      },
      'passerby-bye': {
        type: 'them',
        japanese: 'お気をつけて！',
        romaji: 'Oki wo tsukete!',
        meaning: { en: 'Take care!', it: 'Stia attento!' },
        next: 'end',
        pause: 200,
      },
      end: {
        type: 'end',
        message: { en: "You got directions without freezing up. 🗺️", it: "Hai chiesto indicazioni senza bloccarti. 🗺️" },
      },
    },
  },

  // ─── 5. Delivery at Your Door ──────────────────────────────────────────────
  {
    id: 'delivery',
    icon: '📦',
    title: { en: 'Package Delivery', it: 'Consegna Pacco' },
    subtitle: { en: 'Answer the door · Sign · Redeliver', it: 'Apri la porta · Firma · Riconsegna' },
    situation: {
      en: "Someone rings your doorbell. It's a delivery person with a package.",
      it: "Qualcuno suona il citofono. È il corriere con un pacco.",
    },
    start: 'knock',
    nodes: {
      knock: {
        type: 'them',
        japanese: 'ヤマト運輸です。お届け物です。',
        romaji: 'Yamato un\'yu desu. Otodokemono desu.',
        meaning: { en: 'Yamato Transport. I have a delivery for you.', it: 'Yamato Transport. Ho una consegna per lei.' },
        next: 'you-open',
      },
      'you-open': {
        type: 'you',
        prompt: { en: 'Acknowledge the delivery person', it: 'Rispondi al corriere' },
        hint: { en: 'Say はい (hai) or ちょっと待ってください (chotto matte kudasai) — one moment', it: 'Di\' はい (hai) o ちょっと待ってください — un momento' },
        model: { japanese: 'はい、ちょっと待ってください', romaji: 'Hai, chotto matte kudasai' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', 'okay', 'ok', '待って', 'matte', 'ちょっと', 'chotto', 'わかりました', 'どうぞ'],
            next: 'sign-request',
          },
        ],
        fallback: 'sign-request',
      },
      'sign-request': {
        type: 'them',
        japanese: 'こちらにサインかお判子をいただけますか？',
        romaji: 'Kochira ni sain ka ohanko wo itadakemasu ka?',
        meaning: { en: 'Could I get a signature or stamp here?', it: 'Potrei avere una firma o timbro qui?' },
        next: 'you-sign',
      },
      'you-sign': {
        type: 'you',
        prompt: { en: 'Respond to the signature request', it: 'Rispondi alla richiesta di firma' },
        hint: { en: 'Say はい、どうぞ (hai, douzo) — yes, go ahead', it: 'Di\' はい、どうぞ (hai, douzo) — sì, prego' },
        model: { japanese: 'はい、どうぞ', romaji: 'Hai, douzo' },
        branches: [
          {
            keywords: ['はい', 'hai', 'yes', 'どうぞ', 'douzo', 'わかりました', 'okay', 'ok', 'サイン', 'sign'],
            next: 'delivery-done',
          },
          {
            keywords: ['ない', 'nai', '判子', 'hanko', 'ありません', 'arimasen', 'no', 'いいえ'],
            next: 'no-hanko',
          },
        ],
        fallback: 'delivery-done',
      },
      'no-hanko': {
        type: 'them',
        japanese: 'では、サインだけで大丈夫ですよ。',
        romaji: 'Dewa, sain dake de daijoubu desu yo.',
        meaning: { en: 'In that case, just a signature is fine.', it: 'In quel caso, basta una firma.' },
        next: 'delivery-done',
        pause: 300,
      },
      'delivery-done': {
        type: 'them',
        japanese: 'ありがとうございます。失礼します。',
        romaji: 'Arigatou gozaimasu. Shitsurei shimasu.',
        meaning: { en: 'Thank you. Excuse me.', it: 'Grazie. Mi scusi.' },
        next: 'end',
        pause: 200,
      },
      end: {
        type: 'end',
        message: { en: 'Package received without confusion. 📦', it: 'Pacco ricevuto senza problemi. 📦' },
      },
    },
  },

];


// ═══════════════════════════════════════════════════════════════════════════════
// HOW TO ADD A NEW SCENARIO — copy-paste this template, fill in the blanks
// ═══════════════════════════════════════════════════════════════════════════════
//
// Push a new object into the CONVERSATIONS array above (before the final ];).
// Each scenario has a header + a flat node dictionary.
//
// ─── SCENARIO HEADER ──────────────────────────────────────────────────────────
//
//   id:        unique string, no spaces, e.g. 'post-office'
//   icon:      single emoji shown in the list
//   title:     { en: '...', it: '...' }  — shown in list and header bar
//   subtitle:  { en: '...', it: '...' }  — 3-word preview of the steps
//   situation: { en: '...', it: '...' }  — shown at top of chat (sets the scene)
//   start:     'nodeId'                  — first node to run
//   nodes:     { ... }                   — flat dictionary of ALL nodes
//
// ─── NODE TYPES ───────────────────────────────────────────────────────────────
//
// 1) narrator — grey italic text, no mic, auto-advances after 1.8s
//    { type:'narrator', text:{en,it}, next:'nodeId' }
//
// 2) them — Japanese side speaks via TTS (black bubble, left-aligned)
//    { type:'them', japanese:'...', romaji:'...', meaning:{en,it},
//      next:'nodeId', pause:300 }     ← pause (ms) before advancing; default 800
//
// 3) you — user's turn (mic activates, white bubble on right when they speak)
//    { type:'you',
//      prompt:{en,it},               ← instruction above mic
//      hint:{en,it},                 ← shown after 1st fail
//      model:{ japanese:'...', romaji:'...' },  ← spoken aloud after 2nd fail
//      branches:[
//        { keywords:['word','言葉','romaji'], next:'nodeId' },
//      ],
//      fallback:'nodeId' }           ← Skip goes here (usually best-guess branch)
//
// 4) end — completion screen
//    { type:'end', message:{en,it} }
//
// ─── KEYWORD TIPS ─────────────────────────────────────────────────────────────
//
//  • Include kanji/kana + romaji + common English equivalents per branch.
//  • Speech recognition (lang:ja-JP) returns Japanese when the user speaks
//    Japanese; add romaji in case it transcribes phonetically.
//  • Keep each keyword SHORT — the engine checks if it appears anywhere in
//    the full transcript (case-insensitive substring match).
//  • For yes/no branches always cover: はい hai yes / いいえ no 大丈夫 daijoubu.
//  • Aim for 5–15 keywords per branch; be generous.
//  • fallback should point to the most likely "correct" next node so the
//    conversation can continue naturally even if matching fails.
//
// ─── BLANK TEMPLATE (copy from here) ─────────────────────────────────────────
//
// {
//   id: 'my-scenario',
//   icon: '🏷️',
//   title:    { en: 'My Scenario',    it: 'Il mio scenario' },
//   subtitle: { en: 'Step · Step',    it: 'Passo · Passo' },
//   situation:{ en: 'You are ...',    it: 'Sei ...' },
//   start: 'open',
//   nodes: {
//
//     open: {
//       type: 'them',
//       japanese: 'いらっしゃいませ。',
//       romaji:   'Irasshaimase.',
//       meaning:  { en: 'Welcome!', it: 'Benvenuto!' },
//       next:     'you-respond',
//     },
//
//     'you-respond': {
//       type:    'you',
//       prompt:  { en: 'Respond',      it: 'Rispondi' },
//       hint:    { en: 'Say はい (hai)', it: 'Di\' はい (hai)' },
//       model:   { japanese: 'はい', romaji: 'Hai' },
//       branches: [
//         { keywords: ['はい','hai','yes','okay'], next: 'middle' },
//       ],
//       fallback: 'middle',
//     },
//
//     middle: {
//       type: 'narrator',
//       text: { en: 'Things happen...', it: 'Le cose accadono...' },
//       next: 'end',
//     },
//
//     end: {
//       type:    'end',
//       message: { en: 'You did it! 🎉', it: 'Ce l\'hai fatta! 🎉' },
//     },
//
//   },
// },
