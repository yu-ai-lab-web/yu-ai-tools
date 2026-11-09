/* ============================================================
   Yu AI Tools - script.js
   画面の「動き」を決めるファイルです。
   前半：ツールごとの設定（入力欄とプロンプトのひな形）
   後半：画面の操作（ボタンを押したときの処理など）
   ※ 外部のAIやインターネットには一切接続しません。
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
   小さな便利関数
   ------------------------------------------------------------ */
const $ = (selector) => document.querySelector(selector);

/** 「# 見出し」＋中身 のブロックを作る（中身が空なら何も出さない） */
function block(title, body) {
  if (!body || !String(body).trim()) return '';
  return `# ${title}\n${String(body).trim()}`;
}

/** 箇条書き（「- 」つき）にする。空の項目は自動で除く */
function bullets(items) {
  return items.filter(Boolean).map((s) => `- ${s}`).join('\n');
}

/** 番号つきリストにする */
function numbered(items) {
  return items.filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join('\n');
}

/** 複数のブロックを空行でつなげる */
function joinBlocks(...blocks) {
  return blocks.filter(Boolean).join('\n\n');
}

/** 長い文章を """ で囲む（ChatGPTが「ここからここまでが対象」とわかりやすくなる） */
function quote(text) {
  return `"""\n${text}\n"""`;
}

/* ------------------------------------------------------------
   アイコン（SVGという、拡大してもきれいな画像形式）
   ------------------------------------------------------------ */
const ICONS = {
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  minutes: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  proofread: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>',
  glossary: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M9 8h6M9 12h4"/></svg>',
  custom: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z"/></svg>',
};

/* ------------------------------------------------------------
   ツールの設定
   fields … 入力欄の一覧
     type: 'text'(1行) / 'textarea'(複数行) / 'select'(選択) / 'checks'(チェック)
   sample … 「入力例を入れる」で入る内容
   build  … 入力内容からプロンプトを組み立てる処理
   ------------------------------------------------------------ */
