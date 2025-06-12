// The application will now start after the basic HTML document is loaded.
document.addEventListener('DOMContentLoaded', initializeApp);


// Data arrays and App State
let netBibleData = [], hindiBibleData = [], odiaBibleData = [], teluguBibleData = [], tamilBibleData = [], kannadaBibleData = [], currentIndianLanguageData = [];
let availableVoices = [];
let currentSpeech = { utterance: null, isPlaying: false, isPaused: false, source: null };
let currentPlaybackRate = parseFloat(localStorage.getItem('playbackRate')) || 1.0;

// Local dictionary for overriding incorrect translations from the API
const localTranslations = {
    'or': { // Odia
        'entice': 'ପ୍ରଲୋଭିତ କରିବା'
    }
};

const bibleBooks = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];

// DOM Elements
const bookSelect = document.getElementById('bookSelect'), chapterSelect = document.getElementById('chapterSelect'), languageSelect = document.getElementById('languageSelect'), goButton = document.getElementById('goButton'), prevChapterButton = document.getElementById('prevChapterButton'), nextChapterButton = document.getElementById('nextChapterButton'), playEnglishButton = document.getElementById('playEnglishButton'), playIndianLangButton = document.getElementById('playIndianLangButton'), pauseResumeButton = document.getElementById('pauseResumeButton'), stopAudioButton = document.getElementById('stopAudioButton'), playbackRateSlider = document.getElementById('playbackRateSlider'), playbackRateValue = document.getElementById('playbackRateValue'), bibleTextDiv = document.getElementById('bibleTextDiv'), loadingIndicator = document.getElementById('loadingIndicator'), wordStudyModal = document.getElementById('wordStudyModal'), closeModalButton = document.getElementById('closeModalButton'), selectedWordHeader = document.getElementById('selectedWordHeader'), dictionaryMeaning = document.getElementById('dictionaryMeaning'), occurrencesDiv = document.getElementById('occurrences'), quickSearchInput = document.getElementById('quickSearchInput'), searchButton = document.getElementById('searchButton'), toggleControlsButton = document.getElementById('toggleControlsButton'), secondaryControls = document.querySelector('.secondary-controls');

// Mapping for Sanscript.js
const transliterationLangMap = {
    'irv_hindi': 'devanagari',
    'odia_all_books': 'oriya',
    'te_irv_updated': 'telugu',
    'ta_oitce_updated': 'tamil',
    'kn_irv_updated': 'kannada'
};

async function initializeApp() {
    setupEventListeners();
    setInitialControlsState();
    populateBookSelect();
    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => availableVoices = speechSynthesis.getVoices();
        availableVoices = speechSynthesis.getVoices();
    }
    try {
        loadingIndicator.style.display = 'block';
        await Promise.allSettled([
            fetchAndProcessBibleData('all_web_bible_updated.json', 'english'),
            fetchAndProcessBibleData('irv_hindi.json', 'hindi'),
            fetchAndProcessBibleData('odia_all_books.json', 'odia'),
            fetchAndProcessBibleData('te_irv_updated.json', 'telugu'),
            fetchAndProcessBibleData('ta_oitce_updated.json', 'tamil'),
            fetchAndProcessBibleData('kn_irv_updated.json', 'kannada')
        ]);
        populateChapterSelect(bookSelect.value);
        setCurrentIndianLanguageData();
        displayChapter(); 
    } catch (error) {
        console.error("Initialization error:", error);
    } finally {
        loadingIndicator.style.display = 'none';
        playbackRateSlider.value = currentPlaybackRate;
        playbackRateValue.textContent = `${currentPlaybackRate.toFixed(1)}x`;
    }
}

