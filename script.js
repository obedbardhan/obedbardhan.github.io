document.addEventListener('DOMContentLoaded', initializeApp);

// Data arrays
let netBibleData = []; // For English (assuming 'all_web_bible.json' or similar)
let hindiBibleData = [];
let odiaBibleData = [];
let teluguBibleData = [];
let tamilBibleData = [];
let kannadaBibleData = [];
let currentIndianLanguageData = [];

// Audio state
let currentSpeech = {
    utterance: null,
    isPlaying: false,
    isPaused: false,
    source: null // 'english_chapter', 'indian_chapter', 'english_verse', 'indian_verse'
};

// Global reference for SpeechSynthesis voices
let availableVoices = [];
let preferredVoiceURI = localStorage.getItem('preferredVoiceURI') || null;


const bibleBooks = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
    "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
    "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
    "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
    "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
    "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians",
    "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
    "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
    "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

// DOM Elements
const bookSelect = document.getElementById('bookSelect');
const chapterSelect = document.getElementById('chapterSelect');
const languageSelect = document.getElementById('languageSelect');
const goButton = document.getElementById('goButton');
const playEnglishButton = document.getElementById('playEnglishButton');
const playIndianLangButton = document.getElementById('playIndianLangButton');
const pauseResumeButton = document.getElementById('pauseResumeButton');
const stopAudioButton = document.getElementById('stopAudioButton');
const quickSearchInput = document.getElementById('quickSearchInput');
const searchButton = document.getElementById('searchButton');
const voiceSearchButton = document.getElementById('voiceSearchButton');
const bibleTextDiv = document.getElementById('bibleTextDiv');
const loadingIndicator = document.getElementById('loadingIndicator');

// Word Study Modal Elements
const wordStudyModal = document.getElementById('wordStudyModal');
const closeModalButton = document.getElementById('closeModalButton');
const selectedWordHeader = document.getElementById('selectedWordHeader');
const dictionaryMeaning = document.getElementById('dictionaryMeaning');
const occurrencesDiv = document.getElementById('occurrences');


async function initializeApp() {
    populateBookSelect();
    setupEventListeners();
    if (bibleBooks.length > 0) {
        populateChapterSelect(bibleBooks[0]); // Populate chapters for the first book
    }

    const loadVoices = () => {
    availableVoices = speechSynthesis.getVoices();

    if (availableVoices.length === 0) {
        console.warn("No SpeechSynthesis voices detected yet. Retrying...");
        setTimeout(loadVoices, 200);
        return;
    }

    console.log("SpeechSynthesis voices loaded. Total:", availableVoices.length);
    availableVoices.forEach(voice => console.log(`Voice: ${voice.name} (${voice.lang}) - Default: ${voice.default} URI: ${voice.voiceURI}`));

    if (preferredVoiceURI) {
        const matched = availableVoices.find(v => v.voiceURI === preferredVoiceURI);
        if (matched) {
            console.log(`Using stored preferred voice: ${matched.name}`);
        } else {
            console.warn("Stored preferred voice not found in available voices.");
            preferredVoiceURI = null;
            localStorage.removeItem('preferredVoiceURI');
        }
    }

    // Default fallback setup if not set and no specific logic overrides it later
    if (!preferredVoiceURI) {
        // Try to set a default English male voice if available
        const maleUSEnglishVoices = availableVoices.filter(v => v.lang === 'en-US' && v.name.toLowerCase().includes('male'));
        if (maleUSEnglishVoices.length > 0) {
            preferredVoiceURI = maleUSEnglishVoices[0].voiceURI;
            localStorage.setItem('preferredVoiceURI', preferredVoiceURI);
            console.log(`Default male English voice set and stored: ${maleUSEnglishVoices[0].name}`);
        } else {
            const defaultVoice = availableVoices.find(v => v.default) || availableVoices[0];
            if (defaultVoice) {
                preferredVoiceURI = defaultVoice.voiceURI;
                localStorage.setItem('preferredVoiceURI', preferredVoiceURI);
                console.log(`Default voice set and stored: ${defaultVoice.name}`);
            }
        }
    }
    };


    if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    } else {
        console.warn("Speech Synthesis API not supported by this browser.");
        playEnglishButton.disabled = true;
        playIndianLangButton.disabled = true;
        pauseResumeButton.disabled = true;
        stopAudioButton.disabled = true;
    }

    try {
        console.log("Starting to load all Bible data...");
        await Promise.allSettled([
            fetchAndProcessBibleData('all_web_bible.json', 'english'),
            fetchAndProcessBibleData('irv_hindi.json', 'hindi'),
            fetchAndProcessBibleData('odia_all_books.json', 'odia'),
            fetchAndProcessBibleData('te_irv_updated.json', 'telugu'),
            fetchAndProcessBibleData('ta_oitce_updated.json', 'tamil'),
            fetchAndProcessBibleData('kn_irv_updated.json', 'kannada')
        ]);
        console.log("All Bible data loading attempts completed.");

        logUniqueBookNames(netBibleData, "English");
        logUniqueBookNames(hindiBibleData, "Hindi");
        logUniqueBookNames(odiaBibleData, "Odia");
        logUniqueBookNames(teluguBibleData, "Telugu");
        logUniqueBookNames(tamilBibleData, "Tamil");
        logUniqueBookNames(kannadaBibleData, "Kannada");
        
        setCurrentIndianLanguageData();
        updatePlayIndianLangButtonText();

        if (loadingIndicator) loadingIndicator.style.display = 'none';
        bibleTextDiv.innerHTML = "<p>Select a book, chapter, and language, then click 'Go' to display verses.</p>";

    } catch (error) {
        console.error("Critical error during initial data loading sequence:", error);
        if (loadingIndicator) loadingIndicator.textContent = "Error loading Bible data. Please refresh.";
        bibleTextDiv.innerHTML = "<p style='color:red;'>A critical error occurred while loading Bible data. Please refresh or check console.</p>";
    }
    initializeVoiceSearch();
}