const TOOLS = [
  /* ===== 1. ビジネスメール作成 ===== */
  {
    id: 'email',
    name: 'ビジネスメール',
    sub: '依頼・お礼・お詫びなど',
    title: 'ビジネスメール作成',
    desc: '伝えたいことを箇条書きで入れるだけで、敬語の整ったメールを作るプロンプトになります。',
    fields: [
      { name: 'recipient', label: '送る相手', type: 'text', required: true,
        placeholder: '例：取引先 ABC商事の山田様', help: '会社名や立場も書くと、より適切な敬語になります。' },
      { name: 'purpose', label: 'メールの目的', type: 'select',
        options: ['依頼', 'お礼', 'お詫び', '日程調整', '報告・連絡', 'お断り', '問い合わせ', 'あいさつ'] },
      { name: 'content', label: '伝えたい内容', type: 'textarea', rows: 5, required: true, privacy: true,
        placeholder: '例：\n・来週の打ち合わせを延期したい\n・候補日は11/18（火）か11/20（木）の午後', help: '箇条書きでOKです。' },
      { name: 'tone', label: '丁寧さ', type: 'select',
        options: ['とても丁寧（社外・目上の方向け）', '標準（一般的なビジネス向け）', 'やや簡潔（社内向け）'] },
      { name: 'sender', label: '差出人（あなたの名前・会社名）', type: 'text',
        placeholder: '例：XYZ株式会社 営業部 佐藤', help: '空欄の場合は [自分の名前] と仮に表示されます。' },
    ],
    sample: {
      recipient: '取引先 ABC商事 営業部の山田様',
      purpose: '日程調整',
      content: '・11月14日（金）の打ち合わせを、社内の都合で延期させてほしい\n・代わりの候補日は11月18日（火）14時〜、11月20日（木）10時〜\n・ご迷惑をおかけすることをお詫びしたい',
      tone: 'とても丁寧（社外・目上の方向け）',
      sender: 'XYZ株式会社 営業部 佐藤',
    },
    build: (v) => joinBlocks(
      'あなたは日本のビジネスマナーに詳しい、プロのビジネス文書アシスタントです。\n以下の情報をもとに、そのまま送れるビジネスメールを作成してください。',
      block('送る相手', v.recipient),
      block('メールの目的', v.purpose),
      block('伝えたい内容', v.content),
      block('条件', bullets([
        `丁寧さ：${v.tone}`,
        `差出人：${v.sender || '[自分の名前]'}`,
        '件名も考える',
        '正しい敬語を使い、相手に失礼のない表現にする',
        '結論を先に書き、適度に改行して読みやすくする',
        '日時や金額など、わからない情報は [ ] で囲んで仮に置く',
      ])),
      block('出力形式', '件名：（件名）\n\n本文：\n（メール本文）\n\n最後に、送信前に確認すべきポイントを3つ、箇条書きで教えてください。'),
    ),
  },

  /* ===== 2. 会議議事録の整理 ===== */
  {
    id: 'minutes',
    name: '議事録の整理',
    sub: 'メモを読みやすく',
    title: '会議議事録の整理',
    desc: '会議中に取った走り書きのメモを、共有できる議事録にまとめるプロンプトになります。',
    fields: [
      { name: 'meeting', label: '会議名', type: 'text', placeholder: '例：新商品プロモーション定例会議' },
      { name: 'date', label: '日時', type: 'text', placeholder: '例：2026年11月9日 10:00〜11:00' },
      { name: 'attendees', label: '参加者', type: 'text', placeholder: '例：田中部長、佐藤、鈴木、高橋' },
      { name: 'memo', label: '会議のメモ', type: 'textarea', rows: 8, required: true, privacy: true,
        placeholder: '会議中に取ったメモをそのまま貼り付けてください。\n走り書き・箇条書きでも大丈夫です。' },
      { name: 'detail', label: 'まとめ方', type: 'select',
        options: ['標準（要点をバランスよく）', '簡潔（1分で読める長さ）', '詳細（話し合いの流れもくわしく）'] },
      { name: 'options', label: 'オプション', type: 'checks',
        options: ['ToDo（やること）を表にまとめる', '次回までの課題・確認事項も書く', '決定事項を太字で目立たせる'],
        default: ['ToDo（やること）を表にまとめる', '次回までの課題・確認事項も書く'] },
    ],
    sample: {
      meeting: '新商品プロモーション定例会議',
      date: '2026年11月9日 10:00〜11:00',
      attendees: '田中部長、佐藤、鈴木、高橋',
      memo: '・SNS広告 先月比 クリック数1.3倍、でも購入につながってない\n・LPのデザイン見直す？→鈴木さん案出す 来週金曜まで\n・展示会（12/5）出展決定、ブース担当 高橋\n・予算 残り80万 → 広告に50万使う方向で部長OK\n・インフルエンサー案は保留、次回再検討',
      detail: '標準（要点をバランスよく）',
      options: ['ToDo（やること）を表にまとめる', '次回までの課題・確認事項も書く'],
    },
    build: (v) => {
      const todoTable = v.options.includes('ToDo（やること）を表にまとめる');
      const nextIssues = v.options.includes('次回までの課題・確認事項も書く');
      const bold = v.options.includes('決定事項を太字で目立たせる');
      return joinBlocks(
        'あなたは優秀な会議の書記です。\n以下の会議メモを、社内で共有できるわかりやすい議事録に整理してください。',
        block('会議の情報', bullets([
          v.meeting && `会議名：${v.meeting}`,
          v.date && `日時：${v.date}`,
          v.attendees && `参加者：${v.attendees}`,
        ])),
        block('会議メモ（整理前）', quote(v.memo)),
        block('条件', bullets([
          `まとめ方：${v.detail}`,
          bold && '決定事項は太字で目立たせる',
          'メモに書かれていない内容は、推測で付け足さない',
          '意味がはっきりしない部分は「要確認」と書く',
        ])),
        block('出力形式', numbered([
          '会議の概要（会議名・日時・参加者）',
          '議題ごとの要点',
          '決定事項',
          todoTable ? 'ToDo（表形式：やること／担当者／期限）' : 'ToDo（やること・担当者・期限）',
          nextIssues && '次回までの課題・確認事項',
        ])),
      );
    },
  },

  /* ===== 3. 文章校正 ===== */
  {
    id: 'proofread',
    name: '文章校正',
    sub: '誤字・敬語をチェック',
    title: '文章校正',
    desc: '誤字脱字や言葉づかいの間違いを直し、読みやすい文章にするプロンプトになります。',
    fields: [
      { name: 'text', label: '校正したい文章', type: 'textarea', rows: 8, required: true, privacy: true,
        placeholder: 'チェックしてほしい文章を貼り付けてください。' },
      { name: 'usage', label: '文章の用途', type: 'select',
        options: ['社外向けメール', '社内向けメール・チャット', '報告書・企画書', 'お知らせ・案内文', 'SNS・ブログ'] },
      { name: 'level', label: '直し方のレベル', type: 'select',
        options: ['標準（読みやすく自然な文章に整える）', '軽め（誤字脱字・敬語の間違いだけ直す）', 'しっかり（構成から見直して書き直す）'] },
      { name: 'options', label: 'オプション', type: 'checks',
        options: ['直した箇所と理由を表で示す', '元の意味や事実は変えない'],
        default: ['直した箇所と理由を表で示す', '元の意味や事実は変えない'] },
    ],
    sample: {
      text: 'お世話になっております。先日はお忙しい中、打ち合わせのお時間を頂き有難うございました。\nご提案いただいた件ですが、社内で検討させて頂いた結果、ぜひ進めさせていただきたいと思っております。\n詳細につきましては、改めてご連絡させていただけたらと存じますので、よろしくお願い致します。',
      usage: '社外向けメール',
      level: '標準（読みやすく自然な文章に整える）',
      options: ['直した箇所と理由を表で示す', '元の意味や事実は変えない'],
    },
    build: (v) => {
      const table = v.options.includes('直した箇所と理由を表で示す');
      return joinBlocks(
        'あなたは経験豊富な日本語の校正・編集者です。\n以下の文章を校正してください。',
        block('文章の用途', v.usage),
        block('直し方のレベル', v.level),
        block('条件', bullets([
          v.options.includes('元の意味や事実は変えない') && '元の意味や事実は変えない',
          '誤字脱字、敬語・言葉づかいの誤りを直す',
          '表記ゆれ（例：「お問合せ」と「お問い合わせ」）をそろえる',
          '用途にふさわしい文体にする',
        ])),
        block('校正する文章', quote(v.text)),
        block('出力形式', numbered([
          '校正後の文章（全文）',
          table && '直した箇所の一覧（表形式：修正前／修正後／理由）',
          'さらに良くするためのアドバイス（1〜2点）',
        ])),
      );
    },
  },

  /* ===== 4. 専門用語の説明 ===== */
  {
    id: 'glossary',
    name: '専門用語の説明',
    sub: 'やさしく解説',
    title: '専門用語の説明',
    desc: 'わからない言葉を、自分のレベルに合わせてやさしく説明してもらうプロンプトになります。',
    fields: [
      { name: 'term', label: '知りたい用語', type: 'text', required: true, placeholder: '例：KPI、サブスク、DX' },
      { name: 'field', label: '分野', type: 'text', placeholder: '例：IT、会計、マーケティング',
        help: '同じ言葉でも分野によって意味が変わる場合があるため、わかれば書いてください。' },
      { name: 'level', label: 'あなたの知識レベル', type: 'select',
        options: ['まったく初めて聞いた', 'なんとなく聞いたことがある', '仕事で使うので正しく理解したい'] },
      { name: 'length', label: '説明の長さ', type: 'select',
        options: ['ふつう（600字程度）', '短く（300字程度）', 'くわしく（1000字程度）'] },
      { name: 'options', label: '入れてほしい内容', type: 'checks',
        options: ['身近なものに例えた説明', '仕事での使い方（例文）', 'よく一緒に出てくる関連用語', '間違えやすいポイント'],
        default: ['身近なものに例えた説明', '仕事での使い方（例文）'] },
    ],
    sample: {
      term: 'KPI',
      field: 'ビジネス・マーケティング',
      level: 'まったく初めて聞いた',
      length: 'ふつう（600字程度）',
      options: ['身近なものに例えた説明', '仕事での使い方（例文）', 'よく一緒に出てくる関連用語'],
    },
    build: (v) => joinBlocks(
      'あなたは、専門用語を知識のない人にもわかりやすく教えるのが得意な先生です。\n次の用語について、初心者にもわかるように説明してください。',
      block('説明してほしい用語', v.term),
      block('分野', v.field),
      block('私の知識レベル', v.level),
      block('条件', bullets([
        '中学生でもわかる言葉を使う',
        '説明の中で別の難しい言葉を使う場合は、その言葉も簡単に説明する',
        `長さ：${v.length}`,
      ])),
      block('出力形式', numbered([
        'ひとことで言うと（1文で）',
        'くわしい説明',
        ...v.options,
      ])),
    ),
  },

  /* ===== 5. 自由入力 ===== */
  {
    id: 'custom',
    name: '自由に作成',
    sub: '目的を自由に入力',
    title: '自由入力でプロンプト作成',
    desc: '上のどれにも当てはまらないときに。目的と内容を入れると、伝わりやすい形に整えます。',
    fields: [
      { name: 'goal', label: '目的（何をしたいか）', type: 'text', required: true,
        placeholder: '例：新商品の紹介文を作りたい' },
      { name: 'details', label: '内容・背景', type: 'textarea', rows: 6, required: true, privacy: true,
        placeholder: 'ChatGPTに知っておいてほしい情報を書いてください。\n例：商品名、特徴、価格、売りたい相手 など' },
      { name: 'role', label: 'ChatGPTの役割', type: 'text',
        placeholder: '例：経験豊富なマーケティング担当者',
        help: 'ChatGPTに「誰として」答えてほしいかを決めると、答えの質が上がります。空欄でもOKです。' },
      { name: 'audience', label: '読む人・対象', type: 'text', placeholder: '例：30代の働く女性、社内の新入社員' },
      { name: 'format', label: '答えの形', type: 'select',
        options: ['おまかせ', '箇条書き', '表', '文章（段落）', 'ステップ形式（手順）'] },
      { name: 'length', label: '文字数の目安', type: 'select',
        options: ['指定なし', '200字程度', '400字程度', '800字程度', '1500字程度'] },
      { name: 'notes', label: 'その他の注意点', type: 'textarea', rows: 3,
        placeholder: '例：専門用語は使わない／明るい雰囲気で／3パターン出してほしい' },
    ],
    sample: {
      goal: '新商品の紹介文を作りたい',
      details: '商品名：ふわっとクッション\n特徴：低反発素材、洗えるカバー、在宅ワーク向けに腰を支える形\n価格：3,980円（税込）\n掲載先：自社のオンラインショップ',
      role: '経験豊富なECサイトのコピーライター',
      audience: '在宅ワークをしている20〜40代',
      format: '文章（段落）',
      length: '400字程度',
      notes: '親しみやすい雰囲気で\nキャッチコピー案も3つ出してほしい',
    },
    build: (v) => joinBlocks(
      `あなたは${v.role || '優秀なビジネスアシスタント'}です。\n以下の目的と情報をもとに、最適な内容を作成してください。`,
      block('目的', v.goal),
      block('内容・背景', v.details),
      block('読む人・対象', v.audience),
      block('条件', bullets([
        v.format !== 'おまかせ' && `答えの形：${v.format}`,
        v.length !== '指定なし' && `文字数：${v.length}`,
        ...v.notes.split('\n').map((s) => s.trim().replace(/^[・\-－*]\s*/, '')),
      ])),
      block('進め方', '情報が足りない場合は、作成する前に私に質問してください。'),
    ),
  },
];

