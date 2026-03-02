 const button = document.getElementById("speakBtn");
 const output = document.getElementById("output");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      output.textContent = "❌ Sorry, your browser does not support Speech Recognition.";
      button.disabled = true;
    } 
    else {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";  
      recognition.interimResults = false;
      //  recognition.interimResults = true;

      button.addEventListener("click", () => {
        recognition.start();
        output.textContent = "Listening...";
        output.classList.add("listening");
      });

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        output.textContent = transcript;
        output.classList.remove("listening");
      };

      recognition.onerror = (event) => {
        output.textContent = "⚠️ Error: " + event.error;
        output.classList.remove("listening");
      };

      recognition.onend = () => {
        output.classList.remove("listening");
      };
    }

      