function logUniqueBookNames(dataArray, languageName) {
    if (!dataArray || dataArray.length === 0) {
        console.log(`${languageName} data is empty or not loaded.`);
        return;
    }
    const uniqueNames = [...new Set(dataArray.map(v => v.englishBookName))];
    console.log(`Unique 'englishBookName' values in ${languageName} data:`, uniqueNames.sort());

    const missingInJson = bibleBooks.filter(b => !uniqueNames.includes(b));
    if (missingInJson.length > 0) {
        console.warn(`Book names from 'bibleBooks' array NOT found in ${languageName} data's 'englishBookName' field:`, missingInJson);
    }
    const extraInJson = uniqueNames.filter(b => b && !bibleBooks.includes(b));
     if (extraInJson.length > 0) {
        console.warn(`'englishBookName' values in ${languageName} data NOT found in 'bibleBooks' array (potential mismatches/typos):`, extraInJson);
    }
}


async function fetchAndProcessBibleData(filePath, langKey) {
    try {
        console.log(`Fetching ${langKey} data from ${filePath}...`);
        const response = await fetch(filePath);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP error! status: ${response.status} for ${filePath}. Server response: ${errorText.substring(0, 500)}`);
            throw new Error(`HTTP error ${response.status} for ${filePath}`);
        }
        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error(`Data from ${filePath} is not an array. Received:`, typeof data);
            throw new Error(`Invalid data format from ${filePath}. Expected array.`);
        }
        console.log(`Successfully fetched and parsed JSON from ${filePath}. Found ${data.length} items.`);

        if (data.some(v => !v.englishBookName || !v.chapter || !v.verse || !v.text)) {
            console.warn(`Data from ${filePath} appears to be missing 'englishBookName', 'chapter', 'verse', or 'text' in some entries.`);
        }

        if (langKey === 'english') {
            netBibleData = data;
            console.log(`English data loaded: ${netBibleData.length} verses.`);
        } else if (langKey === 'hindi') {
            hindiBibleData = data;
            console.log(`Hindi data loaded: ${hindiBibleData.length} verses.`);
        } else if (langKey === 'odia') {
            odiaBibleData = data;
            console.log(`Odia data loaded: ${odiaBibleData.length} verses.`);
        } else if (langKey === 'telugu') {
            teluguBibleData = data;
            console.log(`Telugu data loaded: ${teluguBibleData.length} verses.`);
        } else if (langKey === 'tamil') {
            tamilBibleData = data;
            console.log(`Tamil data loaded: ${tamilBibleData.length} verses.`);
        } else if (langKey === 'kannada') {
            kannadaBibleData = data;
            console.log(`Kannada data loaded: ${kannadaBibleData.length} verses.`);
        }
    } catch (error) {
        console.error(`Error loading or processing Bible data from ${filePath} (${langKey}):`, error);
        if (!bibleTextDiv.innerHTML.includes(`Failed to load ${langKey} Bible data`)) {
             bibleTextDiv.innerHTML += `<p style="color:red;">Failed to load ${langKey} Bible data from ${filePath}. Verses for this language may not be available. Check console for details (e.g., file not found, invalid JSON format, 'englishBookName' mismatch).</p>`;
        }
        if (langKey === 'english') netBibleData = [];
        else if (langKey === 'hindi') hindiBibleData = [];
        else if (langKey === 'odia') odiaBibleData = [];
        else if (langKey === 'telugu') teluguBibleData = [];
        else if (langKey === 'tamil') tamilBibleData = [];
        else if (langKey === 'kannada') kannadaBibleData = [];
    }
}

function setCurrentIndianLanguageData() {
    const selectedLanguageValue = languageSelect.value;
    if (selectedLanguageValue === 'irv_hindi') {
        currentIndianLanguageData = hindiBibleData;
    } else if (selectedLanguageValue === 'odia_all_books') {
        currentIndianLanguageData = odiaBibleData;
    } else if (selectedLanguageValue === 'te_irv_updated') {
        currentIndianLanguageData = teluguBibleData;
    } else if (selectedLanguageValue === 'ta_oitce_updated') {
        currentIndianLanguageData = tamilBibleData;
    } else if (selectedLanguageValue === 'kn_irv_updated') {
        currentIndianLanguageData = kannadaBibleData;
    } else {
        currentIndianLanguageData = [];
    }
    console.log(`Switched current Indian language to: ${selectedLanguageValue}. Verses available in source: ${currentIndianLanguageData.length}`);
    if (bookSelect.value && chapterSelect.value && bibleTextDiv.innerHTML !== "" && 
        !bibleTextDiv.textContent.includes("Select a book") && 
        !bibleTextDiv.textContent.includes("Loading")) {
         displayChapter();
    }
}

function populateBookSelect() {
    bibleBooks.forEach(book => {
        const option = document.createElement('option');
        option.value = book;
        option.textContent = book;
        bookSelect.appendChild(option);
    });
}

function populateChapterSelect(bookName) {
    chapterSelect.innerHTML = '';
    let chapters = 0;
    // Prioritize English data for chapter counts, then any loaded Indian language data
    const primarySource = netBibleData.length > 0 ? netBibleData : 
                          (hindiBibleData.length > 0 ? hindiBibleData :
                          (odiaBibleData.length > 0 ? odiaBibleData :
                          (teluguBibleData.length > 0 ? teluguBibleData :
                          (tamilBibleData.length > 0 ? tamilBibleData :
                          (kannadaBibleData.length > 0 ? kannadaBibleData : [])))));


    if (primarySource.length > 0) {
        const bookData = primarySource.filter(v => v.englishBookName === bookName);
        if (bookData.length > 0) {
            chapters = Math.max(0, ...bookData.map(v => v.chapter || 0));
        }
    }
    
    if (chapters === 0) { // Fallback if no data available or book not found in any loaded JSON
        console.warn(`Could not determine chapters for ${bookName} from any loaded data. Using hardcoded fallbacks.`);
        switch (bookName) { // These are common chapter counts, adjust as needed
            case "Genesis": chapters = 50; break;
            case "Exodus": chapters = 40; break;
            case "Leviticus": chapters = 27; break;
            case "Numbers": chapters = 36; break;
            case "Deuteronomy": chapters = 34; break;
            case "Joshua": chapters = 24; break;
            case "Judges": chapters = 21; break;
            case "Ruth": chapters = 4; break;
            case "1 Samuel": chapters = 31; break;
            case "2 Samuel": chapters = 24; break;
            case "1 Kings": chapters = 22; break;
            case "2 Kings": chapters = 25; break;
            case "1 Chronicles": chapters = 29; break;
            case "2 Chronicles": chapters = 36; break;
            case "Ezra": chapters = 10; break;
            case "Nehemiah": chapters = 13; break;
            case "Esther": chapters = 10; break;
            case "Job": chapters = 42; break;
            case "Psalms": chapters = 150; break;
            case "Proverbs": chapters = 31; break;
            case "Ecclesiastes": chapters = 12; break;
            case "Song of Solomon": chapters = 8; break;
            case "Isaiah": chapters = 66; break;
            case "Jeremiah": chapters = 52; break;
            case "Lamentations": chapters = 5; break;
            case "Ezekiel": chapters = 48; break;
            case "Daniel": chapters = 12; break;
            case "Hosea": chapters = 14; break;
            case "Joel": chapters = 3; break;
            case "Amos": chapters = 9; break;
            case "Obadiah": chapters = 1; break;
            case "Jonah": chapters = 4; break;
            case "Micah": chapters = 7; break;
            case "Nahum": chapters = 3; break;
            case "Habakkuk": chapters = 3; break;
            case "Zephaniah": chapters = 3; break;
            case "Haggai": chapters = 2; break;
            case "Zechariah": chapters = 14; break;
            case "Malachi": chapters = 4; break;
            case "Matthew": chapters = 28; break;
            case "Mark": chapters = 16; break;
            case "Luke": chapters = 24; break;
            case "John": chapters = 21; break;
            case "Acts": chapters = 28; break;
            case "Romans": chapters = 16; break;
            case "1 Corinthians": chapters = 16; break;
            case "2 Corinthians": chapters = 13; break;
            case "Galatians": chapters = 6; break;
            case "Ephesians": chapters = 6; break;
            case "Philippians": chapters = 4; break;
            case "Colossians": chapters = 4; break;
            case "1 Thessalonians": chapters = 5; break;
            case "2 Thessalonians": chapters = 3; break;
            case "1 Timothy": chapters = 6; break;
            case "2 Timothy": chapters = 4; break;
            case "Titus": chapters = 3; break;
            case "Philemon": chapters = 1; break;
            case "Hebrews": chapters = 13; break;
            case "James": chapters = 5; break;
            case "1 Peter": chapters = 5; break;
            case "2 Peter": chapters = 3; break;
            case "1 John": chapters = 5; break;
            case "2 John": chapters = 1; break;
            case "3 John": chapters = 1; break;
            case "Jude": chapters = 1; break;
            case "Revelation": chapters = 22; break;
            default: chapters = 25; // A generic fallback
        }
        console.warn(`Using fallback chapter count for ${bookName}: ${chapters}`);
    }


    for (let i = 1; i <= chapters; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        chapterSelect.appendChild(option);
    }
}

function setupEventListeners() {
    bookSelect.addEventListener('change', () => {
        populateChapterSelect(bookSelect.value);
        displayChapter(); // Display chapter automatically on book change after populating chapters
    });
    chapterSelect.addEventListener('change', displayChapter); // Also display on chapter change

    languageSelect.addEventListener('change', () => {
        setCurrentIndianLanguageData();
        updatePlayIndianLangButtonText();
        // If a chapter is already selected, redisplay with the new language
        if (bookSelect.value && chapterSelect.value) {
            displayChapter();
        }
    });
    goButton.addEventListener('click', displayChapter);
    
    playEnglishButton.addEventListener('click', handlePlayEnglishChapter);
    playIndianLangButton.addEventListener('click', handlePlayIndianLangChapter);
    pauseResumeButton.addEventListener('click', togglePauseResumeAudio);
    stopAudioButton.addEventListener('click', stopCurrentAudio);

    // Word Study Modal Event Listeners
    if(closeModalButton) closeModalButton.addEventListener('click', () => wordStudyModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === wordStudyModal) wordStudyModal.style.display = 'none';
    });

    searchButton.addEventListener('click', handleSearch);
    quickSearchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') handleSearch();
    });
}

function updatePlayIndianLangButtonText() {
    const selectedOption = languageSelect.options[languageSelect.selectedIndex];
    if (selectedOption && playIndianLangButton) {
        let langName = 'Indian Language'; // Default
        if (selectedOption.value === 'irv_hindi') langName = 'Hindi';
        else if (selectedOption.value === 'odia_all_books') langName = 'Odia';
        else if (selectedOption.value === 'te_irv_updated') langName = 'Telugu';
        else if (selectedOption.value === 'ta_oitce_updated') langName = 'Tamil';
        else if (selectedOption.value === 'kn_irv_updated') langName = 'Kannada';
        playIndianLangButton.textContent = `Play ${langName} Chapter`;
    }
}

function displayChapter(scrollToVerseNum = null) {
    const selectedBook = bookSelect.value;
    const selectedChapter = parseInt(chapterSelect.value);

    if (!selectedBook || !selectedChapter) {
        bibleTextDiv.innerHTML = "<p>Please select a book and chapter.</p>";
        return;
    }
    console.log(`Displaying: ${selectedBook} Chapter ${selectedChapter}. ScrollTo: ${scrollToVerseNum}`);
    console.log(`English data length: ${netBibleData.length}. Current Indian lang data length: ${currentIndianLanguageData.length}`);

    const englishVerses = netBibleData.filter(
        v => v.englishBookName === selectedBook && v.chapter === selectedChapter
    ).sort((a, b) => a.verse - b.verse);

    const indianLanguageVerses = currentIndianLanguageData.filter(
        v => v.englishBookName === selectedBook && v.chapter === selectedChapter
    ).sort((a, b) => a.verse - b.verse);

    console.log(`Found ${englishVerses.length} English verses for ${selectedBook} ${selectedChapter}.`);
    console.log(`Found ${indianLanguageVerses.length} Indian language verses for ${selectedBook} ${selectedChapter}.`);

    if (englishVerses.length === 0 && indianLanguageVerses.length === 0) {
        let message = `<p>No verses found for ${selectedBook} chapter ${selectedChapter}. `;
        if (netBibleData.length === 0) {
            message += "English Bible data ('all_web_bible.json') was not loaded or is empty. Please check the console for file loading errors.";
        } else if (englishVerses.length === 0 && netBibleData.length > 0) {
             message += "No English verses found for this specific chapter. Ensure 'englishBookName' matches your JSON data and the chapter number is correct.";
        }
        const selectedLangOption = languageSelect.options[languageSelect.selectedIndex].text;
        if (currentIndianLanguageData.length === 0) {
            message += ` The selected Indian language data (${selectedLangOption}) was not loaded or is empty.`;
        } else if (indianLanguageVerses.length === 0 && currentIndianLanguageData.length > 0) {
             message += ` No ${selectedLangOption} verses found for this specific chapter.`
        }
        message += "</p>";
        bibleTextDiv.innerHTML = message;
        return;
    }

    let htmlContent = `<h2 class="chapter-title">${selectedBook} Chapter ${selectedChapter}</h2>`;
    let maxVerseNum = 0;
    if (englishVerses.length > 0) maxVerseNum = Math.max(maxVerseNum, ...englishVerses.map(v => v.verse || 0));
    if (indianLanguageVerses.length > 0) maxVerseNum = Math.max(maxVerseNum, ...indianLanguageVerses.map(v => v.verse || 0));

    if (maxVerseNum === 0 && (englishVerses.length > 0 || indianLanguageVerses.length > 0) ) {
         // This case implies verses exist but verse numbers might be missing or 0.
         // Proceed with caution, or log a warning. For now, we assume valid verse numbers if data exists.
         // If all verse numbers are truly 0 or undefined, the loop below won't run.
         console.warn(`Max verse number is 0, but verses were found for ${selectedBook} ${selectedChapter}. Check verse numbering in JSON.`);
         // If we want to display verses even if maxVerseNum is 0 (e.g. single verse chapters with verse 0 or 1)
         // we might need a different loop structure or rely on the length of verse arrays.
         // For now, the existing logic will show "No valid verse numbers" if maxVerseNum stays 0.
         // If englishVerses or indianLanguageVerses have items, but all have verse:0, then maxVerseNum will be 0.
         // A more robust way would be to iterate over a combined list of unique verse numbers.
    }
    if (maxVerseNum === 0 && englishVerses.length === 0 && indianLanguageVerses.length === 0) {
        // This implies no verses were found at all for the chapter.
         bibleTextDiv.innerHTML = `<p>No valid verse numbers found for ${selectedBook} chapter ${selectedChapter}.</p>`;
         return;
    }


    for (let i = 1; i <= maxVerseNum; i++) {
        const engVerse = englishVerses.find(v => v.verse === i);
        const indVerse = indianLanguageVerses.find(v => v.verse === i);
        const verseId = `verse-${selectedBook.replace(/\s+/g, '_')}-${selectedChapter}-${i}`;

        if (engVerse || indVerse) {
            htmlContent += `<div class="verse-block" id="${verseId}">`;
            htmlContent += `<p class="verse-number">${i}</p>`;

            if (engVerse && engVerse.text) {
                const clickableEnglishText = engVerse.text.split(/(\s+|[.,;!?:()"\[\]{}])/).map(part => {
                    if (part.trim() === '') return part;
                    const cleanWord = part.replace(/[^a-zA-Z0-9-']/g, '').toLowerCase(); 
                    if (cleanWord.length > 0) {
                        return `<span class="word-clickable" data-word="${cleanWord}">${part}</span>`;
                    }
                    return part;
                }).join('');
                htmlContent += `<p class="english-verse">
                                    ${clickableEnglishText}
                                    <button class="play-verse-audio-btn" data-lang="en-US" data-text="${engVerse.text.replace(/"/g, '&quot;')}" title="Play English Verse">🔊</button>
                                </p>`;
            } else if (engVerse && !engVerse.text) {
                console.warn(`English verse ${selectedBook} ${selectedChapter}:${i} found but has no 'text' field.`);
            }

            if (indVerse && indVerse.text) {
                let langDisplayName = 'Lang';
                let speechLangCode = 'en-US'; // Default fallback
                const selectedLangValue = languageSelect.value;

                if (selectedLangValue === 'irv_hindi') {
                    langDisplayName = indVerse.book_name ? indVerse.book_name.split(' ')[0] : 'हिन्दी'; // Assuming book_name might contain Hindi book name
                    speechLangCode = 'hi-IN';
                } else if (selectedLangValue === 'odia_all_books') {
                    langDisplayName = indVerse.book_name ? indVerse.book_name.split(' ')[0] : 'ଓଡିଆ';
                    speechLangCode = 'or-IN';
                } else if (selectedLangValue === 'te_irv_updated') {
                    langDisplayName = indVerse.book_name ? indVerse.book_name.split(' ')[0] : 'తెలుగు';
                    speechLangCode = 'te-IN';
                } else if (selectedLangValue === 'ta_oitce_updated') {
                    langDisplayName = indVerse.book_name ? indVerse.book_name.split(' ')[0] : 'தமிழ்';
                    speechLangCode = 'ta-IN';
                } else if (selectedLangValue === 'kn_irv_updated') {
                    langDisplayName = indVerse.book_name ? indVerse.book_name.split(' ')[0] : 'ಕನ್ನಡ';
                    speechLangCode = 'kn-IN';
                }

                htmlContent += `<p class="indian-lang-verse">
                                    (${langDisplayName}): ${indVerse.text}
                                    <button class="play-verse-audio-btn" data-lang="${speechLangCode}" data-text="${indVerse.text.replace(/"/g, '&quot;')}" title="Play ${langDisplayName} Verse">🔊</button>
                                </p>`;
            } else if (indVerse && !indVerse.text) {
                console.warn(`Indian language verse ${selectedBook} ${selectedChapter}:${i} found but has no 'text' field.`);
            }
            htmlContent += `</div>`;
        }
    }
    bibleTextDiv.innerHTML = htmlContent || "<p>No verses found for this selection.</p>";

    attachWordStudyListeners();
    attachVerseAudioListeners();

    if (scrollToVerseNum) {
        const targetId = `verse-${selectedBook.replace(/\s+/g, '_')}-${selectedChapter}-${scrollToVerseNum}`;
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            setTimeout(() => {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Changed to 'center' for better visibility
                targetElement.classList.add('highlighted-verse');
                setTimeout(() => targetElement.classList.remove('highlighted-verse'), 3000);
            }, 100);
        } else {
            console.warn(`Tried to scroll to verse ${scrollToVerseNum}, but element ID ${targetId} not found.`);
        }
    }
}

function attachWordStudyListeners() {
    document.querySelectorAll('.word-clickable').forEach(span => {
        span.removeEventListener('click', handleWordClick);
        span.addEventListener('click', handleWordClick);
    });
}

async function fetchWordDefinition(word) {
  const dictionaryMeaningEl = document.getElementById('dictionaryMeaning'); 
  if (!dictionaryMeaningEl) {
    console.error("Element with ID 'dictionaryMeaning' not found.");
    return;
  }

  dictionaryMeaningEl.innerHTML = `<p>Searching for "${word}"...</p>`;

  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) {
      if (response.status === 404) {
        dictionaryMeaningEl.innerHTML = `<p>Sorry, the definition for "<strong>${word}</strong>" could not be found.</p>`;
      } else {
        dictionaryMeaningEl.innerHTML = `<p>Sorry, there was an error fetching the definition for "<strong>${word}</strong>". (Status: ${response.status})</p>`;
      }
      return;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const wordData = data[0];
      let htmlContent = `<h2>${wordData.word}</h2>`;

      if (wordData.phonetics && wordData.phonetics.length > 0) {
        const phonetic = wordData.phonetics.find(p => p.text);
        if (phonetic) {
          htmlContent += `<p><em>${phonetic.text}</em></p>`;
        }
      }

      wordData.meanings.forEach(meaning => {
        htmlContent += `<h3>${meaning.partOfSpeech}</h3>`;
        meaning.definitions.forEach((definitionObj, index) => {
          htmlContent += `<p><strong>Definition ${index + 1}:</strong> ${definitionObj.definition}</p>`;
          if (definitionObj.example) {
            htmlContent += `<p><em>Example: ${definitionObj.example}</em></p>`;
          }
        });
      });
      
      dictionaryMeaningEl.innerHTML = htmlContent;
    } else {
      dictionaryMeaningEl.innerHTML = `<p>No definition data found for "<strong>${word}</strong>".</p>`;
    }

  } catch (error) {
    console.error('Error fetching definition:', error);
    dictionaryMeaningEl.innerHTML = `<p>An error occurred while trying to fetch the definition. Please check your internet connection or try again later.</p>`;
  }
}


function handleWordClick(event) {
    const clickedWord = event.target.dataset.word;
    if (!clickedWord) return;

    selectedWordHeader.textContent = `Word Details: "${clickedWord}"`;
    dictionaryMeaning.innerHTML = `<p>Loading definition for "${clickedWord}"...</p>`;
    occurrencesDiv.innerHTML = `<p>Searching for occurrences...</p>`;
    wordStudyModal.style.display = 'block';
    
    fetchWordDefinition(clickedWord);
    
    const occurrences = [];
    netBibleData.forEach(verse => {
        const escapedWord = clickedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
        if (verse.text && regex.test(verse.text)) {
            occurrences.push({
                book: verse.englishBookName,
                chapter: verse.chapter,
                verse: verse.verse,
                text: verse.text.replace(regex, (match) => `<mark>${match}</mark>`)
            });
        }
    });

    if (occurrences.length > 0) {
        let occHtml = `<h4>Occurrences (${occurrences.length}):</h4><ul>`;
        occurrences.forEach(occ => {
            occHtml += `<li><a href="#" class="occurrence-link" data-book="${occ.book}" data-chapter="${occ.chapter}" data-verse="${occ.verse}">${occ.book} ${occ.chapter}:${occ.verse}</a>: ${occ.text}</li>`;
        });
        occHtml += `</ul>`;
        occurrencesDiv.innerHTML = occHtml;

        document.querySelectorAll('#occurrences .occurrence-link').forEach(link => {
            link.removeEventListener('click', handleOccurrenceLinkClick);
            link.addEventListener('click', handleOccurrenceLinkClick);
        });

    } else {
        occurrencesDiv.innerHTML = `<p>No occurrences found in English books.</p>`;
    }
}

function handleOccurrenceLinkClick(e) {
    e.preventDefault();
    const book = e.target.dataset.book;
    const chapter = parseInt(e.target.dataset.chapter);
    const verse = parseInt(e.target.dataset.verse);

    bookSelect.value = book;
    populateChapterSelect(book); 
    chapterSelect.value = chapter;
    wordStudyModal.style.display = 'none';
    displayChapter(verse); 
}


function attachVerseAudioListeners() {
    document.querySelectorAll('.play-verse-audio-btn').forEach(button => {
        button.removeEventListener('click', handlePlayVerseAudio);
        button.addEventListener('click', handlePlayVerseAudio);
    });
}

function handlePlayVerseAudio(event) {
    const button = event.target;
    const text = button.dataset.text;
    const lang = button.dataset.lang; 
    const currentVerseId = button.closest('.verse-block').id; 

    if (currentSpeech.isPlaying) {
        if (currentSpeech.source === 'verse_audio' && currentSpeech.utterance && currentSpeech.utterance.text === text) {
            stopCurrentAudio(); 
            return;
        }
        stopCurrentAudio(); 
    }
    
    button.textContent = '▶️'; // Indicate attempting to play
    button.disabled = true;

    speakText(text, lang, 'verse_audio').then(() => {
        const currentButtonInDOM = document.querySelector(`#${currentVerseId} .play-verse-audio-btn[data-text="${text.replace(/"/g, '&quot;')}"]`);
        if (currentButtonInDOM) {
             currentButtonInDOM.textContent = '🔊';
             currentButtonInDOM.disabled = false;
        }
    }).catch(() => {
        const currentButtonInDOM = document.querySelector(`#${currentVerseId} .play-verse-audio-btn[data-text="${text.replace(/"/g, '&quot;')}"]`);
        if (currentButtonInDOM) {
            currentButtonInDOM.textContent = '🔊';
            currentButtonInDOM.disabled = false;
        }
    });
}


