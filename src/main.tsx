import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";
import Root from "./routes/root/page";
import { Toaster } from "react-hot-toast";
import Repo from "./routes/repo/page";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/repo/:repoUrlB64" element={<Repo />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
