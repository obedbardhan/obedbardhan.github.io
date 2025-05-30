document.addEventListener('DOMContentLoaded', initializeApp);

// Data arrays
let netBibleData = []; // For English (assuming 'all_web_bible.json' or similar)
let hindiBibleData = [];
let odiaBibleData = [];
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
        } else {
            console.log("SpeechSynthesis voices loaded. Total:", availableVoices.length);
            availableVoices.forEach(voice => console.log(`Voice: ${voice.name} (${voice.lang}) - Default: ${voice.default}`));
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
            fetchAndProcessBibleData('odia_all_books.json', 'odia')
        ]);
        console.log("All Bible data loading attempts completed.");

        logUniqueBookNames(netBibleData, "English");
        logUniqueBookNames(hindiBibleData, "Hindi");
        logUniqueBookNames(odiaBibleData, "Odia");
        
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
        }
    } catch (error) {
        console.error(`Error loading or processing Bible data from ${filePath} (${langKey}):`, error);
        if (!bibleTextDiv.innerHTML.includes(`Failed to load ${langKey} Bible data`)) {
             bibleTextDiv.innerHTML += `<p style="color:red;">Failed to load ${langKey} Bible data from ${filePath}. Verses for this language may not be available. Check console for details (e.g., file not found, invalid JSON format, 'englishBookName' mismatch).</p>`;
        }
        if (langKey === 'english') netBibleData = [];
        else if (langKey === 'hindi') hindiBibleData = [];
        else if (langKey === 'odia') odiaBibleData = [];
    }
}

