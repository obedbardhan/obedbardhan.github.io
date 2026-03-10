// ==========================================
// BIBLE QUIZ ENGINE — Dynamic Generation
// ==========================================

(function () {
    'use strict';

    const $ = id => document.getElementById(id);

    // --- Quiz State ---
    let quizState = {
        language: 'english',
        category: 'characters',
        questionCount: 5,
        questions: [],
        currentIndex: 0,
        score: 0,
        skipped: 0,
        answered: false,
        timer: null,
        timeLeft: 15
    };
    window.quizState = quizState;

    // --- Language to JSON file mapping ---
    const languageFiles = {
        english: 'all_web_bible_updated.json',
        hindi: 'irv_hindi.json',
        odia: 'odia_all_books.json',
        telugu: 'te_irv_updated.json',
        tamil: 'ta_oitce_updated.json',
        kannada: 'kn_irv_updated.json',
        gurmukhi: 'pa_irv_updated.json',
        marathi: 'mr_irv_updated.json',
        hebrew: 'hebrew_modern_updated.json',
        chinese: 'chinese_union_simp_updated.json',
        french: 'french_epee_updated.json',
        german: 'german_luther_updated.json',
        spanish: 'esp_rv1909_updated.json'
    };

    // Cache loaded Bible data per language
    const bibleDataCache = {};

    // --- Bible character references (book numbers + chapter/verse ranges) ---
    // These are used to generate character-based questions from ANY language
    const characterData = [
        { name: 'Adam', book: 1, chapters: [1, 2, 3, 4, 5], verseHint: { ch: 2, v: 7 } },
        { name: 'Eve', book: 1, chapters: [2, 3], verseHint: { ch: 3, v: 20 } },
        { name: 'Noah', book: 1, chapters: [6, 7, 8, 9], verseHint: { ch: 6, v: 9 } },
        { name: 'Abraham', book: 1, chapters: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], verseHint: { ch: 12, v: 1 } },
        { name: 'Isaac', book: 1, chapters: [21, 22, 24, 25, 26, 27], verseHint: { ch: 21, v: 3 } },
        { name: 'Jacob', book: 1, chapters: [25, 27, 28, 29, 30, 31, 32, 33], verseHint: { ch: 25, v: 26 } },
        { name: 'Joseph', book: 1, chapters: [37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50], verseHint: { ch: 37, v: 3 } },
        { name: 'Moses', book: 2, chapters: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], verseHint: { ch: 2, v: 10 } },
        { name: 'Joshua', book: 6, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 23, 24], verseHint: { ch: 1, v: 1 } },
        { name: 'Ruth', book: 8, chapters: [1, 2, 3, 4], verseHint: { ch: 1, v: 16 } },
        { name: 'Samuel', book: 9, chapters: [1, 2, 3, 7, 8, 12, 15, 16], verseHint: { ch: 3, v: 4 } },
        { name: 'David', book: 9, chapters: [16, 17], verseHint: { ch: 17, v: 45 } },
        { name: 'Solomon', book: 11, chapters: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], verseHint: { ch: 3, v: 9 } },
        { name: 'Elijah', book: 11, chapters: [17, 18, 19, 21], verseHint: { ch: 18, v: 21 } },
        { name: 'Daniel', book: 27, chapters: [1, 2, 3, 4, 5, 6], verseHint: { ch: 6, v: 10 } },
        { name: 'Jonah', book: 32, chapters: [1, 2, 3, 4], verseHint: { ch: 1, v: 17 } },
        { name: 'Mary', book: 42, chapters: [1, 2], verseHint: { ch: 1, v: 30 } },
        { name: 'Peter', book: 40, chapters: [4, 14, 16, 26], verseHint: { ch: 16, v: 18 } },
        { name: 'Paul', book: 44, chapters: [9, 13, 16, 22, 26, 27, 28], verseHint: { ch: 9, v: 15 } },
        { name: 'John', book: 43, chapters: [1, 3, 19, 20, 21], verseHint: { ch: 3, v: 16 } }
    ];

    // --- Native Character Names Dictionary ---
    // Used to reliably translate character names across languages instead of guessing from verse text
    const nativeCharacterNames = {
        hindi: {
            'Adam': 'आदम', 'Eve': 'हव्वा', 'Noah': 'नूह', 'Abraham': 'अब्राहम', 'Isaac': 'इसहाक', 'Jacob': 'याकूब',
            'Joseph': 'यूसुफ', 'Moses': 'मूसा', 'Joshua': 'यहोशू', 'Ruth': 'रूत', 'Samuel': 'शमूएल', 'David': 'दाऊद',
            'Solomon': 'सुलैमान', 'Elijah': 'एलिय्याह', 'Daniel': 'दानिय्येल', 'Jonah': 'योना', 'Mary': 'मरियम',
            'Peter': 'पतरस', 'Paul': 'पौलुस', 'John': 'यूहन्ना'
        },
        odia: {
            'Adam': 'ଆଦମ', 'Eve': 'ହବା', 'Noah': 'ନୋହ', 'Abraham': 'ଅବ୍ରହାମ', 'Isaac': 'ଇସ୍‌ହାକ', 'Jacob': 'ଯାକୁବ',
            'Joseph': 'ଯୋଷେଫ', 'Moses': 'ମୋଶା', 'Joshua': 'ଯିହୋଶୂୟ', 'Ruth': 'ରୂତ', 'Samuel': 'ଶାମୁୟେଲ', 'David': 'ଦାଉଦ',
            'Solomon': 'ଶଲୋମନ', 'Elijah': 'ଏଲିୟ', 'Daniel': 'ଦାନିୟେଲ', 'Jonah': 'ଯୂନସ', 'Mary': 'ମରିୟମ',
            'Peter': 'ପିତର', 'Paul': 'ପାଉଲ', 'John': 'ଯୋହନ'
        },
        telugu: {
            'Adam': 'ఆదాము', 'Eve': 'హవ్వ', 'Noah': 'నోవహు', 'Abraham': 'అబ్రాహాము', 'Isaac': 'ఇస్సాకు', 'Jacob': 'యాకోబు',
            'Joseph': 'యోసేపు', 'Moses': 'మోషే', 'Joshua': 'యెహోషువ', 'Ruth': 'రూతు', 'Samuel': 'సమూయేలు', 'David': 'దావీదు',
            'Solomon': 'సొలొమోను', 'Elijah': 'ఏలీయా', 'Daniel': 'దానియేలు', 'Jonah': 'యోనా', 'Mary': 'మరియ',
            'Peter': 'పేతురు', 'Paul': 'పౌలు', 'John': 'యోహాను'
        },
        tamil: {
            'Adam': 'ஆதாம்', 'Eve': 'ஏவாள்', 'Noah': 'நோவா', 'Abraham': 'ஆபிரகாம்', 'Isaac': 'ஈசாக்கு', 'Jacob': 'யாக்கோபு',
            'Joseph': 'யோசேப்பு', 'Moses': 'மோசே', 'Joshua': 'யோசுவா', 'Ruth': 'ரூத்', 'Samuel': 'சாமுவேல்', 'David': 'தாவீது',
            'Solomon': 'சாலொமோன்', 'Elijah': 'எலியா', 'Daniel': 'தானியேல்', 'Jonah': 'யோனா', 'Mary': 'மரியாள்',
            'Peter': 'பேதுரு', 'Paul': 'பவுல்', 'John': 'யோவான்'
        },
        kannada: {
            'Adam': 'ಆದಾಮ', 'Eve': 'ಹವ್ವ', 'Noah': 'ನೋಹ', 'Abraham': 'ಅಬ್ರಹಾಮ', 'Isaac': 'ಇಸಾಕ', 'Jacob': 'ಯಾಕೋಬ',
            'Joseph': 'ಯೋಸೇಫ', 'Moses': 'ಮೋಶೆ', 'Joshua': 'ಯೆಹೋಶುವ', 'Ruth': 'ರೂತ', 'Samuel': 'ಸಮುವೇಲ', 'David': 'ದಾವೀದ',
            'Solomon': 'ಸೊಲೊಮೋನ', 'Elijah': 'ಎಲೀಯ', 'Daniel': 'ದಾನಿಯೇಲ', 'Jonah': 'ಯೋನ', 'Mary': 'ಮರಿಯ',
            'Peter': 'ಪೇತ್ರ', 'Paul': 'ಪೌಲ', 'John': 'ಯೋಹಾನ'
        },
        gurmukhi: {
            'Adam': 'ਆਦਮ', 'Eve': 'ਹੱਵਾਹ', 'Noah': 'ਨੂਹ', 'Abraham': 'ਅਬਰਾਹਾਮ', 'Isaac': 'ਇਸਹਾਕ', 'Jacob': 'ਯਾਕੂਬ',
            'Joseph': 'ਯੂਸੁਫ਼', 'Moses': 'ਮੂਸਾ', 'Joshua': 'ਯਹੋਸ਼ੁਆ', 'Ruth': 'ਰੂਥ', 'Samuel': 'ਸਮੂਏਲ', 'David': 'ਦਾਊਦ',
            'Solomon': 'ਸੁਲੇਮਾਨ', 'Elijah': 'ਏਲੀਯਾਹ', 'Daniel': 'ਦਾਨੀਏਲ', 'Jonah': 'ਯੋਨਾਹ', 'Mary': 'ਮਰੀਅਮ',
            'Peter': 'ਪਤਰਸ', 'Paul': 'ਪੌਲੁਸ', 'John': 'ਯੂਹੰਨਾ'
        },
        marathi: {
            'Adam': 'आदाम', 'Eve': 'हव्वा', 'Noah': 'नोहा', 'Abraham': 'अब्राहाम', 'Isaac': 'इसहाक', 'Jacob': 'याकोब',
            'Joseph': 'योसेफ', 'Moses': 'मोशे', 'Joshua': 'यहोशवा', 'Ruth': 'रुथ', 'Samuel': 'शमुवेल', 'David': 'दावीद',
            'Solomon': 'शलमोना', 'Elijah': 'एलिजा', 'Daniel': 'दानीएल', 'Jonah': 'योना', 'Mary': 'मरीया',
            'Peter': 'पेत्र', 'Paul': 'पौल', 'John': 'योहान'
        }
    };

    // --- Famous verses for memory quiz (book, chapter, verse) ---
    const famousVerses = [
        { book: 1, ch: 1, v: 1 },    // Genesis 1:1
        { book: 1, ch: 1, v: 27 },   // Genesis 1:27
        { book: 2, ch: 20, v: 3 },   // Exodus 20:3
        { book: 2, ch: 20, v: 12 },  // Exodus 20:12
        { book: 5, ch: 6, v: 5 },    // Deuteronomy 6:5
        { book: 6, ch: 1, v: 9 },    // Joshua 1:9
        { book: 19, ch: 23, v: 1 },  // Psalm 23:1
        { book: 19, ch: 23, v: 4 },  // Psalm 23:4
        { book: 19, ch: 46, v: 1 },  // Psalm 46:1
        { book: 19, ch: 119, v: 105 }, // Psalm 119:105
        { book: 19, ch: 150, v: 6 }, // Psalm 150:6
        { book: 20, ch: 3, v: 5 },   // Proverbs 3:5
        { book: 20, ch: 22, v: 6 },  // Proverbs 22:6
        { book: 23, ch: 40, v: 31 }, // Isaiah 40:31
        { book: 23, ch: 41, v: 10 }, // Isaiah 41:10
        { book: 24, ch: 29, v: 11 }, // Jeremiah 29:11
        { book: 40, ch: 5, v: 14 },  // Matthew 5:14
        { book: 40, ch: 5, v: 16 },  // Matthew 5:16
        { book: 40, ch: 6, v: 33 },  // Matthew 6:33
        { book: 40, ch: 7, v: 7 },   // Matthew 7:7
        { book: 40, ch: 11, v: 28 }, // Matthew 11:28
        { book: 40, ch: 22, v: 37 }, // Matthew 22:37
        { book: 40, ch: 28, v: 19 }, // Matthew 28:19
        { book: 40, ch: 28, v: 20 }, // Matthew 28:20
        { book: 43, ch: 1, v: 1 },   // John 1:1
        { book: 43, ch: 3, v: 16 },  // John 3:16
        { book: 43, ch: 8, v: 32 },  // John 8:32
        { book: 43, ch: 11, v: 35 }, // John 11:35
        { book: 43, ch: 14, v: 6 },  // John 14:6
        { book: 44, ch: 1, v: 8 },   // Acts 1:8
        { book: 45, ch: 3, v: 23 },  // Romans 3:23
        { book: 45, ch: 5, v: 8 },   // Romans 5:8
        { book: 45, ch: 6, v: 23 },  // Romans 6:23
        { book: 45, ch: 8, v: 28 },  // Romans 8:28
        { book: 45, ch: 10, v: 9 },  // Romans 10:9
        { book: 45, ch: 12, v: 2 },  // Romans 12:2
        { book: 46, ch: 10, v: 13 }, // 1 Corinthians 10:13
        { book: 46, ch: 13, v: 4 },  // 1 Corinthians 13:4
        { book: 48, ch: 2, v: 20 },  // Galatians 2:20
        { book: 48, ch: 5, v: 22 },  // Galatians 5:22
        { book: 49, ch: 2, v: 8 },   // Ephesians 2:8
        { book: 50, ch: 4, v: 13 },  // Philippians 4:13
        { book: 50, ch: 4, v: 19 },  // Philippians 4:19
        { book: 55, ch: 1, v: 7 },   // 2 Timothy 1:7
        { book: 58, ch: 11, v: 1 },  // Hebrews 11:1
        { book: 58, ch: 13, v: 8 },  // Hebrews 13:8
        { book: 59, ch: 1, v: 5 },   // James 1:5
        { book: 60, ch: 5, v: 7 },   // 1 Peter 5:7
        { book: 62, ch: 4, v: 8 },   // 1 John 4:8
        { book: 66, ch: 3, v: 20 },  // Revelation 3:20
        { book: 66, ch: 21, v: 4 }   // Revelation 21:4
    ];

    // --- Kids-friendly content (creation days, animals, simple stories) ---
    const kidsTemplates = {
        // Creation days
        creation: [
            { day: 1, created: 'light', book: 1, ch: 1, v: 3 },
            { day: 2, created: 'sky', book: 1, ch: 1, v: 6 },
            { day: 3, created: 'land_plants', book: 1, ch: 1, v: 9 },
            { day: 4, created: 'sun_moon_stars', book: 1, ch: 1, v: 14 },
            { day: 5, created: 'birds_fish', book: 1, ch: 1, v: 20 },
            { day: 6, created: 'animals_humans', book: 1, ch: 1, v: 24 },
            { day: 7, created: 'rest', book: 1, ch: 2, v: 2 }
        ],
        // Simple character associations
        simpleChars: [
            { name: 'Noah', assoc: 'ark', book: 1, ch: 6, v: 14 },
            { name: 'David', assoc: 'giant', book: 9, ch: 17, v: 45 },
            { name: 'Jonah', assoc: 'fish', book: 32, ch: 1, v: 17 },
            { name: 'Daniel', assoc: 'lions', book: 27, ch: 6, v: 16 },
            { name: 'Moses', assoc: 'sea', book: 2, ch: 14, v: 21 },
            { name: 'Adam', assoc: 'garden', book: 1, ch: 2, v: 8 },
            { name: 'Joseph', assoc: 'coat', book: 1, ch: 37, v: 3 },
            { name: 'Solomon', assoc: 'wisdom', book: 11, ch: 3, v: 9 }
        ]
    };

    // --- Utility ---
    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function pickRandom(arr, count) {
        return shuffle(arr).slice(0, count);
    }

    function randomFrom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // --- Bible data loading ---
    // Fix book names that are accidentally in English in some language JSON files
    const bookNameFixes = {
        odia: {
            40: 'ମାଥିଉ ଲିଖିତ ସୁସମାଚାର',
            42: 'ଲୂକ ଲିଖିତ ସୁସମାଚାର'
        }
    };

    async function loadBibleData(language) {
        if (bibleDataCache[language]) return bibleDataCache[language];

        const file = languageFiles[language];
        if (!file) throw new Error('No Bible data file for language: ' + language);

        const resp = await fetch(file);
        if (!resp.ok) throw new Error('Failed to load ' + file);
        const buffer = await resp.arrayBuffer();
        const text = new TextDecoder('utf-8').decode(buffer);
        const data = JSON.parse(text);

        const fixes = bookNameFixes[language] || {};

        // Index by book number for fast lookup
        const indexed = {};
        const bookNames = {};
        const bookList = [];

        data.forEach(v => {
            if (!indexed[v.book]) {
                indexed[v.book] = {};
                const fixedName = fixes[v.book] || v.book_name;
                bookNames[v.book] = fixedName;
                bookList.push({ book: v.book, name: fixedName, englishName: v.englishBookName });
            }
            if (!indexed[v.book][v.chapter]) indexed[v.book][v.chapter] = {};
            indexed[v.book][v.chapter][v.verse] = v.text;
        });

        const result = { indexed, bookNames, bookList, raw: data };
        bibleDataCache[language] = result;
        return result;
    }

    // Get verse text
    function getVerse(bibleData, book, chapter, verse) {
        try {
            return bibleData.indexed[book]?.[chapter]?.[verse] || null;
        } catch { return null; }
    }

    // Get book name in native language
    function getBookName(bibleData, bookNum) {
        return bibleData.bookNames[bookNum] || 'Book ' + bookNum;
    }

    // Get a reference string like "Genesis 1:1" in native book names
    function getRef(bibleData, book, chapter, verse) {
        return `${getBookName(bibleData, book)} ${chapter}:${verse}`;
    }

    // --- Question Generators ---

    // === BIBLE CHARACTERS ===
    function generateCharacterQuestions(bibleData, engData, count) {
        const questions = [];
        const chars = shuffle(characterData);

        for (const char of chars) {
            if (questions.length >= count) break;

            const verseText = getVerse(bibleData, char.book, char.verseHint.ch, char.verseHint.v);
            if (!verseText) continue;

            const ref = getRef(bibleData, char.book, char.verseHint.ch, char.verseHint.v);

            // Find the character's name in native text
            const charNameNative = findCharacterName(bibleData, char);
            if (!charNameNative) continue;

            // Blank out the character name in the verse to avoid giving away the answer directly
            // Create a dynamic regex that ignores case (less relevant for some languages, but helps for English/Spanish/French)
            const regex = new RegExp(charNameNative, 'gi');
            const blankedVerse = verseText.replace(regex, '________');

            // Find 3 other random character names in the native language
            const wrongChars = pickRandom(
                characterData.filter(c => c.name !== char.name),
                3
            ).map(c => {
                const name = findCharacterName(bibleData, c);
                // Simple validation to ensure we don't return very long sentences by accident
                return (name && name.length < 20) ? name : c.name;
            });

            // Ensure unique options
            const uniqueOptions = [...new Set([charNameNative, ...wrongChars])];
            while (uniqueOptions.length < 4) {
                const extraFallback = pickRandom(characterData, 1)[0].name;
                if (!uniqueOptions.includes(extraFallback)) uniqueOptions.push(extraFallback);
            }

            const finalOptions = shuffle(uniqueOptions.slice(0, 4));

            questions.push({
                q: `"${truncateVerse(blankedVerse, 100)}"`,
                qPrefix: getQuestionPrefix(bibleData, 'who_in_verse'),
                options: finalOptions,
                answer: finalOptions.indexOf(charNameNative),
                ref: ref,
                book: char.book,
                ch: char.verseHint.ch,
                v: char.verseHint.v
            });
        }

        return shuffle(questions).slice(0, count);
    }

    // === VERSE MEMORY ===
    function generateVerseMemoryQuestions(bibleData, engData, count) {
        const questions = [];
        const verses = shuffle(famousVerses);

        for (const vRef of verses) {
            if (questions.length >= count * 2) break;

            const verseText = getVerse(bibleData, vRef.book, vRef.ch, vRef.v);
            if (!verseText || verseText.length < 10) continue;

            const bookName = getBookName(bibleData, vRef.book);
            const ref = `${bookName} ${vRef.ch}:${vRef.v}`;

            // Question Type: "Which book contains: [verse text]?"
            const otherBooks = pickRandom(
                bibleData.bookList.filter(b => b.book !== vRef.book),
                3
            ).map(b => b.name);

            const options = shuffle([bookName, ...otherBooks]);
            questions.push({
                q: `"${truncateVerse(verseText, 100)}"`,
                qPrefix: getQuestionPrefix(bibleData, 'which_book_verse'),
                options: options,
                answer: options.indexOf(bookName),
                ref: ref,
                book: vRef.book,
                ch: vRef.ch,
                v: vRef.v
            });

            // Question Type 2: Fill-in-the-blank — show verse with missing word
            const blankQ = createFillInBlank(verseText);
            if (blankQ) {
                // Get wrong options from nearby verses
                const nearbyWords = getNearbyWords(bibleData, vRef.book, vRef.ch, vRef.v, 3);
                if (nearbyWords.length >= 3) {
                    const fillOptions = shuffle([blankQ.answer, ...nearbyWords.slice(0, 3)]);
                    questions.push({
                        q: blankQ.question,
                        qPrefix: getQuestionPrefix(bibleData, 'fill_blank'),
                        options: fillOptions,
                        answer: fillOptions.indexOf(blankQ.answer),
                        ref: ref,
                        book: vRef.book,
                        ch: vRef.ch,
                        v: vRef.v
                    });
                }
            }
        }

        return shuffle(questions).slice(0, count);
    }

    // === CHURCH YOUTH ===
    function generateYouthQuestions(bibleData, engData, count) {
        const questions = [];
        const allBooks = bibleData.bookList;

        // Type 1: Book ordering — "What comes after [Book X]?"
        for (let i = 0; i < allBooks.length - 1 && questions.length < count; i++) {
            const idx = Math.floor(Math.random() * (allBooks.length - 1));
            const currentBook = allBooks[idx];
            const nextBook = allBooks[idx + 1];
            const wrongBooks = pickRandom(
                allBooks.filter((b, j) => j !== idx + 1 && j !== idx),
                3
            ).map(b => b.name);

            const options = shuffle([nextBook.name, ...wrongBooks]);
            questions.push({
                q: currentBook.name,
                qPrefix: getQuestionPrefix(bibleData, 'what_comes_after'),
                options: options,
                answer: options.indexOf(nextBook.name),
                ref: `${currentBook.name} → ${nextBook.name}`,
                book: currentBook.book,
                ch: 1,
                v: 1
            });
        }

        // Type 2: "How many chapters in [Book]?"
        for (const bookInfo of shuffle(allBooks).slice(0, count)) {
            if (questions.length >= count * 2) break;
            const bookData = bibleData.indexed[bookInfo.book];
            if (!bookData) continue;
            const numChapters = Object.keys(bookData).length;
            const wrongCounts = [
                numChapters + Math.floor(Math.random() * 10) + 1,
                Math.max(1, numChapters - Math.floor(Math.random() * 10) - 1),
                numChapters + Math.floor(Math.random() * 20) + 5
            ].map(String);
            const correctStr = String(numChapters);
            const options = shuffle([correctStr, ...wrongCounts]);
            questions.push({
                q: bookInfo.name,
                qPrefix: getQuestionPrefix(bibleData, 'how_many_chapters'),
                options: options,
                answer: options.indexOf(correctStr),
                ref: `${bookInfo.name}: ${numChapters}`,
                book: bookInfo.book,
                ch: 1,
                v: 1
            });
        }

        // Type 3: Pick famous verses and ask "What reference is this?"
        for (const vRef of shuffle(famousVerses).slice(0, count)) {
            if (questions.length >= count * 2) break;
            const verseText = getVerse(bibleData, vRef.book, vRef.ch, vRef.v);
            if (!verseText) continue;
            const correctRef = `${getBookName(bibleData, vRef.book)} ${vRef.ch}:${vRef.v}`;
            const wrongRefs = pickRandom(famousVerses.filter(f => f.book !== vRef.book || f.ch !== vRef.ch), 3)
                .map(f => `${getBookName(bibleData, f.book)} ${f.ch}:${f.v}`);
            const options = shuffle([correctRef, ...wrongRefs]);
            questions.push({
                q: `"${truncateVerse(verseText, 80)}"`,
                qPrefix: getQuestionPrefix(bibleData, 'what_reference'),
                options: options,
                answer: options.indexOf(correctRef),
                ref: correctRef,
                book: vRef.book,
                ch: vRef.ch,
                v: vRef.v
            });
        }

        return shuffle(questions).slice(0, count);
    }

    // === KIDS MODE ===
    function generateKidsQuestions(bibleData, engData, count) {
        const questions = [];

        // Type 1: Creation days — "What did God create on day X?"
        const creationLabels = getCreationLabels(bibleData);
        for (const day of shuffle(kidsTemplates.creation)) {
            if (questions.length >= count) break;
            if (day.day === 7) continue; // "rest" is harder to make into MCQ
            const verseText = getVerse(bibleData, day.book, day.ch, day.v);
            if (!verseText) continue;

            const correctLabel = creationLabels[day.created] || day.created;
            const wrongLabels = pickRandom(
                Object.entries(creationLabels)
                    .filter(([k]) => k !== day.created && k !== 'rest')
                    .map(([, v]) => v),
                3
            );
            const options = shuffle([correctLabel, ...wrongLabels]);
            const ref = getRef(bibleData, day.book, day.ch, day.v);
            questions.push({
                q: String(day.day),
                qPrefix: getQuestionPrefix(bibleData, 'creation_day'),
                options: options,
                answer: options.indexOf(correctLabel),
                ref: ref,
                book: day.book,
                ch: day.ch,
                v: day.v
            });
        }

        // Type 2: Character association — "Who built the ark?"
        for (const sc of shuffle(kidsTemplates.simpleChars)) {
            if (questions.length >= count) break;
            const verseText = getVerse(bibleData, sc.book, sc.ch, sc.v);
            if (!verseText) continue;

            const charName = findCharacterName(bibleData, { name: sc.name, book: sc.book, chapters: [sc.ch], verseHint: { ch: sc.ch, v: sc.v } });
            if (!charName) continue;

            const wrongNames = pickRandom(
                kidsTemplates.simpleChars.filter(c => c.name !== sc.name),
                3
            ).map(c => {
                const cn = findCharacterName(bibleData, { name: c.name, book: c.book, chapters: [c.ch], verseHint: { ch: c.ch, v: c.v } });
                return cn || c.name;
            });

            const options = shuffle([charName, ...wrongNames]);
            const ref = getRef(bibleData, sc.book, sc.ch, sc.v);
            questions.push({
                q: `"${truncateVerse(verseText, 80)}"`,
                qPrefix: getQuestionPrefix(bibleData, 'who_in_verse'),
                options: options,
                answer: options.indexOf(charName),
                ref: ref,
                book: sc.book,
                ch: sc.ch,
                v: sc.v
            });
        }

        // Type 3: Simple "Which book?" from verse
        for (const vRef of shuffle(famousVerses.filter(v => [1, 19, 32, 43].includes(v.book))).slice(0, count)) {
            if (questions.length >= count) break;
            const verseText = getVerse(bibleData, vRef.book, vRef.ch, vRef.v);
            if (!verseText) continue;
            const bookName = getBookName(bibleData, vRef.book);
            const otherBooks = pickRandom(bibleData.bookList.filter(b => b.book !== vRef.book), 3).map(b => b.name);
            const options = shuffle([bookName, ...otherBooks]);
            questions.push({
                q: `"${truncateVerse(verseText, 60)}"`,
                qPrefix: getQuestionPrefix(bibleData, 'which_book_verse'),
                options: options,
                answer: options.indexOf(bookName),
                ref: getRef(bibleData, vRef.book, vRef.ch, vRef.v)
            });
        }

        return shuffle(questions).slice(0, count);
    }

    // --- Helper functions ---

    function truncateVerse(text, maxLen) {
        // Clean up the text first
        let clean = text.replace(/[\u00b6]/g, '').trim();
        if (clean.length <= maxLen) return clean;
        return clean.substring(0, maxLen) + '...';
    }

    function findCharacterName(bibleData, char) {
        // Use the native dictionary if available for 100% accurate character names
        const lang = quizState.language;
        if (nativeCharacterNames[lang] && nativeCharacterNames[lang][char.name]) {
            return nativeCharacterNames[lang][char.name];
        }

        // Fallback for English, Spanish, French, German, Hebrew, Chinese or if missing
        return char.name;
    }

    function createFillInBlank(verseText) {
        const clean = verseText.replace(/[\u00b6]/g, '').trim();
        const words = clean.split(/\s+/).filter(w => w.length > 2);
        if (words.length < 5) return null;

        // Pick a word from the middle of the verse (more meaningful)
        const midStart = Math.floor(words.length * 0.25);
        const midEnd = Math.floor(words.length * 0.75);
        const targetIdx = midStart + Math.floor(Math.random() * (midEnd - midStart));
        const targetWord = words[targetIdx];

        // Clean the target word of punctuation
        const cleanWord = targetWord.replace(/[,."'""''!?;:।॥\u0964\u0965]/g, '');
        if (cleanWord.length < 2) return null;

        // Create question with blank
        const question = words.map((w, i) => i === targetIdx ? '_____' : w).join(' ');
        return { question, answer: cleanWord };
    }

    function getNearbyWords(bibleData, book, chapter, verse, count) {
        const words = [];
        // Get words from nearby verses
        for (let v = Math.max(1, verse - 3); v <= verse + 3; v++) {
            if (v === verse) continue;
            const text = getVerse(bibleData, book, chapter, v);
            if (text) {
                const w = text.split(/\s+/).filter(w => w.length > 2);
                words.push(...w.map(word => word.replace(/[,."'""''!?;:।॥\u0964\u0965]/g, '')).filter(w => w.length > 1));
            }
        }
        return [...new Set(shuffle(words))].slice(0, count);
    }

    // Get question prefix text based on language
    function getQuestionPrefix(bibleData, type) {
        // These work as simple labels shown before the question content
        const lang = quizState.language;
        const prefixes = {
            english: {
                which_book: 'Which book contains this verse?',
                which_book_character: 'Which book tells us about:',
                which_book_verse: 'Which book has this verse?',
                fill_blank: 'Complete the verse:',
                what_comes_after: 'Which book comes after:',
                how_many_chapters: 'How many chapters in:',
                what_reference: 'What is the reference for this verse?',
                creation_day: 'What was created on day:',
                who_in_verse: 'Who is mentioned in this verse?'
            },
            hindi: {
                which_book: 'यह पद किस पुस्तक में है?',
                which_book_character: 'किस पुस्तक में इसके बारे में लिखा है:',
                which_book_verse: 'यह वचन किस पुस्तक में है?',
                fill_blank: 'वचन पूरा करें:',
                what_comes_after: 'किसके बाद कौन सी पुस्तक आती है:',
                how_many_chapters: 'कितने अध्याय हैं:',
                what_reference: 'इस वचन का संदर्भ क्या है?',
                creation_day: 'इस दिन क्या बनाया गया:',
                who_in_verse: 'इस वचन में किसका उल्लेख है?'
            },
            odia: {
                which_book: 'ଏହି ପଦ କେଉଁ ପୁସ୍ତକରେ ଅଛି?',
                which_book_character: 'କେଉଁ ପୁସ୍ତକରେ ଏହା ବିଷୟରେ ଲେଖା ଅଛି:',
                which_book_verse: 'ଏହି ବଚନ କେଉଁ ପୁସ୍ତକରେ ଅଛି?',
                fill_blank: 'ବଚନ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ:',
                what_comes_after: 'କେଉଁ ପୁସ୍ତକ ପରେ ଆସେ:',
                how_many_chapters: 'କେତୋଟି ଅଧ୍ୟାୟ ଅଛି:',
                what_reference: 'ଏହି ବଚନର ସନ୍ଦର୍ଭ କ\'ଣ?',
                creation_day: 'ଏହି ଦିନ କ\'ଣ ସୃଷ୍ଟି ହେଲା:',
                who_in_verse: 'ଏହି ପଦରେ କାହାର ଉଲ୍ଲେଖ ଅଛି?'
            },
            telugu: {
                which_book: 'ఈ వచనం ఏ పుస్తకంలో ఉంది?',
                which_book_character: 'ఏ పుస్తకంలో దీని గురించి ఉంది:',
                which_book_verse: 'ఈ వచనం ఏ పుస్తకంలో ఉంది?',
                fill_blank: 'వచనాన్ని పూర్తి చేయండి:',
                what_comes_after: 'ఏ పుస్తకం తర్వాత వస్తుంది:',
                how_many_chapters: 'ఎన్ని అధ్యాయాలు ఉన్నాయి:',
                what_reference: 'ఈ వచనం యొక్క సూచన ఏమిటి?',
                creation_day: 'ఈ రోజు ఏమి సృష్టించబడింది:',
                who_in_verse: 'ఈ వచనంలో ఎవరు ప్రస్తావించబడ్డారు?'
            },
            tamil: {
                which_book: 'இந்த வசனம் எந்த புத்தகத்தில் உள்ளது?',
                which_book_character: 'எந்த புத்தகத்தில் இதைப் பற்றி உள்ளது:',
                which_book_verse: 'இந்த வசனம் எந்த புத்தகத்தில் உள்ளது?',
                fill_blank: 'வசனத்தை நிரப்புக:',
                what_comes_after: 'எந்த புத்தகம் அடுத்து வரும்:',
                how_many_chapters: 'எத்தனை அதிகாரங்கள் உள்ளன:',
                what_reference: 'இந்த வசனத்தின் குறிப்பு என்ன?',
                creation_day: 'இந்த நாளில் என்ன படைக்கப்பட்டது:',
                who_in_verse: 'இந்த வசனத்தில் யார் குறிப்பிடப்படுகிறார்?'
            },
            kannada: {
                which_book: 'ಈ ವಚನ ಯಾವ ಪುಸ್ತಕದಲ್ಲಿದೆ?',
                which_book_character: 'ಯಾವ ಪುಸ್ತಕದಲ್ಲಿ ಇದರ ಬಗ್ಗೆ ಇದೆ:',
                which_book_verse: 'ಈ ವಚನ ಯಾವ ಪುಸ್ತಕದಲ್ಲಿದೆ?',
                fill_blank: 'ವಚನವನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ:',
                what_comes_after: 'ಯಾವ ಪುಸ್ತಕದ ನಂತರ ಬರುತ್ತದೆ:',
                how_many_chapters: 'ಎಷ್ಟು ಅಧ್ಯಾಯಗಳಿವೆ:',
                what_reference: 'ಈ ವಚನದ ಉಲ್ಲೇಖವೇನು?',
                creation_day: 'ಈ ದಿನ ಏನು ಸೃಷ್ಟಿಸಲಾಯಿತು:',
                who_in_verse: 'ಈ ವಚನದಲ್ಲಿ ಯಾರನ್ನು ಉಲ್ಲೇಖಿಸಲಾಗಿದೆ?'
            },
            gurmukhi: {
                which_book: 'ਇਹ ਆਇਤ ਕਿਸ ਕਿਤਾਬ ਵਿੱਚ ਹੈ?',
                which_book_character: 'ਕਿਸ ਕਿਤਾਬ ਵਿੱਚ ਇਸ ਬਾਰੇ ਲਿਖਿਆ ਹੈ:',
                which_book_verse: 'ਇਹ ਆਇਤ ਕਿਸ ਕਿਤਾਬ ਵਿੱਚ ਹੈ?',
                fill_blank: 'ਆਇਤ ਪੂਰੀ ਕਰੋ:',
                what_comes_after: 'ਕਿਸ ਕਿਤਾਬ ਤੋਂ ਬਾਅਦ ਆਉਂਦੀ ਹੈ:',
                how_many_chapters: 'ਕਿੰਨੇ ਅਧਿਆਇ ਹਨ:',
                what_reference: 'ਇਸ ਆਇਤ ਦਾ ਹਵਾਲਾ ਕੀ ਹੈ?',
                creation_day: 'ਇਸ ਦਿਨ ਕੀ ਬਣਾਇਆ ਗਿਆ:',
                who_in_verse: 'ਇਸ ਆਇਤ ਵਿੱਚ ਕਿਸਦਾ ਜ਼ਿਕਰ ਹੈ?'
            },
            marathi: {
                which_book: 'हे वचन कोणत्या पुस्तकात आहे?',
                which_book_character: 'कोणत्या पुस्तकात याबद्दल लिहिले आहे:',
                which_book_verse: 'हे वचन कोणत्या पुस्तकात आहे?',
                fill_blank: 'वचन पूर्ण करा:',
                what_comes_after: 'कोणत्या पुस्तकानंतर येते:',
                how_many_chapters: 'किती अध्याय आहेत:',
                what_reference: 'या वचनाचा संदर्भ काय आहे?',
                creation_day: 'या दिवशी काय निर्माण केले:',
                who_in_verse: 'या वचनात कोणाचा उल्लेख आहे?'
            },
            hebrew: {
                which_book: 'באיזה ספר מופיע פסוק זה?',
                which_book_character: 'איזה ספר מספר על:',
                which_book_verse: 'באיזה ספר הפסוק הזה?',
                fill_blank: 'השלם את הפסוק:',
                what_comes_after: 'איזה ספר בא אחרי:',
                how_many_chapters: 'כמה פרקים יש ב:',
                what_reference: 'מהו המקור לפסוק זה?',
                creation_day: 'מה נברא ביום:',
                who_in_verse: 'מי מוזכר בפסוק זה?'
            },
            chinese: {
                which_book: '这节经文在卷书？',
                which_book_character: '哪卷书提到了：',
                which_book_verse: '这节经文在哪卷书？',
                fill_blank: '完成这节经文：',
                what_comes_after: '哪卷书在它之后：',
                how_many_chapters: '有多少章：',
                what_reference: '这节经文的出处是？',
                creation_day: '这天创造了什么：',
                who_in_verse: '这节经文提到谁？'
            },
            french: {
                which_book: 'Dans quel livre trouve-t-on ce verset ?',
                which_book_character: 'Quel livre nous parle de :',
                which_book_verse: 'Dans quel livre est ce verset ?',
                fill_blank: 'Complétez le verset :',
                what_comes_after: 'Quel livre vient après :',
                how_many_chapters: 'Combien de chapitres dans :',
                what_reference: 'Quelle est la référence de ce verset ?',
                creation_day: 'Qu\'a été créé le jour :',
                who_in_verse: 'Qui est mentionné dans ce verset ?'
            },
            german: {
                which_book: 'In welchem Buch steht dieser Vers?',
                which_book_character: 'Welches Buch erzählt von:',
                which_book_verse: 'In welchem Buch ist dieser Vers?',
                fill_blank: 'Vervollständige den Vers:',
                what_comes_after: 'Welches Buch kommt nach:',
                how_many_chapters: 'Wie viele Kapitel hat:',
                what_reference: 'Was ist die Referenz für diesen Vers?',
                creation_day: 'Was wurde an Tag erschaffen:',
                who_in_verse: 'Wer wird in diesem Vers erwähnt?'
            },
            spanish: {
                which_book: '¿En qué libro está este versículo?',
                which_book_character: '¿Qué libro nos habla de:',
                which_book_verse: '¿En qué libro está este versículo?',
                fill_blank: 'Completa el versículo:',
                what_comes_after: '¿Qué libro viene después de:',
                how_many_chapters: '¿Cuántos capítulos tiene:',
                what_reference: '¿Cuál es la referencia de este versículo?',
                creation_day: '¿Qué fue creado en el día:',
                who_in_verse: '¿Quién se menciona en este versículo?'
            }
        };

        // Default to English if no translation available
        const langPrefixes = prefixes[lang] || prefixes.english;
        return langPrefixes[type] || prefixes.english[type] || '';
    }

    // Get creation day labels in the current language
    function getCreationLabels(bibleData) {
        const lang = quizState.language;
        const labels = {
            english: { light: 'Light', sky: 'Sky', land_plants: 'Land & Plants', sun_moon_stars: 'Sun, Moon & Stars', birds_fish: 'Birds & Fish', animals_humans: 'Animals & Humans', rest: 'Rest' },
            hindi: { light: 'उजियाला', sky: 'आकाश', land_plants: 'भूमि और पौधे', sun_moon_stars: 'सूर्य, चन्द्रमा और तारे', birds_fish: 'पक्षी और मछलियाँ', animals_humans: 'पशु और मनुष्य', rest: 'विश्राम' },
            odia: { light: 'ଦୀପ୍ତି', sky: 'ଆକାଶ', land_plants: 'ଭୂମି ଓ ବୃକ୍ଷ', sun_moon_stars: 'ସୂର୍ଯ୍ୟ, ଚନ୍ଦ୍ର ଓ ତାରା', birds_fish: 'ପକ୍ଷୀ ଓ ମାଛ', animals_humans: 'ପଶୁ ଓ ମନୁଷ୍ୟ', rest: 'ବିଶ୍ରାମ' },
            telugu: { light: 'వెలుగు', sky: 'ఆకాశము', land_plants: 'భూమి మరియు మొక్కలు', sun_moon_stars: 'సూర్యుడు, చంద్రుడు, నక్షత్రాలు', birds_fish: 'పక్షులు మరియు చేపలు', animals_humans: 'జంతువులు మరియు మానవులు', rest: 'విశ్రాంతి' },
            tamil: { light: 'ஒளி', sky: 'வானம்', land_plants: 'நிலம் மற்றும் தாவரங்கள்', sun_moon_stars: 'சூரியன், சந்திரன், நட்சத்திரங்கள்', birds_fish: 'பறவைகள் மற்றும் மீன்கள்', animals_humans: 'விலங்குகள் மற்றும் மனிதர்கள்', rest: 'ஓய்வு' },
            kannada: { light: 'ಬೆಳಕು', sky: 'ಆಕಾಶ', land_plants: 'ಭೂಮಿ ಮತ್ತು ಸಸ್ಯಗಳು', sun_moon_stars: 'ಸೂರ್ಯ, ಚಂದ್ರ, ನಕ್ಷತ್ರಗಳು', birds_fish: 'ಪಕ್ಷಿಗಳು ಮತ್ತು ಮೀನುಗಳು', animals_humans: 'ಪ್ರಾಣಿಗಳು ಮತ್ತು ಮನುಷ್ಯರು', rest: 'ವಿಶ್ರಾಂತಿ' },
            gurmukhi: { light: 'ਰੋਸ਼ਨੀ', sky: 'ਅਸਮਾਨ', land_plants: 'ਜ਼ਮੀਨ ਅਤੇ ਪੌਦੇ', sun_moon_stars: 'ਸੂਰਜ, ਚੰਦ, ਤਾਰੇ', birds_fish: 'ਪੰਛੀ ਅਤੇ ਮੱਛੀਆਂ', animals_humans: 'ਜਾਨਵਰ ਅਤੇ ਇਨਸਾਨ', rest: 'ਆਰਾਮ' },
            marathi: { light: 'प्रकाश', sky: 'आकाश', land_plants: 'जमीन आणि वनस्पती', sun_moon_stars: 'सूर्य, चंद्र, तारे', birds_fish: 'पक्षी आणि मासे', animals_humans: 'प्राणी आणि मानव', rest: 'विश्रांती' },
            hebrew: { light: 'אור', sky: 'שמיים', land_plants: 'יבשה וצמחים', sun_moon_stars: 'שמש, ירח כוכבים', birds_fish: 'ציפורים ודגים', animals_humans: 'בעלי חיים ואדם', rest: 'מנוחה' },
            chinese: { light: '光', sky: '天空', land_plants: '陆地和植物', sun_moon_stars: '日月星辰', birds_fish: '飞鸟和鱼', animals_humans: '动物和人类', rest: '安息' },
            french: { light: 'Lumière', sky: 'Ciel', land_plants: 'Terre & Plantes', sun_moon_stars: 'Soleil, Lune, Étoiles', birds_fish: 'Oiseaux & Poissons', animals_humans: 'Animaux & Humains', rest: 'Repos' },
            german: { light: 'Licht', sky: 'Himmel', land_plants: 'Land & Pflanzen', sun_moon_stars: 'Sonne, Mond & Sterne', birds_fish: 'Vögel & Fische', animals_humans: 'Tiere & Menschen', rest: 'Ruhe' },
            spanish: { light: 'Luz', sky: 'Cielo', land_plants: 'Tierra y Plantas', sun_moon_stars: 'Sol, Luna, Estrellas', birds_fish: 'Aves y Peces', animals_humans: 'Animales y Humanos', rest: 'Descanso' }
        };
        return labels[lang] || labels.english;
    }

    // UI labels per language
    function getLabels() {
        const lang = quizState.language;
        const all = {
            english: { q: 'Question', of: 'of', score: 'Score', next: 'Next Question →', complete: 'Quiz Complete!', retry: '🔄 Retry', newq: '📝 New Quiz', home: '🏠 Home', detail: (c, t) => `You got ${c} out of ${t} correct!`, loading: 'Loading Bible data...' },
            hindi: { q: 'प्रश्न', of: 'का', score: 'स्कोर', next: 'अगला प्रश्न →', complete: 'क्विज़ पूरी!', retry: '🔄 फिर से', newq: '📝 नई क्विज़', home: '🏠 होम', detail: (c, t) => `आपने ${t} में से ${c} सही उत्तर दिए!`, loading: 'बाइबल डेटा लोड हो रहा है...' },
            odia: { q: 'ପ୍ରଶ୍ନ', of: 'ରୁ', score: 'ସ୍କୋର', next: 'ପରବର୍ତ୍ତୀ ପ୍ରଶ୍ନ →', complete: 'କ୍ୱିଜ୍ ସମ୍ପୂର୍ଣ୍ଣ!', retry: '🔄 ପୁଣି ଚେଷ୍ଟା', newq: '📝 ନୂଆ କ୍ୱିଜ୍', home: '🏠 ମୂଳ ପୃଷ୍ଠା', detail: (c, t) => `ଆପଣ ${t} ରୁ ${c} ଟି ସଠିକ ଉତ୍ତର ଦେଲେ!`, loading: 'ବାଇବଲ ଡାଟା ଲୋଡ ହେଉଛି...' },
            telugu: { q: 'ప్రశ్న', of: 'లో', score: 'స్కోరు', next: 'తదుపరి ప్రశ్న →', complete: 'క్విజ్ పూర్తి!', retry: '🔄 మళ్ళీ', newq: '📝 కొత్త క్విజ్', home: '🏠 హోమ్', detail: (c, t) => `మీరు ${t} లో ${c} సరిగ్గా సమాధానాలు ఇచ్చారు!`, loading: 'బైబిల్ డేటా లోడ్ అవుతోంది...' },
            tamil: { q: 'கேள்வி', of: 'இல்', score: 'மதிப்பெண்', next: 'அடுத்த கேள்வி →', complete: 'வினாடி வினா முடிந்தது!', retry: '🔄 மீண்டும்', newq: '📝 புதிய வினா', home: '🏠 முகப்பு', detail: (c, t) => `${t} இல் ${c} சரியாக பதிலளித்தீர்கள்!`, loading: 'வேதாகம தரவு ஏற்றுகிறது...' },
            kannada: { q: 'ಪ್ರಶ್ನೆ', of: 'ರಲ್ಲಿ', score: 'ಅಂಕ', next: 'ಮುಂದಿನ ಪ್ರಶ್ನೆ →', complete: 'ಕ್ವಿಜ್ ಮುಗಿಯಿತು!', retry: '🔄 ಮತ್ತೆ', newq: '📝 ಹೊಸ ಕ್ವಿಜ್', home: '🏠 ಮುಖಪುಟ', detail: (c, t) => `ನೀವು ${t} ರಲ್ಲಿ ${c} ಸರಿ ಉತ್ತರಿಸಿದ್ದೀರಿ!`, loading: 'ಬೈಬಲ್ ಡೇಟಾ ಲೋಡ್ ಆಗುತ್ತಿದೆ...' },
            gurmukhi: { q: 'ਸਵਾਲ', of: 'ਵਿੱਚੋਂ', score: 'ਸਕੋਰ', next: 'ਅਗਲਾ ਸਵਾਲ →', complete: 'ਕੁਇਜ਼ ਪੂਰੀ!', retry: '🔄 ਦੁਬਾਰਾ', newq: '📝 ਨਵੀਂ ਕੁਇਜ਼', home: '🏠 ਹੋਮ', detail: (c, t) => `ਤੁਸੀਂ ${t} ਵਿੱਚੋਂ ${c} ਸਹੀ ਜਵਾਬ ਦਿੱਤੇ!`, loading: 'ਬਾਈਬਲ ਡਾਟਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...' },
            marathi: { q: 'प्रश्न', of: 'पैकी', score: 'गुण', next: 'पुढील प्रश्न →', complete: 'क्विझ पूर्ण!', retry: '🔄 पुन्हा', newq: '📝 नवीन क्विझ', home: '🏠 मुख्यपृष्ठ', detail: (c, t) => `तुम्ही ${t} पैकी ${c} बरोबर उत्तरे दिली!`, loading: 'बायबल डेटा लोड होत आहे...' }
        };
        return all[lang] || all.english;
    }

    // --- Initialize Quiz Module ---
    function initQuiz() {
        $('openBibleBtn').addEventListener('click', () => showSection('bibleSection'));
        $('openQuizBtn').addEventListener('click', () => showSection('quizSection'));
        $('backToHomeBtn').addEventListener('click', () => showSection('landingPage'));
        $('quizBackToHomeBtn').addEventListener('click', () => {
            clearTimer();
            showSection('landingPage');
        });

        // Category is now randomly selected (UI removed)

        // Count selector
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                quizState.questionCount = parseInt(btn.dataset.count);
            });
        });

        // Start quiz
        $('startQuizBtn').addEventListener('click', startQuiz);
        $('quizNextBtn').addEventListener('click', nextQuestion);
        $('retryQuizBtn').addEventListener('click', retryQuiz);
        $('newQuizBtn').addEventListener('click', newQuiz);
        $('quizToHomeBtn').addEventListener('click', () => {
            clearTimer();
            showSection('landingPage');
        });
    }

    // --- Section Navigation ---
    function showSection(sectionId) {
        $('landingPage').style.display = 'none';
        $('bibleSection').style.display = 'none';
        $('quizSection').style.display = 'none';

        const el = $(sectionId);
        if (el) el.style.display = '';

        if (sectionId === 'bibleSection') {
            if (typeof window.initializeBibleApp === 'function' && !window._bibleInitialized) {
                window._bibleInitialized = true;
                window.initializeBibleApp();
            }
        }

        if (sectionId === 'quizSection') {
            showQuizScreen('quizSetupScreen');
        }
    }

    function showQuizScreen(screenId) {
        $('quizSetupScreen').style.display = 'none';
        $('quizPlayScreen').style.display = 'none';
        $('quizResultsScreen').style.display = 'none';
        $(screenId).style.display = '';
    }

    // --- Start Quiz ---
    async function startQuiz() {
        quizState.language = $('quizLanguageSelect').value;
        quizState.currentIndex = 0;
        quizState.score = 0;
        quizState.skipped = 0;
        quizState.answered = false;

        const labels = getLabels();

        // Show loading state
        showQuizScreen('quizPlayScreen');
        $('quizQuestionText').textContent = labels.loading || '⏳ Loading Bible data...';
        $('quizQuestionRef').textContent = '';
        $('quizOptionsArea').innerHTML = '<p style="text-align:center;color:#718096;">Preparing your quiz...</p>';
        $('quizNextBtn').style.display = 'none';
        $('quizTimer').textContent = '';
        $('quizProgressFill').style.width = '0%';

        try {
            // Load Bible data for selected language AND English (for reference)
            const [bibleData] = await Promise.all([
                loadBibleData(quizState.language),
                loadBibleData('english') // Always load English as reference
            ]);

            const engData = bibleDataCache['english'];

            // Randomly pick a category for this quiz session
            const categories = ['characters', 'memory', 'youth', 'kids'];
            quizState.category = categories[Math.floor(Math.random() * categories.length)];
            console.log('[Quiz] Randomly selected category:', quizState.category);

            // Generate questions based on randomly selected category
            switch (quizState.category) {
                case 'characters':
                    quizState.questions = generateCharacterQuestions(bibleData, engData, quizState.questionCount);
                    break;
                case 'memory':
                    quizState.questions = generateVerseMemoryQuestions(bibleData, engData, quizState.questionCount);
                    break;
                case 'youth':
                    quizState.questions = generateYouthQuestions(bibleData, engData, quizState.questionCount);
                    break;
                case 'kids':
                    quizState.questions = generateKidsQuestions(bibleData, engData, quizState.questionCount);
                    break;
                default:
                    quizState.questions = generateCharacterQuestions(bibleData, engData, quizState.questionCount);
            }

            if (quizState.questions.length === 0) {
                $('quizQuestionText').textContent = 'Could not generate questions. Please try again.';
                return;
            }

            // Update labels
            $('quizNextBtn').textContent = labels.next;
            renderQuestion();

        } catch (err) {
            console.error('Quiz loading error:', err);
            $('quizQuestionText').textContent = 'Error loading Bible data. Please try again.';
        }
    }

    // --- Render Question ---
    function renderQuestion() {
        clearTimer();
        quizState.answered = false;
        const labels = getLabels();
        const q = quizState.questions[quizState.currentIndex];
        const total = quizState.questions.length;
        const idx = quizState.currentIndex + 1;

        // Progress
        $('quizProgressFill').style.width = `${(idx / total) * 100}%`;
        $('quizQuestionCounter').textContent = `${labels.q} ${idx} ${labels.of} ${total}`;
        $('quizScoreLive').textContent = `${labels.score}: ${quizState.score}`;

        // Question — show prefix + content
        if (q.qPrefix) {
            $('quizQuestionText').innerHTML = `<span class="q-prefix">${q.qPrefix}</span><br>${q.q}`;
        } else {
            $('quizQuestionText').textContent = q.q;
        }
        $('quizQuestionRef').textContent = ''; // Hide reference initially

        // Options
        const optionsArea = $('quizOptionsArea');
        optionsArea.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];

        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.dataset.index = idx;
            btn.innerHTML = `
                <span class="option-letter">${letters[idx]}</span>
                <span class="option-text">${opt}</span>
            `;
            btn.addEventListener('click', () => handleAnswer(idx, btn));
            optionsArea.appendChild(btn);
        });

        // Hide next button
        $('quizNextBtn').style.display = 'none';

        // Start timer
        startTimer();
    }

    // --- Handle Answer ---
    function handleAnswer(selectedIndex, clickedBtn) {
        if (quizState.answered) return;
        quizState.answered = true;
        clearTimer();

        const q = quizState.questions[quizState.currentIndex];
        const isCorrect = selectedIndex === q.answer;

        if (isCorrect) {
            quizState.score++;
            clickedBtn.classList.add('correct');
        } else {
            clickedBtn.classList.add('incorrect');
            document.querySelectorAll('.option-btn').forEach(btn => {
                if (parseInt(btn.dataset.index) === q.answer) {
                    btn.classList.add('correct');
                }
            });
        }

        document.querySelectorAll('.option-btn').forEach(btn => btn.classList.add('disabled'));

        // Show reference after answering as a clickable link
        if (q.ref) {
            $('quizQuestionRef').innerHTML = `<a href="javascript:void(0)" onclick="window.openBibleVerse('${q.ref}', ${q.book}, ${q.ch}, ${q.v})" class="reference-link">📖 ${q.ref}</a>`;
        }

        const labels = getLabels();
        $('quizScoreLive').textContent = `${labels.score}: ${quizState.score}`;

        $('quizNextBtn').style.display = '';
        if (quizState.currentIndex >= quizState.questions.length - 1) {
            $('quizNextBtn').textContent = '🏁 ' + labels.complete.replace('!', '');
        }
    }

    // --- Timer ---
    function startTimer() {
        quizState.timeLeft = 15;
        const timerEl = $('quizTimer');
        timerEl.textContent = `⏱ ${quizState.timeLeft}`;
        timerEl.classList.remove('warning');

        quizState.timer = setInterval(() => {
            quizState.timeLeft--;
            timerEl.textContent = `⏱ ${quizState.timeLeft}`;

            if (quizState.timeLeft <= 5) {
                timerEl.classList.add('warning');
            }

            if (quizState.timeLeft <= 0) {
                clearTimer();
                if (!quizState.answered) {
                    quizState.answered = true;
                    quizState.skipped++;

                    const q = quizState.questions[quizState.currentIndex];
                    // Show reference on timeout as a clickable link
                    if (q.ref) {
                        $('quizQuestionRef').innerHTML = `<a href="javascript:void(0)" onclick="window.openBibleVerse('${q.ref}', ${q.book}, ${q.ch}, ${q.v})" class="reference-link">📖 ${q.ref}</a>`;
                    }

                    document.querySelectorAll('.option-btn').forEach(btn => {
                        if (parseInt(btn.dataset.index) === q.answer) {
                            btn.classList.add('correct');
                        }
                        btn.classList.add('disabled');
                    });

                    $('quizNextBtn').style.display = '';
                    const labels = getLabels();
                    if (quizState.currentIndex >= quizState.questions.length - 1) {
                        $('quizNextBtn').textContent = '🏁 ' + labels.complete.replace('!', '');
                    }
                }
            }
        }, 1000);
    }

    function clearTimer() {
        if (quizState.timer) {
            clearInterval(quizState.timer);
            quizState.timer = null;
        }
    }

    // --- Next Question ---
    function nextQuestion() {
        quizState.currentIndex++;
        if (quizState.currentIndex >= quizState.questions.length) {
            showResults();
        } else {
            renderQuestion();
        }
    }

    // --- Show Results ---
    function showResults() {
        clearTimer();
        const labels = getLabels();
        const total = quizState.questions.length;
        const correct = quizState.score;
        const wrong = total - correct - quizState.skipped;
        const percent = Math.round((correct / total) * 100);

        let emoji = '😢';
        if (percent >= 90) emoji = '🏆';
        else if (percent >= 70) emoji = '🌟';
        else if (percent >= 50) emoji = '👍';
        else if (percent >= 30) emoji = '📖';

        $('resultsEmoji').textContent = emoji;
        $('resultsTitle').textContent = labels.complete;
        $('resultsPercent').textContent = `${percent}%`;
        $('resultsDetail').textContent = labels.detail(correct, total);
        $('resultsCorrect').textContent = correct;
        $('resultsWrong').textContent = wrong;
        $('resultsSkipped').textContent = quizState.skipped;

        const circumference = 2 * Math.PI * 52;
        const offset = circumference - (percent / 100) * circumference;
        const ring = $('scoreRingCircle');
        ring.style.strokeDasharray = circumference;
        ring.style.strokeDashoffset = circumference;

        if (percent >= 70) ring.style.stroke = '#48bb78';
        else if (percent >= 40) ring.style.stroke = '#ed8936';
        else ring.style.stroke = '#fc8181';

        $('retryQuizBtn').textContent = labels.retry;
        $('newQuizBtn').textContent = labels.newq;
        $('quizToHomeBtn').textContent = labels.home;

        showQuizScreen('quizResultsScreen');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                ring.style.strokeDashoffset = offset;
            });
        });
    }

    // --- Retry / New Quiz ---
    function retryQuiz() {
        startQuiz();
    }

    function newQuiz() {
        showQuizScreen('quizSetupScreen');
    }

    // --- Boot ---
    document.addEventListener('DOMContentLoaded', initQuiz);

})();
