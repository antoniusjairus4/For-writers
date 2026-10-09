// Presets Data
const PRESETS = {
  frankenstein: `It was on a dreary night of November that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet. It was already one in the morning; the rain pattered dismally against the panes, and my candle was nearly burnt out, when, by the glimmer of the half-extinguished light, I saw the dull yellow eye of the creature open; it breathed hard, and a convulsive motion agitated its limbs.

How can I describe my emotions at this catastrophe, or how delineate the wretch whom with such infinite pains and care I had endeavoured to form? His limbs were in proportion, and I had selected his features as beautiful. Beautiful! Great God! His yellow skin scarcely covered the work of muscles and arteries beneath; his hair was of a lustrous black, and flowing; his teeth of a pearly whiteness; but these luxuriances only formed a more horrific contrast with his watery eyes, that seemed almost of the same colour as the dun-white sockets in which they were set, his shrivelled complexion and straight black lips.`,

  dracula: `3 May. Bistritz.—Left Munich at 8:35 P. M., on 1st May, arriving at Vienna early next morning; should have arrived at 6:46, but train was hour late. Buda-Pesth seems a wonderful place, from the glimpse which I got of it from the train and the little I could walk through the streets. I feared to go very far from the station, as we had arrived late and would start as near the time as possible. 

The impression I had was that we were leaving the West and entering the East; the most western of splendid bridges over the Danube, which is here of noble width and depth, took us among the traditions of Turkish rule. We left in good time, and came after nightfall to Klausenburgh. Here I stopped for the night at the Hotel Royale. I had for dinner, or rather supper, a chicken done up some way with red pepper, which was very good but thirsty. (Mem., get recipe for Mina.)`,

  pride: `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.

"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"

Mr. Bennet replied that he had not.

"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."

Mr. Bennet made no answer.

"Do you not want to know who has taken it?" cried his wife impatiently.

"You want to tell me, and I have no objection to hearing it."

This was invitation enough.`
};

// Update live character and word counters
function updateLiveStats() {
  const text = document.getElementById('manuscript-input').value;
  document.getElementById('live-char-count').textContent = text.length.toLocaleString();
  
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  document.getElementById('live-word-count').textContent = words.toLocaleString();
  
  document.getElementById('error-banner').style.display = 'none';
}

function loadPreset(name) {
  if (PRESETS[name]) {
    const input = document.getElementById('manuscript-input');
    input.value = PRESETS[name];
    updateLiveStats();
    showToast('Sample preset loaded!');
    auditManuscript();
  }
}