function setupEventListeners() {
    bookSelect.addEventListener('change', () => { populateChapterSelect(bookSelect.value); displayChapter(); });
    chapterSelect.addEventListener('change', displayChapter);
    languageSelect.addEventListener('change', () => { setCurrentIndianLanguageData(); displayChapter(); });
    prevChapterButton.addEventListener('click', navigateToPreviousChapter);
    nextChapterButton.addEventListener('click', navigateToNextChapter);
    playEnglishButton.addEventListener('click', handlePlayEnglishChapter);
    playIndianLangButton.addEventListener('click', handlePlayIndianLangChapter);
    pauseResumeButton.addEventListener('click', togglePauseResume);
    stopAudioButton.addEventListener('click', stopCurrentAudio);
    playbackRateSlider.addEventListener('input', e => {
        currentPlaybackRate = parseFloat(e.target.value);
        playbackRateValue.textContent = `${currentPlaybackRate.toFixed(1)}x`;
        localStorage.setItem('playbackRate', currentPlaybackRate);
        if (currentSpeech.utterance && currentSpeech.isPlaying) {
            currentSpeech.utterance.rate = currentPlaybackRate;
        }
    });
    closeModalButton.addEventListener('click', () => wordStudyModal.style.display = 'none');
    searchButton.addEventListener('click', () => handleSearch(quickSearchInput.value));
    quickSearchInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearch(quickSearchInput.value); });
    resetChapterAudioButtons();

    goButton.addEventListener('click', () => { 
        displayChapter(1); 
        // On mobile, hide controls after clicking "Go"
        if (window.innerWidth <= 768) {
            secondaryControls.classList.add('hidden');
            toggleControlsButton.textContent = '+';
        }
    });

    toggleControlsButton.addEventListener('click', () => {
        secondaryControls.classList.toggle('hidden');
        if (secondaryControls.classList.contains('hidden')) {
            toggleControlsButton.textContent = '+';
        } else {
            toggleControlsButton.textContent = '-';
        }
    });
}

function setInitialControlsState() {
    if (window.innerWidth <= 768) {
        secondaryControls.classList.add('hidden');
        toggleControlsButton.textContent = '+';
    } else {
        secondaryControls.classList.remove('hidden');
        toggleControlsButton.textContent = '-';
    }
}

async function fetchAndProcessBibleData(filePath, langKey) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        switch(langKey) {
            case 'english': netBibleData = data; break;
            case 'hindi': hindiBibleData = data; break;
            case 'odia': odiaBibleData = data; break;
            case 'telugu': teluguBibleData = data; break;
            case 'tamil': tamilBibleData = data; break;
            case 'kannada': kannadaBibleData = data; break;
        }
    } catch (error) {
        console.error(`Failed to load ${langKey} data:`, error);
    }
}

function setCurrentIndianLanguageData() {
    switch(languageSelect.value) {
        case 'irv_hindi': currentIndianLanguageData = hindiBibleData; break;
        case 'odia_all_books': currentIndianLanguageData = odiaBibleData; break;
        case 'te_irv_updated': currentIndianLanguageData = teluguBibleData; break;
        case 'ta_oitce_updated': currentIndianLanguageData = tamilBibleData; break;
        case 'kn_irv_updated': currentIndianLanguageData = kannadaBibleData; break;
        default: currentIndianLanguageData = [];
    }
}

function populateBookSelect() {
    bibleBooks.forEach(book => bookSelect.add(new Option(book, book)));
}

function populateChapterSelect(bookName) {
    chapterSelect.innerHTML = '';
    const bookData = netBibleData.filter(v => v.englishBookName === bookName);
    const chapters = [...new Set(bookData.map(v => v.chapter))].sort((a,b) => a - b);
    if (chapters.length > 0) {
        chapters.forEach(chap => chapterSelect.add(new Option(chap, chap)));
    } else {
        chapterSelect.add(new Option('No Chapters', ''));
    }
}

