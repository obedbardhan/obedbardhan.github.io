document.addEventListener('DOMContentLoaded', initializeApp);

// Data arrays and App State
let netBibleData = [], hindiBibleData = [], odiaBibleData = [], teluguBibleData = [], tamilBibleData = [], kannadaBibleData = [], currentIndianLanguageData = [];
let availableVoices = [];
let currentSpeech = { utterance: null, isPlaying: false, isPaused: false, source: null };
let currentPlaybackRate = parseFloat(localStorage.getItem('playbackRate')) || 1.0;

// [NEW] Local dictionary for overriding incorrect translations from the API
const localTranslations = {
    'or': { // Odia
        'entice': 'ପ୍ରଲୋଭିତ କରିବା'
    }
    // Other languages and words can be added here
};

const bibleBooks = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];

// DOM Elements
const bookSelect = document.getElementById('bookSelect'), chapterSelect = document.getElementById('chapterSelect'), languageSelect = document.getElementById('languageSelect'), goButton = document.getElementById('goButton'), prevChapterButton = document.getElementById('prevChapterButton'), nextChapterButton = document.getElementById('nextChapterButton'), playEnglishButton = document.getElementById('playEnglishButton'), playIndianLangButton = document.getElementById('playIndianLangButton'), pauseResumeButton = document.getElementById('pauseResumeButton'), stopAudioButton = document.getElementById('stopAudioButton'), playbackRateSlider = document.getElementById('playbackRateSlider'), playbackRateValue = document.getElementById('playbackRateValue'), bibleTextDiv = document.getElementById('bibleTextDiv'), loadingIndicator = document.getElementById('loadingIndicator'), wordStudyModal = document.getElementById('wordStudyModal'), closeModalButton = document.getElementById('closeModalButton'), selectedWordHeader = document.getElementById('selectedWordHeader'), dictionaryMeaning = document.getElementById('dictionaryMeaning'), occurrencesDiv = document.getElementById('occurrences'), quickSearchInput = document.getElementById('quickSearchInput'), searchButton = document.getElementById('searchButton');

async function initializeApp() {
    setupEventListeners();
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
        // Initialize playback rate display
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
    pauseResumeButton.addEventListener('click', togglePauseResume); // Added event listener for pause/resume
    stopAudioButton.addEventListener('click', stopCurrentAudio);
    playbackRateSlider.addEventListener('input', e => {
        currentPlaybackRate = parseFloat(e.target.value);
        playbackRateValue.textContent = `${currentPlaybackRate.toFixed(1)}x`;
        localStorage.setItem('playbackRate', currentPlaybackRate);
        if (currentSpeech.utterance && currentSpeech.isPlaying) {
            // If playing, re-set the rate (may require re-speaking or just updates next utterance)
            // Note: Changing rate mid-speech is not natively supported by all browsers for SpeechSynthesis
            // For active speech, you'd typically need to stop and restart with new rate.
            // For this app, it will apply to the NEXT verse/chapter spoken.
            currentSpeech.utterance.rate = currentPlaybackRate;
        }
    });
    closeModalButton.addEventListener('click', () => wordStudyModal.style.display = 'none');
    searchButton.addEventListener('click', () => handleSearch(quickSearchInput.value));
    quickSearchInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearch(quickSearchInput.value); });

    // Ensure initial state of audio control buttons
    resetChapterAudioButtons();
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
    // Ensure chapters are unique and sorted
    const chapters = [...new Set(bookData.map(v => v.chapter))].sort((a,b) => a - b);

    if (chapters.length > 0) {
        chapters.forEach(chap => chapterSelect.add(new Option(chap, chap)));
    } else {
        chapterSelect.add(new Option('No Chapters', '')); // Fallback if no chapters found
    }
}

