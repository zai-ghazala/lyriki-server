const express = require('express'); 
const app = express();
const port = 3000
const cors = require('cors')

var corsOptions = {
  origin: ['http://127.0.0.1:5173/'],
  optionsSuccessStatus: 200 
}

function getSentences(text) {
  let sentences = [];
  text.split('. ').map(function(sentence) {
    sentences.push({sentence: sentence.split(' ').filter((val) => val !== "")})
  })
  return sentences;
}

async function rhymeLastWord(text) {
  const allRhymes = await Promise.all(getSentences(text).map(async function(x) {
      const last = x.sentence[x.sentence.length - 1];
      const rhymeRequests = await requestDatamuse(last);
      return ({ sentence: x.sentence, rhymes: rhymeRequests });
  }))
  for (let key in allRhymes) {
    if (allRhymes[key] === undefined) {
      delete allRhymes[key];
    }
  }
  const array = []

  allRhymes.map(function(x) {
    if (x.rhymes.length > 20) {
      array.push({sentence: x.sentence, rhymes: x.rhymes})
    }
  })
  return array;
}

async function requestDatamuse(word) {
  const response = await fetch(`https://api.datamuse.com/words?rel_rhy=${word}`);
  const json = await response.json()
  return json.map(x => x.word);
}

async function requestWiki(keyword) {
  const response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${keyword}&prop=extracts&format=json`);
  const json = await response.json()
  const text = json.query.pages
  const extract = text[Object.keys(text)].extract
  const cleaned = extract.replace(/<\/?[^>]+(>|$)/g, " ")

  return cleaned;
}

async function couplet(keyword1, keyword2) {
  const usableText1 = await rhymeLastWord(await requestWiki(keyword1))
  const usableText2 = await requestWiki(keyword2)
  const sentences = usableText2.split('. ')
  const matchableRhymes = []

  sentences.forEach(x => {
    const last = x.split(' ').pop()
    matchableRhymes.push({ sentence: x, last}) //last words from keyword2
    })
  
  let couplets = [];

  usableText1.forEach(x => {
    matchableRhymes.forEach(y => {
      if (x.rhymes.includes(y.last)) {
        couplets.push([x.sentence.join(' '), y.sentence])
      }})
  })
  return couplets[Math.floor(Math.random() * couplets.length)];
}


app.get('/', async (req, res) => {
  res.send('Wikiwords')
})
app.get('/api', cors(corsOptions), async (req, res) => {

  if (!req.query.keyword1 && !req.query.keyword2) {
    return res.send({error: 'You must provide keywords'})
  }
  else {
    const result = await couplet(req.query.keyword1, req.query.keyword2);
    res.send(result.join('<br/>'))
  }
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

module.exports = app
