const fs = require('fs')

// Read the CSV file
const csvContent = fs.readFileSync('some-ts.csv', 'utf8')

// Split by newlines, remove quotes, filter empty lines, and join with commas
const wikiIds = csvContent
  .split('\n')
  .map((line) => line.replace(/"/g, '').trim())
  .filter((line) => line.length > 0)
  .join(',')

console.log(wikiIds)