function setCurrentIndianLanguageData() {
    const selectedLanguageValue = languageSelect.value;
    if (selectedLanguageValue === 'irv_hindi') {
        currentIndianLanguageData = hindiBibleData;
    } else if (selectedLanguageValue === 'odia_all_books') {
        currentIndianLanguageData = odiaBibleData;
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
    const sourceDataForChapters = netBibleData.length > 0 ? netBibleData : 
                                  (currentIndianLanguageData.length > 0 ? currentIndianLanguageData : 
                                   (hindiBibleData.length > 0 ? hindiBibleData : odiaBibleData));

    if (sourceDataForChapters.length > 0) {
        const bookData = sourceDataForChapters.filter(v => v.englishBookName === bookName);
        if (bookData.length > 0) {
            chapters = Math.max(0, ...bookData.map(v => v.chapter || 0));
        }
    }
    
    if (chapters === 0) {
        switch (bookName) {
            case "Psalms": chapters = 150; break;
            case "Genesis": chapters = 50; break;
            case "Matthew": chapters = 28; break;
            case "Revelation": chapters = 22; break;
            default: chapters = 25;
        }
        console.warn(`Could not determine chapters for ${bookName} from loaded data, using fallback: ${chapters}`);
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
        displayChapter();
    });
    languageSelect.addEventListener('change', () => {
        setCurrentIndianLanguageData();
        updatePlayIndianLangButtonText();
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
        const langName = selectedOption.text.includes('Hindi') ? 'Hindi' : (selectedOption.text.includes('Odia') ? 'Odia' : 'Indian Language');
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
        if (currentIndianLanguageData.length === 0) {
            message += ` The selected Indian language data (${languageSelect.value}.json) was not loaded or is empty.`;
        } else if (indianLanguageVerses.length === 0 && currentIndianLanguageData.length > 0) {
             message += ` No ${languageSelect.options[languageSelect.selectedIndex].text} verses found for this specific chapter.`
        }
        message += "</p>";
        bibleTextDiv.innerHTML = message;
        return;
    }

    let htmlContent = `<h2 class="chapter-title">${selectedBook} Chapter ${selectedChapter}</h2>`;
    let maxVerseNum = 0;
    if (englishVerses.length > 0) maxVerseNum = Math.max(maxVerseNum, ...englishVerses.map(v => v.verse || 0));
    if (indianLanguageVerses.length > 0) maxVerseNum = Math.max(maxVerseNum, ...indianLanguageVerses.map(v => v.verse || 0));

    if (maxVerseNum === 0) {
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

            // English Verse and Play Button
            if (engVerse && engVerse.text) {
                // Wrap words for word study
                const clickableEnglishText = engVerse.text.split(/(\s+|[.,;!?:()"\[\]{}])/).map(part => {
                    if (part.trim() === '') return part; // Keep spaces and non-word characters as is

                    // Clean the word for the data-word attribute (no punctuation, lowercase)
                    const cleanWord = part.replace(/[^a-zA-Z0-9-']/g, '').toLowerCase(); 
                    if (cleanWord.length > 0) {
                        return `<span class="word-clickable" data-word="${cleanWord}">${part}</span>`;
                    }
                    return part; // Return punctuation or empty string as is
                }).join('');


                htmlContent += `<p class="english-verse">
                                    ${clickableEnglishText}
                                    <button class="play-verse-audio-btn" data-lang="en-US" data-text="${engVerse.text}" title="Play English Verse">🔊</button>
                                </p>`;
            } else if (engVerse && !engVerse.text) {
                console.warn(`English verse ${selectedBook} ${selectedChapter}:${i} found but has no 'text' field.`);
            }

            // Indian Language Verse and Play Button
            if (indVerse && indVerse.text) {
                const langDisplayName = indVerse.book_name ? indVerse.book_name.split(' ')[0] : (languageSelect.value === 'irv_hindi' ? 'हिन्दी' : 'ଓଡିଆ');
                let speechLangCode = 'en-US'; // Default fallback
                if (languageSelect.value === 'irv_hindi') speechLangCode = 'hi-IN';
                else if (languageSelect.value === 'odia_all_books') speechLangCode = 'or-IN';

                htmlContent += `<p class="indian-lang-verse">
                                    (${langDisplayName}): ${indVerse.text}
                                    <button class="play-verse-audio-btn" data-lang="${speechLangCode}" data-text="${indVerse.text}" title="Play ${langDisplayName} Verse">🔊</button>
                                </p>`;
            } else if (indVerse && !indVerse.text) {
                console.warn(`Indian language verse ${selectedBook} ${selectedChapter}:${i} found but has no 'text' field.`);
            }
            htmlContent += `</div>`;
        }
    }
    bibleTextDiv.innerHTML = htmlContent || "<p>No verses found for this selection.</p>";

    // Attach event listeners for word study and per-verse audio AFTER content is loaded
    attachWordStudyListeners();
    attachVerseAudioListeners();

    if (scrollToVerseNum) {
        const targetId = `verse-${selectedBook.replace(/\s+/g, '_')}-${selectedChapter}-${scrollToVerseNum}`;
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            setTimeout(() => { // Allow DOM to update
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                targetElement.classList.add('highlighted-verse');
                setTimeout(() => targetElement.classList.remove('highlighted-verse'), 3000);
            }, 100);
        } else {
            console.warn(`Tried to scroll to verse ${scrollToVerseNum}, but element ID ${targetId} not found.`);
        }
    }
}

function attachWordStudyListeners() {
    // Remove existing listeners to prevent duplicates if displayChapter is called multiple times
    document.querySelectorAll('.word-clickable').forEach(span => {
        span.removeEventListener('click', handleWordClick);
        span.addEventListener('click', handleWordClick);
    });
}

async function fetchWordDefinition(word) {
  const dictionaryMeaning = document.getElementById('dictionaryMeaning'); // Assuming you have an element with this ID
  if (!dictionaryMeaning) {
    console.error("Element with ID 'dictionaryMeaning' not found.");
    return;
  }

  dictionaryMeaning.innerHTML = `<p>Searching for "${word}"...</p>`; // Placeholder while fetching

  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) {
      if (response.status === 404) {
        dictionaryMeaning.innerHTML = `<p>Sorry, the definition for "<strong>${word}</strong>" could not be found.</p>`;
      } else {
        dictionaryMeaning.innerHTML = `<p>Sorry, there was an error fetching the definition for "<strong>${word}</strong>". (Status: ${response.status})</p>`;
      }
      return;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const wordData = data[0]; // Use the first result
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

      // Attempt to find a couple of general usage examples if not directly available in definitions
      let usageExamples = [];
      if (wordData.meanings) {
        for (const meaning of wordData.meanings) {
          if (meaning.definitions) {
            for (const def of meaning.definitions) {
              if (def.example) {
                usageExamples.push(def.example);
                if (usageExamples.length >= 2) break;
              }
            }
          }
          if (usageExamples.length >= 2) break;
        }
      }

      // If specific examples from definitions are less than 2, try to find more generic ones if the API provides them at a higher level (though this API structure usually nests examples within definitions)
      // This API's structure is more definition-centric for examples.
      // The above code already extracts examples tied to specific definitions.

      if (usageExamples.length > 0) {
        htmlContent += `<h3>Usage Examples:</h3>`;
        usageExamples.slice(0, 2).forEach(example => { // Show up to 2 examples
          htmlContent += `<p>- ${example}</p>`;
        });
      } else if (wordData.sourceUrls && wordData.sourceUrls.length > 0){
        // Fallback if no examples are found but source URLs exist
        htmlContent += `<p>No direct usage examples found in the data. You can check <a href="${wordData.sourceUrls[0]}" target="_blank">Wiktionary</a> for more details.</p>`
      } else {
        htmlContent += `<p>No usage examples found for this word in the provided data.</p>`;
      }


      dictionaryMeaning.innerHTML = htmlContent;
    } else {
      dictionaryMeaning.innerHTML = `<p>No definition data found for "<strong>${word}</strong>".</p>`;
    }

  } catch (error) {
    console.error('Error fetching definition:', error);
    dictionaryMeaning.innerHTML = `<p>An error occurred while trying to fetch the definition. Please check your internet connection or try again later.</p>`;
  }
}

