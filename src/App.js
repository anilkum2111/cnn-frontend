import React, { useState } from "react";
import "./App.css";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { Client } from "@gradio/client";

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
  const [statusMsg, setStatusMsg] = useState("");

  const handleLogin = () => {
    if (username === "admin" && password === "1234") {
      setLoggedIn(true);
    } else {
      alert("Wrong credentials");
    }
  };

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
    setStatusMsg("");
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
    setStatusMsg("Connecting to Hugging Face...");

    // 60-second timeout — prevents infinite loop
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setStatusMsg("");
      setError("Timed out after 60s. Space may be sleeping — wait 30 seconds and try again.");
    }, 60000);

    try {
      const client = await Client.connect(SPACE);
      setStatusMsg("Uploading image and analyzing...");

      // ✅ PRIMARY: Use /predict (works after fixing api_name in app.py)
      // ✅ FALLBACK: If /predict still fails, we catch and try fn_index 0
      let res;
      try {
        res = await client.predict("/predict", [image]);
      } catch (e) {
        console.warn("/predict failed, trying fn_index 0...", e.message);
        // Fallback: use numeric index which always works
        res = await client.predict(0, [image]);
      }

      clearTimeout(timeoutId);
      console.log("Gradio response:", res);

      const label    = res.data[0];
      const benign   = parseFloat(res.data[1]) || 0;
      const malignant = parseFloat(res.data[2]) || 0;

      if (!label || label.startsWith("Error")) {
        setError(label || "Model returned no result. Check Hugging Face Space logs.");
        setLoading(false);
        setStatusMsg("");
        return;
      }

      setResult(label);
      setBenignConf(benign);
      setMalignantConf(malignant);
      setStatusMsg("");

    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Prediction error:", err);

      let msg = err.message || "Unknown error";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        msg = "Cannot reach backend. Check if your Hugging Face Space is Running.";
      } else if (msg.includes("no endpoint") || msg.includes("fn_index")) {
        msg = "Endpoint mismatch. Make sure app.py has api_name='predict' and is redeployed.";
      } else if (msg.includes("500")) {
        msg = "Server error. Check Hugging Face Space logs for Python errors.";
      }

      setError(msg);
      setStatusMsg("");
    }

    setLoading(false);
  };

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

  const displayConf = result === "Malignant" ? malignantConf : benignConf;

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
              <p className="loader-text">{statusMsg || "Analyzing..."}</p>
              <p className="hint-text">May take 20–30 sec if Space was sleeping</p>
            </div>
          ) : error ? (
            <div className="result-card">
              <p className="error-text">❌ {error}</p>
              <p className="hint-text">Press F12 → Console for full details</p>
              <button onClick={predict} style={{ marginTop: "12px" }}>
                🔄 Try Again
              </button>
            </div>
          ) : result ? (
            <div className="result-card">
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