/* ------------------------------------------------------------
   画面の状態（どのツールを選んでいるか、入力内容など）
   ※ パソコンの中のメモリに一時的に置くだけで、保存・送信はしません
   ------------------------------------------------------------ */
const state = {
  currentId: TOOLS[0].id,
  values: {},   // ツールごとの入力内容
  outputs: {},  // ツールごとの作成結果
};

const getTool = (id) => TOOLS.find((t) => t.id === id);

/** 名前から入力欄を探す（form.elements[名前] だと "length" などの名前が正しく取れないため） */
const fieldInput = (name) => document.querySelector(`#toolForm [name="${name}"]`);

/** ツールの初期値（何も入力していない状態）を作る */
function defaultValues(tool) {
  const values = {};
  tool.fields.forEach((f) => {
    if (f.type === 'checks') values[f.name] = [...(f.default || [])];
    else if (f.type === 'select') values[f.name] = f.options[0];
    else values[f.name] = '';
  });
  return values;
}

/* ------------------------------------------------------------
   画面を作る処理
   ------------------------------------------------------------ */

/** ツール切り替えボタンを作る */
function renderTabs() {
  const nav = $('#toolTabs');
  nav.innerHTML = '';
  TOOLS.forEach((tool) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tool-tab';
    btn.id = `tab-${tool.id}`;
    btn.setAttribute('role', 'tab');
    btn.dataset.id = tool.id;
    btn.innerHTML = `
      <span class="tab-icon">${ICONS[tool.id]}</span>
      <span class="tab-name">${tool.name}</span>
      <span class="tab-sub">${tool.sub}</span>`;
    btn.addEventListener('click', () => {
      selectTool(tool.id);
      // スマホなど縦に並ぶ画面では、ツールを選んだら入力欄まで自動で移動する
      if (window.matchMedia('(max-width: 960px)').matches) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        $('#formPanel').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    });
    nav.appendChild(btn);
  });
}