function clearText() {
  document.getElementById('manuscript-input').value = '';
  updateLiveStats();
  document.getElementById('results-section').classList.remove('visible');
  showToast('Text cleared');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

/* -------------------------------------------------------------
   ALGORITHMIC REQUIREMENTS (Deterministic Logic)
------------------------------------------------------------- */

// 1. Syllable Counter Heuristic
function countWordSyllables(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;

  let temp = clean;

  // Deduct silent trailing "e", "es", "ed"
  if (temp.endsWith('e') && !temp.endsWith('le')) {
    temp = temp.slice(0, -1);
  } else if (temp.endsWith('es') && !temp.endsWith('les') && !temp.endsWith('tes') && !temp.endsWith('ses')) {
    temp = temp.slice(0, -2);
  } else if (temp.endsWith('ed') && !temp.endsWith('ted') && !temp.endsWith('ded')) {
    temp = temp.slice(0, -2);
  }

  // Count contiguous vowel clusters
  const vowelMatches = temp.match(/[aeiouy]{1,2}/g);
  let count = vowelMatches ? vowelMatches.length : 0;

  // Hard minimum of 1 syllable per tokenized word
  return Math.max(1, count);
}

function countTextSyllables(wordsArray) {
  return wordsArray.reduce((acc, word) => acc + countWordSyllables(word), 0);
}

// 2. Robust Sentence Tokenization
function tokenizeSentences(text) {
  if (!text || !text.trim()) return [];

  const honorifics = [
    "Mr", "Mrs", "Ms", "Dr", "Prof", "Sr", "Jr", "St", "Gen", "Col", 
    "Capt", "Lt", "Vol", "vs", "etc", "eg", "ie", "Inc", "Corp", "Co", "No", "Fig"
  ];

  let protectedText = text;
  
  // Protect honorifics
  honorifics.forEach(h => {
    const regex = new RegExp(`\\b(${h})\\.`, 'gi');
    protectedText = protectedText.replace(regex, '$1___DOT___');
  });

  // Protect ellipses (...)
  protectedText = protectedText.replace(/\.\.\./g, '___ELLIPSIS___');
  protectedText = protectedText.replace(/…/g, '___ELLIPSIS___');

  // Split on sentence boundaries: punctuation followed by whitespace and uppercase/quote
  // Safari-safe splitting mechanism
  const splitRegex = /([.!?]+["'\u201D\u2019]?)\s+(?=[A-Z"'\u201C\u2018])/g;
  
  const rawSentences = [];
  let lastIndex = 0;
  let match;

  while ((match = splitRegex.exec(protectedText)) !== null) {
    const sentenceEnd = match.index + match[1].length;
    const chunk = protectedText.slice(lastIndex, sentenceEnd);
    if (chunk.trim()) {
      rawSentences.push(chunk);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < protectedText.length) {
    const remaining = protectedText.slice(lastIndex);
    if (remaining.trim()) {
      rawSentences.push(remaining);
    }
  }

  // Fallback to simple split if loop produced single block
  const sentenceList = rawSentences.length > 0 ? rawSentences : protectedText.split(/\n+/);

  const sentences = [];
  sentenceList.forEach(s => {
    let restored = s
      .replace(/___DOT___/g, '.')
      .replace(/___ELLIPSIS___/g, '...');
      
    restored = restored.trim();
    if (restored) {
      sentences.push(restored);
    }
  });

  return sentences;
}

// 3. Readability Auditing Main Function
function auditManuscript() {
  const text = document.getElementById('manuscript-input').value.trim();
  const errorBanner = document.getElementById('error-banner');

  if (!text) {
    errorBanner.textContent = "Please enter or paste your chapter manuscript text before auditing.";
    errorBanner.style.display = 'block';
    return;
  }

  const sentences = tokenizeSentences(text);
  const words = text.match(/\b[a-zA-Z0-9'-]+\b/g) || [];

  if (words.length < 4 || sentences.length === 0) {
    errorBanner.textContent = "Text is too short for a meaningful audit. Please provide at least one complete sentence (minimum 4 words).";
    errorBanner.style.display = 'block';
    return;
  }

  errorBanner.style.display = 'none';

  const totalWords = words.length;
  const totalSentences = sentences.length;
  const totalSyllables = countTextSyllables(words);

  const avgWps = totalWords / totalSentences;
  const syllablesPerWord = totalSyllables / totalWords;

  // Flesch Reading Ease Formula
  let fleschScore = 206.835 - (1.015 * avgWps) - (84.6 * syllablesPerWord);
  fleschScore = Math.max(0, Math.min(100, fleschScore));

  // Flesch-Kincaid Grade Level Formula
  let fkGrade = (0.39 * avgWps) + (11.8 * syllablesPerWord) - 15.59;
  fkGrade = Math.max(0, fkGrade);

  // Render KPIs
  document.getElementById('kpi-flesch-ease').textContent = fleschScore.toFixed(1);
  
  const fleschTag = document.getElementById('kpi-flesch-tag');
  if (fleschScore >= 80) {
    fleschTag.textContent = 'Very Easy (Brisk & Fast)';
    fleschTag.className = 'kpi-tag tag-ease-easy';
  } else if (fleschScore >= 60) {
    fleschTag.textContent = 'Standard Fiction (Accessible)';
    fleschTag.className = 'kpi-tag tag-ease-standard';
  } else if (fleschScore >= 45) {
    fleschTag.textContent = 'Challenging (Literary/Dense)';
    fleschTag.className = 'kpi-tag tag-ease-hard';
  } else {
    fleschTag.textContent = 'Very Complex (Bottleneck Risk)';
    fleschTag.className = 'kpi-tag tag-ease-very-hard';
  }

  document.getElementById('kpi-grade-level').textContent = `Grade ${Math.round(fkGrade)}`;
  
  let gradeContext = "General Audience";
  if (fkGrade <= 6) gradeContext = "Middle Grade / Easy Read";
  else if (fkGrade <= 9) gradeContext = "Young Adult / General Fiction";
  else if (fkGrade <= 12) gradeContext = "Literary Fiction / Adult";
  else gradeContext = "Academic / High Complexity";
  document.getElementById('kpi-grade-subtext').textContent = gradeContext;

  document.getElementById('kpi-total-words').textContent = totalWords.toLocaleString();
  document.getElementById('kpi-total-sentences').textContent = `${totalSentences} sentence${totalSentences > 1 ? 's' : ''} analyzed`;

  document.getElementById('kpi-avg-wps').textContent = avgWps.toFixed(1);
  let pacingEval = "Balanced pacing";
  if (avgWps < 12) pacingEval = "Snappy & fast-paced";
  else if (avgWps > 22) pacingEval = "Slower, descriptive pacing";
  document.getElementById('kpi-pacing-eval').textContent = pacingEval;

  // 4. Ranking Top 5 Hardest Sentences
  const sentenceMetrics = sentences
    .map((sentenceStr, index) => {
      const sWords = sentenceStr.match(/\b[a-zA-Z0-9'-]+\b/g) || [];
      const wordCount = sWords.length;
      if (wordCount < 4) return null;

      const syllableCount = countTextSyllables(sWords);
      // Complexity Index Formula
      const complexity = wordCount + ((syllableCount / wordCount) * 15);

      return {
        originalIndex: index,
        sentenceText: sentenceStr,
        wordCount: wordCount,
        syllableCount: syllableCount,
        complexity: complexity
      };
    })
    .filter(item => item !== null);

  // Sort descending by Complexity and pick top 5
  sentenceMetrics.sort((a, b) => b.complexity - a.complexity);
  const top5Hardest = sentenceMetrics.slice(0, 5);

  // Render Top 5 Hardest Sentences Card
  const hardSentencesContainer = document.getElementById('hard-sentences-container');
  hardSentencesContainer.innerHTML = '';

  top5Hardest.forEach((item, idx) => {
    const rank = idx + 1;
    const itemEl = document.createElement('div');
    itemEl.className = 'hard-sentence-item';
    
    itemEl.innerHTML = `
      <div class="item-header">
        <span class="rank-badge">#${rank} Hardest Bottleneck</span>
        <div class="sentence-meta">
          <span class="meta-pill">${item.wordCount} words</span>
          <span class="meta-pill">${item.syllableCount} syllables</span>
          <span class="meta-pill">Score: ${item.complexity.toFixed(1)}</span>
        </div>
      </div>
      <div class="sentence-text">"${escapeHtml(item.sentenceText)}"</div>
      <div class="item-actions">
        <button class="btn-action btn-copy-action" data-sentence="${escapeAttribute(item.sentenceText)}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Copy
        </button>
        <button class="btn-action btn-jump-action" data-rank="${rank}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Jump to Sentence
        </button>
      </div>
    `;
    hardSentencesContainer.appendChild(itemEl);
  });

  // Attach button handlers dynamically
  document.querySelectorAll('.btn-copy-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sentence = e.currentTarget.getAttribute('data-sentence');
      copySentenceText(sentence);
    });
  });

  document.querySelectorAll('.btn-jump-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const rank = parseInt(e.currentTarget.getAttribute('data-rank'), 10);
      jumpToSentence(rank);
    });
  });

  // 5. Visual Replacement in Heatmap View
  renderHeatmapView(text, top5Hardest);

  // Reveal Results Section with Animation
  const resultsSec = document.getElementById('results-section');
  resultsSec.classList.add('visible');
  resultsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Visual Heatmap Replacement
function renderHeatmapView(fullText, top5Hardest) {
  const heatmapContainer = document.getElementById('heatmap-content');
  const paragraphs = fullText.split(/\n+/);
  
  const renderedParagraphs = paragraphs.map(paragraph => {
    let pText = escapeHtml(paragraph);

    // Replace top 5 hardest sentences safely
    top5Hardest.forEach((item, idx) => {
      const rank = idx + 1;
      const escapedSentence = escapeHtml(item.sentenceText);
      
      if (pText.includes(escapedSentence)) {
        const markTag = `<mark class="hard-sentence" data-rank="${rank}" id="hard-mark-${rank}">${escapedSentence}</mark>`;
        pText = pText.replace(escapedSentence, markTag);
      }
    });

    return `<p>${pText}</p>`;
  });

  heatmapContainer.innerHTML = renderedParagraphs.join('');
}

function jumpToSentence(rank) {
  const targetMark = document.getElementById(`hard-mark-${rank}`);
  if (targetMark) {
    targetMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetMark.classList.remove('flash-target');
    void targetMark.offsetWidth; // Force reflow
    targetMark.classList.add('flash-target');
    showToast(`Jumped to Hardest Sentence #${rank}`);
  } else {
    showToast(`Sentence #${rank} is highlighted in the heatmap below.`);
  }
}

function copySentenceText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Sentence copied to clipboard!');
  }).catch(() => {
    showToast('Failed to copy');
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initial setup
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('manuscript-input').addEventListener('input', updateLiveStats);
  loadPreset('frankenstein');
});