function speakText(text, lang, source) {
    return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            alert("Sorry, your browser does not support text-to-speech.");
            reject("SpeechSynthesis not supported.");
            return;
        }
        if (speechSynthesis.speaking || speechSynthesis.pending) {
            speechSynthesis.cancel();
            console.log("Existing speech cancelled before new utterance.");
            if (currentSpeech.source === 'english_chapter') {
                playEnglishButton.textContent = 'Play English Chapter';
            } else if (currentSpeech.source === 'indian_chapter') {
                updatePlayIndianLangButtonText();
            }
             document.querySelectorAll('.play-verse-audio-btn').forEach(btn => {
                btn.textContent = '🔊';
                btn.disabled = false;
            });
        }

        currentSpeech.utterance = new SpeechSynthesisUtterance(text);
        currentSpeech.utterance.lang = lang;
        currentSpeech.isPlaying = true;
        currentSpeech.isPaused = false;
        currentSpeech.source = source;

        let chosenVoice = null;

        if (lang === 'en-US') {
            const maleUSEnglishVoices = availableVoices.filter(v => v.lang === 'en-US' && v.name.toLowerCase().includes('male'));
            const preferred = availableVoices.find(v => v.voiceURI === preferredVoiceURI);

            if (preferred && preferred.lang === 'en-US' && preferred.name.toLowerCase().includes('male')) {
                chosenVoice = preferred;
                console.log(`Using stored preferred male English voice: ${chosenVoice.name}`);
            } else if (maleUSEnglishVoices.length > 0) {
                chosenVoice = maleUSEnglishVoices[0]; // Pick the first available male voice
                console.log(`Using an available male English voice: ${chosenVoice.name}.`);
                // Update preference to this male voice if current preference wasn't male English
                if(!preferred || preferred.lang !== 'en-US' || !preferred.name.toLowerCase().includes('male')){
                    preferredVoiceURI = chosenVoice.voiceURI;
                    localStorage.setItem('preferredVoiceURI', preferredVoiceURI);
                    console.log(`Preferred voice updated to: ${chosenVoice.name}`);
                }
            } else if (preferred && preferred.lang === 'en-US') { // Fallback to preferred non-male English if no male found
                chosenVoice = preferred;
                console.log(`No male English voice found. Using stored preferred (non-male) English voice: ${chosenVoice.name}`);
            }
        }

        // If not en-US, or if no specific English voice was chosen above, use general logic
        if (!chosenVoice) {
            const preferredForLang = availableVoices.find(v => v.voiceURI === preferredVoiceURI && v.lang === lang);
            if (preferredForLang) {
                chosenVoice = preferredForLang;
                console.log(`Using stored preferred voice for ${lang}: ${chosenVoice.name}`);
            } else {
                const localServiceForLang = availableVoices.find(v => v.lang === lang && v.localService);
                if (localServiceForLang) {
                    chosenVoice = localServiceForLang;
                    console.log(`Using local service voice for ${lang}: ${chosenVoice.name}`);
                    const currentPreferred = availableVoices.find(v => v.voiceURI === preferredVoiceURI);
                    if (!currentPreferred || currentPreferred.lang !== lang) { // Update preference if it was for a different lang or not set
                        preferredVoiceURI = chosenVoice.voiceURI;
                        localStorage.setItem('preferredVoiceURI', preferredVoiceURI);
                        console.log(`Stored this as preferred voice for ${lang}.`);
                    }
                }
            }
        }
        
        if (!chosenVoice) { // Fallback to any voice matching the language
            chosenVoice = availableVoices.find(v => v.lang === lang);
            if (chosenVoice) console.warn(`Using any available voice for ${lang}: ${chosenVoice.name}`);
        }

        if (!chosenVoice) { // Fallback to browser default
            chosenVoice = availableVoices.find(v => v.default);
            if (chosenVoice) {
                console.warn(`No specific voice for ${lang}. Using browser's default voice: ${chosenVoice.name}.`);
                if (lang !== 'en-US' && (!chosenVoice.lang || !chosenVoice.lang.startsWith(lang.substring(0,2)) ) ) {
                     alert(`No native voice found for ${lang}. Audio might be spoken in a different language or not play. Please check your browser's TTS settings and installed voices.`);
                 }
            }
        }
        
        if (chosenVoice) {
            currentSpeech.utterance.voice = chosenVoice;
            console.log(`Attempting to speak with voice: ${chosenVoice.name} (Lang: ${chosenVoice.lang}, URI: ${chosenVoice.voiceURI})`);
        } else {
            console.error(`No voices available at all for lang ${lang}! Cannot speak text.`);
            alert("No text-to-speech voices are available on your system for the selected language. Please check your OS/browser settings.");
            stopCurrentAudioUiReset();
            reject("No voice found");
            return;
        }
        
        console.log(`Attempting to speak for source: ${source}`);
        console.log(`Language: ${lang}`);
        console.log(`Text length: ${text.length}`);
        // console.log(`Text content (first 200 chars): "${text.substring(0, 200)}"`);


        currentSpeech.utterance.onstart = () => {
            console.log(`Speech started for ${source} in ${lang}`);
            currentSpeech.isPlaying = true;
            currentSpeech.isPaused = false;
            if (source === 'english_chapter') {
                playEnglishButton.textContent = 'Playing English...';
                pauseResumeButton.textContent = 'Pause';
                pauseResumeButton.style.display = 'inline-block';
                stopAudioButton.style.display = 'inline-block'; 
            } else if (source === 'indian_chapter') {
                const selectedLangText = languageSelect.options[languageSelect.selectedIndex].text.split('(')[0].trim();
                playIndianLangButton.textContent = `Playing ${selectedLangText}...`;
                pauseResumeButton.style.display = 'none'; // Often not well supported for Indian languages
                stopAudioButton.style.display = 'inline-block';
            } else if (source === 'verse_audio') {
                // Individual verse buttons change their own state
                // Show general stop button for verse audio
                stopAudioButton.style.display = 'inline-block';
            }
        };

        currentSpeech.utterance.onend = () => {
            console.log(`Speech ended for ${source}`);
            currentSpeech.isPlaying = false;
            currentSpeech.isPaused = false;
            currentSpeech.utterance = null;
            
            stopCurrentAudioUiReset(); // Resets all relevant UI
            resolve();
        };

        currentSpeech.utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            alert(`Error in speech: ${event.error}. This might be due to a lack of voice data for the selected language (${lang}) on your system, a very long text, or a browser issue. Check console for details.`);
            stopCurrentAudioUiReset();
            reject(event.error);
        };
        
        speechSynthesis.speak(currentSpeech.utterance);
    });
}

