import React, { useState } from "react";
import axios from "axios";

function App() {
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!file) {
    alert("Please select a file first.");
    return;
  }

  const formData = new FormData();
  formData.append("excelFile", file);

  try {
    const res = await axios.post("http://localhost:3000/register-bulk", formData, {
      responseType: "blob", // Important!
    });

    const blob = new Blob([res.data], { type: res.headers["content-type"] });

    const contentDisposition = res.headers["content-disposition"];
    let fileName = "registered_users.xlsx";

    if (contentDisposition && contentDisposition.includes("filename=")) {
      fileName = contentDisposition
        .split("filename=")[1]
        .split(";")[0]
        .replace(/["']/g, "");
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();

    setResponse({ success: true, fileName });
  } catch (err) {
    console.error(err);
    alert("Upload or download failed.");
  }
};

  return (
    
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h2>Bulk User Registration</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        <button type="submit" style={{ marginLeft: "10px" }}>Upload</button>
      </form>

      {/* {response && (
        <div style={{ marginTop: "20px" }}>
          <h3>Response</h3>
          <p>Registered {response.registeredCount} users</p>
          <pre>{JSON.stringify(response.registeredUsers, null, 2)}</pre>
        </div>
      )} */}
      {response?.success && (
  <div style={{ marginTop: "20px" }}>
    <h3>Download complete!</h3>
    <p>Downloaded: <strong>{response.fileName}</strong></p>
  </div>
)}

    </div>
  );
}

export default App;
