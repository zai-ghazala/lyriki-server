const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const sonnets = require('./sonnets.js');

var corsOptions = {
  origin: [
    'https://lyriki.zaiz.ai',
    'https://www.lyriki.zaiz.ai',
    'http://127.0.0.1:5173',
    'http://localhost:5173',
  ],
  optionsSuccessStatus: 200,
};

function getSentences(text) {
  let sentences = [];
  text.split('. ').map(function (sentence) {
    if (
      sentence.split(' ').length > 0 && sentence.split(' ').length < 30 && !sentence.split('').includes('.')
    ) {
      sentences.push({
        sentence: sentence.split(' ').filter((val) => val !== ''),
      });
    }
  });
  return sentences;
}

async function rhymeLastWord(text) {
  const allRhymes = await Promise.all(
    getSentences(text).map(async function (x) {
      const last = x.sentence[x.sentence.length - 1];
      const rhymeRequests = await requestDatamuse(last);
      return { sentence: x.sentence, rhymes: rhymeRequests };
    })
  );
  for (let key in allRhymes) {
    if (allRhymes[key] === undefined) {
      delete allRhymes[key];
    }
  }
  const array = [];

  allRhymes.map(function (x) {
    if (x.rhymes.length > 0) {
      array.push({ sentence: x.sentence, rhymes: x.rhymes });
    }
  });
  return array;
}

async function requestDatamuse(word) {
  const response = await fetch(
    `https://api.datamuse.com/words?rel_rhy=${word}`
  );
  const json = await response.json();
  return json.map((x) => x.word);
}

async function requestWiki(keyword) {
  const response = await fetch(
    `https://simple.wikipedia.org/w/api.php?action=query&titles=${keyword}&prop=extracts&format=json`
  );
  const json = await response.json();
  const text = json.query.pages;
  const extract = text[Object.keys(text)].extract;
  const cleaned = extract.replace(/<\/?[^>]+(>|$)/g, '');

  return cleaned;
}

function getSonnets() {
  const matchableRhymes = [];

  sonnets.forEach((x) => {
    x.lines.forEach((y) => {
      const last = y.split(' ').pop();
      matchableRhymes.push({
        sentence: y,
        last,
        title: x.title,
        author: x.author,
      });
    });
  });
  return matchableRhymes;
}

async function couplet(keyword) {
  const text = await rhymeLastWord(await requestWiki(keyword));
  const matchableRhymes = getSonnets();

  let couplets = [];
  let ret;
  text.forEach((x) => {
    matchableRhymes.forEach((y) => {
      if (
        x.rhymes.includes(y.last) &&
        x.sentence.length > 0 &&
        y.sentence.length > 0
      ) {
        couplets.push([x.sentence.join(' '), y.sentence]);
        const random =
          couplets[Math.floor(Math.random() * couplets.length)].join('\n');
        ret = { message: random, title: y.title, author: y.author };
      }
    });
  });
  return ret ? ret : { message: 'nothing found :(', error: true };
}

app.get('/', async (req, res) => {
  res.send('Lyriki');
});
app.get('/api', cors(corsOptions), async (req, res) => {
  if (!req.query.keyword) {
    return res.send({ message: 'You must provide a keyword', error: true });
  } else {
    const result = await couplet(req.query.keyword);
    res.send(result);
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

module.exports = app;