/** 入力フォームを作る */
function renderForm(tool) {
  const wrap = $('#formFields');
  wrap.innerHTML = '';

  tool.fields.forEach((f) => {
    const id = `f-${tool.id}-${f.name}`;
    const badge = f.required
      ? '<span class="badge req">必須</span>'
      : '<span class="badge opt">任意</span>';

    // チェックボックスのグループ
    if (f.type === 'checks') {
      const fs = document.createElement('fieldset');
      fs.className = 'field';
      fs.dataset.name = f.name;
      fs.innerHTML = `<legend class="field-label">${f.label} ${badge}</legend>`;
      const list = document.createElement('div');
      list.className = 'check-list';
      f.options.forEach((opt) => {
        const label = document.createElement('label');
        label.className = 'check-item';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = f.name;
        input.value = opt;
        label.append(input, document.createTextNode(opt));
        list.appendChild(label);
      });
      fs.appendChild(list);
      wrap.appendChild(fs);
      return;
    }

    // 1行入力・複数行入力・選択
    const div = document.createElement('div');
    div.className = 'field';
    div.dataset.name = f.name;
    div.innerHTML = `<label class="field-label" for="${id}">${f.label} ${badge}</label>`;

    let input;
    if (f.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = f.rows || 4;
    } else if (f.type === 'select') {
      input = document.createElement('select');
      f.options.forEach((opt) => input.add(new Option(opt, opt)));
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'off';
    }
    input.id = id;
    input.name = f.name;
    if (f.placeholder) input.placeholder = f.placeholder;
    if (f.required) input.setAttribute('aria-required', 'true');

    // 読み上げソフトに「注意」や「補足」を入力欄とセットで伝えるためのID一覧
    const describedBy = [];

    // 長い文章を貼り付ける欄には、入力する前に目に入る位置に個人情報の注意を出す
    if (f.privacy) {
      const warn = document.createElement('p');
      warn.className = 'field-privacy';
      warn.id = `${id}-privacy`;
      warn.textContent = 'ChatGPTに送る文章になります。氏名・社名・連絡先などは「Aさん」「B社」のように置き換えてから入力しましょう。';
      div.appendChild(warn);
      describedBy.push(warn.id);
    }

    div.appendChild(input);

    if (f.help) {
      const help = document.createElement('p');
      help.className = 'field-help';
      help.id = `${id}-help`;
      help.textContent = f.help;
      div.appendChild(help);
      describedBy.push(help.id);
    }
    if (describedBy.length) input.setAttribute('aria-describedby', describedBy.join(' '));
    wrap.appendChild(div);
  });
}