function stopCurrentAudioUiReset() {
    // General UI reset after audio stops or on error
    playEnglishButton.textContent = 'Play English Chapter';
    updatePlayIndianLangButtonText();
    
    pauseResumeButton.textContent = 'Pause';
    pauseResumeButton.style.display = 'none';
    stopAudioButton.style.display = 'none';

    document.querySelectorAll('.play-verse-audio-btn').forEach(btn => {
        if (btn.disabled) { // Only reset if it was in a playing/pending state
            btn.textContent = '🔊';
            btn.disabled = false;
        }
    });
}


function stopCurrentAudio() {
    if (speechSynthesis.speaking || speechSynthesis.pending) {
        speechSynthesis.cancel(); // This will trigger 'onend' or 'onerror' for the current utterance
        console.log("Speech explicitly cancelled by stopCurrentAudio().");
    } else { // If nothing is speaking but we need to reset state (e.g. from error)
        stopCurrentAudioUiReset();
    }
    // Reset internal state immediately
    currentSpeech.isPlaying = false;
    currentSpeech.isPaused = false;
    currentSpeech.utterance = null;
    currentSpeech.source = null;
}


function togglePauseResumeAudio() {
    if (!currentSpeech.utterance || !currentSpeech.isPlaying) return;

    if (!currentSpeech.isPaused) {
        speechSynthesis.pause();
        currentSpeech.isPaused = true;
        pauseResumeButton.textContent = 'Resume';
        console.log("Speech paused.");
    } else {
        speechSynthesis.resume();
        currentSpeech.isPaused = false;
        pauseResumeButton.textContent = 'Pause';
        console.log("Speech resumed.");
    }
}

