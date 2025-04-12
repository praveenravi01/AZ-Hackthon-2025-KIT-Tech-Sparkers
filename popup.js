async function extractContent() {
  let content = document.body.innerText.trim(); // Extracts page text

  if (!content) {
    console.error("No content extracted from the page.");
    chrome.storage.local.set({ gfg_questions: ["No content available to generate questions."] });
    return;
  }

  const apiKey = "AIzaSyBrbu78i7qZDHHB04Qu_xft_XNqJX8ejmE"; // Replace with actual API key
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    let response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `# INSTRUCTION
Generate 10 multiple-choice questions based on the provided HTML content. Each question should have 4 answer choices and one correct answer.

# OUTPUT FORMAT
Q::Question text::Option1|Option2|Option3|Option4::CorrectAnswer
Q::Question text::Option1|Option2|Option3|Option4::CorrectAnswer
...

User message: ${content}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) throw new Error("Failed to fetch questions from Gemini API");

    let data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let extractedQuestions = rawText.split("\n").map((q) => q.trim()).filter((q) => q);

    if (extractedQuestions.length < 10) {
      extractedQuestions = [
        ...extractedQuestions,
        ...Array(10 - extractedQuestions.length).fill("No question available"),
      ];
    }

    console.log("Generated Questions:", extractedQuestions);
    chrome.storage.local.set({ gfg_questions: extractedQuestions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    chrome.storage.local.set({
      gfg_questions: ["Failed to fetch questions"],
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const questionContainer = document.getElementById("questions");

  function displayQuestions(questions) {
    questionContainer.innerHTML = ""; // Clear previous content

    questions.forEach((q, index) => {
      const parts = q.split("::");
      if (parts.length < 3) return; // Skip invalid formats

      const questionText = parts[1] || `Question ${index + 1}`;
      const options = parts[2].split("|");
      const correctAnswer = parts[3] || "Answer not available";

      const questionElement = document.createElement("div");
      questionElement.classList.add("question");

      questionElement.innerHTML = `
        <p><strong>${questionText}</strong></p>
        <ul>
          ${options.map(opt => `<li>${opt}</li>`).join("")}
        </ul>
        <p><strong>Correct Answer:</strong> ${correctAnswer}</p>
        <hr>
      `;

      questionContainer.appendChild(questionElement);
    });
  }

  // Load questions when storage updates
  chrome.storage.local.get("gfg_questions", function (data) {
    const questions = data.gfg_questions || ["No questions available"];
    displayQuestions(questions);
  });

  chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (changes.gfg_questions) {
      displayQuestions(changes.gfg_questions.newValue || []);
    }
  });
});

extractContent();