/** フォームに値を入れる */
function setFormValues(tool, values) {
  const form = $('#toolForm');
  tool.fields.forEach((f) => {
    const v = values[f.name];
    if (f.type === 'checks') {
      form.querySelectorAll(`input[name="${f.name}"]`).forEach((cb) => {
        cb.checked = (v || []).includes(cb.value);
      });
    } else {
      fieldInput(f.name).value = v ?? '';
    }
  });
}

/** フォームから値を読み取る */
function getFormValues(tool) {
  const form = $('#toolForm');
  const values = {};
  tool.fields.forEach((f) => {
    if (f.type === 'checks') {
      values[f.name] = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)].map((cb) => cb.value);
    } else {
      values[f.name] = fieldInput(f.name).value;
    }
  });
  return values;
}

/** ツールを切り替える */
function selectTool(id) {
  // 今のツールの入力内容を覚えておく
  const prev = getTool(state.currentId);
  if (document.querySelector('#formFields .field')) {
    state.values[prev.id] = getFormValues(prev);
  }

  state.currentId = id;
  const tool = getTool(id);

  document.querySelectorAll('.tool-tab').forEach((btn) => {
    btn.setAttribute('aria-selected', String(btn.dataset.id === id));
  });

  $('#toolTitle').textContent = tool.title;
  $('#toolDesc').textContent = tool.desc;
  renderForm(tool);
  setFormValues(tool, state.values[id] || defaultValues(tool));
  clearErrors();
  setOutput(state.outputs[id] || '');
}

/* ------------------------------------------------------------
   入力チェック
   ------------------------------------------------------------ */
