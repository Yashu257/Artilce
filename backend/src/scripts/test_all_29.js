const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'cipla-medknowledge-jwt-secret-key-32chars-min-secure-2026';
const token = jwt.sign(
  { sub: 'cmw4n8ns700085t8mrxnjgoye', email: 'yashwanthkothapalli454@gmail.com', name: 'Yashwanth', role: 'doctor' },
  JWT_SECRET,
  { expiresIn: '2h' }
);

async function ask(question, conversationId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ question, conversationId });
    const req = http.request(
      'http://localhost:4000/api/v1/assistant/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'mkp_session=' + token,
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          const doneMatch = raw.match(/event: done\ndata: (\{.*\})/);
          if (doneMatch) {
            try {
              resolve(JSON.parse(doneMatch[1]));
            } catch (e) {
              resolve({ answer: raw, error: String(e) });
            }
          } else {
            resolve({ answer: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function logResult(num, category, question, res) {
  console.log(`\n------------------------------------------------------------`);
  console.log(`[Q${num}] (${category}) "${question}"`);
  console.log(`------------------------------------------------------------`);
  console.log(`Mode: ${res.mode || 'N/A'} | Citations: ${res.citations ? res.citations.length : 0}`);
  const preview = res.answer ? res.answer.replace(/\n+/g, ' ').slice(0, 250) : '';
  console.log(`Answer Preview: ${preview}...`);
}

async function run() {
  console.log('============================================================');
  console.log('MEDKNOW FULL 29-QUESTION TEST SUITE RUNNER');
  console.log('============================================================');

  // CATEGORY 1: Platform Questions (1-10)
  const platformQuestions = [
    'Hi',
    'What is this website?',
    'What can I do here?',
    'What kind of medical information is available?',
    'How do I access an article?',
    'How do I open a complete PDF?',
    'What is the purpose of the AI Assistant?',
    'How do I bookmark an article?',
    'What kind of questions can I ask you?',
    'Can you explain all the features available here?',
  ];

  for (let i = 0; i < platformQuestions.length; i++) {
    const q = platformQuestions[i];
    const res = await ask(q);
    logResult(i + 1, 'Platform', q, res);
  }

  // CATEGORY 2: Medical Questions (11-18)
  const medicalQuestions = [
    'What is cenobamate?',
    'Explain the Freedon study.',
    'Summarize the available clinical evidence.',
    'What safety information is available?',
    'Compare the findings from two available studies.',
    'Explain this in simple English.',
    'Which publications discuss this topic?',
    'What are the documented findings on drug interactions?',
  ];

  for (let i = 0; i < medicalQuestions.length; i++) {
    const q = medicalQuestions[i];
    const res = await ask(q);
    logResult(i + 11, 'Medical', q, res);
  }

  // CATEGORY 3: Contextual Questions in Sequence (19-24)
  console.log('\n============================================================');
  console.log('RUNNING CONTEXTUAL SEQUENCE IN SAME CONVERSATION');
  console.log('============================================================');

  const contextualQuestions = [
    'Hi, what can you do?',
    'Explain cenobamate.',
    'Can you simplify that?',
    'What about safety?',
    'Show me the related studies.',
    'Summarize the second study.',
  ];

  let sharedConvId = undefined;
  for (let i = 0; i < contextualQuestions.length; i++) {
    const q = contextualQuestions[i];
    const res = await ask(q, sharedConvId);
    if (res.conversationId) sharedConvId = res.conversationId;
    logResult(i + 19, 'Contextual (Conv: ' + (sharedConvId || 'new') + ')', q, res);
  }

  // CATEGORY 4: Out-of-Scope Questions (25-29)
  console.log('\n============================================================');
  console.log('RUNNING OUT-OF-SCOPE REJECTION TESTS');
  console.log('============================================================');

  const outOfScopeQuestions = [
    'What is 2+2?',
    'Tell me a joke.',
    'Write a Python program.',
    'Give me a cooking recipe.',
    'What is today\'s weather?',
  ];

  for (let i = 0; i < outOfScopeQuestions.length; i++) {
    const q = outOfScopeQuestions[i];
    const res = await ask(q);
    logResult(i + 25, 'Out-of-Scope', q, res);
  }

  console.log('\n============================================================');
  console.log('ALL 29 TESTS COMPLETED SUCCESSFULLY');
  console.log('============================================================');
}

run().catch(console.error);