function handlePlayEnglishChapter() {
    if (currentSpeech.isPlaying && currentSpeech.source === 'english_chapter' && !currentSpeech.isPaused) {
        stopCurrentAudio();
        return;
    }
    // If paused and play is hit again, treat as stop for chapter audio
    if (currentSpeech.isPlaying && currentSpeech.source === 'english_chapter' && currentSpeech.isPaused) {
        stopCurrentAudio();
        return;
    }

    const selectedBook = bookSelect.value;
    const selectedChapter = parseInt(chapterSelect.value);
    if (!selectedBook || !selectedChapter) { alert("Please select a book and chapter."); return; }

    const versesToPlay = netBibleData
        .filter(v => v.englishBookName === selectedBook && v.chapter === selectedChapter && v.text)
        .sort((a, b) => a.verse - b.verse)
        .map(v => v.text);

    if (versesToPlay.length === 0) { 
        alert(`No English text found for ${selectedBook} chapter ${selectedChapter}. Ensure data is loaded.`); 
        return; 
    }
    speakText(versesToPlay.join(" "), 'en-US', 'english_chapter');
}

function handlePlayIndianLangChapter() {
    if (currentSpeech.isPlaying && currentSpeech.source === 'indian_chapter') {
        stopCurrentAudio();
        return;
    }
    const selectedBook = bookSelect.value;
    const selectedChapter = parseInt(chapterSelect.value);
    const langFileValue = languageSelect.value;
    const langName = languageSelect.options[languageSelect.selectedIndex].text.split('(')[0].trim();

    if (!selectedBook || !selectedChapter) { alert("Please select a book and chapter."); return; }

    const versesToPlay = currentIndianLanguageData
        .filter(v => v.englishBookName === selectedBook && v.chapter === selectedChapter && v.text)
        .sort((a, b) => a.verse - b.verse)
        .map(v => v.text);

    if (versesToPlay.length === 0) {
        alert(`No ${langName} text found for ${selectedBook} chapter ${selectedChapter}. Ensure data is loaded.`);
        return;
    }
    
    let speechLangCode = 'en-US'; // Fallback
    if (langFileValue === 'irv_hindi') speechLangCode = 'hi-IN';
    else if (langFileValue === 'odia_all_books') speechLangCode = 'or-IN';
    else if (langFileValue === 'te_irv_updated') speechLangCode = 'te-IN';
    else if (langFileValue === 'ta_oitce_updated') speechLangCode = 'ta-IN';
    else if (langFileValue === 'kn_irv_updated') speechLangCode = 'kn-IN';
    
    const hasSpecificVoice = availableVoices.some(voice => voice.lang === speechLangCode);
    if (!hasSpecificVoice && !speechLangCode.startsWith('en')) { // Avoid alert for en-US fallback if that's what it is
        console.warn(`No voice found for ${speechLangCode} (${langName}). Attempting to speak with a default voice.`);
        alert(`Your browser may not have a native voice for ${langName}. The audio might not play or will be spoken in a generic voice.`);
    }
    speakText(versesToPlay.join(" "), speechLangCode, 'indian_chapter');
}


