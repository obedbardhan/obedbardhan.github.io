const fs = require('fs');
const data = JSON.parse(fs.readFileSync('odia_all_books.json', 'utf8'));

// Simulating quiz.js getRef behavior for Joshua (book 6)
const joshuaVerses = data.filter(v => v.book === 6);
const rawBookName = joshuaVerses[0].book_name;
console.log("quiz.js RAW book_name for Joshua:", rawBookName);

// The reference is built as `${book_name} ${ch}:${v}`
const inputRef = `${rawBookName} 1:1`;

// Simulating script.js openBibleVerse behavior
const match = inputRef.match(/^(.+?)\s+(\d+):(\d+)$/);
const bookNameInput = match[1].trim();

console.log("Parsed bookNameInput:", bookNameInput);
console.log("Are they EXACTLY equal?", bookNameInput === rawBookName);

// Looking it up the way script.js does
const foundData = data.find(v => v.book_name === bookNameInput);
console.log("Did script.js find it?", !!foundData);
if (foundData) {
    console.log("English name matched:", foundData.englishBookName);
} else {
    console.log("Failed to match!");
    // Why did it fail? Let's check lengths and character codes
    console.log(`Length of raw: ${rawBookName.length}`);
    for (let i = 0; i < rawBookName.length; i++) console.log(`raw[${i}]: ${rawBookName.charCodeAt(i)}`);
    console.log(`Length of input: ${bookNameInput.length}`);
    for (let i = 0; i < bookNameInput.length; i++) console.log(`input[${i}]: ${bookNameInput.charCodeAt(i)}`);
}