function clearErrors() {
  $('#formError').textContent = '';
  document.querySelectorAll('.field.invalid').forEach((el) => el.classList.remove('invalid'));
  document.querySelectorAll('#toolForm [aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
}

/** 必須の欄が空になっていないか確認する。問題なければ true */
function validate(tool, values) {
  clearErrors();
  const missing = tool.fields.filter((f) => f.required && !String(values[f.name]).trim());
  if (missing.length === 0) return true;

  missing.forEach((f) => {
    document.querySelector(`.field[data-name="${f.name}"]`).classList.add('invalid');
    fieldInput(f.name).setAttribute('aria-invalid', 'true'); // 読み上げソフトに「未入力」を伝える
  });
  $('#formError').textContent = `「${missing.map((f) => f.label).join('」「')}」を入力してください。`;
  fieldInput(missing[0].name).focus();
  return false;
}

/* ------------------------------------------------------------
   結果欄とコピー
   ------------------------------------------------------------ */
function setOutput(text) {
  const output = $('#output');
  output.value = text;
  updateCount();
}

function updateCount() {
  const text = $('#output').value;
  $('#charCount').textContent = `${text.length.toLocaleString()}文字`;
  $('#copyBtn').disabled = text.trim() === '';
}

/** クリップボード（コピーした内容を一時的に置いておく場所）にコピーする */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // 古いブラウザや一部の環境向けの予備の方法
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
}

let toastTimer = null;
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ------------------------------------------------------------
   ボタンを押したときの処理
   ------------------------------------------------------------ */
function setupEvents() {
  const form = $('#toolForm');

  // 「プロンプトを作成」
  form.addEventListener('submit', (e) => {
    e.preventDefault(); // ページが再読み込みされるのを防ぐ
    const tool = getTool(state.currentId);
    const raw = getFormValues(tool);
    if (!validate(tool, raw)) return;

    // 前後の余計な空白を取り除く
    const values = {};
    Object.keys(raw).forEach((k) => {
      values[k] = Array.isArray(raw[k]) ? raw[k] : raw[k].trim();
    });

    const prompt = tool.build(values);
    state.values[tool.id] = raw;
    state.outputs[tool.id] = prompt;
    setOutput(prompt);

    const output = $('#output');
    output.classList.remove('flash');
    void output.offsetWidth; // アニメーションをもう一度動かすための小技
    output.classList.add('flash');

    // スマホなど縦に並ぶ画面では、結果の場所まで自動で移動する
    if (window.matchMedia('(max-width: 960px)').matches) {
      $('#outputPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    showToast('プロンプトができました。「コピーする」を押してください');
  });

  // 入力中はエラー表示を消す
  form.addEventListener('input', (e) => {
    const field = e.target.closest('.field');
    if (field && field.classList.contains('invalid') && e.target.value.trim()) {
      field.classList.remove('invalid');
      e.target.removeAttribute('aria-invalid');
    }
  });

  // 「入力例を入れる」
  $('#sampleBtn').addEventListener('click', () => {
    const tool = getTool(state.currentId);
    setFormValues(tool, tool.sample);
    clearErrors();
    showToast('入力例を入れました。内容を書き換えて使えます');
  });

  // 「クリア」
  $('#clearBtn').addEventListener('click', () => {
    const tool = getTool(state.currentId);
    const hasText = tool.fields.some((f) => f.type !== 'select' && f.type !== 'checks'
      && fieldInput(f.name).value.trim());
    if (hasText && !window.confirm('入力した内容を消してもよろしいですか？')) return;
    setFormValues(tool, defaultValues(tool));
    state.values[tool.id] = defaultValues(tool);
    state.outputs[tool.id] = '';
    setOutput('');
    clearErrors();
  });

  // 結果欄を直接書き換えたとき
  $('#output').addEventListener('input', () => {
    state.outputs[state.currentId] = $('#output').value;
    updateCount();
  });

  // 「コピーする」
  $('#copyBtn').addEventListener('click', async () => {
    const ok = await copyText($('#output').value);
    showToast(ok
      ? 'コピーしました！ChatGPTの入力欄に貼り付けてください（Ctrl + V）'
      : 'コピーできませんでした。文章を選択して Ctrl + C でコピーしてください');
  });
}

/* ------------------------------------------------------------
   最初に1回だけ動く処理
   ------------------------------------------------------------ */
renderTabs();
setupEvents();
selectTool(state.currentId);
