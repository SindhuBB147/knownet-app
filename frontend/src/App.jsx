import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { AppRoutes } from "./routes/AppRoutes";
import "./styles/global.css";

export const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Navbar />
      <main>
        <AppRoutes />
      </main>
    </AuthProvider>
  </BrowserRouter>
);

export default App;