// Example of how you might call this function, assuming 'clickedWord' is defined elsewhere
// For instance, in an event listener:
// someElement.addEventListener('click', () => {
//   const clickedWord = "hello"; // This would be dynamically set
 // fetchWordDefinition(clickedWord);
// });



function handleWordClick(event) {
    const clickedWord = event.target.dataset.word; // Get the cleaned word from data-word attribute
    if (!clickedWord) return;

    selectedWordHeader.textContent = `Word Details: "${clickedWord}"`;
    dictionaryMeaning.innerHTML = `<p>Loading definition for "${clickedWord}"...</p>`;
    occurrencesDiv.innerHTML = `<p>Searching for occurrences...</p>`;
    wordStudyModal.style.display = 'block';
    fetchWordDefinition(clickedWord);
    // --- Dummy Dictionary Lookup ---
    // setTimeout(() => {
    //     const dummyMeaning = `<strong>${clickedWord}:</strong> This is a placeholder definition for the word. In a real application, this would come from a dictionary API. It provides a brief explanation of the term's common use and context. For example, "love" (n) - an intense feeling of deep affection. "love" (v) - feel a deep romantic or sexual attachment to (someone).`;
    //     dictionaryMeaning.innerHTML = `<p>${dummyMeaning}</p>`;
    // }, 500);
    

    // Find occurrences in all English books
    const occurrences = [];
    netBibleData.forEach(verse => {
        // Use a regex with 'gi' (global, case-insensitive) for better matching
        // Escaping special characters in the word for regex safety
        const escapedWord = clickedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi'); // \b for whole word match
        if (verse.text && regex.test(verse.text)) {
            occurrences.push({
                book: verse.englishBookName,
                chapter: verse.chapter,
                verse: verse.verse,
                // Highlight all occurrences in the verse text
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

        // Add listeners for occurrence links within the modal
        document.querySelectorAll('#occurrences .occurrence-link').forEach(link => {
            link.removeEventListener('click', handleOccurrenceLinkClick); // Prevent duplicates
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
    populateChapterSelect(book); // Repopulate chapters just in case
    chapterSelect.value = chapter;
    wordStudyModal.style.display = 'none'; // Close modal
    displayChapter(verse); // Display chapter and scroll to verse
}


function attachVerseAudioListeners() {
    // Remove existing listeners to prevent duplicates
    document.querySelectorAll('.play-verse-audio-btn').forEach(button => {
        button.removeEventListener('click', handlePlayVerseAudio);
        button.addEventListener('click', handlePlayVerseAudio);
    });
}

function handlePlayVerseAudio(event) {
    const button = event.target;
    const text = button.dataset.text;
    const lang = button.dataset.lang; // 'en-US', 'hi-IN', 'or-IN'
    const currentVerseId = button.closest('.verse-block').id; // Get ID of the verse block

    // Stop current audio if playing, especially if it's chapter audio or a different verse
    if (currentSpeech.isPlaying) {
        if (currentSpeech.source === 'verse_audio' && currentSpeech.utterance && currentSpeech.utterance.text === text) {
            stopCurrentAudio(); // If same verse button clicked, stop it
            return;
        }
        stopCurrentAudio(); // Stop any other playing audio
    }
    
    // Visually indicate playing status for the specific button
    button.textContent = '▶️ Playing...';
    button.disabled = true;

    // Use a Promise to handle the completion of speakText
    speakText(text, lang, 'verse_audio').then(() => {
        // Reset button state on successful end
        // Check if the button still exists and belongs to the current verse block
        if (button.closest('.verse-block') && button.closest('.verse-block').id === currentVerseId) {
            button.textContent = '🔊';
            button.disabled = false;
        }
    }).catch(() => {
        // Reset button state on error
        if (button.closest('.verse-block') && button.closest('.verse-block').id === currentVerseId) {
            button.textContent = '🔊';
            button.disabled = false;
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
        // Always stop any currently playing audio before starting new one
        if (speechSynthesis.speaking || speechSynthesis.pending) {
            speechSynthesis.cancel();
            console.log("Existing speech cancelled before new utterance.");
            // Reset state for previously playing audio source if necessary (e.g., chapter buttons)
            if (currentSpeech.source === 'english_chapter') {
                playEnglishButton.textContent = 'Play English Chapter';
                pauseResumeButton.style.display = 'none';
            } else if (currentSpeech.source === 'indian_chapter') {
                updatePlayIndianLangButtonText();
            }
            // Reset all verse buttons
            document.querySelectorAll('.play-verse-audio-btn').forEach(btn => {
                btn.textContent = '🔊';
                btn.disabled = false;
            });
        }

        currentSpeech.utterance = new SpeechSynthesisUtterance(text);
        currentSpeech.utterance.lang = lang;
        currentSpeech.isPlaying = true;
        currentSpeech.isPaused = false;
        currentSpeech.source = source; // 'english_chapter', 'indian_chapter', 'verse_audio'

        const desiredVoice = availableVoices.find(v => v.lang === lang && v.localService);
        const fallbackVoice = availableVoices.find(v => v.lang === lang);
        const defaultVoice = availableVoices.find(v => v.default);

        if (desiredVoice) {
            currentSpeech.utterance.voice = desiredVoice;
            console.log(`Using preferred voice: ${desiredVoice.name} for ${lang}`);
        } else if (fallbackVoice) {
            currentSpeech.utterance.voice = fallbackVoice;
            console.warn(`No local service voice found for ${lang}. Using fallback voice: ${fallbackVoice.name}`);
        } else if (defaultVoice) {
            currentSpeech.utterance.voice = defaultVoice;
            console.warn(`No specific voice found for ${lang}. Using browser's default voice: ${defaultVoice.name}. Audio might not be in the expected language.`);
            if (lang !== 'en-US') {
                alert(`No native voice found for ${lang}. Audio might be spoken in a different language or not play. Please check your browser's TTS settings and installed voices.`);
            }
        } else {
            console.error(`No voices available at all! Cannot speak text.`);
            alert("No text-to-speech voices are available on your system. Please check your browser/OS settings.");
            stopCurrentAudio(); // Will reject the promise
            return;
        }
        
        // --- Added for Hindi Chapter Debugging ---
        console.log(`Attempting to speak for source: ${source}`);
        console.log(`Language: ${lang}`);
        console.log(`Text length: ${text.length}`);
        console.log(`Text content (first 200 chars): "${text.substring(0, 200)}"`);
        // --- End Debugging ---


        currentSpeech.utterance.onstart = () => {
            console.log(`Speech started for ${source} in ${lang}`);
            currentSpeech.isPlaying = true;
            currentSpeech.isPaused = false;
            // Update UI for chapter-level buttons
            if (source === 'english_chapter') {
                playEnglishButton.textContent = 'Stop English Audio';
                pauseResumeButton.textContent = 'Pause';
                pauseResumeButton.style.display = 'inline-block';
                stopAudioButton.style.display = 'none'; // Chapter level buttons manage their own stop/pause
            } else if (source === 'indian_chapter') {
                const selectedLangText = languageSelect.options[languageSelect.selectedIndex].text;
                playIndianLangButton.textContent = `Playing ${selectedLangText}...`;
                stopAudioButton.style.display = 'inline-block';
                pauseResumeButton.style.display = 'none'; // Generally, Indian languages don't support pause/resume well
            } else if (source === 'verse_audio') {
                // Individual verse buttons handle their own state change in handlePlayVerseAudio
                // Hide main chapter audio controls while verse audio is playing
                playEnglishButton.style.display = 'none';
                playIndianLangButton.style.display = 'none';
                pauseResumeButton.style.display = 'none';
                stopAudioButton.style.display = 'inline-block'; // Show a general stop button
            }
        };

        currentSpeech.utterance.onend = () => {
            console.log(`Speech ended for ${source}`);
            currentSpeech.isPlaying = false;
            currentSpeech.isPaused = false;
            currentSpeech.utterance = null;
            // Reset UI based on the source that just finished
            if (source === 'english_chapter') {
                playEnglishButton.textContent = 'Play English Chapter';
                pauseResumeButton.style.display = 'none';
            } else if (source === 'indian_chapter') {
                updatePlayIndianLangButtonText();
            } else if (source === 'verse_audio') {
                // Reset all verse buttons
                document.querySelectorAll('.play-verse-audio-btn').forEach(btn => {
                    btn.textContent = '🔊';
                    btn.disabled = false;
                });
                // Restore main chapter audio controls
                playEnglishButton.style.display = 'inline-block';
                playIndianLangButton.style.display = 'inline-block';
            }
            stopAudioButton.style.display = 'none'; // General stop button should always be hidden when nothing is playing
            resolve();
        };

        currentSpeech.utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            alert(`Error in speech: ${event.error}. This might be due to a lack of voice data for the selected language (${lang}) on your system, or a browser issue. Check console for details.`);
            currentSpeech.isPlaying = false;
            currentSpeech.isPaused = false;
            currentSpeech.utterance = null;

            // Reset UI on error for all possible sources
            playEnglishButton.textContent = 'Play English Chapter';
            pauseResumeButton.style.display = 'none';
            updatePlayIndianLangButtonText();
            document.querySelectorAll('.play-verse-audio-btn').forEach(btn => {
                btn.textContent = '🔊';
                btn.disabled = false;
            });
            playEnglishButton.style.display = 'inline-block';
            playIndianLangButton.style.display = 'inline-block';
            stopAudioButton.style.display = 'none';
            reject(event.error);
        };
        
        speechSynthesis.speak(currentSpeech.utterance);
    });
}

function stopCurrentAudio() {
    if (speechSynthesis.speaking || speechSynthesis.pending) {
        speechSynthesis.cancel();
        console.log("Speech cancelled.");
    }
    currentSpeech.isPlaying = false;
    currentSpeech.isPaused = false;
    currentSpeech.utterance = null;

    // Reset all audio-related UI elements
    playEnglishButton.textContent = 'Play English Chapter';
    playEnglishButton.style.display = 'inline-block';

    updatePlayIndianLangButtonText();
    playIndianLangButton.style.display = 'inline-block';

    pauseResumeButton.style.display = 'none';
    stopAudioButton.style.display = 'none';

    document.querySelectorAll('.play-verse-audio-btn').forEach(btn => {
        btn.textContent = '🔊';
        btn.disabled = false;
    });
}

function togglePauseResumeAudio() {
    if (currentSpeech.isPlaying && !currentSpeech.isPaused) {
        speechSynthesis.pause();
        currentSpeech.isPaused = true;
        pauseResumeButton.textContent = 'Resume';
        console.log("Speech paused.");
    } else if (currentSpeech.isPlaying && currentSpeech.isPaused) {
        speechSynthesis.resume();
        currentSpeech.isPaused = false;
        pauseResumeButton.textContent = 'Pause';
        console.log("Speech resumed.");
    }
}

function handlePlayEnglishChapter() {
    if (currentSpeech.isPlaying && currentSpeech.source === 'english_chapter') {
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
        alert(`No English text found for ${selectedBook} chapter ${selectedChapter}. Please ensure 'all_web_bible.json' is correctly loaded and contains data for this chapter, and that the 'englishBookName' field matches the dropdown.`); 
        return; 
    }
    // Set source to indicate chapter playback
    speakText(versesToPlay.join(" "), 'en-US', 'english_chapter');
}

function handlePlayIndianLangChapter() {
    if (currentSpeech.isPlaying && currentSpeech.source === 'indian_chapter') {
        stopCurrentAudio();
        return;
    }
    const selectedBook = bookSelect.value;
    const selectedChapter = parseInt(chapterSelect.value);
    const langFile = languageSelect.value;
    const langName = languageSelect.options[languageSelect.selectedIndex].text;

    if (!selectedBook || !selectedChapter) { alert("Please select a book and chapter."); return; }

    const versesToPlay = currentIndianLanguageData
        .filter(v => v.englishBookName === selectedBook && v.chapter === selectedChapter && v.text)
        .sort((a, b) => a.verse - b.verse)
        .map(v => v.text);

    if (versesToPlay.length === 0) {
        alert(`No ${langName} text found for ${selectedBook} chapter ${selectedChapter}. Please ensure the ${langName} JSON data is correctly loaded and contains data for this chapter.`);
        return;
    }
    
    let speechLangCode = 'en-US';
    if (langFile === 'irv_hindi') speechLangCode = 'hi-IN';
    else if (langFile === 'odia_all_books') speechLangCode = 'or-IN';
    
    const hasSpecificVoice = availableVoices.some(voice => voice.lang === speechLangCode);
    if (!hasSpecificVoice && speechLangCode !== 'en-US') {
        console.warn(`No voice found for ${speechLangCode}. Attempting to speak with a default voice, but audio might not be in ${langName}.`);
        alert(`Your browser does not have a native voice for ${langName}. The audio might not play or will be spoken in a generic voice.`);
    }
    // Set source to indicate chapter playback
    speakText(versesToPlay.join(" "), speechLangCode, 'indian_chapter');
}


function handleSearch() {
    const query = quickSearchInput.value.trim();
    if (!query) return;

    bibleTextDiv.innerHTML = `<h3 class="chapter-title">Search Results for "${query}"</h3>`;
    let resultsFound = false;

    const CCREF_REGEX = /^(\d?\s?[a-zA-Z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i;
    const match = query.match(CCREF_REGEX);

    if (match) {
        const bookNameInput = match[1].trim();
        const chapter = parseInt(match[2]);
        const verseStart = match[3] ? parseInt(match[3]) : null;

        const bookTitleCase = bibleBooks.find(b => b.toLowerCase() === bookNameInput.toLowerCase());
        if (bookTitleCase) {
            bookSelect.value = bookTitleCase;
            populateChapterSelect(bookTitleCase);
            chapterSelect.value = chapter;
            
            displayChapter(verseStart);
            resultsFound = true;
        } else {
             bibleTextDiv.innerHTML += `<p>Book "${bookNameInput}" not recognized.</p>`;
        }
    }
    
    if (!resultsFound) {
        const searchTerm = query.toLowerCase();
        // Search in all loaded data (English and current Indian language)
        const dataToSearch = [...netBibleData, ...hindiBibleData, ...odiaBibleData]; // Search all loaded data
        let searchResultsHTML = "";
        
        const foundVerses = dataToSearch
            .filter(v => v.text && v.text.toLowerCase().includes(searchTerm))
            .slice(0, 100);

        if (foundVerses.length > 0) {
            searchResultsHTML += `<p>${foundVerses.length} verses found containing "${query}":</p>`;
            foundVerses.forEach(v => {
                // Determine if the verse is English or Indian language based on the actual data source
                let langDisplayName = "Unknown";
                if (netBibleData.some(ev => ev === v)) {
                    langDisplayName = 'English';
                } else if (hindiBibleData.some(hv => hv === v)) {
                    langDisplayName = 'हिन्दी';
                } else if (odiaBibleData.some(ov => ov === v)) {
                    langDisplayName = 'ଓଡିଆ';
                }


                searchResultsHTML += `<div class="verse-block">
                    <p><small>${v.englishBookName} ${v.chapter}:${v.verse} (${langDisplayName})</small></p>
                    <p>${v.text.replace(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (matchText) => `<mark>${matchText}</mark>`)}</p>
                </div>`;
            });
            bibleTextDiv.innerHTML += searchResultsHTML;
            resultsFound = true;
        }
    }

    if (!resultsFound) {
        bibleTextDiv.innerHTML += "<p>No results found for your query.</p>";
    }
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
            voiceSearchButton.textContent = 'Listening...';
            voiceSearchButton.disabled = true;
        } catch(e) {
            console.warn("Speech recognition start error:", e.message);
            if (e.name === 'InvalidStateError') {
                 recognition.stop();
            }
            voiceSearchButton.textContent = '🎤';
            voiceSearchButton.disabled = false;
        }
    });

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        quickSearchInput.value = speechResult;
        handleSearch();
    };

    recognition.onspeechend = () => recognition.stop();

    recognition.onend = () => {
        voiceSearchButton.textContent = '🎤';
        voiceSearchButton.disabled = false;
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error, event.message);
        let errorMessage = `Speech error: ${event.error}.`;
        if (event.error === 'no-speech') errorMessage = "No speech detected.";
        else if (event.error === 'audio-capture') errorMessage = "Mic problem.";
        else if (event.error === 'not-allowed') errorMessage = "Mic access denied.";
        
        const tempMsg = document.createElement('p');
        tempMsg.textContent = errorMessage;
        tempMsg.style.color = "red";
        bibleTextDiv.insertBefore(tempMsg, bibleTextDiv.firstChild);
        setTimeout(() => tempMsg.remove(), 5000);
    };
}