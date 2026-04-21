import React, { useState } from "react";
import "./App.css";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";

function App() {
  // LOGIN STATE
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // APP STATE
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(false);

  // LOGIN FUNCTION
  const handleLogin = () => {
    if (username === "admin" && password === "1234") {
      setLoggedIn(true);
    } else {
      alert("Wrong credentials");
    }
  };

  // IMAGE HANDLER
  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  // ✅ API CALL (FINAL FIX FOR GRADIO)
const predict = async () => {
  if (!image) {
    alert("Upload image first");
    return;
  }

  setLoading(true);

  try {
    const toBase64 = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

    const base64Image = await toBase64(image);

    const res = await fetch(
      "https://anil2111-cnn-backend.hf.space/gradio_api/predict",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              path: null,
              url: base64Image,
            },
          ],
        }),
      }
    );

    const data = await res.json();
    console.log("RESPONSE:", data);

    if (!data.data) {
      alert("Invalid response from backend");
      return;
    }

    const output = data.data[0];

    const parts = output.split("|");

    const prediction = parts[0].split(":")[1].trim();
    const confidence = parseFloat(parts[1].split(":")[1]);

    setResult(prediction);
    setConfidence(confidence);

  } catch (err) {
    console.error(err);
    alert("Backend error");
  }

  setLoading(false);
};

  // ✅ CHART DATA (YOU MISSED THIS EARLIER)
  const chartData = {
    labels: ["Confidence"],
    datasets: [
      {
        label: "Confidence %",
        data: [confidence],
        backgroundColor: ["#ff4d88"],
      },
    ],
  };

  // 🔐 LOGIN PAGE
  if (!loggedIn) {
    return (
      <div className="login">
        <div className="login-box">
          <h2>🎗️ Breast Cancer Detection</h2>
          <p className="subtitle">Secure Login</p>

          <input
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={handleLogin}>Login</button>
        </div>
      </div>
    );
  }

  // MAIN UI
  return (
    <div className="app">
      <div className="header">
        <h1>🎗️ Breast Cancer Detection</h1>
        <p className="subtitle">
          AI-powered diagnosis using deep learning
        </p>
      </div>

      <div className="container">
        {/* LEFT */}
        <div className="panel">
          <h3>Upload Mammogram</h3>

          <input type="file" onChange={handleImage} />

          {preview && <img src={preview} alt="preview" />}

          <button onClick={predict}>Analyze Image</button>
        </div>

        {/* RIGHT */}
        <div className="panel">
          {loading ? (
            <div className="loader"></div>
          ) : result ? (
            <div className="result-card">
              <h2 className={result === "Malignant" ? "red" : "green"}>
                {result}
              </h2>

              <p>{confidence.toFixed(2)}% Confidence</p>

              <Bar data={chartData} />

              <div className="message">
                {result === "Malignant"
                  ? "⚠️ High risk detected. Consult a doctor."
                  : "✅ Low risk detected. Stay safe."}
              </div>
            </div>
          ) : (
            <p className="placeholder">Upload image to start analysis</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;