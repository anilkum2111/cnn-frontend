import React, { useState } from "react";
import "./App.css";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { Client } from "@gradio/client";

// ✅ FIX #1: Make sure this matches your actual Hugging Face Space name exactly
const SPACE = "anil2111/cnn_backend";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState("");
  const [benignConf, setBenignConf] = useState(0);
  const [malignantConf, setMalignantConf] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (username === "admin" && password === "1234") {
      setLoggedIn(true);
    } else {
      alert("Wrong credentials");
    }
  };

  // ✅ FIX #2: Support pressing Enter key to login
  const handleLoginKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult("");
    setError("");
    setBenignConf(0);
    setMalignantConf(0);
  };

  const predict = async () => {
    if (!image) {
      alert("Upload image first");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const client = await Client.connect(SPACE);

      // ✅ FIX #3: The Gradio backend (fixed app.py) now returns 3 separate outputs:
      //    res.data[0] = label ("Benign" or "Malignant")
      //    res.data[1] = benign confidence (number)
      //    res.data[2] = malignant confidence (number)
      const res = await client.predict("/predict", {
        image: image, // ✅ FIX #4: Parameter name must match Gradio fn input name
      });

      console.log("Gradio response:", res);

      const label = res.data[0];           // "Benign" or "Malignant"
      const benign = parseFloat(res.data[1]);     // e.g. 23.5
      const malignant = parseFloat(res.data[2]);  // e.g. 76.5

      // ✅ FIX #5: No string parsing needed — data comes back as proper values
      if (!label) {
        setError("No result returned from model");
        setLoading(false);
        return;
      }

      setResult(label);
      setBenignConf(isNaN(benign) ? 0 : benign);
      setMalignantConf(isNaN(malignant) ? 0 : malignant);

    } catch (err) {
      console.error("Prediction failed:", err);
      // ✅ FIX #6: Show a friendlier, more informative error message
      if (err.message?.includes("Cannot read")) {
        setError("Model is loading on Hugging Face. Please wait 30 seconds and try again.");
      } else if (err.message?.includes("fetch")) {
        setError("Cannot connect to backend. Check if your Hugging Face Space is running.");
      } else {
        setError(err.message || "Backend error. Check console for details.");
      }
    }

    setLoading(false);
  };

  // ✅ FIX #7: Chart now shows TWO bars — Benign vs Malignant
  const chartData = {
    labels: ["Benign", "Malignant"],
    datasets: [{
      label: "Confidence %",
      data: [benignConf, malignantConf],
      backgroundColor: ["#00cc77", "#ff2e73"],
      borderRadius: 6,
    }],
  };

  const chartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: "white" },
        grid: { color: "rgba(255,255,255,0.1)" },
      },
      x: {
        ticks: { color: "white" },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { labels: { color: "white" } },
    },
  };

  if (!loggedIn) {
    return (
      <div className="login">
        <div className="login-box">
          <h2>🎗️ Breast Cancer Detection</h2>
          <p className="subtitle">Secure Login</p>
          <input
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleLoginKeyDown}
          />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleLoginKeyDown}
          />
          <button onClick={handleLogin}>Login</button>
        </div>
      </div>
    );
  }

  // ✅ FIX #8: Determine dominant confidence for display
  const displayConf = result === "Malignant" ? malignantConf : benignConf;

  return (
    <div className="app">
      <div className="header">
        <h1>🎗️ Breast Cancer Detection</h1>
        <p className="subtitle">AI-powered diagnosis using deep learning</p>
      </div>

      <div className="container">
        <div className="panel">
          <h3>Upload Mammogram</h3>
          <input type="file" accept="image/*" onChange={handleImage} />
          {preview && <img src={preview} alt="preview" />}
          <button onClick={predict} disabled={loading}>
            {loading ? "Processing..." : "Analyze Image"}
          </button>
        </div>

        <div className="panel">
          {loading ? (
            <div className="loader-wrapper">
              <div className="loader"></div>
              <p className="loader-text">Analyzing mammogram...</p>
            </div>
          ) : error ? (
            <div className="result-card">
              {/* ✅ FIX #9: Error uses CSS class, not inline style */}
              <p className="error-text">❌ {error}</p>
              <p className="hint-text">Open browser console (F12) for details</p>
            </div>
          ) : result ? (
            <div className="result-card">
              {/* ✅ FIX #10: Malignant vs Benign now correctly color-coded */}
              <h2 className={result === "Malignant" ? "red" : "green"}>
                {result}
              </h2>
              <p className="conf-text">{displayConf.toFixed(2)}% Confidence</p>
              <Bar data={chartData} options={chartOptions} />
              <div className={`message ${result === "Malignant" ? "msg-danger" : "msg-safe"}`}>
                {result === "Malignant"
                  ? "⚠️ High risk detected. Please consult a doctor immediately."
                  : "✅ Low risk detected. Stay safe."}
              </div>
            </div>
          ) : (
            <p className="placeholder">Upload a mammogram image to start analysis</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
