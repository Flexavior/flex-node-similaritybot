const input = document.getElementById('userInput');
const chatbox = document.getElementById('chatbox');
const langIndicator = document.getElementById('langIndicator');

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  chatbox.innerHTML += `<div class="message user">${text}</div>`;
  chatbox.scrollTop = chatbox.scrollHeight;

  try {
    const res = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text })
    });
    const data = await res.json();

    chatbox.innerHTML += `<div class="message bot">${data.reply}</div>`;
    chatbox.scrollTop = chatbox.scrollHeight;

    if (data.detectedLanguage) {
      langIndicator.textContent = `Detected language: ${data.detectedLanguage}`;
    }

  } catch (err) {
    chatbox.innerHTML += `<div class="message bot">Server unavailable.</div>`;
  }
}

input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

document.querySelector('button').addEventListener('click', sendMessage);