function handleSearch() {
    const query = quickSearchInput.value.trim();
    if (!query) return;

    bibleTextDiv.innerHTML = `<h3 class="chapter-title">Search Results for "${query}"</h3>`;
    let resultsFound = false;

    // Regex for Bible references like "John 3:16" or "1 John 2:3-5"
    const CCREF_REGEX = /^(\d?\s?[a-zA-Z]+(?:\s[a-zA-Z]+)?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i;
    const match = query.match(CCREF_REGEX);

    if (match) {
        // Sanitize book name: "1 samuel" -> "1 Samuel", "song of solomon" -> "Song of Solomon"
        const bookNameInput = match[1].trim().toLowerCase()
                              .split(' ')
                              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' ');
        const chapter = parseInt(match[2]);
        const verseStart = match[3] ? parseInt(match[3]) : null;
        // verseEnd is match[4] but not used in current displayChapter logic directly for ranges

        const bookTitleCase = bibleBooks.find(b => b.toLowerCase() === bookNameInput.toLowerCase());
        
        if (bookTitleCase) {
            bookSelect.value = bookTitleCase;
            populateChapterSelect(bookTitleCase); // Ensure chapters for this book are loaded
            chapterSelect.value = chapter; // Set the chapter
            
            // Check if chapter is valid
            const chapterOption = Array.from(chapterSelect.options).find(opt => opt.value === String(chapter));
            if (chapterOption) {
                displayChapter(verseStart); // verseStart can be null, handled by displayChapter
                resultsFound = true;
            } else {
                 bibleTextDiv.innerHTML += `<p>Chapter ${chapter} not found for ${bookTitleCase}.</p>`;
            }
        } else {
             bibleTextDiv.innerHTML += `<p>Book "${match[1].trim()}" not recognized.</p>`; // Show original input
        }
    }
    
    if (!resultsFound) { // Proceed to keyword search if not a recognized reference or if reference search failed
        const searchTerm = query.toLowerCase();
        // Search in all loaded data
        const allLoadedData = [
            ...netBibleData.map(v => ({ ...v, sourceLang: 'English', actualData: netBibleData })),
            ...hindiBibleData.map(v => ({ ...v, sourceLang: 'हिन्दी', actualData: hindiBibleData })),
            ...odiaBibleData.map(v => ({ ...v, sourceLang: 'ଓଡିଆ', actualData: odiaBibleData })),
            ...teluguBibleData.map(v => ({ ...v, sourceLang: 'తెలుగు', actualData: teluguBibleData })),
            ...tamilBibleData.map(v => ({ ...v, sourceLang: 'தமிழ்', actualData: tamilBibleData })),
            ...kannadaBibleData.map(v => ({ ...v, sourceLang: 'ಕನ್ನಡ', actualData: kannadaBibleData }))
        ];
        
        let searchResultsHTML = "";
        const foundVerses = [];
        const uniqueVerseKeys = new Set(); // To avoid duplicate verses from different language files if they have same content

        allLoadedData.forEach(v => {
            if (v.text && v.text.toLowerCase().includes(searchTerm)) {
                const verseKey = `${v.englishBookName}-${v.chapter}-${v.verse}-${v.sourceLang}`; // Unique key per language version
                if (!uniqueVerseKeys.has(verseKey)) {
                    foundVerses.push(v);
                    uniqueVerseKeys.add(verseKey);
                }
            }
        });
        
        const limitedResults = foundVerses.slice(0, 100); // Limit results

        if (limitedResults.length > 0) {
            searchResultsHTML += `<p>${limitedResults.length} (of ${foundVerses.length}) verses found containing "${query}":</p>`;
            limitedResults.forEach(v => {
                searchResultsHTML += `<div class="verse-block">
                    <p><small><a href="#" class="occurrence-link" data-book="${v.englishBookName}" data-chapter="${v.chapter}" data-verse="${v.verse}" data-lang-source="${v.sourceLang === 'English' ? 'all_web_bible' : languageSelect.options[Array.from(languageSelect.options).findIndex(opt => opt.text.toLowerCase().includes(v.sourceLang.toLowerCase()))]?.value || ''}">${v.englishBookName} ${v.chapter}:${v.verse}</a> (${v.sourceLang})</small></p>
                    <p>${v.text.replace(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (matchText) => `<mark>${matchText}</mark>`)}</p>
                </div>`;
            });
            bibleTextDiv.innerHTML += searchResultsHTML;

            // Add listeners for occurrence links from search results
            document.querySelectorAll('#bibleTextDiv .occurrence-link').forEach(link => {
                link.removeEventListener('click', handleSearchResultLinkClick); // Prevent duplicates
                link.addEventListener('click', handleSearchResultLinkClick);
            });
            resultsFound = true;
        }
    }

    if (!resultsFound) { // If still no results after both reference and keyword search
        bibleTextDiv.innerHTML += "<p>No results found for your query.</p>";
    }
}

