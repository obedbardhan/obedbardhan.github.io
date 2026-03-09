const fs = require('fs');

const characterData = [
    { name: 'Adam', book: 1, chapters: [1, 2, 3, 4, 5], verseHint: { ch: 2, v: 7 } },
    { name: 'Daniel', book: 27, chapters: [1, 2, 3, 4, 5, 6], verseHint: { ch: 6, v: 10 } },
    { name: 'Paul', book: 44, chapters: [9, 13, 16, 22, 26, 27, 28], verseHint: { ch: 9, v: 15 } }
];

const obj = characterData[1];
console.log("DANIEL test:", obj.book, obj.verseHint.ch, obj.verseHint.v);