async function displayChapter(scrollToVerseNum = null) {
    stopCurrentAudio();
    updateNavButtonsState();
    const selectedBook = bookSelect.value;
    const selectedChapter = parseInt(chapterSelect.value);
    if (!selectedBook || !selectedChapter) {
        bibleTextDiv.innerHTML = `<h2 class="chapter-title">Please select a book and chapter.</h2>`;
        return;
    }

    const englishVerses = netBibleData.filter(v => v.englishBookName === selectedBook && v.chapter === selectedChapter).sort((a, b) => a.verse - b.verse);
    const indianLanguageVerses = currentIndianLanguageData.filter(v => v.englishBookName === selectedBook && v.chapter === selectedChapter).sort((a, b) => a.verse - b.verse);
    
    bibleTextDiv.innerHTML = `<h2 class="chapter-title">${selectedBook} ${selectedChapter}</h2>`;
    
    const allVerses = [...englishVerses.map(v => v.verse), ...indianLanguageVerses.map(v => v.verse)];
    const maxVerseNum = allVerses.length > 0 ? Math.max(...allVerses) : 0;

    if (maxVerseNum === 0) {
        bibleTextDiv.innerHTML += `<p>No verses found for this chapter in the selected languages.</p>`;
        return;
    }
    
    const currentTransliterationSourceScript = transliterationLangMap[languageSelect.value];

    for (let i = 1; i <= maxVerseNum; i++) {
        const engVerse = englishVerses.find(v => v.verse === i);
        const indVerse = indianLanguageVerses.find(v => v.verse === i);
        
        if (engVerse || indVerse) {
            const verseBlock = document.createElement('div');
            verseBlock.className = 'verse-block';
            verseBlock.id = `verse-${i}`;
            verseBlock.innerHTML = `<p class="verse-number">${i}</p>`;
            
            if (engVerse?.text) {
                const cleanEngText = engVerse.text.replace(/"/g, '&quot;');
                verseBlock.innerHTML += `<p class="english-verse">${engVerse.text.replace(/([a-zA-Z0-9']+)/g, `<span class="word-clickable" data-word="$1">$1</span>`)} <button class="play-verse-audio-btn" data-lang="en-US" data-text="${cleanEngText}">🔊</button></p>`;
            }

            if (indVerse?.text) {
                let langInfo = {};
                switch(languageSelect.value) {
                    case 'irv_hindi': langInfo = {name: 'हिन्दी', code: 'hi-IN'}; break;
                    case 'odia_all_books': langInfo = {name: 'ଓଡିଆ', code: 'or-IN'}; break;
                    case 'te_irv_updated': langInfo = {name: 'తెలుగు', code: 'te-IN'}; break;
                    case 'ta_oitce_updated': langInfo = {name: 'தமிழ்', code: 'ta-IN'}; break;
                    case 'kn_irv_updated': langInfo = {name: 'ಕನ್ನಡ', code: 'kn-IN'}; break;
                    default: langInfo = {name: 'Indian Language', code: 'en-US'};
                }
                const cleanIndText = indVerse.text.replace(/"/g, '&quot;');
                verseBlock.innerHTML += `<p class="indian-lang-verse">(${langInfo.name}): ${indVerse.text} <button class="play-verse-audio-btn" data-lang="${langInfo.code}" data-text="${cleanIndText}">🔊</button></p>`;
            
                if (currentTransliterationSourceScript && typeof window.Sanscript !== 'undefined') {
                    try {
                        const transliteratedText = window.Sanscript.t(indVerse.text, currentTransliterationSourceScript, 'itrans');
                        if (transliteratedText) {
                            verseBlock.innerHTML += `<p class="roman-transliteration">(Roman): ${transliteratedText}</p>`;
                        }
                    } catch (e) {
                        console.error("Sanscript transliteration error:", e);
                    }
                }
            }
            bibleTextDiv.appendChild(verseBlock);
        }
    }
    document.querySelectorAll('.word-clickable').forEach(span => span.addEventListener('click', handleWordClick));

    document.querySelectorAll('.play-verse-audio-btn').forEach(btn => {
        btn.addEventListener('click', e => speakText(e.target.dataset.text, e.target.dataset.lang, 'verse'));
    });
    
    if (scrollToVerseNum) {
        const targetElement = document.getElementById(`verse-${scrollToVerseNum}`);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetElement.classList.add('highlighted-verse');
            setTimeout(() => targetElement.classList.remove('highlighted-verse'), 3000);
        }
    }
}

function navigateToNextChapter() {
    const currentBookIndex = bibleBooks.indexOf(bookSelect.value);
    const currentChapterIndex = chapterSelect.selectedIndex;

    if (currentChapterIndex < chapterSelect.options.length - 1) {
        chapterSelect.selectedIndex++;
    } else {
        if (currentBookIndex < bibleBooks.length - 1) {
            bookSelect.value = bibleBooks[currentBookIndex + 1];
            populateChapterSelect(bookSelect.value);
            chapterSelect.selectedIndex = 0;
        } else {
            return;
        }
    }
    displayChapter();
}

function navigateToPreviousChapter() {
    const currentBookIndex = bibleBooks.indexOf(bookSelect.value);
    const currentChapterIndex = chapterSelect.selectedIndex;

    if (currentChapterIndex > 0) {
        chapterSelect.selectedIndex--;
    } else {
        if (currentBookIndex > 0) {
            bookSelect.value = bibleBooks[currentBookIndex - 1];
            populateChapterSelect(bookSelect.value);
            chapterSelect.selectedIndex = chapterSelect.options.length - 1;
        } else {
            return;
        }
    }
    displayChapter();
}

function updateNavButtonsState() {
    const isFirstChapterOfBook = chapterSelect.selectedIndex <= 0;
    const isLastChapterOfBook = chapterSelect.selectedIndex >= chapterSelect.options.length - 1;
    const isFirstBook = bibleBooks.indexOf(bookSelect.value) === 0;
    const isLastBook = bibleBooks.indexOf(bookSelect.value) === bibleBooks.length - 1;
    
    prevChapterButton.disabled = isFirstBook && isFirstChapterOfBook;
    nextChapterButton.disabled = isLastBook && isLastChapterOfBook;
}

function resetChapterAudioButtons() {
    playEnglishButton.textContent = 'Play English Chapter';
    const langName = languageSelect.options[languageSelect.selectedIndex]?.text.split('(')[0].trim() || 'Indian Language';
    playIndianLangButton.textContent = `Play ${langName} Chapter`;
    pauseResumeButton.style.display = 'none';
    stopAudioButton.style.display = 'none';
}

function speakText(text, lang = 'en-US', source = 'verse') {
    stopCurrentAudio(); 

    if (!('speechSynthesis' in window) || !text) {
        console.warn("Speech synthesis not supported or no text to speak.");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = currentPlaybackRate;
    utterance.voice = availableVoices.find(v => v.lang === lang && v.localService) || availableVoices.find(v => v.lang === lang);

    if (!utterance.voice) {
        console.warn(`No specific voice found for ${lang}. Using default.`);
    }

    utterance.onstart = () => {
        currentSpeech = { utterance, isPlaying: true, isPaused: false, source };
        if (source !== 'english_chapter' && source !== 'indian_chapter') {
            resetChapterAudioButtons();
        }
    };
    
    utterance.onend = () => {
        if (currentSpeech.source === 'verse') {
            stopCurrentAudio();
        }
    };

    utterance.onerror = (event) => {
        console.error('SpeechSynthesis Utterance Error:', event.error);
        stopCurrentAudio();
    };
    
    speechSynthesis.speak(utterance);
}

function stopCurrentAudio() {
    if (speechSynthesis) {
        speechSynthesis.cancel();
    }
    currentSpeech = { utterance: null, isPlaying: false, isPaused: false, source: null };
    resetChapterAudioButtons();
}

function togglePauseResume() {
    if (!currentSpeech.utterance) return;

    if (currentSpeech.isPaused) {
        speechSynthesis.resume();
        currentSpeech.isPaused = false;
        pauseResumeButton.textContent = 'Pause';
    } else {
        speechSynthesis.pause();
        currentSpeech.isPaused = true;
        pauseResumeButton.textContent = 'Resume';
    }
}

function handlePlayEnglishChapter() {
    if (currentSpeech.isPlaying && currentSpeech.source === 'english_chapter') {
        stopCurrentAudio();
    } else {
        const verses = netBibleData.filter(v => v.englishBookName === bookSelect.value && v.chapter === parseInt(chapterSelect.value)).sort((a,b) => a.verse - b.verse).map(v => v.text);
        if (verses.length > 0) {
            speakText(verses.join(" "), 'en-US', 'english_chapter');
            playEnglishButton.textContent = 'Stop English Chapter';
            playIndianLangButton.textContent = `Play ${languageSelect.options[languageSelect.selectedIndex]?.text.split('(')[0].trim()} Chapter`;
            pauseResumeButton.style.display = 'inline-block';
            stopAudioButton.style.display = 'inline-block';
        } else {
            console.warn("No English verses found for this chapter.");
        }
    }
}

function handlePlayIndianLangChapter() {
    if (currentSpeech.isPlaying && currentSpeech.source === 'indian_chapter') {
        stopCurrentAudio();
    } else {
        const verses = currentIndianLanguageData.filter(v => v.englishBookName === bookSelect.value && v.chapter === parseInt(chapterSelect.value)).sort((a,b) => a.verse - b.verse).map(v => v.text);
        let langCode = 'en-US';
        if (languageSelect.value === 'irv_hindi') langCode = 'hi-IN';
        else if (languageSelect.value === 'odia_all_books') langCode = 'or-IN';
        else if (languageSelect.value === 'te_irv_updated') langCode = 'te-IN';
        else if (languageSelect.value === 'ta_oitce_updated') langCode = 'ta-IN';
        else if (languageSelect.value === 'kn_irv_updated') langCode = 'kn-IN';

        if (verses.length > 0) {
            speakText(verses.join(" "), langCode, 'indian_chapter');
            playIndianLangButton.textContent = `Stop ${languageSelect.options[languageSelect.selectedIndex]?.text.split('(')[0].trim()} Chapter`;
            playEnglishButton.textContent = 'Play English Chapter';
            pauseResumeButton.style.display = 'inline-block';
            stopAudioButton.style.display = 'inline-block';
        } else {
            console.warn("No Indian language verses found for this chapter or language data not loaded.");
        }
    }
}

function getCurrentIndianLangInfo() {
    const langValue = languageSelect.value;
    switch(langValue) {
        case 'irv_hindi': return { code: 'hi', name: 'Hindi' };
        case 'odia_all_books': return { code: 'or', name: 'Odia' };
        case 'te_irv_updated': return { code: 'te', name: 'Telugu' };
        case 'ta_oitce_updated': return { code: 'ta', name: 'Tamil' };
        case 'kn_irv_updated': return { code: 'kn', name: 'Kannada' };
        default: return { code: null, name: 'Indian Language' };
    }
}

async function handleWordClick(event) {
    const word = event.target.dataset.word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!word) return;

    const modalContent = wordStudyModal.querySelector('.modal-content');
    let top = event.clientY + 15;
    let left = event.clientX + 15;

    const modalMaxWidth = 700;
    const modalMaxHeight = window.innerHeight * 0.8; 

    if (left + modalMaxWidth > window.innerWidth) {
        left = event.clientX - modalMaxWidth - 15;
    }
    if (top + modalMaxHeight > window.innerHeight) {
        top = window.innerHeight - modalMaxHeight - 20;
    }
    if (top < 10) top = 10;
    if (left < 10) left = 10;

    modalContent.style.top = `${top}px`;
    modalContent.style.left = `${left}px`;

    selectedWordHeader.textContent = `Word Details: "${word}"`;
    dictionaryMeaning.innerHTML = `
        <div id="englishMeaningContainer">
            <h4>English Definition</h4>
            <div id="englishMeaningContent"><p>Loading definition...</p></div>
        </div>
        <hr>
        <div id="wikipediaSummaryContainer">
            <h4>Wikipedia Summary</h4>
            <div id="wikipediaSummaryContent"><p>Loading summary...</p></div>
        </div>
        <hr>
        <div id="indianLangMeaningContainer">
            <h4 id="indianLangMeaningHeader">Meaning</h4>
            <div id="indianLangMeaningContent"><p>Loading translation...</p></div>
        </div>
    `;
    occurrencesDiv.innerHTML = `<p>Searching for occurrences...</p>`;
    wordStudyModal.style.display = 'block';

    const { code: langCode, name: langName } = getCurrentIndianLangInfo();
    const indianLangHeader = document.getElementById('indianLangMeaningHeader');
    if (langName && langCode) {
        indianLangHeader.textContent = `${langName} Meaning`;
        document.getElementById('indianLangMeaningContainer').style.display = 'block';
    } else {
        document.getElementById('indianLangMeaningContainer').style.display = 'none';
    }

    const fetchEnglishDef = async () => {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            if (!response.ok) {
                 return `<p>No dictionary definition found for "${word}" (API error ${response.status}).</p>`;
            }
            const data = await response.json();
            if (data.title) {
                return `<p>No dictionary definition found for "${word}".</p>`;
            }
            if (Array.isArray(data) && data.length > 0) {
                let html = '';
                if (data[0].meanings && Array.isArray(data[0].meanings)) {
                    data[0].meanings.slice(0, 2).forEach(meaning => {
                        if (meaning && meaning.partOfSpeech && meaning.definitions && Array.isArray(meaning.definitions)) {
                            html += `<h3>${meaning.partOfSpeech}</h3>`;
                            meaning.definitions.slice(0, 2).forEach(def => {
                                if (def && def.definition) {
                                    html += `<p><strong>Definition:</strong> ${def.definition}</p>`;
                                    if (def.example) html += `<p><em>Usage: ${def.example}</em></p>`;
                                }
                            });
                        }
                    });
                }
                if (html) return html;
            }
            return `<p>No dictionary definition found for "${word}".</p>`;
        } catch (e) {
            console.error("Error fetching English definition:", e);
            return `<p>Error fetching definition. The API may be unavailable.</p>`;
        }
    };

    const fetchWikipediaSummary = async () => {
        try {
            const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`);
            if (!response.ok) {
                return { html: `<p>No Wikipedia summary found for "${word}".</p>` };
            }
            const data = await response.json();
            if (data && data.type === 'standard' && data.extract) {
                const clickableSummary = data.extract.replace(/([a-zA-Z0-9']+)/g, `<span class="word-clickable" data-word="$1">$1</span>`);
                return { html: `<p>${clickableSummary}</p>`, needsListeners: true };
            }
            return { html: `<p>No Wikipedia summary found for "${word}".</p>` };
        } catch (e) {
            console.error("Error fetching Wikipedia summary:", e);
            return { html: `<p>Error fetching summary. The API may be unavailable.</p>` };
        }
    };

    const fetchIndianLangMeaning = async () => {
        if (!langCode) return '';
        const localTranslation = localTranslations[langCode]?.[word];
        if (localTranslation) return `<p>${localTranslation}</p>`;
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|${langCode}`);
            if (!response.ok) {
                 return `<p>Could not find a translation for "${word}" (API error ${response.status}).</p>`;
            }
            const data = await response.json();
            if (data && data.responseData && data.responseData.translatedText) {
                if (data.responseData.translatedText.toLowerCase() !== word.toLowerCase()) {
                    return `<p>${data.responseData.translatedText}</p>`;
                }
            }
            return `<p>Could not find a translation for "${word}".</p>`;
        } catch (e) {
            console.error("Error fetching Indian language translation:", e);
            return `<p>Error fetching translation. The API may be unavailable.</p>`;
        }
    };

    const findOccurrences = () => {
        const occurrences = netBibleData.filter(v => v.text && v.text.toLowerCase().includes(word));
        if (occurrences.length > 0) {
            const occurrencesHtml = occurrences.map(occ => {
                const highlightRegex = new RegExp(`(\\b${word}\\b)`, 'gi');
                const finalHtml = occ.text.split(highlightRegex).map(part =>
                    part.toLowerCase() === word.toLowerCase()
                        ? `<mark><span class="word-clickable" data-word="${part.replace(/'/g, '&apos;')}">${part}</span></mark>`
                        : part.replace(/([a-zA-Z0-9']+)/g, `<span class="word-clickable" data-word="$1">$1</span>`)
                ).join('');
                return `<li><a href="#" class="occurrence-link" data-book="${occ.englishBookName}" data-chapter="${occ.chapter}" data-verse="${occ.verse}">${occ.englishBookName} ${occ.chapter}:${occ.verse}</a>: ${finalHtml}</li>`;
            }).join('');
            return `<h4>Occurrences (${occurrences.length}):</h4><ul>${occurrencesHtml}</ul>`;
        }
        return `<p>No other occurrences found.</p>`;
    };
    
    const [engDefHtml, wikiResult, indianMeaningHtml, occurrencesHtml] = await Promise.all([
        fetchEnglishDef(),
        fetchWikipediaSummary(),
        fetchIndianLangMeaning(),
        Promise.resolve(findOccurrences())
    ]);

    document.getElementById('englishMeaningContent').innerHTML = engDefHtml;
    document.getElementById('indianLangMeaningContent').innerHTML = indianMeaningHtml;
    
    const wikipediaSummaryContent = document.getElementById('wikipediaSummaryContent');
    wikipediaSummaryContent.innerHTML = wikiResult.html;
    
    occurrencesDiv.innerHTML = occurrencesHtml;

    if (wikiResult.needsListeners) {
        wikipediaSummaryContent.querySelectorAll('.word-clickable').forEach(span => span.addEventListener('click', handleWordClick));
    }
    occurrencesDiv.querySelectorAll('.occurrence-link').forEach(link => link.addEventListener('click', handleOccurrenceLinkClick));
    occurrencesDiv.querySelectorAll('.word-clickable').forEach(span => span.addEventListener('click', handleWordClick));
}


function handleOccurrenceLinkClick(e) {
    e.preventDefault();
    const { book, chapter, verse } = e.target.dataset;
    wordStudyModal.style.display = 'none';
    bookSelect.value = book;
    populateChapterSelect(book);
    chapterSelect.value = chapter; 
    displayChapter(verse);
}

function handleSearch(query) {
    const searchTerm = query.trim();
    if (!searchTerm) {
        displayChapter();
        return;
    }

    const referenceMatch = searchTerm.match(/^(.+)\s+(\d+):(\d+)$/);
    if (referenceMatch) {
        const bookName = referenceMatch[1].trim();
        const chapterNum = parseInt(referenceMatch[2]);
        const verseNum = parseInt(referenceMatch[3]);

        const matchedBook = bibleBooks.find(b => b.toLowerCase() === bookName.toLowerCase() || b.toLowerCase().startsWith(bookName.toLowerCase()));

        if (matchedBook) {
            const bookData = netBibleData.filter(v => v.englishBookName === matchedBook && v.chapter === chapterNum);
            if (bookData.length > 0) {
                bookSelect.value = matchedBook;
                populateChapterSelect(matchedBook);
                chapterSelect.value = chapterNum;
                displayChapter(verseNum);
                wordStudyModal.style.display = 'none';
                return;
            }
        }
    }

    const results = netBibleData.filter(v => v.text && v.text.toLowerCase().includes(searchTerm.toLowerCase()));
    
    bibleTextDiv.innerHTML = `<h2 class="chapter-title">Search Results for "${searchTerm}"</h2>`;
    if(results.length > 0) {
        let resultsHtml = '';
        results.slice(0, 100).forEach(v => {
            const termForRegex = searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const highlightRegex = new RegExp(`(${termForRegex})`, 'gi');
            const parts = v.text.split(highlightRegex);
            const finalHtml = parts.map(part => {
                if (part.toLowerCase() === searchTerm.toLowerCase()) {
                     return `<mark><span class="word-clickable" data-word="${part.replace(/'/g, '&apos;')}">${part}</span></mark>`;
                } else {
                    return part.replace(/([a-zA-Z0-9']+)/g, `<span class="word-clickable" data-word="$1">$1</span>`);
                }
            }).join('');
            resultsHtml += `<div class="verse-block"><p><a href="#" class="occurrence-link" data-book="${v.englishBookName}" data-chapter="${v.chapter}" data-verse="${v.verse}">${v.englishBookName} ${v.chapter}:${v.verse}</a>: ${finalHtml}</p></div>`;
        });
        bibleTextDiv.innerHTML += resultsHtml;

        document.querySelectorAll('.occurrence-link').forEach(link => link.addEventListener('click', handleOccurrenceLinkClick));
        document.querySelectorAll('.word-clickable').forEach(span => span.addEventListener('click', handleWordClick));
    } else {
        bibleTextDiv.innerHTML += `<p>No results found.</p>`;
    }
}