function handleSearchResultLinkClick(e) {
    e.preventDefault();
    const book = e.target.dataset.book;
    const chapter = parseInt(e.target.dataset.chapter);
    const verse = parseInt(e.target.dataset.verse);
    const langSourceHint = e.target.dataset.langSource; // e.g., "English", "हिन्दी", etc.

    // Attempt to switch language if the result is from a non-active Indian language
    if (langSourceHint && langSourceHint !== 'all_web_bible') {
        const targetLangOption = Array.from(languageSelect.options).find(opt => {
            // This is a bit heuristic; ideally, store the value like 'irv_hindi' in data-lang-source
            if (langSourceHint.toLowerCase().includes('hindi') && opt.value === 'irv_hindi') return true;
            if (langSourceHint.toLowerCase().includes('odia') && opt.value === 'odia_all_books') return true;
            if (langSourceHint.toLowerCase().includes('telugu') && opt.value === 'te_irv_updated') return true;
            if (langSourceHint.toLowerCase().includes('tamil') && opt.value === 'ta_oitce_updated') return true;
            if (langSourceHint.toLowerCase().includes('kannada') && opt.value === 'kn_irv_updated') return true;
            return false;
        });
        if (targetLangOption && languageSelect.value !== targetLangOption.value) {
            languageSelect.value = targetLangOption.value;
            setCurrentIndianLanguageData(); // This will also trigger displayChapter if conditions met
            updatePlayIndianLangButtonText();
        }
    }


    bookSelect.value = book;
    populateChapterSelect(book); 
    chapterSelect.value = chapter;
    // displayChapter will be called by setCurrentIndianLanguageData or by direct chapter/book change listeners
    // but to be sure, and to ensure scrolling:
    displayChapter(verse); 
}


