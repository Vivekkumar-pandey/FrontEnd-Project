const apiKey = 'fe1190964f085678fbe81299c4bd466b';

async function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  const resultDiv = document.getElementById("result");

  if (!city) {
    resultDiv.innerHTML = `<p>Please enter a city name.</p>`;
    return;
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );
    const data = await response.json();

    if (!response.ok) {
      resultDiv.innerHTML = `<p>City not found. Please try again.</p>`;
      return;
    }

    const {
      name,
      main,
      weather,
      wind,
      sys,
      visibility,
    } = data;

    const getWindDir = (deg) => {
      const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      return dirs[Math.round(deg / 45) % 8];
    };

    resultDiv.innerHTML = `
      <div class="weather-info">
        <h2>${name}, ${sys.country}</h2>
        <p><strong>${weather[0].main} (${weather[0].description})</strong></p>
      <img src="https://openweathermap.org/img/wn/${weather[0].icon}@2x.png" alt="icon" class="weather-icon" />

        <p>🌡️ Temp: <strong>${main.temp}°C</strong> (Feels like: ${main.feels_like}°C)</p>
        <p>💧 Humidity: ${main.humidity}%</p>
        <p>🔍 Visibility: ${visibility / 1000} km</p>
        <p>🧭 Wind: ${wind.speed} m/s ${getWindDir(wind.deg)}</p>
        <p>📈 Pressure: ${main.pressure} hPa</p>
      </div>
    `;
      }
    catch (error) {
       console.error("ERROR:", error); // See error in console
       resultDiv.innerHTML = `<p>Something went wrong: ${error.message}</p>`;
    }
 }
 
 // add by enter key ****************

 document.getElementById("cityInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    getWeather();
  }
});
