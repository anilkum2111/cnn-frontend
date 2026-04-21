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
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (username === "admin" && password === "1234") {
      setLoggedIn(true);
    } else {
      alert("Wrong credentials");
    }
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult("");
    setError("");
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

      // ✅ Step 1: Upload the file to Gradio first
      const uploadedFile = await client.upload_file(image);
      console.log("UPLOADED FILE:", uploadedFile);

      // ✅ Step 2: Use uploaded file path in predict
      const res = await client.predict("/predict", {
        image_input: uploadedFile,
      });

      console.log("RAW RESULT:", res);

      // ✅ Output is a plain string e.g. "Prediction: Benign | Confidence: 92.3%"
      const output = res.data[0];
      console.log("OUTPUT STRING:", output);

      // Parse the string
      if (output.includes("|")) {
        const parts = output.split("|");
        const prediction = parts[0].split(":")[1].trim();
        const conf = parseFloat(parts[1].replace(/[^0-9.]/g, ""));
        setResult(prediction);
        setConfidence(conf);
      } else {
        // fallback if format is different
        setResult(output);
        setConfidence(0);
      }

    } catch (err) {
      console.error("FULL ERROR:", err);
      setError(err.message || "Backend error. Check console.");
    }

    setLoading(false);
  };

  const chartData = {
    labels: ["Confidence"],
    datasets: [{
      label: "Confidence %",
      data: [confidence],
      backgroundColor: ["#ff4d88"],
    }],
  };

  if (!loggedIn) {
    return (
      <div className="login">
        <div className="login-box">
          <h2>🎗️ Breast Cancer Detection</h2>
          <p className="subtitle">Secure Login</p>
          <input placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
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
            <div className="loader"></div>
          ) : error ? (
            <div className="result-card">
              <p style={{ color: "red" }}>❌ {error}</p>
              <p style={{ fontSize: "12px", color: "#999" }}>Check browser console for details</p>
            </div>
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