function initializeVoiceSearch() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        voiceSearchButton.style.display = 'none';
        console.warn('Speech Recognition API not supported.');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US'; 
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceSearchButton.addEventListener('click', () => {
        try {
            recognition.start();
            voiceSearchButton.textContent = '🎙️'; // Listening icon
            voiceSearchButton.disabled = true;
        } catch(e) {
            console.warn("Speech recognition start error:", e.message);
             // If it's already started and stop wasn't called, this can happen.
            if (e.name === 'InvalidStateError' && recognition) {
                 try { recognition.stop(); } catch(stopErr) { console.warn("Error stopping recog:", stopErr); }
            }
            voiceSearchButton.textContent = '🎤';
            voiceSearchButton.disabled = false;
        }
    });

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        quickSearchInput.value = speechResult;
        handleSearch(); // Automatically trigger search
    };

    recognition.onspeechend = () => {
        try { recognition.stop(); } catch(e) { console.warn("Error in onspeechend stop:", e); }
    }
    

    recognition.onend = () => {
        voiceSearchButton.textContent = '🎤';
        voiceSearchButton.disabled = false;
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error, event.message);
        let errorMessage = `Speech error: ${event.error}.`;
        if (event.error === 'no-speech') errorMessage = "No speech detected. Please try again.";
        else if (event.error === 'audio-capture') errorMessage = "Microphone problem. Please check your microphone.";
        else if (event.error === 'not-allowed') errorMessage = "Mic access denied. Please allow microphone access.";
        else if (event.error === 'aborted') errorMessage = "Speech input aborted.";
        // Display error temporarily
        const tempMsg = document.createElement('p');
        tempMsg.textContent = errorMessage;
        tempMsg.style.color = "red";
        tempMsg.style.textAlign = "center";
        tempMsg.style.padding = "5px";
        // Insert message before the bibleTextDiv or in a dedicated status area
        const mainArea = document.querySelector('main');
        if(mainArea) mainArea.insertBefore(tempMsg, mainArea.firstChild);
        else bibleTextDiv.insertBefore(tempMsg, bibleTextDiv.firstChild);
        
        setTimeout(() => tempMsg.remove(), 7000); // Remove message after 7 seconds

        voiceSearchButton.textContent = '🎤'; // Reset button
        voiceSearchButton.disabled = false;
    };
}