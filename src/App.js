import React, { useState } from "react";
import "./App.css";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { Client } from "@gradio/client"; // ✅ FIXED POSITION

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(false);

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
  };

  // ✅ FIXED PREDICT FUNCTION
  const predict = async () => {
    if (!image) {
      alert("Upload image first");
      return;
    }

    setLoading(true);

    try {
      // convert to base64
      const toBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });

      const base64 = await toBase64(image);

      const client = await Client.connect(
        "anil2111/cnn_backend" // ✅ use space name (more stable)
      );

      const res = await client.predict("/predict", {
        image_input: base64, // ✅ FIXED
      });

      console.log("RESULT:", res);

      const output = res.data;

      const parts = output.split("|");
      const prediction = parts[0].split(":")[1].trim();
      const conf = parseFloat(parts[1].split(":")[1]);

      setResult(prediction);
      setConfidence(conf);

    } catch (err) {
      console.error(err);
      alert("Backend error");
    }

    setLoading(false);
  };

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

  return (
    <div className="app">
      <div className="header">
        <h1>🎗️ Breast Cancer Detection</h1>
        <p className="subtitle">
          AI-powered diagnosis using deep learning
        </p>
      </div>

      <div className="container">
        <div className="panel">
          <h3>Upload Mammogram</h3>

          <input type="file" onChange={handleImage} />

          {preview && <img src={preview} alt="preview" />}

          <button onClick={predict}>
            {loading ? "Processing..." : "Analyze Image"}
          </button>
        </div>

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
            <p className="placeholder">
              Upload image to start analysis
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;