function displayChapter(scrollToVerseNum = null) {
    stopCurrentAudio(); // Stop any ongoing audio when chapter changes
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
    
    // Find the maximum verse number present in either language for correct iteration
    const allVerses = [...englishVerses.map(v => v.verse), ...indianLanguageVerses.map(v => v.verse)];
    const maxVerseNum = allVerses.length > 0 ? Math.max(...allVerses) : 0;

    if (maxVerseNum === 0) {
        bibleTextDiv.innerHTML += `<p>No verses found for this chapter in the selected languages.</p>`;
        return;
    }

    for (let i = 1; i <= maxVerseNum; i++) {
        const engVerse = englishVerses.find(v => v.verse === i);
        const indVerse = indianLanguageVerses.find(v => v.verse === i);
        
        if (engVerse || indVerse) { // Only create a block if at least one language has the verse
            const verseBlock = document.createElement('div');
            verseBlock.className = 'verse-block';
            verseBlock.id = `verse-${i}`;
            verseBlock.innerHTML = `<p class="verse-number">${i}</p>`;
            
            if (engVerse?.text) {
                // Sanitize text for data-text attribute to prevent issues with quotes
                const cleanEngText = engVerse.text.replace(/"/g, '&quot;');
                verseBlock.innerHTML += `<p class="english-verse">${engVerse.text.replace(/([a-zA-Z0-9']+)/g, `<span class="word-clickable" data-word="$1">$1</span>`)} <button class="play-verse-audio-btn" data-lang="en-US" data-text="${cleanEngText}">🔊</button></p>`;
            }
            if (indVerse?.text) {
                let langInfo = {};
                // Determine the correct language code for SpeechSynthesis
                switch(languageSelect.value) {
                    case 'irv_hindi': langInfo = {name: 'हिन्दी', code: 'hi-IN'}; break;
                    case 'odia_all_books': langInfo = {name: 'ଓଡିଆ', code: 'or-IN'}; break; // Assuming or-IN for Odia
                    case 'te_irv_updated': langInfo = {name: 'తెలుగు', code: 'te-IN'}; break;
                    case 'ta_oitce_updated': langInfo = {name: 'தமிழ்', code: 'ta-IN'}; break;
                    case 'kn_irv_updated': langInfo = {name: 'ಕನ್ನಡ', code: 'kn-IN'}; break;
                    default: langInfo = {name: 'Indian Language', code: 'en-US'}; // Fallback
                }
                const cleanIndText = indVerse.text.replace(/"/g, '&quot;');
                verseBlock.innerHTML += `<p class="indian-lang-verse">(${langInfo.name}): ${indVerse.text} <button class="play-verse-audio-btn" data-lang="${langInfo.code}" data-text="${cleanIndText}">🔊</button></p>`;
            }
            bibleTextDiv.appendChild(verseBlock);
        }
    }
    document.querySelectorAll('.word-clickable').forEach(span => span.addEventListener('click', handleWordClick));
    document.querySelectorAll('.play-verse-audio-btn').forEach(btn => btn.addEventListener('click', e => speakText(e.target.dataset.text, e.target.dataset.lang, 'verse')));
    
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
            chapterSelect.selectedIndex = 0; // First chapter of the new book
        } else {
            // Already on the last chapter of the last book
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
            chapterSelect.selectedIndex = chapterSelect.options.length - 1; // Last chapter of the previous book
        } else {
            // Already on the first chapter of the first book
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
    // Stop any existing speech first
    stopCurrentAudio(); 

    if (!('speechSynthesis' in window) || !text) {
        console.warn("Speech synthesis not supported or no text to speak.");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = currentPlaybackRate;
    
    // Attempt to find a local service voice first, then any voice for the language.
    utterance.voice = availableVoices.find(v => v.lang === lang && v.localService) || availableVoices.find(v => v.lang === lang);

    // If no specific voice found, it will use the default for the language.
    if (!utterance.voice) {
        console.warn(`No specific voice found for ${lang}. Using default.`);
    }

    utterance.onstart = () => {
        currentSpeech = { utterance, isPlaying: true, isPaused: false, source };
        if (source === 'english_chapter') {
            playEnglishButton.textContent = 'Stop English Chapter';
            playIndianLangButton.textContent = `Play ${languageSelect.options[languageSelect.selectedIndex]?.text.split('(')[0].trim()} Chapter`; // Reset other button
        } else if (source === 'indian_chapter') {
            playIndianLangButton.textContent = `Stop ${languageSelect.options[languageSelect.selectedIndex]?.text.split('(')[0].trim()} Chapter`;
            playEnglishButton.textContent = 'Play English Chapter'; // Reset other button
        } else if (source === 'verse') {
            // If playing a single verse, reset chapter play buttons
            resetChapterAudioButtons();
        }
        pauseResumeButton.textContent = 'Pause';
        pauseResumeButton.style.display = 'inline-block';
        stopAudioButton.style.display = 'inline-block';
    };
    
    utterance.onend = () => {
        stopCurrentAudio(); // This will reset everything to default 'Play' state
    };
    
    utterance.onerror = (event) => {
        console.error('SpeechSynthesis Utterance Error:', event.error);
        stopCurrentAudio(); // Reset on error too
    };
    
    speechSynthesis.speak(utterance);
}

function stopCurrentAudio() {
    if (speechSynthesis) {
        speechSynthesis.cancel();
    }
    currentSpeech = { utterance: null, isPlaying: false, isPaused: false, source: null };
    resetChapterAudioButtons(); // Ensures buttons revert to "Play" state
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
    // If English chapter is currently playing, stop it.
    if (currentSpeech.isPlaying && currentSpeech.source === 'english_chapter') {
        stopCurrentAudio();
    } else {
        // Otherwise, start playing English chapter.
        const verses = netBibleData.filter(v => v.englishBookName === bookSelect.value && v.chapter === parseInt(chapterSelect.value)).sort((a,b) => a.verse - b.verse).map(v => v.text);
        if (verses.length > 0) {
            speakText(verses.join(" "), 'en-US', 'english_chapter');
        } else {
            console.warn("No English verses found for this chapter.");
        }
    }
}

function handlePlayIndianLangChapter() {
    // If Indian language chapter is currently playing, stop it.
    if (currentSpeech.isPlaying && currentSpeech.source === 'indian_chapter') {
        stopCurrentAudio();
    } else {
        // Otherwise, start playing Indian language chapter.
        const verses = currentIndianLanguageData.filter(v => v.englishBookName === bookSelect.value && v.chapter === parseInt(chapterSelect.value)).sort((a,b) => a.verse - b.verse).map(v => v.text);
        let langCode = languageSelect.options[languageSelect.selectedIndex]?.dataset.code || 'en-US'; // Use data-code if set, otherwise default
        // If data-code is not reliably set in HTML, derive it here based on value
        if (languageSelect.value === 'irv_hindi') langCode = 'hi-IN';
        else if (languageSelect.value === 'odia_all_books') langCode = 'or-IN';
        else if (languageSelect.value === 'te_irv_updated') langCode = 'te-IN';
        else if (languageSelect.value === 'ta_oitce_updated') langCode = 'ta-IN';
        else if (languageSelect.value === 'kn_irv_updated') langCode = 'kn-IN';


        if (verses.length > 0) {
            speakText(verses.join(" "), langCode, 'indian_chapter');
        } else {
            console.warn("No Indian language verses found for this chapter or language data not loaded.");
        }
    }
}

/**
 * [NEW FUNCTION] Gets the language code and name for the currently selected Indian language.
 * @returns {object} An object containing the language code {code} and name {name}.
 */
function getCurrentIndianLangInfo() {
    const langValue = languageSelect.value;
    switch(langValue) {
        case 'irv_hindi': return { code: 'hi', name: 'Hindi' };
        case 'odia_all_books': return { code: 'or', name: 'Odia' };
        case 'te_irv_updated': return { code: 'te', name: 'Telugu' };
        case 'ta_oitce_updated': return { code: 'ta', name: 'Tamil' };
        case 'kn_irv_updated': return { code: 'kn', 'name': 'Kannada' };
        default: return { code: null, name: 'Indian Language' };
    }
}

/**
 * [MODIFIED FUNCTION] Handles clicking on a word to show definitions, translations, and occurrences.
 * It now checks a local dictionary before calling the external translation API.
 * @param {Event} event The click event.
 */
async function handleWordClick(event) {
    const word = event.target.dataset.word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (!word) return;

    selectedWordHeader.textContent = `Word Details: "${word}"`;
    // Set up the new structure for displaying meanings
    dictionaryMeaning.innerHTML = `
        <div id="englishMeaningContainer">
            <h4>English Definition</h4>
            <div id="englishMeaningContent"><p>Loading definition...</p></div>
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
    
    // Update the Indian language header and visibility
    const indianLangHeader = document.getElementById('indianLangMeaningHeader');
    if (langName && langCode) {
        indianLangHeader.textContent = `${langName} Meaning`;
        document.getElementById('indianLangMeaningContainer').style.display = 'block';
    } else {
        document.getElementById('indianLangMeaningContainer').style.display = 'none';
    }

    // --- Task 1: Fetch English Definition (from dictionaryapi.dev) ---
    const fetchEnglishDef = async () => {
        const englishMeaningContent = document.getElementById('englishMeaningContent');
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            const data = await response.json();
            if (response.ok && data.length > 0 && !data.title) {
                let html = '';
                data[0].meanings.slice(0, 2).forEach(meaning => {
                    html += `<h3>${meaning.partOfSpeech}</h3>`;
                    meaning.definitions.slice(0, 2).forEach(def => {
                        html += `<p><strong>Definition:</strong> ${def.definition}</p>`;
                        if (def.example) html += `<p><em>Usage: ${def.example}</em></p>`;
                    });
                });
                englishMeaningContent.innerHTML = html;
            } else {
                englishMeaningContent.innerHTML = `<p>No definition found for "${word}".</p>`;
            }
        } catch (e) {
            console.error("Error fetching dictionary meaning:", e);
            englishMeaningContent.innerHTML = `<p>Error fetching definition.</p>`;
        }
    };

    // --- Task 2: Fetch Indian Language Meaning (from local dictionary or MyMemory API) ---
    const fetchIndianLangMeaning = async () => {
        if (!langCode) return; // Don't fetch if no valid language is selected
        const indianMeaningContent = document.getElementById('indianLangMeaningContent');

        // [MODIFICATION] First, check our local dictionary for a translation.
        const localTranslation = localTranslations[langCode]?.[word];
        if (localTranslation) {
            indianMeaningContent.innerHTML = `<p>${localTranslation}</p>`;
            return; // Exit the function since we found a local translation.
        }

        // If not in the local dictionary, call the external API.
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|${langCode}`);
            if (!response.ok) throw new Error(`API responded with status ${response.status}`);
            const data = await response.json();
            if (data.responseData && data.responseStatus === 200) {
                indianMeaningContent.innerHTML = `<p>${data.responseData.translatedText}</p>`;
            } else {
                indianMeaningContent.innerHTML = `<p>Could not find a translation for "${word}".</p>`;
            }
        } catch (e) {
            console.error("Error fetching translation:", e);
            indianMeaningContent.innerHTML = `<p>Error fetching translation.</p>`;
        }
    };

    // --- Task 3: Find and display occurrences ---
    const findOccurrences = () => {
        const occurrences = netBibleData.filter(v => v.text && v.text.toLowerCase().includes(word));
        if (occurrences.length > 0) {
            const occurrencesHtml = occurrences.map(occ => {
                const wordToHighlight = word;
                const highlightRegex = new RegExp(`(\\b${wordToHighlight}\\b)`, 'gi');
                const parts = occ.text.split(highlightRegex);

                const finalHtml = parts.map(part => {
                    if (part.toLowerCase() === wordToHighlight.toLowerCase()) {
                        return `<mark><span class="word-clickable" data-word="${part.replace(/'/g, '&apos;')}">${part}</span></mark>`;
                    } else {
                        return part.replace(/([a-zA-Z0-9']+)/g, `<span class="word-clickable" data-word="$1">$1</span>`);
                    }
                }).join('');

                return `<li><a href="#" class="occurrence-link" data-book="${occ.englishBookName}" data-chapter="${occ.chapter}" data-verse="${occ.verse}">${occ.englishBookName} ${occ.chapter}:${occ.verse}</a>: ${finalHtml}</li>`;
            }).join('');
            
            occurrencesDiv.innerHTML = `<h4>Occurrences (${occurrences.length}):</h4><ul>${occurrencesHtml}</ul>`;
            
            // Re-attach event listeners for newly created elements within the modal
            occurrencesDiv.querySelectorAll('.occurrence-link').forEach(link => link.addEventListener('click', handleOccurrenceLinkClick));
            occurrencesDiv.querySelectorAll('.word-clickable').forEach(span => span.addEventListener('click', handleWordClick));

        } else {
            occurrencesDiv.innerHTML = `<p>No other occurrences found.</p>`;
        }
    };

    // Run all tasks concurrently for better performance
    Promise.allSettled([
        fetchEnglishDef(),
        fetchIndianLangMeaning(),
        Promise.resolve().then(findOccurrences) 
    ]);
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
        displayChapter(); // Go back to current chapter view if search is empty
        return;
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

        // Attach event listeners to the newly created links and clickable words
        document.querySelectorAll('.occurrence-link').forEach(link => link.addEventListener('click', handleOccurrenceLinkClick));
        document.querySelectorAll('.word-clickable').forEach(span => span.addEventListener('click', handleWordClick));
    } else {
        bibleTextDiv.innerHTML += `<p>No results found.</p>`;
    }
}