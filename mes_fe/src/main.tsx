
  import { createRoot } from "react-dom/client";
  import App from "./app/App";
  import { SystemConfigProvider } from "./app/context/SystemConfigContext";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <SystemConfigProvider>
      <App />
    </SystemConfigProvider>
  );
